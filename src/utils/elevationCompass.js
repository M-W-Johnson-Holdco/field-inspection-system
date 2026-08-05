/** Clockwise 8-point compass used by Front of risk direction. */
export const COMPASS_BEARINGS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

/**
 * Map house sides to compass bearings.
 *
 * Front of risk is the bearing the front wall faces. Side labels use the
 * viewer’s perspective looking at that front elevation:
 *   Front = selected bearing
 *   Right = viewer’s right
 *   Rear  = opposite of Front
 *   Left  = viewer’s left
 */
export function elevationBearings(frontOfRisk) {
  const front = COMPASS_BEARINGS.indexOf(frontOfRisk)
  if (front < 0) return null

  const viewerFacing = (front + 4) % 8
  return {
    Front: COMPASS_BEARINGS[front],
    Right: COMPASS_BEARINGS[(viewerFacing + 2) % 8],
    Rear: COMPASS_BEARINGS[(front + 4) % 8],
    Left: COMPASS_BEARINGS[(viewerFacing + 6) % 8],
  }
}

export function directionLabel(direction, frontOfRisk) {
  const bearings = elevationBearings(frontOfRisk)
  const bearing = bearings?.[direction]
  return bearing ? `${direction} (${bearing})` : direction
}
