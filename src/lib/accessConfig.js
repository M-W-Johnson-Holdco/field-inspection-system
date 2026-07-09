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

// First admins who can open Access Settings before permissions.json exists on Drive.
// Add your email here, then remove after adding yourself via the UI if you prefer.
export const BOOTSTRAP_ACCESS_ADMINS = ['j.gil@peachtreerestorations.com', 'jonathan@tcroofingexperts.com', 'k.liss@peachtreerestorations.com']

export const DEFAULT_PERMISSIONS = {
  crossOrgViewers: [],
  accessAdmins: [],
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

export function isAllowedAppEmail(email) {
  return Boolean(orgForEmail(email))
}

export function canViewBothOrgs(email, permissions) {
  const normalized = normalizeEmail(email)
  return (permissions?.crossOrgViewers || []).some(entry => normalizeEmail(entry) === normalized)
}

export function viewableOrgs(email, permissions) {
  if (canViewBothOrgs(email, permissions)) return [ORG_FOLDERS.PT, ORG_FOLDERS.TC]
  const org = orgForEmail(email)
  return org ? [org] : []
}

export function isAccessAdmin(email, permissions) {
  const normalized = normalizeEmail(email)
  if (BOOTSTRAP_ACCESS_ADMINS.some(entry => normalizeEmail(entry) === normalized)) return true
  return (permissions?.accessAdmins || []).some(entry => normalizeEmail(entry) === normalized)
}

export function defaultAccessLabel(email, permissions) {
  if (canViewBothOrgs(email, permissions)) return 'PT + TC'
  const org = orgForEmail(email)
  return org || 'Unknown'
}
