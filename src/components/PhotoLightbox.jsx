import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function PhotoLightbox({ photos, index, onClose, onPrev, onNext }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, onPrev, onNext])

  if (index == null || !photos[index]) return null

  return createPortal(
    <div
      className="photo-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onClick={onClose}
    >
      <div className="photo-lightbox__popup" onClick={e => e.stopPropagation()}>
        <div className="photo-lightbox__body">
          <button
            type="button"
            className="photo-lightbox__nav photo-lightbox__nav--prev"
            onClick={onPrev}
            disabled={index <= 0}
            aria-label="Previous photo"
          >
            <ChevronLeft size={24} aria-hidden="true" />
          </button>

          <img
            className="photo-lightbox__image"
            src={photos[index]}
            alt={`Inspection photo ${index + 1} of ${photos.length}`}
          />

          <button
            type="button"
            className="photo-lightbox__nav photo-lightbox__nav--next"
            onClick={onNext}
            disabled={index >= photos.length - 1}
            aria-label="Next photo"
          >
            <ChevronRight size={24} aria-hidden="true" />
          </button>
        </div>

        <p className="photo-lightbox__counter">
          {index + 1} / {photos.length}
        </p>
      </div>
    </div>,
    document.body,
  )
}
