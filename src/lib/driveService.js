import { normalizeEmail, orgForEmail } from './accessConfig'
import {
  collectInspectionPhotos,
  sanitizePhotoName,
  stripPhotosFromInspection,
} from './inspectionPhotos'

const DRIVE = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3'
// Shared drive: Field Inspection App - Files
const SHARED_DRIVE_ID = '0AK1E74Jk62nmUk9PVA'
const FOLDER_MIME = 'application/vnd.google-apps.folder'
// All API calls need these params to work with Shared Drives
const SD_PARAMS = 'supportsAllDrives=true&includeItemsFromAllDrives=true'

export class TokenExpiredError extends Error {
  constructor() {
    super('Google Drive access token expired. Please sign in again.')
    this.name = 'TokenExpiredError'
  }
}

async function gfetch(url, token, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  })
  if (res.status === 401) throw new TokenExpiredError()
  if (!res.ok) {
    const text = await res.text().catch(() => String(res.status))
    throw new Error(`Drive ${res.status}: ${text}`)
  }
  return res.json()
}

async function findByName(token, name, mimeType, parentId) {
  let q = `name=${JSON.stringify(name)} and trashed=false`
  if (mimeType) q += ` and mimeType=${JSON.stringify(mimeType)}`
  if (parentId) q += ` and ${JSON.stringify(parentId)} in parents`
  const r = await gfetch(
    `${DRIVE}/files?q=${encodeURIComponent(q)}&fields=files(id)&${SD_PARAMS}&corpora=drive&driveId=${SHARED_DRIVE_ID}`,
    token,
  )
  return r.files?.[0]?.id ?? null
}

async function createFolder(token, name, parentId) {
  const r = await gfetch(`${DRIVE}/files?fields=id&${SD_PARAMS}`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId ?? SHARED_DRIVE_ID],
    }),
  })
  return r.id
}

async function ensureFolder(token, name, parentId) {
  return (
    (await findByName(token, name, FOLDER_MIME, parentId)) ??
    (await createFolder(token, name, parentId))
  )
}

async function ensureOrgRoot(token, orgKey) {
  return ensureFolder(token, orgKey, SHARED_DRIVE_ID)
}

async function readJsonFile(token, fileId) {
  const res = await fetch(`${DRIVE}/files/${fileId}?alt=media&${SD_PARAMS}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) throw new TokenExpiredError()
  if (!res.ok) throw new Error(`Drive ${res.status}`)
  return res.json()
}

export async function loadJsonFromDrive(token, configFolderName, fileName) {
  const configFolderId = await ensureFolder(token, configFolderName, SHARED_DRIVE_ID)
  // Don't require mimeType — older uploads may not be exactly application/json.
  const fileId = await findByName(token, fileName, null, configFolderId)
  if (!fileId) return null
  return readJsonFile(token, fileId)
}

export async function saveJsonToDrive(token, configFolderName, fileName, data) {
  const configFolderId = await ensureFolder(token, configFolderName, SHARED_DRIVE_ID)
  const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const existingJsonId = await findByName(token, fileName, null, configFolderId)
  if (existingJsonId) {
    await patchFile(token, existingJsonId, 'application/json', jsonBlob)
  } else {
    await multipartUpload(token, configFolderId, fileName, 'application/json', jsonBlob)
  }
}

/**
 * Ensure the email is a Shared Drive member (Content manager / writer).
 * Idempotent — already-a-member is treated as success.
 * Caller must be a Shared Drive Manager (organizer).
 */
export async function ensureSharedDriveMember(token, email, role = 'writer') {
  const emailAddress = normalizeEmail(email)
  if (!emailAddress) return { email: emailAddress, status: 'skipped' }

  const url = `${DRIVE}/files/${SHARED_DRIVE_ID}/permissions?${SD_PARAMS}&sendNotificationEmail=true&fields=id`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'user',
      role,
      emailAddress,
    }),
  })

  if (res.status === 401) throw new TokenExpiredError()
  if (res.ok) return { email: emailAddress, status: 'added' }

  const text = await res.text().catch(() => String(res.status))
  if (
    res.status === 400
    || res.status === 409
  ) {
    const lower = text.toLowerCase()
    if (
      lower.includes('alreadyexists')
      || lower.includes('already a member')
      || lower.includes('already exists')
    ) {
      return { email: emailAddress, status: 'exists' }
    }
  }

  return {
    email: emailAddress,
    status: 'error',
    error: `Drive ${res.status}: ${text}`,
  }
}

/** Invite every allowlisted user to the Shared Drive. Returns per-email results. */
export async function ensureSharedDriveMembers(token, emails = [], role = 'writer') {
  const unique = [...new Set(emails.map(normalizeEmail).filter(Boolean))]
  const results = []
  for (const email of unique) {
    try {
      results.push(await ensureSharedDriveMember(token, email, role))
    } catch (err) {
      if (err instanceof TokenExpiredError) throw err
      results.push({
        email,
        status: 'error',
        error: String(err?.message || err),
      })
    }
  }
  return results
}

async function multipartUpload(token, folderId, name, mimeType, blob) {
  const boundary = 'tcboundary'
  const meta = JSON.stringify({ name, mimeType, parents: [folderId] })
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`,
    `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
    blob,
    `\r\n--${boundary}--`,
  ])
  const r = await gfetch(`${UPLOAD}/files?uploadType=multipart&fields=id&${SD_PARAMS}`, token, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  })
  return r.id
}

async function patchFile(token, fileId, mimeType, blob) {
  await gfetch(`${UPLOAD}/files/${fileId}?uploadType=media&${SD_PARAMS}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': mimeType },
    body: blob,
  })
}

function dataUrlToBlob(dataUrl) {
  const [header, b64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)[1]
  const bytes = atob(b64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

export function folderName(jobInfo, inspectorName) {
  const date = jobInfo?.claimFileDate || jobInfo?.stormDate || jobInfo?.date || new Date().toISOString().slice(0, 10)
  const addr = sanitizePhotoName(jobInfo?.addr || jobInfo?.addrParts?.address1 || 'Unknown Address')
  const cust = sanitizePhotoName(jobInfo?.cust || 'Unknown')
  const insp = sanitizePhotoName(inspectorName || jobInfo?.insp || 'Unknown Inspector')
  return sanitizePhotoName(`${date} - ${addr} - ${cust} - ${insp}`)
    .replace(/[/\\:*?"<>|]/g, '-')
    .slice(0, 120)
}

export async function listInspectionFolders(token, orgKeys) {
  const folders = []
  for (const orgKey of orgKeys) {
    const orgRootId = await ensureOrgRoot(token, orgKey)
    const q = `mimeType=${JSON.stringify(FOLDER_MIME)} and ${JSON.stringify(orgRootId)} in parents and trashed=false`
    const r = await gfetch(
      `${DRIVE}/files?q=${encodeURIComponent(q)}&fields=files(id,name,createdTime,appProperties)&orderBy=createdTime desc&pageSize=200&${SD_PARAMS}&corpora=drive&driveId=${SHARED_DRIVE_ID}`,
      token,
    )
    for (const file of r.files || []) {
      folders.push({
        ...file,
        org: orgKey,
        ownerEmail: file.appProperties?.ownerEmail || '',
      })
    }
  }
  return folders
}

export async function loadInspectionFromDrive(token, folderId) {
  const q = `name="inspection.json" and ${JSON.stringify(folderId)} in parents and trashed=false`
  const r = await gfetch(
    `${DRIVE}/files?q=${encodeURIComponent(q)}&fields=files(id)&${SD_PARAMS}&corpora=drive&driveId=${SHARED_DRIVE_ID}`,
    token,
  )
  const fileId = r.files?.[0]?.id
  if (!fileId) throw new Error('inspection.json not found in this folder')
  const res = await fetch(`${DRIVE}/files/${fileId}?alt=media&${SD_PARAMS}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Drive ${res.status}`)
  return res.json()
}

async function listChildren(token, parentId) {
  const q = `${JSON.stringify(parentId)} in parents and trashed=false`
  const r = await gfetch(
    `${DRIVE}/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType)&pageSize=200&${SD_PARAMS}&corpora=drive&driveId=${SHARED_DRIVE_ID}`,
    token,
  )
  return r.files || []
}

async function trashFile(token, fileId) {
  await gfetch(`${DRIVE}/files/${fileId}?${SD_PARAMS}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trashed: true }),
  })
}

export async function saveInspectionToDrive(token, inspectionData, inspectorName, userEmail) {
  const orgKey = orgForEmail(userEmail)
  if (!orgKey) throw new Error('Your email is not assigned to a company folder.')
  const ownerEmail = normalizeEmail(userEmail)
  const orgRootId = await ensureOrgRoot(token, orgKey)
  const jobFolderId = await ensureFolder(token, folderName(inspectionData.jobInfo, inspectorName), orgRootId)

  // Stamp owner on the folder for Sales filtering in Open.
  await gfetch(`${DRIVE}/files/${jobFolderId}?${SD_PARAMS}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appProperties: { ownerEmail },
    }),
  })

  const photos = collectInspectionPhotos(inspectionData)
  const clean = JSON.parse(JSON.stringify(inspectionData))
  clean.meta = {
    ...(clean.meta || {}),
    ownerEmail,
    savedAt: new Date().toISOString(),
  }
  stripPhotosFromInspection(clean)

  // ── Upload inspection.json ─────────────────────────────────────────
  const jsonBlob = new Blob([JSON.stringify(clean, null, 2)], { type: 'application/json' })
  const existingJsonId = await findByName(token, 'inspection.json', 'application/json', jobFolderId)
  if (existingJsonId) {
    await patchFile(token, existingJsonId, 'application/json', jsonBlob)
  } else {
    await multipartUpload(token, jobFolderId, 'inspection.json', 'application/json', jsonBlob)
  }

  // Cache folder IDs to avoid redundant Drive API lookups
  const folderCache = new Map()
  async function cachedEnsurePath(segments) {
    let parentId = jobFolderId
    for (const seg of segments) {
      const cacheKey = `${parentId}/${seg}`
      if (folderCache.has(cacheKey)) {
        parentId = folderCache.get(cacheKey)
      } else {
        const id = await ensureFolder(token, seg, parentId)
        folderCache.set(cacheKey, id)
        parentId = id
      }
    }
    return parentId
  }

  // ── Upload photos (folder-based names; trash stale files in each leaf) ──
  const expectedByFolder = new Map() // folderId → Set of keep names
  for (const photo of photos) {
    const folderId = await cachedEnsurePath(photo.path)
    const blob = dataUrlToBlob(photo.url)
    const existingId = await findByName(token, photo.name, null, folderId)
    if (existingId) {
      await patchFile(token, existingId, blob.type, blob)
    } else {
      await multipartUpload(token, folderId, photo.name, blob.type, blob)
    }
    if (!expectedByFolder.has(folderId)) expectedByFolder.set(folderId, new Set())
    expectedByFolder.get(folderId).add(photo.name)
  }

  for (const [folderId, keepNames] of expectedByFolder) {
    const children = await listChildren(token, folderId)
    for (const file of children) {
      if (file.mimeType === FOLDER_MIME) continue
      if (keepNames.has(file.name)) continue
      await trashFile(token, file.id)
    }
  }

  return {
    folderId: jobFolderId,
    folderName: folderName(inspectionData.jobInfo),
    photoCount: photos.length,
  }
}
