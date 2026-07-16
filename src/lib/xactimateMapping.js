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

// ---- Roof (RFG) --------------------------------------------------------

export const ROOF_LINE_ITEMS = {
  ri0: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: `Comp. shingle - ${(fields?.Style || []).join('/') || 'unspecified style'}`,
    unit: 'SQ', qty: null,
    damaged: null,
    note: `${num(fields, 'Stories') ?? '?'} stories, ${num(fields, 'Layers') ?? '?'} layer(s), predominant pitch ${str(fields, 'Predominant Pitch') || '?'}`,
  }],
  ri1: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: `${str(fields, 'Type') || 'Edge flashing'} - ${str(fields, 'Material') || ''}`.trim(),
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
    description: `Valley - ${str(fields, 'Style') || 'unspecified'}`,
    unit: 'LF', qty: null, damaged: null, note: null,
  }],
  ri24: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: 'Solar panel - remove & reset',
    unit: 'EA', qty: num(fields, 'Qty'),
    damaged: yn(fields, 'Damaged'), note: null,
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
    description: `Turbine vent - ${str(fields, 'Material') || 'unspecified'}`,
    unit: 'EA', qty: num(fields, 'Qty'),
    damaged: yn(fields, 'Damaged'), note: yn(fields, 'Painted') ? 'Painted' : null,
  }],
  ri9: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: 'Power vent',
    unit: 'EA', qty: num(fields, 'Qty'),
    damaged: yn(fields, 'Damaged'), note: yn(fields, 'Painted') ? 'Painted' : null,
  }],
  ri10: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: 'Solar-powered vent',
    unit: 'EA', qty: num(fields, 'Qty'),
    damaged: yn(fields, 'Damaged'), note: yn(fields, 'Painted') ? 'Painted' : null,
  }],
  ri13: (fields) => yn(fields, 'Needed') ? [{
    trade: 'Roofing', category: 'RFG',
    description: 'Kickout flashing - install (missing)',
    unit: 'EA', qty: null, damaged: true,
    note: 'Not currently present; recommend at time of install to prevent siding damage',
  }] : [],
  ri15: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: 'Rain diverter',
    unit: 'LF', qty: num(fields, 'Length (LF)') ?? num(fields, 'Qty'),
    damaged: null, note: yn(fields, 'Painted') ? 'Painted' : null,
  }],
  ri16: (fields) => [{
    trade: 'Roofing', category: 'RFG',
    description: 'Power meter mast - reset',
    unit: 'EA', qty: num(fields, 'Qty'), damaged: null, note: null,
  }],
}

// Sub-item (addMore) roof items -> one line item per sub-item.
export const ROOF_SUBITEM_LINE_ITEMS = {
  ri11: (f) => ({
    trade: 'Roofing', category: 'RFG',
    description: `Pipe jack - ${str(f, 'Type') || 'unspecified'} (${str(f, 'Size (inches)') || '?'}")`,
    unit: 'EA', qty: 1, damaged: yn(f, 'Damaged'), note: yn(f, 'Painted') ? 'Painted' : null,
  }),
  ri12: (f) => ({
    trade: 'Roofing', category: 'RFG',
    description: `Exhaust stack - ${str(f, 'Type') || 'unspecified'}`,
    unit: 'EA', qty: 1, damaged: yn(f, 'Damaged'), note: yn(f, 'Painted') ? 'Painted' : null,
  }),
  ri14: (f) => ({
    trade: 'Roofing', category: 'RFG',
    description: `Skylight - ${str(f, 'Style') || 'unspecified'} (${str(f, 'Mount') || '?'})`,
    unit: 'EA', qty: 1, damaged: yn(f, 'Damaged'),
    note: (f?.['Length (in)'] && f?.['Width (in)']) ? `${f['Length (in)']}" x ${f['Width (in)']}"` : null,
  }),
  ri17: (f) => ({
    trade: 'Roofing', category: 'RFG',
    description: `Chimney flashing - ${str(f, 'Size / Width') || 'unspecified size'}`,
    unit: 'EA', qty: 1, damaged: yn(f, 'Damaged'),
    note: `Counter flashing: ${str(f, 'Counter Flashing') || '?'}${yn(f, 'Painted') ? ', painted' : ''}`,
  }),
  ri18: (f) => ({
    trade: 'Roofing', category: 'RFG',
    description: 'Step flashing',
    unit: 'LF', qty: num(f, 'Length (LF)') ?? 1, damaged: yn(f, 'Damaged'), note: yn(f, 'Painted') ? 'Painted' : null,
  }),
  ri19: (f) => ({
    trade: 'Roofing', category: 'RFG',
    description: 'Counter flashing',
    unit: 'LF', qty: num(f, 'Length (LF)') ?? 1, damaged: yn(f, 'Damaged'), note: yn(f, 'Painted') ? 'Painted' : null,
  }),
  ri20: (f) => ({
    trade: 'Roofing', category: 'RFG',
    description: 'L flashing',
    unit: 'LF', qty: num(f, 'Length (LF)') ?? 1, damaged: yn(f, 'Damaged'), note: yn(f, 'Painted') ? 'Painted' : null,
  }),
  ri21: (f) => ({
    trade: 'Roofing', category: 'RFG',
    description: `Cornice gable - ${str(f, 'Type') || 'unspecified'}`,
    unit: 'EA', qty: num(f, 'Qty') ?? 1, damaged: null,
    note: f?.Story ? `Story ${f.Story}` : null,
  }),
  ri22: (f) => ({
    trade: 'Roofing', category: 'RFG',
    description: `Low slope roofing - ${str(f, 'Location') || 'unspecified'} (${str(f, 'Style / Grade') || 'unspecified'})`,
    unit: 'SQ', qty: null, damaged: yn(f, 'Damaged'),
    note: yn(f, 'Exposed Rafters') ? 'Exposed rafters' : null,
  }),
  ri23: (f) => ({
    trade: 'Roofing', category: 'RFG',
    description: `Other structure - ${str(f, 'Type') || 'unspecified'} (${str(f, 'Style / Grade') || 'unspecified'})`,
    unit: 'SQ', qty: null, damaged: yn(f, 'Damaged'), note: null,
  }),
}

// ---- Elevations (SDG / GTR / FCA / DOR) --------------------------------

export const ELEV_LINE_ITEMS = {
  ev0: (fields, dir) => [{
    trade: 'Siding', category: 'SDG',
    description: `Siding - ${str(fields, 'Material') || 'unspecified'}`,
    unit: 'SF', qty: null, damaged: yn(fields, 'Damaged'), note: `${dir} elevation`,
  }],
  ev1: (fields, dir) => [{
    trade: 'Siding', category: 'FCA',
    description: `Fascia / eave board - ${str(fields, 'Material') || 'unspecified'}`,
    unit: 'LF', qty: null, damaged: yn(fields, 'Damaged'), note: `${dir} elevation`,
  }],
  ev2: (fields, dir) => [{
    trade: 'Siding', category: 'SFT',
    description: `Soffit - ${str(fields, 'Material') || 'unspecified'}`,
    unit: 'LF', qty: null, damaged: yn(fields, 'Damaged'), note: `${dir} elevation`,
  }],
  ev3: (fields, dir) => [{
    trade: 'Gutters', category: 'GTR',
    description: `Gutter - ${str(fields, 'Material') || 'unspecified'}, ${num(fields, 'Size (Inches)') ?? '?'}"`,
    unit: 'LF', qty: null, damaged: yn(fields, 'Damaged'), note: `${dir} elevation`,
  }],
  ev4: (fields, dir) => [{
    trade: 'Gutters', category: 'GTR',
    description: `Downspout - ${str(fields, 'Material') || 'unspecified'}`,
    unit: 'EA', qty: num(fields, 'Qty'), damaged: yn(fields, 'Damaged'), note: `${dir} elevation`,
  }],
  ev5: (fields, dir) => [{
    trade: 'Siding', category: 'WDW',
    description: 'Window screen',
    unit: 'EA', qty: num(fields, 'Qty'), damaged: yn(fields, 'Damaged'), note: `${dir} elevation`,
  }],
  ev6: (fields, dir) => [{
    trade: 'Siding', category: 'WDW',
    description: `Shutter - ${str(fields, 'Material') || 'unspecified'}`,
    unit: 'EA', qty: num(fields, 'Qty'), damaged: yn(fields, 'Damaged'), note: `${dir} elevation`,
  }],
  ev7: (fields, dir) => [{
    trade: 'Doors', category: 'DOR',
    description: `Entry door - ${str(fields, 'Material') || 'unspecified'}${yn(fields, 'Storm Door') ? ' + storm door' : ''}`,
    unit: 'EA', qty: num(fields, 'Qty'), damaged: yn(fields, 'Damaged'), note: `${dir} elevation`,
  }],
  ev8: (fields, dir) => [{
    trade: 'Doors', category: 'DOR',
    description: `Garage door - ${str(fields, 'Material') || 'unspecified'} (${str(fields, 'Panel Style') || 'unspecified'})`,
    unit: 'EA', qty: num(fields, 'Qty'), damaged: yn(fields, 'Damaged'), note: `${dir} elevation`,
  }],
  ev9: (fields, dir) => [{
    trade: 'HVAC', category: 'HVC',
    description: 'A/C condenser',
    unit: 'EA', qty: null, damaged: yn(fields, 'Damaged'), note: `${dir} elevation`,
  }],
}

// ---- Exterior (FEN / POL / EXT) ----------------------------------------

export const EXTERIOR_LINE_ITEMS = {
  ei_fence: (fields, damageNote) => [{
    trade: 'Fencing', category: 'FEN',
    description: `Fence - ${(fields?.Material || []).join('/') || 'unspecified'}, ${str(fields, 'Style') || 'unspecified'} style`,
    unit: 'LF', qty: num(fields, 'Post Spacing (LF)'),
    damaged: Boolean(damageNote), note: damageNote || null,
  }],
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
  ei_outdoor: (fields, damageNote) => (fields?.['Damaged Items'] || []).map(item => ({
    trade: 'Exterior', category: 'EXT',
    description: `Outdoor item damaged - ${item}`,
    unit: 'EA', qty: null, damaged: true, note: damageNote || null,
  })),
}

export function buildRoofLineItems(itemDef, itemData) {
  if (!itemData || itemData.excluded) return []
  const fixed = ROOF_LINE_ITEMS[itemDef.id]?.(itemData.fields || {}) || []
  const subBuilder = ROOF_SUBITEM_LINE_ITEMS[itemDef.id]
  const subs = subBuilder ? (itemData.subItems || []).map(sub => subBuilder(sub.fields || {})) : []
  return [...fixed, ...subs]
}

export function buildElevLineItems(itemDef, dir, cellData) {
  if (!cellData || cellData.excluded) return []
  return ELEV_LINE_ITEMS[itemDef.id]?.(cellData.fields || {}, dir) || []
}

export function buildExteriorLineItems(itemDef, itemData) {
  if (!itemData || itemData.excluded) return []
  const damageNote = itemData.fields?._damage || null
  return EXTERIOR_LINE_ITEMS[itemDef.id]?.(itemData.fields || {}, damageNote) || []
}
