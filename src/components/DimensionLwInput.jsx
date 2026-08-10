import { fieldGroupProps } from '../utils/fieldLayout'
import {
  measurementToDecimalFeet,
  measurementToDecimalInches,
  measurementUnitHint,
} from '../utils/measurement'
import MeasurementInput from './MeasurementInput'

function formatArea(lengthValue, widthValue, areaUnit = 'ft²') {
  const unit = String(areaUnit || '')
  const useInches = /in/i.test(unit)
  const length = useInches
    ? measurementToDecimalInches(lengthValue, { unitHint: measurementUnitHint('Inches') })
    : measurementToDecimalFeet(lengthValue, { unitHint: measurementUnitHint('Feet') })
  const width = useInches
    ? measurementToDecimalInches(widthValue, { unitHint: measurementUnitHint('Inches') })
    : measurementToDecimalFeet(widthValue, { unitHint: measurementUnitHint('Feet') })
  if (length == null || width == null || length <= 0 || width <= 0) return null
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
  const areaValue = showArea ? formatArea(lengthValue, widthValue, areaUnit) : null
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

      <div className="field-group field-group--full field-group--measurement dimension-lw-input__row">
        <label className="form-label">{lengthLabel}</label>
        <MeasurementInput
          field={{ l: lengthLabel, t: 'num' }}
          label={lengthLabel}
          value={lengthValue}
          onChange={onLengthChange}
          hideLabel
        />
      </div>

      <div className="field-group field-group--full field-group--measurement dimension-lw-input__row">
        <label className="form-label">{widthLabel}</label>
        <MeasurementInput
          field={{ l: widthLabel, t: 'num' }}
          label={widthLabel}
          value={widthValue}
          onChange={onWidthChange}
          hideLabel
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
