/** Total fence LF from post count and spacing: (posts − 1) × spacing. */
export function fenceTotalLf(fields = {}) {
  const posts = Number(fields['Post Qty'])
  const spacing = Number(fields['Post Spacing (LF)'])
  if (!Number.isFinite(posts) || !Number.isFinite(spacing) || posts < 2 || spacing <= 0) return null
  const total = (posts - 1) * spacing
  return Number.isInteger(total) ? total : Math.round(total * 10) / 10
}
