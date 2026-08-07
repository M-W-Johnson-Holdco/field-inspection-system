import { normalizeEmail, orgForEmail } from './accessConfig'
import {
  collectInspectionPhotos,
  sanitizePhotoName,
  stripPhotosFromInspection,
} from './inspectionPhotos'

export const WORKER_URL =
  import.meta.env.VITE_INSPECTION_WORKER_URL
  || 'https://field-inspection-worker.k-liss.workers.dev'

export class TokenExpiredError extends Error {
  constructor() {
    super('Session expired. Please sign in again.')
    this.name = 'TokenExpiredError'
  }
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

/** Stable app id for the open/current inspection: `PT/folder name`. */
export function inspectionStorageKey(org, name) {
  return `${org}/${name}`
}

export function parseInspectionStorageKey(key) {
  const value = String(key || '')
  const slash = value.indexOf('/')
  if (slash <= 0) return null
  const org = value.slice(0, slash)
  const name = value.slice(slash + 1)
  if ((org !== 'PT' && org !== 'TC') || !name) return null
  return { org, name }
}

async function apiFetch(path, token, opts = {}) {
  const res = await fetch(`${WORKER_URL}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.headers || {}),
    },
  })
  if (res.status === 401) throw new TokenExpiredError()
  let payload = null
  const text = await res.text().catch(() => '')
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = { error: text }
    }
  }
  if (!res.ok) {
    const message = payload?.error || `API ${res.status}`
    throw new Error(message)
  }
  return payload
}

/** Exchange a short-lived Google access token for a long-lived app session JWT. */
export async function createAppSession(googleAccessToken) {
  const data = await apiFetch('/api/session', googleAccessToken, { method: 'POST' })
  if (!data?.token || !data?.expiresAt) {
    throw new Error('Could not create app session')
  }
  return {
    token: data.token,
    expiresAt: data.expiresAt,
    expiresIn: data.expiresIn,
    user: data.user || null,
  }
}

export async function listInspectionFolders(token) {
  const data = await apiFetch('/api/inspections', token)
  return (data?.folders || []).map(folder => ({
    id: inspectionStorageKey(folder.org, folder.name),
    name: folder.name,
    org: folder.org,
    ownerEmail: folder.ownerEmail || '',
    inspector: folder.inspector || '',
    createdTime: folder.savedAt || null,
    savedAt: folder.savedAt || null,
  }))
}

export async function loadInspection(token, storageKeyOrOrg, maybeName) {
  let org
  let name
  if (maybeName != null) {
    org = storageKeyOrOrg
    name = maybeName
  } else {
    const parsed = parseInspectionStorageKey(storageKeyOrOrg)
    if (!parsed) throw new Error('Invalid inspection id')
    org = parsed.org
    name = parsed.name
  }
  const data = await apiFetch(
    `/api/inspections/${encodeURIComponent(org)}/${encodeURIComponent(name)}`,
    token,
  )
  return data.inspection
}

export async function saveInspection(token, inspectionData, inspectorName, userEmail) {
  const orgKey = orgForEmail(userEmail)
  if (!orgKey) throw new Error('Your email is not assigned to a company folder.')

  const name = folderName(inspectionData.jobInfo, inspectorName)
  const ownerEmail = normalizeEmail(userEmail)
  const photos = collectInspectionPhotos(inspectionData)
  const clean = JSON.parse(JSON.stringify(inspectionData))
  clean.meta = {
    ...(clean.meta || {}),
    ownerEmail,
    savedAt: new Date().toISOString(),
    storage: 'r2',
  }
  stripPhotosFromInspection(clean)

  const result = await apiFetch('/api/inspections', token, {
    method: 'PUT',
    body: JSON.stringify({
      org: orgKey,
      folderName: name,
      inspection: clean,
      photos: photos.map(photo => ({
        path: photo.path,
        name: photo.name,
        dataUrl: photo.url,
      })),
    }),
  })

  return {
    folderId: inspectionStorageKey(result.org || orgKey, result.folderName || name),
    folderName: result.folderName || name,
    photoCount: result.photoCount ?? photos.length,
    savedAt: result.savedAt || null,
  }
}

export async function fetchPermissions(token) {
  const data = await apiFetch('/api/permissions', token)
  return data?.permissions ?? data
}

export async function putPermissions(token, permissions) {
  const data = await apiFetch('/api/permissions', token, {
    method: 'PUT',
    body: JSON.stringify({ permissions }),
  })
  return data?.permissions ?? data
}
