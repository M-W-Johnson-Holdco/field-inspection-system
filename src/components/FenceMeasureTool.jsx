import { useRef, useState } from 'react'
import { Camera, Ruler } from 'lucide-react'
import { useInspection } from '../context/InspectionContext'

const WORKER_URL = 'https://field-inspection-worker.k-liss.workers.dev/measure-fence'
const PHOTO_KEY = 'reference'

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function FenceMeasureTool({ itemId }) {
  const { data, setExteriorMeasurePhoto, removeExteriorMeasurePhoto, updateExteriorField } = useInspection()
  const [status, setStatus] = useState('idle') // idle | loading | error
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const inputRef = useRef(null)

  const measurePhotos = data.exteriorData[itemId]?.measurePhotos || {}
  const referencePhoto = measurePhotos[PHOTO_KEY]

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    setExteriorMeasurePhoto(itemId, PHOTO_KEY, dataUrl)
    setResult(null)
    setStatus('idle')
  }

  async function runMeasurement() {
    setStatus('loading')
    setError('')
    try {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referencePhoto }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Measurement failed')

      if (json.height_ft != null) {
        updateExteriorField(itemId, 'Height (FT)', String(json.height_ft))
        updateExteriorField(itemId, '_heightAiFilled', true)
      }
      if (json.post_spacing_ft != null) {
        updateExteriorField(itemId, 'Post Spacing (LF)', String(json.post_spacing_ft))
        updateExteriorField(itemId, '_postSpacingAiFilled', true)
      }

      setResult(json)
      setStatus('idle')
    } catch (err) {
      setError(err.message || 'Something went wrong')
      setStatus('error')
    }
  }

  return (
    <div className="field-group field-group--full cv-measure">
      <span className="ri-photo-label">Measure with AI</span>

      <div className="cv-measure__slots">
        <div className="cv-measure__slot">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleFile}
          />
          {referencePhoto ? (
            <div className="ri-photo-thumb">
              <img src={referencePhoto} alt="Reference photo" />
              <button
                type="button"
                className="ri-photo-del"
                onClick={() => { removeExteriorMeasurePhoto(itemId, PHOTO_KEY); setResult(null) }}
                aria-label="Remove reference photo"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="ri-btn-photo cv-measure__capture"
              onClick={() => inputRef.current?.click()}
            >
              <Camera size={16} aria-hidden="true" />
              <span>Reference Photo</span>
            </button>
          )}
          <span className="cv-measure__hint">1ft blue tape placed vertically on a fence plank, with 2+ full posts visible</span>
        </div>
      </div>

      <button
        type="button"
        className="ri-btn-photo cv-measure__run"
        disabled={!referencePhoto || status === 'loading'}
        onClick={runMeasurement}
      >
        <Ruler size={16} aria-hidden="true" />
        {status === 'loading' ? 'Measuring…' : 'Measure with AI'}
      </button>

      {status === 'error' && <p className="cv-measure__error">{error}</p>}

      {result && (
        <p className="cv-measure__result">
          Height: {result.height_ft ?? '—'} ft ({result.height_confidence}) · Post spacing: {result.post_spacing_ft ?? '—'} ft ({result.spacing_confidence})
          {result.notes ? ` — ${result.notes}` : ''}
        </p>
      )}
    </div>
  )
}
