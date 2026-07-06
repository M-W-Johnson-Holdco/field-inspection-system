export function isLinearMeasurementField(field) {
  return field.t === 'num' && /\bLF\b/i.test(field.l)
}

export function parseMeasurement(value) {
  const text = String(value || '').trim()
  if (!text) return { feet: '', inches: '' }
  const feetMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:'|ft|feet)?/i)
  const inchesMatch = text.match(/(?:'|ft|feet)\s*(\d+(?:\.\d+)?)\s*(?:"|in|inches)?/i)
    || text.match(/(\d+(?:\.\d+)?)\s*(?:"|in|inches)/i)
  return {
    feet: feetMatch ? feetMatch[1] : '',
    inches: inchesMatch ? inchesMatch[1] : '',
  }
}

export function formatMeasurement(feet, inches) {
  const ft = String(feet || '').trim()
  const inch = String(inches || '').trim()
  if (!ft && !inch) return ''
  if (!inch) return `${ft}'`
  return `${ft || '0'}' ${inch}"`
}
