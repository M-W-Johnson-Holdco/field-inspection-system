import type { AuthUser, Env } from './types'

/** App sessions last 30 days until the user explicitly signs out. */
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60

export type SessionClaims = {
	email: string
	name: string
	picture?: string
	iat: number
	exp: number
}

function bytesToBase64Url(bytes: ArrayBuffer | Uint8Array): string {
	const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
	let binary = ''
	for (let i = 0; i < arr.length; i += 1) binary += String.fromCharCode(arr[i])
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBytes(value: string): Uint8Array {
	const padded = value.replace(/-/g, '+').replace(/_/g, '/')
	const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
	const binary = atob(padded + pad)
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
	return bytes
}

function textToBase64Url(text: string): string {
	return bytesToBase64Url(new TextEncoder().encode(text))
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign', 'verify'],
	)
}

export async function createSessionToken(user: Pick<AuthUser, 'email' | 'name' | 'picture'>, env: Env) {
	if (!env.SESSION_SECRET) throw new Error('SESSION_SECRET is not configured')

	const now = Math.floor(Date.now() / 1000)
	const claims: SessionClaims = {
		email: user.email,
		name: user.name,
		...(user.picture ? { picture: user.picture } : {}),
		iat: now,
		exp: now + SESSION_TTL_SECONDS,
	}

	const header = textToBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
	const payload = textToBase64Url(JSON.stringify(claims))
	const data = `${header}.${payload}`
	const key = await importHmacKey(env.SESSION_SECRET)
	const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
	return {
		token: `${data}.${bytesToBase64Url(signature)}`,
		expiresAt: claims.exp * 1000,
		expiresIn: SESSION_TTL_SECONDS,
	}
}

export async function verifySessionToken(token: string, env: Env): Promise<SessionClaims | null> {
	if (!env.SESSION_SECRET) return null
	const parts = token.split('.')
	if (parts.length !== 3) return null

	const [header, payload, sig] = parts
	const data = `${header}.${payload}`
	const key = await importHmacKey(env.SESSION_SECRET)
	const ok = await crypto.subtle.verify(
		'HMAC',
		key,
		base64UrlToBytes(sig),
		new TextEncoder().encode(data),
	)
	if (!ok) return null

	try {
		const claims = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as SessionClaims
		if (!claims?.email || !claims.exp) return null
		if (Math.floor(Date.now() / 1000) >= claims.exp) return null
		return claims
	} catch {
		return null
	}
}

export function looksLikeJwt(token: string): boolean {
	const parts = token.split('.')
	return parts.length === 3 && parts.every(Boolean)
}
