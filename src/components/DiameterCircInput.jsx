import { fieldGroupProps } from '../utils/fieldLayout'
import { DECIMAL_INPUT_PROPS, sanitizeDecimalInput } from '../utils/decimalInput'

function roundTenths(value) {
  return Math.round(value * 10) / 10
}

function formatTenths(value) {
  if (!Number.isFinite(value) || value <= 0) return ''
  const rounded = roundTenths(value)
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function circumferenceFromDiameter(diameterValue) {
  const diameter = Number(diameterValue)
  if (!Number.isFinite(diameter) || diameter <= 0) return ''
  return formatTenths(Math.PI * diameter)
}

function diameterFromCircumference(circumferenceValue) {
  const circumference = Number(circumferenceValue)
  if (!Number.isFinite(circumference) || circumference <= 0) return ''
  return formatTenths(circumference / Math.PI)
}

function NumberStepper({ label, value, onChange, placeholder = '0', step = 1 }) {
  const current = value === '' || value == null ? 0 : Number(value)
  const inputCh = Math.max(String(value || placeholder || '').length, 3)

  function adjust(delta) {
    const base = Number.isFinite(current) ? current : 0
    const next = Math.max(0, base + delta)
    onChange(formatTenths(next) || '0')
  }

  return (
    <div className="number-stepper">
      <button
        type="button"
        className="number-stepper__btn"
        aria-label={`Decrease ${label}`}
        onClick={() => adjust(-step)}
      >
        −
      </button>
      <input
        className="field-input number-stepper__input"
        style={{ '--field-ch': inputCh }}
        {...DECIMAL_INPUT_PROPS}
        value={value || ''}
        placeholder={placeholder}
        aria-label={label}
        onChange={e => onChange(sanitizeDecimalInput(e.target.value))}
      />
      <button
        type="button"
        className="number-stepper__btn"
        aria-label={`Increase ${label}`}
        onClick={() => adjust(step)}
      >
        +
      </button>
    </div>
  )
}

export default function DiameterCircInput({
  field,
  diameterValue,
  circumferenceValue,
  onDiameterChange,
  onCircumferenceChange,
}) {
  const diameterLabel = field.diameterLabel || 'Diameter (Inches)'
  const showCircumference = field.showCircumference !== false
  const circumferenceLabel = field.circumferenceLabel || 'Total Circumference'
  const showHeading = Boolean(field.l && field.l !== 'Diameter')

  // Prefer stored circumference; fall back to derived so older saves still show C.
  const circDisplay = (() => {
    if (circumferenceValue !== '' && circumferenceValue != null) return circumferenceValue
    return circumferenceFromDiameter(diameterValue)
  })()

  function handleDiameterChange(nextDiameter) {
    onDiameterChange(nextDiameter)
    if (!showCircumference || !onCircumferenceChange) return
    onCircumferenceChange(circumferenceFromDiameter(nextDiameter))
  }

  function handleCircumferenceChange(nextCirc) {
    if (!onCircumferenceChange) return
    onCircumferenceChange(nextCirc)
    onDiameterChange(diameterFromCircumference(nextCirc))
  }

  return (
    <div {...fieldGroupProps(field, 'dimension-lw-input-wrap')}>
      {showHeading && (
        <div className="dimension-lw-input__title-row">
          <label className="form-label">{field.l}</label>
        </div>
      )}

      <div className="field-group field-group--full field-group--stepper-row field-group--inline-stepper dimension-lw-input__row">
        <label className="form-label">{diameterLabel}</label>
        <NumberStepper
          label={diameterLabel}
          value={diameterValue}
          onChange={handleDiameterChange}
        />
      </div>

      {showCircumference && (
        <div className="field-group field-group--full field-group--stepper-row field-group--inline-stepper dimension-lw-input__row">
          <label className="form-label">{circumferenceLabel}</label>
          <NumberStepper
            label={circumferenceLabel}
            value={circDisplay}
            onChange={handleCircumferenceChange}
            step={0.1}
          />
        </div>
      )}
    </div>
  )
}
