import { X, Download, FileText } from 'lucide-react'
import {
  xactimateExportToCSV,
  downloadTextFile,
  downloadXactimatePdf,
} from '../lib/xactimateExport'
import ModalSheetBack from './ModalSheetBack'

function slugify(value) {
  return String(value || 'inspection').trim().replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'inspection'
}

export default function XactimateExportModal({ exportData, inspectionData, onBack, onClose }) {
  const { job, lineItems } = exportData
  const base = slugify(job.customer || inspectionData?.jobInfo?.cust)

  function handleDownloadCSV() {
    downloadTextFile(`${base}_xactimate_export.csv`, xactimateExportToCSV(exportData), 'text/csv')
  }

  function handleDownloadJSON() {
    // Same payload shape as the IndexedDB "current" snapshot.
    const snapshot = inspectionData || {}
    downloadTextFile(
      `${base}_inspection.json`,
      JSON.stringify(snapshot, null, 2),
      'application/json',
    )
  }

  function handleDownloadPDF() {
    downloadXactimatePdf(exportData, `${base}_xactimate_export.pdf`)
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-sheet xactimate-export-modal" role="dialog" aria-modal="true" aria-labelledby="xactimate-export-title">
        <div className="modal-sheet__header">
          <div className="modal-sheet__header-main">
            {onBack && <ModalSheetBack onClick={onBack} />}
            <h2 id="xactimate-export-title" className="modal-sheet__title">Export Preview</h2>
          </div>
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
              onClick={handleDownloadPDF}
              disabled={lineItems.length === 0}
            >
              <FileText className="app-button__icon" aria-hidden="true" />
              <span className="app-button__label">Download PDF</span>
            </button>
            <button
              className="app-button app-button--secondary"
              type="button"
              onClick={handleDownloadJSON}
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
