export const ROOF_ITEM_STATUSES = ['present', 'supplement', 'na']

/** Resolve roof item presence, migrating legacy `excluded` boolean. */
export function getRoofItemStatus(item) {
  if (item?.status === 'present' || item?.status === 'supplement' || item?.status === 'na') {
    return item.status
  }
  return item?.excluded ? 'na' : 'present'
}

export function isRoofItemActive(item) {
  return getRoofItemStatus(item) !== 'na'
}

/** present → supplement → na → present */
export function nextRoofItemStatus(status) {
  if (status === 'present') return 'supplement'
  if (status === 'supplement') return 'na'
  return 'present'
}

export function withRoofItemStatus(item = {}, status) {
  const nextStatus = ROOF_ITEM_STATUSES.includes(status) ? status : 'present'
  return {
    ...item,
    status: nextStatus,
    excluded: nextStatus === 'na',
  }
}
