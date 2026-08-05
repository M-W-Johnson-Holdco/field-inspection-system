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

// Maps roof item IDs → [section folder name, item folder name]
const ROOF_ITEM_PATH = {
  ri0:  ['1a-general_roof',              'shingle_style'],
  ri1:  ['1a-general_roof',              'edge_flashings'],
  ri2:  ['1a-general_roof',              'underlayment'],
  ri3:  ['1a-general_roof',              'ridge_cap'],
  ri4:  ['1a-general_roof',              'starter_shingle'],
  ri5:  ['1a-general_roof',              'valley'],
  ri6:  ['1b-ventilation',               'ridge_vent'],
  ri7:  ['1b-ventilation',               'box_vents'],
  ri8:  ['1b-ventilation',               'turbines'],
  ri9:  ['1b-ventilation',               'power_vents'],
  ri10: ['1b-ventilation',               'solar_vents'],
  ri25: ['1b-ventilation',               'off_ridge_vents'],
  ri26: ['1b-ventilation',               'dome_vents'],
  ri27: ['1b-ventilation',               'rooftop_intake_vents'],
  ri11: ['1c-pipe_jacks_and_exhaust',    'pipe_jacks'],
  ri12: ['1c-pipe_jacks_and_exhaust',    'exhaust_stacks'],
  ri13: ['1d-kickouts',                  'kickouts'],
  ri14: ['1e-skylights_and_flashings',   'skylights'],
  ri15: ['1e-skylights_and_flashings',   'rain_diverter'],
  ri16: ['1e-skylights_and_flashings',   'power_meter_mast'],
  ri17: ['1e-skylights_and_flashings',   'chimney_flashing'],
  ri18: ['1e-skylights_and_flashings',   'step_flashing'],
  ri19: ['1e-skylights_and_flashings',   'counter_flashing'],
  ri20: ['1e-skylights_and_flashings',   'l_flashing'],
  ri21: ['1e-skylights_and_flashings',   'cornice_returns'],
  ri28: ['1e-skylights_and_flashings',   'cornice_strips'],
  ri22: ['1f-low_slope_and_other',       'low_slope'],
  ri23: ['1f-low_slope_and_other',       'other_structures'],
  ri24: ['1a-general_roof',              'solar_panels'],
}

// Maps elevation item IDs → folder name
const ELEV_ITEM_FOLDER = {
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

// Maps exterior item IDs → [section folder, item folder]
const EXTERIOR_ITEM_PATH = {
  ei_fence:   ['4a-fencing_and_gates',           'fence'],
  ei_gates:   ['4a-fencing_and_gates',           'gates'],
  ei_pool:    ['4b-pool_and_outdoor_equipment',  'pool'],
  ei_outdoor: ['4c-outdoor_structures',          'outdoor_items'],
  ei_site:    ['4d-site_access',                 'site_access'],
}

/**
 * Collect all inspection photos with Drive-style relative paths.
 * @returns {{ path: string[], name: string, url: string }[]}
 */
export function collectInspectionPhotos(inspectionData) {
  const photos = []
  const ji = inspectionData?.jobInfo || {}

  ;(ji.frontOfHousePhotos || []).forEach((url, i) => {
    if (!url) return
    photos.push({
      path: ['photos', '0-property', 'front_of_house'],
      name: photoFileName('front_of_house', i),
      url,
    })
  })
  ;(ji.mailboxPhotos || []).forEach((url, i) => {
    if (!url) return
    photos.push({
      path: ['photos', '0-property', 'mailbox'],
      name: photoFileName('mailbox', i),
      url,
    })
  })

  for (const [itemId, item] of Object.entries(inspectionData?.roofData || {})) {
    const pathParts = ROOF_ITEM_PATH[itemId]
    if (!pathParts) continue
    const [section, itemFolder] = pathParts.map(sanitizePathSegment)

    ;(item.photos || []).forEach((url, i) => {
      if (!url) return
      photos.push({
        path: ['photos', '1-roof', section, itemFolder],
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
          path: ['photos', '1-roof', section, itemFolder, subFolder],
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
    const itemFolder = sanitizePathSegment(ELEV_ITEM_FOLDER[itemId] || slugify(itemId))
    ;(cell.photos || []).forEach((url, i) => {
      if (!url) return
      photos.push({
        path: ['photos', '2-elevations', dirSlug, itemFolder],
        name: photoFileName(itemFolder, i),
        url,
      })
    })
    ;(cell.subItems || []).forEach((sub, subIndex) => {
      ;(sub.photos || []).forEach((url, i) => {
        if (!url) return
        const subFolder = sanitizePathSegment(
          `${subIndex + 1}-${slugify(itemFolder.replace(/s$/, ''))}`,
        )
        photos.push({
          path: ['photos', '2-elevations', dirSlug, itemFolder, subFolder],
          name: photoFileName(subFolder, i),
          url,
        })
      })
    })
  }

  for (const [itemId, item] of Object.entries(inspectionData?.exteriorData || {})) {
    const pathParts = EXTERIOR_ITEM_PATH[itemId]
    if (!pathParts) continue
    const [section, itemFolder] = pathParts.map(sanitizePathSegment)
    ;(item.photos || []).forEach((url, i) => {
      if (!url) return
      photos.push({
        path: ['photos', '3-exterior', section, itemFolder],
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
        path: ['photos', '4-interior', roomSlug],
        name: photoFileName(roomSlug, i),
        url,
      })
    })
  })

  return photos
}

/**
 * Strip photo arrays from a deep-cloned inspection payload (for Drive JSON upload).
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
