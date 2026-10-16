import type { Env } from './types'

// Speech-to-text for the AI Transcript Parser's Record button. The app records
// a walkthrough in pieces of a few minutes and posts each piece here as raw
// audio (webm/opus from Chrome/Android, mp4/aac from iOS Safari); the text is
// stitched back together on the device. Workers AI Whisper, ~$0.0005/min.
const MAX_AUDIO_BYTES = 15 * 1024 * 1024

function bytesToBase64(bytes: Uint8Array): string {
	let binary = ''
	const chunk = 0x8000
	for (let i = 0; i < bytes.length; i += chunk) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
	}
	return btoa(binary)
}

export async function transcribeAudio(request: Request, env: Env): Promise<{ status: number; body: object }> {
	const type = (request.headers.get('Content-Type') || '').split(';')[0].trim()
	if (!type.startsWith('audio/') && !type.startsWith('video/')) {
		return { status: 400, body: { error: 'Send the recording as raw audio' } }
	}
	const bytes = new Uint8Array(await request.arrayBuffer())
	if (!bytes.length) return { status: 400, body: { error: 'The recording was empty' } }
	if (bytes.length > MAX_AUDIO_BYTES) return { status: 413, body: { error: 'Recording piece is too large' } }

	const result = await env.AI.run('@cf/openai/whisper-large-v3-turbo', {
		audio: bytesToBase64(bytes),
		language: 'en',
		vad_filter: true,
		// Steers spelling of trade terms the parser looks for.
		initial_prompt: 'Roofing inspection walkthrough: shingles, ridge cap, drip edge, pipe jacks, valleys, gutters, downspouts, elevations, hail hits, test square, pitch.',
	})
	return { status: 200, body: { text: String(result?.text || '').trim() } }
}
