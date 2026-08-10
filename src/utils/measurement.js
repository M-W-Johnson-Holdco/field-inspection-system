/** Fraction options for the measurement wheel (blank = whole inch). */
export const MEASUREMENT_FRACTIONS = ['', '1/8', '1/4', '3/8', '1/2', '5/8', '3/4', '7/8']

/** Skewed / vulgar Unicode glyphs for display + storage. */
export const FRACTION_GLYPHS = {
  '': '0',
  '1/8': '⅛',
  '1/4': '¼',
  '3/8': '⅜',
  '1/2': '½',
  '5/8': '⅝',
  '3/4': '¾',
  '7/8': '⅞',
}

const GLYPH_TO_FRACTION = {
  '⅛': '1/8',
  '¼': '1/4',
  '⅜': '3/8',
  '½': '1/2',
  '⅝': '5/8',
  '¾': '3/4',
  '⅞': '7/8',
}

const FRACTION_VALUES = {
  '': 0,
  '1/8': 0.125,
  '1/4': 0.25,
  '3/8': 0.375,
  '1/2': 0.5,
  '5/8': 0.625,
  '3/4': 0.75,
  '7/8': 0.875,
}

export function formatFractionDisplay(fraction) {
  const key = normalizeFractionKey(fraction)
  if (!key) return FRACTION_GLYPHS['']
  return FRACTION_GLYPHS[key] || key
}

export function normalizeFractionKey(fraction) {
  if (fraction == null || fraction === '' || fraction === '0') return ''
  const raw = String(fraction).trim()
  if (Object.prototype.hasOwnProperty.call(GLYPH_TO_FRACTION, raw)) return GLYPH_TO_FRACTION[raw]
  if (Object.prototype.hasOwnProperty.call(FRACTION_VALUES, raw)) return raw
  const match = raw.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (!match) return ''
  const key = `${match[1]}/${match[2]}`
  return Object.prototype.hasOwnProperty.call(FRACTION_VALUES, key) ? key : ''
}

export function isLinearMeasurementField(field) {
  if (field?.t !== 'num') return false
  if (field.lfFeetOnly) return true
  const label = field.l || ''
  return /\bLF\b/i.test(label)
    || label === 'Length'
    || label === 'Post Spacing'
    || label === 'Gutter Apron Width'
}

export function isQtyField(field) {
  const label = field?.l || ''
  return field?.t === 'num' && /\bQty\b/i.test(label)
}

/** Numeric fields that represent a physical measurement (not Qty / pitch / stories). */
export function isMeasurementField(field) {
  if (!field) return false
  if (field.t === 'lwxw' || field.t === 'diameter') return true
  if (field.t !== 'num') return false
  if (isQtyField(field)) return false
  const label = field.l || ''
  if (/^Stories$/i.test(label) || /^Layers$/i.test(label)) return false
  if (field.t === 'pitch' || /\bpitch\b/i.test(label)) return false
  if (field.lfFeetOnly || isLinearMeasurementField(field)) return true
  return /\b(LF|FT|Feet|Foot|Inches?|Inch|Length|Width|Height|Diameter|Circumference|Spacing|Exposure|Handrail)\b/i.test(label)
}

/** Prefer feet vs inches when migrating bare numeric legacy values. */
export function measurementUnitHint(labelOrField = '') {
  if (labelOrField && typeof labelOrField === 'object' && labelOrField.lfFeetOnly) return 'feet'
  const label = typeof labelOrField === 'string' ? labelOrField : (labelOrField?.l || labelOrField?.lengthLabel || labelOrField?.widthLabel || '')
  if (/\bInches?\b|\(in\)|\bin\b/i.test(label) && !/\b(LF|FT|Feet|Foot)\b/i.test(label)) return 'inches'
  if (/\b(LF|FT|Feet|Foot|\(ft\))\b/i.test(label)) return 'feet'
  if (label === 'Length' || label === 'Post Spacing' || label === 'Gutter Apron Width') return 'feet'
  return 'mixed'
}

function clampInt(n, min, max) {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, Math.round(n)))
}

export function fractionToDecimal(fraction) {
  const key = normalizeFractionKey(fraction)
  return FRACTION_VALUES[key] ?? 0
}

export function decimalToNearestFraction(decimal) {
  const d = Number(decimal)
  if (!Number.isFinite(d) || d <= 0) return ''
  let best = ''
  let bestDiff = Infinity
  for (const key of MEASUREMENT_FRACTIONS) {
    const val = FRACTION_VALUES[key]
    const diff = Math.abs(d - val)
    if (diff < bestDiff - 1e-9) {
      best = key
      bestDiff = diff
    }
  }
  return best
}

export function partsToTotalInches({ feet = 0, inches = 0, fraction = '' } = {}) {
  const ft = Number(feet) || 0
  const inch = Number(inches) || 0
  return ft * 12 + inch + fractionToDecimal(fraction)
}

export function totalInchesToParts(totalInches) {
  const total = Number(totalInches)
  if (!Number.isFinite(total) || total <= 0) return { feet: 0, inches: 0, fraction: '' }
  const whole = Math.floor(total + 1e-9)
  const frac = decimalToNearestFraction(total - whole)
  const feet = Math.floor(whole / 12)
  const inches = whole % 12
  return {
    feet: clampInt(feet, 0, 100),
    inches: clampInt(inches, 0, 100),
    fraction: frac,
  }
}

export function totalFeetToParts(totalFeet) {
  const ft = Number(totalFeet)
  if (!Number.isFinite(ft) || ft <= 0) return { feet: 0, inches: 0, fraction: '' }
  return totalInchesToParts(ft * 12)
}

/** Legacy helper — returns string feet/inches without fractions. */
export function parseMeasurement(value) {
  const parts = parseMeasurementParts(value)
  return {
    feet: parts.feet ? String(parts.feet) : '',
    inches: parts.inches || parts.fraction ? String(parts.inches) : '',
  }
}

/**
 * Parse stored measurement into wheel parts.
 * Accepts compound (`8' 3 1/2"`), legacy decimals, or bare numbers.
 */
export function parseMeasurementParts(value, { unitHint = 'mixed' } = {}) {
  const text = String(value ?? '').trim()
  if (!text || text === 'Select') return { feet: 0, inches: 0, fraction: '' }

  // Bare number → interpret via unit hint
  if (/^\d+(?:\.\d+)?$/.test(text)) {
    const n = Number(text)
    if (unitHint === 'inches') return totalInchesToParts(n)
    if (unitHint === 'feet') return totalFeetToParts(n)
    if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 1e-9) {
      return { feet: clampInt(n, 0, 100), inches: 0, fraction: '' }
    }
    return totalFeetToParts(n)
  }

  let feet = 0
  let inches = 0
  let fraction = ''

  // Avoid \b after ' — end-of-string after a quote is not a word boundary.
  const feetMatch = text.match(/(\d+)\s*(?:'|ft|feet)(?!\w)/i)
  if (feetMatch) feet = clampInt(Number(feetMatch[1]), 0, 100)

  const rest = feetMatch ? text.slice(feetMatch.index + feetMatch[0].length) : text

  // Inch + skewed glyph: 3 ½" or 3½"
  const inchGlyph = rest.match(/^\s*(\d+)\s*([⅛¼⅜½⅝¾⅞])/)
  if (inchGlyph) {
    inches = clampInt(Number(inchGlyph[1]), 0, 100)
    fraction = GLYPH_TO_FRACTION[inchGlyph[2]] || ''
    return { feet, inches, fraction }
  }

  // Bare skewed glyph: ½"
  const bareGlyph = rest.match(/^\s*([⅛¼⅜½⅝¾⅞])\s*"?\s*$/)
  if (bareGlyph) {
    return { feet, inches: 0, fraction: GLYPH_TO_FRACTION[bareGlyph[1]] || '' }
  }

  const inchFrac = rest.match(/^\s*(\d+)\s+(\d+)\s*\/\s*(\d+)/)
  if (inchFrac) {
    inches = clampInt(Number(inchFrac[1]), 0, 100)
    const key = `${inchFrac[2]}/${inchFrac[3]}`
    fraction = Object.prototype.hasOwnProperty.call(FRACTION_VALUES, key)
      ? key
      : decimalToNearestFraction(Number(inchFrac[2]) / Number(inchFrac[3]))
    return { feet, inches, fraction }
  }

  const bareFrac = rest.match(/^\s*(\d+)\s*\/\s*(\d+)\s*"?\s*$/)
  if (bareFrac) {
    const key = `${bareFrac[1]}/${bareFrac[2]}`
    fraction = Object.prototype.hasOwnProperty.call(FRACTION_VALUES, key)
      ? key
      : decimalToNearestFraction(Number(bareFrac[1]) / Number(bareFrac[2]))
    return { feet, inches: 0, fraction }
  }

  const inchOnly = rest.match(/^\s*(\d+)\s*(?:"|in|inches)?\s*$/i)
  if (inchOnly) {
    inches = clampInt(Number(inchOnly[1]), 0, 100)
    return { feet, inches, fraction: '' }
  }

  const glyphOnly = text.match(/([⅛¼⅜½⅝¾⅞])/)
  if (glyphOnly) {
    fraction = GLYPH_TO_FRACTION[glyphOnly[1]] || ''
  } else {
    const fracOnly = text.match(/(\d+)\s*\/\s*(\d+)/)
    if (fracOnly) {
      const key = `${fracOnly[1]}/${fracOnly[2]}`
      fraction = Object.prototype.hasOwnProperty.call(FRACTION_VALUES, key) ? key : ''
    }
  }

  return { feet, inches, fraction }
}

export function formatMeasurement(feet, inches) {
  return formatMeasurementParts({ feet, inches, fraction: '' })
}

export function formatMeasurementParts({ feet = 0, inches = 0, fraction = '' } = {}) {
  const ft = clampInt(Number(feet) || 0, 0, 100)
  const inch = clampInt(Number(inches) || 0, 0, 100)
  const frKey = normalizeFractionKey(fraction)
  const frGlyph = frKey ? FRACTION_GLYPHS[frKey] : ''

  if (!ft && !inch && !frGlyph) return ''

  const inchBit = frGlyph
    ? (inch || ft ? `${inch}${frGlyph}"` : `${frGlyph}"`)
    : (inch ? `${inch}"` : '')

  if (ft && inchBit) return `${ft}' ${inchBit}`
  if (ft) return `${ft}'`
  return inchBit
}

export function formatMeasurementDisplay(value, { unitHint = 'mixed' } = {}) {
  if (value == null || value === '') return ''
  const parts = parseMeasurementParts(value, { unitHint })
  return formatMeasurementParts(parts)
}

export function measurementToDecimalInches(value, { unitHint = 'mixed' } = {}) {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const text = String(value).trim()
  if (/^\d+(?:\.\d+)?$/.test(text)) {
    const n = Number(text)
    if (unitHint === 'feet') return n * 12
    return n
  }
  const parts = parseMeasurementParts(text, { unitHint })
  const total = partsToTotalInches(parts)
  return total > 0 || formatMeasurementParts(parts) ? total : null
}

export function measurementToDecimalFeet(value, { unitHint = 'mixed' } = {}) {
  const inches = measurementToDecimalInches(value, { unitHint: unitHint === 'mixed' ? 'feet' : unitHint })
  if (inches == null) return null
  return inches / 12
}
