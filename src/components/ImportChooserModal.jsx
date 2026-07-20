import { useRef, useState } from 'react'
import { Braces, FileInput, Images, X } from 'lucide-react'
import ModalSheetBack from './ModalSheetBack'

function isInspectionSnapshot(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false
  // Reject Xactimate export shape ({ job, lineItems })
  if (data.lineItems && data.job && !data.jobInfo && !data.roofData) return false
  return Boolean(
    data.jobInfo
    || data.roofData
    || data.elevData
    || data.interiorData
    || data.exteriorData
    || data.notesData,
  )
}

export default function ImportChooserModal({
  onChooseMeasurements,
  onChooseImages,
  onChooseJson,
  onBack,
  onClose,
}) {
  const fileRef = useRef(null)
  const [error, setError] = useState('')

  async function handleJsonFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setError('')
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (!isInspectionSnapshot(parsed)) {
        throw new Error('This file is not a valid inspection JSON snapshot.')
      }
      onChooseJson(parsed)
    } catch (err) {
      setError(err?.message || 'Could not read that JSON file.')
    }
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-sheet import-chooser-modal" role="dialog" aria-modal="true" aria-labelledby="import-chooser-title">
        <div className="modal-sheet__header">
          <div className="modal-sheet__header-main">
            {onBack && <ModalSheetBack onClick={onBack} />}
            <h2 id="import-chooser-title" className="modal-sheet__title">Import</h2>
          </div>
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

            <button
              type="button"
              className="import-chooser-modal__option"
              onClick={() => fileRef.current?.click()}
            >
              <Braces size={22} aria-hidden="true" />
              <span className="import-chooser-modal__option-title">Import JSON</span>
              <span className="import-chooser-modal__option-hint">Load a full inspection snapshot</span>
            </button>
          </div>

          {error && (
            <p className="import-chooser-modal__error" role="alert">{error}</p>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="import-chooser-modal__file-input"
            onChange={handleJsonFile}
          />
        </div>
      </div>
    </>
  )
}
