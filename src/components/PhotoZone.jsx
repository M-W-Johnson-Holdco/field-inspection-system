import { useState } from 'react'
import { Camera, FolderOpen } from 'lucide-react'
import PhotoLightbox from './PhotoLightbox'

export default function PhotoZone({ entityId, photos, trigPhoto, onRemove, fullWidth = true }) {
  const [activeIndex, setActiveIndex] = useState(null)

  function handleRemove(index, e) {
    e.stopPropagation()
    onRemove(entityId, index)
    setActiveIndex(current => {
      if (current == null) return null
      if (photos.length <= 1) return null
      if (index < current) return current - 1
      if (index === current) {
        return current >= photos.length - 1 ? current - 1 : current
      }
      return current
    })
  }

  function goPrev() {
    setActiveIndex(current => (current > 0 ? current - 1 : current))
  }

  function goNext() {
    setActiveIndex(current => (current < photos.length - 1 ? current + 1 : current))
  }

  return (
    <>
      <div className={`ri-photo-zone field-group${fullWidth ? ' field-group--full' : ''}`}>
        <span className="ri-photo-label">Photos</span>
        {photos.length > 0 && (
          <div className="ri-photo-row">
            {photos.map((src, i) => (
              <div key={i} className="ri-photo-thumb">
                <button
                  type="button"
                  className="ri-photo-thumb__open"
                  onClick={() => setActiveIndex(i)}
                  aria-label={`View photo ${i + 1} of ${photos.length}`}
                >
                  <img src={src} alt="" />
                </button>
                <button
                  type="button"
                  className="ri-photo-del"
                  onClick={e => handleRemove(i, e)}
                  aria-label="Remove photo"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="ri-photo-btns">
          <button
            type="button"
            className="ri-btn-photo ri-btn-photo--cam"
            onClick={() => trigPhoto(entityId, 'cam')}
            aria-label="Add photo from camera"
            title="Camera"
          >
            <Camera size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="ri-btn-photo ri-btn-photo--gal"
            onClick={() => trigPhoto(entityId, 'gal')}
            aria-label="Add photo from gallery"
            title="Gallery"
          >
            <FolderOpen size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {activeIndex != null && (
        <PhotoLightbox
          photos={photos}
          index={activeIndex}
          onClose={() => setActiveIndex(null)}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}
    </>
  )
}
