import type { Env, AuthUser } from './types'
import {
	hasAppAccess,
	loadPermissions,
	normalizeEmail,
	orgForEmail,
	roleForEmail,
} from './access'
import { jsonResponse } from './cors'
import { looksLikeJwt, verifySessionToken } from './session'
import { portalForAudience, portalInspectionRole } from './portalRoles'
import type { Role } from './types'

export class AuthError extends Error {
	status: number
	constructor(message: string, status = 401) {
		super(message)
		this.status = status
	}
}

function bearerToken(request: Request): string | null {
	const header = request.headers.get('Authorization') || ''
	const match = /^Bearer\s+(.+)$/i.exec(header)
	return match?.[1]?.trim() || null
}

async function authUserFromEmail(
	env: Env,
	profile: { email: string; name?: string; picture?: string },
	portalRole?: Role | null,
): Promise<AuthUser> {
	const email = normalizeEmail(profile.email)
	if (!email) throw new AuthError('Account has no email')

	const org = orgForEmail(email)
	if (!org) throw new AuthError('Email domain is not allowed', 403)

	// The inspection permissions list wins; otherwise fall back to the role
	// mapped from the user's portal (carried in a signed session claim).
	const permissions = await loadPermissions(env)
	const role = hasAppAccess(email, permissions) ? roleForEmail(email, permissions) : (portalRole || null)
	if (!role) throw new AuthError('You do not have access to this app', 403)

	return {
		email,
		name: profile.name || email,
		picture: profile.picture,
		role,
		org,
	}
}

/** Verify a Google OAuth access token (used to mint app sessions). */
export async function requireGoogleAuthUser(request: Request, env: Env): Promise<AuthUser> {
	const token = bearerToken(request)
	if (!token) throw new AuthError('Missing Authorization bearer token')
	if (looksLikeJwt(token)) {
		throw new AuthError('A Google access token is required to create a session', 401)
	}

	const userinfoResp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
		headers: { Authorization: `Bearer ${token}` },
	})
	if (!userinfoResp.ok) {
		throw new AuthError('Invalid or expired Google token', 401)
	}

	const profile = await userinfoResp.json() as {
		email?: string
		email_verified?: boolean | string
		name?: string
		picture?: string
	}

	if (profile.email_verified === false || profile.email_verified === 'false') {
		throw new AuthError('Google email is not verified', 403)
	}

	return authUserFromEmail(env, {
		email: profile.email || '',
		name: profile.name,
		picture: profile.picture,
	})
}

/**
 * Verify a Google Sign-In ID token (the `credential` the TC/PT portals get
 * from google.accounts.id) so a portal login can mint an app session. The
 * token must have been issued to one of the portals' own OAuth clients
 * (PORTAL_GOOGLE_CLIENTS). Users not on the inspection permissions list get
 * a role mapped from that portal's own UserPermissions sheet.
 */
export async function requireGoogleIdTokenUser(
	idToken: string,
	env: Env,
): Promise<{ user: AuthUser; portalRole: Role | null }> {
	if (!idToken || !looksLikeJwt(idToken)) throw new AuthError('Missing Google credential')

	// tokeninfo checks the signature and expiry; logins are infrequent, so
	// one round-trip per sign-in is fine.
	const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`)
	if (!resp.ok) throw new AuthError('Invalid or expired Google credential', 401)

	const info = await resp.json() as {
		aud?: string
		iss?: string
		exp?: string
		email?: string
		email_verified?: string | boolean
		name?: string
		picture?: string
	}
	const portal = info.aud ? portalForAudience(info.aud, env) : null
	if (!portal) {
		throw new AuthError('Google credential was not issued for this app', 401)
	}
	if (info.iss !== 'accounts.google.com' && info.iss !== 'https://accounts.google.com') {
		throw new AuthError('Invalid Google credential issuer', 401)
	}
	if (!info.exp || Number(info.exp) * 1000 <= Date.now()) {
		throw new AuthError('Google credential expired', 401)
	}
	if (info.email_verified !== true && info.email_verified !== 'true') {
		throw new AuthError('Google email is not verified', 403)
	}

	const email = normalizeEmail(info.email || '')
	let portalRole: Role | null = null
	if (!hasAppAccess(email, await loadPermissions(env))) {
		try {
			portalRole = await portalInspectionRole(portal, email, env)
		} catch (err) {
			console.error('[portal role]', err)
			throw new AuthError('Could not check your portal role, try again shortly', 503)
		}
		if (!portalRole) throw new AuthError('Your portal role does not include inspections', 403)
	}

	const user = await authUserFromEmail(env, { email, name: info.name, picture: info.picture }, portalRole)
	return { user, portalRole }
}

/**
 * Accept either an app session JWT or a Google access token.
 * Prefer session JWTs for normal API calls after sign-in.
 */
export async function requireAuthUser(request: Request, env: Env): Promise<AuthUser> {
	const token = bearerToken(request)
	if (!token) throw new AuthError('Missing Authorization bearer token')

	if (looksLikeJwt(token)) {
		const claims = await verifySessionToken(token, env)
		if (!claims) throw new AuthError('Session expired or invalid', 401)
		return authUserFromEmail(env, {
			email: claims.email,
			name: claims.name,
			picture: claims.picture,
		}, claims.portalRole)
	}

	return requireGoogleAuthUser(request, env)
}

export function authErrorResponse(err: unknown, origin: string) {
	if (err instanceof AuthError) {
		return jsonResponse({ error: err.message }, origin, err.status)
	}
	return jsonResponse({ error: 'Unauthorized' }, origin, 401)
}
