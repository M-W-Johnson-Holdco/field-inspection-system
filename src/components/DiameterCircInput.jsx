import { fieldGroupProps } from '../utils/fieldLayout'
import { DECIMAL_INPUT_PROPS, sanitizeDecimalInput } from '../utils/decimalInput'

function NumberStepper({ label, value, onChange, placeholder = '0' }) {
  const current = value === '' || value == null ? 0 : Number(value)
  const inputCh = Math.max(String(value || placeholder || '').length, 3)

  function adjust(delta) {
    const base = Number.isFinite(current) ? current : 0
    onChange(String(Math.max(0, base + delta)))
  }

  return (
    <div className="number-stepper">
      <button
        type="button"
        className="number-stepper__btn"
        aria-label={`Decrease ${label}`}
        onClick={() => adjust(-1)}
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
        onClick={() => adjust(1)}
      >
        +
      </button>
    </div>
  )
}

function formatCircumference(diameterValue) {
  const diameter = Number(diameterValue)
  if (!Number.isFinite(diameter) || diameter <= 0) return null
  return (Math.round(Math.PI * diameter * 10) / 10).toFixed(1)
}

export default function DiameterCircInput({
  field,
  diameterValue,
  onDiameterChange,
}) {
  const diameterLabel = field.diameterLabel || 'Diameter (Inches)'
  const showCircumference = field.showCircumference !== false
  const circumferenceLabel = field.circumferenceLabel || 'Total Circumference'
  const circumferenceUnit = field.circumferenceUnit ?? '"'
  const circumferenceValue = showCircumference ? formatCircumference(diameterValue) : null
  const showHeading = Boolean(field.l && field.l !== 'Diameter')

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
          onChange={onDiameterChange}
        />
      </div>

      {showCircumference && (
        <div className="dimension-lw-input__area" aria-live="polite">
          <span className="dimension-lw-input__area-label">{circumferenceLabel}</span>
          <output className="dimension-lw-input__area-value">
            {circumferenceValue != null ? `${circumferenceValue}${circumferenceUnit}` : '—'}
          </output>
        </div>
      )}
    </div>
  )
}
