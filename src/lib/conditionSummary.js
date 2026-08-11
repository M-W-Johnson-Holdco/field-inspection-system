import { NOTES_FIELDS } from '../data/notesFields'
import { buildXactimateExport } from './xactimateExport'
import { directionLabel } from '../utils/elevationCompass'

function cleanText(value) {
  if (value == null) return ''
  const text = String(value).trim()
  if (!text || text === 'n/a' || text === 'N/A' || text === 'Select') return ''
  return text
}

function damagePartsLabel(fields = {}) {
  if (!Array.isArray(fields.Damaged)) return ''
  return fields.Damaged.filter(part => part && part !== 'N/A').join(', ')
}

function pushFinding(findings, { section, item, detail, description }) {
  const desc = cleanText(description)
  const det = cleanText(detail)
  findings.push({
    section: section || 'General',
    item: item || 'Item',
    detail: det,
    description: desc,
  })
}

function collectInteriorFindings(data, findings) {
  const rooms = data?.interiorData?.rooms || []
  rooms.forEach(room => {
    const f = room.fields || {}
    const roomName = room.name?.startsWith('Other - ') && room.customName
      ? room.customName
      : (room.name || 'Room')
    const story = cleanText(f.story)
    const location = story ? `${roomName} (${story})` : roomName

    ;[
      ['Ceiling Damage', f.ceilingDamage, f.ceilingNotes],
      ['Wall Damage', f.wallDamage, f.wallNotes],
      ['Floor Damage', f.floorDamage, f.floorNotes],
      ['Mold / Mildew', f.moldPresent, f.moldNotes],
    ].forEach(([label, yn, notes]) => {
      if (yn !== 'Yes') return
      pushFinding(findings, {
        section: 'Interior',
        item: location,
        detail: label,
        description: notes,
      })
    })
  })
}

function collectDeckGroupFindings(cell, dirLabel, findings) {
  const fields = cell?.fields || {}
  ;[
    ['Surface', 'Surface Damaged', '_surface_damage'],
    ['Railing', 'Railing Damaged', '_railing_damage'],
    ['Stairs', 'Stairs Damaged', '_stairs_damage'],
  ].forEach(([label, damageKey, descKey]) => {
    if (fields[damageKey] !== 'Yes') return
    pushFinding(findings, {
      section: 'Elevations',
      item: `${dirLabel} — Deck ${label}`,
      detail: 'Damaged',
      description: fields[descKey],
    })
  })
}

/** Prefer Front of House photo from Property Details. */
export function getFrontOfHousePhotoUrl(data = {}) {
  const photos = data?.jobInfo?.frontOfHousePhotos
  if (!Array.isArray(photos) || !photos.length) return null
  const first = photos[0]
  if (typeof first === 'string' && first) return first
  if (first && typeof first.url === 'string' && first.url) return first.url
  return null
}

export function buildConditionSummary(data = {}) {
  const exportData = buildXactimateExport(data)
  const { job, lineItems, notes } = exportData
  const findings = []

  lineItems.forEach(li => {
    if (li?.damaged !== true) return
    pushFinding(findings, {
      section: li.trade || 'Inspection',
      item: li.description || 'Damaged item',
      detail: li.unit && li.qty != null ? `${li.qty} ${li.unit}` : '',
      description: li.note,
    })
  })

  // Deck groups may be partially covered by elev mappers; collect explicit yes marks.
  const frontOfRisk = data?.jobInfo?.frontOfRiskDirection || ''
  Object.entries(data?.elevData || {}).forEach(([cellKey, cell]) => {
    if (!cellKey.startsWith('ev14_') || cell?.excluded) return
    const dir = cellKey.replace(/^ev14_/, '')
    collectDeckGroupFindings(cell, directionLabel(dir, frontOfRisk), findings)
  })

  collectInteriorFindings(data, findings)

  // Deduplicate identical rows (e.g. deck also emitted via line items)
  const seen = new Set()
  const uniqueFindings = findings.filter(f => {
    const key = `${f.section}|${f.item}|${f.detail}|${f.description}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const inspectorNotes = NOTES_FIELDS
    .map(field => ({
      key: field.key,
      label: field.label,
      text: cleanText(notes?.[field.key]),
    }))
    .filter(entry => entry.text)

  return {
    job: {
      ...job,
      reportTitle: 'Roof Inspection Report',
      generatedAt: new Date().toISOString(),
    },
    frontOfHousePhotoUrl: getFrontOfHousePhotoUrl(data),
    damageCount: uniqueFindings.length,
    findings: uniqueFindings,
    inspectorNotes,
  }
}
