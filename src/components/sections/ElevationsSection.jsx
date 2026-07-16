import { useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useInspection } from '../../context/InspectionContext'
import PhotoZone from '../PhotoZone'
import FieldsGrid from '../FieldsGrid'
import DamageDescriptionInput from '../DamageDescriptionInput'
import { ELEV_ITEMS, DIRECTIONS } from '../../data/elevItems'
import { fieldGroupProps } from '../../utils/fieldLayout'
import { fieldSelectClass, withSelectPlaceholderClass, ynOptionsForField } from '../../utils/fieldGrid'

function orderElevFields(fields = []) {
  const rest = []
  const nums = []
  const damaged = []

  for (const field of fields) {
    if (field.t === 'num') nums.push(field)
    else if (field.l === 'Damaged') damaged.push(field)
    else rest.push(field)
  }

  return [...rest, ...nums, ...damaged]
}

// ── Field Renderer — mirrors Cursor's RoofSection pattern ─────────
function FieldRenderer({ field, value, onChange }) {
  const { t, l, o, p } = field
  const lbl = <label className="form-label">{l}</label>

  if (t === 'yn' || t === 'radio') {
    const opts = t === 'yn' ? ynOptionsForField(field) : o
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

  if (t === 'num') {
    const currentValue = value === '' || value == null ? 0 : Number(value)
    const adjustValue = amount => {
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
    <div className="field-group">
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

// ── Elevation Item Row ────────────────────────────────────────────
function ElevItem({ itemDef, direction, trigPhoto }) {
  const { updateElevField, toggleElevExclude, removeElevPhoto, data } = useInspection()
  const { compactOptionPairRow } = itemDef
  const cellKey = `${itemDef.id}_${direction}`
  const cell = data.elevData[cellKey]
  const { excluded, photos } = cell

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
          <FieldsGrid
            fields={orderElevFields(itemDef.fields)}
            compactOptionPairRow={compactOptionPairRow}
            renderField={f => (
              <FieldRenderer
                key={f.l}
                field={f}
                value={cell.fields[f.l]}
                onChange={val => {
                  updateElevField(cellKey, f.l, val)
                  if (f.l === 'Damaged') {
                    if (val === 'No' || val === 'N/A') updateElevField(cellKey, '_damage', 'n/a')
                    else if (val !== 'Yes') updateElevField(cellKey, '_damage', '')
                  }
                }}
              />
            )}
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

  function trigPhoto(cellKey, mode) {
    activeCellRef.current = cellKey
    if (mode === 'cam') camRef.current?.click()
    else galRef.current?.click()
  }

  function handleFiles(e) {
    const cellKey = activeCellRef.current
    if (!cellKey) return
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => addElevPhoto(cellKey, ev.target.result)
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
