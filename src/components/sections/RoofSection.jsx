import { useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { useInspection } from '../../context/InspectionContext'
import PhotoZone from '../PhotoZone'
import FieldsGrid from '../FieldsGrid'
import DamageDescriptionInput from '../DamageDescriptionInput'
import DimensionLwInput from '../DimensionLwInput'
import MeasurementInput, { isLinearMeasurementField } from '../MeasurementInput'
import { ROOF_ITEMS, SUBSECTIONS } from '../../data/roofItems'
import { fieldGroupProps } from '../../utils/fieldLayout'
import { fieldSelectClass, materialOptionColumnStyle, withSelectPlaceholderClass, visibleFieldsForValues } from '../../utils/fieldGrid'
import { formatPitch, parsePitchNumerator } from '../../utils/pitch'
import useExpandedSection from '../../hooks/useExpandedSection'

// ── Field Renderer ─────────────────────────────────────────────────
function PitchInput({ field, value, onChange }) {
  const placeholder = field.p || '4/12'
  const displayValue = value ? formatPitch(parsePitchNumerator(value, 0)) : ''

  function adjust(delta) {
    const base = value ? parsePitchNumerator(value, 0) : 0
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
      <div className="number-stepper number-stepper--pitch">
        <button
          type="button"
          className="number-stepper__btn"
          aria-label={`Decrease ${field.l}`}
          onClick={() => adjust(-1)}
        >
          −
        </button>
        <div className="number-stepper__pitch-value">
          <input
            className="field-input number-stepper__input number-stepper__pitch-input"
            type="text"
            inputMode="numeric"
            value={displayValue}
            placeholder={placeholder}
            aria-label={field.l}
            onChange={handleChange}
          />
        </div>
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
  const lbl = <label className="form-label">{l}</label>

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

  if (t === 'yn' || t === 'radio') {
    const opts = t === 'yn' ? ['Yes', 'No'] : o
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
    return (
      <div {...fieldGroupProps(field)}>
        {lbl}
        <details className="multi-select">
          <summary className={withSelectPlaceholderClass('multi-select__summary', arr.length ? arr.join(', ') : '')}>
            <span>{arr.length ? arr.join(', ') : 'Select'}</span>
            <ChevronDown className="multi-select__icon" aria-hidden="true" />
          </summary>
          <div className="multi-select__menu">
            {o.map(opt => (
              <label key={opt} className="multi-select__option">
                <input
                  type="checkbox"
                  checked={arr.includes(opt)}
                  onChange={() => {
                    const next = arr.includes(opt)
                      ? arr.filter(v => v !== opt)
                      : [...arr, opt]
                    onChange(next)
                  }}
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
    return (
      <div {...fieldGroupProps(field)}>
        {lbl}
        <select
          className="field-select"
          value={value || o[0]}
          onChange={e => onChange(e.target.value)}
        >
          {o.map(opt => (
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

  if (isLinearMeasurementField(field)) {
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
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={value || ''}
            placeholder={p || '0'}
            onChange={e => onChange(e.target.value)}
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

// ── Check Item ────────────────────────────────────────────────────
function CheckItem({ itemDef, trigPhoto }) {
  const {
    updateRoofField, toggleRoofExclude,
    addRoofSubItem, removeRoofSubItem, updateRoofSubField,
    removeRoofPhoto, data,
  } = useInspection()

  const { id, lbl, flags, fields = [], addMore, addMoreLabel, subFields, addMoreAtTop, subItemPhotos, subItemDamaged, subFieldsUseMaterialColumnWidth, subItemSizeCounters, subItemTotalCounter, compactOptionPairRow } = itemDef
  const item = data.roofData[id]
  const { excluded, subItems, photos } = item

  const hasP = flags.includes('P')
  const hasD = flags.includes('D')
  const hasInlineDamaged = fields.some(f => f.l === 'Damaged')
  const subItemLabel = (addMoreLabel || 'Item').replace('Add ', '')
  const showItemPhotos = hasP && !subItemPhotos

  const sizeCounts = subItemSizeCounters
    ? Object.fromEntries(
        subItemSizeCounters.sizes.map(size => [size, 0]),
      )
    : null

  if (sizeCounts) {
    for (const sub of subItems || []) {
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

    const counterClass = [
      'ri-size-counters',
      subItemSizeCounters.compact && 'ri-size-counters--compact',
    ].filter(Boolean).join(' ')

    return (
      <div className={counterClass} aria-label={`${lbl} counts by ${subItemSizeCounters.counterLabel || 'size'}`}>
        {subItemSizeCounters.sizes.map(size => {
          const suffix = subItemSizeCounters.labelSuffix ?? '"'
          return (
          <div key={size} className="ri-size-counter" aria-label={`${size}${suffix}: ${sizeCounts[size]}`}>
            <span className="ri-size-counter__label">{size}{suffix}</span>
            <span className="ri-size-counter__value">{sizeCounts[size]}</span>
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
          <div key={idx} className="ri-sub-card">
            <div className="ri-sub-card__top">
              <span className="ri-sub-card__title">
                {subItemLabel} #{idx + 1}
              </span>
              <button
                type="button"
                className="ri-btn-remove"
                onClick={() => removeRoofSubItem(id, idx)}
              >
                Remove
              </button>
            </div>
            {subFields && subFields.length > 0 && (
              <FieldsGrid
                fields={visibleFieldsForValues(subFields, sub.fields || {})}
                gridStyle={subFieldsUseMaterialColumnWidth ? materialOptionColumnStyle() : undefined}
                renderField={f => {
                  let fieldValue = sub.fields[f.l]
                  if (f.l === '(Other)') {
                    const loc = sub.fields['Location'] || ''
                    fieldValue = loc.startsWith('Other - ') ? loc.slice(8) : ''
                  }
                  return (
                    <FieldRenderer
                      key={f.l}
                      field={f}
                      value={fieldValue}
                      subFields={sub.fields}
                      onChange={val => updateRoofSubField(id, idx, f.l, val)}
                      onSubFieldChange={(label, val) => updateRoofSubField(id, idx, label, val)}
                    />
                  )
                }}
              />
            )}
            {subItemDamaged && sub.fields['Damaged'] === 'Yes' && (
              <div className="ri-damage-row">
                <label className="form-label">Damage Description</label>
                <DamageDescriptionInput
                  placeholder="Describe damage..."
                  value={sub.fields['_damage'] || ''}
                  onChange={val => updateRoofSubField(id, idx, '_damage', val)}
                />
              </div>
            )}
            {hasP && subItemPhotos && (
              <PhotoZone
                entityId={`${id}__sub_${idx}`}
                photos={sub.photos || []}
                trigPhoto={trigPhoto}
                onRemove={removeRoofPhoto}
              />
            )}
          </div>
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
    <div className={`ri-item${excluded ? ' ri-item--excluded' : ''}`}>
      <div className="ri-item__top">
        <button
          type="button"
          className={`ri-item__toggle${excluded ? ' ri-item__toggle--excl' : ''}`}
          onClick={() => toggleRoofExclude(id)}
          title={excluded ? 'Click to include' : 'Click to mark as N/A'}
        >
          {excluded ? 'N/A' : '✓'}
        </button>
        <span className={`ri-item__name${excluded ? ' ri-item__name--excl' : ''}`}>
          {lbl}
        </span>
      </div>

      {!excluded && (
        <div className="ri-item__body">

          {renderSizeCounters()}
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

          {fields.length > 0 && (
            <FieldsGrid
              fields={fields}
              compactOptionPairRow={compactOptionPairRow}
              renderField={f => (
                <FieldRenderer
                  key={f.l}
                  field={f}
                  value={item.fields[f.l]}
                  onChange={val => {
                    updateRoofField(id, f.l, val)
                    if (f.l === 'Damaged') {
                      if (val === 'No') updateRoofField(id, '_damage', 'n/a')
                      else if (val !== 'Yes') updateRoofField(id, '_damage', '')
                    }
                  }}
                />
              )}
            >
              {hasD && !hasInlineDamaged && (
                <FieldRenderer
                  field={{ t: 'yn', l: 'Damaged' }}
                  value={item.fields['Damaged']}
                  onChange={val => {
                    updateRoofField(id, 'Damaged', val)
                    if (val === 'No') updateRoofField(id, '_damage', 'n/a')
                    else if (val !== 'Yes') updateRoofField(id, '_damage', '')
                  }}
                />
              )}
              {item.fields['Damaged'] === 'Yes' && (
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
                <PhotoZone
                  entityId={id}
                  photos={photos}
                  trigPhoto={trigPhoto}
                  onRemove={removeRoofPhoto}
                />
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
