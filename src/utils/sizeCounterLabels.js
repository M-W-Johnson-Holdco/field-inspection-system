/** Short labels for S/M/L/XL size counters (internal keys stay full names). */
const SIZE_COUNTER_SHORT_LABELS = {
  Small: 'S',
  Medium: 'M',
  Large: 'L',
  'X-Large': 'XL',
}

export function sizeCounterLabel(size) {
  return SIZE_COUNTER_SHORT_LABELS[size] || size
}
