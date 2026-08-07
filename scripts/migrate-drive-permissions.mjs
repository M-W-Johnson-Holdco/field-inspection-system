#!/usr/bin/env node
/**
 * One-shot: copy Shared Drive _config/permissions.json → Worker R2/KV.
 *
 * Usage (from repo root):
 *   GOOGLE_ACCESS_TOKEN='ya29...' node scripts/migrate-drive-permissions.mjs
 *
 * Token needs Drive scope on the Field Inspection Shared Drive.
 * Same token is used to authenticate to the Worker (allowed company domain + admin).
 */

const SHARED_DRIVE_ID = '0AK1E74Jk62nmUk9PVA'
const CONFIG_FOLDER = '_config'
const PERMISSIONS_FILE = 'permissions.json'
const WORKER_URL =
  process.env.VITE_INSPECTION_WORKER_URL
  || process.env.WORKER_URL
  || 'https://field-inspection-worker.k-liss.workers.dev'

const DRIVE = 'https://www.googleapis.com/drive/v3'
const SD = 'supportsAllDrives=true&includeItemsFromAllDrives=true'

const token = process.env.GOOGLE_ACCESS_TOKEN || process.argv[2]
if (!token) {
  console.error('Missing GOOGLE_ACCESS_TOKEN (or pass token as first argument).')
  process.exit(1)
}

async function driveJson(url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Drive ${res.status}: ${text}`)
  }
  return res.json()
}

async function findChildId(parentId, name) {
  const q = `name=${JSON.stringify(name)} and ${JSON.stringify(parentId)} in parents and trashed=false`
  const data = await driveJson(
    `${DRIVE}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&${SD}&corpora=drive&driveId=${SHARED_DRIVE_ID}`,
  )
  return data.files?.[0]?.id || null
}

async function main() {
  console.log('Looking up Drive _config/permissions.json…')
  const configId = await findChildId(SHARED_DRIVE_ID, CONFIG_FOLDER)
  if (!configId) throw new Error(`Folder "${CONFIG_FOLDER}" not found on Shared Drive`)

  const fileId = await findChildId(configId, PERMISSIONS_FILE)
  if (!fileId) throw new Error(`${PERMISSIONS_FILE} not found in ${CONFIG_FOLDER}`)

  const mediaRes = await fetch(`${DRIVE}/files/${fileId}?alt=media&${SD}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!mediaRes.ok) {
    throw new Error(`Failed to download permissions.json: Drive ${mediaRes.status}`)
  }
  const permissions = await mediaRes.json()
  const userCount = Array.isArray(permissions?.users) ? permissions.users.length : 0
  console.log(`Downloaded permissions.json (${userCount} users in list).`)

  console.log(`PUT ${WORKER_URL}/api/permissions …`)
  const putRes = await fetch(`${WORKER_URL}/api/permissions`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ permissions }),
  })
  const body = await putRes.json().catch(() => ({}))
  if (!putRes.ok) {
    throw new Error(`Worker ${putRes.status}: ${body.error || JSON.stringify(body)}`)
  }

  const savedCount = Array.isArray(body?.permissions?.users) ? body.permissions.users.length : '?'
  console.log(`Done. Worker now has ${savedCount} users.`)
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
