/** Window area size buckets (square feet). */
export const WINDOW_SIZE_LEGEND = 'Small <12 · Medium 12–19 · Large 19+ sq ft'

export function windowAreaSqFt(fields = {}) {
  const length = Number(fields['Length (ft)'])
  const width = Number(fields['Width (ft)'])
  if (!Number.isFinite(length) || !Number.isFinite(width) || length <= 0 || width <= 0) return null
  const area = length * width
  return Number.isInteger(area) ? area : Math.round(area * 10) / 10
}

export function windowSizeBucket(area) {
  if (area == null || !Number.isFinite(area) || area <= 0) return null
  if (area < 12) return 'Small'
  if (area < 19) return 'Medium'
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
