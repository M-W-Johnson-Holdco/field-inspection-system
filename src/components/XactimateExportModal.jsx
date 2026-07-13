import { X, Download } from 'lucide-react'
import {
  xactimateExportToCSV,
  xactimateExportToJSON,
  downloadTextFile,
} from '../lib/xactimateExport'

function slugify(value) {
  return String(value || 'inspection').trim().replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'inspection'
}

export default function XactimateExportModal({ exportData, onClose }) {
  const { job, lineItems } = exportData

  function handleDownloadCSV() {
    const base = slugify(job.customer)
    downloadTextFile(`${base}_xactimate_export.csv`, xactimateExportToCSV(exportData), 'text/csv')
  }

  function handleDownloadJSON() {
    const base = slugify(job.customer)
    downloadTextFile(`${base}_xactimate_export.json`, xactimateExportToJSON(exportData), 'application/json')
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-sheet xactimate-export-modal" role="dialog" aria-modal="true" aria-labelledby="xactimate-export-title">
        <div className="modal-sheet__header">
          <h2 id="xactimate-export-title" className="modal-sheet__title">Export Preview</h2>
          <button className="modal-sheet__close" type="button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="xactimate-export-modal__body">
          <div className="xactimate-export-modal__job">
            <strong>{job.customer || 'Unnamed customer'}</strong>
            <span>{job.address || 'No address'}</span>
            <span>{job.insuranceCo || 'No insurance'} — Claim {job.claimNumber || 'N/A'}</span>
          </div>

          {lineItems.length === 0 ? (
            <p className="xactimate-export-modal__empty">
              No line items yet — fill in roof, elevation, or exterior sections to populate this export.
            </p>
          ) : (
            <div className="xactimate-export-modal__table-wrap">
              <table className="xactimate-export-modal__table">
                <thead>
                  <tr>
                    <th>Trade</th>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Damaged</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((li, i) => (
                    <tr key={i} className={li.damaged ? 'xactimate-export-modal__row--damaged' : ''}>
                      <td>{li.trade}</td>
                      <td>{li.description}</td>
                      <td>{li.qty ?? '—'}</td>
                      <td>{li.unit}</td>
                      <td>{li.damaged === true ? 'Yes' : li.damaged === false ? 'No' : '—'}</td>
                      <td>{li.note || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="xactimate-export-modal__footer">
          <span className="xactimate-export-modal__count">
            {lineItems.length} line item{lineItems.length === 1 ? '' : 's'}
          </span>
          <div className="xactimate-export-modal__actions">
            <button
              className="app-button app-button--secondary"
              type="button"
              onClick={handleDownloadJSON}
              disabled={lineItems.length === 0}
            >
              <Download className="app-button__icon" aria-hidden="true" />
              <span className="app-button__label">Download JSON</span>
            </button>
            <button
              className="app-button app-button--primary"
              type="button"
              onClick={handleDownloadCSV}
              disabled={lineItems.length === 0}
            >
              <Download className="app-button__icon" aria-hidden="true" />
              <span className="app-button__label">Download CSV</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
