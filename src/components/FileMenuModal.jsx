import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  FileInput,
  FilePlus,
  FolderOpen,
  RotateCcw,
  Save,
  X,
} from 'lucide-react'

export default function FileMenuModal({
  driveStatus = 'idle',
  onSave,
  onOpen,
  onImport,
  onExport,
  onNew,
  onReset,
  onClose,
}) {
  const SaveIcon =
    driveStatus === 'done' ? CheckCircle :
    driveStatus === 'error' ? AlertCircle : Save

  const saving = driveStatus === 'saving'

  function run(action) {
    action()
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className="modal-sheet import-chooser-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="file-menu-title"
      >
        <div className="modal-sheet__header">
          <h2 id="file-menu-title" className="modal-sheet__title">File</h2>
          <button className="modal-sheet__close" type="button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="import-chooser-modal__body">
          <div className="import-chooser-modal__options">
            <button
              type="button"
              className="import-chooser-modal__option"
              onClick={() => run(onSave)}
              disabled={saving}
            >
              <SaveIcon size={22} aria-hidden="true" />
              <span className="import-chooser-modal__option-title">
                {saving ? 'Saving…' : driveStatus === 'done' ? 'Saved' : driveStatus === 'error' ? 'Save failed' : 'Save'}
              </span>
              <span className="import-chooser-modal__option-hint">Save to cloud storage</span>
            </button>

            <button
              type="button"
              className="import-chooser-modal__option"
              onClick={() => run(onOpen)}
            >
              <FolderOpen size={22} aria-hidden="true" />
              <span className="import-chooser-modal__option-title">Open</span>
              <span className="import-chooser-modal__option-hint">Open a saved inspection</span>
            </button>

            <button
              type="button"
              className="import-chooser-modal__option"
              onClick={() => run(onImport)}
            >
              <FileInput size={22} aria-hidden="true" />
              <span className="import-chooser-modal__option-title">Import</span>
              <span className="import-chooser-modal__option-hint">Measurements, images, or JSON</span>
            </button>

            <button
              type="button"
              className="import-chooser-modal__option"
              onClick={() => run(onExport)}
            >
              <ExternalLink size={22} aria-hidden="true" />
              <span className="import-chooser-modal__option-title">Export</span>
              <span className="import-chooser-modal__option-hint">Preview or save photos</span>
            </button>

            <button
              type="button"
              className="import-chooser-modal__option"
              onClick={() => run(onNew)}
            >
              <FilePlus size={22} aria-hidden="true" />
              <span className="import-chooser-modal__option-title">New</span>
              <span className="import-chooser-modal__option-hint">Start a new inspection</span>
            </button>

            <button
              type="button"
              className="import-chooser-modal__option"
              onClick={() => run(onReset)}
            >
              <RotateCcw size={22} aria-hidden="true" />
              <span className="import-chooser-modal__option-title">Reset</span>
              <span className="import-chooser-modal__option-hint">Clear all current data</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
