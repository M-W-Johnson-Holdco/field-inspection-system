import { ArrowLeft } from 'lucide-react'

export default function ModalSheetBack({ onClick, disabled = false }) {
  return (
    <button
      type="button"
      className="modal-sheet__close modal-sheet__back"
      onClick={onClick}
      disabled={disabled}
      aria-label="Back"
    >
      <ArrowLeft size={20} aria-hidden="true" />
    </button>
  )
}
