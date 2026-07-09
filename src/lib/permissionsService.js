import {
  CONFIG_FOLDER_NAME,
  DEFAULT_PERMISSIONS,
  normalizeEmail,
} from './accessConfig'
import { loadJsonFromDrive, saveJsonToDrive } from './driveService'

const PERMISSIONS_FILE_NAME = 'permissions.json'

function sanitizePermissions(raw) {
  const crossOrgViewers = Array.isArray(raw?.crossOrgViewers)
    ? [...new Set(raw.crossOrgViewers.map(normalizeEmail).filter(Boolean))]
    : []
  const accessAdmins = Array.isArray(raw?.accessAdmins)
    ? [...new Set(raw.accessAdmins.map(normalizeEmail).filter(Boolean))]
    : []
  return { crossOrgViewers, accessAdmins }
}

export async function loadPermissions(token) {
  try {
    const raw = await loadJsonFromDrive(token, CONFIG_FOLDER_NAME, PERMISSIONS_FILE_NAME)
    if (!raw) return { ...DEFAULT_PERMISSIONS }
    return sanitizePermissions(raw)
  } catch {
    return { ...DEFAULT_PERMISSIONS }
  }
}

export async function savePermissions(token, permissions) {
  const clean = sanitizePermissions(permissions)
  await saveJsonToDrive(token, CONFIG_FOLDER_NAME, PERMISSIONS_FILE_NAME, clean)
  return clean
}
