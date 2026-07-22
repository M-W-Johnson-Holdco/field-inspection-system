import { useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { useInspection } from '../../context/InspectionContext'
import PhotoZone from '../PhotoZone'
import FenceMeasureTool from '../FenceMeasureTool'
import FieldsGrid from '../FieldsGrid'
import DamageDescriptionInput from '../DamageDescriptionInput'
import MeasurementInput, { isLinearMeasurementField } from '../MeasurementInput'
import { EXTERIOR_ITEMS, EXTERIOR_SUBSECTIONS } from '../../data/exteriorItems'
import { fieldGroupProps } from '../../utils/fieldLayout'
import { fieldSelectClass, withSelectPlaceholderClass, ynOptionsForField, optionsForField } from '../../utils/fieldGrid'
import useExpandedSection from '../../hooks/useExpandedSection'

// Maps measured field labels → the fields-object key tracking whether AI filled them
const AI_FLAG_FIELDS = {
  'Height (FT)': '_heightAiFilled',
  'Post Spacing (LF)': '_postSpacingAiFilled',
}

// ── Field Renderer ─────────────────────────────────────────────────
function FieldRenderer({ field, value, onChange, aiFilled }) {
  const { t, l, o, p } = field
  const lbl = <label className="form-label">{l}</label>
  const extraClass = aiFilled ? 'field-group--ai-filled' : ''

  if (t === 'num' && isLinearMeasurementField(field)) {
    return <MeasurementInput field={field} value={value} onChange={onChange} aiFilled={aiFilled} />
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
          {opts.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
    )
  }

  if (t === 'multiRadio' || t === 'multi' || t === 'toggleMulti') {
    const arr = Array.isArray(value) ? value : []
    const opts = optionsForField(field)
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
                  onChange={() => onChange(arr.includes(opt) ? arr.filter(v => v !== opt) : [...arr, opt])}
                />
                {opt}
              </label>
            ))}
          </div>
        </details>
        {arr.length > 0 && (
          <div className="multi-select__selected">
            {arr.map(opt => <span key={opt} className="multi-select__chip">{opt}</span>)}
          </div>
        )}
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

  if (t === 'num') {
    const currentValue = value === '' || value == null ? 0 : Number(value)
    const adjustValue = amount => {
      const base = Number.isFinite(currentValue) ? currentValue : 0
      onChange(String(Math.max(0, base + amount)))
    }
    const inputCh = Math.max(String(value || p || '').length, 3)
    return (
      <div {...fieldGroupProps(field, extraClass)}>
        {lbl}
        <div className="number-stepper">
          <button type="button" className="number-stepper__btn" onClick={() => adjustValue(-1)} aria-label={`Decrease ${l}`}>−</button>
          <input
            className="field-input number-stepper__input"
            style={{ '--field-ch': inputCh }}
            type="number"
            inputMode="numeric"
            min="0"
            value={value === '' || value == null ? '' : value}
            placeholder={p || '0'}
            onChange={e => onChange(e.target.value)}
          />
          <button type="button" className="number-stepper__btn" onClick={() => adjustValue(1)} aria-label={`Increase ${l}`}>+</button>
        </div>
      </div>
    )
  }

  const inputCh = Math.max(String(value || p || '').length, 3)
  return (
    <div {...fieldGroupProps(field)}>
      {lbl}
      <input
        className="field-input"
        style={{ '--field-ch': inputCh }}
        type="text"
        value={value || ''}
        placeholder={p || ''}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

// ── Exterior Item Card ────────────────────────────────────────────
function ExteriorItem({ itemDef, trigPhoto }) {
  const { toggleExteriorExclude, updateExteriorField, removeExteriorPhoto, data } = useInspection()
  const { id, lbl, flags, fields, damageLabel, damagePlaceholder } = itemDef
  const item = data.exteriorData[id]
  const { excluded, photos } = item

  const hasP = flags.includes('P')
  const hasD = flags.includes('D')
  const damageStatus = item.fields._damagePresent || (item.fields._damage ? 'Yes' : '')

  function handleDamageStatus(nextStatus) {
    updateExteriorField(id, '_damagePresent', nextStatus)
    if (nextStatus === 'No' || nextStatus === 'N/A') updateExteriorField(id, '_damage', 'n/a')
    else if (nextStatus !== 'Yes') updateExteriorField(id, '_damage', '')
  }

  function handleFieldChange(label, val) {
    updateExteriorField(id, label, val)
    const flagKey = AI_FLAG_FIELDS[label]
    if (flagKey && item.fields[flagKey]) updateExteriorField(id, flagKey, false)
  }

  return (
    <div className={`ri-item${excluded ? ' ri-item--excluded' : ''}`}>
      <div className="ri-item__top">
        <button
          type="button"
          className={`ri-item__toggle${excluded ? ' ri-item__toggle--excl' : ''}`}
          onClick={() => toggleExteriorExclude(id)}
          title={excluded ? 'Click to include' : 'Click to mark as N/A'}
        >
          {excluded ? 'N/A' : '✓'}
        </button>
        <span className={`ri-item__name${excluded ? ' ri-item__name--excl' : ''}`}>{lbl}</span>
      </div>

      {!excluded && (
        <div className="ri-item__body">
          <FieldsGrid
            fields={fields}
            renderField={f => (
              <FieldRenderer
                key={f.l}
                field={f}
                value={item.fields[f.l]}
                onChange={val => handleFieldChange(f.l, val)}
                aiFilled={!!item.fields[AI_FLAG_FIELDS[f.l]]}
              />
            )}
          >
            {hasD && (
              <div className="ri-damage-row">
                <div className="field-group field-group--compact">
                  <label className="form-label">Damaged</label>
                  <select
                    className="field-select compact-select compact-select--yn"
                    value={damageStatus}
                    onChange={e => handleDamageStatus(e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                {damageStatus === 'Yes' && (
                  <>
                    <label className="form-label">{damageLabel || 'Damage Description'}</label>
                    <DamageDescriptionInput
                      placeholder={damagePlaceholder || 'Describe damage...'}
                      value={item.fields['_damage'] || ''}
                      onChange={val => updateExteriorField(id, '_damage', val)}
                    />
                  </>
                )}
              </div>
            )}
            {itemDef.cvMeasure && <FenceMeasureTool itemId={id} />}
            {hasP && (
              <PhotoZone
                entityId={id}
                photos={photos}
                trigPhoto={trigPhoto}
                onRemove={removeExteriorPhoto}
              />
            )}
          </FieldsGrid>

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
              <ExteriorItem key={item.id} itemDef={item} trigPhoto={trigPhoto} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Main Section ──────────────────────────────────────────────────
export default function ExteriorSection() {
  const { addExteriorPhoto } = useInspection()
  const activeItemRef = useRef(null)
  const camRef = useRef(null)
  const galRef = useRef(null)

  function trigPhoto(itemId, mode) {
    activeItemRef.current = itemId
    if (mode === 'cam') camRef.current?.click()
    else galRef.current?.click()
  }

  function handleFile(e) {
    const itemId = activeItemRef.current
    if (!itemId) return
    Array.from(e.target.files || []).forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => addExteriorPhoto(itemId, ev.target.result)
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  // Group items by subsection
  const subsectionKeys = Object.keys(EXTERIOR_SUBSECTIONS)
  const groups = subsectionKeys.map(startId => {
    const startIdx = EXTERIOR_ITEMS.findIndex(i => i.id === startId)
    const nextIdx = subsectionKeys.findIndex(k => k === startId) + 1
    const nextStartId = subsectionKeys[nextIdx]
    const endIdx = nextStartId ? EXTERIOR_ITEMS.findIndex(i => i.id === nextStartId) : EXTERIOR_ITEMS.length
    return {
      label: EXTERIOR_SUBSECTIONS[startId],
      items: EXTERIOR_ITEMS.slice(startIdx, endIdx),
    }
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
        onChange={handleFile}
      />
      <input
        ref={galRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFile}
      />

      {groups.map(group => (
        <SubSectionCard
          key={group.label}
          sectionKey={`exterior:${group.label}`}
          title={group.label}
          items={group.items}
          trigPhoto={trigPhoto}
        />
      ))}
    </>
  )
}
