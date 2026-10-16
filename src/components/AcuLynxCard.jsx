import { useEffect, useState } from 'react'
import { useInspection } from '../context/InspectionContext'
import { portalRequest } from '../lib/embed'
import { INSURANCE_COMPANIES } from '../data/insuranceCompanies'
import { formatPropertyAddress } from '../utils/address'
import { buildConditionSummaryPdf } from '../lib/conditionSummaryPdf'
import { buildXactimateExport, buildXactimatePdf } from '../lib/xactimateExport'
import { collectInspectionPhotos, slugify } from '../lib/inspectionPhotos'

// AcuLynx link for an inspection — only shown inside the employee portal,
// which holds the AcuLynx connection (see portalRequest in lib/embed.js).
// Find searches AcuLynx by job number, address or customer/job name (jobs
// often have no job number yet when inspected) and ranks the best match, the
// newest-created job winning ties; picking one fills job info and links the
// inspection by AcuLynx job id. File sends the condition
// summary + Xactimate PDFs to the job's "Roof Report" folder and the photos
// to its Photos & Videos. Photos already filed are remembered and skipped.

function canonicalInsurance(name) {
  const n = String(name || '').trim().toLowerCase()
  return INSURANCE_COMPANIES.find(c => c.toLowerCase() === n) || String(name || '').trim()
}

// AcuLynx strips spaces and special characters from file names.
function alFileName(base, ext) {
  return `${String(base).replace(/[^A-Za-z0-9_-]+/g, '_').replace(/_+/g, '_').slice(0, 80)}.${ext}`
}

function jobLabel(j) {
  return j?.jobNumber ? `job #${j.jobNumber}` : (j?.jobName || 'the AcuLynx job')
}

export default function AcuLynxCard() {
  const { data, updateJobInfo } = useInspection()
  const ji = data.jobInfo
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState({ kind: 'idle', text: '' }) // idle | busy | ok | error
  const [candidates, setCandidates] = useState(null)
  const [found, setFound] = useState(null)

  // The saved inspection loads after mount, and opening another inspection
  // swaps it — clear any half-finished search.
  useEffect(() => {
    setQuery('')
    setCandidates(null)
    setFound(null)
    setStatus({ kind: 'idle', text: '' })
  }, [ji.acculynxJobId])

  const linked = Boolean(ji.acculynxJobId)
  const busy = status.kind === 'busy'
  const canMatchInspection = Boolean(String(ji.addr || '').trim() || String(ji.cust || '').trim())

  async function handleFind() {
    const q = query.trim()
    if (!q && !canMatchInspection) return
    setCandidates(null)
    setFound(null)
    setStatus({ kind: 'busy', text: q ? `Searching AcuLynx for "${q}"…` : 'Searching AcuLynx for this address and customer…' })
    try {
      const { candidates: list } = await portalRequest('insp:al-search', q
        ? { query: q }
        : { address: ji.addr || formatPropertyAddress(ji.addrParts || {}), name: ji.cust })
      setCandidates(list)
      setStatus(list.length
        ? { kind: 'idle', text: '' }
        : { kind: 'error', text: 'No matching AcuLynx jobs found. Try the house number and street, or the customer last name.' })
    } catch (err) {
      setStatus({ kind: 'error', text: err.message })
    }
  }

  async function pick(candidate) {
    setStatus({ kind: 'busy', text: `Loading ${jobLabel(candidate)}…` })
    try {
      const job = await portalRequest('insp:al-lookup', { jobId: candidate.jobId })
      setFound(job)
      setCandidates(null)
      setStatus({ kind: 'idle', text: '' })
    } catch (err) {
      setStatus({ kind: 'error', text: err.message })
    }
  }

  function applyFound() {
    const a = found.address || {}
    // Filing history (incl. which photos were sent) belongs to the old job.
    if (found.jobId !== ji.acculynxJobId) updateJobInfo('acculynxFiled', null)
    updateJobInfo('acculynxJobId', found.jobId)
    updateJobInfo('acculynxJobNumber', found.jobNumber || '')
    updateJobInfo('acculynxJobName', found.jobName || '')
    if (found.customer) updateJobInfo('cust', found.customer)
    if (a.address1 || a.city) {
      const addrParts = { ...(ji.addrParts || {}), ...a }
      updateJobInfo('addrParts', addrParts)
      updateJobInfo('addr', formatPropertyAddress(addrParts))
    }
    if (found.insurance) updateJobInfo('ins', canonicalInsurance(found.insurance))
    if (found.claimNumber) updateJobInfo('claim', found.claimNumber)
    setFound(null)
  }

  async function handleFile() {
    const filed = ji.acculynxFiled
    if (filed?.at && !window.confirm(`The reports were already filed to AcuLynx on ${new Date(filed.at).toLocaleString()}. File them again? (Photos already filed are skipped.)`)) return

    setStatus({ kind: 'busy', text: 'Preparing reports and photos…' })
    try {
      const base = slugify(ji.cust || 'inspection') || 'inspection'
      const summaryDoc = buildConditionSummaryPdf(data).doc
      const xactDoc = buildXactimatePdf(buildXactimateExport(data))
      const documents = [
        { name: alFileName(`${base}_condition_summary`, 'pdf'), blob: summaryDoc.output('blob'), description: 'Inspection condition summary' },
        { name: alFileName(`${base}_xactimate_export`, 'pdf'), blob: xactDoc.output('blob'), description: 'Inspection Xactimate export' },
      ]
      const alreadyFiled = new Set(filed?.photos || [])
      const photos = []
      for (const p of collectInspectionPhotos(data)) {
        const key = p.name.replace(/\.[^.]+$/, '')
        if (alreadyFiled.has(key)) continue
        const blob = await (await fetch(p.url)).blob()
        const ext = /png/.test(blob.type) ? 'png' : /webp/.test(blob.type) ? 'webp' : 'jpg'
        photos.push({ key, name: alFileName(key, ext), blob, description: `Inspection photo - ${key}` })
      }

      setStatus({ kind: 'busy', text: `Uploading 0 of ${documents.length + photos.length}…` })
      const result = await portalRequest(
        'insp:al-file',
        { jobNumber: ji.acculynxJobNumber, jobId: ji.acculynxJobId, documents, photos },
        (done, total) => setStatus({ kind: 'busy', text: `Uploading ${done} of ${total}…` }),
      )

      const failed = result.results.filter(r => !r.ok)
      const keyByName = Object.fromEntries(photos.map(p => [p.name, p.key]))
      const newPhotos = result.results.filter(r => r.ok && r.kind === 'photo').map(r => keyByName[r.name] || r.name)
      updateJobInfo('acculynxFiled', {
        at: new Date().toISOString(),
        photos: [...alreadyFiled, ...newPhotos],
      })
      setStatus(failed.length
        ? { kind: 'error', text: `${result.results.length - failed.length} filed, ${failed.length} failed: ${failed.map(f => `${f.name} (${f.error})`).join('; ')}. Tap File again to retry the failed ones.` }
        : { kind: 'ok', text: `Filed to AcuLynx: 2 reports to "Roof Report" and ${newPhotos.length} photo${newPhotos.length === 1 ? '' : 's'}${alreadyFiled.size ? ` (${alreadyFiled.size} already there)` : ''}.` })
    } catch (err) {
      setStatus({ kind: 'error', text: err.message })
    }
  }

  const linkedLabel = jobLabel({ jobNumber: ji.acculynxJobNumber, jobName: ji.acculynxJobName })

  return (
    <section className="job-info-group al-card" aria-labelledby="al-card-heading">
      <h3 id="al-card-heading" className="job-info-group__title">AcuLynx Job</h3>
      {linked && !found && !candidates && (
        <p className="al-card__linked">
          Linked to {linkedLabel}
          {ji.acculynxFiled?.at ? ` · last filed ${new Date(ji.acculynxFiled.at).toLocaleString()}` : ''}
        </p>
      )}
      <div className="al-card__row">
        <input
          className="form-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleFind() }}
          placeholder={canMatchInspection ? 'Job #, address or name (blank = this inspection)' : 'Job #, address or customer name'}
          aria-label="Find AcuLynx job"
          disabled={busy}
        />
        <button type="button" className="al-card__btn" onClick={handleFind} disabled={busy || (!query.trim() && !canMatchInspection)}>
          {linked ? 'Change job' : 'Find job'}
        </button>
        <button type="button" className="al-card__btn al-card__btn--primary" onClick={handleFile} disabled={busy || !linked}
          title={linked ? 'Send the reports and photos to this AcuLynx job' : 'Find and link a job first'}>
          File to AcuLynx
        </button>
      </div>

      {candidates && candidates.length > 0 && (
        <ul className="al-card__results">
          {candidates.map((c, i) => (
            <li key={c.jobId}>
              <button type="button" className="al-card__result" onClick={() => pick(c)} disabled={busy}>
                <span className="al-card__result-name">
                  {c.jobName || 'Unnamed job'}
                  {i === 0 && <span className="al-card__badge">Best match</span>}
                </span>
                <span className="al-card__result-meta">
                  {c.jobNumber ? `#${c.jobNumber}` : 'No job # yet'}
                  {c.address ? ` · ${c.address}` : ''}
                  {c.createdDate ? ` · created ${new Date(c.createdDate).toLocaleDateString()}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {found && (
        <div className="al-card__found">
          <p><strong>{found.jobName || 'AcuLynx job'}</strong>{found.jobNumber ? ` — #${found.jobNumber}` : ' — no job # yet'}</p>
          <ul>
            <li>Customer: {found.customer || '—'}</li>
            <li>Address: {formatPropertyAddress(found.address || {}) || '—'}</li>
            <li>Insurance: {found.insurance || '—'}</li>
            <li>Claim #: {found.claimNumber || '—'}</li>
          </ul>
          <div className="al-card__row">
            <button type="button" className="al-card__btn al-card__btn--primary" onClick={applyFound}>Link job &amp; fill these in</button>
            <button type="button" className="al-card__btn" onClick={() => setFound(null)}>Cancel</button>
          </div>
          <p className="al-card__hint">Blank (—) fields are left as they are.</p>
        </div>
      )}

      {status.text && <p className={`al-card__status al-card__status--${status.kind}`}>{status.text}</p>}
    </section>
  )
}
