#!/usr/bin/env node
// Copies each portal's Google Sheets credentials (the ones its page already
// uses to read the UserPermissions tab) into the field-inspection-worker's
// Cloudflare secrets, so the API can map portal roles to inspection roles.
//
// Values are read from the published portal pages and piped straight into
// `wrangler secret put` — they are never printed. Re-run after the portals'
// GS_* GitHub secrets change.
//
// Usage (from the field-inspection-system folder, signed in with wrangler):
//   node scripts/set-portal-sheet-secrets.mjs           (sets the secrets)
//   node scripts/set-portal-sheet-secrets.mjs --check   (dry run, prints lengths only)

import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const PORTALS = {
	TC: 'https://m-w-johnson-holdco.github.io/tc-roofing-automation/',
	PT: 'https://m-w-johnson-holdco.github.io/peachtree-roofing-automation/',
}
const FIELDS = {
	GS_CLIENT_ID: 'CRED_GS_CLIENT_ID',
	GS_CLIENT_SECRET: 'CRED_GS_CLIENT_SECRET',
	GS_REFRESH_TOKEN: 'CRED_GS_REFRESH_TOKEN',
	GS_SHEET_ID: 'CRED_GS_SHEET_ID',
}

const workerDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'field-inspection-worker')
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
// --check: only report whether each value was found (lengths, never values).
const CHECK_ONLY = process.argv.includes('--check')

let failed = false
for (const [portal, url] of Object.entries(PORTALS)) {
	const html = await (await fetch(`${url}?v=${Date.now()}`)).text()
	for (const [suffix, varName] of Object.entries(FIELDS)) {
		// Injected GitHub secrets may carry a trailing newline inside the quotes.
		const match = new RegExp(`var ${varName}\\s*=\\s*(["'])([\\s\\S]*?)\\1`).exec(html)
		const value = match ? match[2].trim() : ''
		const secretName = `${portal}_${suffix}`
		if (!value) {
			console.error(`✗ ${secretName}: not found on ${url}`)
			failed = true
			continue
		}
		if (CHECK_ONLY) {
			console.log(`✓ ${secretName} found (${value.length} chars)`)
			continue
		}
		const result = spawnSync(npx, ['wrangler', 'secret', 'put', secretName], {
			cwd: workerDir,
			input: value,
			encoding: 'utf8',
			shell: process.platform === 'win32',
		})
		if (result.status === 0) {
			console.log(`✓ ${secretName} set`)
		} else {
			console.error(`✗ ${secretName}: wrangler failed\n${(result.stderr || '').trim()}`)
			failed = true
		}
	}
}
process.exit(failed ? 1 : 0)
