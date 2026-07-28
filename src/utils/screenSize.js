/** Window screen area size buckets (square feet). */
export const SCREEN_SIZE_LEGEND = 'Small <10 · Medium 10+ sq ft'

export function screenAreaSqFt(fields = {}) {
  const length = Number(fields['Length (ft)'])
  const width = Number(fields['Width (ft)'])
  if (!Number.isFinite(length) || !Number.isFinite(width) || length <= 0 || width <= 0) return null
  const area = length * width
  return Number.isInteger(area) ? area : Math.round(area * 10) / 10
}

export function screenSizeBucket(area) {
  if (area == null || !Number.isFinite(area) || area <= 0) return null
  if (area < 10) return 'Small'
  return 'Medium'
}

export function countScreenSizeBuckets(subItems = []) {
  const counts = { Small: 0, Medium: 0 }
  for (const sub of subItems) {
    const bucket = screenSizeBucket(screenAreaSqFt(sub?.fields || {}))
    if (bucket) counts[bucket] += 1
  }
  return counts
}
