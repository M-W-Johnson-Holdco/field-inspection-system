import { fieldGroupProps } from '../utils/fieldLayout'
import {
  MEASUREMENT_FRACTIONS,
  formatFractionDisplay,
  formatMeasurementParts,
  isLinearMeasurementField,
  isMeasurementField,
  measurementUnitHint,
  parseMeasurementParts,
} from '../utils/measurement'

const FEET_OPTIONS = Array.from({ length: 101 }, (_, i) => i)
const INCH_OPTIONS = Array.from({ length: 101 }, (_, i) => i)

function InlineSelect({
  label,
  options,
  value,
  onChange,
  formatOption,
}) {
  return (
    <label className="meas-inline__col">
      <span className="meas-inline__col-label">{label}</span>
      <select
        className="field-select meas-inline__select"
        value={String(value)}
        onChange={e => {
          const raw = e.target.value
          if (raw === '') {
            onChange('')
            return
          }
          const asNum = Number(raw)
          onChange(Number.isFinite(asNum) && String(asNum) === raw ? asNum : raw)
        }}
        aria-label={label}
      >
        {options.map(opt => (
          <option key={String(opt)} value={String(opt)}>
            {formatOption(opt)}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function MeasurementInput({
  field,
  value,
  onChange,
  label,
  hideLabel = false,
  className,
}) {
  const labelText = label || field?.displayL || field?.l || 'Measurement'
  // Prefer field key (e.g. "Length (in)") over display label for unit inference.
  const unitHint = measurementUnitHint(field?.l ? field : (label || field))
  const inchesOnly = Boolean(field?.inchesOnly)
  const rawParts = parseMeasurementParts(value, { unitHint })
  // Flatten legacy feet into the inches dial when Feet is hidden
  const parts = inchesOnly
    ? {
        feet: 0,
        inches: Math.min(100, Math.max(0, (Number(rawParts.feet) || 0) * 12 + (Number(rawParts.inches) || 0))),
        fraction: rawParts.fraction || '',
      }
    : rawParts

  function commit(next) {
    onChange(formatMeasurementParts(
      inchesOnly
        ? { feet: 0, inches: next.inches, fraction: next.fraction }
        : next,
    ))
  }

  const body = (
    <div className={`meas-inline${inchesOnly ? ' meas-inline--inches-only' : ''}`}>
      {!inchesOnly && (
        <InlineSelect
          label="Feet"
          options={FEET_OPTIONS}
          value={parts.feet}
          onChange={feet => commit({ ...parts, feet })}
          formatOption={n => `${n}'`}
        />
      )}
      <InlineSelect
        label="Inches"
        options={INCH_OPTIONS}
        value={parts.inches}
        onChange={inches => commit({ ...parts, inches })}
        formatOption={n => `${n}"`}
      />
      <InlineSelect
        label="Fraction"
        options={MEASUREMENT_FRACTIONS}
        value={parts.fraction || ''}
        onChange={fraction => commit({ ...parts, fraction })}
        formatOption={opt => `${formatFractionDisplay(opt)}"`}
      />
    </div>
  )

  if (hideLabel) {
    return <div className={className || 'meas-picker-mount'}>{body}</div>
  }

  return (
    <div {...fieldGroupProps(field, className)}>
      <label className="form-label">{labelText}</label>
      {body}
    </div>
  )
}

export { isLinearMeasurementField, isMeasurementField }
