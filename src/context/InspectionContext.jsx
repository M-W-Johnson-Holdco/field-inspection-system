import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { idbSave, idbLoad } from '../lib/idb'
import { ROOF_ITEMS } from '../data/roofItems'
import { ELEV_ITEMS, DIRECTIONS, ELEV_ADDMORE_IDS } from '../data/elevItems'
import { EXTERIOR_ITEMS } from '../data/exteriorItems'
import { formatPitch, parsePitchNumerator } from '../utils/pitch'
import { parseMeasurement } from '../utils/measurement'
import { isFieldVisible } from '../utils/fieldGrid'
import { getRoofItemStatus, isRoofItemActive, nextRoofItemStatus, withRoofItemStatus } from '../utils/roofItemStatus'

const InspectionContext = createContext(null)

const INITIAL_ROOF_DATA = Object.fromEntries(
  ROOF_ITEMS.map(item => [item.id, { excluded: false, status: 'present', fields: {}, subItems: [], photos: [] }])
)

const INITIAL_ELEV_DATA = Object.fromEntries(
  ELEV_ITEMS.flatMap(item =>
    DIRECTIONS.map(dir => [`${item.id}_${dir}`, {
      excluded: false,
      fields: {},
      subItems: [],
      photos: [],
    }]),
  ),
)

const INITIAL_INTERIOR_DATA = { rooms: [] }

const INITIAL_EXTERIOR_DATA = Object.fromEntries(
  EXTERIOR_ITEMS.map(item => [item.id, { excluded: false, fields: {}, photos: [], measurePhotos: {} }]),
)

const INITIAL_NOTES_DATA = {
  summary: '', concerns: '', homeage: '', crosssell: '',
  roof: '', roofage: '', defects: '', homeowner: '', misc: '',
}

const INITIAL_STATE = {
  jobInfo: {
    cust: '', phone: '', email: '', addr: '',
    pm: '', insp: '', ins: '', claim: '',
    claimFileDate: '',
    stormDate: '',
    lossType: [],
    damageSquares: '',
    frontOfHousePhotos: [],
    mailboxPhotos: [],
    frontOfRiskDirection: '',
    preferredContact: [],
    residenceType: 'Primary',
    addrParts: { address1: '', address2: '', city: '', state: '', zipcode: '' },
    tenantname: '', tenantphone: '',
    hasSeparateContact: '',
    contactName: '', contactPhone: '', contactEmail: '', contactPreferredContact: [],
  },
  roofData: INITIAL_ROOF_DATA,
  elevData: INITIAL_ELEV_DATA,
  interiorData: INITIAL_INTERIOR_DATA,
  exteriorData: INITIAL_EXTERIOR_DATA,
  notesData: INITIAL_NOTES_DATA,
}

function isFilled(value) {
  if (Array.isArray(value)) return value.length > 0
  if (value == null) return false
  const normalized = String(value).trim()
  return normalized !== '' && normalized !== 'Select' && normalized !== 'Select...' && normalized !== 'Select…'
}

function isValidPhone(value) {
  return String(value || '').replace(/\D/g, '').length === 10
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

function isValidAddressParts(parts) {
  return Boolean(
    parts &&
    String(parts.address1 || '').trim() &&
    String(parts.city || '').trim() &&
    /^[A-Z]{2}$/i.test(String(parts.state || '').trim()) &&
    /^\d{5}$/.test(String(parts.zipcode || '').trim())
  )
}

function countValue(value, totals, validator) {
  totals.total += 1
  if (validator ? validator(value) : isFilled(value)) totals.filled += 1
}

function countSubFieldValue(field, subFields, totals) {
  if (field.t === 'lwxw') {
    countValue(subFields?.[field.lengthKey || 'Length (in)'], totals)
    countValue(subFields?.[field.widthKey || 'Width (in)'], totals)
    return
  }
  countValue(subFields?.[field.l], totals)
}

function calculateCompletion(data) {
  const totals = { filled: 0, total: 0 }
  const ji = data.jobInfo || {}

  ;['cust', 'preferredContact', 'pm', 'insp', 'ins', 'claim', 'claimFileDate', 'stormDate', 'lossType', 'frontOfRiskDirection'].forEach(key => {
    countValue(ji[key], totals)
  })
  const lossTypes = Array.isArray(ji.lossType) ? ji.lossType : []
  if (lossTypes.includes('Wind') || lossTypes.includes('Hail')) {
    countValue(ji.damageSquares, totals)
  }
  countValue(ji.frontOfHousePhotos, totals, value => Array.isArray(value) && value.length > 0)
  countValue(ji.mailboxPhotos, totals, value => Array.isArray(value) && value.length > 0)
  countValue(ji.phone, totals, isValidPhone)
  countValue(ji.email, totals, isValidEmail)
  countValue(ji.addrParts, totals, isValidAddressParts)
  if (ji.residenceType === 'Rental') {
    countValue(ji.tenantname, totals)
    countValue(ji.tenantphone, totals, isValidPhone)
  }

  ROOF_ITEMS.forEach(itemDef => {
    const item = data.roofData?.[itemDef.id]
    if (!item || !isRoofItemActive(item)) return

    ;(itemDef.fields || []).forEach(field => countValue(item.fields?.[field.l], totals))
    if (itemDef.flags?.includes('D')) countValue(item.fields?._damage, totals)
    else if (item.fields?.Damaged === 'Yes' && (itemDef.fields || []).some(field => field.l === 'Damaged')) {
      countValue(item.fields?._damage, totals)
    }
    ;(item.subItems || []).forEach(sub => {
      ;(itemDef.subFields || []).forEach(field => {
        if (!isFieldVisible(field, sub.fields)) return
        countSubFieldValue(field, sub.fields, totals)
      })
      if (
        itemDef.subItemDamaged
        && (
          sub.fields?.Damaged === 'Yes'
          || (Array.isArray(sub.fields?.Damaged) && sub.fields.Damaged.length > 0)
        )
      ) {
        countValue(sub.fields?._damage, totals)
      }
    })
  })

  ELEV_ITEMS.forEach(itemDef => {
    DIRECTIONS.forEach(dir => {
      const cell = data.elevData?.[`${itemDef.id}_${dir}`]
      if (!cell || cell.excluded) return

      if (itemDef.addMore) {
        ;(itemDef.fields || []).forEach(field => countValue(cell.fields?.[field.l], totals))
        ;(cell.subItems || []).forEach(sub => {
          ;(itemDef.subFields || []).forEach(field => {
            if (!isFieldVisible(field, sub.fields)) return
            countSubFieldValue(field, sub.fields, totals)
          })
          if (sub.fields?.Damaged === 'Yes') countValue(sub.fields?._damage, totals)
        })
        return
      }

      ;(itemDef.fields || []).forEach(field => countValue(cell.fields?.[field.l], totals))
      if (cell.fields?.Damaged === 'Yes') countValue(cell.fields?._damage, totals)
    })
  })

  ;(data.interiorData?.rooms || []).forEach(room => {
    countValue(room.name && room.name !== 'Other' ? room.name : null, totals)
    ;['story', 'sheetrockCompromised', 'ceilingDamage', 'wallDamage', 'floorDamage', 'moldPresent'].forEach(key => {
      countValue(room.fields?.[key], totals)
    })
    if (room.fields?.ceilingDamage === 'Yes') countValue(room.fields?.ceilingNotes, totals)
    if (room.fields?.wallDamage === 'Yes') countValue(room.fields?.wallNotes, totals)
    if (room.fields?.floorDamage === 'Yes') countValue(room.fields?.floorNotes, totals)
    if (room.fields?.moldPresent === 'Yes') countValue(room.fields?.moldNotes, totals)
  })

  const percent = totals.total ? Math.round((totals.filled / totals.total) * 100) : 0
  return { ...totals, percent }
}

const PIPE_JACK_SIZE_LABELS = [
  { field: 'Qty 1.5"', size: '1.5' },
  { field: 'Qty 2"', size: '2' },
  { field: 'Qty 3"', size: '3' },
  { field: 'Qty 4"', size: '4' },
  { field: 'Qty 5"', size: '5' },
]

const EXHAUST_STACK_TYPES = ['Cap', 'Stack', 'Flange']

function normalizeGutterSizeValue(val) {
  if (val == null || val === '' || val === 'Select') return ''
  if (val === '5"' || val === '6"') return val
  const match = String(val).match(/(\d+(?:\.\d+)?)/)
  if (!match) return ''
  const inches = match[1]
  if (inches === '5' || inches === '6') return `${inches}"`
  return ''
}

function normalizeElevGutterCell(cell) {
  if (!cell) return cell
  const fields = { ...(cell.fields || {}) }

  if (fields.Size != null) {
    const parsed = normalizeGutterSizeValue(fields.Size)
    if (parsed && fields['Size (Inches)'] == null) fields['Size (Inches)'] = parsed
    delete fields.Size
  }

  if (fields['Size (Inches)'] != null && fields['Size (Inches)'] !== '') {
    fields['Size (Inches)'] = normalizeGutterSizeValue(fields['Size (Inches)'])
  }

  return { ...cell, fields }
}

/** Parent-level fields on addMore elev items (not migrated into sub-cards). */
const ELEV_ADDMORE_SHARED_FIELDS = {
  ev3: new Set(['Style', 'Material', 'Size (Inches)', 'Painted']),
  ev11: new Set(['Style', 'Material']),
  ev4: new Set(['Style', 'Material', 'Width', 'Painted']),
  ev12: new Set(['Grade', 'Type', 'Glaze', 'Painted']),
  ev5: new Set(['Type', 'Grade']),
  ev6: new Set(['Grade', 'Custom Grade', 'Painted']),
}

function splitElevSharedFields(itemId, fields = {}) {
  const sharedKeys = ELEV_ADDMORE_SHARED_FIELDS[itemId] || new Set()
  const shared = {}
  const rest = {}
  for (const [key, value] of Object.entries(fields)) {
    if (sharedKeys.has(key)) shared[key] = value
    else rest[key] = value
  }
  return { shared, rest }
}

function elevCellHasLegacyTopFields(fields = {}, itemId) {
  const sharedKeys = ELEV_ADDMORE_SHARED_FIELDS[itemId] || new Set()
  return Object.entries(fields).some(([key, value]) => {
    if (key.startsWith('_')) return false
    if (sharedKeys.has(key)) return false
    if (value == null || value === '' || value === 'Select') return false
    if (Array.isArray(value)) return value.length > 0
    return true
  })
}

function normalizeElevAddMoreSub(sub, itemId) {
  const fields = { ...(sub?.fields || {}) }
  if (itemId === 'ev3') {
    if (fields.Size != null) {
      const parsed = normalizeGutterSizeValue(fields.Size)
      if (parsed && fields['Size (Inches)'] == null) fields['Size (Inches)'] = parsed
      delete fields.Size
    }
    if (fields['Size (Inches)'] != null && fields['Size (Inches)'] !== '') {
      fields['Size (Inches)'] = normalizeGutterSizeValue(fields['Size (Inches)'])
    }
  }
  if (fields.Width === '3" Std' || fields.Width === '3" STD') {
    fields.Width = '3" Standard'
  }
  return {
    fields: itemId === 'ev7'
      ? normalizeDoorSubFields(fields)
      : itemId === 'ev8'
        ? normalizeGarageDoorSubFields(fields)
        : itemId === 'ev6'
          ? normalizeShutterSubFields(fields)
          : itemId === 'ev5'
            ? normalizeScreenSubFields(fields)
            : itemId === 'ev12'
              ? normalizeWindowSubFields(fields)
              : itemId === 'ev14'
                ? normalizeDeckSubFields(fields)
                : fields,
    photos: Array.isArray(sub?.photos) ? sub.photos : [],
  }
}

function normalizeDoorSubFields(fields = {}) {
  const next = { ...fields }
  const grades = ['Wood', 'Aluminum', 'Steel', 'Composite', 'Fiberglass', 'None']
  if (next.Material != null && next.Material !== '' && (next.Grade == null || next.Grade === '' || next.Grade === 'Select')) {
    const match = grades.find(g => g.toLowerCase() === String(next.Material).toLowerCase())
    if (match) next.Grade = match
  }
  delete next.Material
  if ((next['Storm Door'] === 'Yes' || next['Storm Door'] === true)
    && (next.Style == null || next.Style === '' || next.Style === 'Select')) {
    next.Style = 'Storm Door'
  }
  delete next['Storm Door']
  delete next._damage
  delete next.Qty
  // Legacy S/M/L size buttons — drop; Size is now Length × Width
  if (next.Size === 'S' || next.Size === 'M' || next.Size === 'L') delete next.Size
  return next
}

function normalizeGarageDoorSubFields(fields = {}) {
  const next = { ...fields }
  if (next.Material != null && next.Material !== '' && (next.Grade == null || next.Grade === '' || next.Grade === 'Select')) {
    const legacy = String(next.Material)
    if (legacy === 'Aluminum') next.Grade = 'Aluminum'
    else if (legacy === 'Wood') next.Grade = 'Wood Paint'
    else if (legacy === 'Composite') next.Grade = 'Composite'
  }
  delete next.Material
  delete next['Panel Style']
  delete next.Qty
  if (next.Windows !== 'Yes') delete next['Window Qty']
  // Migrate early garage-door inch keys to feet
  if (next['Length (in)'] != null && (next['Length (ft)'] == null || next['Length (ft)'] === '')) {
    next['Length (ft)'] = next['Length (in)']
  }
  if (next['Width (in)'] != null && (next['Width (ft)'] == null || next['Width (ft)'] === '')) {
    next['Width (ft)'] = next['Width (in)']
  }
  delete next['Length (in)']
  delete next['Width (in)']
  return next
}

function shutterLegacyQty(fields, keys) {
  for (const key of keys) {
    if (fields[key] == null || fields[key] === '') continue
    const n = Math.floor(Number(fields[key]))
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function normalizeShutterSubFields(fields = {}) {
  const next = { ...fields }
  if (next.Material != null && next.Material !== '' && (next.Grade == null || next.Grade === '' || next.Grade === 'Select')) {
    const match = ['Vinyl', 'Wood'].find(g => g.toLowerCase() === String(next.Material).toLowerCase())
    if (match) next.Grade = match
  }
  delete next.Material
  delete next.Qty
  delete next['Qty (Small)']
  delete next['Qty (Medium)']
  delete next['Small (<770 sq in)']
  delete next['Small (<771 sq in)']
  delete next['Small (≤770 sq in)']
  delete next['Medium (770-1,120 sq in)']
  delete next['Medium (771-1,120 sq in)']
  delete next['Large (1,120+ sq in)']
  delete next['Large (1,121+ sq in)']
  delete next['Small (Height: 30-50")']
  delete next['Medium (Height: 51-70")']
  delete next['Large (Height: 71"+)']
  return next
}

function expandShutterLegacySubs(rest = {}, topPhotos = []) {
  const small = shutterLegacyQty(rest, [
    'Small (≤770 sq in)',
    'Small (<770 sq in)',
    'Small (<771 sq in)',
    'Qty (Small)',
    'Small (Height: 30-50")',
    'Qty',
  ])
  const medium = shutterLegacyQty(rest, [
    'Medium (771-1,120 sq in)',
    'Medium (770-1,120 sq in)',
    'Qty (Medium)',
    'Medium (Height: 51-70")',
  ])
  const large = shutterLegacyQty(rest, [
    'Large (1,121+ sq in)',
    'Large (1,120+ sq in)',
    'Large (Height: 71"+)',
  ])
  const total = small + medium + large
  const base = normalizeShutterSubFields(rest)
  if (total > 0) {
    return Array.from({ length: total }, (_, i) => ({
      fields: { ...base },
      photos: i === 0 ? topPhotos : [],
    }))
  }
  return null
}

function normalizeScreenSubFields(fields = {}) {
  const next = { ...fields }
  delete next.Qty
  delete next['Small (1–9 sq ft)']
  delete next['Medium (10–16 sq ft)']
  delete next['Large (17+ sq ft)']
  delete next['Small (1–9 ft²)']
  delete next['Medium (10–16 ft²)']
  delete next['Large (17+ ft²)']
  return next
}

function expandScreenLegacySubs(rest = {}, topPhotos = []) {
  const small = shutterLegacyQty(rest, ['Small (1–9 sq ft)', 'Small (1–9 ft²)', 'Qty'])
  const medium = shutterLegacyQty(rest, ['Medium (10–16 sq ft)', 'Medium (10–16 ft²)'])
  const large = shutterLegacyQty(rest, ['Large (17+ sq ft)', 'Large (17+ ft²)'])
  const total = small + medium + large
  const base = normalizeScreenSubFields(rest)
  if (total > 0) {
    return Array.from({ length: total }, (_, i) => ({
      fields: { ...base },
      photos: i === 0 ? topPhotos : [],
    }))
  }
  return null
}

function normalizeWindowSubFields(fields = {}) {
  const next = { ...fields }
  delete next.Qty
  delete next['Small (3–11 sq ft)']
  delete next['Medium (12–19 sq ft)']
  delete next['Large (19+ sq ft)']
  delete next['Small (3–11 ft²)']
  delete next['Medium (12–19 ft²)']
  delete next['Large (19+ ft²)']
  delete next['Small (≤11 sq ft)']
  delete next['Large (20+ sq ft)']
  delete next['Small (≤11 ft²)']
  delete next['Large (20+ ft²)']
  return next
}

function normalizeDeckSubFields(fields = {}) {
  const next = { ...fields }
  delete next.Qty
  const material = String(next.Material || '')
  if (material === 'Cedar' || material === 'Pine' || material === 'Redwood') {
    next.Material = 'Wood'
  }
  return next
}

function expandWindowLegacySubs(rest = {}, topPhotos = []) {
  const small = shutterLegacyQty(rest, [
    'Small (3–11 sq ft)',
    'Small (3–11 ft²)',
    'Small (≤11 sq ft)',
    'Small (≤11 ft²)',
    'Qty',
  ])
  const medium = shutterLegacyQty(rest, [
    'Medium (12–19 sq ft)',
    'Medium (12–19 ft²)',
  ])
  const large = shutterLegacyQty(rest, [
    'Large (19+ sq ft)',
    'Large (19+ ft²)',
    'Large (20+ sq ft)',
    'Large (20+ ft²)',
  ])
  const total = small + medium + large
  const base = normalizeWindowSubFields(rest)
  if (total > 0) {
    return Array.from({ length: total }, (_, i) => ({
      fields: { ...base },
      photos: i === 0 ? topPhotos : [],
    }))
  }
  return null
}

function stripElevSharedFromSubFields(itemId, fields = {}) {
  const sharedKeys = ELEV_ADDMORE_SHARED_FIELDS[itemId] || new Set()
  let next = { ...fields }
  for (const key of sharedKeys) delete next[key]
  // Downspout / gutter-guard cards are one-per-run; Qty lived on the old card layout
  if (itemId === 'ev4' || itemId === 'ev11') delete next.Qty
  if (itemId === 'ev7') next = normalizeDoorSubFields(next)
  if (itemId === 'ev8') next = normalizeGarageDoorSubFields(next)
  if (itemId === 'ev6') next = normalizeShutterSubFields(next)
  if (itemId === 'ev5') next = normalizeScreenSubFields(next)
  if (itemId === 'ev12') next = normalizeWindowSubFields(next)
  if (itemId === 'ev14') next = normalizeDeckSubFields(next)
  return next
}

function normalizeElevSharedFields(itemId, fields = {}) {
  const next = { ...fields }
  if (itemId === 'ev4' && (next.Width === '3" Std' || next.Width === '3" STD')) {
    next.Width = '3" Standard'
  }
  if (itemId === 'ev5' && next.Type !== 'Solar') {
    delete next.Grade
  }
  if (itemId === 'ev3') {
    if (next.Size != null) {
      const parsed = normalizeGutterSizeValue(next.Size)
      if (parsed && next['Size (Inches)'] == null) next['Size (Inches)'] = parsed
      delete next.Size
    }
    if (next['Size (Inches)'] != null && next['Size (Inches)'] !== '') {
      next['Size (Inches)'] = normalizeGutterSizeValue(next['Size (Inches)'])
    }
  }
  return next
}

function promoteElevSharedFromSubs(itemId, shared, subs) {
  const sharedKeys = ELEV_ADDMORE_SHARED_FIELDS[itemId] || new Set()
  if (!sharedKeys.size) {
    return {
      shared: normalizeElevSharedFields(itemId, shared),
      subs: subs.map(sub => ({
        ...sub,
        fields: stripElevSharedFromSubFields(itemId, sub.fields || {}),
      })),
    }
  }

  const nextShared = { ...shared }
  const nextSubs = subs.map(sub => {
    const fields = { ...(sub.fields || {}) }
    for (const key of sharedKeys) {
      const val = fields[key]
      const cur = nextShared[key]
      if ((cur == null || cur === '' || cur === 'Select') && val != null && val !== '' && val !== 'Select') {
        nextShared[key] = val
      }
    }
    return {
      ...sub,
      fields: stripElevSharedFromSubFields(itemId, fields),
    }
  })
  return { shared: normalizeElevSharedFields(itemId, nextShared), subs: nextSubs }
}

function migrateElevAddMoreCell(cell, itemId) {
  if (!cell) {
    return { excluded: false, fields: {}, subItems: [], photos: [] }
  }

  const base = normalizeElevGutterCell(cell)
  const existingSubs = Array.isArray(base.subItems)
    ? base.subItems.map(sub => normalizeElevAddMoreSub(sub, itemId))
    : []
  const { shared, rest } = splitElevSharedFields(itemId, base.fields || {})

  if (existingSubs.length) {
    const promoted = promoteElevSharedFromSubs(itemId, shared, existingSubs)
    return {
      ...base,
      fields: promoted.shared,
      subItems: promoted.subs,
      photos: [],
    }
  }

  const topPhotos = Array.isArray(base.photos) ? base.photos : []
  if (itemId === 'ev12') {
    const expanded = expandWindowLegacySubs(rest, topPhotos)
    if (expanded) {
      const promoted = promoteElevSharedFromSubs(itemId, shared, expanded)
      return {
        ...base,
        fields: promoted.shared,
        subItems: promoted.subs,
        photos: [],
      }
    }
  }
  if (itemId === 'ev5') {
    const expanded = expandScreenLegacySubs(rest, topPhotos)
    if (expanded) {
      const promoted = promoteElevSharedFromSubs(itemId, shared, expanded)
      return {
        ...base,
        fields: promoted.shared,
        subItems: promoted.subs,
        photos: [],
      }
    }
  }
  if (itemId === 'ev6') {
    const expanded = expandShutterLegacySubs(rest, topPhotos)
    if (expanded) {
      const promoted = promoteElevSharedFromSubs(itemId, shared, expanded)
      return {
        ...base,
        fields: promoted.shared,
        subItems: promoted.subs,
        photos: [],
      }
    }
  }
  if (elevCellHasLegacyTopFields(rest, itemId) || topPhotos.length) {
    const cardFields = stripElevSharedFromSubFields(itemId, rest)
    let count = 1
    if (itemId === 'ev7' || itemId === 'ev8' || itemId === 'ev14') {
      const qty = Math.floor(Number(rest.Qty))
      if (qty > 1) count = qty
    }
    return {
      ...base,
      fields: normalizeElevSharedFields(itemId, shared),
      subItems: Array.from({ length: count }, (_, i) => ({
        fields: { ...cardFields },
        photos: i === 0 ? topPhotos : [],
      })),
      photos: [],
    }
  }

  return {
    ...base,
    fields: normalizeElevSharedFields(itemId, shared),
    subItems: [],
    photos: [],
  }
}

function normalizeElevData(elevData = {}) {
  const next = { ...elevData }

  for (const item of ELEV_ITEMS) {
    for (const dir of DIRECTIONS) {
      const key = `${item.id}_${dir}`
      const cell = next[key] || { excluded: false, fields: {}, subItems: [], photos: [] }
      if (ELEV_ADDMORE_IDS.has(item.id)) {
        next[key] = migrateElevAddMoreCell(cell, item.id)
      } else {
        const fields = { ...(cell.fields || {}) }
        next[key] = {
          ...cell,
          fields,
          subItems: Array.isArray(cell.subItems) ? cell.subItems : [],
          photos: Array.isArray(cell.photos) ? cell.photos : [],
        }
      }
    }
  }

  // Normalize any leftover gutter cells not covered above (legacy keys)
  for (const key of Object.keys(next)) {
    if (
      key.startsWith('ev3_')
      || key.startsWith('ev11_')
      || key.startsWith('ev4_')
      || key.startsWith('ev5_')
      || key.startsWith('ev6_')
      || key.startsWith('ev7_')
      || key.startsWith('ev8_')
      || key.startsWith('ev12_')
      || key.startsWith('ev14_')
    ) {
      next[key] = migrateElevAddMoreCell(next[key], key.split('_')[0])
    }
  }

  return next
}

function normalizeFenceFields(fields = {}) {
  const next = { ...fields }

  if (next.Height != null && next['Height (FT)'] == null) {
    const parsed = String(next.Height).match(/(\d+(?:\.\d+)?)/)
    next['Height (FT)'] = parsed ? parsed[1] : ''
    delete next.Height
  }

  if (next['Height (FT)'] != null && next['Height (FT)'] !== '') {
    const parsed = String(next['Height (FT)']).match(/(\d+(?:\.\d+)?)/)
    next['Height (FT)'] = parsed ? parsed[1] : next['Height (FT)']
  }

  if (next['Post Spacing (LF)'] != null && next['Post Spacing (LF)'] !== '') {
    const { feet } = parseMeasurement(next['Post Spacing (LF)'])
    next['Post Spacing (LF)'] = feet !== '' ? feet : String(next['Post Spacing (LF)']).replace(/[^\d.]/g, '')
  }

  // Legacy multi-select Material → single value
  if (Array.isArray(next.Material)) {
    next.Material = next.Material.find(v => v != null && String(v).trim() !== '') || ''
  }

  return next
}

function normalizeJobInfo(jobInfo = {}) {
  const next = { ...jobInfo }

  if (next.date != null && next.date !== '') {
    if (!next.claimFileDate) next.claimFileDate = next.date
    delete next.date
  }

  if (!Array.isArray(next.lossType)) {
    next.lossType = next.lossType ? [next.lossType] : []
  }
  if (!Array.isArray(next.frontOfHousePhotos)) next.frontOfHousePhotos = []
  if (!Array.isArray(next.mailboxPhotos)) next.mailboxPhotos = []
  if (!next.frontOfRiskDirection && next.frontOfRiskDetection) {
    next.frontOfRiskDirection = next.frontOfRiskDetection
  }
  delete next.frontOfRiskDetection

  return next
}

function normalizeExteriorData(exteriorData = {}) {
  const next = { ...exteriorData }
  const fence = next.ei_fence
  if (!fence) return next

  const normalizedFields = normalizeFenceFields(fence.fields || {})
  const fieldsChanged = JSON.stringify(normalizedFields) !== JSON.stringify(fence.fields || {})
  if (fieldsChanged) {
    next.ei_fence = { ...fence, fields: normalizedFields }
  }

  return next
}

function normalizeChimneySizeValue(val) {
  if (!val) return ''
  const v = String(val).trim()
  if (v === 'Small' || v.startsWith('Small')) return 'Small (width ≤23")'
  if (v === 'Medium' || v.startsWith('Medium')) return 'Medium (width 24"–36")'
  if (v === 'Large' || v.startsWith('Large')) return 'Large (width 37+")'
  return v
}

function normalizePipeJackSize(value) {
  if (value == null || value === '') return value
  if (value === 'Select') return value
  return String(value).replace(/"/g, '')
}

function normalizePipeJackSubFields(fields = {}) {
  const next = { ...fields }
  if (next.Size != null && next['Size (inches)'] == null) {
    next['Size (inches)'] = normalizePipeJackSize(next.Size)
    delete next.Size
  } else if (next['Size (inches)'] != null) {
    next['Size (inches)'] = normalizePipeJackSize(next['Size (inches)'])
  }
  return next
}

function migratePipeJackFields(fields = {}) {
  const subItems = []
  const sharedType = fields.Type || ''
  const sharedPainted = fields.Painted || ''

  PIPE_JACK_SIZE_LABELS.forEach(({ field, size }) => {
    const qty = Math.max(0, Number(fields[field]) || 0)
    for (let i = 0; i < qty; i += 1) {
      subItems.push({
        fields: {
          'Size (inches)': size,
          ...(sharedType ? { Type: sharedType } : {}),
          ...(sharedPainted ? { Painted: sharedPainted } : {}),
        },
        photos: [],
      })
    }
  })

  if (!subItems.length && (sharedType || sharedPainted)) {
    subItems.push({
      fields: {
        ...(sharedType ? { Type: sharedType } : {}),
        ...(sharedPainted ? { Painted: sharedPainted } : {}),
      },
      photos: [],
    })
  }

  return subItems
}

function normalizeRoofSubItem(sub) {
  return {
    fields: normalizePipeJackSubFields(sub?.fields),
    photos: Array.isArray(sub?.photos) ? sub.photos : [],
  }
}

function normalizeRoofData(roofData = {}) {
  let next = { ...roofData }
  for (const itemDef of ROOF_ITEMS) {
    const item = next[itemDef.id]
    if (!item) continue
    next[itemDef.id] = withRoofItemStatus(item, getRoofItemStatus(item))
  }
  next = normalizeRi0(next)
  next = normalizeRi1(next)
  next = normalizeRi5(next)
  next = normalizeRi11(next)
  next = normalizeRi12(next)
  next = normalizeRi14(next)
  next = normalizeRi15(next)
  next = normalizeRi17(next)
  next = normalizeFlashingItems(next)
  next = normalizeRi21(next)
  next = normalizeRi22(next)
  next = normalizeRi23(next)
  return next
}

const PREDOMINANT_PITCH_KEY = 'Predominant Pitch (x/12)'
const LEGACY_PREDOMINANT_PITCH_KEY = 'Predominant Pitch'

function normalizeRi0(roofData) {
  const next = { ...roofData }
  const ri0 = next.ri0
  if (!ri0) return next

  const fields = { ...(ri0.fields || {}) }
  const legacy = fields[LEGACY_PREDOMINANT_PITCH_KEY]
  if (legacy != null && legacy !== '' && (fields[PREDOMINANT_PITCH_KEY] == null || fields[PREDOMINANT_PITCH_KEY] === '')) {
    fields[PREDOMINANT_PITCH_KEY] = legacy
  }
  delete fields[LEGACY_PREDOMINANT_PITCH_KEY]

  if (fields[PREDOMINANT_PITCH_KEY] != null && fields[PREDOMINANT_PITCH_KEY] !== '') {
    fields[PREDOMINANT_PITCH_KEY] = formatPitch(parsePitchNumerator(fields[PREDOMINANT_PITCH_KEY], 0))
  }

  if (fields['Metal Shingle Gauge'] != null && fields['Metal Gauge'] == null) {
    fields['Metal Gauge'] = fields['Metal Shingle Gauge']
  }
  delete fields['Metal Shingle Gauge']

  next.ri0 = { ...ri0, fields }
  return next
}

function normalizeRi1(roofData) {
  const next = { ...roofData }
  const ri1 = next.ri1
  if (!ri1) return next

  const fields = { ...(ri1.fields || {}) }
  if (fields.Type != null && fields.Type !== '' && !Array.isArray(fields.Type)) {
    fields.Type = [String(fields.Type)]
  }
  next.ri1 = { ...ri1, fields }
  return next
}

function normalizeRi5(roofData) {
  const next = { ...roofData }
  const ri5 = next.ri5
  if (!ri5) return next

  const fields = { ...(ri5.fields || {}) }
  if (fields.Style != null && fields.Material == null) {
    fields.Material = fields.Style
  }
  delete fields.Style
  if (fields['Choose One'] != null && fields['Choose Ice & Water Style'] == null) {
    fields['Choose Ice & Water Style'] = fields['Choose One']
  }
  delete fields['Choose One']
  if (fields['Choose One (W-Valley)'] != null && fields['Choose W-Valley Style'] == null) {
    fields['Choose W-Valley Style'] = fields['Choose One (W-Valley)']
  }
  delete fields['Choose One (W-Valley)']
  if (fields.Material != null && fields.Material !== '' && !Array.isArray(fields.Material)) {
    fields.Material = [String(fields.Material)]
  }
  next.ri5 = { ...ri5, fields }
  return next
}

function hasLegacyChimneyTopLevel(fields = {}) {
  return fields.Qty != null
    || fields['Size / Width'] != null
    || fields['Counter Flashing'] != null
    || fields.Damaged != null
    || fields['Chimney Condition / Leak Hazard Notes'] != null
}

function normalizeChimneySubItem(sub) {
  const fields = { ...(sub?.fields || {}) }
  if (fields['Size / Width']) {
    fields['Size / Width'] = normalizeChimneySizeValue(fields['Size / Width'])
  }
  // Painted is section-level now — drop any per-chimney value.
  delete fields.Painted
  return {
    fields,
    photos: Array.isArray(sub?.photos) ? sub.photos : [],
  }
}

function migrateChimneyFields(ri17) {
  const fields = ri17.fields || {}
  const existing = (ri17.subItems || []).map(normalizeChimneySubItem)
  if (existing.length) return existing

  const qty = Math.max(0, Number(fields.Qty) || 0)
  const shared = {
    ...(fields['Size / Width'] ? { 'Size / Width': normalizeChimneySizeValue(fields['Size / Width']) } : {}),
    ...(fields['Counter Flashing'] ? { 'Counter Flashing': fields['Counter Flashing'] } : {}),
    ...(fields['Cricket Present'] ? { 'Cricket Present': fields['Cricket Present'] } : {}),
    ...(fields.Damaged ? { Damaged: fields.Damaged } : {}),
    ...(fields._damage ? { _damage: fields._damage } : {}),
  }
  const hasData = Object.keys(shared).length > 0
  const count = qty > 0 ? qty : (hasData ? 1 : 0)
  const subItems = []

  for (let i = 0; i < count; i += 1) {
    subItems.push({
      fields: { ...shared },
      photos: i === 0 ? (ri17.photos || []) : [],
    })
  }

  return subItems
}

function normalizeRi17(roofData) {
  const next = { ...roofData }
  const ri17 = next.ri17
  if (!ri17) return next

  const fields = ri17.fields || {}
  if (hasLegacyChimneyTopLevel(fields)) {
    const painted = fields.Painted
      || (ri17.subItems || []).find(sub => sub.fields?.Painted)?.fields.Painted
      || ''
    next.ri17 = {
      ...ri17,
      fields: painted ? { Painted: painted } : {},
      subItems: migrateChimneyFields(ri17),
      photos: [],
    }
    return next
  }

  let parentFields = { ...fields }
  const normalizedSubItems = (ri17.subItems || []).map(normalizeChimneySubItem)

  if (!parentFields.Painted) {
    const fromSub = (ri17.subItems || []).find(sub => sub.fields?.Painted)?.fields.Painted
    if (fromSub) parentFields = { ...parentFields, Painted: fromSub }
  }

  const subItemsChanged = normalizedSubItems.some((sub, index) => {
    const original = ri17.subItems?.[index]
    return JSON.stringify(sub.fields) !== JSON.stringify(original?.fields || {})
      || !Array.isArray(original?.photos)
  })
  const parentChanged = JSON.stringify(parentFields) !== JSON.stringify(fields)

  if (subItemsChanged || parentChanged) {
    next.ri17 = { ...ri17, fields: parentFields, subItems: normalizedSubItems }
  }

  return next
}

const FLASHING_ITEM_IDS = ['ri18', 'ri19', 'ri20']

function normalizeFlashingItems(roofData) {
  let next = { ...roofData }

  for (const itemId of FLASHING_ITEM_IDS) {
    const item = next[itemId]
    if (!item) continue

    const topFields = item.fields || {}
    const subItems = item.subItems || []
    const firstSub = subItems.find(sub => {
      const fields = sub?.fields || {}
      return fields.Material || fields.Painted || fields.Damaged || fields._damage
    })
    const lifted = firstSub?.fields || {}
    const photos = [
      ...(Array.isArray(item.photos) ? item.photos : []),
      ...subItems.flatMap(sub => sub.photos || []),
    ]

    next[itemId] = {
      ...item,
      fields: {
        ...(lifted.Material || topFields.Material ? { Material: lifted.Material || topFields.Material } : {}),
        ...(lifted.Painted || topFields.Painted ? { Painted: lifted.Painted || topFields.Painted } : {}),
        ...(lifted.Damaged || topFields.Damaged ? { Damaged: lifted.Damaged || topFields.Damaged } : {}),
        ...(lifted._damage || topFields._damage ? { _damage: lifted._damage || topFields._damage } : {}),
      },
      subItems: [],
      photos,
    }
  }

  return next
}

function normalizeCorniceFields(fields = {}) {
  const next = { ...fields }

  if ((next.Stories == null || next.Stories === '') && next.Story != null && next.Story !== '') {
    next.Stories = String(next.Story)
  }
  delete next.Story

  if (!next.Material || next.Material === '' || next.Material === 'Select') {
    if (next.Type === 'Metal') next.Material = 'Metal'
  }
  delete next.Type

  if (next.Stories != null && next.Stories !== '') next.Stories = String(next.Stories)
  if (next.Qty != null && next.Qty !== '') next.Qty = String(next.Qty)
  return next
}

function normalizeRi21(roofData) {
  const next = { ...roofData }
  const ri21 = next.ri21
  if (!ri21) return next

  const topFields = normalizeCorniceFields(ri21.fields || {})
  const subItems = ri21.subItems || []
  const firstSub = subItems.find(sub => {
    const fields = sub?.fields || {}
    return fields.Material || fields.Type || fields.Painted || fields.Damaged || fields.Stories || fields.Story || fields.Qty
  })
  const lifted = firstSub ? normalizeCorniceFields(firstSub.fields || {}) : {}
  const photos = [
    ...(Array.isArray(ri21.photos) ? ri21.photos : []),
    ...subItems.flatMap(sub => sub.photos || []),
  ]

  next.ri21 = {
    ...ri21,
    fields: {
      ...(lifted.Material || topFields.Material ? { Material: lifted.Material || topFields.Material } : {}),
      ...(lifted.Stories || topFields.Stories ? { Stories: lifted.Stories || topFields.Stories } : {}),
      ...(lifted.Qty || topFields.Qty ? { Qty: lifted.Qty || topFields.Qty } : {}),
      ...(lifted.Painted || topFields.Painted ? { Painted: lifted.Painted || topFields.Painted } : {}),
      ...(lifted.Damaged || topFields.Damaged ? { Damaged: lifted.Damaged || topFields.Damaged } : {}),
      ...(lifted._damage || topFields._damage ? { _damage: lifted._damage || topFields._damage } : {}),
    },
    subItems: [],
    photos,
  }

  return next
}

function hasLegacyLowSlopeTopLevel(fields = {}) {
  return fields.Location != null
    || fields['Style / Grade'] != null
    || fields.Pitch != null
    || fields['Pitch (x/12)'] != null
    || fields.Damaged != null
    || fields['Exposed Rafters'] != null
    || fields._damage != null
}

function normalizeLowSlopePitch(value) {
  if (value == null || value === '') return ''
  return formatPitch(parsePitchNumerator(value, 0))
}

const STRUCTURE_PITCH_KEY = 'Pitch (x/12)'
const LEGACY_STRUCTURE_PITCH_KEY = 'Pitch'

function normalizeStructurePitchFields(fields = {}) {
  const next = { ...fields }
  const legacy = next[LEGACY_STRUCTURE_PITCH_KEY]
  if (
    legacy != null
    && legacy !== ''
    && (next[STRUCTURE_PITCH_KEY] == null || next[STRUCTURE_PITCH_KEY] === '')
  ) {
    next[STRUCTURE_PITCH_KEY] = normalizeLowSlopePitch(legacy)
  }
  delete next[LEGACY_STRUCTURE_PITCH_KEY]
  if (next[STRUCTURE_PITCH_KEY] != null && next[STRUCTURE_PITCH_KEY] !== '') {
    next[STRUCTURE_PITCH_KEY] = normalizeLowSlopePitch(next[STRUCTURE_PITCH_KEY])
  }
  return next
}

function normalizeLowSlopeSubItem(sub) {
  const fields = normalizeStructurePitchFields(sub?.fields || {})
  if ((!fields['Edgemetal Material'] || fields['Edgemetal Material'] === 'Select') && fields.Material) {
    fields['Edgemetal Material'] = fields.Material
  }
  if (!fields['Edgemetal Painted'] && fields.Painted) {
    fields['Edgemetal Painted'] = fields.Painted
  }
  delete fields.Material
  delete fields.Painted
  return {
    fields,
    photos: Array.isArray(sub?.photos) ? sub.photos : [],
  }
}

function migrateLowSlopeFields(ri22) {
  const fields = ri22.fields || {}
  const existing = (ri22.subItems || []).map(normalizeLowSlopeSubItem)
  if (existing.length) return existing

  if (!hasLegacyLowSlopeTopLevel(fields)) return []

  const pitch = fields[STRUCTURE_PITCH_KEY] || fields.Pitch

  return [{
    fields: {
      ...(fields.Location ? { Location: fields.Location } : {}),
      ...(fields['Style / Grade'] ? { 'Style / Grade': fields['Style / Grade'] } : {}),
      ...(fields['Exposed Rafters'] ? { 'Exposed Rafters': fields['Exposed Rafters'] } : {}),
      ...(pitch ? { [STRUCTURE_PITCH_KEY]: normalizeLowSlopePitch(pitch) } : {}),
      ...(fields.Damaged ? { Damaged: fields.Damaged } : {}),
      ...(fields._damage ? { _damage: fields._damage } : {}),
    },
    photos: ri22.photos || [],
  }]
}

function normalizeRi22(roofData) {
  const next = { ...roofData }
  const ri22 = next.ri22
  if (!ri22) return next

  const fields = ri22.fields || {}
  if (hasLegacyLowSlopeTopLevel(fields)) {
    next.ri22 = {
      ...ri22,
      fields: {},
      subItems: migrateLowSlopeFields(ri22),
      photos: [],
    }
    return next
  }

  const normalizedSubItems = (ri22.subItems || []).map(normalizeLowSlopeSubItem)
  const subItemsChanged = normalizedSubItems.some((sub, index) => {
    const original = ri22.subItems?.[index]
    return JSON.stringify(sub.fields) !== JSON.stringify(original?.fields || {})
      || !Array.isArray(original?.photos)
  })

  if (subItemsChanged) {
    next.ri22 = { ...ri22, subItems: normalizedSubItems }
  }

  return next
}

function hasLegacyOtherStructureTopLevel(fields = {}) {
  return fields.Type != null
    || fields['Style / Grade'] != null
    || fields.Pitch != null
    || fields['Pitch (x/12)'] != null
    || fields.Damaged != null
    || fields._damage != null
}

function normalizeOtherStructureSubItem(sub) {
  return {
    fields: normalizeStructurePitchFields(sub?.fields || {}),
    photos: Array.isArray(sub?.photos) ? sub.photos : [],
  }
}

function migrateOtherStructureFields(ri23) {
  const fields = ri23.fields || {}
  const existing = (ri23.subItems || []).map(normalizeOtherStructureSubItem)
  if (existing.length) return existing

  if (!hasLegacyOtherStructureTopLevel(fields)) return []

  const pitch = fields[STRUCTURE_PITCH_KEY] || fields.Pitch

  return [{
    fields: {
      ...(fields.Type ? { Type: fields.Type } : {}),
      ...(fields['Style / Grade'] ? { 'Style / Grade': fields['Style / Grade'] } : {}),
      ...(pitch ? { [STRUCTURE_PITCH_KEY]: normalizeLowSlopePitch(pitch) } : {}),
      ...(fields.Damaged ? { Damaged: fields.Damaged } : {}),
      ...(fields._damage ? { _damage: fields._damage } : {}),
    },
    photos: ri23.photos || [],
  }]
}

function normalizeRi23(roofData) {
  const next = { ...roofData }
  const ri23 = next.ri23
  if (!ri23) return next

  const fields = ri23.fields || {}
  if (hasLegacyOtherStructureTopLevel(fields)) {
    next.ri23 = {
      ...ri23,
      fields: {},
      subItems: migrateOtherStructureFields(ri23),
      photos: [],
    }
    return next
  }

  const normalizedSubItems = (ri23.subItems || []).map(normalizeOtherStructureSubItem)
  const subItemsChanged = normalizedSubItems.some((sub, index) => {
    const original = ri23.subItems?.[index]
    return JSON.stringify(sub.fields) !== JSON.stringify(original?.fields || {})
      || !Array.isArray(original?.photos)
  })

  if (subItemsChanged) {
    next.ri23 = { ...ri23, subItems: normalizedSubItems }
  }

  return next
}

function normalizeRi11(roofData) {
  const next = { ...roofData }
  const ri11 = next.ri11
  if (!ri11) return next

  const fields = ri11.fields || {}
  const hasLegacyQty = PIPE_JACK_SIZE_LABELS.some(({ field }) => fields[field] != null && fields[field] !== '')
  const hasLegacyTopLevel = fields.Type != null || fields.Painted != null

  const normalizedSubItems = (ri11.subItems || []).length
    ? ri11.subItems.map(normalizeRoofSubItem)
    : (hasLegacyQty || hasLegacyTopLevel ? migratePipeJackFields(fields) : [])

  const sharedType = fields.Type
    || normalizedSubItems.find(sub => sub.fields?.Type)?.fields.Type
    || ''
  const sharedPainted = fields.Painted
    || normalizedSubItems.find(sub => sub.fields?.Painted)?.fields.Painted
    || ''

  const subItems = normalizedSubItems
    .filter(sub => sub.fields?.['Size (inches)'])
    .map(sub => ({
      fields: {
        'Size (inches)': sub.fields['Size (inches)'],
        ...(sharedType ? { Type: sharedType } : {}),
        ...(sharedPainted ? { Painted: sharedPainted } : {}),
      },
      photos: [],
    }))

  const photos = [
    ...(Array.isArray(ri11.photos) ? ri11.photos : []),
    ...normalizedSubItems.flatMap(sub => sub.photos || []),
  ]

  next.ri11 = {
    ...ri11,
    fields: {
      ...(sharedType ? { Type: sharedType } : {}),
      ...(sharedPainted ? { Painted: sharedPainted } : {}),
    },
    subItems,
    photos,
  }

  return next
}

function isLegacyExhaustStackSubItem(sub) {
  const fields = sub?.fields || {}
  return (fields['Width (inches)'] != null && fields['Width (inches)'] !== '')
    || (fields.Width != null && fields.Width !== '')
    || (fields.Qty != null && fields.Qty !== '')
}

function normalizeExhaustStackSize(value) {
  if (value == null || value === '' || value === 'Select') return ''
  const text = String(value).trim()
  if (['Small (3-4")', 'Medium (5-7")', 'Large (8"+)'].includes(text)) return text
  // Migrate previous labels
  if (text === 'Small (4")' || text === 'Small' || text === '4"' || text.startsWith('Small')) return 'Small (3-4")'
  if (text === 'Medium (5-6")' || text === 'Medium' || text === '5-6"' || text === '5-7"' || text.startsWith('Medium')) return 'Medium (5-7")'
  if (text === 'Large (7-8")' || text === 'Large' || text === '7-8"' || text === '8"+' || text.startsWith('Large')) return 'Large (8"+)'
  const inches = Number(text.match(/\d+(?:\.\d+)?/)?.[0])
  if (inches === 3 || inches === 4) return 'Small (3-4")'
  if (inches >= 5 && inches <= 7) return 'Medium (5-7")'
  if (inches >= 8) return 'Large (8"+)'
  return ''
}

function exhaustStackDamageParts(fields = {}) {
  const raw = Array.isArray(fields.Damaged)
    ? fields.Damaged
    : (Array.isArray(fields['Damage To'])
      ? fields['Damage To']
      : (EXHAUST_STACK_TYPES.includes(fields['Damage To']) ? [fields['Damage To']] : []))
  const parts = raw.filter(part => EXHAUST_STACK_TYPES.includes(part))
  if (parts.length) return EXHAUST_STACK_TYPES.filter(part => parts.includes(part))
  if (fields.Damaged === 'Yes' && EXHAUST_STACK_TYPES.includes(fields.Type)) {
    return [fields.Type]
  }
  return []
}

function normalizeExhaustStackSubItem(sub, sharedPainted = '') {
  const source = sub?.fields || {}
  const size = normalizeExhaustStackSize(
    source.Size || source['Width (inches)'] || source.Width,
  )
  const damaged = exhaustStackDamageParts(source)
  return {
    fields: {
      ...(size ? { Size: size } : {}),
      ...(damaged.length ? { Damaged: damaged } : {}),
      ...(damaged.length && source._damage ? { _damage: source._damage } : {}),
      ...(sharedPainted ? { Painted: sharedPainted } : {}),
    },
    photos: Array.isArray(sub?.photos) ? sub.photos : [],
  }
}

function normalizeExhaustStackSubItems(ri12, sharedPainted) {
  const topFields = ri12.fields || {}
  const subItems = []

  ;(ri12.subItems || []).forEach(sub => {
    const normalized = normalizeExhaustStackSubItem(sub, sharedPainted)
    if (isLegacyExhaustStackSubItem(sub)) {
      const qty = Math.max(0, Number(sub.fields?.Qty) || 0)
      const count = qty > 0 ? qty : 1
      for (let i = 0; i < count; i += 1) {
        subItems.push({
          ...normalized,
          photos: i === 0 ? normalized.photos : [],
        })
      }
      return
    }

    subItems.push(normalized)
  })

  const topDamage = exhaustStackDamageParts(topFields)
  if (!subItems.length && topDamage.length) {
    subItems.push({
      fields: {
        Damaged: topDamage,
        ...(topFields._damage ? { _damage: topFields._damage } : {}),
        ...(sharedPainted ? { Painted: sharedPainted } : {}),
      },
      photos: [],
    })
  }

  return subItems
}

function normalizeRi12(roofData) {
  const next = { ...roofData }
  const ri12 = next.ri12
  if (!ri12) return next

  const fields = ri12.fields || {}
  const sharedPainted = fields.Painted
    || (ri12.subItems || []).find(sub => sub.fields?.Painted)?.fields.Painted
    || ''

  next.ri12 = {
    ...ri12,
    fields: {
      ...(sharedPainted ? { Painted: sharedPainted } : {}),
    },
    subItems: normalizeExhaustStackSubItems(ri12, sharedPainted),
    photos: ri12.photos || [],
  }

  return next
}

const SKYLIGHT_SIZES = ['Large (≤16 ft²)', 'X-Large (17+ ft²)']

function normalizeSkylightSize(value) {
  if (value == null || value === '' || value === 'Select') return ''
  const text = String(value).trim()
  if (SKYLIGHT_SIZES.includes(text)) return text
  const lower = text.toLowerCase()
  if (
    lower === 'x-large'
    || lower === 'xlarge'
    || lower === 'xl'
    || lower.startsWith('x-large')
    || lower.startsWith('extra')
    || lower.includes('17+')
    || lower.includes('16+')
  ) {
    return 'X-Large (17+ ft²)'
  }
  if (
    lower.startsWith('large')
    || lower.startsWith('small')
    || lower.startsWith('medium')
    || lower.includes('≤16')
    || lower.includes('<=16')
    || lower.includes('<16')
  ) {
    return 'Large (≤16 ft²)'
  }
  return ''
}

function isLegacySkylightSubItem(sub) {
  const fields = sub?.fields || {}
  return fields['Size (L x W)'] != null && fields['Size (L x W)'] !== ''
}

function normalizeSkylightSubItem(sub) {
  const source = { ...(sub?.fields || {}) }
  delete source['Size (L x W)']
  delete source['Size (sq in)']
  delete source['Size (sq. in)']
  delete source['Length (in)']
  delete source['Width (in)']
  // Size is now L×W (Length/Width ft); drop legacy categorical Size dropdown values.
  if (normalizeSkylightSize(source.Size)) {
    delete source.Size
  }
  return {
    fields: source,
    photos: Array.isArray(sub?.photos) ? sub.photos : [],
  }
}

function migrateSkylightFields(ri14) {
  const fields = ri14.fields || {}
  const subItems = []
  const sharedStyle = fields.Style || ''
  const sharedMount = fields.Mount || ''
  const sharedDamaged = fields.Damaged || ''
  const sharedDamage = fields._damage || ''

  ;(ri14.subItems || []).forEach(sub => {
    if (isLegacySkylightSubItem(sub)) {
      subItems.push({
        fields: {
          ...(sharedStyle ? { Style: sharedStyle } : {}),
          ...(sub.fields?.Style ? { Style: sub.fields.Style } : {}),
          ...(sharedMount ? { Mount: sharedMount } : {}),
          ...(sub.fields?.Mount ? { Mount: sub.fields.Mount } : {}),
          ...(sharedDamaged ? { Damaged: sharedDamaged } : {}),
          ...(sub.fields?.Damaged ? { Damaged: sub.fields.Damaged } : {}),
          ...(sub.fields?._damage || sharedDamage ? { _damage: sub.fields._damage || sharedDamage } : {}),
        },
        photos: sub.photos || [],
      })
      return
    }

    subItems.push(normalizeSkylightSubItem(sub))
  })

  if (!subItems.length && (sharedStyle || sharedMount || sharedDamaged || sharedDamage)) {
    subItems.push({
      fields: {
        ...(sharedStyle ? { Style: sharedStyle } : {}),
        ...(sharedMount ? { Mount: sharedMount } : {}),
        ...(sharedDamaged ? { Damaged: sharedDamaged } : {}),
        ...(sharedDamage ? { _damage: sharedDamage } : {}),
      },
      photos: ri14.photos || [],
    })
  }

  return subItems
}

function normalizeRi14(roofData) {
  const next = { ...roofData }
  const ri14 = next.ri14
  if (!ri14) return next

  const fields = ri14.fields || {}
  const hasLegacyTopLevel = fields.Style != null
    || fields.Mount != null
    || fields.Damaged != null
    || fields._damage != null
  const hasLegacySubs = (ri14.subItems || []).some(isLegacySkylightSubItem)
  const hasLengthWidthSubs = (ri14.subItems || []).some(sub =>
    sub?.fields?.['Length (in)'] != null
    || sub?.fields?.['Width (in)'] != null
    || sub?.fields?.['Size (L x W)'] != null
    || sub?.fields?.['Size (sq in)'] != null
    || sub?.fields?.['Size (sq. in)'] != null,
  )

  if (hasLegacyTopLevel || hasLegacySubs || hasLengthWidthSubs) {
    next.ri14 = {
      ...ri14,
      fields: {},
      subItems: migrateSkylightFields(ri14),
      photos: [],
    }
  } else if ((ri14.subItems || []).length) {
    next.ri14 = {
      ...ri14,
      subItems: (ri14.subItems || []).map(normalizeSkylightSubItem),
    }
  }

  return next
}

function hasLegacyRainDiverterTopLevel(fields = {}) {
  return fields.Qty != null
    || fields['Length (LF)'] != null
}

function migrateRainDiverterFields(ri15) {
  const fields = ri15.fields || {}
  const existing = (ri15.subItems || []).map(sub => ({
    fields: { ...(sub?.fields || {}) },
    photos: Array.isArray(sub?.photos) ? sub.photos : [],
  }))
  if (existing.length) return existing

  const qty = Math.max(0, Number(fields.Qty) || 0)
  const length = fields['Length (LF)']
  const hasLength = length != null && length !== ''
  const count = qty > 0 ? qty : (hasLength || (ri15.photos || []).length ? 1 : 0)
  const subItems = []

  for (let i = 0; i < count; i += 1) {
    subItems.push({
      fields: i === 0 && hasLength ? { 'Length (LF)': length } : {},
      photos: i === 0 ? (ri15.photos || []) : [],
    })
  }

  return subItems
}

function normalizeRi15(roofData) {
  const next = { ...roofData }
  const ri15 = next.ri15
  if (!ri15) return next

  const fields = ri15.fields || {}
  if (hasLegacyRainDiverterTopLevel(fields)) {
    const {
      Qty: _qty,
      'Length (LF)': _length,
      ...keptFields
    } = fields
    next.ri15 = {
      ...ri15,
      fields: keptFields,
      subItems: migrateRainDiverterFields(ri15),
      photos: [],
    }
    return next
  }

  if ((ri15.subItems || []).length) {
    next.ri15 = {
      ...ri15,
      subItems: (ri15.subItems || []).map(sub => ({
        fields: { ...(sub?.fields || {}) },
        photos: Array.isArray(sub?.photos) ? sub.photos : [],
      })),
    }
  }

  return next
}

function parseRoofPhotoTarget(target) {
  const match = String(target).match(/^(.+)__sub_(\d+)$/)
  if (match) return { itemId: match[1], subIndex: Number(match[2]) }
  return { itemId: target, subIndex: null }
}

function buildPipeJackSubItemsFromParsed(roof = {}) {
  const list = Array.isArray(roof.pipeJacks) ? roof.pipeJacks : []
  if (list.length) {
    return list.map(pj => ({
      fields: {
        ...(pj?.size ? { 'Size (inches)': String(pj.size) } : {}),
        ...(pj?.type ? { Type: pj.type } : {}),
        ...(pj?.painted ? { Painted: pj.painted } : {}),
      },
      photos: [],
    }))
  }

  // Legacy fallback: shared type/painted with per-size quantity counters.
  const subItems = []
  const sharedType = roof.pipeJackType || ''
  const sharedPainted = roof.pipeJackPainted || ''
  const qtyMap = [
    ['pipeJack15qty', '1.5'],
    ['pipeJack2qty', '2'],
    ['pipeJack3qty', '3'],
    ['pipeJack4qty', '4'],
    ['pipeJack5qty', '5'],
  ]

  qtyMap.forEach(([key, size]) => {
    const qty = Math.max(0, Number(roof[key]) || 0)
    for (let i = 0; i < qty; i += 1) {
      subItems.push({
        fields: {
          'Size (inches)': size,
          ...(sharedType ? { Type: sharedType } : {}),
          ...(sharedPainted ? { Painted: sharedPainted } : {}),
        },
        photos: [],
      })
    }
  })

  if (!subItems.length && (sharedType || sharedPainted)) {
    subItems.push({
      fields: {
        ...(sharedType ? { Type: sharedType } : {}),
        ...(sharedPainted ? { Painted: sharedPainted } : {}),
      },
      photos: [],
    })
  }

  return subItems
}

function buildExhaustStackSubItemsFromParsed(roof = {}) {
  const list = Array.isArray(roof.exhaustStacks) ? roof.exhaustStacks : []
  if (list.length) {
    return list.map(es => {
      const damaged = exhaustStackDamageParts({
        Damaged: es?.damaged,
        'Damage To': es?.damageTo,
        Type: es?.type,
      })
      return {
        fields: {
          ...(normalizeExhaustStackSize(es?.size) ? { Size: normalizeExhaustStackSize(es.size) } : {}),
          ...(damaged.length ? { Damaged: damaged } : {}),
          ...(damaged.length && es?.damageDescription ? { _damage: es.damageDescription } : {}),
        },
        photos: [],
      }
    })
  }

  // Legacy fallback for the previous section-level damage fields.
  const damaged = exhaustStackDamageParts({
    Damaged: roof.exhaustStackDamaged,
    'Damage To': roof.exhaustStackDamageTo,
  })
  if (damaged.length) {
    return [{
      fields: {
        Damaged: damaged,
        ...(roof.exhaustStackDamageDescription ? { _damage: roof.exhaustStackDamageDescription } : {}),
      },
      photos: [],
    }]
  }

  return []
}

function buildChimneySubItemsFromParsed(roof = {}) {
  const list = Array.isArray(roof.chimneys) ? roof.chimneys : []
  if (list.length) {
    return list.map(ch => ({
      fields: {
        ...(ch?.size ? { 'Size / Width': normalizeChimneySizeValue(ch.size) } : {}),
        ...(ch?.material ? { Material: ch.material } : {}),
        ...(ch?.counterFlashing ? { 'Counter Flashing': ch.counterFlashing } : {}),
        ...(ch?.cricketPresent ? { 'Cricket Present': ch.cricketPresent } : {}),
        ...(ch?.damaged ? { Damaged: ch.damaged } : {}),
        ...(ch?.damaged === 'Yes' && ch?.damageDescription ? { _damage: ch.damageDescription } : {}),
      },
      photos: [],
    }))
  }

  // Legacy fallback: single shared chimney profile repeated `chimneyQty` times.
  const size = normalizeChimneySizeValue(roof.chimneySize || '')
  const counterFlashing = roof.counterFlashingCondition || ''
  const damaged = roof.chimneyDamaged || ''
  const qty = Math.max(0, Number(roof.chimneyQty) || 0)
  const hasData = size || counterFlashing || damaged
  const count = qty > 0 ? qty : (hasData ? 1 : 0)
  const subItems = []

  for (let i = 0; i < count; i += 1) {
    subItems.push({
      fields: {
        ...(size ? { 'Size / Width': size } : {}),
        ...(counterFlashing ? { 'Counter Flashing': counterFlashing } : {}),
        ...(damaged ? { Damaged: damaged } : {}),
      },
      photos: [],
    })
  }

  return subItems
}

function chimneyPaintedFromParsed(roof = {}) {
  if (roof.chimneyPainted) return roof.chimneyPainted
  const list = Array.isArray(roof.chimneys) ? roof.chimneys : []
  return list.find(ch => ch?.painted)?.painted || ''
}

const FLASHING_IMPORT_CONFIG = [
  {
    itemId: 'ri18',
    listKey: 'stepFlashing',
    material: 'stepFlashingMaterial',
    painted: 'stepFlashingPainted',
    damaged: 'stepFlashingDamaged',
    damageDescription: 'stepFlashingDamageDescription',
    present: 'stepFlashingPresent',
  },
  {
    itemId: 'ri19',
    listKey: 'counterFlashing',
    material: 'counterFlashingMaterial',
    painted: 'counterFlashingPainted',
    damaged: 'counterFlashingDamaged',
    damageDescription: 'counterFlashingDamageDescription',
    present: 'counterFlashingPresent',
  },
  {
    itemId: 'ri20',
    listKey: 'lFlashing',
    material: 'lFlashingMaterial',
    painted: 'lFlashingPainted',
    damaged: 'lFlashingDamaged',
    damageDescription: 'lFlashingDamageDescription',
    present: 'lFlashingPresent',
  },
]

function isPresentValue(value) {
  if (value == null || value === '') return null
  const normalized = String(value).trim().toLowerCase()
  if (['yes', 'true', '1'].includes(normalized)) return true
  if (['no', 'false', '0'].includes(normalized)) return false
  return null
}

function buildFlashingFieldsFromParsed(roof = {}, config) {
  const list = Array.isArray(roof[config.listKey]) ? roof[config.listKey] : []
  const first = list.find(fl => fl?.material || fl?.painted || fl?.damaged || fl?.damageDescription) || list[0]

  const material = first?.material || roof[config.material] || ''
  const painted = first?.painted || roof[config.painted] || ''
  const damaged = first?.damaged || roof[config.damaged] || ''
  const damageDescription = (
    (first?.damaged === 'Yes' && first?.damageDescription)
    || roof[config.damageDescription]
    || ''
  )
  const present = isPresentValue(config.present ? roof[config.present] : null)

  if (present === false) return null

  const hasData = material || painted || damaged || damageDescription || present === true
  if (!hasData) return null

  return {
    ...(material ? { Material: material } : {}),
    ...(painted ? { Painted: painted } : {}),
    ...(damaged ? { Damaged: damaged } : {}),
    ...(damaged === 'Yes' && damageDescription ? { _damage: damageDescription } : {}),
  }
}

function buildLowSlopeSubItemsFromParsed(roof = {}) {
  const list = Array.isArray(roof.lowSlope) ? roof.lowSlope : []
  if (list.length) {
    return list.map(ls => ({
      fields: {
        ...(ls?.location ? { Location: ls.location } : {}),
        ...(ls?.grade ? { 'Style / Grade': ls.grade } : {}),
        ...(ls?.edgemetalExisting ? { 'Edgemetal Existing?': ls.edgemetalExisting } : {}),
        ...(ls?.edgemetalExisting === 'Yes' && ls?.edgemetalWidthInches != null
          ? { 'Edgemetal Width (Inches)': String(ls.edgemetalWidthInches) }
          : {}),
        ...(ls?.edgemetalExisting === 'Yes' && (ls?.edgemetalMaterial || ls?.material)
          ? { 'Edgemetal Material': ls.edgemetalMaterial || ls.material }
          : {}),
        ...(ls?.edgemetalExisting === 'Yes' && (ls?.edgemetalPainted || ls?.painted)
          ? { 'Edgemetal Painted': ls.edgemetalPainted || ls.painted }
          : {}),
        ...(ls?.exposedRafters ? { 'Exposed Rafters': ls.exposedRafters } : {}),
        ...(ls?.pitch ? { 'Pitch (x/12)': normalizeLowSlopePitch(ls.pitch) } : {}),
        ...(ls?.damaged ? { Damaged: ls.damaged } : {}),
        ...(ls?.damaged === 'Yes' && ls?.damageDescription ? { _damage: ls.damageDescription } : {}),
      },
      photos: [],
    }))
  }

  // Legacy fallback: single shared low-slope section.
  const location = roof.lowSlopeLocation || ''
  const grade = roof.lowSlopeGrade || ''
  const pitch = roof.lowSlopePitch ? normalizeLowSlopePitch(roof.lowSlopePitch) : ''
  const damaged = roof.lowSlopeDamaged || ''
  const exposedRafters = roof.exposedRafters || ''
  const hasData = location || grade || pitch || damaged || exposedRafters

  if (!hasData) return []

  return [{
    fields: {
      ...(location ? { Location: location } : {}),
      ...(grade ? { 'Style / Grade': grade } : {}),
      ...(exposedRafters ? { 'Exposed Rafters': exposedRafters } : {}),
      ...(pitch ? { 'Pitch (x/12)': pitch } : {}),
      ...(damaged ? { Damaged: damaged } : {}),
    },
    photos: [],
  }]
}

function buildSkylightSubItemsFromParsed(roof = {}) {
  const list = Array.isArray(roof.skylights) ? roof.skylights : []
  return list.map(sk => ({
    fields: {
      ...(sk?.style ? { Style: sk.style } : {}),
      ...(sk?.mount ? { Mount: sk.mount } : {}),
      ...(sk?.length != null && sk.length !== '' ? { 'Length (ft)': String(sk.length) } : {}),
      ...(sk?.width != null && sk.width !== '' ? { 'Width (ft)': String(sk.width) } : {}),
      ...(sk?.damaged ? { Damaged: sk.damaged } : {}),
      ...(sk?.damaged === 'Yes' && sk?.damageDescription ? { _damage: sk.damageDescription } : {}),
    },
    photos: [],
  }))
}

function buildRainDiverterSubItemsFromParsed(roof = {}) {
  const list = Array.isArray(roof.rainDiverters) ? roof.rainDiverters : []
  if (list.length) {
    return list.map(rd => ({
      fields: {
        ...(rd?.lengthLF != null && rd.lengthLF !== '' ? { 'Length (LF)': String(rd.lengthLF) } : {}),
      },
      photos: [],
    }))
  }

  // Legacy fallback: qty + shared LF
  const qty = Math.max(0, Number(roof.rainDiverterQty) || 0)
  const length = roof.rainDiverterLF
  const hasLength = length != null && length !== ''
  const count = qty > 0 ? qty : (hasLength ? 1 : 0)
  const subItems = []
  for (let i = 0; i < count; i += 1) {
    subItems.push({
      fields: i === 0 && hasLength ? { 'Length (LF)': String(length) } : {},
      photos: [],
    })
  }
  return subItems
}

function buildOtherStructureSubItemsFromParsed(roof = {}) {
  const list = Array.isArray(roof.otherStructures) ? roof.otherStructures : []
  return list.map(os => ({
    fields: {
      ...(os?.type ? { Type: os.type } : {}),
      ...(os?.grade ? { 'Style / Grade': os.grade } : {}),
      ...(os?.pitch ? { 'Pitch (x/12)': normalizeLowSlopePitch(os.pitch) } : {}),
      ...(os?.damaged ? { Damaged: os.damaged } : {}),
      ...(os?.damaged === 'Yes' && os?.damageDescription ? { _damage: os.damageDescription } : {}),
    },
    photos: [],
  }))
}

export function InspectionProvider({ children }) {
  const [data, setData] = useState(INITIAL_STATE)
  const [activeTab, setActiveTabState] = useState(0)
  const [expandedSections, setExpandedSectionsState] = useState({})
  const [saveStatus, setSaveStatus] = useState('saved')
  const [driveSaveStatus, setDriveSaveStatus] = useState('unsaved')
  // Drive folder currently open in the app (null = new / not yet saved to Drive).
  const [driveFolderId, setDriveFolderIdState] = useState(null)
  // Lifted out of AIParseSection so the transcript, status, and flags survive switching tabs away and back.
  const [aiParseState, setAiParseState] = useState({ transcript: '', status: 'idle', statusMsg: '', flags: [] })
  const saveTimer = useRef(null)
  const dataRef = useRef(data)
  const activeTabRef = useRef(activeTab)
  const expandedRef = useRef(expandedSections)
  const driveFolderIdRef = useRef(driveFolderId)

  dataRef.current = data
  activeTabRef.current = activeTab
  expandedRef.current = expandedSections
  driveFolderIdRef.current = driveFolderId

  function setDriveFolderId(nextId, { persist = true } = {}) {
    const id = nextId || null
    driveFolderIdRef.current = id
    setDriveFolderIdState(id)
    if (persist) {
      persistSnapshot(dataRef.current, { driveFolderId: id }).catch(() => {})
    }
  }

  function persistSnapshot(inspectionData, overrides = {}) {
    return idbSave('current', {
      ...inspectionData,
      activeTab: activeTabRef.current,
      expandedSections: expandedRef.current,
      driveFolderId: driveFolderIdRef.current,
      ...overrides,
    })
  }

  useEffect(() => {
    idbLoad('current').then(saved => {
      if (saved) {
        const jobInfo = normalizeJobInfo({ ...INITIAL_STATE.jobInfo, ...(saved.jobInfo || {}) })
        if (!jobInfo.residenceType) jobInfo.residenceType = 'Primary'
        const { driveFolderId: savedDriveFolderId, activeTab: _at, expandedSections: _es, ...rest } = saved
        setData({
          ...INITIAL_STATE,
          ...rest,
          jobInfo,
          roofData: normalizeRoofData({ ...INITIAL_ROOF_DATA, ...(saved.roofData || {}) }),
          elevData: normalizeElevData({ ...INITIAL_ELEV_DATA, ...(saved.elevData || {}) }),
          interiorData: saved.interiorData || INITIAL_INTERIOR_DATA,
          exteriorData: normalizeExteriorData({ ...INITIAL_EXTERIOR_DATA, ...(saved.exteriorData || {}) }),
          notesData: { ...INITIAL_NOTES_DATA, ...(saved.notesData || {}) },
        })
        if (Number.isInteger(saved.activeTab)) setActiveTabState(saved.activeTab)
        if (saved.expandedSections && typeof saved.expandedSections === 'object') {
          setExpandedSectionsState(saved.expandedSections)
        }
        if (typeof savedDriveFolderId === 'string' && savedDriveFolderId) {
          setDriveFolderId(savedDriveFolderId, { persist: false })
        }
      }
    }).catch(() => {})
  }, [])

  function scheduleSave(newData) {
    setSaveStatus('unsaved')
    setDriveSaveStatus('unsaved')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      setSaveStatus('saving')
      persistSnapshot(newData)
        .then(() => setSaveStatus('saved'))
        .catch(() => setSaveStatus('unsaved'))
    }, 3000)
  }

  function setSectionExpanded(key, valueOrUpdater) {
    setExpandedSectionsState(prev => {
      const stored = Object.prototype.hasOwnProperty.call(prev, key) ? prev[key] : undefined
      const value = typeof valueOrUpdater === 'function'
        ? valueOrUpdater(stored)
        : valueOrUpdater
      const next = { ...prev, [key]: value }
      expandedRef.current = next
      persistSnapshot(dataRef.current).catch(() => {})
      return next
    })
  }

  function setActiveTab(nextTab) {
    setActiveTabState(prev => {
      const resolved = typeof nextTab === 'function' ? nextTab(prev) : nextTab
      activeTabRef.current = resolved
      persistSnapshot(dataRef.current, { activeTab: resolved }).catch(() => {})
      return resolved
    })
  }

  function updateJobInfo(field, value) {
    setData(prev => {
      const next = { ...prev, jobInfo: { ...prev.jobInfo, [field]: value } }
      scheduleSave(next)
      return next
    })
  }

  // ── Roof ──────────────────────────────────────────────────────────

  function cycleRoofStatus(itemId) {
    setData(prev => {
      const item = prev.roofData[itemId]
      const status = nextRoofItemStatus(getRoofItemStatus(item))
      const next = {
        ...prev,
        roofData: {
          ...prev.roofData,
          [itemId]: withRoofItemStatus(item, status),
        },
      }
      scheduleSave(next)
      return next
    })
  }

  /** @deprecated Prefer cycleRoofStatus — kept as alias for older call sites. */
  function toggleRoofExclude(itemId) {
    cycleRoofStatus(itemId)
  }

  function updateRoofField(itemId, label, value) {
    setData(prev => {
      const item = prev.roofData[itemId]
      const shouldSyncSubItems = (
        itemId === 'ri11' && (label === 'Type' || label === 'Painted')
      ) || (
        itemId === 'ri12' && label === 'Painted'
      )
      const subItems = shouldSyncSubItems
        ? item.subItems.map(sub => ({
            ...sub,
            fields: { ...sub.fields, [label]: value },
          }))
        : item.subItems
      const next = {
        ...prev,
        roofData: {
          ...prev.roofData,
          [itemId]: {
            ...item,
            fields: { ...item.fields, [label]: value },
            subItems,
          },
        },
      }
      scheduleSave(next)
      return next
    })
  }

  function adjustRoofSubItemSizeCount(itemId, field, size, delta) {
    setData(prev => {
      const item = prev.roofData[itemId]
      if (!item || !delta) return prev

      let subItems = [...(item.subItems || [])]
      if (delta > 0) {
        for (let i = 0; i < delta; i += 1) {
          subItems.push({
            fields: {
              [field]: size,
              ...(item.fields?.Type ? { Type: item.fields.Type } : {}),
              ...(item.fields?.Painted ? { Painted: item.fields.Painted } : {}),
            },
            photos: [],
          })
        }
      } else {
        for (let i = 0; i < Math.abs(delta); i += 1) {
          const index = subItems.findLastIndex(sub =>
            String(sub.fields?.[field] || '').replace(/"/g, '') === String(size),
          )
          if (index < 0) break
          subItems.splice(index, 1)
        }
      }

      const next = {
        ...prev,
        roofData: {
          ...prev.roofData,
          [itemId]: { ...item, subItems },
        },
      }
      scheduleSave(next)
      return next
    })
  }

  function addRoofSubItem(itemId) {
    setData(prev => {
      const item = prev.roofData[itemId]
      const next = {
        ...prev,
        roofData: {
          ...prev.roofData,
          [itemId]: {
            ...item,
            subItems: [
              ...item.subItems,
              {
                fields: itemId === 'ri12' && item.fields?.Painted
                  ? { Painted: item.fields.Painted }
                  : {},
                photos: [],
              },
            ],
          },
        },
      }
      scheduleSave(next)
      return next
    })
  }

  function removeRoofSubItem(itemId, index) {
    setData(prev => {
      const item = prev.roofData[itemId]
      const next = { ...prev, roofData: { ...prev.roofData, [itemId]: { ...item, subItems: item.subItems.filter((_, i) => i !== index) } } }
      scheduleSave(next)
      return next
    })
  }

  function updateRoofSubField(itemId, index, label, value) {
    setData(prev => {
      const item = prev.roofData[itemId]
      const subItems = item.subItems.map((sub, i) => {
        if (i !== index) return sub
        const fields = { ...sub.fields, [label]: value }
        if (label === 'Damaged') {
          if (Array.isArray(value)) {
            if (value.length === 0) delete fields._damage
          } else {
            if (value === 'No' || value === 'N/A') fields._damage = 'n/a'
            else if (value !== 'Yes') delete fields._damage
          }
        }
        if (label === 'Location') {
          delete fields['(Other)']
          if (value === 'Other') fields['Location'] = 'Other'
        }
        if (label === '(Other)') {
          fields['Location'] = value ? `Other - ${value}` : 'Other'
          delete fields['(Other)']
        }
        return { ...sub, fields }
      })
      const next = { ...prev, roofData: { ...prev.roofData, [itemId]: { ...item, subItems } } }
      scheduleSave(next)
      return next
    })
  }

  function addRoofPhoto(target, dataUrl) {
    const { itemId, subIndex } = parseRoofPhotoTarget(target)
    setData(prev => {
      const item = prev.roofData[itemId]
      if (!item) return prev

      if (subIndex != null) {
        const subItems = item.subItems.map((sub, i) =>
          i === subIndex
            ? { ...sub, photos: [...(sub.photos || []), dataUrl] }
            : sub
        )
        const next = { ...prev, roofData: { ...prev.roofData, [itemId]: { ...item, subItems } } }
        scheduleSave(next)
        return next
      }

      const next = { ...prev, roofData: { ...prev.roofData, [itemId]: { ...item, photos: [...item.photos, dataUrl] } } }
      scheduleSave(next)
      return next
    })
  }

  function removeRoofPhoto(target, index) {
    const { itemId, subIndex } = parseRoofPhotoTarget(target)
    setData(prev => {
      const item = prev.roofData[itemId]
      if (!item) return prev

      if (subIndex != null) {
        const subItems = item.subItems.map((sub, i) =>
          i === subIndex
            ? { ...sub, photos: (sub.photos || []).filter((_, photoIndex) => photoIndex !== index) }
            : sub
        )
        const next = { ...prev, roofData: { ...prev.roofData, [itemId]: { ...item, subItems } } }
        scheduleSave(next)
        return next
      }

      const next = {
        ...prev,
        roofData: {
          ...prev.roofData,
          [itemId]: { ...item, photos: item.photos.filter((_, i) => i !== index) },
        },
      }
      scheduleSave(next)
      return next
    })
  }

  const JOB_PHOTO_FIELDS = {
    frontOfHouse: 'frontOfHousePhotos',
    mailbox: 'mailboxPhotos',
  }

  function addJobPhoto(slot, dataUrl) {
    const field = JOB_PHOTO_FIELDS[slot]
    if (!field) return
    setData(prev => {
      const next = {
        ...prev,
        jobInfo: { ...prev.jobInfo, [field]: [dataUrl] },
      }
      scheduleSave(next)
      return next
    })
  }

  function removeJobPhoto(slot, index) {
    const field = JOB_PHOTO_FIELDS[slot]
    if (!field) return
    setData(prev => {
      const photos = Array.isArray(prev.jobInfo?.[field]) ? prev.jobInfo[field] : []
      const next = {
        ...prev,
        jobInfo: {
          ...prev.jobInfo,
          [field]: photos.filter((_, photoIndex) => photoIndex !== index),
        },
      }
      scheduleSave(next)
      return next
    })
  }

  function importRoofPipeJacks(roof = {}) {
    const subItems = buildPipeJackSubItemsFromParsed(roof)
    if (!subItems.length) return

    setData(prev => {
      const item = prev.roofData.ri11
      const sharedType = subItems.find(sub => sub.fields?.Type)?.fields.Type || ''
      const sharedPainted = subItems.find(sub => sub.fields?.Painted)?.fields.Painted || ''
      const syncedSubItems = subItems.map(sub => ({
        ...sub,
        fields: {
          ...sub.fields,
          ...(sharedType ? { Type: sharedType } : {}),
          ...(sharedPainted ? { Painted: sharedPainted } : {}),
        },
        photos: [],
      }))
      const next = {
        ...prev,
        roofData: {
          ...prev.roofData,
          ri11: {
            ...withRoofItemStatus(item, 'present'),
            fields: {
              ...(sharedType ? { Type: sharedType } : {}),
              ...(sharedPainted ? { Painted: sharedPainted } : {}),
            },
            subItems: syncedSubItems,
          },
        },
      }
      scheduleSave(next)
      return next
    })
  }

  function importRoofExhaustStacks(roof = {}) {
    const subItems = buildExhaustStackSubItemsFromParsed(roof)
    const sharedPainted = roof.exhaustStackPainted
      || (Array.isArray(roof.exhaustStacks)
        ? roof.exhaustStacks.find(stack => stack?.painted)?.painted
        : '')
      || ''
    if (!subItems.length && !sharedPainted) return

    setData(prev => {
      const item = prev.roofData.ri12
      const syncedSubItems = subItems.map(sub => ({
        ...sub,
        fields: {
          ...sub.fields,
          ...(sharedPainted ? { Painted: sharedPainted } : {}),
        },
      }))
      const next = {
        ...prev,
        roofData: {
          ...prev.roofData,
          ri12: {
            ...withRoofItemStatus(item, 'present'),
            fields: {
              ...(sharedPainted ? { Painted: sharedPainted } : {}),
            },
            subItems: syncedSubItems,
          },
        },
      }
      scheduleSave(next)
      return next
    })
  }

  function importRoofRainDiverters(roof = {}) {
    const subItems = buildRainDiverterSubItemsFromParsed(roof)
    const painted = roof.rainDiverterPainted || ''
    if (!subItems.length && !painted) return

    setData(prev => {
      const item = prev.roofData.ri15
      const next = {
        ...prev,
        roofData: {
          ...prev.roofData,
          ri15: {
            ...withRoofItemStatus(item, 'present'),
            fields: {
              ...(painted ? { Painted: painted } : {}),
            },
            subItems: subItems.length ? subItems : (item.subItems || []),
          },
        },
      }
      scheduleSave(next)
      return next
    })
  }

  function importRoofChimneys(roof = {}) {
    const subItems = buildChimneySubItemsFromParsed(roof)
    const painted = chimneyPaintedFromParsed(roof)
    if (!subItems.length && !painted) return

    setData(prev => {
      const item = prev.roofData.ri17
      const next = {
        ...prev,
        roofData: {
          ...prev.roofData,
          ri17: {
            ...withRoofItemStatus(item, 'present'),
            fields: painted ? { Painted: painted } : {},
            subItems,
          },
        },
      }
      scheduleSave(next)
      return next
    })
  }

  function importRoofFlashingItems(roof = {}) {
    const updates = FLASHING_IMPORT_CONFIG
      .map(config => ({
        itemId: config.itemId,
        fields: buildFlashingFieldsFromParsed(roof, config),
      }))
      .filter(entry => entry.fields)

    if (!updates.length) return

    setData(prev => {
      let roofData = { ...prev.roofData }
      for (const { itemId, fields } of updates) {
        roofData = {
          ...roofData,
          [itemId]: {
            ...withRoofItemStatus(roofData[itemId], 'present'),
            fields: {
              ...(roofData[itemId]?.fields || {}),
              ...fields,
            },
            subItems: [],
          },
        }
      }
      const next = { ...prev, roofData }
      scheduleSave(next)
      return next
    })
  }

  function importRoofLowSlopeItems(roof = {}) {
    const subItems = buildLowSlopeSubItemsFromParsed(roof)
    if (!subItems.length) return

    setData(prev => {
      const item = prev.roofData.ri22
      const next = {
        ...prev,
        roofData: {
          ...prev.roofData,
          ri22: {
            ...withRoofItemStatus(item, 'present'),
            fields: {},
            subItems,
          },
        },
      }
      scheduleSave(next)
      return next
    })
  }

  function importRoofSkylights(roof = {}) {
    const subItems = buildSkylightSubItemsFromParsed(roof)
    if (!subItems.length) return

    setData(prev => {
      const item = prev.roofData.ri14
      const next = {
        ...prev,
        roofData: {
          ...prev.roofData,
          ri14: {
            ...withRoofItemStatus(item, 'present'),
            fields: {},
            subItems,
          },
        },
      }
      scheduleSave(next)
      return next
    })
  }

  function importRoofOtherStructures(roof = {}) {
    const subItems = buildOtherStructureSubItemsFromParsed(roof)
    if (!subItems.length) return

    setData(prev => {
      const item = prev.roofData.ri23
      const next = {
        ...prev,
        roofData: {
          ...prev.roofData,
          ri23: {
            ...withRoofItemStatus(item, 'present'),
            fields: {},
            subItems,
          },
        },
      }
      scheduleSave(next)
      return next
    })
  }

  function importInteriorRooms(rooms = []) {
    if (!Array.isArray(rooms) || !rooms.length) return

    setData(prev => {
      const newRooms = rooms.map((r, i) => ({
        id: `room_${Date.now()}_${i}`,
        name: r?.name === 'Other' && r?.customName ? `Other - ${r.customName}` : (r?.name || ''),
        customName: r?.customName || '',
        photos: [],
        fields: {
          story: r?.story || '',
          sheetrockCompromised: r?.sheetrockCompromised || '',
          ceilingDamage: r?.ceilingDamage || '', ceilingNotes: r?.ceilingNotes || '',
          wallDamage: r?.wallDamage || '', wallNotes: r?.wallNotes || '',
          floorDamage: r?.floorDamage || '', floorNotes: r?.floorNotes || '',
          moldPresent: r?.moldPresent || '', moldNotes: r?.moldNotes || '',
          notes: r?.notes || '',
        },
      }))
      const next = { ...prev, interiorData: { rooms: [...prev.interiorData.rooms, ...newRooms] } }
      scheduleSave(next)
      return next
    })
  }

  // ── Elevations ────────────────────────────────────────────────────

  function toggleElevExclude(cellKey) {
    setData(prev => {
      const cell = prev.elevData[cellKey]
      const next = { ...prev, elevData: { ...prev.elevData, [cellKey]: { ...cell, excluded: !cell.excluded } } }
      scheduleSave(next)
      return next
    })
  }

  function updateElevField(cellKey, label, value) {
    setData(prev => {
      const cell = prev.elevData[cellKey]
      const fields = { ...cell.fields, [label]: value }
      // Siding Style "Other" mirrors Low Slope Location: store custom text as "Other - …"
      if (cellKey.startsWith('ev0_') && label === 'Style') {
        delete fields['(Other)']
        if (value === 'Other') fields.Style = 'Other'
      }
      if (cellKey.startsWith('ev0_') && label === '(Other)') {
        fields.Style = value ? `Other - ${value}` : 'Other'
        delete fields['(Other)']
      }
      // Window Screens: Grade only applies to Solar type
      if (cellKey.startsWith('ev5_') && label === 'Type' && value !== 'Solar') {
        delete fields.Grade
      }
      // Shutters: Custom Grade only when Grade is Custom
      if (cellKey.startsWith('ev6_') && label === 'Grade' && value !== 'Custom') {
        delete fields['Custom Grade']
      }
      // Garage Doors: Window Qty only when Windows is Yes
      if (cellKey.startsWith('ev8_') && label === 'Windows' && value !== 'Yes') {
        delete fields['Window Qty']
      }
      const next = { ...prev, elevData: { ...prev.elevData, [cellKey]: { ...cell, fields } } }
      scheduleSave(next)
      return next
    })
  }

  function addElevSubItem(cellKey) {
    setData(prev => {
      const cell = prev.elevData[cellKey] || { excluded: false, fields: {}, subItems: [], photos: [] }
      const next = {
        ...prev,
        elevData: {
          ...prev.elevData,
          [cellKey]: {
            ...cell,
            subItems: [...(cell.subItems || []), { fields: {}, photos: [] }],
          },
        },
      }
      scheduleSave(next)
      return next
    })
  }

  function removeElevSubItem(cellKey, index) {
    setData(prev => {
      const cell = prev.elevData[cellKey]
      const next = {
        ...prev,
        elevData: {
          ...prev.elevData,
          [cellKey]: {
            ...cell,
            subItems: (cell.subItems || []).filter((_, i) => i !== index),
          },
        },
      }
      scheduleSave(next)
      return next
    })
  }

  function updateElevSubField(cellKey, index, label, value) {
    setData(prev => {
      const cell = prev.elevData[cellKey]
      const subItems = (cell.subItems || []).map((sub, i) => {
        if (i !== index) return sub
        const fields = { ...sub.fields, [label]: value }
        if (label === 'Damaged') {
          if (value === 'No' || value === 'N/A') fields._damage = 'n/a'
          else if (value !== 'Yes') delete fields._damage
        }
        if (cellKey.startsWith('ev8_') && label === 'Windows' && value !== 'Yes') {
          delete fields['Window Qty']
        }
        return { ...sub, fields }
      })
      const next = { ...prev, elevData: { ...prev.elevData, [cellKey]: { ...cell, subItems } } }
      scheduleSave(next)
      return next
    })
  }

  function replaceElevSubItems(cellKey, subItems) {
    setData(prev => {
      const cell = prev.elevData[cellKey] || { excluded: false, fields: {}, subItems: [], photos: [] }
      const itemId = cellKey.split('_')[0]
      const { shared } = splitElevSharedFields(itemId, cell.fields || {})
      const next = {
        ...prev,
        elevData: {
          ...prev.elevData,
          [cellKey]: {
            ...cell,
            fields: shared,
            photos: [],
            subItems: (subItems || []).map(sub => ({
              fields: stripElevSharedFromSubFields(itemId, sub.fields || {}),
              photos: Array.isArray(sub.photos) ? sub.photos : [],
            })),
          },
        },
      }
      scheduleSave(next)
      return next
    })
  }

  function addElevPhoto(target, dataUrl) {
    const { itemId: cellKey, subIndex } = parseRoofPhotoTarget(target)
    setData(prev => {
      const cell = prev.elevData[cellKey]
      if (!cell) return prev

      if (subIndex != null) {
        const subItems = (cell.subItems || []).map((sub, i) => (
          i === subIndex
            ? { ...sub, photos: [...(sub.photos || []), dataUrl] }
            : sub
        ))
        const next = { ...prev, elevData: { ...prev.elevData, [cellKey]: { ...cell, subItems } } }
        scheduleSave(next)
        return next
      }

      const next = { ...prev, elevData: { ...prev.elevData, [cellKey]: { ...cell, photos: [...(cell.photos || []), dataUrl] } } }
      scheduleSave(next)
      return next
    })
  }

  function removeElevPhoto(target, index) {
    const { itemId: cellKey, subIndex } = parseRoofPhotoTarget(target)
    setData(prev => {
      const cell = prev.elevData[cellKey]
      if (!cell) return prev

      if (subIndex != null) {
        const subItems = (cell.subItems || []).map((sub, i) => (
          i === subIndex
            ? { ...sub, photos: (sub.photos || []).filter((_, photoIndex) => photoIndex !== index) }
            : sub
        ))
        const next = { ...prev, elevData: { ...prev.elevData, [cellKey]: { ...cell, subItems } } }
        scheduleSave(next)
        return next
      }

      const next = {
        ...prev,
        elevData: {
          ...prev.elevData,
          [cellKey]: { ...cell, photos: (cell.photos || []).filter((_, i) => i !== index) },
        },
      }
      scheduleSave(next)
      return next
    })
  }

  // ── Interior ──────────────────────────────────────────────────────

  function addInteriorRoom() {
    setData(prev => {
      const room = {
        id: `room_${Date.now()}`,
        name: '',
        customName: '',
        photos: [],
        fields: {
          story: '', sheetrockCompromised: '', ceilingDamage: '', ceilingNotes: '',
          wallDamage: '', wallNotes: '', floorDamage: '', floorNotes: '',
          moldPresent: '', moldNotes: '', notes: '',
        },
      }
      const next = { ...prev, interiorData: { rooms: [...prev.interiorData.rooms, room] } }
      scheduleSave(next)
      return next
    })
  }

  function removeInteriorRoom(roomId) {
    setData(prev => {
      const next = { ...prev, interiorData: { rooms: prev.interiorData.rooms.filter(r => r.id !== roomId) } }
      scheduleSave(next)
      return next
    })
  }

  function updateInteriorRoom(roomId, field, value) {
    setData(prev => {
      const rooms = prev.interiorData.rooms.map(r => {
        if (r.id !== roomId) return r
        if (field === '_name') return { ...r, name: value, customName: '' }
        if (field === '_customName') return { ...r, name: value ? `Other - ${value}` : 'Other', customName: value }
        return { ...r, fields: { ...r.fields, [field]: value } }
      })
      const next = { ...prev, interiorData: { rooms } }
      scheduleSave(next)
      return next
    })
  }

  function addInteriorPhoto(roomId, dataUrl) {
    setData(prev => {
      const rooms = prev.interiorData.rooms.map(r =>
        r.id === roomId ? { ...r, photos: [...r.photos, dataUrl] } : r
      )
      const next = { ...prev, interiorData: { rooms } }
      scheduleSave(next)
      return next
    })
  }

  function removeInteriorPhoto(roomId, index) {
    setData(prev => {
      const rooms = prev.interiorData.rooms.map(r =>
        r.id === roomId ? { ...r, photos: r.photos.filter((_, i) => i !== index) } : r
      )
      const next = { ...prev, interiorData: { rooms } }
      scheduleSave(next)
      return next
    })
  }

  // ── Notes ─────────────────────────────────────────────────────────

  function updateNote(field, value) {
    setData(prev => {
      const next = { ...prev, notesData: { ...prev.notesData, [field]: value } }
      scheduleSave(next)
      return next
    })
  }

  // ── Exterior ──────────────────────────────────────────────────────

  function toggleExteriorExclude(itemId) {
    setData(prev => {
      const item = prev.exteriorData[itemId]
      const next = { ...prev, exteriorData: { ...prev.exteriorData, [itemId]: { ...item, excluded: !item.excluded } } }
      scheduleSave(next)
      return next
    })
  }

  function updateExteriorField(itemId, label, value) {
    setData(prev => {
      const item = prev.exteriorData[itemId]
      const next = { ...prev, exteriorData: { ...prev.exteriorData, [itemId]: { ...item, fields: { ...item.fields, [label]: value } } } }
      scheduleSave(next)
      return next
    })
  }

  function addExteriorPhoto(itemId, dataUrl) {
    setData(prev => {
      const item = prev.exteriorData[itemId]
      const next = { ...prev, exteriorData: { ...prev.exteriorData, [itemId]: { ...item, photos: [...item.photos, dataUrl] } } }
      scheduleSave(next)
      return next
    })
  }

  function removeExteriorPhoto(itemId, index) {
    setData(prev => {
      const item = prev.exteriorData[itemId]
      const next = { ...prev, exteriorData: { ...prev.exteriorData, [itemId]: { ...item, photos: item.photos.filter((_, i) => i !== index) } } }
      scheduleSave(next)
      return next
    })
  }

  // ─────────────────────────────────────────────────────────────────

  function applyXmlImport(parsed) {
    setData(prev => {
      let next = { ...prev }

      if (parsed.address?.address1) {
        const a = parsed.address
        const addressLine = a.address1
        const formatted = `${addressLine}, ${a.city}, ${a.state} ${a.zipcode}`
        next = {
          ...next,
          jobInfo: {
            ...next.jobInfo,
            addrParts: { address1: a.address1, address2: '', city: a.city, state: a.state, zipcode: a.zipcode },
            addr: formatted,
          },
        }
      }

      const roofData = { ...next.roofData }

      if (parsed.pitch) {
        const ri0 = roofData.ri0
        roofData.ri0 = { ...ri0, fields: { ...ri0.fields, 'Predominant Pitch (x/12)': parsed.pitch } }
      }

      if (parsed.valleyPresent) {
        const ri5 = roofData.ri5
        roofData.ri5 = withRoofItemStatus(ri5, 'present')
      }

      if (parsed.lineLengths?.RIDGE > 0) {
        const ri6 = roofData.ri6
        roofData.ri6 = { ...ri6, fields: { ...ri6.fields, 'Length (LF)': String(parsed.lineLengths.RIDGE) } }
      }

      next = { ...next, roofData }
      scheduleSave(next)
      return next
    })
  }

  function manualSave() {
    setSaveStatus('saving')
    persistSnapshot(data)
      .then(() => setSaveStatus('saved'))
      .catch(() => setSaveStatus('unsaved'))
  }

  function loadInspection(saved, options = {}) {
    const { driveFolderId: _omitDriveFolderId, activeTab: _omitTab, expandedSections: savedExpanded, ...rest } = saved
    const jobInfo = normalizeJobInfo({ ...INITIAL_STATE.jobInfo, ...(saved.jobInfo || {}) })
    if (!jobInfo.residenceType) jobInfo.residenceType = 'Primary'
    const next = {
      ...INITIAL_STATE,
      ...rest,
      jobInfo,
      roofData: normalizeRoofData({ ...INITIAL_ROOF_DATA, ...(saved.roofData || {}) }),
      elevData: normalizeElevData({ ...INITIAL_ELEV_DATA, ...(saved.elevData || {}) }),
      interiorData: saved.interiorData || INITIAL_INTERIOR_DATA,
      exteriorData: normalizeExteriorData({ ...INITIAL_EXTERIOR_DATA, ...(saved.exteriorData || {}) }),
      notesData: { ...INITIAL_NOTES_DATA, ...(saved.notesData || {}) },
    }
    const nextDriveFolderId = options.driveFolderId ?? null
    setDriveFolderId(nextDriveFolderId, { persist: false })
    setData(next)
    setActiveTabState(0)
    if (savedExpanded && typeof savedExpanded === 'object') {
      setExpandedSectionsState(savedExpanded)
      expandedRef.current = savedExpanded
    }
    persistSnapshot(next, { activeTab: 0, driveFolderId: nextDriveFolderId })
    setSaveStatus('saved')
    setDriveSaveStatus(nextDriveFolderId ? 'saved' : 'unsaved')
    setAiParseState({ transcript: '', status: 'idle', statusMsg: '', flags: [] })
  }

  function resetAll() {
    if (!confirm('Reset all data? This cannot be undone.')) return
    setData(INITIAL_STATE)
    setActiveTabState(0)
    setExpandedSectionsState({})
    expandedRef.current = {}
    setDriveFolderId(null, { persist: false })
    persistSnapshot(INITIAL_STATE, { activeTab: 0, expandedSections: {}, driveFolderId: null })
    setSaveStatus('saved')
    setDriveSaveStatus('unsaved')
    setAiParseState({ transcript: '', status: 'idle', statusMsg: '', flags: [] })
  }

  function startNewInspection() {
    setData(INITIAL_STATE)
    setActiveTabState(0)
    setExpandedSectionsState({})
    expandedRef.current = {}
    setDriveFolderId(null, { persist: false })
    persistSnapshot(INITIAL_STATE, { activeTab: 0, expandedSections: {}, driveFolderId: null })
    setSaveStatus('saved')
    setDriveSaveStatus('unsaved')
    setAiParseState({ transcript: '', status: 'idle', statusMsg: '', flags: [] })
  }

  const completion = calculateCompletion(data)

  return (
    <InspectionContext.Provider value={{
      data, activeTab, setActiveTab,
      expandedSections, setSectionExpanded,
      saveStatus, driveSaveStatus, setDriveSaveStatus, driveFolderId, setDriveFolderId, completion, updateJobInfo, manualSave, resetAll, startNewInspection, loadInspection, applyXmlImport,
      aiParseState, setAiParseState,
      toggleRoofExclude, cycleRoofStatus, updateRoofField,
      addRoofSubItem, removeRoofSubItem, updateRoofSubField, adjustRoofSubItemSizeCount, importRoofPipeJacks, importRoofExhaustStacks, importRoofRainDiverters, importRoofChimneys, importRoofFlashingItems, importRoofLowSlopeItems,
      importRoofSkylights, importRoofOtherStructures,
      addRoofPhoto, removeRoofPhoto,
      addJobPhoto, removeJobPhoto,
      toggleElevExclude, updateElevField,
      addElevSubItem, removeElevSubItem, updateElevSubField, replaceElevSubItems,
      addElevPhoto, removeElevPhoto,
      addInteriorRoom, removeInteriorRoom, updateInteriorRoom, importInteriorRooms,
      addInteriorPhoto, removeInteriorPhoto,
      toggleExteriorExclude, updateExteriorField,
      addExteriorPhoto, removeExteriorPhoto,
      updateNote,
    }}>
      {children}
    </InspectionContext.Provider>
  )
}

export function useInspection() {
  return useContext(InspectionContext)
}
