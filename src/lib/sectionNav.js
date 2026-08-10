import { ROOF_ITEMS, SUBSECTIONS } from '../data/roofItems'
import { ELEV_ITEMS } from '../data/elevItems'
import { EXTERIOR_ITEMS, EXTERIOR_SUBSECTIONS } from '../data/exteriorItems'
import { NOTES_FIELDS } from '../data/notesFields'

export function navAnchorId(key) {
  return `nav-${key}`
}

function roofSubsectionTitle(itemId) {
  const ssIds = Object.keys(SUBSECTIONS)
  const itemIndex = ROOF_ITEMS.findIndex(it => it.id === itemId)
  if (itemIndex < 0) return null

  let title = null
  for (let i = 0; i < ssIds.length; i++) {
    const startId = ssIds[i]
    const from = ROOF_ITEMS.findIndex(it => it.id === startId)
    const to = i + 1 < ssIds.length
      ? ROOF_ITEMS.findIndex(it => it.id === ssIds[i + 1])
      : ROOF_ITEMS.length
    if (itemIndex >= from && itemIndex < to) {
      title = SUBSECTIONS[startId]
      break
    }
  }
  return title
}

function exteriorSubsectionTitle(itemId) {
  const ssIds = Object.keys(EXTERIOR_SUBSECTIONS)
  const itemIndex = EXTERIOR_ITEMS.findIndex(it => it.id === itemId)
  if (itemIndex < 0) return null

  let title = null
  for (let i = 0; i < ssIds.length; i++) {
    const startId = ssIds[i]
    const from = EXTERIOR_ITEMS.findIndex(it => it.id === startId)
    const to = i + 1 < ssIds.length
      ? EXTERIOR_ITEMS.findIndex(it => it.id === ssIds[i + 1])
      : EXTERIOR_ITEMS.length
    if (itemIndex >= from && itemIndex < to) {
      title = EXTERIOR_SUBSECTIONS[startId]
      break
    }
  }
  return title
}

/** Flat catalog of jump targets from Roof → Notes (excludes AI Parse). */
export function buildSectionNavCatalog(rooms = []) {
  const entries = []

  for (const item of ROOF_ITEMS) {
    const subgroup = roofSubsectionTitle(item.id)
    entries.push({
      id: item.id,
      label: item.lbl,
      tab: 0,
      group: '1. Roof',
      subgroup,
      expandKey: subgroup ? `roof:${subgroup}` : null,
      anchorId: navAnchorId(item.id),
    })
  }

  for (const item of ELEV_ITEMS) {
    entries.push({
      id: item.id,
      label: item.lbl,
      tab: 1,
      group: '2. Elevations',
      subgroup: null,
      expandKey: null,
      anchorId: navAnchorId(item.id),
    })
  }

  if (rooms.length === 0) {
    entries.push({
      id: 'interior',
      label: 'Interior Rooms',
      tab: 2,
      group: '3. Interior',
      subgroup: null,
      expandKey: null,
      anchorId: 'section-panel',
    })
  } else {
    for (const room of rooms) {
      const key = `interior-${room.id}`
      entries.push({
        id: key,
        label: room.name || 'Untitled Room',
        tab: 2,
        group: '3. Interior',
        subgroup: null,
        expandKey: `interior:room:${room.id}`,
        anchorId: navAnchorId(key),
      })
    }
  }

  for (const item of EXTERIOR_ITEMS) {
    const subgroup = exteriorSubsectionTitle(item.id)
    entries.push({
      id: item.id,
      label: item.lbl,
      tab: 3,
      group: '4. Exterior',
      subgroup,
      expandKey: subgroup ? `exterior:${subgroup}` : null,
      anchorId: navAnchorId(item.id),
    })
  }

  for (const field of NOTES_FIELDS) {
    const key = `note-${field.key}`
    entries.push({
      id: key,
      label: field.label,
      tab: 4,
      group: '5. Notes',
      subgroup: null,
      expandKey: null,
      anchorId: navAnchorId(key),
    })
  }

  return entries
}

export function groupNavEntries(entries) {
  const groups = []
  let current = null
  for (const entry of entries) {
    if (!current || current.label !== entry.group) {
      current = { label: entry.group, items: [] }
      groups.push(current)
    }
    current.items.push(entry)
  }
  return groups
}
