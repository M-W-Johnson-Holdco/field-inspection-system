import { isLinearMeasurementField } from './measurement'
import { ROOF_ITEMS } from '../data/roofItems'

export function isFieldVisible(field, values = {}) {
  if (!field.showWhen) return true
  const actual = values[field.showWhen.field]
  const expected = field.showWhen.equals
  if (typeof actual === 'string' && actual.startsWith(`${expected} - `)) return true
  return actual === expected
}

export function visibleFieldsForValues(fields = [], values = {}) {
  return fields.filter(field => isFieldVisible(field, values))
}

function optionColumnStyle(maxSelectCh) {
  if (!maxSelectCh) return undefined
  return {
    '--grid-select-option-ch': String(maxSelectCh),
    '--grid-col-min': `max(8.5rem, calc(${maxSelectCh} * 0.62rem + 2.85rem))`,
  }
}

function isEdgeFlashingFieldsPattern(fields) {
  return fields.length === 4
    && isOptionSelectField(fields[0]) && fields[0].l === 'Type'
    && isOptionSelectField(fields[1]) && fields[1].l === 'Material'
    && fields[2].t === 'yn' && fields[2].l === 'Painted'
    && fields[3].t === 'yn' && fields[3].l === 'Damaged'
}

function isFlashingSubFieldsPattern(fields) {
  return fields.length === 3
    && isLinearMeasurementField(fields[0])
    && fields[0].l === 'Length (LF)'
    && fields[1].t === 'yn' && fields[1].l === 'Painted'
    && fields[2].t === 'yn' && fields[2].l === 'Damaged'
}

function isChimneySubFieldsPattern(fields) {
  return fields.length === 4
    && fields[0].t === 'select' && fields[0].l === 'Size / Width'
    && isOptionSelectField(fields[1]) && fields[1].l === 'Counter Flashing'
    && fields[2].t === 'yn' && fields[2].l === 'Painted'
    && fields[3].t === 'yn' && fields[3].l === 'Damaged'
}

function isExhaustStackSubFieldsPattern(fields) {
  return fields.length >= 3
    && fields[0].t === 'select' && fields[0].l === 'Type'
    && fields[1].t === 'yn' && fields[1].l === 'Painted'
    && fields[2].t === 'yn' && fields[2].l === 'Damaged'
}

function isSkylightSubFieldsPattern(fields) {
  return fields.length === 4
    && fields[0].t === 'select' && fields[0].l === 'Style'
    && fields[1].t === 'select' && fields[1].l === 'Mount'
    && fields[2].t === 'lwxw'
    && fields[3].t === 'yn' && fields[3].l === 'Damaged'
}

function isDualYnPairPattern(fields) {
  return fields.length === 2 && fields[0].t === 'yn' && fields[1].t === 'yn'
}

function isPipeJackSubFieldsPattern(fields) {
  return fields.length >= 3
    && fields[0].t === 'select' && fields[0].l === 'Size (inches)'
    && isOptionSelectField(fields[1]) && fields[1].l === 'Type'
    && fields[2].t === 'yn' && fields[2].l === 'Painted'
}

function isLengthTypePaintedPattern(fields) {
  return fields.length === 3
    && isLinearMeasurementField(fields[0])
    && (fields[1].t === 'radio' || fields[1].t === 'select')
    && fields[2].t === 'yn'
}

export function shouldStackUnderPrevious(previousField, currentField, fields, index) {
  if (!previousField || !currentField) return false
  if (currentField.t !== 'yn') return false
  if (previousField.t !== 'radio' && previousField.t !== 'select') return false

  const prevPrev = index > 0 ? fields[index - 1] : null
  if (prevPrev && (prevPrev.t === 'radio' || prevPrev.t === 'select')) {
    // Type + Material + Painted → Painted on its own row (left), not under Material
    return false
  }

  if (index === 0 && fields.length === 2) {
    // Material + Painted (only two fields) → stack to save vertical space
    return true
  }

  // Qty + Material + Painted → Painted on its own row (left), not under Material
  return false
}

function isShingleStyleFieldsPattern(fields) {
  return fields.length === 4
    && fields[0].t === 'multiRadio' && fields[0].l === 'Style'
    && fields[1].t === 'num' && fields[1].l === 'Stories'
    && fields[2].t === 'num' && fields[2].l === 'Layers'
    && fields[3].t === 'pitch'
}

export function groupFieldsForGrid(fields) {
  if (isEdgeFlashingFieldsPattern(fields)) {
    return [
      {
        type: 'row',
        pairRow: true,
        groups: [
          { type: 'single', field: fields[0] },
          { type: 'single', field: fields[1] },
        ],
      },
      {
        type: 'row',
        ynPairRow: true,
        groups: [
          { type: 'single', field: fields[2] },
          { type: 'single', field: fields[3] },
        ],
      },
    ]
  }

  if (isShingleStyleFieldsPattern(fields)) {
    return [
      { type: 'single', field: fields[0] },
      {
        type: 'row',
        qtyRow: true,
        groups: [
          { type: 'single', field: fields[1] },
          { type: 'single', field: fields[2] },
        ],
      },
      { type: 'single', field: fields[3] },
    ]
  }

  if (isLengthTypePaintedPattern(fields)) {
    return [
      { type: 'single', field: fields[1] },
      { type: 'single', field: fields[2] },
      { type: 'single', field: fields[0] },
    ]
  }

  if (isSkylightSubFieldsPattern(fields)) {
    return [
      {
        type: 'row',
        pairRow: true,
        pairRowCompact: true,
        groups: [
          { type: 'single', field: fields[0] },
          { type: 'single', field: fields[1] },
        ],
      },
      { type: 'single', field: fields[2] },
      { type: 'single', field: fields[3] },
    ]
  }

  if (isDualYnPairPattern(fields)) {
    return [{
      type: 'row',
      ynPairRow: true,
      groups: [
        { type: 'single', field: fields[0] },
        { type: 'single', field: fields[1] },
      ],
    }]
  }

  if (isFlashingSubFieldsPattern(fields)) {
    return [
      { type: 'single', field: fields[0] },
      {
        type: 'row',
        ynPairRow: true,
        groups: [
          { type: 'single', field: fields[1] },
          { type: 'single', field: fields[2] },
        ],
      },
    ]
  }

  if (isChimneySubFieldsPattern(fields)) {
    return [
      { type: 'single', field: fields[0] },
      { type: 'single', field: fields[1] },
      {
        type: 'row',
        ynPairRow: true,
        groups: [
          { type: 'single', field: fields[2] },
          { type: 'single', field: fields[3] },
        ],
      },
    ]
  }

  if (isExhaustStackSubFieldsPattern(fields)) {
    const ynFields = fields.slice(1).filter(field => field.t === 'yn')
    const groups = [{ type: 'single', field: fields[0] }]

    if (ynFields.length > 1) {
      groups.push({
        type: 'row',
        ynPairRow: true,
        groups: ynFields.map(field => ({ type: 'single', field })),
      })
    } else if (ynFields.length === 1) {
      groups.push({ type: 'single', field: ynFields[0] })
    }

    return groups
  }

  if (isPipeJackSubFieldsPattern(fields)) {
    const groups = [
      {
        type: 'row',
        pairRowSizeType: true,
        groups: [
          { type: 'single', field: fields[0] },
          { type: 'single', field: fields[1] },
        ],
      },
    ]

    const ynFields = fields.slice(2).filter(field => field.t === 'yn')
    if (ynFields.length > 1) {
      groups.push({
        type: 'row',
        ynPairRow: true,
        groups: ynFields.map(field => ({ type: 'single', field })),
      })
    } else if (ynFields.length === 1) {
      groups.push({ type: 'single', field: ynFields[0] })
    }

    return groups
  }

  const groups = []
  let i = 0

  while (i < fields.length) {
    const field = fields[i]
    const next = fields[i + 1]

    if (
      field.t === 'yn' && field.l === 'Painted'
      && next?.t === 'yn' && next.l === 'Damaged'
    ) {
      groups.push({
        type: 'row',
        ynPairRow: true,
        groups: [
          { type: 'single', field },
          { type: 'single', field: next },
        ],
      })
      i += 2
      continue
    }

    if (next && shouldStackUnderPrevious(field, next, fields, i)) {
      groups.push({ type: 'stack', fields: [field, next] })
      i += 2
      continue
    }

    groups.push({ type: 'single', field })
    i += 1
  }

  return groups
}

export function isOptionSelectField(field) {
  return field.t === 'radio' || field.t === 'select'
}

export function longestOptionLength(field) {
  if (!isOptionSelectField(field)) return 0
  return Math.max('Select'.length, ...(field.o || []).map(opt => String(opt).length))
}

export function fieldsGridStyle(fields = []) {
  let maxSelectCh = 0
  for (const field of fields) {
    maxSelectCh = Math.max(maxSelectCh, longestOptionLength(field))
  }
  return optionColumnStyle(maxSelectCh)
}

export function materialOptionColumnStyle() {
  let maxSelectCh = 0
  for (const item of ROOF_ITEMS) {
    for (const field of [...(item.fields || []), ...(item.subFields || [])]) {
      if (field.l === 'Material' && isOptionSelectField(field)) {
        maxSelectCh = Math.max(maxSelectCh, longestOptionLength(field))
      }
    }
  }
  return optionColumnStyle(maxSelectCh)
}

export function clusterGroupsForGrid(groups) {
  const clustered = []
  let optionBuffer = []

  function flushOptions() {
    if (!optionBuffer.length) return
    if (optionBuffer.length === 1) {
      clustered.push(optionBuffer[0])
    } else {
      clustered.push({ type: 'row', pairRow: true, groups: [...optionBuffer] })
    }
    optionBuffer = []
  }

  for (const group of groups) {
    if (group.type === 'single' && isOptionSelectField(group.field)) {
      optionBuffer.push(group)
      if (optionBuffer.length === 2) flushOptions()
      continue
    }

    flushOptions()
    clustered.push(group)
  }

  flushOptions()
  return clustered
}

function compactSelectClass(field) {
  return field.t === 'yn'
    ? 'field-select compact-select compact-select--yn'
    : 'field-select compact-select'
}

export function fieldSelectClass(field) {
  if (field.t === 'yn' || field.t === 'radio') return compactSelectClass(field)
  return 'field-select'
}

/** Yes/No options; Damaged and Painted fields also include N/A. */
export function ynOptionsForField(field) {
  const label = String(field?.l || '')
  if (label === 'Damaged' || label === 'Painted' || /damage/i.test(label)) {
    return ['Yes', 'No', 'N/A']
  }
  return ['Yes', 'No']
}

export function isSelectPlaceholder(value) {
  if (value == null) return true
  const normalized = String(value).trim()
  return normalized === '' || normalized === 'Select' || normalized === 'Select...' || normalized === 'Select…'
}

export function withSelectPlaceholderClass(className, value) {
  return isSelectPlaceholder(value) ? `${className} field-select--placeholder`.trim() : className
}
