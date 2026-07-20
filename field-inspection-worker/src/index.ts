import systemPrompt from './prompts/parse-system-prompt.txt'
import measureFenceSystemPrompt from './prompts/measure-fence-system-prompt.txt'

interface Env {
	ANTHROPIC_API_KEY: string
}

const ALLOWED_ORIGINS = new Set([
	'https://m-w-johnson-holdco.github.io',
])

function getCorsHeaders(origin: string) {
	const allowed = ALLOWED_ORIGINS.has(origin) ? origin : ''
	return {
		'Access-Control-Allow-Origin': allowed,
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
	}
}

function cors(body: string, origin: string, status = 200) {
	return new Response(body, {
		status,
		headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
	})
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const origin = request.headers.get('Origin') || ''

		// Preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: getCorsHeaders(origin) })
		}

		if (request.method !== 'POST') {
			return cors(JSON.stringify({ error: 'Method not allowed' }), origin, 405)
		}

		const { pathname } = new URL(request.url)
		if (pathname === '/measure-fence') {
			return handleMeasureFence(request, env, origin)
		}

		let transcript: string
		try {
			const body = await request.json() as { transcript?: string }
			transcript = (body.transcript || '').trim()
		} catch {
			return cors(JSON.stringify({ error: 'Invalid JSON body' }), origin, 400)
		}

		if (!transcript) {
			return cors(JSON.stringify({ error: 'transcript is required' }), origin, 400)
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
			return cors(JSON.stringify({ error: `Anthropic error: ${anthropicResp.status}`, detail: err }), origin, 502)
		}

		const anthropicData = await anthropicResp.json() as { content: { text: string }[], stop_reason?: string }
		let raw = anthropicData.content?.[0]?.text || ''

		// Strip markdown fences if present
		raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
		const jsonStart = raw.indexOf('{')
		const jsonEnd = raw.lastIndexOf('}')
		if (jsonStart > -1 && jsonEnd > jsonStart) raw = raw.substring(jsonStart, jsonEnd + 1)
		raw = raw.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']')

		// Validate it's parseable before returning
		try {
			JSON.parse(raw)
		} catch {
			const truncated = anthropicData.stop_reason === 'max_tokens'
			return cors(JSON.stringify({
				error: truncated
					? 'AI response was cut off before finishing (too much detail for one pass) — try a shorter transcript or split it into sections.'
					: 'AI returned malformed JSON',
				raw,
			}), origin, 502)
		}

		return cors(raw, origin)
	},
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
		return cors(JSON.stringify({ error: 'Invalid JSON body' }), origin, 400)
	}

	const reference = parseDataUrl(referencePhoto)
	if (!reference) {
		return cors(JSON.stringify({ error: 'referencePhoto must be an image data URL' }), origin, 400)
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
		return cors(JSON.stringify({ error: `Anthropic error: ${anthropicResp.status}`, detail: err }), origin, 502)
	}

	const anthropicData = (await anthropicResp.json()) as { content: { text: string }[] }
	let raw = anthropicData.content?.[0]?.text || ''
	raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
	const jsonStart = raw.indexOf('{')
	const jsonEnd = raw.lastIndexOf('}')
	if (jsonStart > -1 && jsonEnd > jsonStart) raw = raw.substring(jsonStart, jsonEnd + 1)

	try {
		JSON.parse(raw)
	} catch {
		return cors(JSON.stringify({ error: 'AI returned malformed JSON', raw }), origin, 502)
	}

	return cors(raw, origin)
}
