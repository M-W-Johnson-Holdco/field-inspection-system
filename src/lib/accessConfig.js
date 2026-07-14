export const ORG_FOLDERS = {
  PT: 'PT',
  TC: 'TC',
}

export const CONFIG_FOLDER_NAME = '_config'

export const DOMAIN_TO_ORG = {
  'peachtreerestorations.com': 'PT',
  'tcroofingexperts.com': 'TC',
}

export const BRAND_BY_ORG = {
  PT: {
    title: 'PT Roofing Field Inspection',
    titleMobile: 'Field Inspection',
    subtitle: 'Pre-Adjuster Inspection • Georgia Hail & Wind',
    logoAlt: 'PT Roofing & Restorations',
  },
  TC: {
    title: 'TC Roofing Field Inspection',
    titleMobile: 'Field Inspection',
    subtitle: 'Pre-Adjuster Inspection • Texas Hail & Wind',
    logoAlt: 'TC Roofing & Restorations',
  },
}

export const ROLES = {
  sales: 'sales',
  supervisor: 'supervisor',
  admin: 'admin',
}

export const ROLE_LABELS = {
  sales: 'Sales',
  supervisor: 'Supervisor',
  admin: 'Admin',
}

export const ROLE_DESCRIPTIONS = {
  sales: 'Own inspections only',
  supervisor: 'All inspections for their company',
  admin: 'Both companies + Access settings',
}

// First admins who can open Access Settings before permissions.json exists on Drive.
export const BOOTSTRAP_ACCESS_ADMINS = ['j.gil@peachtreerestorations.com', 'k.liss@peachtreerestorations.com']

export const DEFAULT_PERMISSIONS = {
  users: BOOTSTRAP_ACCESS_ADMINS.map(email => ({
    email: String(email).trim().toLowerCase(),
    role: ROLES.admin,
  })),
}

/** Ensure bootstrap admins are always present with Admin role. */
export function withBootstrapAdmins(permissions) {
  const byEmail = new Map()
  for (const entry of permissions?.users || []) {
    const email = normalizeEmail(entry?.email)
    const role = normalizeRole(entry?.role)
    if (!email || !role || !isAllowedDomainEmail(email)) continue
    byEmail.set(email, { email, role })
  }
  for (const email of BOOTSTRAP_ACCESS_ADMINS) {
    const normalized = normalizeEmail(email)
    byEmail.set(normalized, { email: normalized, role: ROLES.admin })
  }
  return {
    users: [...byEmail.values()].sort((a, b) => a.email.localeCompare(b.email)),
  }
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export function orgForEmail(email) {
  const domain = normalizeEmail(email).split('@')[1]
  return DOMAIN_TO_ORG[domain] || null
}

export function brandForEmail(email) {
  const org = orgForEmail(email)
  return BRAND_BY_ORG[org] ?? BRAND_BY_ORG.TC
}

export function isAllowedDomainEmail(email) {
  const normalized = normalizeEmail(email)
  if (!normalized || !normalized.includes('@')) return false
  // Exact domain match only (no subdomain spoofing).
  const domain = normalized.split('@').pop()
  return Boolean(DOMAIN_TO_ORG[domain])
}

/** @deprecated use isAllowedDomainEmail — kept for older imports */
export function isAllowedAppEmail(email) {
  return isAllowedDomainEmail(email)
}

export function isBootstrapAccessAdmin(email) {
  const normalized = normalizeEmail(email)
  return BOOTSTRAP_ACCESS_ADMINS.some(entry => normalizeEmail(entry) === normalized)
}

export function normalizeRole(role) {
  const value = String(role || '').trim().toLowerCase()
  // Legacy Drive value "pm" maps to supervisor.
  if (value === 'pm') return ROLES.supervisor
  if (value === ROLES.sales || value === ROLES.supervisor || value === ROLES.admin) return value
  return null
}

export function findUserEntry(email, permissions) {
  const normalized = normalizeEmail(email)
  return (permissions?.users || []).find(entry => normalizeEmail(entry.email) === normalized) || null
}

export function roleForEmail(email, permissions) {
  if (isBootstrapAccessAdmin(email)) return ROLES.admin
  const entry = findUserEntry(email, permissions)
  return normalizeRole(entry?.role) || null
}

/** Only allowlisted users (or bootstrap admins) may use the app. */
export function hasAppAccess(email, permissions) {
  if (isBootstrapAccessAdmin(email)) return true
  return Boolean(findUserEntry(email, permissions))
}

export function isAccessAdmin(email, permissions) {
  return roleForEmail(email, permissions) === ROLES.admin
}

export function canViewBothOrgs(email, permissions) {
  return roleForEmail(email, permissions) === ROLES.admin
}

export function viewableOrgs(email, permissions) {
  const role = roleForEmail(email, permissions)
  if (!role) return []
  if (role === ROLES.admin) return [ORG_FOLDERS.PT, ORG_FOLDERS.TC]
  const org = orgForEmail(email)
  return org ? [org] : []
}

export function canViewAllCompanyInspections(email, permissions) {
  const role = roleForEmail(email, permissions)
  return role === ROLES.supervisor || role === ROLES.admin
}

export function accessLabel(email, permissions) {
  const role = roleForEmail(email, permissions)
  if (!role) return 'No access'
  if (role === ROLES.admin) return 'Admin · PT + TC'
  if (role === ROLES.supervisor) return `Supervisor · ${orgForEmail(email) || '—'}`
  return `Sales · ${orgForEmail(email) || '—'} · own only`
}

/** @deprecated use accessLabel */
export function defaultAccessLabel(email, permissions) {
  return accessLabel(email, permissions)
}

export function isInspectionOwnedByUser(folder, user) {
  const owner = normalizeEmail(folder?.ownerEmail)
  const email = normalizeEmail(user?.email)
  if (owner && email) return owner === email

  // Fallback for older folders without ownerEmail metadata.
  const inspector = String(folder?.inspector || '').trim().toLowerCase()
  if (!inspector) return false
  const candidates = [user?.fullName, user?.name].filter(Boolean).map(value => String(value).trim().toLowerCase())
  return candidates.some(name => name && (inspector === name || inspector.includes(name) || name.includes(inspector)))
}
