import type { AuthUser, Env } from './types'
import { normalizeEmail, type OrgKey } from './access'

export type InspectionFolderSummary = {
	org: OrgKey
	name: string
	ownerEmail: string
	savedAt: string | null
	inspector: string | null
}

function inspectionKey(org: OrgKey, folderName: string) {
	return `inspections/${org}/${folderName}/inspection.json`
}

function photosPrefix(org: OrgKey, folderName: string) {
	return `inspections/${org}/${folderName}/photos/`
}

function decodeFolderSegment(name: string) {
	try {
		return decodeURIComponent(name)
	} catch {
		return name
	}
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; contentType: string } | null {
	const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl || '')
	if (!match) return null
	const contentType = match[1] || 'application/octet-stream'
	const isBase64 = Boolean(match[2])
	const payload = match[3] || ''
	if (isBase64) {
		const binary = atob(payload)
		const bytes = new Uint8Array(binary.length)
		for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
		return { bytes, contentType }
	}
	return { bytes: new TextEncoder().encode(decodeURIComponent(payload)), contentType }
}

function isOwnedByUser(ownerEmail: string, inspector: string | null, user: AuthUser) {
	const owner = normalizeEmail(ownerEmail)
	if (owner && owner === user.email) return true
	const name = String(user.name || '').trim().toLowerCase()
	const insp = String(inspector || '').trim().toLowerCase()
	if (!name || !insp) return false
	return insp === name || insp.includes(name) || name.includes(insp)
}

function visibleOrgsForUser(user: AuthUser): OrgKey[] {
	if (user.role === 'admin') return ['PT', 'TC']
	return [user.org]
}

export async function listInspections(env: Env, user: AuthUser): Promise<InspectionFolderSummary[]> {
	const visibleOrgs = visibleOrgsForUser(user)
	const canSeeAll = user.role === 'supervisor' || user.role === 'admin'
	const folders: InspectionFolderSummary[] = []

	for (const org of visibleOrgs) {
		let cursor: string | undefined
		do {
			const listed = await env.INSPECTIONS.list({
				prefix: `inspections/${org}/`,
				delimiter: '/',
				cursor,
			})

			for (const prefix of listed.delimitedPrefixes || []) {
				// inspections/PT/Folder Name/
				const parts = prefix.replace(/\/$/, '').split('/')
				const folderName = parts.slice(2).join('/')
				if (!folderName) continue

				const obj = await env.INSPECTIONS.head(inspectionKey(org, folderName))
				const ownerEmail = normalizeEmail(obj?.customMetadata?.ownerEmail || '')
				const savedAt = obj?.customMetadata?.savedAt || obj?.uploaded?.toISOString() || null
				const inspector = obj?.customMetadata?.inspector || null

				if (!canSeeAll && !isOwnedByUser(ownerEmail, inspector, user)) continue

				folders.push({
					org,
					name: folderName,
					ownerEmail,
					savedAt,
					inspector,
				})
			}

			cursor = listed.truncated ? listed.cursor : undefined
		} while (cursor)
	}

	folders.sort((a, b) => String(b.savedAt || '').localeCompare(String(a.savedAt || '')))
	return folders
}

export async function getInspection(env: Env, user: AuthUser, orgParam: string, folderParam: string) {
	const org = orgParam as OrgKey
	if (org !== 'PT' && org !== 'TC') {
		return { error: 'Invalid org', status: 400 as const }
	}
	if (user.role !== 'admin' && user.org !== org) {
		return { error: 'Forbidden', status: 403 as const }
	}

	const folderName = decodeFolderSegment(folderParam)
	const key = inspectionKey(org, folderName)
	const obj = await env.INSPECTIONS.get(key)
	if (!obj) return { error: 'Inspection not found', status: 404 as const }

	const inspection = await obj.json() as Record<string, unknown>
	const ownerEmail = normalizeEmail(
		obj.customMetadata?.ownerEmail
		|| (inspection.meta as { ownerEmail?: string } | undefined)?.ownerEmail
		|| '',
	)
	const inspector = obj.customMetadata?.inspector
		|| (inspection.jobInfo as { insp?: string } | undefined)?.insp
		|| null

	const canSeeAll = user.role === 'supervisor' || user.role === 'admin'
	if (!canSeeAll && !isOwnedByUser(ownerEmail, inspector, user)) {
		return { error: 'Forbidden', status: 403 as const }
	}

	return {
		status: 200 as const,
		org,
		name: folderName,
		ownerEmail,
		inspection,
	}
}

export async function putInspection(
	env: Env,
	user: AuthUser,
	body: {
		folderName?: string
		org?: string
		inspection?: Record<string, unknown>
		photos?: Array<{ path?: string[]; name?: string; dataUrl?: string }>
	},
) {
	const folderName = String(body.folderName || '').trim()
	if (!folderName) return { error: 'folderName is required', status: 400 as const }
	if (!body.inspection || typeof body.inspection !== 'object') {
		return { error: 'inspection object is required', status: 400 as const }
	}

	const org = (body.org as OrgKey) || user.org
	if (org !== 'PT' && org !== 'TC') return { error: 'Invalid org', status: 400 as const }
	// Users always save into their own company org.
	if (org !== user.org) return { error: 'Cannot save outside your company org', status: 403 as const }

	const savedAt = new Date().toISOString()
	const meta = {
		...((body.inspection.meta as Record<string, unknown>) || {}),
		ownerEmail: user.email,
		savedAt,
		storage: 'r2',
	}
	const inspection = { ...body.inspection, meta } as Record<string, unknown>
	const inspector = String((inspection.jobInfo as { insp?: string } | undefined)?.insp || user.name || '')

	const key = inspectionKey(org, folderName)
	await env.INSPECTIONS.put(key, JSON.stringify(inspection, null, 2), {
		httpMetadata: { contentType: 'application/json' },
		customMetadata: {
			ownerEmail: user.email,
			savedAt,
			inspector,
		},
	})

	const uploadedPhotos: string[] = []
	const keepNames = new Set<string>()
	for (const photo of body.photos || []) {
		const name = String(photo?.name || '').trim()
		if (!name || !photo?.dataUrl) continue
		const parsed = dataUrlToBytes(photo.dataUrl)
		if (!parsed) continue
		const objectKey = `${photosPrefix(org, folderName)}${name}`
		await env.INSPECTIONS.put(objectKey, parsed.bytes, {
			httpMetadata: { contentType: parsed.contentType },
		})
		uploadedPhotos.push(name)
		keepNames.add(name)
	}

	// When a full photo set is provided, remove stale photos under this folder.
	if (Array.isArray(body.photos)) {
		let cursor: string | undefined
		do {
			const listed = await env.INSPECTIONS.list({
				prefix: photosPrefix(org, folderName),
				cursor,
			})
			for (const obj of listed.objects) {
				const name = obj.key.split('/').pop() || ''
				if (name && !keepNames.has(name)) {
					await env.INSPECTIONS.delete(obj.key)
				}
			}
			cursor = listed.truncated ? listed.cursor : undefined
		} while (cursor)
	}

	return {
		status: 200 as const,
		org,
		folderName,
		key,
		photoCount: uploadedPhotos.length,
		savedAt,
	}
}

export function folderPathParams(pathname: string): { org: string; folder: string } | null {
	// /api/inspections/PT/Folder%20Name
	const match = /^\/api\/inspections\/(PT|TC)\/(.+)$/.exec(pathname)
	if (!match) return null
	return { org: match[1], folder: match[2] }
}
