const ALLOWED_ORIGINS = new Set([
	'https://m-w-johnson-holdco.github.io',
	'http://localhost:5173',
	'http://127.0.0.1:5173',
	'http://localhost:4173',
	'http://127.0.0.1:4173',
])

export function getCorsHeaders(origin: string) {
	const allowed = ALLOWED_ORIGINS.has(origin) ? origin : ''
	return {
		'Access-Control-Allow-Origin': allowed,
		'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		'Access-Control-Max-Age': '86400',
	}
}

export function jsonResponse(body: unknown, origin: string, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			...getCorsHeaders(origin),
			'Content-Type': 'application/json',
		},
	})
}

export function emptyCors(origin: string, status = 204) {
	return new Response(null, { status, headers: getCorsHeaders(origin) })
}
