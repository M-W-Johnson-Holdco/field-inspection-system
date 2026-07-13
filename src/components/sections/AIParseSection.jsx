import { useState } from 'react'
import { useInspection } from '../../context/InspectionContext'
import { formatPitch, parsePitchNumerator } from '../../utils/pitch'
import { formatPropertyAddress } from '../../utils/address'

const WORKER_URL = 'https://field-inspection-worker.k-liss.workers.dev'

// Maps AI JSON roof keys → { itemId, fieldLabel }
const ROOF_MAP = [
  { key: 'shingleStyle',            itemId: 'ri0',  label: 'Style' },
  { key: 'stories',                 itemId: 'ri0',  label: 'Stories' },
  { key: 'layers',                  itemId: 'ri0',  label: 'Layers' },
  { key: 'pitch',                   itemId: 'ri0',  label: 'Predominant Pitch' },
  { key: 'edgeFlashingType',        itemId: 'ri1',  label: 'Type' },
  { key: 'edgeMaterial',            itemId: 'ri1',  label: 'Material' },
  { key: 'edgePainted',             itemId: 'ri1',  label: 'Painted' },
  { key: 'edgeDamaged',             itemId: 'ri1',  label: 'Damaged' },
  { key: 'edgeDamageDescription',   itemId: 'ri1',  label: '_damage' },
  { key: 'underlaymentGrade',       itemId: 'ri2',  label: 'Grade' },
  { key: 'underlaymentLayers',      itemId: 'ri2',  label: 'Layers' },
  { key: 'underlaymentDamaged',     itemId: 'ri2',  label: 'Damaged' },
  { key: 'underlaymentDamageDescription', itemId: 'ri2', label: '_damage' },
  { key: 'ridgeCapGrade',           itemId: 'ri3',  label: 'Grade' },
  { key: 'ridgeCapExposure',        itemId: 'ri3',  label: 'Exposure (inches)' },
  { key: 'ridgeCapDamaged',         itemId: 'ri3',  label: 'Damaged' },
  { key: 'ridgeCapDamageDescription', itemId: 'ri3', label: '_damage' },
  { key: 'starterStyle',            itemId: 'ri4',  label: 'Style' },
  { key: 'starterDamaged',          itemId: 'ri4',  label: 'Damaged' },
  { key: 'starterDamageDescription', itemId: 'ri4', label: '_damage' },
  { key: 'valleyStyle',             itemId: 'ri5',  label: 'Style' },
  { key: 'valleyDamaged',           itemId: 'ri5',  label: 'Damaged' },
  { key: 'valleyDamageDescription', itemId: 'ri5',  label: '_damage' },
  { key: 'solarPanelQty',           itemId: 'ri24', label: 'Qty' },
  { key: 'solarPanelDamaged',       itemId: 'ri24', label: 'Damaged' },
  { key: 'solarPanelDamageDescription', itemId: 'ri24', label: '_damage' },
  { key: 'ridgeVentLF',             itemId: 'ri6',  label: 'Length (LF)' },
  { key: 'ridgeVentType',           itemId: 'ri6',  label: 'Type' },
  { key: 'ridgeVentPainted',        itemId: 'ri6',  label: 'Painted' },
  { key: 'boxVentQty',              itemId: 'ri7',  label: 'Qty' },
  { key: 'boxVentMaterial',         itemId: 'ri7',  label: 'Material' },
  { key: 'boxVentPainted',          itemId: 'ri7',  label: 'Painted' },
  { key: 'turbineQty',              itemId: 'ri8',  label: 'Qty' },
  { key: 'turbineMaterial',         itemId: 'ri8',  label: 'Material' },
  { key: 'turbinePainted',          itemId: 'ri8',  label: 'Painted' },
  { key: 'powerVentQty',            itemId: 'ri9',  label: 'Qty' },
  { key: 'powerVentPainted',        itemId: 'ri9',  label: 'Painted' },
  { key: 'solarVentQty',            itemId: 'ri10', label: 'Qty' },
  { key: 'solarVentPainted',        itemId: 'ri10', label: 'Painted' },
  { key: 'kickoutsNeeded',          itemId: 'ri13', label: 'Needed' },
  { key: 'kickoutsPainted',         itemId: 'ri13', label: 'Painted' },
  { key: 'rainDiverterQty',         itemId: 'ri15', label: 'Qty' },
  { key: 'rainDiverterLF',          itemId: 'ri15', label: 'Length (LF)' },
  { key: 'rainDiverterPainted',     itemId: 'ri15', label: 'Painted' },
  { key: 'powerMeterMastQty',       itemId: 'ri16', label: 'Qty' },
]
// Pipe jacks, exhaust stacks, chimneys, step/counter/L flashing, skylights,
// cornice gables, and low-slope sections are variable-length repeatables —
// each is imported directly from its roof.<key>[] array (see applyParsed),
// not through ROOF_MAP.

// Maps AI JSON elevation keys → { itemId, fieldLabel } per direction
const ELEV_MAP = [
  { key: 'sidingMaterial',       itemId: 'ev0',  label: 'Material' },
  { key: 'sidingDamage',         itemId: 'ev0',  label: 'Damaged' },
  { key: 'sidingDamageDescription', itemId: 'ev0', label: '_damage' },
  { key: 'fasciaMaterial',       itemId: 'ev1',  label: 'Material' },
  { key: 'fasciaDamage',         itemId: 'ev1',  label: 'Damaged' },
  { key: 'fasciaDamageDescription', itemId: 'ev1', label: '_damage' },
  { key: 'soffitMaterial',       itemId: 'ev2',  label: 'Material' },
  { key: 'soffitDamage',         itemId: 'ev2',  label: 'Damaged' },
  { key: 'soffitDamageDescription', itemId: 'ev2', label: '_damage' },
  { key: 'gutterMaterial',       itemId: 'ev3',  label: 'Material' },
  { key: 'gutterSize',           itemId: 'ev3',  label: 'Size (Inches)' },
  { key: 'gutterDamage',         itemId: 'ev3',  label: 'Damaged' },
  { key: 'gutterDamageDescription', itemId: 'ev3', label: '_damage' },
  { key: 'downspoutQty',         itemId: 'ev4',  label: 'Qty' },
  { key: 'downspoutMaterial',    itemId: 'ev4',  label: 'Material' },
  { key: 'downspoutDamage',      itemId: 'ev4',  label: 'Damaged' },
  { key: 'downspoutDamageDescription', itemId: 'ev4', label: '_damage' },
  { key: 'screenQty',            itemId: 'ev5',  label: 'Qty' },
  { key: 'screenDamage',         itemId: 'ev5',  label: 'Damaged' },
  { key: 'screenDamageDescription', itemId: 'ev5', label: '_damage' },
  { key: 'shutterMaterial',      itemId: 'ev6',  label: 'Material' },
  { key: 'shutterQty',           itemId: 'ev6',  label: 'Qty' },
  { key: 'shutterDamage',        itemId: 'ev6',  label: 'Damaged' },
  { key: 'shutterDamageDescription', itemId: 'ev6', label: '_damage' },
  { key: 'doorQty',              itemId: 'ev7',  label: 'Qty' },
  { key: 'doorMaterial',         itemId: 'ev7',  label: 'Material' },
  { key: 'stormDoor',            itemId: 'ev7',  label: 'Storm Door' },
  { key: 'doorDamage',           itemId: 'ev7',  label: 'Damaged' },
  { key: 'doorDamageDescription', itemId: 'ev7', label: '_damage' },
  { key: 'garageDoorQty',        itemId: 'ev8',  label: 'Qty' },
  { key: 'garageDoorMaterial',   itemId: 'ev8',  label: 'Material' },
  { key: 'garageDoorPanelStyle', itemId: 'ev8',  label: 'Panel Style' },
  { key: 'garageDoorDamage',     itemId: 'ev8',  label: 'Damaged' },
  { key: 'garageDoorDamageDescription', itemId: 'ev8', label: '_damage' },
  { key: 'acDamage',             itemId: 'ev9',  label: 'Damaged' },
  { key: 'acDamageDescription',  itemId: 'ev9',  label: '_damage' },
  { key: 'notes',                itemId: 'ev10', label: 'Notes' },
]

// Maps AI JSON exterior keys → { itemId, fieldLabel }
const EXTERIOR_MAP = [
  { key: 'fenceMaterial',          itemId: 'ei_fence',   label: 'Material' },
  { key: 'fenceStyle',             itemId: 'ei_fence',   label: 'Style' },
  { key: 'fencePosts',             itemId: 'ei_fence',   label: 'Posts' },
  { key: 'fencePostSpacing',       itemId: 'ei_fence',   label: 'Post Spacing (LF)' },
  { key: 'fenceHeight',            itemId: 'ei_fence',   label: 'Height (FT)' },
  { key: 'fenceStained',           itemId: 'ei_fence',   label: 'Stained' },
  { key: 'fenceDamage',            itemId: 'ei_fence',   label: '_damage' },
  { key: 'gatesQty',               itemId: 'ei_gates',   label: 'Qty' },
  { key: 'gatesMaterial',          itemId: 'ei_gates',   label: 'Material' },
  { key: 'gatesDamage',            itemId: 'ei_gates',   label: '_damage' },
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
  const {
    updateJobInfo, updateRoofField, updateElevField, updateExteriorField, updateNote,
    importRoofPipeJacks, importRoofExhaustStacks, importRoofChimneys, importRoofFlashingItems,
    importRoofLowSlopeItems, importRoofSkylights, importRoofCorniceGables, importRoofOtherStructures,
    importInteriorRooms,
  } = ctx

  // Job info
  const ji = parsed.jobInfo || {}
  const JOB_FIELDS = ['cust','phone','email','pm','insp','ins','claim','claimFileDate','stormDate','residenceType','tenantname','tenantphone','hasSeparateContact','contactName','contactPhone','contactEmail']
  JOB_FIELDS.forEach(f => { if (ji[f] != null) updateJobInfo(f, ji[f]) })
  if (ji.date != null && ji.claimFileDate == null) updateJobInfo('claimFileDate', ji.date)
  if (ji.preferredContact != null) {
    updateJobInfo('preferredContact', toArray(ji.preferredContact))
  }
  if (ji.contactPreferredContact != null) {
    updateJobInfo('contactPreferredContact', toArray(ji.contactPreferredContact))
  }

  // Property address — the form's source of truth is addrParts, with `addr` derived from it.
  if (ji.address1 || ji.city || ji.state || ji.zipcode) {
    const addrParts = {
      address1: ji.address1 || '',
      address2: ji.address2 || '',
      city: ji.city || '',
      state: String(ji.state || '').toUpperCase().slice(0, 2),
      zipcode: ji.zipcode || '',
    }
    updateJobInfo('addrParts', addrParts)
    updateJobInfo('addr', formatPropertyAddress(addrParts))
  } else if (ji.addr != null) {
    updateJobInfo('addr', ji.addr)
  }

  // Notes
  const notes = parsed.notes || {}
  Object.entries(notes).forEach(([k, v]) => { if (v != null) updateNote(k, v) })

  // Roof
  const roof = parsed.roof || {}
  ROOF_MAP.forEach(({ key, itemId, label }) => {
    let val = roof[key]
    if (val == null) return
    if (key === 'pitch') val = formatPitch(parsePitchNumerator(val, 0))
    if (key === 'shingleStyle') val = toArray(val)
    updateRoofField(itemId, label, val)
  })
  importRoofPipeJacks(roof)
  importRoofExhaustStacks(roof)
  importRoofChimneys(roof)
  importRoofFlashingItems(roof)
  importRoofLowSlopeItems(roof)
  importRoofSkylights(roof)
  importRoofCorniceGables(roof)
  importRoofOtherStructures(roof)

  const chimneyNotes = (Array.isArray(roof.chimneys) ? roof.chimneys : [])
    .map(c => c?.conditionNotes).filter(Boolean).join(' ')
  if (chimneyNotes) {
    updateNote('defects', notes.defects ? `${notes.defects} ${chimneyNotes}` : chimneyNotes)
  }

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

  // Interior rooms (variable-length)
  const interior = parsed.interior || {}
  importInteriorRooms(Array.isArray(interior.rooms) ? interior.rooms : [])

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
