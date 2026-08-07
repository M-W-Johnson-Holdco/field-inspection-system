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
): Promise<AuthUser> {
	const email = normalizeEmail(profile.email)
	if (!email) throw new AuthError('Account has no email')

	const org = orgForEmail(email)
	if (!org) throw new AuthError('Email domain is not allowed', 403)

	const permissions = await loadPermissions(env)
	if (!hasAppAccess(email, permissions)) {
		throw new AuthError('You do not have access to this app', 403)
	}

	const role = roleForEmail(email, permissions)
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
		})
	}

	return requireGoogleAuthUser(request, env)
}

export function authErrorResponse(err: unknown, origin: string) {
	if (err instanceof AuthError) {
		return jsonResponse({ error: err.message }, origin, err.status)
	}
	return jsonResponse({ error: 'Unauthorized' }, origin, 401)
}
