import { fieldGroupProps } from '../utils/fieldLayout'

function NumberStepperPart({ label, value, onChange, placeholder = '0' }) {
  const current = value === '' || value == null ? 0 : Number(value)
  const inputCh = Math.max(String(value || placeholder || '').length, 3)

  function adjust(delta) {
    const base = Number.isFinite(current) ? current : 0
    onChange(String(Math.max(0, base + delta)))
  }

  return (
    <div className="measurement-input__part">
      <span className="dimension-lw-input__label">{label}</span>
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
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          value={value || ''}
          placeholder={placeholder}
          aria-label={label}
          onChange={e => onChange(e.target.value)}
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
    </div>
  )
}

export default function DimensionLwInput({
  field,
  lengthValue,
  widthValue,
  onLengthChange,
  onWidthChange,
}) {
  const lengthLabel = field.lengthLabel || 'Length'
  const widthLabel = field.widthLabel || 'Width'

  return (
    <div {...fieldGroupProps(field)}>
      <label className="form-label">{field.l}</label>
      <div className="measurement-input dimension-lw-input">
        <NumberStepperPart
          label={lengthLabel}
          value={lengthValue}
          onChange={onLengthChange}
        />
        <NumberStepperPart
          label={widthLabel}
          value={widthValue}
          onChange={onWidthChange}
        />
      </div>
    </div>
  )
}
