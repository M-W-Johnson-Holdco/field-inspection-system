import { jsPDF } from 'jspdf'
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

function pdfCell(doc, text, x, y, maxWidth) {
  const lines = doc.splitTextToSize(String(text ?? ''), maxWidth)
  doc.text(lines, x, y)
  return lines.length
}

export function downloadXactimatePdf(exportData, filename) {
  const { job, lineItems, notes } = exportData
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 36
  const usableWidth = pageWidth - margin * 2
  let y = margin

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('Inspection Export', margin, y)
  y += 18

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const jobLines = [
    job.customer || 'Unnamed customer',
    job.address || 'No address',
    `${job.insuranceCo || 'No insurance'} — Claim ${job.claimNumber || 'N/A'}`,
    [job.inspector && `Inspector: ${job.inspector}`, job.projectManager && `PM: ${job.projectManager}`]
      .filter(Boolean)
      .join('  ·  '),
  ].filter(Boolean)

  jobLines.forEach(line => {
    doc.text(line, margin, y)
    y += 14
  })
  y += 8

  const cols = [
    { key: 'trade', label: 'Trade', width: 55 },
    { key: 'description', label: 'Description', width: 180 },
    { key: 'qty', label: 'Qty', width: 32 },
    { key: 'unit', label: 'Unit', width: 32 },
    { key: 'damaged', label: 'Damaged', width: 48 },
    { key: 'note', label: 'Note', width: usableWidth - 55 - 180 - 32 - 32 - 48 },
  ]

  function drawHeader() {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    let x = margin
    cols.forEach(col => {
      doc.text(col.label, x, y)
      x += col.width
    })
    y += 6
    doc.setDrawColor(180)
    doc.line(margin, y, pageWidth - margin, y)
    y += 12
    doc.setFont('helvetica', 'normal')
  }

  drawHeader()

  lineItems.forEach(li => {
    const values = [
      li.trade || '',
      li.description || '',
      li.qty == null ? '—' : String(li.qty),
      li.unit || '',
      li.damaged === true ? 'Yes' : li.damaged === false ? 'No' : '—',
      li.note || '',
    ]
    const lineCounts = values.map((value, i) =>
      doc.splitTextToSize(value, Math.max(20, cols[i].width - 6)).length
    )
    const rowHeight = Math.max(...lineCounts) * 11 + 6

    if (y + rowHeight > pageHeight - margin) {
      doc.addPage()
      y = margin
      drawHeader()
    }

    let x = margin
    values.forEach((value, i) => {
      pdfCell(doc, value, x, y, Math.max(20, cols[i].width - 6))
      x += cols[i].width
    })
    y += rowHeight
  })

  const noteEntries = Object.entries(notes || {}).filter(([, value]) => value != null && String(value).trim())
  if (noteEntries.length) {
    if (y + 40 > pageHeight - margin) {
      doc.addPage()
      y = margin
    }
    y += 10
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('Notes', margin, y)
    y += 14
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    noteEntries.forEach(([key, value]) => {
      const block = doc.splitTextToSize(`${key}: ${value}`, usableWidth)
      if (y + block.length * 11 > pageHeight - margin) {
        doc.addPage()
        y = margin
      }
      doc.text(block, margin, y)
      y += block.length * 11 + 4
    })
  }

  doc.save(filename || 'inspection_export.pdf')
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

