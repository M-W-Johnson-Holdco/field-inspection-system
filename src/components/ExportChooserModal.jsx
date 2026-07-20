import { ExternalLink, Images, X } from 'lucide-react'
import ModalSheetBack from './ModalSheetBack'

export default function ExportChooserModal({
  onChoosePreview,
  onChooseSavePhotos,
  savingPhotos = false,
  onBack,
  onClose,
}) {
  return (
    <>
      <div className="modal-backdrop" onClick={savingPhotos ? undefined : onClose} />
      <div
        className="modal-sheet import-chooser-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-chooser-title"
      >
        <div className="modal-sheet__header">
          <div className="modal-sheet__header-main">
            {onBack && <ModalSheetBack onClick={onBack} disabled={savingPhotos} />}
            <h2 id="export-chooser-title" className="modal-sheet__title">Export</h2>
          </div>
          <button
            className="modal-sheet__close"
            type="button"
            onClick={onClose}
            aria-label="Close"
            disabled={savingPhotos}
          >
            <X size={20} />
          </button>
        </div>

        <div className="import-chooser-modal__body">
          <p className="import-chooser-modal__intro">
            Choose how you want to export this inspection.
          </p>

          <div className="import-chooser-modal__options">
            <button
              type="button"
              className="import-chooser-modal__option"
              onClick={onChoosePreview}
              disabled={savingPhotos}
            >
              <ExternalLink size={22} aria-hidden="true" />
              <span className="import-chooser-modal__option-title">Export Preview</span>
              <span className="import-chooser-modal__option-hint">Line items, PDF, CSV, and JSON</span>
            </button>

            <button
              type="button"
              className="import-chooser-modal__option"
              onClick={onChooseSavePhotos}
              disabled={savingPhotos}
            >
              <Images size={22} aria-hidden="true" />
              <span className="import-chooser-modal__option-title">
                {savingPhotos ? 'Preparing photos…' : 'Save Photos'}
              </span>
              <span className="import-chooser-modal__option-hint">
                Share to Photos on phone, or download a ZIP on computer
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
