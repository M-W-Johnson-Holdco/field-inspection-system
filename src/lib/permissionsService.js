import {
  CONFIG_FOLDER_NAME,
  DEFAULT_PERMISSIONS,
  isAllowedDomainEmail,
  normalizeEmail,
  normalizeRole,
  ROLES,
  withBootstrapAdmins,
} from './accessConfig'
import { loadJsonFromDrive, saveJsonToDrive } from './driveService'

const PERMISSIONS_FILE_NAME = 'permissions.json'

/** Migrate legacy permissions.json shapes into the users list. */
function migrateLegacyPermissions(raw) {
  const byEmail = new Map()

  function upsert(email, role) {
    const normalized = normalizeEmail(email)
    const nextRole = normalizeRole(role)
    if (!normalized || !nextRole || !isAllowedDomainEmail(normalized)) return
    const existing = byEmail.get(normalized)
    // Prefer higher privilege when merging duplicates: admin > pm > sales
    const rank = { [ROLES.sales]: 1, [ROLES.pm]: 2, [ROLES.admin]: 3 }
    if (!existing || rank[nextRole] > rank[existing.role]) {
      byEmail.set(normalized, { email: normalized, role: nextRole })
    }
  }

  if (Array.isArray(raw?.users)) {
    raw.users.forEach(entry => upsert(entry?.email, entry?.role))
  }

  // Legacy: cross-org viewers and access admins become Admin.
  ;(raw?.crossOrgViewers || []).forEach(email => upsert(email, ROLES.admin))
  ;(raw?.accessAdmins || []).forEach(email => upsert(email, ROLES.admin))

  return withBootstrapAdmins({
    users: [...byEmail.values()],
  })
}

export function sanitizePermissions(raw) {
  if (!raw || typeof raw !== 'object') {
    return withBootstrapAdmins({ ...DEFAULT_PERMISSIONS })
  }
  return migrateLegacyPermissions(raw)
}

export async function loadPermissions(token) {
  try {
    const raw = await loadJsonFromDrive(token, CONFIG_FOLDER_NAME, PERMISSIONS_FILE_NAME)
    if (!raw) return withBootstrapAdmins({ ...DEFAULT_PERMISSIONS })
    return sanitizePermissions(raw)
  } catch {
    return withBootstrapAdmins({ ...DEFAULT_PERMISSIONS })
  }
}

export async function savePermissions(token, permissions) {
  const clean = withBootstrapAdmins(sanitizePermissions(permissions))
  // Drop legacy keys so Drive file stays on the new shape.
  await saveJsonToDrive(token, CONFIG_FOLDER_NAME, PERMISSIONS_FILE_NAME, clean)
  return clean
}
