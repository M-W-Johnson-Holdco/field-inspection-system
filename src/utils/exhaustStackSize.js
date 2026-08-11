import { formatMeasurementDisplay, measurementToDecimalInches } from './measurement'

export const EXHAUST_STACK_SIZE_LEGEND = 'Small 3–4" · Medium 5–7" · Large 8"+'

/** Midpoint diameter used when migrating legacy Small/Medium/Large labels. */
export const EXHAUST_STACK_SIZE_TO_DIAMETER = {
  Small: '3½"',
  Medium: '6"',
  Large: '8"',
}

export function exhaustStackDiameterInches(fields = {}) {
  return measurementToDecimalInches(fields.Diameter ?? fields.Height, { unitHint: 'mixed' })
}

/** Bucket by diameter inches — Small 3–4", Medium 5–7", Large 8"+. */
export function exhaustStackSizeBucket(diameterInches) {
  const d = Number(diameterInches)
  if (!Number.isFinite(d) || d <= 0) return null
  if (d >= 3 && d < 5) return 'Small'
  if (d >= 5 && d < 8) return 'Medium'
  if (d >= 8) return 'Large'
  return null
}

export function exhaustStackSizeBucketFromFields(fields = {}) {
  return exhaustStackSizeBucket(exhaustStackDiameterInches(fields))
}

export function countExhaustStackSizeBuckets(subItems = []) {
  const counts = { Small: 0, Medium: 0, Large: 0 }
  for (const sub of subItems) {
    const bucket = exhaustStackSizeBucketFromFields(sub?.fields || {})
    if (bucket) counts[bucket] += 1
  }
  return counts
}

export function formatExhaustStackDiameter(fields = {}) {
  return formatMeasurementDisplay(fields.Diameter ?? fields.Height, { unitHint: 'mixed' })
}

/** Map legacy Size dropdown / parse labels to a Diameter measurement string. */
export function diameterFromLegacyExhaustSize(value) {
  if (value == null || value === '' || value === 'Select') return ''
  const text = String(value).trim()
  if (/^small/i.test(text) || text === '4"' || text === '3"') return EXHAUST_STACK_SIZE_TO_DIAMETER.Small
  if (/^medium/i.test(text) || text === '5-6"' || text === '5-7"') return EXHAUST_STACK_SIZE_TO_DIAMETER.Medium
  if (/^large/i.test(text) || text === '7-8"' || text === '8"+') return EXHAUST_STACK_SIZE_TO_DIAMETER.Large
  const inches = Number(text.match(/\d+(?:\.\d+)?/)?.[0])
  if (!Number.isFinite(inches)) return ''
  if (inches === 3 || inches === 4) return EXHAUST_STACK_SIZE_TO_DIAMETER.Small
  if (inches >= 5 && inches <= 7) return EXHAUST_STACK_SIZE_TO_DIAMETER.Medium
  if (inches >= 8) return EXHAUST_STACK_SIZE_TO_DIAMETER.Large
  return ''
}
