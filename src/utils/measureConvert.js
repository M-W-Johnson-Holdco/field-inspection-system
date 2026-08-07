/** Convert feet + inches to total inches or decimal feet. */

export function feetInchesToTotalInches(feet, inches) {
  const ft = Number(feet)
  const inch = Number(inches)
  const safeFt = Number.isFinite(ft) ? ft : 0
  const safeIn = Number.isFinite(inch) ? inch : 0
  if (safeFt < 0 || safeIn < 0) return null
  return safeFt * 12 + safeIn
}

export function formatConversionResult(totalInches, unit) {
  if (totalInches == null || !Number.isFinite(totalInches)) return null
  if (unit === 'inches') {
    const rounded = Math.round(totalInches * 1000) / 1000
    return Number.isInteger(rounded) ? String(rounded) : String(rounded)
  }
  if (unit === 'feet') {
    const feet = Math.round((totalInches / 12) * 10000) / 10000
    return Number.isInteger(feet) ? String(feet) : String(feet)
  }
  return null
}
