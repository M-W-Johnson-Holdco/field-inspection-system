import woTradesSystemPrompt from './prompts/wo-trades-system-prompt.txt'
import type { Env } from './types'
import { jsonResponse } from './cors'

// TC portal Work Order → "Other Trades" table. The browser sends the worksheet
// invoice PDF and the insurance estimate PDF; Claude compares them and returns
// one row per non-main-roof line item, flagged where the two disagree. The
// portal turns the rows into the same pipe table its paste box already reads.

// Anthropic caps a request at 32 MB; base64 adds a third, so keep the two PDFs
// well under that.
const MAX_PDF_BASE64_CHARS = 30 * 1024 * 1024

type Body = { pdfs?: unknown; trades?: unknown }

function pdfBase64(value: unknown): string | null {
	const s = String(value || '').replace(/^data:application\/pdf;base64,/, '')
	// %PDF- in base64 always starts "JVBERi0".
	return s.startsWith('JVBERi0') ? s : null
}

function rowsSchema(trades: string[]) {
	return {
		type: 'object',
		additionalProperties: false,
		required: ['rows', 'general_flags'],
		properties: {
			rows: {
				type: 'array',
				items: {
					type: 'object',
					additionalProperties: false,
					required: ['trade', 'source_trade', 'description', 'rcv', 'depreciation', 'nrd', 'flag'],
					properties: {
						trade: { type: 'string', enum: [...trades, 'Other'] },
						source_trade: { type: 'string' },
						description: { type: 'string' },
						rcv: { type: 'number' },
						depreciation: { type: 'number' },
						nrd: { type: 'boolean' },
						flag: { type: 'string' },
					},
				},
			},
			general_flags: { type: 'array', items: { type: 'string' } },
		},
	}
}

export async function handleWoTradesFromPdfs(request: Request, env: Env, origin: string): Promise<Response> {
	let body: Body
	try {
		body = (await request.json()) as Body
	} catch {
		return jsonResponse({ error: 'Invalid JSON body' }, origin, 400)
	}
	// Either order — Claude works out which one is the worksheet invoice.
	const pdfs = Array.isArray(body.pdfs) ? body.pdfs.map(pdfBase64) : []
	if (pdfs.length !== 2 || !pdfs[0] || !pdfs[1]) {
		return jsonResponse({ error: 'Send both PDFs: the worksheet invoice and the insurance estimate.' }, origin, 400)
	}
	const [pdfA, pdfB] = pdfs as [string, string]
	if (pdfA.length + pdfB.length > MAX_PDF_BASE64_CHARS) {
		return jsonResponse({ error: 'The two PDFs are too large together (keep them under about 20 MB).' }, origin, 413)
	}
	const trades = Array.isArray(body.trades)
		? body.trades.map((t) => String(t || '').trim()).filter((t) => t && t.length <= 60).slice(0, 80)
		: []
	if (!trades.length) return jsonResponse({ error: 'Missing trade list' }, origin, 400)

	const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': env.ANTHROPIC_API_KEY,
			'anthropic-version': '2026-10-21',
			// A safety decline is re-run on Anthropic's recommended fallback model.
			'anthropic-beta': 'server-side-fallback-2026-07-01',
		},
		body: JSON.stringify({
			model: 'claude-opus-5-5',
			max_tokens: 16000,
			fallbacks: 'default',
			output_config: { effort: 'high', format: { type: 'json_schema', schema: rowsSchema(trades) } },
			system: woTradesSystemPrompt,
			messages: [
				{
					role: 'user',
					content: [
						{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfA } },
						{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfB } },
						{ type: 'text', text: 'Allowed trades: ' + trades.join(', ') + '\n\nReturn the Other Trades rows for this job.' },
					],
				},
			],
		}),
	})

	if (!anthropicResp.ok) {
		const detail = await anthropicResp.text()
		console.error('wo-trades anthropic error', anthropicResp.status, detail)
		return jsonResponse({ error: `Claude request failed (${anthropicResp.status})`, detail: detail.slice(0, 500) }, origin, 502)
	}

	const data = (await anthropicResp.json()) as {
		stop_reason?: string
		content?: Array<{ type: string; text?: string }>
	}
	if (data.stop_reason === 'refusal') {
		return jsonResponse({ error: 'Claude declined to read these documents.' }, origin, 502)
	}
	if (data.stop_reason === 'max_tokens') {
		return jsonResponse({ error: 'The estimate was too long to finish in one pass.' }, origin, 502)
	}
	const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text || '').join('')
	try {
		return jsonResponse(JSON.parse(text), origin)
	} catch {
		return jsonResponse({ error: 'Claude returned malformed JSON', raw: text.slice(0, 500) }, origin, 502)
	}
}
