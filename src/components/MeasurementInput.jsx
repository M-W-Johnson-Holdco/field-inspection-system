import { fieldGroupProps } from '../utils/fieldLayout'
import { formatMeasurement, isLinearMeasurementField, parseMeasurement } from '../utils/measurement'

function MeasurementStepper({ label, value, onChange }) {
  const current = value === '' || value == null ? 0 : Number(value)
  const inputCh = Math.max(String(value || '0').length, 1)

  function adjust(delta) {
    const base = Number.isFinite(current) ? current : 0
    onChange(String(Math.max(0, base + delta)))
  }

  return (
    <div className="measurement-input__part">
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
          placeholder="0"
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

export default function MeasurementInput({ field, value, onChange }) {
  if (field.lfFeetOnly) {
    const { feet } = parseMeasurement(value)
    const display = feet !== '' ? feet : String(value || '').replace(/[^\d.]/g, '')

    return (
      <div {...fieldGroupProps(field)}>
        <label className="form-label">{field.l}</label>
        <div className="measurement-input">
          <MeasurementStepper
            label={`${field.l} feet`}
            value={display}
            onChange={onChange}
          />
        </div>
      </div>
    )
  }

  const { feet, inches } = parseMeasurement(value)

  function update(part, nextValue) {
    onChange(formatMeasurement(
      part === 'feet' ? nextValue : feet,
      part === 'inches' ? nextValue : inches,
    ))
  }

  return (
    <div {...fieldGroupProps(field)}>
      <label className="form-label">{field.l}</label>
      <div className="measurement-input">
        <MeasurementStepper
          label={`${field.l} feet`}
          value={feet}
          onChange={nextValue => update('feet', nextValue)}
        />
        <MeasurementStepper
          label={`${field.l} inches`}
          value={inches}
          onChange={nextValue => update('inches', nextValue)}
        />
      </div>
    </div>
  )
}

export { isLinearMeasurementField }
