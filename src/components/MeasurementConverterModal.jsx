import { useMemo, useState } from 'react'
import { Ruler, X } from 'lucide-react'
import { DECIMAL_INPUT_PROPS, sanitizeDecimalInput } from '../utils/decimalInput'
import { feetInchesToTotalInches, formatConversionResult } from '../utils/measureConvert'

const OUTPUT_UNITS = [
  { id: 'inches', label: 'Inches' },
  { id: 'feet', label: 'Feet' },
]

function NumberStepper({ label, value, onChange, placeholder = '0', step = 1 }) {
  const current = value === '' || value == null ? 0 : Number(value)
  const inputCh = Math.max(String(value || placeholder || '').length, 3)

  function adjust(delta) {
    const base = Number.isFinite(current) ? current : 0
    const next = Math.max(0, base + delta)
    const rounded = Math.round(next * 1000) / 1000
    onChange(Number.isInteger(rounded) ? String(rounded) : String(rounded))
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

export default function MeasurementConverterModal({ onClose }) {
  const [feet, setFeet] = useState('')
  const [inches, setInches] = useState('')
  const [unit, setUnit] = useState('inches')
  const [copied, setCopied] = useState(false)

  const totalInches = useMemo(
    () => feetInchesToTotalInches(feet, inches),
    [feet, inches],
  )
  const result = useMemo(
    () => formatConversionResult(totalInches, unit),
    [totalInches, unit],
  )
  const hasInput = feet !== '' || inches !== ''
  const unitLabel = unit === 'inches' ? 'in' : 'ft'

  function updateFeet(next) {
    setFeet(next)
    setCopied(false)
  }

  function updateInches(next) {
    setInches(next)
    setCopied(false)
  }

  async function handleCopy() {
    if (result == null) return
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      window.alert('Could not copy. Long-press the result to copy instead.')
    }
  }

  function handleClear() {
    setFeet('')
    setInches('')
    setCopied(false)
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className="modal-sheet measure-converter-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="measure-converter-title"
      >
        <div className="modal-sheet__header">
          <div className="modal-sheet__header-main">
            <Ruler size={20} aria-hidden="true" />
            <h2 id="measure-converter-title" className="modal-sheet__title">Measure Converter</h2>
          </div>
          <button className="modal-sheet__close" type="button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="measure-converter-modal__body">
          <p className="measure-converter-modal__intro">
            Enter a feet &amp; inches measurement, then choose inches or feet.
          </p>

          <div className="measure-converter-modal__inputs">
            <div className="field-group field-group--full field-group--stepper-row field-group--inline-stepper">
              <label className="form-label" htmlFor="measure-ft">Feet</label>
              <NumberStepper
                label="Feet"
                value={feet}
                onChange={updateFeet}
              />
            </div>
            <div className="field-group field-group--full field-group--stepper-row field-group--inline-stepper">
              <label className="form-label" htmlFor="measure-in">Inches</label>
              <NumberStepper
                label="Inches"
                value={inches}
                onChange={updateInches}
              />
            </div>
          </div>

          <div className="measure-converter-modal__units" role="group" aria-label="Output unit">
            {OUTPUT_UNITS.map(option => (
              <button
                key={option.id}
                type="button"
                className={`measure-converter-modal__unit-btn${unit === option.id ? ' measure-converter-modal__unit-btn--active' : ''}`}
                aria-pressed={unit === option.id}
                onClick={() => {
                  setUnit(option.id)
                  setCopied(false)
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="measure-converter-modal__result" aria-live="polite">
            <span className="measure-converter-modal__result-label">Result</span>
            <span className={`measure-converter-modal__result-value${result == null || !hasInput ? ' measure-converter-modal__result-value--empty' : ''}`}>
              {hasInput && result != null ? `${result} ${unitLabel}` : '—'}
            </span>
          </div>
        </div>

        <div className="measure-converter-modal__actions">
          <button
            type="button"
            className="app-button app-button--secondary"
            onClick={handleClear}
            disabled={!hasInput}
          >
            Clear
          </button>
          <button
            type="button"
            className="app-button app-button--primary"
            onClick={handleCopy}
            disabled={!hasInput || result == null}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </>
  )
}
