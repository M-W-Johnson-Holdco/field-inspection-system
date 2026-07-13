import { ROOF_ITEMS } from '../data/roofItems'
import { ELEV_ITEMS, DIRECTIONS } from '../data/elevItems'
import { EXTERIOR_ITEMS } from '../data/exteriorItems'
import { buildRoofLineItems, buildElevLineItems, buildExteriorLineItems } from './xactimateMapping'

// Builds a structured, Xactimate-shaped export from the current inspection data.
// Quantities are only populated where the inspection form actually captures a
// measurement (e.g. ridge vent LF, gutter qty); most quantities need to be filled
// in Xactimate from EagleView/Hover measurements or a manual takeoff.
export function buildXactimateExport(data) {
  const lineItems = []

  ROOF_ITEMS.forEach(itemDef => {
    lineItems.push(...buildRoofLineItems(itemDef, data.roofData?.[itemDef.id]))
  })

  ELEV_ITEMS.forEach(itemDef => {
    DIRECTIONS.forEach(dir => {
      lineItems.push(...buildElevLineItems(itemDef, dir, data.elevData?.[`${itemDef.id}_${dir}`]))
    })
  })

  EXTERIOR_ITEMS.forEach(itemDef => {
    lineItems.push(...buildExteriorLineItems(itemDef, data.exteriorData?.[itemDef.id]))
  })

  const ji = data.jobInfo || {}
  const job = {
    customer: ji.cust || '',
    phone: ji.phone || '',
    email: ji.email || '',
    address: ji.addr || '',
    insuranceCo: ji.ins || '',
    claimNumber: ji.claim || '',
    claimFileDate: ji.claimFileDate || '',
    stormDate: ji.stormDate || '',
    projectManager: ji.pm || '',
    inspector: ji.insp || '',
  }

  const notes = data.notesData || {}

  return { job, lineItems, notes }
}

function csvEscape(value) {
  const str = value == null ? '' : String(value)
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export function xactimateExportToCSV({ job, lineItems }) {
  const header = ['Trade', 'Category', 'Description', 'Qty', 'Unit', 'Damaged', 'Note']
  const rows = lineItems.map(li => [
    li.trade, li.category, li.description,
    li.qty ?? '', li.unit, li.damaged === true ? 'Yes' : li.damaged === false ? 'No' : '',
    li.note || '',
  ])
  const jobHeader = [`# ${job.customer} — ${job.address}`, `Claim ${job.claimNumber || 'N/A'} (${job.insuranceCo || 'N/A'})`]
  return [
    ...jobHeader,
    header.join(','),
    ...rows.map(row => row.map(csvEscape).join(',')),
  ].join('\n')
}

export function xactimateExportToJSON(exportData) {
  return JSON.stringify(exportData, null, 2)
}

export function downloadTextFile(filename, contents, mimeType = 'text/plain') {
  const blob = new Blob([contents], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

