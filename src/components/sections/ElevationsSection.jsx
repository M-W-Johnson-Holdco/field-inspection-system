import { useRef, useState } from 'react'
import { ChevronDown, Trash2 } from 'lucide-react'
import { useInspection } from '../../context/InspectionContext'
import PhotoZone from '../PhotoZone'
import FieldsGrid from '../FieldsGrid'
import DamageDescriptionInput from '../DamageDescriptionInput'
import ItemNotesField from '../ItemNotesField'
import { ELEV_ITEMS, DIRECTIONS } from '../../data/elevItems'
import { directionLabel } from '../../utils/elevationCompass'
import { fieldGroupProps } from '../../utils/fieldLayout'
import { fieldSelectClass, withSelectPlaceholderClass, ynOptionsForField, optionsForField, visibleFieldsForValues } from '../../utils/fieldGrid'
import { DECIMAL_INPUT_PROPS, sanitizeDecimalInput } from '../../utils/decimalInput'
import MeasurementInput, { isMeasurementField } from '../MeasurementInput'
import DimensionLwInput from '../DimensionLwInput'
import useExpandedSection from '../../hooks/useExpandedSection'
import { countShutterSizeBuckets, shutterAreaSqIn, shutterSizeBucket, SHUTTER_SIZE_LEGEND } from '../../utils/shutterSize'
import { countScreenSizeBuckets, screenAreaSqFt, screenSizeBucket, SCREEN_SIZE_LEGEND } from '../../utils/screenSize'
import { sizeCounterLabel } from '../../utils/sizeCounterLabels'
import { countWindowSizeBuckets, windowAreaSqFt, windowSizeBucket, WINDOW_SIZE_LEGEND } from '../../utils/windowSize'

function elevSizeCounterConfig(itemDef, subItems) {
  if (itemDef.shutterSizeCounters) {
    return {
      sizes: ['Small', 'Medium', 'Large'],
      counts: countShutterSizeBuckets(subItems),
      legend: SHUTTER_SIZE_LEGEND,
      gridClass: 'ri-size-counters--equal',
      ariaLabel: 'Shutter counts by size',
    }
  }
  if (itemDef.windowSizeCounters) {
    return {
      sizes: ['Small', 'Medium', 'Large'],
      counts: countWindowSizeBuckets(subItems),
      legend: WINDOW_SIZE_LEGEND,
      gridClass: 'ri-size-counters--equal',
      ariaLabel: 'Window counts by size',
    }
  }
  if (itemDef.screenSizeCounters) {
    return {
      sizes: ['Small', 'Medium', 'Large', 'X-Large'],
      counts: countScreenSizeBuckets(subItems),
      legend: SCREEN_SIZE_LEGEND,
      gridClass: 'ri-size-counters--equal-4',
      ariaLabel: 'Window screen counts by size',
    }
  }
  return null
}

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
    else if (field.l === 'Painted') {
      // Doors keep Painted between Style and Size/Action
      if (fields.some(f => f.l === 'Action')) rest.push(field)
      else painted.push(field)
    }
    else if (field.t === 'num' && (field.l === 'Qty' || /^Qty \(/i.test(field.l))) qty.push(field)
    else if (field.t === 'num' && field.l === 'Story') story.push(field)
    else if (field.t === 'num' && (/\bLF\b/i.test(field.l) || field.l === 'Length' || field.lfFeetOnly)) lf.push(field)
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
function FieldRenderer({ field, value, onChange, subFields, onSubFieldChange }) {
  const { t, l, o, p } = field
  const labelText = field.displayL || l
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
        onLengthChange={val => onSubFieldChange?.(lengthKey, val)}
        onWidthChange={val => onSubFieldChange?.(widthKey, val)}
      />
    )
  }

  if (t === 'yn' || t === 'radio') {
    const opts = t === 'yn' ? ynOptionsForField(field) : optionsForField(field)
    if (field.buttons) {
      return (
        <div {...fieldGroupProps(field)}>
          {lbl}
          <div className="field-button-group" role="group" aria-label={l}>
            {opts.filter(opt => opt !== 'Select' && opt !== 'N/A').map(opt => (
              <button
                type="button"
                key={opt}
                className={`field-button-group__btn${value === opt ? ' field-button-group__btn--active' : ''}`}
                aria-pressed={value === opt}
                onClick={() => onChange(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )
    }
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

  if (t === 'num' && isMeasurementField(field)) {
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
  preserveFieldOrder,
  trigPhoto,
  onUpdateField,
  onRemove,
  onRemovePhoto,
}) {
  const [open, setOpen] = useExpandedSection(`elev:${cellKey}:sub:${index}`, true)
  const itemLabel = `${title} #${index + 1}`
  const showDamage = sub.fields?.Damaged === 'Yes'
  const lengthRaw = sub.fields?.['Length']
  const lengthPill = lengthRaw != null && String(lengthRaw).trim() !== ''
    ? String(lengthRaw).trim()
    : null
  const isDoor = cellKey.startsWith('ev7_')
  const doorStyle = sub.fields?.Style
  const doorLength = Number(sub.fields?.['Length (ft)'] ?? sub.fields?.['Length (in)'])
  const doorWidth = Number(sub.fields?.['Width (ft)'] ?? sub.fields?.['Width (in)'])
  const doorArea = Number.isFinite(doorLength) && Number.isFinite(doorWidth) && doorLength > 0 && doorWidth > 0
    ? `${doorLength * doorWidth} ft²`
    : null
  const doorPill = isDoor
    ? [doorStyle, doorArea].filter(Boolean).join(' · ') || null
    : null
  const isShutter = cellKey.startsWith('ev6_')
  const shutterArea = isShutter ? shutterAreaSqIn(sub.fields || {}) : null
  const shutterBucket = isShutter ? shutterSizeBucket(shutterArea) : null
  const shutterPill = shutterBucket
    ? (shutterArea != null ? `${shutterBucket} · ${shutterArea} in²` : shutterBucket)
    : null
  const isScreen = cellKey.startsWith('ev5_')
  const screenArea = isScreen ? screenAreaSqFt(sub.fields || {}) : null
  const screenBucket = isScreen ? screenSizeBucket(screenArea) : null
  const screenPill = screenBucket
    ? (screenArea != null ? `${screenBucket} · ${screenArea} ft²` : screenBucket)
    : null
  const isWindow = cellKey.startsWith('ev12_')
  const windowArea = isWindow ? windowAreaSqFt(sub.fields || {}) : null
  const windowBucket = isWindow ? windowSizeBucket(windowArea) : null
  const windowPill = windowBucket
    ? (windowArea != null ? `${windowBucket} · ${windowArea} ft²` : windowBucket)
    : null
  const isGarageDoor = cellKey.startsWith('ev8_')
  const garageType = sub.fields?.Type
  const garageTypePill = isGarageDoor && garageType && garageType !== 'Select' ? garageType : null
  const damagePill = (isGarageDoor || isShutter || isScreen || isWindow) && sub.fields?.Damaged === 'Yes' ? 'Damaged' : null
  const greyPills = [
    !isGarageDoor && !isShutter && !isScreen && !isWindow && !isDoor && lengthPill ? lengthPill : null,
    doorPill,
    shutterPill,
    screenPill,
    windowPill,
    garageTypePill,
  ].filter(Boolean)
  const redPills = [damagePill].filter(Boolean)
  const hasPills = greyPills.length > 0 || redPills.length > 0

  return (
    <div className={`ri-sub-card${redPills.length ? ' ri-sub-card--damage' : ''}`}>
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
          {hasPills && (
            <span className="ri-collapsible-sub-pills">
              {greyPills.map(pill => (
                <span key={`grey-${pill}`} className="int-room-story">{pill}</span>
              ))}
              {redPills.map(pill => (
                <span key={`red-${pill}`} className="int-damage-badge">{pill}</span>
              ))}
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
              fields={
                preserveFieldOrder
                  ? visibleFieldsForValues(subFields, sub.fields || {})
                  : orderElevFields(visibleFieldsForValues(subFields, sub.fields || {}))
              }
              renderField={field => (
                <FieldRenderer
                  key={field.l}
                  field={field}
                  value={sub.fields?.[field.l]}
                  onChange={value => onUpdateField(field.l, value)}
                  subFields={sub.fields || {}}
                  onSubFieldChange={onUpdateField}
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
              <ItemNotesField
                value={sub.fields?._notes || ''}
                onChange={value => onUpdateField('_notes', value)}
              />
              <PhotoZone
                entityId={`${cellKey}__sub_${index}`}
                photos={sub.photos || []}
                trigPhoto={trigPhoto}
                onRemove={onRemovePhoto}
                inlineActions
              />
            </FieldsGrid>
          </div>
        </div>
      </div>
    </div>
  )
}

function ElevFieldGroup({ title, sectionKey, defaultOpen = true, children }) {
  const [isOpen, setIsOpen] = useExpandedSection(sectionKey, defaultOpen)
  const panelId = `${sectionKey}-panel`
  const headingId = `${sectionKey}-heading`

  return (
    <section className={`job-info-group ${isOpen ? 'job-info-group--open' : ''}`}>
      <button
        type="button"
        className="job-info-group__toggle"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen(open => !open)}
      >
        <h3 id={headingId} className="job-info-group__title">{title}</h3>
        <ChevronDown className="job-info-group__chevron" aria-hidden="true" />
      </button>
      <div
        id={panelId}
        className={`collapse-panel ${isOpen ? 'collapse-panel--open' : ''}`}
        aria-hidden={!isOpen}
        aria-labelledby={headingId}
      >
        <div className="collapse-panel__inner">
          <div className="job-info-group__content">
            {children}
          </div>
        </div>
      </div>
    </section>
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
  const {
    compactOptionPairRow,
    addMore,
    addMoreLabel,
    subFields = [],
    fields = [],
    fieldGroups = [],
    preserveFieldOrder,
  } = itemDef
  const cellKey = `${itemDef.id}_${direction}`
  const cell = data.elevData[cellKey] || { excluded: false, fields: {}, subItems: [], photos: [], groupPhotos: {} }
  const { excluded, photos, subItems = [], groupPhotos = {} } = cell
  const subItemTitle = (addMoreLabel || 'Item').replace(/^Add\s+/, '')
  const sizeCounters = elevSizeCounterConfig(itemDef, subItems)

  function orderedVisibleFields(fieldList, values = cell.fields || {}) {
    const visible = visibleFieldsForValues(fieldList, values)
    return preserveFieldOrder ? visible : orderElevFields(visible)
  }

  function handleFieldChange(label, value) {
    updateElevField(cellKey, label, value)
    const prefixMatch = label.match(/^(Surface|Railing|Stairs) Damaged$/)
    if (label === 'Damaged' || prefixMatch) {
      const damageDescKey = prefixMatch
        ? `_${prefixMatch[1].toLowerCase()}_damage`
        : '_damage'
      if (value === 'No' || value === 'N/A') updateElevField(cellKey, damageDescKey, 'n/a')
      else if (value !== 'Yes') updateElevField(cellKey, damageDescKey, '')
    }
  }

  function renderFieldsGrid(fieldList, { footer = null } = {}) {
    return (
      <FieldsGrid
        fields={orderedVisibleFields(fieldList)}
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
              onChange={val => handleFieldChange(f.l, val)}
              subFields={cell.fields || {}}
              onSubFieldChange={handleFieldChange}
            />
          )
        }}
      >
        {footer}
      </FieldsGrid>
    )
  }

  function renderGroupFooter(group) {
    const damagedKey = `${group.keyPrefix} Damaged`
    const damageDescKey = `_${group.id}_damage`
    const notesKey = `_${group.id}_notes`
    const photoEntityId = `${cellKey}__group_${group.id}`
    const groupPhotoList = groupPhotos[group.id] || []
    return (
      <>
        {cell.fields?.[damagedKey] === 'Yes' && (
          <div className="ri-damage-row">
            <label className="form-label">Damage Description</label>
            <DamageDescriptionInput
              placeholder="Describe visible damage…"
              value={cell.fields?.[damageDescKey] || ''}
              onChange={val => updateElevField(cellKey, damageDescKey, val)}
            />
          </div>
        )}
        <ItemNotesField
          value={cell.fields?.[notesKey] || ''}
          onChange={val => updateElevField(cellKey, notesKey, val)}
        />
        <PhotoZone
          entityId={photoEntityId}
          photos={groupPhotoList}
          trigPhoto={trigPhoto}
          onRemove={removeElevPhoto}
          inlineActions
        />
      </>
    )
  }

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
              {sizeCounters && (
                <div className="elev-size-counters">
                  <div
                    className={`ri-size-counters ${sizeCounters.gridClass}`}
                    aria-label={sizeCounters.ariaLabel}
                  >
                    {sizeCounters.sizes.map(size => (
                      <div key={size} className="ri-size-counter" aria-label={`${size}: ${sizeCounters.counts[size]}`}>
                        <span className="ri-size-counter__label">{sizeCounterLabel(size)}</span>
                        <span className="ri-size-counter__value">{sizeCounters.counts[size]}</span>
                      </div>
                    ))}
                  </div>
                  <p className="elev-size-counters__legend">{sizeCounters.legend}</p>
                </div>
              )}
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
                    preserveFieldOrder={preserveFieldOrder}
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
          ) : fieldGroups.length > 0 ? (
            <div className="elev-field-groups">
              {fieldGroups.map(group => (
                <ElevFieldGroup
                  key={group.id}
                  title={group.title}
                  sectionKey={`elev:${cellKey}:group:${group.id}`}
                >
                  {renderFieldsGrid(group.fields || [], {
                    footer: group.keyPrefix ? renderGroupFooter(group) : null,
                  })}
                </ElevFieldGroup>
              ))}
              {fields.length > 0 && renderFieldsGrid(fields, {
                footer: (
                  <>
                    {cell.fields.Damaged === 'Yes' && (
                      <div className="ri-damage-row">
                        <label className="form-label">Damage Description</label>
                        <DamageDescriptionInput
                          placeholder="Describe visible damage…"
                          value={cell.fields._damage || ''}
                          onChange={val => updateElevField(cellKey, '_damage', val)}
                        />
                      </div>
                    )}
                    <ItemNotesField
                      value={cell.fields._notes || ''}
                      onChange={val => updateElevField(cellKey, '_notes', val)}
                    />
                    <PhotoZone
                      entityId={cellKey}
                      photos={photos}
                      trigPhoto={trigPhoto}
                      onRemove={removeElevPhoto}
                      inlineActions
                    />
                  </>
                ),
              })}
            </div>
          ) : (
            renderFieldsGrid(fields, {
              footer: (
                <>
                  {cell.fields.Damaged === 'Yes' && (
                    <div className="ri-damage-row">
                      <label className="form-label">Damage Description</label>
                      <DamageDescriptionInput
                        placeholder="Describe visible damage…"
                        value={cell.fields._damage || ''}
                        onChange={val => updateElevField(cellKey, '_damage', val)}
                      />
                    </div>
                  )}
                  <ItemNotesField
                    value={cell.fields._notes || ''}
                    onChange={val => updateElevField(cellKey, '_notes', val)}
                  />
                  <PhotoZone
                    entityId={cellKey}
                    photos={photos}
                    trigPhoto={trigPhoto}
                    onRemove={removeElevPhoto}
                    inlineActions
                  />
                </>
              ),
            })
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Export ───────────────────────────────────────────────────
export default function ElevationsSection() {
  const { data, addElevPhoto } = useInspection()
  const [activeDir, setActiveDir] = useState('Front')
  const activeCellRef = useRef(null)
  const camRef = useRef(null)
  const galRef = useRef(null)
  const frontOfRisk = data.jobInfo?.frontOfRiskDirection || ''

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
              {directionLabel(dir, frontOfRisk)}
            </button>
          ))}
        </div>

        <div className="elev-active-label">{directionLabel(activeDir, frontOfRisk)} Elevation</div>

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
