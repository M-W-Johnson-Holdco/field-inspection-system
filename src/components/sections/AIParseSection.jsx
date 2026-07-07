import { useState } from 'react'
import { useInspection } from '../../context/InspectionContext'
import { formatPitch, parsePitchNumerator } from '../../utils/pitch'

const WORKER_URL = 'https://tc-field-inspection-worker.k-liss.workers.dev'

// Maps AI JSON roof keys → { itemId, fieldLabel }
const ROOF_MAP = [
  { key: 'shingleStyle',            itemId: 'ri0',  label: 'Style' },
  { key: 'stories',                 itemId: 'ri0',  label: 'Stories' },
  { key: 'layers',                  itemId: 'ri0',  label: 'Layers' },
  { key: 'pitch',                   itemId: 'ri0',  label: 'Predominant Pitch' },
  { key: 'edgeFlashingType',        itemId: 'ri1',  label: 'Type' },
  { key: 'edgeMaterial',            itemId: 'ri1',  label: 'Material' },
  { key: 'edgePainted',             itemId: 'ri1',  label: 'Painted' },
  { key: 'underlaymentGrade',       itemId: 'ri2',  label: 'Grade' },
  { key: 'underlaymentLayers',      itemId: 'ri2',  label: 'Layers' },
  { key: 'ridgeCapGrade',           itemId: 'ri3',  label: 'Grade' },
  { key: 'ridgeCapExposure',        itemId: 'ri3',  label: 'Exposure (inches)' },
  { key: 'starterStyle',            itemId: 'ri4',  label: 'Style' },
  { key: 'valleyStyle',             itemId: 'ri5',  label: 'Style' },
  { key: 'ridgeVentLF',             itemId: 'ri6',  label: 'Length (LF)' },
  { key: 'ridgeVentType',           itemId: 'ri6',  label: 'Type' },
  { key: 'ridgeVentPainted',        itemId: 'ri6',  label: 'Painted' },
  { key: 'boxVentQty',              itemId: 'ri7',  label: 'Qty' },
  { key: 'boxVentMaterial',         itemId: 'ri7',  label: 'Material' },
  { key: 'boxVentPainted',          itemId: 'ri7',  label: 'Painted' },
  { key: 'turbineQty',              itemId: 'ri8',  label: 'Qty' },
  { key: 'powerVentQty',            itemId: 'ri9',  label: 'Qty' },
  { key: 'solarVentQty',            itemId: 'ri10', label: 'Qty' },
  { key: 'pipeJackType',            itemId: 'ri11', label: 'Type', subOnly: true },
  { key: 'pipeJackPainted',         itemId: 'ri11', label: 'Painted', subOnly: true },
  { key: 'pipeJack15qty',           itemId: 'ri11', label: 'Qty 1.5"', subOnly: true },
  { key: 'pipeJack2qty',            itemId: 'ri11', label: 'Qty 2"', subOnly: true },
  { key: 'pipeJack3qty',            itemId: 'ri11', label: 'Qty 3"', subOnly: true },
  { key: 'pipeJack4qty',            itemId: 'ri11', label: 'Qty 4"', subOnly: true },
  { key: 'exhaustStackDamaged',     itemId: 'ri12', label: 'Damaged', subOnly: true },
  { key: 'exhaustStackDamageTo',    itemId: 'ri12', label: 'Type', subOnly: true },
  { key: 'exhaustStackPainted',     itemId: 'ri12', label: 'Painted', subOnly: true },
  { key: 'kickoutsNeeded',          itemId: 'ri13', label: 'Needed' },
  { key: 'kickoutsPainted',         itemId: 'ri13', label: 'Painted' },
  { key: 'rainDiverterQty',         itemId: 'ri15', label: 'Qty' },
  { key: 'rainDiverterLF',          itemId: 'ri15', label: 'Length (LF)' },
  { key: 'rainDiverterPainted',     itemId: 'ri15', label: 'Painted' },
  { key: 'powerMeterMastQty',       itemId: 'ri16', label: 'Qty' },
  { key: 'chimneyDamaged',          itemId: 'ri17', label: 'Damaged', subOnly: true },
  { key: 'chimneySize',             itemId: 'ri17', label: 'Size / Width', subOnly: true },
  { key: 'chimneyQty',              itemId: 'ri17', label: 'Qty', subOnly: true },
  { key: 'chimneyPainted',          itemId: 'ri17', label: 'Painted', subOnly: true },
  { key: 'counterFlashingCondition',itemId: 'ri17', label: 'Counter Flashing', subOnly: true },
  { key: 'stepFlashingDamaged',     itemId: 'ri18', label: 'Damaged', subOnly: true },
  { key: 'stepFlashingPainted',     itemId: 'ri18', label: 'Painted', subOnly: true },
  { key: 'counterFlashingDamaged',  itemId: 'ri19', label: 'Damaged', subOnly: true },
  { key: 'counterFlashingPainted',  itemId: 'ri19', label: 'Painted', subOnly: true },
  { key: 'lFlashingDamaged',        itemId: 'ri20', label: 'Damaged', subOnly: true },
  { key: 'lFlashingPainted',        itemId: 'ri20', label: 'Painted', subOnly: true },
  { key: 'lowSlopeLocation',        itemId: 'ri22', label: 'Location', subOnly: true },
  { key: 'lowSlopeGrade',           itemId: 'ri22', label: 'Style / Grade', subOnly: true },
  { key: 'lowSlopePitch',           itemId: 'ri22', label: 'Pitch', subOnly: true },
  { key: 'lowSlopeDamaged',         itemId: 'ri22', label: 'Damaged', subOnly: true },
  { key: 'exposedRafters',          itemId: 'ri22', label: 'Exposed Rafters', subOnly: true },
]

// Maps AI JSON elevation keys → { itemId, fieldLabel } per direction
const ELEV_MAP = [
  { key: 'sidingMaterial',       itemId: 'ev0',  label: 'Material' },
  { key: 'sidingDamage',         itemId: 'ev0',  label: 'Damaged' },
  { key: 'fasciaMaterial',       itemId: 'ev1',  label: 'Material' },
  { key: 'fasciaDamage',         itemId: 'ev1',  label: 'Damaged' },
  { key: 'soffitMaterial',       itemId: 'ev2',  label: 'Material' },
  { key: 'soffitDamage',         itemId: 'ev2',  label: 'Damaged' },
  { key: 'gutterMaterial',       itemId: 'ev3',  label: 'Material' },
  { key: 'gutterSize',           itemId: 'ev3',  label: 'Size (Inches)' },
  { key: 'gutterDamage',         itemId: 'ev3',  label: 'Damaged' },
  { key: 'downspoutQty',         itemId: 'ev4',  label: 'Qty' },
  { key: 'downspoutMaterial',    itemId: 'ev4',  label: 'Material' },
  { key: 'downspoutDamage',      itemId: 'ev4',  label: 'Damaged' },
  { key: 'screenQty',            itemId: 'ev5',  label: 'Qty' },
  { key: 'screenDamage',         itemId: 'ev5',  label: 'Damaged' },
  { key: 'shutterMaterial',      itemId: 'ev6',  label: 'Material' },
  { key: 'shutterQty',           itemId: 'ev6',  label: 'Qty' },
  { key: 'shutterDamage',        itemId: 'ev6',  label: 'Damaged' },
  { key: 'doorQty',              itemId: 'ev7',  label: 'Qty' },
  { key: 'doorMaterial',         itemId: 'ev7',  label: 'Material' },
  { key: 'stormDoor',            itemId: 'ev7',  label: 'Storm Door' },
  { key: 'doorDamage',           itemId: 'ev7',  label: 'Damaged' },
  { key: 'garageDoorQty',        itemId: 'ev8',  label: 'Qty' },
  { key: 'garageDoorMaterial',   itemId: 'ev8',  label: 'Material' },
  { key: 'garageDoorPanelStyle', itemId: 'ev8',  label: 'Panel Style' },
  { key: 'garageDoorDamage',     itemId: 'ev8',  label: 'Damaged' },
  { key: 'acDamage',             itemId: 'ev9',  label: 'Damaged' },
  { key: 'notes',                itemId: 'ev10', label: 'Notes' },
]

// Maps AI JSON exterior keys → { itemId, fieldLabel }
const EXTERIOR_MAP = [
  { key: 'fenceMaterial',          itemId: 'ei_fence',   label: 'Material' },
  { key: 'fenceStyle',             itemId: 'ei_fence',   label: 'Style' },
  { key: 'fencePosts',             itemId: 'ei_fence',   label: 'Posts' },
  { key: 'fencePostSpacing',       itemId: 'ei_fence',   label: 'Post Spacing (LF)' },
  { key: 'fenceHeight',            itemId: 'ei_fence',   label: 'Height' },
  { key: 'fenceStained',           itemId: 'ei_fence',   label: 'Stained' },
  { key: 'fenceDamage',            itemId: 'ei_fence',   label: '_damage' },
  { key: 'gatesQty',               itemId: 'ei_gates',   label: 'Qty' },
  { key: 'gatesMaterial',          itemId: 'ei_gates',   label: 'Material' },
  { key: 'gatesDamage',            itemId: 'ei_gates',   label: '_damage' },
  { key: 'poolCoverDamaged',       itemId: 'ei_pool',    label: 'Pool Cover Damaged' },
  { key: 'poolEquipmentDamaged',   itemId: 'ei_pool',    label: 'Equipment Damaged' },
  { key: 'poolDamageNotes',        itemId: 'ei_pool',    label: '_damage' },
  { key: 'outdoorDamagedItems',    itemId: 'ei_outdoor', label: 'Damaged Items' },
  { key: 'outdoorNotes',           itemId: 'ei_outdoor', label: '_damage' },
  { key: 'deliveryPlacement',      itemId: 'ei_site',    label: 'Delivery / Trailer Placement' },
  { key: 'landscapingProtect',     itemId: 'ei_site',    label: 'Landscaping to Protect' },
  { key: 'okSaturdayBuild',        itemId: 'ei_site',    label: 'OK Saturday Build' },
  { key: 'pestControlFlashing',    itemId: 'ei_site',    label: 'Pest Control Flashing' },
  { key: 'gateCode',               itemId: 'ei_site',    label: 'Gate Code' },
  { key: 'overheadClearanceIssue', itemId: 'ei_site',    label: 'Overhead Clearance Issue' },
]

// Normalize chimney size to match the select option text
function normalizeChimneySize(val) {
  const v = String(val).toLowerCase().trim()
  if (v === 'small' || v.startsWith('small')) return 'Small (width < 24")'
  if (v === 'medium' || v.startsWith('medium')) return 'Medium (width 24"–36")'
  if (v === 'large' || v.startsWith('large')) return 'Large (width > 36")'
  return val
}

function normalizeGutterSize(val) {
  const match = String(val).match(/(\d+(?:\.\d+)?)/)
  return match ? match[1] : String(val).trim()
}

// Convert comma string from AI to array for multiRadio fields
function toArray(val) {
  if (Array.isArray(val)) return val
  if (!val) return []
  return String(val).split(',').map(s => s.trim()).filter(Boolean)
}

// Apply parsed JSON to InspectionContext
function applyParsed(parsed, ctx) {
  const { updateJobInfo, updateRoofField, updateElevField, updateExteriorField, updateNote, importRoofPipeJacks, importRoofExhaustStacks, importRoofChimneys, importRoofFlashingItems, importRoofLowSlopeItems } = ctx

  // Job info
  const ji = parsed.jobInfo || {}
  const JOB_FIELDS = ['cust','phone','email','addr','pm','insp','ins','claim','date','residenceType','tenantname','tenantphone','hasSeparateContact','contactName','contactPhone','contactEmail']
  JOB_FIELDS.forEach(f => { if (ji[f] != null) updateJobInfo(f, ji[f]) })
  if (ji.preferredContact != null) {
    updateJobInfo('preferredContact', toArray(ji.preferredContact))
  }
  if (ji.contactPreferredContact != null) {
    updateJobInfo('contactPreferredContact', toArray(ji.contactPreferredContact))
  }

  // Notes
  const notes = parsed.notes || {}
  Object.entries(notes).forEach(([k, v]) => { if (v != null) updateNote(k, v) })

  // Roof
  const roof = parsed.roof || {}
  ROOF_MAP.forEach(({ key, itemId, label, subOnly }) => {
    let val = roof[key]
    if (val == null || subOnly) return
    if (key === 'chimneySize') val = normalizeChimneySize(val)
    if (key === 'pitch') val = formatPitch(parsePitchNumerator(val, 0))
    if (key === 'shingleStyle' || key === 'exhaustStackDamageTo') val = toArray(val)
    updateRoofField(itemId, label, val)
  })
  importRoofPipeJacks(roof)
  importRoofExhaustStacks(roof)
  importRoofChimneys(roof)
  importRoofFlashingItems(roof)
  importRoofLowSlopeItems(roof)
  if (roof.chimneyConditionNotes != null) updateNote('defects', roof.chimneyConditionNotes)

  // Elevations
  const elevations = parsed.elevations || {}
  const DIRS = ['Front', 'Right', 'Rear', 'Left']
  DIRS.forEach(dir => {
    const dirData = elevations[dir] || {}
    ELEV_MAP.forEach(({ key, itemId, label }) => {
      let val = dirData[key]
      if (val == null) return
      if (key === 'gutterSize') val = normalizeGutterSize(val)
      updateElevField(`${itemId}_${dir}`, label, val)
    })
  })

  // Exterior
  const ext = parsed.exterior || {}
  EXTERIOR_MAP.forEach(({ key, itemId, label }) => {
    let val = ext[key]
    if (val == null) return
    if (key === 'outdoorDamagedItems') val = toArray(val)
    updateExteriorField(itemId, label, val)
  })
}

// ── Component ─────────────────────────────────────────────────────
export default function AIParseSection() {
  const ctx = useInspection()
  const [transcript, setTranscript] = useState('')
  const [status, setStatus] = useState('idle') // idle | parsing | done | error
  const [statusMsg, setStatusMsg] = useState('')
  const [flags, setFlags] = useState([])
  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText()
      if (text.trim()) setTranscript(text)
    } catch {
      alert('Clipboard access denied — paste manually.')
    }
  }

  async function handleParse() {
    if (!transcript.trim()) {
      alert('Paste a transcript first.')
      return
    }
    setStatus('parsing')
    setStatusMsg('Sending transcript to AI — this takes 10–20 seconds…')
    setFlags([])

    try {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcript.trim() }),
      })

      const json = await res.json()

      if (!res.ok || json.error) {
        throw new Error(json.error || `HTTP ${res.status}`)
      }

      applyParsed(json, ctx)

      const flagList = json.flags || []
      setFlags(flagList)
      const fieldCount = Object.values(json.jobInfo || {}).filter(Boolean).length
        + Object.values(json.notes || {}).filter(Boolean).length
        + Object.values(json.roof || {}).filter(Boolean).length
      setStatus('done')
      setStatusMsg(`Done — ${fieldCount} fields populated.${flagList.length ? ` ${flagList.length} fields flagged for review.` : ' All fields confident.'}`)
    } catch (err) {
      console.error('AI parse error:', err)
      setStatus('error')
      setStatusMsg(`Parse failed: ${err.message}. Check your connection and try again.`)
    }
  }

  return (
    <div className="ai-section">
      <p className="section-eyebrow">Section 6</p>
      <h2 className="section-title">AI Transcript Parser</h2>
      <p className="ai-section__hint">
        Dictate the inspection using Plaud, then paste the transcript below. AI will populate the form across all sections.
      </p>

      <div className="ai-card app-card">
        <div className="ai-card__label-row">
          <label className="ai-card__label">Transcript Text</label>
          {transcript
            ? <button className="ai-transcript-btn ai-card__corner-btn" onClick={() => { setTranscript(''); setStatus('idle'); setFlags([]) }}>Clear</button>
            : <button className="ai-transcript-btn ai-card__corner-btn" onClick={handlePaste}>Paste</button>
          }
        </div>
        <textarea
          className="ai-card__textarea"
          rows={12}
          placeholder={`Paste your Plaud transcript here.\n\nThe AI will extract: customer info, roof specs, measurements, ventilation, flashings, elevation details, interior damage, exterior items, and inspector notes.\n\nSpeak naturally — the AI handles variations in phrasing. After parsing, review any flagged fields before saving.`}
          value={transcript}
          onChange={e => setTranscript(e.target.value)}
        />
        <button
          className="ai-parse-btn"
          onClick={handleParse}
          disabled={status === 'parsing'}
        >
          {status === 'parsing' ? '⏳ Parsing…' : '🤖 Parse Transcript and Populate Form'}
        </button>

        {status !== 'idle' && (
          <div className={`ai-status ai-status--${status}`}>
            {statusMsg}
          </div>
        )}

        {flags.length > 0 && (
          <div className="ai-flags">
            <p className="ai-flags__header">Review these fields — AI was uncertain:</p>
            {flags.map((f, i) => (
              <div key={i} className="ai-flag-item">
                <strong>{f}</strong> — verify manually
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="ai-card app-card">
        <label className="ai-card__label">ℹ️ How It Works</label>
        <div className="ai-card__info">
          <p><strong>What populates automatically:</strong> Customer name, address, insurance info, roof specs, stories, pitch, layers, all vent types and quantities, pipe jacks, flashings, chimney, valley, underlayment — plus per-elevation details (siding, fascia, soffit, gutters, downspouts, screens, shutters, entry doors, garage doors, A/C) for all four sides. Also exterior items and all notes fields.</p>
          <p><strong>What requires manual entry:</strong> Photos (always manual) and any fields flagged for review below the Parse button.</p>
          <p><strong>Review before saving:</strong> Flagged fields are ones the AI was uncertain about. Always verify them before hitting Save.</p>
          <p><strong>Plaud tip:</strong> Walk through each section out loud by name. For example: "Roof — architectural shingles, two stories, four-twelve pitch, one layer. Ridge vent — twenty linear feet, metal, not painted. Front elevation — five-inch aluminum gutters, damaged. Two downspouts, aluminum, not damaged." The more structured your dictation, the fewer flags you'll see.</p>
        </div>
      </div>
    </div>
  )
}
