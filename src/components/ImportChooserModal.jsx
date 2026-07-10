import { FileInput, Images, X } from 'lucide-react'

export default function ImportChooserModal({ onChooseMeasurements, onChooseImages, onClose }) {
  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-sheet import-chooser-modal" role="dialog" aria-modal="true" aria-labelledby="import-chooser-title">
        <div className="modal-sheet__header">
          <h2 id="import-chooser-title" className="modal-sheet__title">Import</h2>
          <button className="modal-sheet__close" type="button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="import-chooser-modal__body">
          <p className="import-chooser-modal__intro">
            Choose what you want to import into this inspection.
          </p>

          <div className="import-chooser-modal__options">
            <button type="button" className="import-chooser-modal__option" onClick={onChooseMeasurements}>
              <FileInput size={22} aria-hidden="true" />
              <span className="import-chooser-modal__option-title">Import measurements</span>
              <span className="import-chooser-modal__option-hint">EagleView XML autofill</span>
            </button>

            <button type="button" className="import-chooser-modal__option" onClick={onChooseImages}>
              <Images size={22} aria-hidden="true" />
              <span className="import-chooser-modal__option-title">Import images</span>
              <span className="import-chooser-modal__option-hint">Bulk upload and assign photos</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
