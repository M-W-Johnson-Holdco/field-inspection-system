import { fieldGroupProps } from '../utils/fieldLayout'

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
  )
}

function formatArea(lengthValue, widthValue) {
  const length = Number(lengthValue)
  const width = Number(widthValue)
  if (!Number.isFinite(length) || !Number.isFinite(width) || length <= 0 || width <= 0) return null
  const area = length * width
  return Number.isInteger(area) ? String(area) : area.toFixed(1)
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
  const showArea = Boolean(field.showAreaSqIn || field.showArea)
  const areaUnit = field.areaUnit || 'in²'
  const areaLabel = field.areaLabel || 'Total Area'
  const areaValue = showArea ? formatArea(lengthValue, widthValue) : null
  // Keep a heading only when it's meaningful (not the generic "Size" used above L/W rows)
  const showHeading = Boolean(field.l && field.l !== 'Size')

  return (
    <div {...fieldGroupProps(field, 'dimension-lw-input-wrap')}>
      {showHeading && (
        <div className="dimension-lw-input__title-row">
          <label className="form-label">{field.l}</label>
          {field.areaLegend && (
            <span className="dimension-lw-input__legend">{field.areaLegend}</span>
          )}
        </div>
      )}

      <div className="field-group field-group--full field-group--stepper-row field-group--inline-stepper dimension-lw-input__row">
        <label className="form-label">{lengthLabel}</label>
        <NumberStepper
          label={lengthLabel}
          value={lengthValue}
          onChange={onLengthChange}
        />
      </div>

      <div className="field-group field-group--full field-group--stepper-row field-group--inline-stepper dimension-lw-input__row">
        <label className="form-label">{widthLabel}</label>
        <NumberStepper
          label={widthLabel}
          value={widthValue}
          onChange={onWidthChange}
        />
      </div>

      {showArea && (
        <div className="dimension-lw-input__area" aria-live="polite">
          <span className="dimension-lw-input__area-label">{areaLabel}</span>
          <output className="dimension-lw-input__area-value">
            {areaValue != null ? `${areaValue} ${areaUnit}` : '—'}
          </output>
        </div>
      )}
    </div>
  )
}
