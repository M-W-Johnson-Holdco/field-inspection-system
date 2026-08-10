import { useRef } from 'react'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useInspection } from '../../context/InspectionContext'
import PhotoZone from '../PhotoZone'
import FieldsGrid from '../FieldsGrid'
import DamageDescriptionInput from '../DamageDescriptionInput'
import ItemNotesField from '../ItemNotesField'
import DimensionLwInput from '../DimensionLwInput'
import DiameterCircInput from '../DiameterCircInput'
import MeasurementInput, { isMeasurementField } from '../MeasurementInput'
import { ROOF_ITEMS, SUBSECTIONS } from '../../data/roofItems'
import { fieldGroupProps } from '../../utils/fieldLayout'
import { fieldSelectClass, materialOptionColumnStyle, withSelectPlaceholderClass, visibleFieldsForValues, ynOptionsForField, optionsForField } from '../../utils/fieldGrid'
import { DECIMAL_INPUT_PROPS, sanitizeDecimalInput } from '../../utils/decimalInput'
import { formatPitch, parsePitchNumerator } from '../../utils/pitch'
import useExpandedSection from '../../hooks/useExpandedSection'
import { getRoofItemStatus, isRoofItemActive } from '../../utils/roofItemStatus'
import { skylightAreaSqFt, skylightSizeBucket, skylightSizeLabel } from '../../utils/skylightSize'
import { sizeCounterLabel } from '../../utils/sizeCounterLabels'

// ── Field Renderer ─────────────────────────────────────────────────
function PitchInput({ field, value, onChange }) {
  const numeratorOnly = Boolean(field.showNumeratorOnly)
  const numerator = value != null && value !== '' ? parsePitchNumerator(value, 0) : null
  const displayValue = numerator == null ? '' : (numeratorOnly ? String(numerator) : formatPitch(numerator))
  const placeholder = numeratorOnly
    ? String(field.p != null && field.p !== '' ? parsePitchNumerator(field.p, 0) : 0)
    : (field.p || '4/12')
  const inputCh = Math.max(String(displayValue || placeholder || '').length, 3)

  function adjust(delta) {
    const base = numerator == null ? 0 : numerator
    onChange(formatPitch(base + delta))
  }

  function handleChange(e) {
    const raw = e.target.value.trim()
    if (!raw) {
      onChange('')
      return
    }
    onChange(formatPitch(parsePitchNumerator(raw, 0)))
  }

  return (
    <div {...fieldGroupProps(field)}>
      <label className="form-label">{field.l}</label>
      <div className={numeratorOnly ? 'number-stepper' : 'number-stepper number-stepper--pitch'}>
        <button
          type="button"
          className="number-stepper__btn"
          aria-label={`Decrease ${field.l}`}
          onClick={() => adjust(-1)}
        >
          −
        </button>
        {numeratorOnly ? (
          <input
            className="field-input number-stepper__input"
            style={{ '--field-ch': inputCh }}
            {...DECIMAL_INPUT_PROPS}
            value={displayValue}
            placeholder={placeholder}
            aria-label={field.l}
            onChange={handleChange}
          />
        ) : (
          <div className="number-stepper__pitch-value">
            <input
              className="field-input number-stepper__input number-stepper__pitch-input"
              {...DECIMAL_INPUT_PROPS}
              value={displayValue}
              placeholder={placeholder}
              aria-label={field.l}
              onChange={handleChange}
            />
          </div>
        )}
        <button
          type="button"
          className="number-stepper__btn"
          aria-label={`Increase ${field.l}`}
          onClick={() => adjust(1)}
        >
          +
        </button>
      </div>
    </div>
  )
}

function FieldRenderer({ field, value, onChange, subFields, onSubFieldChange }) {
  const { t, l, o, p } = field
  const labelText = field.displayLabel || l
  const lbl = (
    <label className="form-label">
      {labelText}
      {field.labelHint && (
        <span className="form-label__hint"> ({field.labelHint})</span>
      )}
    </label>
  )

  if (t === 'lwxw') {
    const lengthKey = field.lengthKey || 'Length (in)'
    const widthKey = field.widthKey || 'Width (in)'
    return (
      <DimensionLwInput
        field={field}
        lengthValue={subFields?.[lengthKey] ?? ''}
        widthValue={subFields?.[widthKey] ?? ''}
        onLengthChange={val => onSubFieldChange(lengthKey, val)}
        onWidthChange={val => onSubFieldChange(widthKey, val)}
      />
    )
  }

  if (t === 'diameter') {
    const diameterKey = field.diameterKey || 'Diameter (in)'
    const circumferenceKey = field.circumferenceKey || 'Circumference (in)'
    return (
      <DiameterCircInput
        field={field}
        diameterValue={subFields?.[diameterKey] ?? value ?? ''}
        circumferenceValue={subFields?.[circumferenceKey] ?? ''}
        onDiameterChange={val => onSubFieldChange(diameterKey, val)}
        onCircumferenceChange={val => onSubFieldChange(circumferenceKey, val)}
      />
    )
  }

  if (t === 'yn' || t === 'radio') {
    const opts = t === 'yn' ? ynOptionsForField(field) : optionsForField(field)
    return (
      <div {...fieldGroupProps(field)}>
        {lbl}
        <select
          className={fieldSelectClass(field)}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">Select</option>
          {opts.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    )
  }

  if (t === 'multiRadio' || t === 'multi') {
    const arr = Array.isArray(value) ? value : []
    const opts = optionsForField(field)
    const exclusiveNA = field.allowNA === true && opts.includes('N/A')

    function toggleMultiOption(opt) {
      let nextArr
      if (exclusiveNA && opt === 'N/A') {
        nextArr = arr.includes('N/A') ? [] : ['N/A']
      } else if (arr.includes(opt)) {
        nextArr = arr.filter(v => v !== opt)
      } else {
        nextArr = exclusiveNA
          ? [...arr.filter(v => v !== 'N/A'), opt]
          : [...arr, opt]
      }
      onChange(opts.filter(o => nextArr.includes(o)))
    }

    // Native device picker (same control as Yes/No): pick options one at a time.
    if (field.nativeMenu) {
      const ordered = opts.filter(opt => arr.includes(opt))
      const displayValue = ordered.length ? '__selected__' : ''
      const displayLabel = ordered.length ? ordered.join(', ') : 'Select'
      const selectClass = withSelectPlaceholderClass(
        fieldSelectClass(
          field.halfWidthDesktop ? { ...field, t: 'radio' } : field,
        ),
        displayValue,
      )
      const selectEl = (
        <select
          className={field.wrapSelected ? `${selectClass} field-select--native-multi-overlay` : selectClass}
          value={displayValue}
          onChange={e => {
            const next = e.target.value
            if (!next || next === '__selected__') return
            toggleMultiOption(next)
          }}
          aria-label={l}
        >
          <option value={displayValue} hidden>{displayLabel}</option>
          {opts.map(opt => (
            <option key={opt} value={opt}>
              {ordered.includes(opt) ? `✓ ${opt}` : opt}
            </option>
          ))}
        </select>
      )
      return (
        <div {...fieldGroupProps(field)}>
          {lbl}
          {field.wrapSelected ? (
            <div className={`native-multi-face${ordered.length ? '' : ' native-multi-face--placeholder'}`}>
              <span className="native-multi-face__text">{displayLabel}</span>
              {selectEl}
            </div>
          ) : (
            selectEl
          )}
        </div>
      )
    }

    return (
      <div {...fieldGroupProps(field)}>
        {lbl}
        <details className="multi-select">
          <summary className={withSelectPlaceholderClass('multi-select__summary', arr.length ? arr.join(', ') : '')}>
            <span>{arr.length ? arr.join(', ') : 'Select'}</span>
            <ChevronDown className="multi-select__icon" aria-hidden="true" />
          </summary>
          <div className="multi-select__menu">
            {opts.map(opt => (
              <label key={opt} className="multi-select__option">
                <input
                  type="checkbox"
                  checked={arr.includes(opt)}
                  onChange={() => toggleMultiOption(opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        </details>
        {arr.length > 0 && (
          <div className="multi-select__selected" aria-label={`Selected ${l}`}>
            {arr.map(opt => (
              <span key={opt} className="multi-select__chip">{opt}</span>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (t === 'select') {
    const selectValue = value || o[0]
    return (
      <div {...fieldGroupProps(field)}>
        {lbl}
        <select
          className={withSelectPlaceholderClass(fieldSelectClass(field), selectValue)}
          value={selectValue}
          onChange={e => onChange(e.target.value)}
        >
          {optionsForField(field).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    )
  }

  if (t === 'textarea') {
    return (
      <div {...fieldGroupProps(field)}>
        {lbl}
        <textarea
          className="field-textarea"
          value={value || ''}
          placeholder={p || ''}
          onChange={e => onChange(e.target.value)}
        />
      </div>
    )
  }

  const inputCh = Math.max(String(value || p || '').length, 3)

  if (isMeasurementField(field)) {
    return <MeasurementInput field={field} value={value} onChange={onChange} />
  }

  if (t === 'pitch') {
    return <PitchInput field={field} value={value} onChange={onChange} />
  }

  if (t === 'num') {
    const currentValue = value === '' || value == null ? 0 : Number(value)
    const adjustValue = amount => {
      const base = Number.isFinite(currentValue) ? currentValue : 0
      onChange(String(Math.max(0, base + amount)))
    }

    return (
      <div {...fieldGroupProps(field)}>
        {lbl}
        <div className="number-stepper">
          <button
            type="button"
            className="number-stepper__btn"
            aria-label={`Decrease ${l}`}
            onClick={() => adjustValue(-1)}
          >
            −
          </button>
          <input
            className="field-input number-stepper__input"
            style={{ '--field-ch': inputCh }}
            {...DECIMAL_INPUT_PROPS}
            value={value === '' || value == null ? '' : value}
            placeholder={p || '0'}
            onChange={e => onChange(sanitizeDecimalInput(e.target.value))}
          />
          <button
            type="button"
            className="number-stepper__btn"
            aria-label={`Increase ${l}`}
            onClick={() => adjustValue(1)}
          >
            +
          </button>
        </div>
      </div>
    )
  }

  return (
    <div {...fieldGroupProps(field)}>
      {lbl}
      <input
        className="field-input"
        style={{ '--field-ch': inputCh }}
        type="text"
        inputMode="text"
        value={value || ''}
        placeholder={p || ''}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

function selectValue(value) {
  if (value == null || value === '' || value === 'Select') return ''
  return String(value)
}

function collapsibleSubPills(itemId, fields = {}) {
  const grey = []
  const red = []

  if (itemId === 'ri12') {
    const size = String(fields.Size || '').match(/^(Small|Medium|Large)/)?.[1]
    if (size) grey.push(size)
    if (Array.isArray(fields.Damaged)) {
      ;['Cap', 'Stack', 'Flange'].forEach(part => {
        if (fields.Damaged.includes(part)) red.push(part)
      })
    }
  } else if (itemId === 'ri14') {
    const style = selectValue(fields.Style)
    if (style) grey.push(style)
    if (style && style !== 'Tubular') {
      const sizeLabel = skylightSizeLabel(skylightSizeBucket(skylightAreaSqFt(fields)))
      if (sizeLabel) grey.push(sizeLabel)
    }
    if (fields.Damaged === 'Yes') red.push('Damaged')
  } else if (itemId === 'ri15') {
    const length = selectValue(fields['Length'])
    if (length) grey.push(`${length} LF`)
  } else if (itemId === 'ri17') {
    const size = String(fields['Size / Width'] || '').match(/^(Small|Medium|Large)/)?.[1]
    const material = selectValue(fields.Material)
    const counter = selectValue(fields['Counter Flashing'])
    if (size) grey.push(size)
    if (material) grey.push(material)
    if (counter) grey.push(counter)
    if (fields['Cricket Present'] === 'Yes') grey.push('Cricket')
    if (fields.Damaged === 'Yes') red.push('Damaged')
  } else if (itemId === 'ri22') {
    const location = selectValue(fields.Location)
    const style = selectValue(fields.Style || fields['Style / Grade'])
    if (location) grey.push(location.startsWith('Other') ? 'Other' : location)
    if (style) grey.push(style.startsWith('Other') ? 'Other' : style)
    if (fields['Gutter Apron Existing?'] === 'Yes') grey.push('Gutter Apron')
    if (fields['Edgemetal Existing?'] === 'Yes') grey.push('Edgemetal')
    if (fields.Damaged === 'Yes') red.push('Damaged')
  } else if (itemId === 'ri23') {
    const type = selectValue(fields.Type)
    const style = selectValue(fields['Style / Grade'])
    if (type) grey.push(type.startsWith('Other') ? 'Other' : type)
    if (style) grey.push(style)
    if (fields.Damaged === 'Yes') red.push('Damaged')
  }

  return { grey, red }
}

function showSubItemDamageDescription(fields = {}) {
  return fields.Damaged === 'Yes'
    || (Array.isArray(fields.Damaged) && fields.Damaged.length > 0)
}

function CollapsibleRoofSubCard({
  itemId,
  title,
  sub,
  index,
  subFields,
  gridStyle,
  trigPhoto,
  onUpdateField,
  onRemove,
  onRemovePhoto,
}) {
  const [open, setOpen] = useExpandedSection(`roof:${itemId}:sub:${index}`, true)
  const { grey, red } = collapsibleSubPills(itemId, sub.fields || {})
  const showDamage = showSubItemDamageDescription(sub.fields || {})
  const itemLabel = `${title} #${index + 1}`

  return (
    <div className={`ri-sub-card${red.length ? ' ri-sub-card--damage' : ''}`}>
      <div className="int-room-header">
        <button
          type="button"
          className="int-room-toggle ri-collapsible-sub-toggle"
          aria-expanded={open}
          onClick={() => setOpen(value => !value)}
        >
          <span className="ri-sub-card__title">{itemLabel}</span>
          <ChevronDown
            className={`int-room-chevron${open ? ' int-room-chevron--open' : ''}`}
            aria-hidden="true"
          />
          <span className="ri-collapsible-sub-pills">
            {grey.map(pill => (
              <span key={`grey-${pill}`} className="int-room-story">{pill}</span>
            ))}
            {red.map(pill => (
              <span key={`red-${pill}`} className="int-damage-badge">{pill}</span>
            ))}
          </span>
        </button>
        <button
          type="button"
          className="int-btn-delete"
          onClick={() => {
            if (!window.confirm(`Are you sure you want to delete ${itemLabel}?`)) return
            onRemove()
          }}
          aria-label={`Delete ${itemLabel}`}
          title={`Delete ${itemLabel}`}
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className={`collapse-panel ${open ? 'collapse-panel--open' : ''}`} aria-hidden={!open}>
        <div className="collapse-panel__inner">
          <div className="ri-collapsible-sub-body">
            {subFields && subFields.length > 0 && (
              <FieldsGrid
                fields={visibleFieldsForValues(subFields, sub.fields || {})}
                gridStyle={gridStyle}
                renderField={field => {
                  let fieldValue = sub.fields?.[field.l]
                  if (field.l === '(Other)') {
                    const loc = sub.fields?.Location || ''
                    fieldValue = loc.startsWith('Other - ') ? loc.slice(8) : ''
                  }
                  if (field.l === 'Other Style') {
                    const style = sub.fields?.Style || ''
                    fieldValue = style.startsWith('Other - ') ? style.slice(8) : ''
                  }
                  if (field.l === 'Other Type') {
                    const type = sub.fields?.Type || ''
                    fieldValue = type.startsWith('Other - ') ? type.slice(8) : ''
                  }
                  return (
                    <FieldRenderer
                      key={field.l}
                      field={field}
                      value={fieldValue}
                      subFields={sub.fields}
                      onChange={value => onUpdateField(field.l, value)}
                      onSubFieldChange={onUpdateField}
                    />
                  )
                }}
              >
                {showDamage && (
                  <div className="ri-damage-row">
                    <label className="form-label">Damage Description</label>
                    <DamageDescriptionInput
                      placeholder="Describe damage..."
                      value={sub.fields?._damage || ''}
                      onChange={value => onUpdateField('_damage', value)}
                    />
                  </div>
                )}
                <ItemNotesField
                  value={sub.fields?._notes || ''}
                  onChange={value => onUpdateField('_notes', value)}
                />
                <PhotoZone
                  entityId={`${itemId}__sub_${index}`}
                  photos={sub.photos || []}
                  trigPhoto={trigPhoto}
                  onRemove={onRemovePhoto}
                  inlineActions
                />
              </FieldsGrid>
            )}

            {(!subFields || subFields.length === 0) && showDamage && (
              <div className="ri-damage-row">
                <label className="form-label">Damage Description</label>
                <DamageDescriptionInput
                  placeholder="Describe damage..."
                  value={sub.fields?._damage || ''}
                  onChange={value => onUpdateField('_damage', value)}
                />
              </div>
            )}

            {(!subFields || subFields.length === 0) && (
              <>
                <ItemNotesField
                  value={sub.fields?._notes || ''}
                  onChange={value => onUpdateField('_notes', value)}
                />
                <PhotoZone
                  entityId={`${itemId}__sub_${index}`}
                  photos={sub.photos || []}
                  trigPhoto={trigPhoto}
                  onRemove={onRemovePhoto}
                  inlineActions
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Check Item ────────────────────────────────────────────────────
function CheckItem({ itemDef, trigPhoto }) {
  const {
    updateRoofField, cycleRoofStatus,
    addRoofSubItem, removeRoofSubItem, updateRoofSubField,
    adjustRoofSubItemSizeCount,
    removeRoofPhoto, data,
  } = useInspection()

  const { id, lbl, flags, fields = [], addMore, addMoreLabel, subFields, addMoreAtTop, subItemPhotos, subFieldsUseMaterialColumnWidth, subItemSizeCounters, subItemTotalCounter, compactOptionPairRow } = itemDef
  const item = data.roofData[id]
  const { subItems, photos } = item
  const status = getRoofItemStatus(item)
  const active = isRoofItemActive(item)

  const hasP = flags.includes('P')
  const hasD = flags.includes('D')
  const hasInlineDamaged = fields.some(f => f.l === 'Damaged')
  const subItemLabel = (addMoreLabel || 'Item').replace('Add ', '')
  const showItemPhotos = hasP && !subItemPhotos
  const typeAboveSizeQty = Boolean(subItemSizeCounters?.editable)
  const visibleFields = visibleFieldsForValues(fields, item.fields || {})
  const leadingFields = typeAboveSizeQty
    ? visibleFields.filter(f => f.l === 'Type' || f.l === 'Painted')
    : []
  const mainFields = typeAboveSizeQty
    ? visibleFields.filter(f => f.l !== 'Type' && f.l !== 'Painted')
    : visibleFields

  function renderFieldControl(f) {
    return (
      <FieldRenderer
        key={f.l}
        field={f}
        value={item.fields[f.l]}
        onChange={val => {
          updateRoofField(id, f.l, val)
          if (f.l === 'Damaged') {
            if (Array.isArray(val)) {
              if (val.length === 0) updateRoofField(id, '_damage', 'n/a')
              else if ((item.fields['_damage'] || '') === 'n/a') updateRoofField(id, '_damage', '')
            } else if (val === 'No' || val === 'N/A') {
              updateRoofField(id, '_damage', 'n/a')
            } else if (val !== 'Yes') {
              updateRoofField(id, '_damage', '')
            }
          }
        }}
      />
    )
  }

  const damagedPartsSelected = Array.isArray(item.fields['Damaged']) && item.fields['Damaged'].length > 0
  const showMainDamageDescription = item.fields['Damaged'] === 'Yes' || damagedPartsSelected

  const sizeCounts = subItemSizeCounters
    ? Object.fromEntries(
        subItemSizeCounters.sizes.map(size => [size, 0]),
      )
    : null

  if (sizeCounts) {
    for (const sub of subItems || []) {
      if (subItemSizeCounters.fromMeasuredArea) {
        const bucket = skylightSizeBucket(skylightAreaSqFt(sub.fields || {}))
        if (bucket && bucket in sizeCounts) sizeCounts[bucket] += 1
        continue
      }
      let size = sub.fields?.[subItemSizeCounters.field]
      if (size == null || size === '' || size === 'Select') continue
      if (subItemSizeCounters.matchPrefix) {
        const raw = String(size)
        const key = subItemSizeCounters.sizes.find(s => raw.startsWith(s))
        if (key && key in sizeCounts) sizeCounts[key] += 1
        continue
      }
      size = String(size).replace(/"/g, '')
      if (size in sizeCounts) { sizeCounts[size] += 1; continue }
      const prefixMatch = Object.keys(sizeCounts).find(k => size.startsWith(`${k} - `))
      if (prefixMatch) sizeCounts[prefixMatch] += 1
    }
  }

  function renderSizeCounters() {
    if (!subItemSizeCounters || !sizeCounts) return null
    // Editable counters already show qty in the steppers — skip the summary row.
    if (subItemSizeCounters.editable) return null

    const counterClass = [
      'ri-size-counters',
      subItemSizeCounters.compact && 'ri-size-counters--compact',
      subItemSizeCounters.equalWidth && 'ri-size-counters--equal',
      subItemSizeCounters.equalWidth2 && 'ri-size-counters--equal-2',
    ].filter(Boolean).join(' ')

    const counters = (
      <div className={counterClass} aria-label={`${lbl} counts by ${subItemSizeCounters.counterLabel || 'size'}`}>
        {subItemSizeCounters.sizes.map(size => {
          const suffix = subItemSizeCounters.labelSuffix ?? '"'
          const label = sizeCounterLabel(size)
          // Abbreviated S/M/L/XL labels don't use the default inch suffix.
          const shownSuffix = label !== size ? '' : suffix
          return (
            <div key={size} className="ri-size-counter" aria-label={`${size}${suffix}: ${sizeCounts[size]}`}>
              <span className="ri-size-counter__label">{label}{shownSuffix}</span>
              <span className="ri-size-counter__value">{sizeCounts[size]}</span>
            </div>
          )
        })}
      </div>
    )

    if (!subItemSizeCounters.legend) return counters

    return (
      <div className="elev-size-counters">
        {counters}
        <p className="elev-size-counters__legend">{subItemSizeCounters.legend}</p>
      </div>
    )
  }

  function renderSizeAdjusters() {
    if (!subItemSizeCounters?.editable || !sizeCounts) return null

    return (
      <div className="ri-size-adjusters" aria-label={`${lbl} quantity inputs`}>
        {subItemSizeCounters.sizes.map(size => {
          const suffix = subItemSizeCounters.labelSuffix ?? '"'
          return (
            <div key={size} className="field-group field-group--full field-group--stepper-row field-group--inline-stepper">
              <label className="form-label">{size}{suffix} Qty</label>
              <div className="number-stepper">
                <button
                  type="button"
                  className="number-stepper__btn"
                  aria-label={`Remove one ${size}${suffix} ${lbl}`}
                  onClick={() => adjustRoofSubItemSizeCount(
                    id,
                    subItemSizeCounters.field,
                    size,
                    -1,
                  )}
                >
                  −
                </button>
                <input
                  className="field-input number-stepper__input"
                  {...DECIMAL_INPUT_PROPS}
                  value={sizeCounts[size]}
                  onChange={event => {
                    const nextCount = Math.max(0, Math.floor(Number(sanitizeDecimalInput(event.target.value)) || 0))
                    adjustRoofSubItemSizeCount(
                      id,
                      subItemSizeCounters.field,
                      size,
                      nextCount - sizeCounts[size],
                    )
                  }}
                  aria-label={`${size}${suffix} ${lbl} quantity`}
                />
                <button
                  type="button"
                  className="number-stepper__btn"
                  aria-label={`Add one ${size}${suffix} ${lbl}`}
                  onClick={() => adjustRoofSubItemSizeCount(
                    id,
                    subItemSizeCounters.field,
                    size,
                    1,
                  )}
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  function renderTotalCounter() {
    if (!subItemTotalCounter) return null
    const count = (subItems || []).length
    const label = subItemTotalCounter.label || 'Count'

    return (
      <div className="ri-size-counters ri-size-counters--compact" aria-label={`${lbl} ${label}`}>
        <div className="ri-size-counter" aria-label={`${label}: ${count}`}>
          <span className="ri-size-counter__label">{label}</span>
          <span className="ri-size-counter__value">{count}</span>
        </div>
      </div>
    )
  }

  function renderSubItems() {
    if (!addMore) return null

    return (
      <div className="ri-sub-items">
        {subItems.map((sub, idx) => (
          <CollapsibleRoofSubCard
            key={idx}
            itemId={id}
            title={subItemLabel}
            sub={sub}
            index={idx}
            subFields={subFields}
            gridStyle={subFieldsUseMaterialColumnWidth ? materialOptionColumnStyle() : undefined}
            trigPhoto={trigPhoto}
            onUpdateField={(label, value) => updateRoofSubField(id, idx, label, value)}
            onRemove={() => removeRoofSubItem(id, idx)}
            onRemovePhoto={removeRoofPhoto}
          />
        ))}
        {!addMoreAtTop && (
          <button
            type="button"
            className="ri-btn-add-sub"
            onClick={() => addRoofSubItem(id)}
          >
            + {addMoreLabel}
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      id={`nav-${id}`}
      data-nav-anchor={id}
      className={`ri-item${status === 'na' ? ' ri-item--excluded' : ''}${status === 'supplement' ? ' ri-item--supplement' : ''}`}
    >
      <div className="ri-item__top">
        <button
          type="button"
          className={`ri-item__toggle ri-item__toggle--${status}`}
          onClick={() => cycleRoofStatus(id)}
          title={
            status === 'present'
              ? 'Present — click for Supplement'
              : status === 'supplement'
                ? 'Supplement — click for N/A'
                : 'N/A — click for Present'
          }
          aria-label={
            status === 'present'
              ? `${lbl}: Present`
              : status === 'supplement'
                ? `${lbl}: Supplement`
                : `${lbl}: N/A`
          }
        >
          {status === 'na' ? 'N/A' : status === 'supplement' ? (
            <Plus size={18} strokeWidth={3} aria-hidden="true" />
          ) : (
            '✓'
          )}
        </button>
        <span className={`ri-item__name${status === 'na' ? ' ri-item__name--excl' : ''}${status === 'supplement' ? ' ri-item__name--supplement' : ''}`}>
          {lbl}
          {status === 'supplement' && (
            <span className="ri-item__status-pill ri-item__status-pill--supplement">Supplement</span>
          )}
        </span>
      </div>

      {active && (
        <div className="ri-item__body">

          {renderSizeCounters()}

          {leadingFields.length > 0 && (
            <FieldsGrid
              fields={leadingFields}
              compactOptionPairRow={compactOptionPairRow}
              renderField={renderFieldControl}
            />
          )}

          {renderSizeAdjusters()}
          {renderTotalCounter()}

          {addMore && addMoreAtTop && (
            <button
              type="button"
              className="ri-btn-add-sub ri-btn-add-sub--top"
              onClick={() => addRoofSubItem(id)}
            >
              + {addMoreLabel}
            </button>
          )}

          {(mainFields.length > 0 || showItemPhotos || (hasD && !hasInlineDamaged)) && (
            <FieldsGrid
              fields={mainFields}
              compactOptionPairRow={compactOptionPairRow}
              renderField={renderFieldControl}
            >
              {hasD && !hasInlineDamaged && (
                <FieldRenderer
                  field={{ t: 'yn', l: 'Damaged' }}
                  value={item.fields['Damaged']}
                  onChange={val => {
                    updateRoofField(id, 'Damaged', val)
                    if (val === 'No' || val === 'N/A') updateRoofField(id, '_damage', 'n/a')
                    else if (val !== 'Yes') updateRoofField(id, '_damage', '')
                  }}
                />
              )}
              {showMainDamageDescription && (
                <div className="ri-damage-row">
                  <label className="form-label">Damage Description</label>
                  <DamageDescriptionInput
                    placeholder="Describe damage..."
                    value={item.fields['_damage'] || ''}
                    onChange={val => updateRoofField(id, '_damage', val)}
                  />
                </div>
              )}
              {showItemPhotos && (
                <>
                  <ItemNotesField
                    value={item.fields['_notes'] || ''}
                    onChange={val => updateRoofField(id, '_notes', val)}
                  />
                  <PhotoZone
                    entityId={id}
                    photos={photos}
                    trigPhoto={trigPhoto}
                    onRemove={removeRoofPhoto}
                    inlineActions
                  />
                </>
              )}
            </FieldsGrid>
          )}

          {renderSubItems()}

        </div>
      )}
    </div>
  )
}

// ── Sub-section Card ──────────────────────────────────────────────
function SubSectionCard({ sectionKey, title, items, trigPhoto }) {
  const [isOpen, setIsOpen] = useExpandedSection(sectionKey, false)

  return (
    <section className={`app-card ri-card${isOpen ? ' ri-card--open' : ''}`}>
      <button
        type="button"
        className="ri-card__toggle"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(open => !open)}
      >
        <span className="section-eyebrow ri-card__eyebrow">{title}</span>
        <ChevronDown className="ri-card__chevron" aria-hidden="true" />
      </button>
      <div className={`collapse-panel ${isOpen ? 'collapse-panel--open' : ''}`} aria-hidden={!isOpen}>
        <div className="collapse-panel__inner">
          <div className="ri-card__content">
            {items.map(item => (
              <CheckItem key={item.id} itemDef={item} trigPhoto={trigPhoto} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Main Export ───────────────────────────────────────────────────
export default function RoofSection() {
  const { addRoofPhoto } = useInspection()
  const activeItemRef = useRef(null)
  const camRef = useRef(null)
  const galRef = useRef(null)

  function trigPhoto(itemId, mode) {
    activeItemRef.current = itemId
    if (mode === 'cam') camRef.current?.click()
    else galRef.current?.click()
  }

  function handleFiles(e) {
    const itemId = activeItemRef.current
    if (!itemId) return
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => addRoofPhoto(itemId, ev.target.result)
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const ssIds = Object.keys(SUBSECTIONS)
  const subsections = ssIds.map((startId, i) => {
    const from = ROOF_ITEMS.findIndex(it => it.id === startId)
    const to = i + 1 < ssIds.length
      ? ROOF_ITEMS.findIndex(it => it.id === ssIds[i + 1])
      : ROOF_ITEMS.length
    return { title: SUBSECTIONS[startId], items: ROOF_ITEMS.slice(from, to) }
  })

  return (
    <>
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        style={{ display: 'none' }}
        onChange={handleFiles}
      />
      <input
        ref={galRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFiles}
      />
      {subsections.map(({ title, items }) => (
        <SubSectionCard
          key={title}
          sectionKey={`roof:${title}`}
          title={title}
          items={items}
          trigPhoto={trigPhoto}
        />
      ))}
    </>
  )
}
