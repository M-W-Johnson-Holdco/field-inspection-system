import {
  DEFAULT_PERMISSIONS,
  isAllowedDomainEmail,
  normalizeEmail,
  normalizeRole,
  ROLES,
  withBootstrapAdmins,
} from './accessConfig'
import { fetchPermissions, putPermissions } from './inspectionApi'

/** Migrate legacy permissions.json shapes into the users list. */
function migrateLegacyPermissions(raw) {
  const byEmail = new Map()

  function upsert(email, role) {
    const normalized = normalizeEmail(email)
    const nextRole = normalizeRole(role)
    if (!normalized || !nextRole || !isAllowedDomainEmail(normalized)) return
    const existing = byEmail.get(normalized)
    const rank = { [ROLES.sales]: 1, [ROLES.supervisor]: 2, [ROLES.admin]: 3 }
    if (!existing || rank[nextRole] > rank[existing.role]) {
      byEmail.set(normalized, { email: normalized, role: nextRole })
    }
  }

  if (Array.isArray(raw?.users)) {
    raw.users.forEach(entry => upsert(entry?.email, entry?.role))
  }

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
    const raw = await fetchPermissions(token)
    if (!raw) return withBootstrapAdmins({ ...DEFAULT_PERMISSIONS })
    return sanitizePermissions(raw)
  } catch (err) {
    // Re-throw auth expiry so callers can recover; soft-fail other errors at login.
    if (err?.name === 'TokenExpiredError') throw err
    return withBootstrapAdmins({ ...DEFAULT_PERMISSIONS })
  }
}

export async function savePermissions(token, permissions) {
  const clean = withBootstrapAdmins(sanitizePermissions(permissions))
  const saved = await putPermissions(token, clean)
  return {
    permissions: sanitizePermissions(saved),
    inviteResults: [],
    inviteFailures: [],
  }
}
