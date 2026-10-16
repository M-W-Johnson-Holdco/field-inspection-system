// Embedded mode: the app runs inside the TC / Peachtree portal's Inspections
// tab (an iframe loaded with ?embed=portal). The portal's own Google login
// supplies the inspection session over postMessage, so this app's Google
// sign-in and Sign out are hidden.
//
// Messages (all `type`s start with "insp:"):
//   app → portal   insp:ready         app loaded, send a session if you have one
//   app → portal   insp:need-session  session missing/expired, send a fresh one
//   portal → app   insp:session       { token, expiresAt, user }
//   portal → app   insp:no-session    { reason } — portal has no usable session

const PARENT_ORIGINS = [
  'https://m-w-johnson-holdco.github.io',
  // Local portal previews (python -m http.server via .claude/launch.json)
  'http://localhost:8137',
  'http://localhost:8138',
]

export const EMBEDDED = typeof window !== 'undefined'
  && window.parent !== window
  && new URLSearchParams(window.location.search).get('embed') === 'portal'

export function postToPortal(message) {
  if (!EMBEDDED) return
  // A message addressed to an origin the parent isn't on is silently
  // dropped, so this only ever reaches a known portal.
  PARENT_ORIGINS.forEach(origin => {
    try {
      window.parent.postMessage(message, origin)
    } catch {
      // ignore
    }
  })
}

/**
 * Ask the portal to do something only it can (AcuLynx lookups/uploads):
 * sends { type, requestId, ...payload } and resolves with the matching
 * insp:al-result. insp:al-progress messages go to onProgress(done, total).
 */
export function portalRequest(type, payload = {}, onProgress) {
  if (!EMBEDDED) return Promise.reject(new Error('Only available inside the employee portal'))
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return new Promise((resolve, reject) => {
    const off = onPortalMessage((msg) => {
      if (msg.requestId !== requestId) return
      if (msg.type === 'insp:al-progress') {
        onProgress?.(msg.done, msg.total)
        return
      }
      if (msg.type !== 'insp:al-result') return
      off()
      if (msg.ok) resolve(msg.result)
      else reject(new Error(msg.error || 'AcuLynx request failed'))
    })
    postToPortal({ type, requestId, ...payload })
  })
}

/** Listen for insp:* messages from the portal window only. Returns an unsubscribe. */
export function onPortalMessage(handler) {
  function listener(event) {
    if (event.source !== window.parent || !PARENT_ORIGINS.includes(event.origin)) return
    const data = event.data
    if (!data || typeof data.type !== 'string' || !data.type.startsWith('insp:')) return
    handler(data)
  }
  window.addEventListener('message', listener)
  return () => window.removeEventListener('message', listener)
}
