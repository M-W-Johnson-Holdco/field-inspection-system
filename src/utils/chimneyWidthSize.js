import { formatMeasurementDisplay, measurementToDecimalInches } from './measurement'

export const CHIMNEY_WIDTH_SIZE_LEGEND = 'Small ≤23" · Medium 24–36" · Large 37"+'

/** Representative width used when migrating legacy Small/Medium/Large labels. */
export const CHIMNEY_SIZE_TO_WIDTH = {
  Small: '18"',
  Medium: '30"',
  Large: '42"',
}

export function chimneyWidthInches(fields = {}) {
  return measurementToDecimalInches(fields.Width, { unitHint: 'mixed' })
}

/** Bucket by width inches — Small ≤23", Medium 24–36", Large 37"+. */
export function chimneyWidthSizeBucket(widthInches) {
  const w = Number(widthInches)
  if (!Number.isFinite(w) || w <= 0) return null
  if (w < 24) return 'Small'
  if (w < 37) return 'Medium'
  return 'Large'
}

export function chimneyWidthSizeBucketFromFields(fields = {}) {
  const inches = chimneyWidthInches(fields)
  if (inches != null && inches > 0) return chimneyWidthSizeBucket(inches)

  const raw = fields['Size / Width']
  if (raw == null || raw === '' || raw === 'Select') return null
  const text = String(raw)
  if (/^Small/i.test(text)) return 'Small'
  if (/^Medium/i.test(text)) return 'Medium'
  if (/^Large/i.test(text)) return 'Large'
  return null
}

export function countChimneyWidthSizeBuckets(subItems = []) {
  const counts = { Small: 0, Medium: 0, Large: 0 }
  for (const sub of subItems) {
    const bucket = chimneyWidthSizeBucketFromFields(sub?.fields || {})
    if (bucket) counts[bucket] += 1
  }
  return counts
}

export function formatChimneyWidth(fields = {}) {
  if (fields.Width) {
    return formatMeasurementDisplay(fields.Width, { unitHint: 'mixed' })
  }
  // Legacy size labels are not measurements — show nothing for width display.
  return ''
}

/** Map legacy Size / Width dropdown / parse labels to a Width measurement string. */
export function widthFromLegacyChimneySize(value) {
  if (value == null || value === '' || value === 'Select') return ''
  const text = String(value).trim()
  if (/^small/i.test(text)) return CHIMNEY_SIZE_TO_WIDTH.Small
  if (/^medium/i.test(text)) return CHIMNEY_SIZE_TO_WIDTH.Medium
  if (/^large/i.test(text)) return CHIMNEY_SIZE_TO_WIDTH.Large

  // Already a measurement string (e.g. from AI width field) — keep it.
  const asMeasurement = measurementToDecimalInches(text, { unitHint: 'mixed' })
  if (asMeasurement != null && asMeasurement > 0 && !/^(Small|Medium|Large)/i.test(text)) {
    return formatMeasurementDisplay(text, { unitHint: 'mixed' }) || text
  }

  const inches = Number(text.match(/\d+(?:\.\d+)?/)?.[0])
  if (!Number.isFinite(inches)) return ''
  return formatMeasurementDisplay(`${inches}"`, { unitHint: 'mixed' }) || `${inches}"`
}
