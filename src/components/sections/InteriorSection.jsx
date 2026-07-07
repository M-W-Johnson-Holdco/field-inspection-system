import { useEffect, useRef } from 'react'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useInspection } from '../../context/InspectionContext'
import PhotoZone from '../PhotoZone'
import DamageDescriptionInput from '../DamageDescriptionInput'
import useExpandedSection from '../../hooks/useExpandedSection'
import { fieldGroupProps } from '../../utils/fieldLayout'
import { fieldSelectClass, withSelectPlaceholderClass } from '../../utils/fieldGrid'

const ROOM_PRESETS = [
  'Attic', 'Bathroom', 'Bedroom', 'Dining Room', 'Garage', 'Hallway',
  'Kitchen', 'Laundry Room', 'Living Room', 'Master Bathroom', 'Master Bedroom',
  'Office / Study', 'Other',
]

const STORY_OPTS = ['Basement', '1st Floor', '2nd Floor', '3rd Floor', 'Attic']

// ── Damage Field Pair ─────────────────────────────────────────────
function DamageField({ label, yesNoValue, notesValue, onYesNo, onNotes }) {
  const ynField = { t: 'yn', l: label }

  function handleYesNo(val) {
    onYesNo(val)
    if (val === 'No') onNotes('n/a')
    else if (val !== 'Yes') onNotes('')
  }

  return (
    <div className="int-damage-field">
      <div {...fieldGroupProps(ynField)}>
        <label className="form-label">{label}</label>
        <select
          className={withSelectPlaceholderClass(fieldSelectClass(ynField), yesNoValue)}
          value={yesNoValue || ''}
          onChange={e => handleYesNo(e.target.value)}
        >
          <option value="">Select</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </div>
      {yesNoValue === 'Yes' && (
        <DamageDescriptionInput
          placeholder={`Describe ${label.toLowerCase()}…`}
          value={notesValue || ''}
          onChange={onNotes}
        />
      )}
    </div>
  )
}

// ── Room Card ─────────────────────────────────────────────────────
function RoomCard({ room, trigPhoto }) {
  const { updateInteriorRoom, removeInteriorRoom, removeInteriorPhoto } = useInspection()
  const [open, setOpen] = useExpandedSection(`interior:room:${room.id}`, true)
  const f = room.fields
  const set = (field, val) => updateInteriorRoom(room.id, field, val)

  const damageTags = [
    f.ceilingDamage === 'Yes' && 'Ceiling Damage',
    f.wallDamage    === 'Yes' && 'Wall Damage',
    f.floorDamage   === 'Yes' && 'Floor Damage',
    f.moldPresent   === 'Yes' && 'Mold / Mildew',
  ].filter(Boolean)

  const hasDamage = damageTags.length > 0

  return (
    <div className={`app-card int-room-card${hasDamage ? ' int-room-card--damage' : ''}`}>
      {/* Header row */}
      <div className="int-room-header">
        <button
          type="button"
          className="int-room-toggle"
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
        >
          <span className="int-room-title">
            {room.name?.startsWith('Other - ') && room.customName ? room.customName : (room.name || 'Unnamed Room')}
            {f.story ? <span className="int-room-story">{f.story}</span> : null}
          </span>
          {damageTags.map(tag => (
            <span key={tag} className="int-damage-badge">{tag}</span>
          ))}
          <ChevronDown className={`int-room-chevron${open ? ' int-room-chevron--open' : ''}`} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="int-btn-delete"
          onClick={() => {
            if (confirm(`Remove "${room.name || 'this room'}"?`)) removeInteriorRoom(room.id)
          }}
          aria-label="Delete room"
          title="Delete room"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className={`collapse-panel ${open ? 'collapse-panel--open' : ''}`} aria-hidden={!open}>
        <div className="collapse-panel__inner">
          <div className="int-room-body">
            {/* Room identity */}
            <div className="int-room-identity">
              <div className="field-group">
                <label className="form-label">Room / Location</label>
                <select
                  className="field-select"
                  value={room.name?.startsWith('Other - ') ? 'Other' : (room.name || '')}
                  onChange={e => updateInteriorRoom(room.id, '_name', e.target.value)}
                >
                  <option value="">Select</option>
                  {ROOM_PRESETS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              {(room.name === 'Other' || room.name?.startsWith('Other - ')) && (
                <div className="field-group">
                  <label className="form-label">OTHER ROOM/LOCATION</label>
                  <input
                    className="field-input int-custom-name-input"
                    type="text"
                    value={room.customName || ''}
                    placeholder="e.g. Sun Room"
                    onChange={e => updateInteriorRoom(room.id, '_customName', e.target.value)}
                  />
                </div>
              )}
              <div className="field-group">
                <label className="form-label">Story</label>
                <select
                  className="field-select compact-select"
                  value={f.story || ''}
                  onChange={e => set('story', e.target.value)}
                >
                  <option value="">Select</option>
                  {STORY_OPTS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Damage fields */}
            <div className="int-damage-grid">
              <DamageField
                label="Ceiling Damage"
                yesNoValue={f.ceilingDamage}
                notesValue={f.ceilingNotes}
                onYesNo={v => set('ceilingDamage', v)}
                onNotes={v => set('ceilingNotes', v)}
              />
              <DamageField
                label="Wall Damage"
                yesNoValue={f.wallDamage}
                notesValue={f.wallNotes}
                onYesNo={v => set('wallDamage', v)}
                onNotes={v => set('wallNotes', v)}
              />
              <DamageField
                label="Floor Damage"
                yesNoValue={f.floorDamage}
                notesValue={f.floorNotes}
                onYesNo={v => set('floorDamage', v)}
                onNotes={v => set('floorNotes', v)}
              />
              <DamageField
                label="Mold / Mildew Present"
                yesNoValue={f.moldPresent}
                notesValue={f.moldNotes}
                onYesNo={v => set('moldPresent', v)}
                onNotes={v => set('moldNotes', v)}
              />
            </div>

            {/* General notes */}
            <div className="field-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">General Notes</label>
              <textarea
                className="field-textarea"
                placeholder="Any other observations for this room…"
                value={f.notes || ''}
                onChange={e => set('notes', e.target.value)}
              />
            </div>

            <PhotoZone
              entityId={room.id}
              photos={room.photos}
              trigPhoto={trigPhoto}
              onRemove={removeInteriorPhoto}
              fullWidth={false}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Export ───────────────────────────────────────────────────
export default function InteriorSection() {
  const { data, addInteriorRoom, addInteriorPhoto } = useInspection()
  const rooms = data.interiorData?.rooms || []
  const activeRoomRef = useRef(null)
  const latestRoomRef = useRef(null)
  const shouldScrollToNewRoom = useRef(false)
  const camRef = useRef(null)
  const galRef = useRef(null)

  useEffect(() => {
    if (!shouldScrollToNewRoom.current || rooms.length === 0) return
    shouldScrollToNewRoom.current = false
    requestAnimationFrame(() => {
      latestRoomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [rooms.length])

  function handleAddRoom() {
    shouldScrollToNewRoom.current = true
    addInteriorRoom()
  }

  function trigPhoto(roomId, mode) {
    activeRoomRef.current = roomId
    if (mode === 'cam') camRef.current?.click()
    else galRef.current?.click()
  }

  function handleFiles(e) {
    const roomId = activeRoomRef.current
    if (!roomId) return
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => addInteriorPhoto(roomId, ev.target.result)
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  return (
    <>
      <input ref={camRef} type="file" accept="image/*" capture="environment" multiple style={{ display: 'none' }} onChange={handleFiles} />
      <input ref={galRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFiles} />

      {/* Section header card */}
      <div className="app-card ri-card">
        <div className="elev-header">
          <p className="section-eyebrow" style={{ marginBottom: 0 }}>3. Interior Damage</p>
          <p className="elev-header__sub">Add each affected room and document damage.</p>
        </div>
      </div>

      {rooms.length === 0 && (
        <div className="app-card int-empty">
          <p className="int-empty__text">No rooms added yet. Tap <strong>Add Room</strong> to begin.</p>
          <button type="button" className="int-btn-add-room" onClick={handleAddRoom}>
            <Plus size={16} />
            Add Room
          </button>
        </div>
      )}

      {rooms.map((room, index) => (
        <div
          key={room.id}
          ref={index === rooms.length - 1 ? latestRoomRef : null}
          className="int-room-anchor"
        >
          <RoomCard room={room} trigPhoto={trigPhoto} />
        </div>
      ))}

      {rooms.length > 0 && (
        <div className="int-add-room-wrap">
          <button type="button" className="int-btn-add-room" onClick={handleAddRoom}>
            <Plus size={16} />
            Add Room
          </button>
        </div>
      )}
    </>
  )
}
