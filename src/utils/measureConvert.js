/** Convert feet + inches + fraction to total inches or decimal feet. */
import { partsToTotalInches } from './measurement'

export function feetInchesToTotalInches(feet, inches, fraction = '') {
  const ft = Number(feet)
  const inch = Number(inches)
  const safeFt = Number.isFinite(ft) ? ft : 0
  const safeIn = Number.isFinite(inch) ? inch : 0
  if (safeFt < 0 || safeIn < 0) return null
  const total = partsToTotalInches({ feet: safeFt, inches: safeIn, fraction })
  return Number.isFinite(total) ? total : null
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
