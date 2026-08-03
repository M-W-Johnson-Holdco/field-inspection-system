/** Skylight area size buckets (square feet). */
export const SKYLIGHT_SIZE_LEGEND = 'Large ≤16 ft² · X-Large 17+ ft²'

export function skylightAreaSqFt(fields = {}) {
  const length = Number(fields['Length (ft)'])
  const width = Number(fields['Width (ft)'])
  if (!Number.isFinite(length) || !Number.isFinite(width) || length <= 0 || width <= 0) return null
  const area = length * width
  return Number.isInteger(area) ? area : Math.round(area * 10) / 10
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
