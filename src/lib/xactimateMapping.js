import { isRoofItemActive } from '../utils/roofItemStatus'
import { fenceTotalLf } from '../utils/fenceLength'

// Maps inspection field data to Xactimate-style trade/category line items so the
// export can be pasted or transcribed into an estimate with minimal rework.
// Each entry corresponds to a ROOF_ITEMS / ELEV_ITEMS / EXTERIOR_ITEMS id (elevation
// entries are looked up without the trailing "_<Direction>").

function yn(fields, label) {
  return fields?.[label] === 'Yes'
}

function num(fields, label) {
  const v = fields?.[label]
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function str(fields, label) {
  const v = fields?.[label]
  return v == null || v === '' || v === 'Select' ? null : String(v)
}

function exhaustStackNote(fields, parentFields) {
  const notes = []
  const damagedOrder = ['Cap', 'Stack', 'Flange']
  const damaged = damagedOrder.filter(part =>
    Array.isArray(fields?.Damaged) && fields.Damaged.includes(part),
  )
  if (damaged.length) notes.push(`Damaged: ${damaged.join(', ')}`)
  if (yn(parentFields, 'Painted') || yn(fields, 'Painted')) notes.push('Painted')
  return notes.join('; ') || null
}

// ---- Roof (RFG) --------------------------------------------------------

export const ROOF_LINE_ITEMS = {
  ri0: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: (() => {
      const styles = Array.isArray(fields?.Style)
        ? fields.Style
        : (fields?.Style ? [String(fields.Style)] : [])
      const styleLabel = styles.join('/') || 'unspecified style'
      const gauge = styles.includes('Metal') ? str(fields, 'Metal Gauge') : null
      return gauge
        ? `Comp. shingle - ${styleLabel} (${gauge})`
        : `Comp. shingle - ${styleLabel}`
    })(),
    unit: 'SQ', qty: null,
    damaged: null,
    note: `${num(fields, 'Stories') ?? '?'} stories, ${num(fields, 'Layers') ?? '?'} layer(s), predominant pitch ${str(fields, 'Predominant Pitch (x/12)') || str(fields, 'Predominant Pitch') || '?'}`,
  }],
  ri1: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: (() => {
      const types = Array.isArray(fields?.Type)
        ? fields.Type
        : (fields?.Type ? [String(fields.Type)] : [])
      const typeLabel = types.join('/') || 'Edge flashing'
      return `${typeLabel} - ${str(fields, 'Material') || ''}`.trim()
    })(),
    unit: 'LF', qty: null,
    damaged: yn(fields, 'Damaged'),
    note: yn(fields, 'Painted') ? 'Painted' : null,
  }],
  ri2: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: `Roofing felt / underlayment - ${str(fields, 'Grade') || 'unspecified'}`,
    unit: 'SQ', qty: null,
    damaged: null,
    note: num(fields, 'Layers') ? `${num(fields, 'Layers')} layer(s)` : null,
  }],
  ri3: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: `Ridge cap - ${str(fields, 'Grade') || 'unspecified'}`,
    unit: 'LF', qty: null,
    damaged: null,
    note: num(fields, 'Exposure (inches)') ? `${num(fields, 'Exposure (inches)')}" exposure` : null,
  }],
  ri4: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: `Starter course - ${str(fields, 'Style') || 'unspecified'}`,
    unit: 'LF', qty: null, damaged: null, note: null,
  }],
  ri5: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: (() => {
      const grades = Array.isArray(fields?.Grade)
        ? fields.Grade
        : (fields?.Grade ? [String(fields.Grade)] : (
            Array.isArray(fields?.Material)
              ? fields.Material
              : (fields?.Material ? [String(fields.Material)] : [])
          ))
      const gradeLabel = grades.join('/') || 'unspecified'
      const details = []
      if (grades.includes('Ice & Water')) {
        const choose = str(fields, 'Choose Ice & Water Style')
        if (choose) details.push(choose)
      }
      if (grades.includes('Valley Metal')) {
        const choose = str(fields, 'Choose Valley Metal Style')
        if (choose) details.push(choose)
      }
      if (grades.includes('N/A')) {
        const choose = str(fields, 'Choose N/A Style')
        if (choose) details.push(choose)
      }
      if (grades.includes('W-Valley')) {
        const choose = str(fields, 'Choose W-Valley Style')
        if (choose) details.push(choose)
        if (yn(fields, 'W-Valley Painted')) details.push('Painted')
      }
      return details.length
        ? `Valley - ${gradeLabel} (${details.join('; ')})`
        : `Valley - ${gradeLabel}`
    })(),
    unit: 'LF', qty: null, damaged: null, note: null,
  }],
  ri24: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: 'Solar panel - remove & reset',
    unit: 'EA', qty: num(fields, 'Qty'),
    damaged: yn(fields, 'Damaged'), note: null,
  }],
  ri30: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: `Wind vane${str(fields, 'Material') ? ` - ${str(fields, 'Material')}` : ''}`,
    unit: 'EA', qty: num(fields, 'Qty'),
    damaged: yn(fields, 'Damaged'),
    note: [
      yn(fields, 'Painted') ? 'Painted' : null,
      fields?.DnR && fields.DnR !== 'Select' ? `DnR: ${fields.DnR}` : null,
    ].filter(Boolean).join('; ') || null,
  }],
  ri31: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: 'Cupola',
    unit: 'EA', qty: num(fields, 'Qty'),
    damaged: yn(fields, 'Damaged'),
    note: [
      fields?.DnR && fields.DnR !== 'Select' ? `DnR: ${fields.DnR}` : null,
      fields?._notes || null,
      fields?._damage && fields._damage !== 'n/a' ? fields._damage : null,
    ].filter(Boolean).join('; ') || null,
  }],
  ri32: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: `Turret${str(fields, 'Grade') ? ` - ${str(fields, 'Grade')}` : ''}`,
    unit: 'EA', qty: num(fields, 'Qty'),
    damaged: null,
    note: [
      fields?.['Turret Cap Existing'] && fields['Turret Cap Existing'] !== 'Select'
        ? `Cap existing: ${fields['Turret Cap Existing']}`
        : null,
      fields?.['Turret Cap Existing'] === 'Yes' && str(fields, 'Cap Grade')
        ? `Cap grade: ${str(fields, 'Cap Grade')}`
        : null,
      fields?.['Turret Cap Existing'] === 'Yes' && yn(fields, 'Painted')
        ? 'Cap painted'
        : null,
      fields?._notes || null,
    ].filter(Boolean).join('; ') || null,
  }],
  ri6: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: `Ridge vent - ${str(fields, 'Type') || 'unspecified'} style`,
    unit: 'LF', qty: num(fields, 'Length (LF)'),
    damaged: yn(fields, 'Damaged'), note: yn(fields, 'Painted') ? 'Painted' : null,
  }],
  ri7: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: `Box vent - ${str(fields, 'Material') || 'unspecified'}`,
    unit: 'EA', qty: num(fields, 'Qty'),
    damaged: yn(fields, 'Damaged'), note: yn(fields, 'Painted') ? 'Painted' : null,
  }],
  ri8: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: 'Turbine vent',
    unit: 'EA', qty: num(fields, 'Qty'),
    damaged: yn(fields, 'Damaged'), note: yn(fields, 'Painted') ? 'Painted' : null,
  }],
  ri9: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: `Power vent - ${str(fields, 'Material') || 'unspecified'}`,
    unit: 'EA', qty: num(fields, 'Qty'),
    damaged: yn(fields, 'Damaged'), note: yn(fields, 'Painted') ? 'Painted' : null,
  }],
  ri10: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: 'Solar-powered vent',
    unit: 'EA', qty: num(fields, 'Qty'),
    damaged: yn(fields, 'Damaged'), note: yn(fields, 'Painted') ? 'Painted' : null,
  }],
  ri25: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: 'Off-ridge vent',
    unit: 'EA', qty: num(fields, 'Qty'),
    damaged: yn(fields, 'Damaged'), note: yn(fields, 'Painted') ? 'Painted' : null,
  }],
  ri26: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: 'Dome vent',
    unit: 'EA', qty: num(fields, 'Qty'),
    damaged: yn(fields, 'Damaged'), note: yn(fields, 'Painted') ? 'Painted' : null,
  }],
  ri27: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: 'Rooftop intake vent',
    unit: 'EA', qty: num(fields, 'Qty'),
    damaged: yn(fields, 'Damaged'), note: yn(fields, 'Painted') ? 'Painted' : null,
  }],
  ri13: (fields) => {
    const lines = []
    const existingCount = num(fields, 'Existing Kickouts Count')
    if (yn(fields, 'Existing') && existingCount != null) {
      lines.push({
        trade: 'Roofing', category: 'RFG',
        description: 'Kickout flashing - existing',
        unit: 'EA', qty: existingCount, damaged: null,
        note: yn(fields, 'Painted') ? 'Painted' : null,
      })
    }
    if (yn(fields, 'Needed')) {
      lines.push({
        trade: 'Roofing', category: 'RFG',
        description: 'Kickout flashing - install (missing)',
        unit: 'EA', qty: null, damaged: true,
        note: 'Not currently present; recommend at time of install to prevent siding damage',
      })
    }
    return lines
  },
  ri16: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: 'Power meter mast - reset',
    unit: 'EA', qty: num(fields, 'Qty'), damaged: null, note: null,
  }],
  ri29: (fields) => {
    const damagedParts = Array.isArray(fields?.Damaged) ? fields.Damaged : []
    return [{
      trade: 'Roofing', category: 'RFG',
      description: [
        'Chimney cover',
        str(fields, 'Type'),
        str(fields, 'Grade'),
      ].filter(Boolean).join(' - '),
      unit: 'EA',
      qty: 1,
      damaged: damagedParts.length > 0,
      note: [
        fields?.Flue && fields.Flue !== 'Select' ? `Flue: ${fields.Flue}` : null,
        str(fields, 'Condition'),
        yn(fields, 'Painted') ? 'Painted' : null,
        damagedParts.length ? `Damaged: ${damagedParts.join(', ')}` : null,
        fields?._damage && fields._damage !== 'n/a' ? fields._damage : null,
      ].filter(Boolean).join('; ') || null,
    }]
  },
  ri18: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: `Step flashing${str(fields, 'Material') ? ` - ${str(fields, 'Material')}` : ''}`,
    unit: 'EA', qty: null, damaged: yn(fields, 'Damaged'), note: yn(fields, 'Painted') ? 'Painted' : null,
  }],
  ri19: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: `Counter flashing${str(fields, 'Material') ? ` - ${str(fields, 'Material')}` : ''}`,
    unit: 'EA', qty: null, damaged: yn(fields, 'Damaged'), note: yn(fields, 'Painted') ? 'Painted' : null,
  }],
  ri20: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: `L flashing${str(fields, 'Material') ? ` - ${str(fields, 'Material')}` : ''}`,
    unit: 'EA', qty: null, damaged: yn(fields, 'Damaged'), note: yn(fields, 'Painted') ? 'Painted' : null,
  }],
  ri21: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: `Cornice return - ${str(fields, 'Material') || 'unspecified'}`,
    unit: 'EA', qty: num(fields, 'Qty') ?? 1, damaged: yn(fields, 'Damaged'),
    note: [
      (fields?.Stories || fields?.Story) ? `${fields.Stories || fields.Story} stories` : null,
      yn(fields, 'Painted') ? 'Painted' : null,
    ].filter(Boolean).join('; ') || null,
  }],
  ri28: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: `Cornice strip - ${str(fields, 'Material') || 'unspecified'}`,
    unit: 'LF', qty: num(fields, 'Length (LF)'), damaged: yn(fields, 'Damaged'),
    note: [
      (fields?.Stories || fields?.Story) ? `${fields.Stories || fields.Story} stories` : null,
      yn(fields, 'Painted') ? 'Painted' : null,
    ].filter(Boolean).join('; ') || null,
  }],
}

// Sub-item (addMore) roof items -> one line item per sub-item.
export const ROOF_SUBITEM_LINE_ITEMS = {
  ri11: (f) => ({
    trade: 'Roofing', category: 'RFG',
    description: `Pipe jack - ${str(f, 'Type') || 'unspecified'} (${str(f, 'Size (inches)') || '?'}")`,
    unit: 'EA', qty: 1, damaged: null, note: yn(f, 'Painted') ? 'Painted' : null,
  }),
  ri12: (f, parentFields) => ({
    trade: 'Roofing', category: 'RFG',
    description: `Exhaust stack - ${str(f, 'Size') || 'unspecified size'}`,
    unit: 'EA',
    qty: 1,
    damaged: Array.isArray(f?.Damaged) && f.Damaged.length > 0,
    note: exhaustStackNote(f, parentFields),
  }),
  ri14: (f) => {
    const style = str(f, 'Style')
    if (style === 'Tubular') {
      const diameter = num(f, 'Diameter (in)')
      const storedCirc = num(f, 'Circumference (in)')
      const circumference = storedCirc != null
        ? storedCirc
        : (diameter != null ? Math.round(Math.PI * diameter * 10) / 10 : null)
      const radiusIn = diameter != null ? diameter / 2 : null
      const area = radiusIn != null ? Math.round(((Math.PI * radiusIn * radiusIn) / 144) * 10) / 10 : null
      let sizeLabel = null
      if (area != null) {
        sizeLabel = area <= 16 ? 'Large (≤16 ft²)' : 'X-Large (17+ ft²)'
      }
      return {
        trade: 'Roofing', category: 'RFG',
        description: `Skylight - Tubular (${str(f, 'Mount') || '?'})`,
        unit: 'EA', qty: 1, damaged: yn(f, 'Damaged'),
        note: [
          diameter != null ? `Diameter ${diameter}"` : null,
          circumference != null ? `Circumference ${circumference}"` : null,
          sizeLabel,
          area != null ? `${area} ft²` : null,
        ].filter(Boolean).join('; ') || null,
      }
    }

    const length = num(f, 'Length (ft)')
    const width = num(f, 'Width (ft)')
    const area = length != null && width != null ? length * width : null
    let sizeLabel = null
    let areaNote = null
    if (area != null) {
      areaNote = `${Number.isInteger(area) ? area : Math.round(area * 10) / 10} ft²`
      sizeLabel = area <= 16 ? 'Large (≤16 ft²)' : 'X-Large (17+ ft²)'
    }
    return {
      trade: 'Roofing', category: 'RFG',
      description: `Skylight - ${style || 'unspecified'} (${str(f, 'Mount') || '?'})`,
      unit: 'EA', qty: 1, damaged: yn(f, 'Damaged'),
      note: [sizeLabel, areaNote].filter(Boolean).join('; ') || null,
    }
  },
  ri15: (f, parentFields) => ({
    trade: 'Roofing', category: 'RFG',
    description: 'Rain diverter',
    unit: 'LF',
    qty: num(f, 'Length (LF)'),
    damaged: null,
    note: yn(parentFields, 'Painted') ? 'Painted' : null,
  }),
  ri17: (f, parentFields) => ({
    trade: 'Roofing', category: 'RFG',
    description: `Chimney flashing - ${str(f, 'Size / Width') || 'unspecified size'}${str(f, 'Material') ? ` - ${str(f, 'Material')}` : ''}`,
    unit: 'EA', qty: 1, damaged: yn(f, 'Damaged'),
    note: [
      `Counter flashing: ${str(f, 'Counter Flashing') || '?'}`,
      str(f, 'Cricket Present') ? `Cricket: ${str(f, 'Cricket Present')}` : null,
      yn(parentFields, 'Painted') || yn(f, 'Painted') ? 'painted' : null,
    ].filter(Boolean).join(', '),
  }),
  ri22: (f) => ({
    trade: 'Roofing', category: 'RFG',
    description: `Low slope roofing - ${str(f, 'Location') || 'unspecified'} (${str(f, 'Style / Grade') || 'unspecified'})`,
    unit: 'SQ', qty: null, damaged: yn(f, 'Damaged'),
    note: [
      yn(f, 'Exposed Rafters') ? 'Exposed rafters' : null,
      f?.['Edgemetal Existing?'] === 'Yes' ? [
        'Edgemetal',
        num(f, 'Edgemetal Width (Inches)') != null ? `${num(f, 'Edgemetal Width (Inches)')}"` : null,
        str(f, 'Edgemetal Material') || str(f, 'Material'),
        yn(f, 'Edgemetal Painted') || yn(f, 'Painted') ? 'painted' : null,
      ].filter(Boolean).join(' ') : null,
    ].filter(Boolean).join('; ') || null,
  }),
  ri23: (f) => ({
    trade: 'Roofing', category: 'RFG',
    description: `Other structure - ${str(f, 'Type') || 'unspecified'} (${str(f, 'Style / Grade') || 'unspecified'})`,
    unit: 'SQ', qty: null, damaged: yn(f, 'Damaged'), note: null,
  }),
}

// ---- Elevations (SDG / GTR / FCA / DOR) --------------------------------

export const ELEV_LINE_ITEMS = {
  ev0: (fields, dir) => {
    const style = str(fields, 'Style') || 'unspecified'
    const styleLabel = style.startsWith('Other') ? (style === 'Other' ? 'Other' : style) : style
    const grade = str(fields, 'Grade')
    const exposure = num(fields, 'Exposure (Inches)')
    const parts = [
      styleLabel,
      grade || null,
      exposure != null ? `${exposure}" exposure` : null,
    ].filter(Boolean)
    return [{
      trade: 'Siding', category: 'SDG',
      description: `Siding - ${parts.join(', ')}`,
      unit: 'SF', qty: null, damaged: yn(fields, 'Damaged'), note: `${dir} elevation`,
    }]
  },
  ev1: (fields, dir) => [{
    trade: 'Siding', category: 'FCA',
    description: `Fascia - ${str(fields, 'Material') || 'unspecified'}${num(fields, 'Width (Inches)') != null ? `, ${num(fields, 'Width (Inches)')}"` : ''}`,
    unit: 'LF', qty: null, damaged: yn(fields, 'Damaged'),
    note: [
      `${dir} elevation`,
      yn(fields, 'Painted') ? 'Painted' : null,
    ].filter(Boolean).join('; '),
  }],
  ev3: (fields, dir, parentFields = {}) => [{
    trade: 'Gutters', category: 'GTR',
    description: `Gutter - ${str(parentFields, 'Style') || str(fields, 'Style') || 'unspecified style'}, ${str(parentFields, 'Material') || str(fields, 'Material') || 'unspecified'}, ${str(parentFields, 'Size (Inches)') || str(fields, 'Size (Inches)') || 'unspecified size'}`,
    unit: 'LF', qty: num(fields, 'Length (LF)'), damaged: yn(fields, 'Damaged'),
    note: [
      `${dir} elevation`,
      yn(parentFields, 'Painted') || yn(fields, 'Painted') ? 'Painted' : null,
    ].filter(Boolean).join('; '),
  }],
  ev11: (fields, dir, parentFields = {}) => {
    if (str(parentFields, 'Style') === 'None' || str(fields, 'Style') === 'None') return []
    return [{
      trade: 'Gutters', category: 'GTR',
      description: `Gutter guard - ${str(parentFields, 'Style') || str(fields, 'Style') || 'unspecified style'}, ${str(parentFields, 'Material') || str(fields, 'Material') || 'unspecified'}`,
      unit: 'LF', qty: num(fields, 'Length (LF)') ?? num(fields, 'Qty'),
      damaged: yn(fields, 'Damaged'),
      note: `${dir} elevation`,
    }]
  },
  ev4: (fields, dir, parentFields = {}) => [{
    trade: 'Gutters', category: 'GTR',
    description: `Downspout - ${str(parentFields, 'Style') || str(fields, 'Style') || 'unspecified style'}, ${str(parentFields, 'Width') || str(fields, 'Width') || 'unspecified width'}, ${str(parentFields, 'Material') || str(fields, 'Material') || 'unspecified'}`,
    unit: 'LF', qty: num(fields, 'Length (LF)') ?? num(fields, 'Qty'),
    damaged: yn(fields, 'Damaged'),
    note: [
      `${dir} elevation`,
      yn(parentFields, 'Painted') || yn(fields, 'Painted') ? 'Painted' : null,
    ].filter(Boolean).join('; '),
  }],
  ev12: (fields, dir, parentFields = {}) => {
    const length = num(fields, 'Length (ft)')
    const width = num(fields, 'Width (ft)')
    const area = length != null && width != null ? length * width : null
    let sizeLabel = null
    if (area != null) {
      if (area <= 11) sizeLabel = 'Small (≤11 ft²)'
      else if (area < 20) sizeLabel = 'Medium (12–19 ft²)'
      else sizeLabel = 'Large (20+ ft²)'
    }
    const grade = str(fields, 'Grade') || str(parentFields, 'Grade') || 'unspecified'
    const type = str(fields, 'Type') || str(parentFields, 'Type') || 'unspecified type'
    const glaze = str(fields, 'Glaze') || str(parentFields, 'Glaze') || '?'
    const painted = yn(fields, 'Painted') || yn(parentFields, 'Painted')
    const baseNote = [
      `${dir} elevation`,
      painted ? 'Painted' : null,
      area != null ? `${Number.isInteger(area) ? area : area.toFixed(1)} ft²` : null,
    ].filter(Boolean).join('; ')
    return [{
      trade: 'Siding', category: 'WDW',
      description: [
        'Window',
        grade,
        type,
        `${glaze} glaze`,
        sizeLabel,
      ].filter(Boolean).join(' - '),
      unit: 'EA',
      qty: 1,
      damaged: yn(fields, 'Damaged'),
      note: baseNote || null,
    }]
  },
  ev5: (fields, dir, parentFields = {}) => {
    const length = num(fields, 'Length (ft)')
    const width = num(fields, 'Width (ft)')
    const area = length != null && width != null ? length * width : null
    let sizeLabel = null
    if (area != null) {
      if (area <= 9) sizeLabel = 'Small (1–9 ft²)'
      else if (area <= 16) sizeLabel = 'Medium (10–16 ft²)'
      else if (area <= 25) sizeLabel = 'Large (17–25 ft²)'
      else sizeLabel = 'X-Large (26–32+ ft²)'
    }
    const type = str(fields, 'Type') || str(parentFields, 'Type') || 'unspecified'
    const grade = type === 'Solar'
      ? (str(fields, 'Grade') || str(parentFields, 'Grade'))
      : null
    const desc = [
      'Window screen',
      type,
      grade || null,
      sizeLabel,
    ].filter(Boolean).join(' - ')
    const baseNote = [
      `${dir} elevation`,
      area != null ? `${Number.isInteger(area) ? area : area.toFixed(1)} ft²` : null,
    ].filter(Boolean).join('; ')
    return [{
      trade: 'Siding', category: 'WDW',
      description: desc,
      unit: 'EA',
      qty: 1,
      damaged: yn(fields, 'Damaged'),
      note: baseNote || null,
    }]
  },
  ev13: (fields, dir) => [{
    trade: 'Siding', category: 'SDG',
    description: `Gable vent - ${str(fields, 'Material') || 'unspecified'}`,
    unit: 'EA', qty: num(fields, 'Qty'), damaged: yn(fields, 'Damaged'), note: `${dir} elevation`,
  }],
  ev6: (fields, dir, parentFields = {}) => {
    const length = num(fields, 'Length (in)')
    const width = num(fields, 'Width (in)')
    const area = length != null && width != null ? length * width : null
    let sizeLabel = null
    if (area != null) {
      if (area <= 770) sizeLabel = 'Small (≤770 in²)'
      else if (area <= 1120) sizeLabel = 'Medium (771-1,120 in²)'
      else sizeLabel = 'Large (1,121+ in²)'
    }
    const material = (() => {
      const grade = str(fields, 'Grade') || str(parentFields, 'Grade')
      if (grade === 'Custom') {
        return str(fields, 'Custom Grade')
          || str(parentFields, 'Custom Grade')
          || 'Custom'
      }
      return grade
        || str(fields, 'Material')
        || str(parentFields, 'Material')
        || 'unspecified'
    })()
    const painted = str(fields, 'Painted') || str(parentFields, 'Painted')
    const finishNote = painted === 'Yes' ? 'Painted' : (painted === 'Stained' ? 'Stained' : null)
    const baseNote = [
      `${dir} elevation`,
      finishNote,
      area != null ? `${area} in²` : null,
    ].filter(Boolean).join('; ')
    return [{
      trade: 'Siding', category: 'WDW',
      description: [
        'Shutter',
        material,
        sizeLabel,
      ].filter(Boolean).join(' - '),
      unit: 'EA',
      qty: 1,
      damaged: yn(fields, 'Damaged'),
      note: baseNote || null,
    }]
  },
  ev7: (fields, dir) => {
    if (str(fields, 'Grade') === 'None' && str(fields, 'Action') === 'None') return []
    const length = num(fields, 'Length (in)')
    const width = num(fields, 'Width (in)')
    const area = length != null && width != null ? length * width : null
    return [{
      trade: 'Doors', category: 'DOR',
      description: [
        'Door',
        str(fields, 'Grade') || 'unspecified grade',
        str(fields, 'Style') || 'unspecified style',
        str(fields, 'Configuration') || null,
        area != null ? `${area} in²` : null,
      ].filter(Boolean).join(' - '),
      unit: 'EA',
      qty: 1,
      damaged: yn(fields, 'Damaged'),
      note: [
        `${dir} elevation`,
        length != null && width != null ? `${length}" × ${width}"` : null,
        yn(fields, 'Painted') ? 'Painted' : null,
        str(fields, 'Action') && str(fields, 'Action') !== 'None' ? `Action: ${str(fields, 'Action')}` : null,
      ].filter(Boolean).join('; '),
    }]
  },
  ev8: (fields, dir) => {
    const length = num(fields, 'Length (ft)') ?? num(fields, 'Length (in)')
    const width = num(fields, 'Width (ft)') ?? num(fields, 'Width (in)')
    const area = length != null && width != null ? length * width : null
    return [{
      trade: 'Doors', category: 'DOR',
      description: [
        'Garage door',
        str(fields, 'Type') || null,
        str(fields, 'Grade') || str(fields, 'Material') || 'unspecified grade',
        area != null ? `${area} ft²` : null,
      ].filter(Boolean).join(' - '),
      unit: 'EA',
      qty: 1,
      damaged: yn(fields, 'Damaged'),
      note: [
        `${dir} elevation`,
        length != null && width != null ? `${length}' × ${width}'` : null,
        yn(fields, 'Painted') ? 'Painted' : null,
        yn(fields, 'Insulated') ? 'Insulated' : null,
        yn(fields, 'Windows')
          ? (num(fields, 'Window Qty') != null ? `Windows: ${num(fields, 'Window Qty')}` : 'Windows')
          : null,
      ].filter(Boolean).join('; '),
    }]
  },
  ev14: (fields, dir) => {
    const deckLength = num(fields, 'Deck Length (ft)')
    const deckWidth = num(fields, 'Deck Width (ft)')
    const deckArea = deckLength != null && deckWidth != null ? deckLength * deckWidth : null
    const treadLength = num(fields, 'Tread Length (in)')
    const treadWidth = num(fields, 'Tread Width (in)')
    return [{
      trade: 'Exterior', category: 'EXT',
      description: [
        'Deck',
        str(fields, 'Material') || 'unspecified',
        deckArea != null ? `${Number.isInteger(deckArea) ? deckArea : deckArea.toFixed(1)} ft²` : null,
      ].filter(Boolean).join(' - '),
      unit: 'SF',
      qty: deckArea,
      damaged: yn(fields, 'Damaged'),
      note: [
        `${dir} elevation`,
        num(fields, 'Handrail Height (Inches)') != null
          ? `Handrail: ${num(fields, 'Handrail Height (Inches)')}"`
          : null,
        num(fields, 'Steps') != null ? `Steps: ${num(fields, 'Steps')}` : null,
        treadLength != null && treadWidth != null
          ? `Tread: ${treadLength}" × ${treadWidth}"`
          : null,
        yn(fields, 'Painted') ? 'Painted' : null,
      ].filter(Boolean).join('; '),
    }]
  },
}

// ---- Exterior (FEN / POL / EXT) ----------------------------------------

export const EXTERIOR_LINE_ITEMS = {
  ei_fence: (fields, damageNote) => {
    const finishNotes = [
      yn(fields, 'Stained') ? 'Stained' : null,
      yn(fields, 'Painted') ? 'Painted' : null,
      damageNote || null,
    ].filter(Boolean)
    return [{
      trade: 'Fencing', category: 'FEN',
      description: `Fence - ${str(fields, 'Material') || 'unspecified'}, ${str(fields, 'Style') || 'unspecified'} style`,
      unit: 'LF',
      qty: fenceTotalLf(fields) ?? num(fields, 'Post Spacing (LF)'),
      damaged: Boolean(damageNote),
      note: finishNotes.length ? finishNotes.join('; ') : null,
    }]
  },
  ei_gates: (fields, damageNote) => [{
    trade: 'Fencing', category: 'FEN',
    description: `Privacy gate - ${str(fields, 'Material') || 'unspecified'}`,
    unit: 'EA', qty: num(fields, 'Qty'),
    damaged: Boolean(damageNote), note: damageNote || null,
  }],
  ei_pool: (fields, damageNote) => damageNote ? [{
    trade: 'Exterior', category: 'EXT',
    description: 'Pool / cover / equipment', unit: 'EA', qty: null, damaged: true, note: damageNote,
  }] : [],
  ei_outdoor: (fields, damageNote) => {
    const otherText = str(fields, 'Other')
    return (fields?.['Damaged Items'] || []).map(item => ({
      trade: 'Exterior', category: 'EXT',
      description: `Outdoor item damaged - ${item === 'Other' && otherText ? otherText : item}`,
      unit: 'EA', qty: null, damaged: true, note: damageNote || null,
    }))
  },
}

export function buildRoofLineItems(itemDef, itemData) {
  if (!itemData || !isRoofItemActive(itemData)) return []
  const fixed = ROOF_LINE_ITEMS[itemDef.id]?.(itemData.fields || {}) || []
  const subBuilder = ROOF_SUBITEM_LINE_ITEMS[itemDef.id]
  const subs = subBuilder
    ? (itemData.subItems || []).map(sub => subBuilder(sub.fields || {}, itemData.fields || {}))
    : []
  const lines = [...fixed, ...subs]
  if (itemData.status !== 'supplement') return lines
  return lines.map(line => ({
    ...line,
    note: [line.note, 'Supplement'].filter(Boolean).join('; '),
  }))
}

export function buildElevLineItems(itemDef, dir, cellData) {
  if (!cellData || cellData.excluded) return []
  const builder = ELEV_LINE_ITEMS[itemDef.id]
  if (!builder) return []
  if (itemDef.addMore) {
    const parentFields = cellData.fields || {}
    return (cellData.subItems || []).flatMap(sub => builder(sub.fields || {}, dir, parentFields) || [])
  }
  return builder(cellData.fields || {}, dir) || []
}

export function buildExteriorLineItems(itemDef, itemData) {
  if (!itemData || itemData.excluded) return []
  const damageNote = itemData.fields?._damage || null
  return EXTERIOR_LINE_ITEMS[itemDef.id]?.(itemData.fields || {}, damageNote) || []
}
