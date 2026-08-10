/** Window area size buckets (square feet). */
import { measurementToDecimalFeet } from './measurement'

export const WINDOW_SIZE_LEGEND = 'Small ≤11 ft² · Medium 12–19 ft² · Large 20+ ft²'

export function windowAreaSqFt(fields = {}) {
  const length = measurementToDecimalFeet(fields['Length (ft)'], { unitHint: 'feet' })
  const width = measurementToDecimalFeet(fields['Width (ft)'], { unitHint: 'feet' })
  if (length == null || width == null || length <= 0 || width <= 0) return null
  const area = length * width
  return Number.isInteger(area) ? area : Math.round(area * 10) / 10
}

export function windowSizeBucket(area) {
  if (area == null || !Number.isFinite(area) || area <= 0) return null
  if (area <= 11) return 'Small'
  if (area < 20) return 'Medium'
  return 'Large'
}

export function countWindowSizeBuckets(subItems = []) {
  const counts = { Small: 0, Medium: 0, Large: 0 }
  for (const sub of subItems) {
    const bucket = windowSizeBucket(windowAreaSqFt(sub?.fields || {}))
    if (bucket) counts[bucket] += 1
  }
  return counts
}
