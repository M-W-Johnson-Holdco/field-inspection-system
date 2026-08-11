import { fieldGroupProps } from '../utils/fieldLayout'
import { measurementToDecimalInches } from '../utils/measurement'
import MeasurementInput from './MeasurementInput'

function roundTenths(value) {
  return Math.round(value * 10) / 10
}

function formatTenths(value) {
  if (!Number.isFinite(value) || value <= 0) return ''
  const rounded = roundTenths(value)
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function circumferenceFromDiameter(diameterValue) {
  const diameter = measurementToDecimalInches(diameterValue, { unitHint: 'inches' })
  if (diameter == null || diameter <= 0) return ''
  return formatTenths(Math.PI * diameter)
}

function diameterFromCircumference(circumferenceValue) {
  const circumference = measurementToDecimalInches(circumferenceValue, { unitHint: 'inches' })
  if (circumference == null || circumference <= 0) return ''
  return formatTenths(circumference / Math.PI)
}

export default function DiameterCircInput({
  field,
  diameterValue,
  circumferenceValue,
  onDiameterChange,
  onCircumferenceChange,
}) {
  const diameterLabel = field.diameterLabel || 'Diameter'
  const showCircumference = field.showCircumference !== false
  const circumferenceLabel = field.circumferenceLabel || 'Total Circumference'
  const showHeading = Boolean(field.l && field.l !== 'Diameter')
  const fieldHint = field.fieldHint || ''

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

      {fieldHint && (
        <p className="dimension-lw-input__hint">{fieldHint}</p>
      )}

      <div className="field-group field-group--full field-group--measurement dimension-lw-input__row">
        <label className="form-label">{diameterLabel}</label>
        <MeasurementInput
          field={{ l: diameterLabel, t: 'num' }}
          label={diameterLabel}
          value={diameterValue}
          onChange={handleDiameterChange}
          hideLabel
        />
      </div>

      {showCircumference && (
        <div className="field-group field-group--full field-group--measurement dimension-lw-input__row">
          <label className="form-label">{circumferenceLabel}</label>
          <MeasurementInput
            field={{ l: circumferenceLabel, t: 'num' }}
            label={circumferenceLabel}
            value={circDisplay}
            onChange={handleCircumferenceChange}
            hideLabel
          />
        </div>
      )}
    </div>
  )
}
