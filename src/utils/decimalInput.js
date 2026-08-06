/** Props that reliably show a decimal keypad on iOS/Android. */
export const DECIMAL_INPUT_PROPS = {
  type: 'text',
  inputMode: 'decimal',
  enterKeyHint: 'done',
  autoComplete: 'off',
  autoCorrect: 'off',
  spellCheck: false,
}

/** Keep digits and at most one decimal point (commas → dots). */
export function sanitizeDecimalInput(raw) {
  let next = String(raw ?? '').replace(/,/g, '.').replace(/[^0-9.]/g, '')
  const dot = next.indexOf('.')
  if (dot !== -1) {
    next = `${next.slice(0, dot + 1)}${next.slice(dot + 1).replace(/\./g, '')}`
  }
  return next
}
