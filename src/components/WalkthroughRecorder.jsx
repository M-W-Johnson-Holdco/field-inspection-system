import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { WORKER_URL } from '../lib/inspectionApi'

// Records the walkthrough on the phone and turns it into text for the AI
// parser. Audio is cut into independent pieces every few minutes (each one a
// complete file the server can decode) and each piece is transcribed while
// recording continues; on Stop the pieces' text is joined in order and handed
// to onTranscript. A screen wake lock keeps the phone from locking, since
// browsers stop recording when the screen locks.
const PIECE_MS = 4 * 60 * 1000

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return null
  for (const t of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac']) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return ''
}

function fmt(ms) {
  const s = Math.floor(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function WalkthroughRecorder({ onTranscript, disabled }) {
  const { ensureAccessToken, recoverFromTokenExpiry } = useAuth()
  const [state, setState] = useState('idle') // idle | recording | finishing
  const [elapsed, setElapsed] = useState(0)
  const [pieces, setPieces] = useState({ done: 0, total: 0, failed: 0 })
  const [error, setError] = useState('')

  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const pieceTimerRef = useRef(null)
  const clockRef = useRef(null)
  const startedAtRef = useRef(0)
  const wakeLockRef = useRef(null)
  const resultsRef = useRef([]) // { blob, text, ok }
  const queueRef = useRef(Promise.resolve())
  const stoppingRef = useRef(false)

  const supported = pickMimeType() !== null && Boolean(navigator.mediaDevices?.getUserMedia)

  useEffect(() => () => cleanup(), []) // eslint-disable-line react-hooks/exhaustive-deps

  function cleanup() {
    clearTimeout(pieceTimerRef.current)
    clearInterval(clockRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    wakeLockRef.current?.release?.().catch(() => {})
    wakeLockRef.current = null
  }

  async function transcribePiece(index) {
    const piece = resultsRef.current[index]
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const token = await ensureAccessToken()
        if (!token) throw new Error('Session expired — sign in again, then retry')
        const res = await fetch(`${WORKER_URL}/api/transcribe`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': piece.blob.type || 'audio/webm' },
          body: piece.blob,
        })
        if (res.status === 401) {
          await recoverFromTokenExpiry()
          throw new Error('Session expired — sign in again, then retry')
        }
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
        piece.text = json.text || ''
        piece.ok = true
        return
      } catch (err) {
        piece.error = err.message
        if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt))
      }
    }
  }

  function updateCounts() {
    const r = resultsRef.current
    setPieces({ done: r.filter(p => p.ok).length, total: r.length, failed: r.filter(p => p.ok === false).length })
  }

  function startPiece(mimeType) {
    const rec = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined)
    const chunks = []
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data) }
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: rec.mimeType || mimeType || 'audio/webm' })
      if (blob.size) {
        const index = resultsRef.current.push({ blob, text: '', ok: null }) - 1
        updateCounts()
        queueRef.current = queueRef.current.then(async () => {
          await transcribePiece(index)
          if (!resultsRef.current[index].ok) resultsRef.current[index].ok = false
          updateCounts()
        })
      }
      if (!stoppingRef.current) startPiece(mimeType)
    }
    rec.start()
    recorderRef.current = rec
    clearTimeout(pieceTimerRef.current)
    pieceTimerRef.current = setTimeout(() => { if (rec.state === 'recording') rec.stop() }, PIECE_MS)
  }

  async function start() {
    setError('')
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('Microphone access was blocked. Allow the microphone for this site and try again.')
      return
    }
    try {
      wakeLockRef.current = await navigator.wakeLock?.request('screen')
    } catch {
      // Not supported here — the phone may lock; the hint below says to keep it awake.
    }
    resultsRef.current = []
    queueRef.current = Promise.resolve()
    stoppingRef.current = false
    updateCounts()
    startedAtRef.current = Date.now()
    setElapsed(0)
    clockRef.current = setInterval(() => setElapsed(Date.now() - startedAtRef.current), 1000)
    setState('recording')
    startPiece(pickMimeType())
  }

  async function stop() {
    stoppingRef.current = true
    setState('finishing')
    clearInterval(clockRef.current)
    clearTimeout(pieceTimerRef.current)
    const rec = recorderRef.current
    await new Promise(resolve => {
      if (!rec || rec.state === 'inactive') return resolve()
      rec.addEventListener('stop', () => setTimeout(resolve, 0), { once: true })
      rec.stop()
    })
    cleanup()
    await queueRef.current
    finish()
  }

  function finish() {
    const r = resultsRef.current
    const text = r.filter(p => p.ok).map(p => p.text).filter(Boolean).join('\n\n')
    const failed = r.filter(p => !p.ok).length
    if (text) onTranscript(text)
    setError(failed ? `${failed} of ${r.length} recording piece${r.length === 1 ? '' : 's'} couldn't be transcribed (${r.find(p => !p.ok)?.error || 'unknown error'}). Tap Retry to try them again.` : '')
    setState('idle')
  }

  async function retryFailed() {
    setState('finishing')
    setError('')
    // Already-transcribed pieces were handed over; only add the retried ones.
    const before = new Set(resultsRef.current.filter(p => p.ok))
    for (let i = 0; i < resultsRef.current.length; i++) {
      if (!resultsRef.current[i].ok) await transcribePiece(i)
    }
    updateCounts()
    const r = resultsRef.current
    const text = r.filter(p => p.ok && !before.has(p)).map(p => p.text).filter(Boolean).join('\n\n')
    if (text) onTranscript(text)
    const failed = r.filter(p => !p.ok).length
    setError(failed ? `${failed} piece${failed === 1 ? '' : 's'} still failed (${r.find(p => !p.ok)?.error}).` : '')
    setState('idle')
  }

  if (!supported) {
    return <p className="ai-recorder__hint">Recording isn't supported in this browser — paste a transcript instead.</p>
  }

  return (
    <div className="ai-recorder">
      {state === 'idle' && (
        <button type="button" className="ai-recorder__btn" onClick={start} disabled={disabled}>🎙️ Record walkthrough</button>
      )}
      {state === 'recording' && (
        <button type="button" className="ai-recorder__btn ai-recorder__btn--stop" onClick={stop}>
          ⏹ Stop · {fmt(elapsed)}
        </button>
      )}
      {state === 'finishing' && (
        <button type="button" className="ai-recorder__btn" disabled>⏳ Transcribing…</button>
      )}
      {error && pieces.failed > 0 && state === 'idle' && (
        <button type="button" className="ai-recorder__btn" onClick={retryFailed}>Retry</button>
      )}
      <p className="ai-recorder__hint">
        {state === 'recording'
          ? `Recording — keep this screen open.${pieces.total ? ` ${pieces.done} of ${pieces.total} piece${pieces.total === 1 ? '' : 's'} transcribed so far.` : ''}`
          : state === 'finishing'
            ? `Transcribing ${pieces.done} of ${pieces.total}…`
            : 'Walk the property and talk through each section. Keep the screen on while recording; the text lands in the box below.'}
      </p>
      {error && <p className="ai-recorder__error">{error}</p>}
    </div>
  )
}
