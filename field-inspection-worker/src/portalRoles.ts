import type { Env, Role } from './types'
import { normalizeEmail } from './access'

export type PortalKey = 'TC' | 'PT'

/**
 * Portal role → inspection role. Roles not listed here (e.g. "viewer") get no
 * inspection access. People added by hand to the inspection permissions list
 * keep that role instead — see authUserFromEmail.
 */
const PORTAL_ROLE_MAP: Record<string, Role> = {
	admin: 'admin',
	claims: 'supervisor',
	production: 'supervisor',
	sales: 'sales',
}

const PERMS_TAB = 'UserPermissions'

/** PORTAL_GOOGLE_CLIENTS is "TC:<client id>,PT:<client id>". */
export function portalForAudience(aud: string, env: Env): PortalKey | null {
	for (const pair of String(env.PORTAL_GOOGLE_CLIENTS || '').split(',')) {
		const idx = pair.indexOf(':')
		if (idx < 0) continue
		const key = pair.slice(0, idx).trim()
		const clientId = pair.slice(idx + 1).trim()
		if (clientId && clientId === aud && (key === 'TC' || key === 'PT')) return key
	}
	return null
}

function portalSecrets(portal: PortalKey, env: Env) {
	const s = portal === 'TC'
		? { clientId: env.TC_GS_CLIENT_ID, clientSecret: env.TC_GS_CLIENT_SECRET, refreshToken: env.TC_GS_REFRESH_TOKEN, sheetId: env.TC_GS_SHEET_ID }
		: { clientId: env.PT_GS_CLIENT_ID, clientSecret: env.PT_GS_CLIENT_SECRET, refreshToken: env.PT_GS_REFRESH_TOKEN, sheetId: env.PT_GS_SHEET_ID }
	if (!s.clientId || !s.clientSecret || !s.refreshToken || !s.sheetId) return null
	return s as { clientId: string; clientSecret: string; refreshToken: string; sheetId: string }
}

// Sheets access tokens live ~1h; reuse one per isolate instead of refreshing
// on every portal sign-in.
const tokenCache: Partial<Record<PortalKey, { token: string; expiresAt: number }>> = {}

async function sheetsAccessToken(portal: PortalKey, s: NonNullable<ReturnType<typeof portalSecrets>>): Promise<string> {
	const cached = tokenCache[portal]
	if (cached && Date.now() < cached.expiresAt) return cached.token
	const resp = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: s.clientId,
			client_secret: s.clientSecret,
			refresh_token: s.refreshToken,
			grant_type: 'refresh_token',
		}),
	})
	const data = await resp.json() as { access_token?: string; expires_in?: number }
	if (!resp.ok || !data.access_token) throw new Error(`Sheets token refresh failed (${resp.status})`)
	tokenCache[portal] = {
		token: data.access_token,
		expiresAt: Date.now() + Math.max(60, (data.expires_in || 3600) - 300) * 1000,
	}
	return data.access_token
}

/**
 * Look the user up in the portal's own UserPermissions sheet (same table the
 * portal uses to log people in) and map their portal role to an inspection
 * role. Returns null when they aren't listed or their role has no access.
 */
export async function portalInspectionRole(portal: PortalKey, email: string, env: Env): Promise<Role | null> {
	const s = portalSecrets(portal, env)
	if (!s) throw new Error(`Portal role lookup is not configured for ${portal}`)
	const token = await sheetsAccessToken(portal, s)
	const range = encodeURIComponent(`${PERMS_TAB}!A:C`)
	const resp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${s.sheetId}/values/${range}`, {
		headers: { Authorization: `Bearer ${token}` },
	})
	if (!resp.ok) throw new Error(`Portal permissions sheet read failed (${resp.status})`)
	const data = await resp.json() as { values?: string[][] }
	const target = normalizeEmail(email)
	for (const row of (data.values || []).slice(1)) { // first row is the header
		if (normalizeEmail(row[0]) === target) {
			return PORTAL_ROLE_MAP[String(row[1] || '').trim().toLowerCase()] || null
		}
	}
	return null
}
