import { jsPDF } from 'jspdf'
import { buildConditionSummary } from './conditionSummary'

const MARGIN = 48
const PAGE = { w: 612, h: 792 } // letter pt

function ensureSpace(doc, y, needed, margin = MARGIN) {
  const pageHeight = doc.internal.pageSize.getHeight()
  if (y + needed <= pageHeight - margin) return y
  doc.addPage()
  return margin
}

function writeWrapped(doc, text, x, y, maxWidth, lineHeight = 13) {
  const lines = doc.splitTextToSize(String(text ?? ''), maxWidth)
  doc.text(lines, x, y)
  return y + lines.length * lineHeight
}

function sectionHeading(doc, title, y, usableWidth) {
  y = ensureSpace(doc, y, 36)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(30, 41, 59)
  doc.text(title, MARGIN, y)
  y += 6
  doc.setDrawColor(15, 118, 110)
  doc.setLineWidth(1.5)
  doc.line(MARGIN, y, MARGIN + Math.min(160, usableWidth), y)
  y += 16
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  return y
}

function drawTitlePage(doc, summary) {
  const { job, frontOfHousePhotoUrl } = summary
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const usableWidth = pageWidth - MARGIN * 2
  let y = 72

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 118, 110)
  doc.text('FIELD INSPECTION', MARGIN, y)
  y += 28

  doc.setTextColor(15, 23, 42)
  doc.setFontSize(26)
  doc.text(job.reportTitle || 'Roof Inspection Report', MARGIN, y)
  y += 18

  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(1)
  doc.line(MARGIN, y, pageWidth - MARGIN, y)
  y += 28

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(100, 116, 139)
  doc.text('Prepared for', MARGIN, y)
  y += 18

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(15, 23, 42)
  doc.text(job.customer || 'Unnamed customer', MARGIN, y)
  y += 22

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  y = writeWrapped(doc, job.address || 'No address on file', MARGIN, y, usableWidth, 16)
  y += 10

  const meta = [
    job.claimNumber && `Claim ${job.claimNumber}`,
    job.insuranceCo,
    Array.isArray(job.lossType) && job.lossType.length ? job.lossType.join(', ') : null,
    job.stormDate && `Date of loss ${job.stormDate}`,
  ].filter(Boolean)

  if (meta.length) {
    doc.setFontSize(10)
    doc.setTextColor(71, 85, 105)
    y = writeWrapped(doc, meta.join('  ·  '), MARGIN, y, usableWidth, 13)
    y += 8
  }

  const photoMaxW = usableWidth
  const photoMaxH = 280
  let photoDrawn = false

  if (frontOfHousePhotoUrl) {
    try {
      const format = /^data:image\/png/i.test(frontOfHousePhotoUrl) ? 'PNG' : 'JPEG'
      const props = doc.getImageProperties(frontOfHousePhotoUrl)
      const ratio = props.width / Math.max(1, props.height)
      let imgW = photoMaxW
      let imgH = imgW / ratio
      if (imgH > photoMaxH) {
        imgH = photoMaxH
        imgW = imgH * ratio
      }
      y = ensureSpace(doc, y, imgH + 24)
      y += 12
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
      doc.text('FRONT OF HOUSE', MARGIN, y)
      y += 10
      doc.addImage(frontOfHousePhotoUrl, format, MARGIN, y, imgW, imgH, undefined, 'FAST')
      y += imgH + 16
      photoDrawn = true
    } catch (err) {
      console.warn('Could not add front-of-house photo to PDF:', err)
    }
  }

  if (!photoDrawn) {
    y += 16
    doc.setDrawColor(203, 213, 225)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(MARGIN, y, usableWidth, 120, 6, 6, 'FD')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(148, 163, 184)
    doc.text('No front-of-house photo attached', pageWidth / 2, y + 62, { align: 'center' })
    y += 140
  }

  // Footer block on title page
  const footerY = pageHeight - 72
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(71, 85, 105)
  const inspectorLine = [
    job.inspector && `Inspector: ${job.inspector}`,
    job.projectManager && `PM: ${job.projectManager}`,
  ].filter(Boolean).join('  ·  ')
  if (inspectorLine) doc.text(inspectorLine, MARGIN, footerY)

  const dateLabel = new Date(job.generatedAt || Date.now()).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  doc.text(dateLabel, pageWidth - MARGIN, footerY, { align: 'right' })
}

function drawDamageSection(doc, summary) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const usableWidth = pageWidth - MARGIN * 2
  let y = MARGIN

  y = sectionHeading(doc, 'Damage Summary', y, usableWidth)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(15, 23, 42)
  doc.text(String(summary.damageCount), MARGIN, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(71, 85, 105)
  doc.text(
    summary.damageCount === 1 ? 'damaged item requiring attention' : 'damaged items requiring attention',
    MARGIN + 28,
    y,
  )
  y += 22

  if (!summary.findings.length) {
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    doc.text('No damaged items were marked on this inspection.', MARGIN, y)
    return y + 16
  }

  summary.findings.forEach((finding, index) => {
    const blockEstimate = 48
    y = ensureSpace(doc, y, blockEstimate)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    const title = `${index + 1}. ${finding.item}`
    y = writeWrapped(doc, title, MARGIN, y, usableWidth, 13)

    const metaBits = [finding.section, finding.detail].filter(Boolean)
    if (metaBits.length) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
      y = writeWrapped(doc, metaBits.join(' · '), MARGIN + 14, y, usableWidth - 14, 12)
    }

    if (finding.description) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(51, 65, 85)
      y = writeWrapped(doc, finding.description, MARGIN + 14, y, usableWidth - 14, 13)
    }

    y += 10
  })

  return y
}

function drawNotesSection(doc, summary, startY) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const usableWidth = pageWidth - MARGIN * 2
  let y = startY + 8

  y = sectionHeading(doc, 'Inspector Notes', y, usableWidth)

  if (!summary.inspectorNotes.length) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    doc.text('No inspector notes were entered.', MARGIN, y)
    return
  }

  summary.inspectorNotes.forEach(note => {
    y = ensureSpace(doc, y, 40)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    doc.text(note.label, MARGIN, y)
    y += 13
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(51, 65, 85)
    y = writeWrapped(doc, note.text, MARGIN, y, usableWidth, 13)
    y += 12
  })
}

export function downloadConditionSummaryPdf(data, filename) {
  const summary = buildConditionSummary(data)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })

  drawTitlePage(doc, summary)
  doc.addPage()
  const afterDamageY = drawDamageSection(doc, summary)
  drawNotesSection(doc, summary, afterDamageY)

  const safeCustomer = String(summary.job.customer || 'inspection')
    .replace(/[^\w\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 40) || 'inspection'

  doc.save(filename || `${safeCustomer}_condition_summary.pdf`)
  return summary
}

export { PAGE }
