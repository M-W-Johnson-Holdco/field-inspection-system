import { normalizeEmail, orgForEmail } from './accessConfig'

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
  const addr = jobInfo?.addr || jobInfo?.addrParts?.address1 || 'Unknown Address'
  const cust = jobInfo?.cust || 'Unknown'
  const insp = inspectorName || jobInfo?.insp || 'Unknown Inspector'
  return `${date} - ${addr} - ${cust} - ${insp}`.replace(/[/\\:*?"<>|]/g, '-').slice(0, 120)
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

// Maps roof item IDs → [section folder name, item folder name]
const ROOF_ITEM_PATH = {
  ri0:  ['1a-general_roof',              'shingle_style'],
  ri1:  ['1a-general_roof',              'edge_flashings'],
  ri2:  ['1a-general_roof',              'underlayment'],
  ri3:  ['1a-general_roof',              'ridge_cap'],
  ri4:  ['1a-general_roof',              'starter_shingle'],
  ri5:  ['1a-general_roof',              'valley'],
  ri6:  ['1b-ventilation',               'ridge_vent'],
  ri7:  ['1b-ventilation',               'box_vents'],
  ri8:  ['1b-ventilation',               'turbines'],
  ri9:  ['1b-ventilation',               'power_vents'],
  ri10: ['1b-ventilation',               'solar_vents'],
  ri11: ['1c-pipe_jacks_and_exhaust',    'pipe_jacks'],
  ri12: ['1c-pipe_jacks_and_exhaust',    'exhaust_stacks'],
  ri13: ['1d-kickouts',                  'kickouts'],
  ri14: ['1e-skylights_and_flashings',   'skylights'],
  ri15: ['1e-skylights_and_flashings',   'rain_diverter'],
  ri16: ['1e-skylights_and_flashings',   'power_meter_mast'],
  ri17: ['1e-skylights_and_flashings',   'chimney_flashing'],
  ri18: ['1e-skylights_and_flashings',   'step_flashing'],
  ri19: ['1e-skylights_and_flashings',   'counter_flashing'],
  ri20: ['1e-skylights_and_flashings',   'l_flashing'],
  ri21: ['1e-skylights_and_flashings',   'cornice_gables'],
  ri22: ['1f-low_slope_and_other',       'low_slope'],
  ri23: ['1f-low_slope_and_other',       'other_structures'],
  ri24: ['1a-general_roof',              'solar_panels'],
}

// Maps elevation item IDs → folder name
const ELEV_ITEM_FOLDER = {
  ev0:  'siding',
  ev1:  'fascia',
  ev2:  'soffit',
  ev3:  'gutters',
  ev4:  'downspouts',
  ev5:  'window_screens',
  ev6:  'shutters',
  ev7:  'entry_doors',
  ev8:  'garage_doors',
  ev9:  'ac_condenser',
  ev10: 'other_notes',
}

// Maps exterior item IDs → [section folder, item folder]
const EXTERIOR_ITEM_PATH = {
  ei_fence:   ['4a-fencing_and_gates',           'fence'],
  ei_gates:   ['4a-fencing_and_gates',           'gates'],
  ei_pool:    ['4b-pool_and_outdoor_equipment',  'pool'],
  ei_outdoor: ['4c-outdoor_structures',          'outdoor_items'],
  ei_site:    ['4d-site_access',                 'site_access'],
}

function slugify(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

/** Drive file name from leaf folder + 1-based index, e.g. shingle_style → shingle-style1.jpg */
function photoFileName(leafFolder, index) {
  const prefix = String(leafFolder || 'photo').replace(/_/g, '-')
  return `${prefix}${index + 1}.jpg`
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

  // Strip photos from JSON payload; collect { path: string[], name: string, url: string }
  const photos = []
  const clean = JSON.parse(JSON.stringify(inspectionData))
  clean.meta = {
    ...(clean.meta || {}),
    ownerEmail,
    savedAt: new Date().toISOString(),
  }

  // ── Roof ──────────────────────────────────────────────────────────
  for (const [itemId, item] of Object.entries(clean.roofData || {})) {
    const pathParts = ROOF_ITEM_PATH[itemId]
    if (!pathParts) continue
    const [section, itemFolder] = pathParts

    // Item-level photos (no sub-items)
    ;(item.photos || []).forEach((url, i) => {
      photos.push({ path: ['photos', '1-roof', section, itemFolder], name: photoFileName(itemFolder, i), url })
    })
    item.photos = []

    // Sub-item photos (pipe jacks, skylights, etc.)
    ;(item.subItems || []).forEach((sub, subIndex) => {
      ;(sub.photos || []).forEach((url, i) => {
        const subFolder = `${subIndex + 1}-${slugify(itemFolder.replace(/s$/, ''))}`
        photos.push({ path: ['photos', '1-roof', section, itemFolder, subFolder], name: photoFileName(subFolder, i), url })
      })
      sub.photos = []
    })
  }

  // ── Elevations ────────────────────────────────────────────────────
  const DIRECTIONS = ['Front', 'Right', 'Rear', 'Left']
  for (const [cellKey, cell] of Object.entries(clean.elevData || {})) {
    const parts = cellKey.split('_')
    const itemId = parts[0]
    const dir = parts.slice(1).join('_')
    const dirSlug = slugify(dir)
    const itemFolder = ELEV_ITEM_FOLDER[itemId] || slugify(itemId)
    ;(cell.photos || []).forEach((url, i) => {
      photos.push({ path: ['photos', '2-elevations', dirSlug, itemFolder], name: photoFileName(itemFolder, i), url })
    })
    cell.photos = []
  }

  // ── Exterior ──────────────────────────────────────────────────────
  for (const [itemId, item] of Object.entries(clean.exteriorData || {})) {
    const pathParts = EXTERIOR_ITEM_PATH[itemId]
    if (!pathParts) continue
    const [section, itemFolder] = pathParts
    ;(item.photos || []).forEach((url, i) => {
      photos.push({ path: ['photos', '3-exterior', section, itemFolder], name: photoFileName(itemFolder, i), url })
    })
    if (item.photos) item.photos = []
  }

  // ── Interior ──────────────────────────────────────────────────────
  ;(clean.interiorData?.rooms || []).forEach(room => {
    const displayName = room.customName || room.name || room.id
    const roomSlug = slugify(displayName)
    ;(room.photos || []).forEach((url, i) => {
      photos.push({ path: ['photos', '4-interior', roomSlug], name: photoFileName(roomSlug, i), url })
    })
    room.photos = []
  })

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

  return { folderName: folderName(inspectionData.jobInfo), photoCount: photos.length }
}
