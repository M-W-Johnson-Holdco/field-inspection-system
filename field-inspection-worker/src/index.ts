import systemPrompt from './prompts/parse-system-prompt.txt'
import measureFenceSystemPrompt from './prompts/measure-fence-system-prompt.txt'
import type { Env } from './types'
import { loadPermissions, savePermissions, withBootstrapAdmins, sanitizePermissions } from './access'
import { AuthError, authErrorResponse, requireAuthUser } from './auth'
import { emptyCors, getCorsHeaders, jsonResponse } from './cors'
import { folderPathParams, getInspection, listInspections, putInspection } from './inspections'

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const origin = request.headers.get('Origin') || ''
		const { pathname } = new URL(request.url)

		if (request.method === 'OPTIONS') {
			return emptyCors(origin)
		}

		// ── AI routes (unchanged auth model: no Google token required) ──
		if (request.method === 'POST' && pathname === '/measure-fence') {
			return handleMeasureFence(request, env, origin)
		}
		if (request.method === 'POST' && (pathname === '/' || pathname === '')) {
			return handleParseTranscript(request, env, origin)
		}

		// ── Authenticated inspection / permissions API ──
		try {
			if (pathname === '/api/permissions') {
				return await handlePermissions(request, env, origin)
			}
			if (pathname === '/api/inspections' && request.method === 'GET') {
				const user = await requireAuthUser(request, env)
				const folders = await listInspections(env, user)
				return jsonResponse({ folders }, origin)
			}
			if (pathname === '/api/inspections' && request.method === 'PUT') {
				const user = await requireAuthUser(request, env)
				let body: unknown
				try {
					body = await request.json()
				} catch {
					return jsonResponse({ error: 'Invalid JSON body' }, origin, 400)
				}
				const result = await putInspection(env, user, body as Parameters<typeof putInspection>[2])
				if ('error' in result) return jsonResponse({ error: result.error }, origin, result.status)
				return jsonResponse(result, origin)
			}

			const folderParams = folderPathParams(pathname)
			if (folderParams && request.method === 'GET') {
				const user = await requireAuthUser(request, env)
				const result = await getInspection(env, user, folderParams.org, folderParams.folder)
				if ('error' in result) return jsonResponse({ error: result.error }, origin, result.status)
				return jsonResponse(result, origin)
			}

			return jsonResponse({ error: 'Not found' }, origin, 404)
		} catch (err) {
			if (err instanceof AuthError) return authErrorResponse(err, origin)
			console.error(err)
			return jsonResponse({ error: 'Internal server error' }, origin, 500)
		}
	},
}

async function handlePermissions(request: Request, env: Env, origin: string): Promise<Response> {
	const user = await requireAuthUser(request, env)

	if (request.method === 'GET') {
		const permissions = await loadPermissions(env)
		return jsonResponse({ permissions, me: user }, origin)
	}

	if (request.method === 'PUT') {
		if (user.role !== 'admin') {
			return jsonResponse({ error: 'Admin role required' }, origin, 403)
		}
		let body: unknown
		try {
			body = await request.json()
		} catch {
			return jsonResponse({ error: 'Invalid JSON body' }, origin, 400)
		}
		const incoming = (body as { permissions?: unknown })?.permissions ?? body
		const permissions = await savePermissions(env, withBootstrapAdmins(sanitizePermissions(incoming)))
		return jsonResponse({ permissions }, origin)
	}

	return jsonResponse({ error: 'Method not allowed' }, origin, 405)
}

function corsAi(body: string, origin: string, status = 200) {
	return new Response(body, {
		status,
		headers: {
			...getCorsHeaders(origin),
			'Content-Type': 'application/json',
		},
	})
}

async function handleParseTranscript(request: Request, env: Env, origin: string): Promise<Response> {
	let transcript: string
	try {
		const body = await request.json() as { transcript?: string }
		transcript = (body.transcript || '').trim()
	} catch {
		return corsAi(JSON.stringify({ error: 'Invalid JSON body' }), origin, 400)
	}

	if (!transcript) {
		return corsAi(JSON.stringify({ error: 'transcript is required' }), origin, 400)
	}

	const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': env.ANTHROPIC_API_KEY,
			'anthropic-version': '2023-06-01',
		},
		body: JSON.stringify({
			model: 'claude-sonnet-4-6',
			max_tokens: 8192,
			system: systemPrompt,
			messages: [{ role: 'user', content: `TRANSCRIPT:\n\n${transcript}` }],
		}),
	})

	if (!anthropicResp.ok) {
		const err = await anthropicResp.text()
		return corsAi(JSON.stringify({ error: `Anthropic error: ${anthropicResp.status}`, detail: err }), origin, 502)
	}

	const anthropicData = await anthropicResp.json() as { content: { text: string }[], stop_reason?: string }
	let raw = anthropicData.content?.[0]?.text || ''

	raw = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
	const jsonStart = raw.indexOf('{')
	const jsonEnd = raw.lastIndexOf('}')
	if (jsonStart > -1 && jsonEnd > jsonStart) raw = raw.substring(jsonStart, jsonEnd + 1)
	raw = raw.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']')

	try {
		JSON.parse(raw)
	} catch {
		const truncated = anthropicData.stop_reason === 'max_tokens'
		return corsAi(JSON.stringify({
			error: truncated
				? 'AI response was cut off before finishing (too much detail for one pass) — try a shorter transcript or split it into sections.'
				: 'AI returned malformed JSON',
			raw,
		}), origin, 502)
	}

	return corsAi(raw, origin)
}

function parseDataUrl(dataUrl: string): { mediaType: string; data: string } | null {
	const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl || '')
	if (!match) return null
	return { mediaType: match[1], data: match[2] }
}

async function handleMeasureFence(request: Request, env: Env, origin: string): Promise<Response> {
	let referencePhoto: string
	try {
		const body = (await request.json()) as { referencePhoto?: string }
		referencePhoto = body.referencePhoto || ''
	} catch {
		return corsAi(JSON.stringify({ error: 'Invalid JSON body' }), origin, 400)
	}

	const reference = parseDataUrl(referencePhoto)
	if (!reference) {
		return corsAi(JSON.stringify({ error: 'referencePhoto must be an image data URL' }), origin, 400)
	}

	const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': env.ANTHROPIC_API_KEY,
			'anthropic-version': '2023-06-01',
		},
		body: JSON.stringify({
			model: 'claude-sonnet-4-6',
			max_tokens: 1024,
			system: measureFenceSystemPrompt,
			messages: [
				{
					role: 'user',
					content: [
						{ type: 'text', text: 'REFERENCE PHOTO (1ft blue tape placed vertically on a fence plank, with 2+ posts visible):' },
						{ type: 'image', source: { type: 'base64', media_type: reference.mediaType, data: reference.data } },
					],
				},
			],
		}),
	})

	if (!anthropicResp.ok) {
		const err = await anthropicResp.text()
		return corsAi(JSON.stringify({ error: `Anthropic error: ${anthropicResp.status}`, detail: err }), origin, 502)
	}

	const anthropicData = (await anthropicResp.json()) as { content: { text: string }[] }
	let raw = anthropicData.content?.[0]?.text || ''
	raw = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
	const jsonStart = raw.indexOf('{')
	const jsonEnd = raw.lastIndexOf('}')
	if (jsonStart > -1 && jsonEnd > jsonStart) raw = raw.substring(jsonStart, jsonEnd + 1)

	try {
		JSON.parse(raw)
	} catch {
		return corsAi(JSON.stringify({ error: 'AI returned malformed JSON', raw }), origin, 502)
	}

	return corsAi(raw, origin)
}
