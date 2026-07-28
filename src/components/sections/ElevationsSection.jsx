import { useRef, useState } from 'react'
import { ChevronDown, Trash2 } from 'lucide-react'
import { useInspection } from '../../context/InspectionContext'
import PhotoZone from '../PhotoZone'
import FieldsGrid from '../FieldsGrid'
import DamageDescriptionInput from '../DamageDescriptionInput'
import { ELEV_ITEMS, DIRECTIONS } from '../../data/elevItems'
import { fieldGroupProps } from '../../utils/fieldLayout'
import { fieldSelectClass, withSelectPlaceholderClass, ynOptionsForField, optionsForField, visibleFieldsForValues } from '../../utils/fieldGrid'
import MeasurementInput, { isLinearMeasurementField } from '../MeasurementInput'
import useExpandedSection from '../../hooks/useExpandedSection'

function orderElevFields(fields = []) {
  const qty = []
  const lf = []
  const story = []
  const painted = []
  const rest = []
  const otherNums = []
  const damaged = []
  const hasWindowSizeQtys = fields.some(field => field.t === 'num' && /^Small\b/i.test(field.l))

  for (const field of fields) {
    if (field.l === 'Damaged') damaged.push(field)
    else if (field.l === 'Painted') painted.push(field)
    else if (field.t === 'num' && field.l === 'Qty') qty.push(field)
    else if (field.t === 'num' && field.l === 'Story') story.push(field)
    else if (field.t === 'num' && /\bLF\b/i.test(field.l)) lf.push(field)
    else if (field.t === 'num') otherNums.push(field)
    else rest.push(field)
  }

  // Qty + LF (downspouts / gutter guards): after other fields, Damaged last.
  // Size + LF (gutters): keep Size/LF together before Damaged.
  // Windows: per-size qty steppers, then Painted/Damaged.
  if (qty.length) return [...rest, ...otherNums, ...story, ...qty, ...lf, ...painted, ...damaged]
  if (story.length || hasWindowSizeQtys) return [...rest, ...story, ...otherNums, ...lf, ...painted, ...damaged]
  return [...rest, ...otherNums, ...lf, ...painted, ...damaged]
}

// ── Field Renderer — mirrors Cursor's RoofSection pattern ─────────
function FieldRenderer({ field, value, onChange }) {
  const { t, l, o, p } = field
  const lbl = <label className="form-label">{l}</label>

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
          <div className="multi-select__selected">
            {arr.map(opt => (
              <span key={opt} className="multi-select__chip">{opt}</span>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (t === 'select') {
    let selectValue = value || o[0]
    // "Other - custom" (siding Style) should keep the dropdown on Other
    if (typeof selectValue === 'string' && selectValue.startsWith('Other - ')) {
      selectValue = 'Other'
    }
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

  if (t === 'num' && isLinearMeasurementField(field)) {
    return <MeasurementInput field={field} value={value} onChange={onChange} />
  }

  if (t === 'num') {
    const empty = value === '' || value == null
    const placeholderNum = Number(p)
    const currentValue = empty
      ? (Number.isFinite(placeholderNum) ? placeholderNum : 0)
      : Number(value)
    const adjustValue = amount => {
      if (empty) {
        const start = Number.isFinite(placeholderNum) ? placeholderNum : 0
        // First + commits the placeholder; first - steps down from it
        onChange(String(Math.max(0, start + (amount > 0 ? 0 : amount))))
        return
      }
      const base = Number.isFinite(currentValue) ? currentValue : 0
      onChange(String(Math.max(0, base + amount)))
    }
    const inputCh = Math.max(String(value || p || '').length, 3)

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
            value={value === '' || value == null ? '' : value}
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
        type="text"
        value={value || ''}
        placeholder={p || ''}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

function ElevSubCard({
  cellKey,
  title,
  sub,
  index,
  subFields,
  trigPhoto,
  onUpdateField,
  onRemove,
  onRemovePhoto,
}) {
  const [open, setOpen] = useExpandedSection(`elev:${cellKey}:sub:${index}`, true)
  const itemLabel = `${title} #${index + 1}`
  const showDamage = sub.fields?.Damaged === 'Yes'
  const lengthRaw = sub.fields?.['Length (LF)']
  const lengthPill = lengthRaw != null && String(lengthRaw).trim() !== ''
    ? `${String(lengthRaw).trim()} LF`
    : null

  return (
    <div className="ri-sub-card">
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
          {lengthPill && (
            <span className="ri-collapsible-sub-pills">
              <span className="int-room-story">{lengthPill}</span>
            </span>
          )}
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
            <FieldsGrid
              fields={orderElevFields(visibleFieldsForValues(subFields, sub.fields || {}))}
              renderField={field => (
                <FieldRenderer
                  key={field.l}
                  field={field}
                  value={sub.fields?.[field.l]}
                  onChange={value => onUpdateField(field.l, value)}
                />
              )}
            >
              {showDamage && (
                <div className="ri-damage-row">
                  <label className="form-label">Damage Description</label>
                  <DamageDescriptionInput
                    placeholder="Describe visible damage…"
                    value={sub.fields?._damage || ''}
                    onChange={value => onUpdateField('_damage', value)}
                  />
                </div>
              )}
              <PhotoZone
                entityId={`${cellKey}__sub_${index}`}
                photos={sub.photos || []}
                trigPhoto={trigPhoto}
                onRemove={onRemovePhoto}
              />
            </FieldsGrid>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Elevation Item Row ────────────────────────────────────────────
function ElevItem({ itemDef, direction, trigPhoto }) {
  const {
    updateElevField,
    toggleElevExclude,
    removeElevPhoto,
    addElevSubItem,
    removeElevSubItem,
    updateElevSubField,
    data,
  } = useInspection()
  const { compactOptionPairRow, addMore, addMoreLabel, subFields = [], fields = [] } = itemDef
  const cellKey = `${itemDef.id}_${direction}`
  const cell = data.elevData[cellKey] || { excluded: false, fields: {}, subItems: [], photos: [] }
  const { excluded, photos, subItems = [] } = cell
  const subItemTitle = (addMoreLabel || 'Item').replace(/^Add\s+/, '')

  return (
    <div className={`ri-item${excluded ? ' ri-item--excluded' : ''}`}>
      <div className="ri-item__top">
        <button
          type="button"
          className={`ri-item__toggle${excluded ? ' ri-item__toggle--excl' : ''}`}
          onClick={() => toggleElevExclude(cellKey)}
          title={excluded ? 'Click to include' : 'Click to mark as N/A'}
        >
          {excluded ? 'N/A' : '✓'}
        </button>
        <span className={`ri-item__name${excluded ? ' ri-item__name--excl' : ''}`}>
          {itemDef.lbl}
        </span>
      </div>

      {!excluded && (
        <div className="ri-item__body">
          {addMore ? (
            <>
              {fields.length > 0 && (
                <FieldsGrid
                  fields={orderElevFields(visibleFieldsForValues(fields, cell.fields))}
                  renderField={f => (
                    <FieldRenderer
                      key={f.l}
                      field={f}
                      value={cell.fields[f.l]}
                      onChange={val => updateElevField(cellKey, f.l, val)}
                    />
                  )}
                />
              )}
              <div className="ri-sub-items">
                {subItems.map((sub, idx) => (
                  <ElevSubCard
                    key={idx}
                    cellKey={cellKey}
                    title={subItemTitle}
                    sub={sub}
                    index={idx}
                    subFields={subFields}
                    trigPhoto={trigPhoto}
                    onUpdateField={(label, value) => updateElevSubField(cellKey, idx, label, value)}
                    onRemove={() => removeElevSubItem(cellKey, idx)}
                    onRemovePhoto={removeElevPhoto}
                  />
                ))}
                <button
                  type="button"
                  className="ri-btn-add-sub"
                  onClick={() => addElevSubItem(cellKey)}
                >
                  + {addMoreLabel}
                </button>
              </div>
            </>
          ) : (
            <FieldsGrid
              fields={orderElevFields(visibleFieldsForValues(fields, cell.fields))}
              compactOptionPairRow={compactOptionPairRow}
              renderField={f => {
                let fieldValue = cell.fields[f.l]
                if (f.l === '(Other)') {
                  const style = cell.fields?.Style || ''
                  fieldValue = style.startsWith('Other - ') ? style.slice(8) : ''
                }
                return (
                  <FieldRenderer
                    key={f.l}
                    field={f}
                    value={fieldValue}
                    onChange={val => {
                      updateElevField(cellKey, f.l, val)
                      if (f.l === 'Damaged') {
                        if (val === 'No' || val === 'N/A') updateElevField(cellKey, '_damage', 'n/a')
                        else if (val !== 'Yes') updateElevField(cellKey, '_damage', '')
                      }
                    }}
                  />
                )
              }}
            >
              {cell.fields['Damaged'] === 'Yes' && (
                <div className="ri-damage-row">
                  <label className="form-label">Damage Description</label>
                  <DamageDescriptionInput
                    placeholder="Describe visible damage…"
                    value={cell.fields['_damage'] || ''}
                    onChange={val => updateElevField(cellKey, '_damage', val)}
                  />
                </div>
              )}
              <PhotoZone
                entityId={cellKey}
                photos={photos}
                trigPhoto={trigPhoto}
                onRemove={removeElevPhoto}
              />
            </FieldsGrid>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Export ───────────────────────────────────────────────────
export default function ElevationsSection() {
  const { addElevPhoto } = useInspection()
  const [activeDir, setActiveDir] = useState('Front')
  const activeCellRef = useRef(null)
  const camRef = useRef(null)
  const galRef = useRef(null)

  function trigPhoto(entityId, mode) {
    activeCellRef.current = entityId
    if (mode === 'cam') camRef.current?.click()
    else galRef.current?.click()
  }

  function handleFiles(e) {
    const target = activeCellRef.current
    if (!target) return
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => addElevPhoto(target, ev.target.result)
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  return (
    <>
      <input ref={camRef} type="file" accept="image/*" capture="environment" multiple style={{ display: 'none' }} onChange={handleFiles} />
      <input ref={galRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFiles} />

      <section className="app-card ri-card">
        <div className="elev-header">
          <p className="section-eyebrow" style={{ marginBottom: 0 }}>2. Elevations</p>
          <p className="elev-header__sub">Select a side, document each item.</p>
        </div>

        <div
          className="elev-dir-tabs"
          role="tablist"
          aria-label="House elevation sides"
          style={{ '--active-dir-index': DIRECTIONS.indexOf(activeDir), '--dir-count': DIRECTIONS.length }}
        >
          <span className="elev-dir-indicator" aria-hidden="true" />
          {DIRECTIONS.map(dir => (
            <button
              key={dir}
              type="button"
              role="tab"
              aria-selected={activeDir === dir}
              className={`elev-dir-tab${activeDir === dir ? ' elev-dir-tab--active' : ''}`}
              onClick={e => {
                setActiveDir(dir)
                e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
              }}
            >
              {dir}
            </button>
          ))}
        </div>

        <div className="elev-active-label">{activeDir} Elevation</div>

        <div key={activeDir} className="elev-items" role="tabpanel">
          {ELEV_ITEMS.map(item => (
            <ElevItem
              key={item.id}
              itemDef={item}
              direction={activeDir}
              trigPhoto={trigPhoto}
            />
          ))}
        </div>
      </section>
    </>
  )
}
