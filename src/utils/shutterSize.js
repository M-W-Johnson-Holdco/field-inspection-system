/** Shutter area size buckets (square inches). */
export const SHUTTER_SIZE_BUCKETS = [
  { key: 'Small', label: 'Small', min: 0, max: 770, inclusiveMax: true },
  { key: 'Medium', label: 'Medium', min: 771, max: 1120, inclusiveMax: true },
  { key: 'Large', label: 'Large', min: 1121, max: Infinity, inclusiveMax: true },
]

export const SHUTTER_SIZE_LEGEND = 'Small ≤770 in² · Medium 771–1,120 in² · Large 1,121+ in²'

export function shutterAreaSqIn(fields = {}) {
  const length = Number(fields['Length (in)'])
  const width = Number(fields['Width (in)'])
  if (!Number.isFinite(length) || !Number.isFinite(width) || length <= 0 || width <= 0) return null
  return length * width
}

export function shutterSizeBucket(area) {
  if (area == null || !Number.isFinite(area) || area <= 0) return null
  if (area <= 770) return 'Small'
  if (area <= 1120) return 'Medium'
  return 'Large'
}

export function countShutterSizeBuckets(subItems = []) {
  const counts = { Small: 0, Medium: 0, Large: 0 }
  for (const sub of subItems) {
    const bucket = shutterSizeBucket(shutterAreaSqIn(sub?.fields || {}))
    if (bucket) counts[bucket] += 1
  }
  return counts
}
