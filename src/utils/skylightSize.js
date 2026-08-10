/** Skylight area size buckets (square feet). */
import { measurementToDecimalFeet, measurementToDecimalInches } from './measurement'

export const SKYLIGHT_SIZE_LEGEND = 'Large ≤16 ft² · X-Large 17+ ft²'

function roundTenths(value) {
  return Number.isInteger(value) ? value : Math.round(value * 10) / 10
}

/** Circumference in inches — stored value or derived from tubular diameter (π × d). */
export function skylightCircumferenceIn(fields = {}) {
  const stored = measurementToDecimalInches(fields['Circumference (in)'], { unitHint: 'inches' })
  if (stored != null && stored > 0) return roundTenths(stored)
  const diameter = measurementToDecimalInches(fields['Diameter (in)'], { unitHint: 'inches' })
  if (diameter == null || diameter <= 0) return null
  return roundTenths(Math.PI * diameter)
}

/** Area in sq ft — L×W for fixed/venting, πr² for tubular (diameter inches → sq ft). */
export function skylightAreaSqFt(fields = {}) {
  if (fields.Style === 'Tubular') {
    const diameter = measurementToDecimalInches(fields['Diameter (in)'], { unitHint: 'inches' })
    if (diameter == null || diameter <= 0) return null
    const radiusIn = diameter / 2
    const areaSqFt = (Math.PI * radiusIn * radiusIn) / 144
    return roundTenths(areaSqFt)
  }

  const length = measurementToDecimalFeet(fields['Length (ft)'], { unitHint: 'feet' })
  const width = measurementToDecimalFeet(fields['Width (ft)'], { unitHint: 'feet' })
  if (length == null || width == null || length <= 0 || width <= 0) return null
  return roundTenths(length * width)
}

export function skylightSizeBucket(area) {
  if (area == null || !Number.isFinite(area) || area <= 0) return null
  if (area <= 16) return 'Large'
  return 'X-Large'
}

export function skylightSizeLabel(bucket) {
  if (bucket === 'Large') return 'Large (≤16 ft²)'
  if (bucket === 'X-Large') return 'X-Large (17+ ft²)'
  return null
}

export function countSkylightSizeBuckets(subItems = []) {
  const counts = { Large: 0, 'X-Large': 0 }
  for (const sub of subItems) {
    const bucket = skylightSizeBucket(skylightAreaSqFt(sub?.fields || {}))
    if (bucket) counts[bucket] += 1
  }
  return counts
}
