import { useRef, useState } from 'react'
import { CheckCircle, FileInput, Loader, Upload, X } from 'lucide-react'
import { parseXmlMeasurements } from '../lib/parseXmlMeasurements'
import ModalSheetBack from './ModalSheetBack'

function buildPreviewRows(parsed, existing) {
  const { address, pitch, squares, lineLengths, valleyPresent } = parsed
  const rows = []

  if (address?.address1) {
    const parts = [address.address1, address.city, address.state, address.zipcode].filter(Boolean)
    rows.push({ label: 'Property Address', value: parts.join(', '), overwrite: Boolean(existing?.addr) })
  }
  if (pitch) {
    rows.push({ label: 'Predominant Pitch (x/12)', value: pitch, overwrite: Boolean(existing?.pitch) })
  }
  if (squares != null && squares > 0) {
    rows.push({ label: "SQ's", value: String(squares), overwrite: Boolean(existing?.squares) })
  }
  if (lineLengths?.RIDGE > 0) {
    rows.push({
      label: 'Ridge Vent — Length',
      value: `${lineLengths.RIDGE} LF`,
      overwrite: Boolean(existing?.ridgeLF),
    })
  }
  if (valleyPresent) {
    rows.push({
      label: 'Valley',
      value: 'Include in inspection',
      overwrite: Boolean(existing?.valleyIncluded),
    })
  }

  return rows
}

export default function XmlImportModal({ existing, onApply, onBack, onClose }) {
  const fileInputRef = useRef(null)
  const [parsed, setParsed] = useState(null)
  const [fileName, setFileName] = useState('')
  const [status, setStatus] = useState('idle') // idle | reading | error | done
  const [error, setError] = useState(null)
  const [appliedRows, setAppliedRows] = useState([])

  const rows = parsed ? buildPreviewRows(parsed, existing) : []
  const hasOverwrites = rows.some(row => row.overwrite)
  const fieldCount = status === 'done' ? appliedRows.length : rows.length

  function openFilePicker() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setStatus('reading')
    setError(null)
    setParsed(null)
    setAppliedRows([])
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const next = parseXmlMeasurements(ev.target.result)
        setParsed(next)
        setStatus('idle')
      } catch {
        setParsed(null)
        setStatus('error')
        setError('Could not read this file. Make sure it is a valid EagleView measurements XML export.')
      }
    }
    reader.onerror = () => {
      setParsed(null)
      setStatus('error')
      setError('Could not read this file. Try again.')
    }
    reader.readAsText(file)
  }

  function handleApply() {
    if (!parsed || rows.length === 0) return
    onApply(parsed)
    setAppliedRows(rows)
    setStatus('done')
  }

  function handleClearFile() {
    setParsed(null)
    setFileName('')
    setStatus('idle')
    setError(null)
    setAppliedRows([])
  }

  const displayRows = status === 'done' ? appliedRows : rows

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-sheet import-modal" role="dialog" aria-modal="true" aria-labelledby="xml-import-title">
        <div className="modal-sheet__header">
          <div className="modal-sheet__header-main">
            {onBack && <ModalSheetBack onClick={onBack} />}
            <h2 id="xml-import-title" className="modal-sheet__title">Import Measurements</h2>
          </div>
          <button className="modal-sheet__close" type="button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="import-modal__body">
          {status !== 'done' && (
            <p className="import-modal__intro">
              Upload an EagleView measurements XML file to autofill property address, predominant pitch,
              SQ&apos;s, ridge length, and valley inclusion when available.
            </p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".xml,application/xml,text/xml"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {!parsed && status !== 'reading' && status !== 'done' && (
            <button type="button" className="import-modal__upload" onClick={openFilePicker}>
              <Upload size={22} aria-hidden="true" />
              <span className="import-modal__upload-title">Upload XML file</span>
              <span className="import-modal__upload-hint">EagleView export (.xml)</span>
            </button>
          )}

          {status === 'reading' && (
            <div className="modal-sheet__state">
              <Loader size={20} className="spin" />
              <span>Reading {fileName || 'file'}…</span>
            </div>
          )}

          {status === 'error' && error && (
            <div className="import-modal__error" role="alert">
              <p>{error}</p>
              <button type="button" className="app-button app-button--secondary" onClick={openFilePicker}>
                Choose another file
              </button>
            </div>
          )}

          {status === 'done' && (
            <div className="import-modal__status import-modal__status--done" role="status">
              <CheckCircle size={18} aria-hidden="true" />
              <span>
                Done — <strong>{fieldCount}</strong> field{fieldCount === 1 ? '' : 's'} populated.
              </span>
            </div>
          )}

          {parsed && status !== 'done' && (
            <div className="import-modal__file-row">
              <FileInput size={18} aria-hidden="true" />
              <span className="import-modal__file-name">{fileName}</span>
              <button type="button" className="import-modal__change-file" onClick={openFilePicker}>
                Change
              </button>
            </div>
          )}

          {parsed && status !== 'done' && (
            <div className={`import-modal__status ${rows.length ? 'import-modal__status--ready' : 'import-modal__status--empty'}`}>
              {rows.length
                ? `Found ${rows.length} field${rows.length === 1 ? '' : 's'} to autofill.`
                : 'No mappable fields were found in this file.'}
            </div>
          )}

          {displayRows.length > 0 && (
            <div className="import-modal__preview">
              <p className="import-modal__preview-title">
                {status === 'done' ? 'Fields filled' : 'Fields to autofill'}
              </p>
              <ul className="import-modal__rows">
                {displayRows.map(row => (
                  <li key={row.label} className="import-modal__row">
                    <span className="import-modal__row-label">{row.label}</span>
                    <span className="import-modal__row-value">
                      {row.value}
                      {status !== 'done' && row.overwrite && (
                        <span className="import-modal__overwrite">Will overwrite existing value</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              {status !== 'done' && !hasOverwrites && (
                <p className="import-modal__note">Fields not listed above are unchanged.</p>
              )}
            </div>
          )}

          {parsed && status !== 'done' && rows.length === 0 && (
            <p className="import-modal__empty">Try a different EagleView measurements XML export.</p>
          )}
        </div>

        <div className="import-modal__actions">
          {status === 'done' ? (
            <button type="button" className="app-button app-button--primary" onClick={onClose}>
              Close
            </button>
          ) : (
            <>
              <button type="button" className="app-button app-button--secondary" onClick={onClose}>
                Cancel
              </button>
              {parsed && rows.length > 0 && (
                <button type="button" className="app-button app-button--primary" onClick={handleApply}>
                  Apply {rows.length} field{rows.length === 1 ? '' : 's'}
                </button>
              )}
              {parsed && rows.length === 0 && (
                <button type="button" className="app-button app-button--secondary" onClick={handleClearFile}>
                  Choose another file
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
