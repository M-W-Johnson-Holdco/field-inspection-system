import type { Env, PermissionsDoc, Role } from './types'

export const ORG_FOLDERS = { PT: 'PT', TC: 'TC' } as const
export type OrgKey = keyof typeof ORG_FOLDERS

const DOMAIN_TO_ORG: Record<string, OrgKey> = {
	'peachtreerestorations.com': 'PT',
	'tcroofingexperts.com': 'TC',
}

export const BOOTSTRAP_ACCESS_ADMINS = [
	'j.gil@peachtreerestorations.com',
	'k.liss@peachtreerestorations.com',
	'r.deering@peachtreerestorations.com',
	'mj@peachtreerestorations.com',
]

export const DEFAULT_PERMISSIONS: PermissionsDoc = {
	users: BOOTSTRAP_ACCESS_ADMINS.map(email => ({
		email: normalizeEmail(email),
		role: 'admin' as Role,
	})),
}

export const PERMISSIONS_KV_KEY = 'permissions'
export const PERMISSIONS_R2_KEY = '_config/permissions.json'

export function normalizeEmail(email: string | null | undefined): string {
	return String(email || '').trim().toLowerCase()
}

export function orgForEmail(email: string): OrgKey | null {
	const domain = normalizeEmail(email).split('@')[1]
	return DOMAIN_TO_ORG[domain] || null
}

export function isAllowedDomainEmail(email: string): boolean {
	return Boolean(orgForEmail(email))
}

export function isBootstrapAccessAdmin(email: string): boolean {
	const normalized = normalizeEmail(email)
	return BOOTSTRAP_ACCESS_ADMINS.some(entry => normalizeEmail(entry) === normalized)
}

export function normalizeRole(role: unknown): Role | null {
	const value = String(role || '').trim().toLowerCase()
	if (value === 'pm') return 'supervisor'
	if (value === 'sales' || value === 'supervisor' || value === 'admin') return value
	return null
}

export function withBootstrapAdmins(permissions: PermissionsDoc): PermissionsDoc {
	const byEmail = new Map<string, { email: string; role: Role }>()
	for (const entry of permissions?.users || []) {
		const email = normalizeEmail(entry?.email)
		const role = normalizeRole(entry?.role)
		if (!email || !role || !isAllowedDomainEmail(email)) continue
		byEmail.set(email, { email, role })
	}
	for (const email of BOOTSTRAP_ACCESS_ADMINS) {
		const normalized = normalizeEmail(email)
		byEmail.set(normalized, { email: normalized, role: 'admin' })
	}
	return {
		users: [...byEmail.values()].sort((a, b) => a.email.localeCompare(b.email)),
	}
}

export function sanitizePermissions(raw: unknown): PermissionsDoc {
	const byEmail = new Map<string, { email: string; role: Role }>()
	const rank: Record<Role, number> = { sales: 1, supervisor: 2, admin: 3 }

	function upsert(email: unknown, role: unknown) {
		const normalized = normalizeEmail(String(email || ''))
		const nextRole = normalizeRole(role)
		if (!normalized || !nextRole || !isAllowedDomainEmail(normalized)) return
		const existing = byEmail.get(normalized)
		if (!existing || rank[nextRole] > rank[existing.role]) {
			byEmail.set(normalized, { email: normalized, role: nextRole })
		}
	}

	if (raw && typeof raw === 'object') {
		const doc = raw as Record<string, unknown>
		if (Array.isArray(doc.users)) {
			for (const entry of doc.users) {
				const row = entry as { email?: string; role?: string }
				upsert(row?.email, row?.role)
			}
		}
		for (const email of (doc.crossOrgViewers as string[] | undefined) || []) upsert(email, 'admin')
		for (const email of (doc.accessAdmins as string[] | undefined) || []) upsert(email, 'admin')
	}

	return withBootstrapAdmins({ users: [...byEmail.values()] })
}

export function roleForEmail(email: string, permissions: PermissionsDoc): Role | null {
	if (isBootstrapAccessAdmin(email)) return 'admin'
	const normalized = normalizeEmail(email)
	const entry = permissions.users.find(u => normalizeEmail(u.email) === normalized)
	return normalizeRole(entry?.role) || null
}

export function hasAppAccess(email: string, permissions: PermissionsDoc): boolean {
	if (isBootstrapAccessAdmin(email)) return true
	const normalized = normalizeEmail(email)
	return permissions.users.some(u => normalizeEmail(u.email) === normalized)
}

export function viewableOrgs(email: string, permissions: PermissionsDoc): OrgKey[] {
	const role = roleForEmail(email, permissions)
	if (!role) return []
	if (role === 'admin') return ['PT', 'TC']
	const org = orgForEmail(email)
	return org ? [org] : []
}

export function canViewAllCompanyInspections(email: string, permissions: PermissionsDoc): boolean {
	const role = roleForEmail(email, permissions)
	return role === 'supervisor' || role === 'admin'
}

export async function loadPermissions(env: Env): Promise<PermissionsDoc> {
	const fromKv = await env.PERMISSIONS.get(PERMISSIONS_KV_KEY, 'json')
	if (fromKv) return sanitizePermissions(fromKv)

	const fromR2 = await env.INSPECTIONS.get(PERMISSIONS_R2_KEY)
	if (fromR2) {
		const raw = await fromR2.json()
		const clean = sanitizePermissions(raw)
		await env.PERMISSIONS.put(PERMISSIONS_KV_KEY, JSON.stringify(clean))
		return clean
	}

	const defaults = withBootstrapAdmins({ ...DEFAULT_PERMISSIONS })
	await env.PERMISSIONS.put(PERMISSIONS_KV_KEY, JSON.stringify(defaults))
	await env.INSPECTIONS.put(PERMISSIONS_R2_KEY, JSON.stringify(defaults, null, 2), {
		httpMetadata: { contentType: 'application/json' },
	})
	return defaults
}

export async function savePermissions(env: Env, permissions: PermissionsDoc): Promise<PermissionsDoc> {
	const clean = withBootstrapAdmins(sanitizePermissions(permissions))
	await env.PERMISSIONS.put(PERMISSIONS_KV_KEY, JSON.stringify(clean))
	await env.INSPECTIONS.put(PERMISSIONS_R2_KEY, JSON.stringify(clean, null, 2), {
		httpMetadata: { contentType: 'application/json' },
	})
	return clean
}
