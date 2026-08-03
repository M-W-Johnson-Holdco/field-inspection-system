import { isLinearMeasurementField } from './measurement'

function hasLongLabel(field) {
  const label = field.l || ''
  return label.length >= 14 || /\([^)]+\)/.test(label)
}

function usesStepperRow(field) {
  return field.t === 'num' || field.t === 'pitch' || field.t === 'lwxw'
}

function buildFieldGroupClass(field, extra = '') {
  const layout = ['multiRadio', 'multi', 'toggleMulti', 'textarea', 'lwxw', 'computedFenceLf'].includes(field.t)
    || field.full
    ? 'field-group--full'
    : 'field-group--compact'
  const measurement = isLinearMeasurementField(field) ? 'field-group--measurement' : ''
  const pitch = field.t === 'pitch' ? 'field-group--pitch' : ''
  const stepperRow = usesStepperRow(field) ? 'field-group--stepper-row' : ''
  const wideLabel = hasLongLabel(field) ? 'field-group--wide-label' : ''
  const optionSelect = field.t === 'radio' || field.t === 'select' ? 'field-group--option-select' : ''
  const fullRowMobile = field.fullRow ? 'field-group--full-row-mobile' : ''
  const halfWidthDesktop = field.halfWidthDesktop ? 'field-group--half-width-desktop' : ''
  // Label left / +/- right for all numeric steppers (opt out with inlineStepper: false)
  const inlineStepper = (
    (field.t === 'num' || field.t === 'pitch')
    && field.inlineStepper !== false
  ) ? 'field-group--inline-stepper' : ''
  const classes = [layout, measurement, pitch, stepperRow, wideLabel, optionSelect, fullRowMobile, halfWidthDesktop, inlineStepper, extra].filter(Boolean).join(' ')
  return classes ? `field-group ${classes}` : 'field-group'
}

export function fieldGroupClass(field, extra = '') {
  return buildFieldGroupClass(field, extra)
}

export function fieldGroupProps(field, extra = '') {
  return { className: buildFieldGroupClass(field, extra) }
}
