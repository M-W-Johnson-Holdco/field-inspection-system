import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { idbSave, idbLoad } from '../lib/idb'
import { ROOF_ITEMS } from '../data/roofItems'
import { ELEV_ITEMS, DIRECTIONS } from '../data/elevItems'
import { EXTERIOR_ITEMS } from '../data/exteriorItems'
import { formatPitch, parsePitchNumerator } from '../utils/pitch'
import { parseMeasurement } from '../utils/measurement'
import { isFieldVisible } from '../utils/fieldGrid'

const InspectionContext = createContext(null)

const INITIAL_ROOF_DATA = Object.fromEntries(
  ROOF_ITEMS.map(item => [item.id, { excluded: false, fields: {}, subItems: [], photos: [] }])
)

const INITIAL_ELEV_DATA = Object.fromEntries(
  ELEV_ITEMS.flatMap(item =>
    DIRECTIONS.map(dir => [`${item.id}_${dir}`, { excluded: false, fields: {}, photos: [] }]),
  ),
)

const INITIAL_INTERIOR_DATA = { rooms: [] }

const INITIAL_EXTERIOR_DATA = Object.fromEntries(
  EXTERIOR_ITEMS.map(item => [item.id, { excluded: false, fields: {}, photos: [] }]),
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

  ;['cust', 'preferredContact', 'pm', 'insp', 'ins', 'claim', 'claimFileDate', 'stormDate'].forEach(key => {
    countValue(ji[key], totals)
  })
  countValue(ji.phone, totals, isValidPhone)
  countValue(ji.email, totals, isValidEmail)
  countValue(ji.addrParts, totals, isValidAddressParts)
  if (ji.residenceType === 'Rental') {
    countValue(ji.tenantname, totals)
    countValue(ji.tenantphone, totals, isValidPhone)
  }

  ROOF_ITEMS.forEach(itemDef => {
    const item = data.roofData?.[itemDef.id]
    if (!item || item.excluded) return

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
      if (itemDef.subItemDamaged && sub.fields?.Damaged === 'Yes') {
        countValue(sub.fields?._damage, totals)
      }
    })
  })

  ELEV_ITEMS.forEach(itemDef => {
    DIRECTIONS.forEach(dir => {
      const cell = data.elevData?.[`${itemDef.id}_${dir}`]
      if (!cell || cell.excluded) return

      ;(itemDef.fields || []).forEach(field => countValue(cell.fields?.[field.l], totals))
      if (cell.fields?.Damaged === 'Yes') countValue(cell.fields?._damage, totals)
    })
  })

  ;(data.interiorData?.rooms || []).forEach(room => {
    countValue(room.name && room.name !== 'Other' ? room.name : null, totals)
    ;['story', 'ceilingDamage', 'wallDamage', 'floorDamage', 'moldPresent'].forEach(key => {
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
]

const EXHAUST_STACK_TYPES = ['Flange', 'Stack', 'Cap']

function normalizeGutterSizeValue(val) {
  if (val == null || val === '' || val === 'Select') return ''
  const match = String(val).match(/(\d+(?:\.\d+)?)/)
  return match ? match[1] : String(val).trim()
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

function normalizeElevData(elevData = {}) {
  const next = { ...elevData }
  for (const key of Object.keys(next)) {
    if (key.startsWith('ev3_')) next[key] = normalizeElevGutterCell(next[key])
  }
  for (const dir of DIRECTIONS) {
    const key = `ev3_${dir}`
    if (!next[key]) {
      next[key] = normalizeElevGutterCell({ excluded: false, fields: {}, photos: [] })
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

  return next
}

function normalizeJobInfo(jobInfo = {}) {
  const next = { ...jobInfo }

  if (next.date != null && next.date !== '') {
    if (!next.claimFileDate) next.claimFileDate = next.date
    delete next.date
  }

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
  if (v === 'Small' || v.startsWith('Small')) return 'Small (width < 24")'
  if (v === 'Medium' || v.startsWith('Medium')) return 'Medium (width 24"–36")'
  if (v === 'Large' || v.startsWith('Large')) return 'Large (width > 36")'
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
  next = normalizeRi11(next)
  next = normalizeRi12(next)
  next = normalizeRi14(next)
  next = normalizeRi17(next)
  next = normalizeFlashingItems(next)
  next = normalizeRi21(next)
  next = normalizeRi22(next)
  next = normalizeRi23(next)
  return next
}

function hasLegacyChimneyTopLevel(fields = {}) {
  return fields.Qty != null
    || fields['Size / Width'] != null
    || fields['Counter Flashing'] != null
    || fields.Painted != null
    || fields.Damaged != null
    || fields['Chimney Condition / Leak Hazard Notes'] != null
}

function normalizeChimneySubItem(sub) {
  const fields = { ...(sub?.fields || {}) }
  if (fields['Size / Width']) {
    fields['Size / Width'] = normalizeChimneySizeValue(fields['Size / Width'])
  }
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
    ...(fields.Painted ? { Painted: fields.Painted } : {}),
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
    next.ri17 = {
      ...ri17,
      fields: {},
      subItems: migrateChimneyFields(ri17),
      photos: [],
    }
    return next
  }

  const normalizedSubItems = (ri17.subItems || []).map(normalizeChimneySubItem)
  const subItemsChanged = normalizedSubItems.some((sub, index) => {
    const original = ri17.subItems?.[index]
    return JSON.stringify(sub.fields) !== JSON.stringify(original?.fields || {})
      || !Array.isArray(original?.photos)
  })

  if (subItemsChanged) {
    next.ri17 = { ...ri17, subItems: normalizedSubItems }
  }

  return next
}

const FLASHING_ITEM_IDS = ['ri18', 'ri19', 'ri20']

function hasLegacyFlashingTopLevel(fields = {}) {
  return fields.Painted != null
    || fields.Damaged != null
    || fields['Length (LF)'] != null
    || fields._damage != null
}

function normalizeFlashingSubItem(sub) {
  return {
    fields: { ...(sub?.fields || {}) },
    photos: Array.isArray(sub?.photos) ? sub.photos : [],
  }
}

function migrateFlashingFields(item) {
  const fields = item.fields || {}
  const existing = (item.subItems || []).map(normalizeFlashingSubItem)
  if (existing.length) return existing

  if (!hasLegacyFlashingTopLevel(fields)) return []

  return [{
    fields: {
      ...(fields['Length (LF)'] ? { 'Length (LF)': fields['Length (LF)'] } : {}),
      ...(fields.Painted ? { Painted: fields.Painted } : {}),
      ...(fields.Damaged ? { Damaged: fields.Damaged } : {}),
      ...(fields._damage ? { _damage: fields._damage } : {}),
    },
    photos: item.photos || [],
  }]
}

function normalizeFlashingItems(roofData) {
  let next = { ...roofData }

  for (const itemId of FLASHING_ITEM_IDS) {
    const item = next[itemId]
    if (!item) continue

    const fields = item.fields || {}
    if (hasLegacyFlashingTopLevel(fields)) {
      next[itemId] = {
        ...item,
        fields: {},
        subItems: migrateFlashingFields(item),
        photos: [],
      }
      continue
    }

    const normalizedSubItems = (item.subItems || []).map(normalizeFlashingSubItem)
    const subItemsChanged = normalizedSubItems.some((sub, index) => {
      const original = item.subItems?.[index]
      return JSON.stringify(sub.fields) !== JSON.stringify(original?.fields || {})
        || !Array.isArray(original?.photos)
    })

    if (subItemsChanged) {
      next[itemId] = { ...item, subItems: normalizedSubItems }
    }
  }

  return next
}

function hasLegacyCorniceTopLevel(fields = {}) {
  return fields.Type != null
    || fields.Qty != null
    || fields.Story != null
}

function normalizeCorniceSubItem(sub) {
  const fields = { ...(sub?.fields || {}) }
  if (fields.Story != null && fields.Story !== '') {
    fields.Story = String(fields.Story)
  }
  if (fields.Qty != null && fields.Qty !== '') {
    fields.Qty = String(fields.Qty)
  }
  return {
    fields,
    photos: Array.isArray(sub?.photos) ? sub.photos : [],
  }
}

function migrateCorniceFields(ri21) {
  const fields = ri21.fields || {}
  const existing = (ri21.subItems || []).map(normalizeCorniceSubItem)
  if (existing.length) return existing

  const type = fields.Type || ''
  const story = fields.Story != null && fields.Story !== '' ? String(fields.Story) : ''
  const qty = Math.max(0, Number(fields.Qty) || 0)
  const hasData = type || story || fields.Qty != null

  if (!hasData) return []

  if (qty > 1) {
    return Array.from({ length: qty }, (_, index) => ({
      fields: {
        ...(type ? { Type: type } : {}),
        ...(story ? { Story: story } : {}),
      },
      photos: index === 0 ? (ri21.photos || []) : [],
    }))
  }

  return [{
    fields: {
      ...(type ? { Type: type } : {}),
      ...(story ? { Story: story } : {}),
      ...(fields.Qty != null && fields.Qty !== '' ? { Qty: String(fields.Qty) } : {}),
    },
    photos: ri21.photos || [],
  }]
}

function normalizeRi21(roofData) {
  const next = { ...roofData }
  const ri21 = next.ri21
  if (!ri21) return next

  const fields = ri21.fields || {}
  if (hasLegacyCorniceTopLevel(fields)) {
    next.ri21 = {
      ...ri21,
      fields: {},
      subItems: migrateCorniceFields(ri21),
      photos: [],
    }
    return next
  }

  const normalizedSubItems = (ri21.subItems || []).map(normalizeCorniceSubItem)
  const subItemsChanged = normalizedSubItems.some((sub, index) => {
    const original = ri21.subItems?.[index]
    return JSON.stringify(sub.fields) !== JSON.stringify(original?.fields || {})
      || !Array.isArray(original?.photos)
  })

  if (subItemsChanged) {
    next.ri21 = { ...ri21, subItems: normalizedSubItems }
  }

  return next
}

function hasLegacyLowSlopeTopLevel(fields = {}) {
  return fields.Location != null
    || fields['Style / Grade'] != null
    || fields.Pitch != null
    || fields.Damaged != null
    || fields['Exposed Rafters'] != null
    || fields._damage != null
}

function normalizeLowSlopePitch(value) {
  if (value == null || value === '') return ''
  return formatPitch(parsePitchNumerator(value, 0))
}

function normalizeLowSlopeSubItem(sub) {
  const fields = { ...(sub?.fields || {}) }
  if (fields.Pitch != null && fields.Pitch !== '') {
    fields.Pitch = normalizeLowSlopePitch(fields.Pitch)
  }
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

  return [{
    fields: {
      ...(fields.Location ? { Location: fields.Location } : {}),
      ...(fields['Style / Grade'] ? { 'Style / Grade': fields['Style / Grade'] } : {}),
      ...(fields['Exposed Rafters'] ? { 'Exposed Rafters': fields['Exposed Rafters'] } : {}),
      ...(fields.Pitch ? { Pitch: normalizeLowSlopePitch(fields.Pitch) } : {}),
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
    || fields.Damaged != null
    || fields._damage != null
}

function normalizeOtherStructureSubItem(sub) {
  const fields = { ...(sub?.fields || {}) }
  if (fields.Pitch != null && fields.Pitch !== '') {
    fields.Pitch = normalizeLowSlopePitch(fields.Pitch)
  }
  return {
    fields,
    photos: Array.isArray(sub?.photos) ? sub.photos : [],
  }
}

function migrateOtherStructureFields(ri23) {
  const fields = ri23.fields || {}
  const existing = (ri23.subItems || []).map(normalizeOtherStructureSubItem)
  if (existing.length) return existing

  if (!hasLegacyOtherStructureTopLevel(fields)) return []

  return [{
    fields: {
      ...(fields.Type ? { Type: fields.Type } : {}),
      ...(fields['Style / Grade'] ? { 'Style / Grade': fields['Style / Grade'] } : {}),
      ...(fields.Pitch ? { Pitch: normalizeLowSlopePitch(fields.Pitch) } : {}),
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

  if (!(ri11.subItems || []).length && (hasLegacyQty || hasLegacyTopLevel)) {
    next.ri11 = {
      ...ri11,
      fields: {},
      subItems: migratePipeJackFields(fields),
      photos: ri11.photos || [],
    }
    return next
  }

  const normalizedSubItems = (ri11.subItems || []).map(normalizeRoofSubItem)
  const subItemsChanged = normalizedSubItems.some((sub, index) => {
    const original = ri11.subItems?.[index]
    return JSON.stringify(sub.fields) !== JSON.stringify(original?.fields || {})
      || !Array.isArray(original?.photos)
  })

  if (subItemsChanged) {
    next.ri11 = { ...ri11, subItems: normalizedSubItems }
  }

  return next
}

function isLegacyExhaustStackSubItem(sub) {
  const fields = sub?.fields || {}
  return (fields['Width (inches)'] != null && fields['Width (inches)'] !== '')
    || (fields.Width != null && fields.Width !== '')
    || (fields.Qty != null && fields.Qty !== '')
}

function normalizeExhaustStackSubItem(sub) {
  return {
    fields: { ...(sub?.fields || {}) },
    photos: Array.isArray(sub?.photos) ? sub.photos : [],
  }
}

function migrateExhaustStackFields(ri12) {
  const fields = ri12.fields || {}
  const subItems = []
  const sharedPainted = fields.Painted || ''
  const sharedDamaged = fields.Damaged || ''
  const damageTo = fields['Damage To']
  const damageTypes = Array.isArray(damageTo)
    ? damageTo.filter(type => EXHAUST_STACK_TYPES.includes(type))
    : (damageTo && EXHAUST_STACK_TYPES.includes(damageTo) ? [damageTo] : [])

  ;(ri12.subItems || []).forEach(sub => {
    if (isLegacyExhaustStackSubItem(sub)) {
      const qty = Math.max(0, Number(sub.fields?.Qty) || 0)
      const count = qty > 0 ? qty : 1
      for (let i = 0; i < count; i += 1) {
        subItems.push({
          fields: {
            ...(sharedPainted ? { Painted: sharedPainted } : {}),
            ...(sub.fields?.Painted ? { Painted: sub.fields.Painted } : {}),
            ...(sharedDamaged ? { Damaged: sharedDamaged } : {}),
            ...(sub.fields?.Damaged ? { Damaged: sub.fields.Damaged } : {}),
            ...(sub.fields?._damage ? { _damage: sub.fields._damage } : {}),
          },
          photos: i === 0 ? (sub.photos || []) : [],
        })
      }
      return
    }

    subItems.push(normalizeExhaustStackSubItem(sub))
  })

  if (!subItems.length && damageTypes.length) {
    damageTypes.forEach(type => {
      subItems.push({
        fields: {
          Type: type,
          ...(sharedPainted ? { Painted: sharedPainted } : {}),
          ...(sharedDamaged ? { Damaged: sharedDamaged } : {}),
        },
        photos: [],
      })
    })
  } else if (!subItems.length && (sharedPainted || sharedDamaged)) {
    subItems.push({
      fields: {
        ...(sharedPainted ? { Painted: sharedPainted } : {}),
        ...(sharedDamaged ? { Damaged: sharedDamaged } : {}),
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
  const hasLegacyTopLevel = fields['Damage To'] != null
    || fields.Painted != null
    || fields.Damaged != null
  const hasLegacySubs = (ri12.subItems || []).some(isLegacyExhaustStackSubItem)

  if (hasLegacyTopLevel || hasLegacySubs) {
    next.ri12 = {
      ...ri12,
      fields: {},
      subItems: migrateExhaustStackFields(ri12),
      photos: ri12.photos || [],
    }
  }

  return next
}

function parseLegacySkylightSize(text) {
  if (!text) return {}
  const match = String(text).trim().match(/(\d+(?:\.\d+)?)\s*(?:in|"|''|″)?\s*[x×]\s*(\d+(?:\.\d+)?)/i)
  if (!match) return {}
  return { 'Length (in)': match[1], 'Width (in)': match[2] }
}

function isLegacySkylightSubItem(sub) {
  const fields = sub?.fields || {}
  return fields['Size (L x W)'] != null && fields['Size (L x W)'] !== ''
}

function normalizeSkylightSubItem(sub) {
  return {
    fields: { ...(sub?.fields || {}) },
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
      const sizeParts = parseLegacySkylightSize(sub.fields?.['Size (L x W)'])
      subItems.push({
        fields: {
          ...sizeParts,
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

  if (hasLegacyTopLevel || hasLegacySubs) {
    next.ri14 = {
      ...ri14,
      fields: {},
      subItems: migrateSkylightFields(ri14),
      photos: [],
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
        ...(pj?.damaged ? { Damaged: pj.damaged } : {}),
        ...(pj?.damaged === 'Yes' && pj?.damageDescription ? { _damage: pj.damageDescription } : {}),
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
    return list.map(es => ({
      fields: {
        ...(es?.type ? { Type: es.type } : {}),
        ...(es?.painted ? { Painted: es.painted } : {}),
        ...(es?.damaged ? { Damaged: es.damaged } : {}),
        ...(es?.damaged === 'Yes' && es?.damageDescription ? { _damage: es.damageDescription } : {}),
      },
      photos: [],
    }))
  }

  // Legacy fallback: shared painted/damaged applied per damaged-type.
  const subItems = []
  const sharedPainted = roof.exhaustStackPainted || ''
  const sharedDamaged = roof.exhaustStackDamaged || ''
  const damageTo = roof.exhaustStackDamageTo
  const damageTypes = Array.isArray(damageTo)
    ? damageTo.filter(type => EXHAUST_STACK_TYPES.includes(type))
    : (damageTo && EXHAUST_STACK_TYPES.includes(damageTo) ? [damageTo] : [])

  damageTypes.forEach(type => {
    subItems.push({
      fields: {
        Type: type,
        ...(sharedPainted ? { Painted: sharedPainted } : {}),
        ...(sharedDamaged ? { Damaged: sharedDamaged } : {}),
      },
      photos: [],
    })
  })

  if (!subItems.length && (sharedPainted || sharedDamaged)) {
    subItems.push({
      fields: {
        ...(sharedPainted ? { Painted: sharedPainted } : {}),
        ...(sharedDamaged ? { Damaged: sharedDamaged } : {}),
      },
      photos: [],
    })
  }

  return subItems
}

function buildChimneySubItemsFromParsed(roof = {}) {
  const list = Array.isArray(roof.chimneys) ? roof.chimneys : []
  if (list.length) {
    return list.map(ch => ({
      fields: {
        ...(ch?.size ? { 'Size / Width': normalizeChimneySizeValue(ch.size) } : {}),
        ...(ch?.counterFlashing ? { 'Counter Flashing': ch.counterFlashing } : {}),
        ...(ch?.painted ? { Painted: ch.painted } : {}),
        ...(ch?.damaged ? { Damaged: ch.damaged } : {}),
        ...(ch?.damaged === 'Yes' && ch?.damageDescription ? { _damage: ch.damageDescription } : {}),
      },
      photos: [],
    }))
  }

  // Legacy fallback: single shared chimney profile repeated `chimneyQty` times.
  const size = normalizeChimneySizeValue(roof.chimneySize || '')
  const counterFlashing = roof.counterFlashingCondition || ''
  const painted = roof.chimneyPainted || ''
  const damaged = roof.chimneyDamaged || ''
  const qty = Math.max(0, Number(roof.chimneyQty) || 0)
  const hasData = size || counterFlashing || painted || damaged
  const count = qty > 0 ? qty : (hasData ? 1 : 0)
  const subItems = []

  for (let i = 0; i < count; i += 1) {
    subItems.push({
      fields: {
        ...(size ? { 'Size / Width': size } : {}),
        ...(counterFlashing ? { 'Counter Flashing': counterFlashing } : {}),
        ...(painted ? { Painted: painted } : {}),
        ...(damaged ? { Damaged: damaged } : {}),
      },
      photos: [],
    })
  }

  return subItems
}

const FLASHING_IMPORT_CONFIG = [
  { itemId: 'ri18', listKey: 'stepFlashing', painted: 'stepFlashingPainted', damaged: 'stepFlashingDamaged', present: 'stepFlashingPresent' },
  { itemId: 'ri19', listKey: 'counterFlashing', painted: 'counterFlashingPainted', damaged: 'counterFlashingDamaged', present: 'counterFlashingPresent' },
  { itemId: 'ri20', listKey: 'lFlashing', painted: 'lFlashingPainted', damaged: 'lFlashingDamaged', present: 'lFlashingPresent' },
]

function isPresentValue(value) {
  if (value == null || value === '') return null
  const normalized = String(value).trim().toLowerCase()
  if (['yes', 'true', '1'].includes(normalized)) return true
  if (['no', 'false', '0'].includes(normalized)) return false
  return null
}

function buildFlashingSubItemsFromParsed(roof = {}, config) {
  const list = Array.isArray(roof[config.listKey]) ? roof[config.listKey] : []
  if (list.length) {
    return list.map(fl => ({
      fields: {
        ...(fl?.lengthLF ? { 'Length (LF)': String(fl.lengthLF) } : {}),
        ...(fl?.painted ? { Painted: fl.painted } : {}),
        ...(fl?.damaged ? { Damaged: fl.damaged } : {}),
        ...(fl?.damaged === 'Yes' && fl?.damageDescription ? { _damage: fl.damageDescription } : {}),
      },
      photos: [],
    }))
  }

  // Legacy fallback: single shared flashing run.
  const painted = roof[config.painted] || ''
  const damaged = roof[config.damaged] || ''
  const present = isPresentValue(config.present ? roof[config.present] : null)

  if (present === false) return []

  const hasData = painted || damaged || present === true
  if (!hasData) return []

  return [{
    fields: {
      ...(painted ? { Painted: painted } : {}),
      ...(damaged ? { Damaged: damaged } : {}),
    },
    photos: [],
  }]
}

function buildLowSlopeSubItemsFromParsed(roof = {}) {
  const list = Array.isArray(roof.lowSlope) ? roof.lowSlope : []
  if (list.length) {
    return list.map(ls => ({
      fields: {
        ...(ls?.location ? { Location: ls.location } : {}),
        ...(ls?.grade ? { 'Style / Grade': ls.grade } : {}),
        ...(ls?.exposedRafters ? { 'Exposed Rafters': ls.exposedRafters } : {}),
        ...(ls?.pitch ? { Pitch: normalizeLowSlopePitch(ls.pitch) } : {}),
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
      ...(pitch ? { Pitch: pitch } : {}),
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
      ...(sk?.length ? { 'Length (in)': String(sk.length) } : {}),
      ...(sk?.width ? { 'Width (in)': String(sk.width) } : {}),
      ...(sk?.damaged ? { Damaged: sk.damaged } : {}),
      ...(sk?.damaged === 'Yes' && sk?.damageDescription ? { _damage: sk.damageDescription } : {}),
    },
    photos: [],
  }))
}

function buildCorniceGableSubItemsFromParsed(roof = {}) {
  const list = Array.isArray(roof.corniceGables) ? roof.corniceGables : []
  return list.map(cg => ({
    fields: {
      ...(cg?.type ? { Type: cg.type } : {}),
      ...(cg?.story ? { Story: String(cg.story) } : {}),
      ...(cg?.qty ? { Qty: String(cg.qty) } : {}),
    },
    photos: [],
  }))
}

function buildOtherStructureSubItemsFromParsed(roof = {}) {
  const list = Array.isArray(roof.otherStructures) ? roof.otherStructures : []
  return list.map(os => ({
    fields: {
      ...(os?.type ? { Type: os.type } : {}),
      ...(os?.grade ? { 'Style / Grade': os.grade } : {}),
      ...(os?.pitch ? { Pitch: normalizeLowSlopePitch(os.pitch) } : {}),
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
  const saveTimer = useRef(null)
  const dataRef = useRef(data)
  const activeTabRef = useRef(activeTab)
  const expandedRef = useRef(expandedSections)

  dataRef.current = data
  activeTabRef.current = activeTab
  expandedRef.current = expandedSections

  function persistSnapshot(inspectionData, overrides = {}) {
    return idbSave('current', {
      ...inspectionData,
      activeTab: activeTabRef.current,
      expandedSections: expandedRef.current,
      ...overrides,
    })
  }

  useEffect(() => {
    idbLoad('current').then(saved => {
      if (saved) {
        const jobInfo = normalizeJobInfo({ ...INITIAL_STATE.jobInfo, ...(saved.jobInfo || {}) })
        if (!jobInfo.residenceType) jobInfo.residenceType = 'Primary'
        setData({
          ...INITIAL_STATE,
          ...saved,
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

  function toggleRoofExclude(itemId) {
    setData(prev => {
      const item = prev.roofData[itemId]
      const next = { ...prev, roofData: { ...prev.roofData, [itemId]: { ...item, excluded: !item.excluded } } }
      scheduleSave(next)
      return next
    })
  }

  function updateRoofField(itemId, label, value) {
    setData(prev => {
      const item = prev.roofData[itemId]
      const next = { ...prev, roofData: { ...prev.roofData, [itemId]: { ...item, fields: { ...item.fields, [label]: value } } } }
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
            subItems: [...item.subItems, { fields: {}, photos: [] }],
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
        if (label === 'Damaged' && value === 'No') fields._damage = 'n/a'
        if (label === 'Damaged' && value !== 'Yes' && value !== 'No') delete fields._damage
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

  function importRoofPipeJacks(roof = {}) {
    const subItems = buildPipeJackSubItemsFromParsed(roof)
    if (!subItems.length) return

    setData(prev => {
      const item = prev.roofData.ri11
      const next = {
        ...prev,
        roofData: {
          ...prev.roofData,
          ri11: {
            ...item,
            excluded: false,
            fields: {},
            subItems,
          },
        },
      }
      scheduleSave(next)
      return next
    })
  }

  function importRoofExhaustStacks(roof = {}) {
    const subItems = buildExhaustStackSubItemsFromParsed(roof)
    if (!subItems.length) return

    setData(prev => {
      const item = prev.roofData.ri12
      const next = {
        ...prev,
        roofData: {
          ...prev.roofData,
          ri12: {
            ...item,
            excluded: false,
            fields: {},
            subItems,
          },
        },
      }
      scheduleSave(next)
      return next
    })
  }

  function importRoofChimneys(roof = {}) {
    const subItems = buildChimneySubItemsFromParsed(roof)
    if (!subItems.length) return

    setData(prev => {
      const item = prev.roofData.ri17
      const next = {
        ...prev,
        roofData: {
          ...prev.roofData,
          ri17: {
            ...item,
            excluded: false,
            fields: {},
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
        subItems: buildFlashingSubItemsFromParsed(roof, config),
      }))
      .filter(entry => entry.subItems.length)

    if (!updates.length) return

    setData(prev => {
      let roofData = { ...prev.roofData }
      for (const { itemId, subItems } of updates) {
        roofData = {
          ...roofData,
          [itemId]: {
            ...roofData[itemId],
            excluded: false,
            fields: {},
            subItems,
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
            ...item,
            excluded: false,
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
            ...item,
            excluded: false,
            fields: {},
            subItems,
          },
        },
      }
      scheduleSave(next)
      return next
    })
  }

  function importRoofCorniceGables(roof = {}) {
    const subItems = buildCorniceGableSubItemsFromParsed(roof)
    if (!subItems.length) return

    setData(prev => {
      const item = prev.roofData.ri21
      const next = {
        ...prev,
        roofData: {
          ...prev.roofData,
          ri21: {
            ...item,
            excluded: false,
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
            ...item,
            excluded: false,
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
      const next = { ...prev, elevData: { ...prev.elevData, [cellKey]: { ...cell, fields: { ...cell.fields, [label]: value } } } }
      scheduleSave(next)
      return next
    })
  }

  function addElevPhoto(cellKey, dataUrl) {
    setData(prev => {
      const cell = prev.elevData[cellKey]
      const next = { ...prev, elevData: { ...prev.elevData, [cellKey]: { ...cell, photos: [...cell.photos, dataUrl] } } }
      scheduleSave(next)
      return next
    })
  }

  function removeElevPhoto(cellKey, index) {
    setData(prev => {
      const cell = prev.elevData[cellKey]
      const next = { ...prev, elevData: { ...prev.elevData, [cellKey]: { ...cell, photos: cell.photos.filter((_, i) => i !== index) } } }
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
          story: '', ceilingDamage: '', ceilingNotes: '',
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
        roofData.ri0 = { ...ri0, fields: { ...ri0.fields, 'Predominant Pitch': parsed.pitch } }
      }

      if (parsed.valleyPresent) {
        const ri5 = roofData.ri5
        roofData.ri5 = { ...ri5, excluded: false }
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

  function loadInspection(saved) {
    const jobInfo = normalizeJobInfo({ ...INITIAL_STATE.jobInfo, ...(saved.jobInfo || {}) })
    if (!jobInfo.residenceType) jobInfo.residenceType = 'Primary'
    const next = {
      ...INITIAL_STATE,
      ...saved,
      jobInfo,
      roofData: normalizeRoofData({ ...INITIAL_ROOF_DATA, ...(saved.roofData || {}) }),
      elevData: normalizeElevData({ ...INITIAL_ELEV_DATA, ...(saved.elevData || {}) }),
      interiorData: saved.interiorData || INITIAL_INTERIOR_DATA,
      exteriorData: normalizeExteriorData({ ...INITIAL_EXTERIOR_DATA, ...(saved.exteriorData || {}) }),
      notesData: { ...INITIAL_NOTES_DATA, ...(saved.notesData || {}) },
    }
    setData(next)
    setActiveTabState(0)
    if (saved.expandedSections && typeof saved.expandedSections === 'object') {
      setExpandedSectionsState(saved.expandedSections)
      expandedRef.current = saved.expandedSections
    }
    persistSnapshot(next, { activeTab: 0 })
    setSaveStatus('saved')
    setDriveSaveStatus('saved')
  }

  function resetAll() {
    if (!confirm('Reset all data? This cannot be undone.')) return
    setData(INITIAL_STATE)
    setActiveTabState(0)
    setExpandedSectionsState({})
    expandedRef.current = {}
    persistSnapshot(INITIAL_STATE, { activeTab: 0, expandedSections: {} })
    setSaveStatus('saved')
    setDriveSaveStatus('unsaved')
  }

  function startNewInspection() {
    setData(INITIAL_STATE)
    setActiveTabState(0)
    setExpandedSectionsState({})
    expandedRef.current = {}
    persistSnapshot(INITIAL_STATE, { activeTab: 0, expandedSections: {} })
    setSaveStatus('saved')
    setDriveSaveStatus('unsaved')
  }

  const completion = calculateCompletion(data)

  return (
    <InspectionContext.Provider value={{
      data, activeTab, setActiveTab,
      expandedSections, setSectionExpanded,
      saveStatus, driveSaveStatus, setDriveSaveStatus, completion, updateJobInfo, manualSave, resetAll, startNewInspection, loadInspection, applyXmlImport,
      toggleRoofExclude, updateRoofField,
      addRoofSubItem, removeRoofSubItem, updateRoofSubField, importRoofPipeJacks, importRoofExhaustStacks, importRoofChimneys, importRoofFlashingItems, importRoofLowSlopeItems,
      importRoofSkylights, importRoofCorniceGables, importRoofOtherStructures,
      addRoofPhoto, removeRoofPhoto,
      toggleElevExclude, updateElevField,
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
