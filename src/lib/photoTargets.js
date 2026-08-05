import { ROOF_ITEMS, SUBSECTIONS } from '../data/roofItems'
import { DIRECTIONS, ELEV_ITEMS } from '../data/elevItems'
import { EXTERIOR_ITEMS, EXTERIOR_SUBSECTIONS } from '../data/exteriorItems'
import { isRoofItemActive } from '../utils/roofItemStatus'
import { directionLabel } from '../utils/elevationCompass'

function groupBySubsection(items, subsectionMap) {
  const keys = Object.keys(subsectionMap)
  return keys.map((startId, i) => {
    const from = items.findIndex(it => it.id === startId)
    const to = i + 1 < keys.length
      ? items.findIndex(it => it.id === keys[i + 1])
      : items.length
    return {
      id: startId,
      label: subsectionMap[startId],
      items: items.slice(from, to),
    }
  })
}

function roomDisplayName(room) {
  if (room.name?.startsWith('Other - ') && room.customName) return room.customName
  return room.name || 'Unnamed Room'
}

function subItemLabel(itemDef, index) {
  const base = (itemDef.addMoreLabel || 'Item').replace(/^Add\s+/, '')
  return `${base} #${index + 1}`
}

function buildRoofLeaves(itemDef, roofData) {
  const item = roofData?.[itemDef.id]
  if (!item || !isRoofItemActive(item)) return []
  if (!itemDef.flags?.includes('P')) return []

  if (itemDef.subItemPhotos) {
    const subItems = Array.isArray(item.subItems) ? item.subItems : []
    return subItems.map((sub, index) => ({
      id: `${itemDef.id}__sub_${index}`,
      label: subItemLabel(itemDef, index),
      kind: 'roof',
      target: `${itemDef.id}__sub_${index}`,
      photoCount: Array.isArray(sub.photos) ? sub.photos.length : 0,
      leaf: true,
    }))
  }

  return [{
    id: itemDef.id,
    label: itemDef.lbl,
    kind: 'roof',
    target: itemDef.id,
    photoCount: Array.isArray(item.photos) ? item.photos.length : 0,
    leaf: true,
  }]
}

function buildRoofBranch(roofData) {
  const groups = groupBySubsection(ROOF_ITEMS, SUBSECTIONS)

  return {
    id: 'roof',
    label: 'Roof',
    children: groups.map(group => {
      const children = []
      group.items.forEach(itemDef => {
        if (!itemDef.flags?.includes('P')) return
        const item = roofData?.[itemDef.id]
        if (!isRoofItemActive(item)) return

        if (itemDef.subItemPhotos) {
          const leaves = buildRoofLeaves(itemDef, roofData)
          children.push({
            id: itemDef.id,
            label: itemDef.lbl,
            children: leaves,
            emptyHint: leaves.length === 0
              ? `No ${itemDef.lbl.toLowerCase()} yet — add them in the Roof section first.`
              : null,
          })
          return
        }

        children.push(...buildRoofLeaves(itemDef, roofData))
      })

      return {
        id: `roof:${group.id}`,
        label: group.label,
        children,
      }
    }),
  }
}

function buildElevationsBranch(elevData, frontOfRisk = '') {
  return {
    id: 'elevations',
    label: 'Elevations',
    children: DIRECTIONS.map(direction => ({
      id: `elev:${direction}`,
      label: directionLabel(direction, frontOfRisk),
      children: ELEV_ITEMS.flatMap(itemDef => {
        const cellKey = `${itemDef.id}_${direction}`
        const cell = elevData?.[cellKey]
        if (cell?.excluded) return []

        if (itemDef.subItemPhotos) {
          const subItems = Array.isArray(cell?.subItems) ? cell.subItems : []
          const leaves = subItems.map((sub, index) => ({
            id: `${cellKey}__sub_${index}`,
            label: subItemLabel(itemDef, index),
            kind: 'elev',
            target: `${cellKey}__sub_${index}`,
            photoCount: Array.isArray(sub.photos) ? sub.photos.length : 0,
            leaf: true,
          }))
          return [{
            id: cellKey,
            label: itemDef.lbl,
            children: leaves,
            emptyHint: leaves.length === 0
              ? `No ${itemDef.lbl.toLowerCase()} yet — add them in Elevations first.`
              : null,
          }]
        }

        return [{
          id: cellKey,
          label: itemDef.lbl,
          kind: 'elev',
          target: cellKey,
          photoCount: Array.isArray(cell?.photos) ? cell.photos.length : 0,
          leaf: true,
        }]
      }),
    })),
  }
}

function buildInteriorBranch(interiorData) {
  const rooms = Array.isArray(interiorData?.rooms) ? interiorData.rooms : []
  return {
    id: 'interior',
    label: 'Interior',
    children: rooms.map(room => ({
      id: room.id,
      label: roomDisplayName(room),
      kind: 'interior',
      target: room.id,
      photoCount: Array.isArray(room.photos) ? room.photos.length : 0,
      leaf: true,
    })),
    emptyHint: rooms.length === 0
      ? 'No rooms yet — add them in the Interior section first.'
      : null,
  }
}

function buildExteriorBranch(exteriorData) {
  const groups = groupBySubsection(EXTERIOR_ITEMS, EXTERIOR_SUBSECTIONS)

  return {
    id: 'exterior',
    label: 'Exterior',
    children: groups.map(group => ({
      id: `exterior:${group.id}`,
      label: group.label,
      children: group.items.flatMap(itemDef => {
        if (!itemDef.flags?.includes('P')) return []
        const item = exteriorData?.[itemDef.id]
        if (item?.excluded) return []
        return [{
          id: itemDef.id,
          label: itemDef.lbl,
          kind: 'exterior',
          target: itemDef.id,
          photoCount: Array.isArray(item?.photos) ? item.photos.length : 0,
          leaf: true,
        }]
      }),
    })),
  }
}

function buildJobPhotosBranch(jobInfo = {}) {
  return {
    id: 'job',
    label: 'Property',
    children: [
      {
        id: 'frontOfHouse',
        label: 'Front of House',
        kind: 'job',
        target: 'frontOfHouse',
        photoCount: Array.isArray(jobInfo.frontOfHousePhotos) ? jobInfo.frontOfHousePhotos.length : 0,
        leaf: true,
      },
      {
        id: 'mailbox',
        label: 'Mailbox',
        kind: 'job',
        target: 'mailbox',
        photoCount: Array.isArray(jobInfo.mailboxPhotos) ? jobInfo.mailboxPhotos.length : 0,
        leaf: true,
      },
    ],
  }
}

/** Nested photo assignment tree from live inspection data. */
export function buildPhotoTargetTree(data = {}) {
  return [
    buildJobPhotosBranch(data.jobInfo),
    buildRoofBranch(data.roofData),
    buildElevationsBranch(data.elevData, data.jobInfo?.frontOfRiskDirection),
    buildInteriorBranch(data.interiorData),
    buildExteriorBranch(data.exteriorData),
  ]
}

export function findNodeByPath(tree, pathIds) {
  let nodes = tree
  let current = null
  for (const id of pathIds) {
    current = nodes.find(node => node.id === id) || null
    if (!current) return null
    nodes = current.children || []
  }
  return current
}

/** Photos currently assigned to a leaf target. */
export function getLeafPhotos(data = {}, leaf) {
  if (!leaf?.leaf) return []

  if (leaf.kind === 'roof') {
    const match = String(leaf.target).match(/^(.+)__sub_(\d+)$/)
    if (match) {
      const item = data.roofData?.[match[1]]
      const sub = item?.subItems?.[Number(match[2])]
      return Array.isArray(sub?.photos) ? sub.photos : []
    }
    return Array.isArray(data.roofData?.[leaf.target]?.photos)
      ? data.roofData[leaf.target].photos
      : []
  }

  if (leaf.kind === 'elev') {
    const match = String(leaf.target).match(/^(.+)__sub_(\d+)$/)
    if (match) {
      const cell = data.elevData?.[match[1]]
      const sub = cell?.subItems?.[Number(match[2])]
      return Array.isArray(sub?.photos) ? sub.photos : []
    }
    return Array.isArray(data.elevData?.[leaf.target]?.photos)
      ? data.elevData[leaf.target].photos
      : []
  }

  if (leaf.kind === 'interior') {
    const room = (data.interiorData?.rooms || []).find(r => r.id === leaf.target)
    return Array.isArray(room?.photos) ? room.photos : []
  }

  if (leaf.kind === 'exterior') {
    return Array.isArray(data.exteriorData?.[leaf.target]?.photos)
      ? data.exteriorData[leaf.target].photos
      : []
  }

  if (leaf.kind === 'job') {
    if (leaf.target === 'frontOfHouse') {
      return Array.isArray(data.jobInfo?.frontOfHousePhotos) ? data.jobInfo.frontOfHousePhotos : []
    }
    if (leaf.target === 'mailbox') {
      return Array.isArray(data.jobInfo?.mailboxPhotos) ? data.jobInfo.mailboxPhotos : []
    }
  }

  return []
}
