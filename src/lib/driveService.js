const DRIVE = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3'
const SHARED_DRIVE_ID = '0AGzZsZcVSAPaUk9PVA'
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
  const FOLDER_MIME = 'application/vnd.google-apps.folder'
  return (
    (await findByName(token, name, FOLDER_MIME, parentId)) ??
    (await createFolder(token, name, parentId))
  )
}

async function multipartUpload(token, folderId, name, mimeType, blob) {
  const boundary = 'tcboundary'
  const meta = JSON.stringify({ name, parents: [folderId] })
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${meta}\r\n`,
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
  const date = jobInfo?.date || new Date().toISOString().slice(0, 10)
  const addr = jobInfo?.addr || jobInfo?.addrParts?.address1 || 'Unknown Address'
  const cust = jobInfo?.cust || 'Unknown'
  const insp = inspectorName || jobInfo?.insp || 'Unknown Inspector'
  return `${date} - ${addr} - ${cust} - ${insp}`.replace(/[/\\:*?"<>|]/g, '-').slice(0, 120)
}

export async function listInspectionFolders(token) {
  const FOLDER_MIME = 'application/vnd.google-apps.folder'
  const q = `mimeType=${JSON.stringify(FOLDER_MIME)} and ${JSON.stringify(SHARED_DRIVE_ID)} in parents and trashed=false`
  const r = await gfetch(
    `${DRIVE}/files?q=${encodeURIComponent(q)}&fields=files(id,name,createdTime)&orderBy=createdTime desc&pageSize=200&${SD_PARAMS}&corpora=drive&driveId=${SHARED_DRIVE_ID}`,
    token,
  )
  return r.files || []
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

export async function saveInspectionToDrive(token, inspectionData, inspectorName) {
  const jobFolderId = await ensureFolder(token, folderName(inspectionData.jobInfo, inspectorName), SHARED_DRIVE_ID)

  // Strip photos from JSON payload; collect them for separate upload
  const photos = []
  const clean = JSON.parse(JSON.stringify(inspectionData))

  for (const [itemId, item] of Object.entries(clean.roofData || {})) {
    ;(item.photos || []).forEach((url, i) => photos.push({ name: `roof_${itemId}_${i + 1}.jpg`, url }))
    item.photos = []
    ;(item.subItems || []).forEach((sub, subIndex) => {
      ;(sub.photos || []).forEach((url, i) => {
        photos.push({ name: `roof_${itemId}_sub${subIndex + 1}_${i + 1}.jpg`, url })
      })
      sub.photos = []
    })
  }
  for (const [cellKey, cell] of Object.entries(clean.elevData || {})) {
    ;(cell.photos || []).forEach((url, i) => photos.push({ name: `elev_${cellKey}_${i + 1}.jpg`, url }))
    cell.photos = []
  }
  ;(clean.interiorData?.rooms || []).forEach(room => {
    const label = room.name || room.id
    ;(room.photos || []).forEach((url, i) => photos.push({ name: `interior_${label}_${i + 1}.jpg`, url }))
    room.photos = []
  })

  // Upload inspection.json
  const jsonBlob = new Blob([JSON.stringify(clean, null, 2)], { type: 'application/json' })
  const existingJsonId = await findByName(token, 'inspection.json', 'application/json', jobFolderId)
  if (existingJsonId) {
    await patchFile(token, existingJsonId, 'application/json', jsonBlob)
  } else {
    await multipartUpload(token, jobFolderId, 'inspection.json', 'application/json', jsonBlob)
  }

  // Upload photos
  for (const photo of photos) {
    const blob = dataUrlToBlob(photo.url)
    const existingId = await findByName(token, photo.name, null, jobFolderId)
    if (existingId) {
      await patchFile(token, existingId, blob.type, blob)
    } else {
      await multipartUpload(token, jobFolderId, photo.name, blob.type, blob)
    }
  }

  return { folderName: folderName(inspectionData.jobInfo), photoCount: photos.length }
}
