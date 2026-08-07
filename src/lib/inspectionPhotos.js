/** Replace & / &amp; with "and" for safe photo and folder names. */
export function sanitizePhotoName(str) {
  return String(str || '')
    .replace(/&amp;/gi, ' and ')
    .replace(/&/g, ' and ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function slugify(str) {
  return sanitizePhotoName(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

/** Leaf file name from folder + 1-based index, e.g. shingle_style → shingle-style1.jpg */
export function photoFileName(leafFolder, index) {
  const prefix = sanitizePhotoName(leafFolder || 'photo').replace(/_/g, '-')
  return `${prefix}${index + 1}.jpg`
}

function sanitizePathSegment(seg) {
  return sanitizePhotoName(seg).replace(/[/\\:*?"<>|]/g, '-').replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'item'
}

// Maps roof item IDs → leaf name used in photoFileName
const ROOF_ITEM_LEAF = {
  ri0:  'shingle_style',
  ri1:  'edge_flashings',
  ri2:  'underlayment',
  ri3:  'ridge_cap',
  ri4:  'starter_shingle',
  ri5:  'valley',
  ri6:  'ridge_vent',
  ri7:  'box_vents',
  ri8:  'turbines',
  ri9:  'power_vents',
  ri10: 'solar_vents',
  ri25: 'off_ridge_vents',
  ri26: 'dome_vents',
  ri27: 'rooftop_intake_vents',
  ri11: 'pipe_jacks',
  ri12: 'exhaust_stacks',
  ri13: 'kickouts',
  ri14: 'skylights',
  ri15: 'rain_diverter',
  ri16: 'power_meter_mast',
  ri17: 'chimney_flashing',
  ri18: 'step_flashing',
  ri19: 'counter_flashing',
  ri20: 'l_flashing',
  ri21: 'cornice_returns',
  ri28: 'cornice_strips',
  ri22: 'low_slope',
  ri23: 'other_structures',
  ri24: 'solar_panels',
}

// Maps elevation item IDs → leaf name used in photoFileName
const ELEV_ITEM_LEAF = {
  ev0:  'siding',
  ev1:  'fascia',
  ev3:  'gutters',
  ev11: 'gutter_guards',
  ev4:  'downspouts',
  ev12: 'windows',
  ev5:  'window_screens',
  ev13: 'gable_vents',
  ev6:  'shutters',
  ev7:  'doors',
  ev8:  'garage_doors',
  ev14: 'deck',
}

// Maps exterior item IDs → leaf name used in photoFileName
const EXTERIOR_ITEM_LEAF = {
  ei_fence:   'fence',
  ei_gates:   'gates',
  ei_pool:    'pool',
  ei_outdoor: 'outdoor_items',
  ei_site:    'site_access',
}

const PHOTOS_PATH = ['photos']

/**
 * Collect all inspection photos into a single photos/ folder.
 * Names keep the existing leaf + index convention (e.g. shingle-style1.jpg).
 * @returns {{ path: string[], name: string, url: string }[]}
 */
export function collectInspectionPhotos(inspectionData) {
  const photos = []
  const ji = inspectionData?.jobInfo || {}

  ;(ji.frontOfHousePhotos || []).forEach((url, i) => {
    if (!url) return
    photos.push({
      path: PHOTOS_PATH,
      name: photoFileName('front_of_house', i),
      url,
    })
  })
  ;(ji.mailboxPhotos || []).forEach((url, i) => {
    if (!url) return
    photos.push({
      path: PHOTOS_PATH,
      name: photoFileName('mailbox', i),
      url,
    })
  })

  for (const [itemId, item] of Object.entries(inspectionData?.roofData || {})) {
    const itemFolder = sanitizePathSegment(ROOF_ITEM_LEAF[itemId] || '')
    if (!itemFolder) continue

    ;(item.photos || []).forEach((url, i) => {
      if (!url) return
      photos.push({
        path: PHOTOS_PATH,
        name: photoFileName(itemFolder, i),
        url,
      })
    })

    ;(item.subItems || []).forEach((sub, subIndex) => {
      ;(sub.photos || []).forEach((url, i) => {
        if (!url) return
        const subFolder = sanitizePathSegment(
          `${subIndex + 1}-${slugify(itemFolder.replace(/s$/, ''))}`,
        )
        photos.push({
          path: PHOTOS_PATH,
          name: photoFileName(subFolder, i),
          url,
        })
      })
    })
  }

  for (const [cellKey, cell] of Object.entries(inspectionData?.elevData || {})) {
    const parts = cellKey.split('_')
    const itemId = parts[0]
    const dir = parts.slice(1).join('_')
    const dirSlug = slugify(dir)
    const itemFolder = sanitizePathSegment(ELEV_ITEM_LEAF[itemId] || slugify(itemId))
    // Include direction so front/rear of the same item do not collide in photos/
    const elevLeaf = sanitizePathSegment(`${dirSlug}_${itemFolder}`)
    ;(cell.photos || []).forEach((url, i) => {
      if (!url) return
      photos.push({
        path: PHOTOS_PATH,
        name: photoFileName(elevLeaf, i),
        url,
      })
    })
    ;(cell.subItems || []).forEach((sub, subIndex) => {
      ;(sub.photos || []).forEach((url, i) => {
        if (!url) return
        const subFolder = sanitizePathSegment(
          `${dirSlug}_${subIndex + 1}-${slugify(itemFolder.replace(/s$/, ''))}`,
        )
        photos.push({
          path: PHOTOS_PATH,
          name: photoFileName(subFolder, i),
          url,
        })
      })
    })
  }

  for (const [itemId, item] of Object.entries(inspectionData?.exteriorData || {})) {
    const itemFolder = sanitizePathSegment(EXTERIOR_ITEM_LEAF[itemId] || '')
    if (!itemFolder) continue
    ;(item.photos || []).forEach((url, i) => {
      if (!url) return
      photos.push({
        path: PHOTOS_PATH,
        name: photoFileName(itemFolder, i),
        url,
      })
    })
  }

  ;(inspectionData?.interiorData?.rooms || []).forEach(room => {
    const displayName = room.customName || room.name || room.id
    const roomSlug = slugify(displayName) || 'room'
    ;(room.photos || []).forEach((url, i) => {
      if (!url) return
      photos.push({
        path: PHOTOS_PATH,
        name: photoFileName(roomSlug, i),
        url,
      })
    })
  })

  return photos
}

/**
 * Strip photo arrays from a deep-cloned inspection payload (for JSON upload).
 * Mutates `clean` in place.
 */
export function stripPhotosFromInspection(clean) {
  if (clean.jobInfo) {
    clean.jobInfo.frontOfHousePhotos = []
    clean.jobInfo.mailboxPhotos = []
  }
  for (const item of Object.values(clean.roofData || {})) {
    item.photos = []
    ;(item.subItems || []).forEach(sub => {
      sub.photos = []
    })
  }
  for (const cell of Object.values(clean.elevData || {})) {
    cell.photos = []
    ;(cell.subItems || []).forEach(sub => {
      sub.photos = []
    })
  }
  for (const item of Object.values(clean.exteriorData || {})) {
    if (item.photos) item.photos = []
  }
  ;(clean.interiorData?.rooms || []).forEach(room => {
    room.photos = []
  })
}
