import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useGoogleLogin, useGoogleOAuth } from '@react-oauth/google'
import { hasAppAccess, isAllowedDomainEmail, normalizeEmail } from '../lib/accessConfig'
import { createAppSession } from '../lib/inspectionApi'
import { loadPermissions } from '../lib/permissionsService'

const AuthContext = createContext(null)

const AUTH_SCOPE = 'openid email profile'
const SESSION_STORAGE_KEY = 'tc_session'
/** Treat session as expired if less than this remains. */
const MIN_VALID_MS = 60 * 1000

function readStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.token || !parsed?.expiresAt) return null
    if (Date.now() >= Number(parsed.expiresAt) - MIN_VALID_MS) {
      localStorage.removeItem(SESSION_STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writeStoredSession(session) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
    token: session.token,
    expiresAt: session.expiresAt,
  }))
}

function clearStoredSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY)
}

function toUserData(profile) {
  const fullName = profile?.name || profile?.fullName || profile?.email || ''
  const given = profile?.given_name || profile?.name || fullName.split(/\s+/)[0] || ''
  return {
    name: given,
    fullName,
    email: profile?.email || '',
    picture: profile?.picture || null,
  }
}

export function AuthProvider({ children }) {
  const { scriptLoadedSuccessfully } = useGoogleOAuth()
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('tc_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [accessToken, setAccessToken] = useState(null)
  const [tokenExpired, setTokenExpired] = useState(false)

  const userRef = useRef(user)
  const accessTokenRef = useRef(accessToken)
  const expiresAtRef = useRef(0)
  const pendingTokenRef = useRef(null)
  const requestTokenRef = useRef(null)
  const bootstrapDoneRef = useRef(false)

  userRef.current = user
  accessTokenRef.current = accessToken

  function resolvePending(ok, token = null) {
    const pending = pendingTokenRef.current
    if (!pending) return
    pendingTokenRef.current = null
    clearTimeout(pending.timeoutId)
    pending.resolve(ok ? token : null)
  }

  function applySession(session, userData) {
    expiresAtRef.current = Number(session.expiresAt) || 0
    accessTokenRef.current = session.token
    setAccessToken(session.token)
    setTokenExpired(false)
    writeStoredSession(session)

    if (userData) {
      localStorage.setItem('tc_user', JSON.stringify(userData))
      userRef.current = userData
      setUser(userData)
    }
  }

  async function establishSessionFromGoogle(googleAccessToken) {
    const session = await createAppSession(googleAccessToken)
    const userData = toUserData(session.user)
    const email = normalizeEmail(userData.email)
    if (!isAllowedDomainEmail(email)) {
      return { error: 'This Google account is not authorized. Contact your administrator.' }
    }

    let permissions
    try {
      permissions = await loadPermissions(session.token)
    } catch {
      return { error: 'Could not verify access permissions. Try again.' }
    }

    if (!hasAppAccess(email, permissions)) {
      return {
        error: 'Your account has not been granted access to this app. Contact your administrator.',
      }
    }

    applySession(session, userData)
    return { success: true, permissions }
  }

  async function handleTokenResponse(tokenResponse) {
    return establishSessionFromGoogle(tokenResponse.access_token)
  }

  const requestToken = useGoogleLogin({
    scope: AUTH_SCOPE,
    onSuccess: (tokenResponse) => {
      handleTokenResponse(tokenResponse)
        .then((result) => {
          if (result?.error) {
            resolvePending(false)
            return
          }
          resolvePending(true, accessTokenRef.current)
        })
        .catch((err) => {
          console.error('Token handling failed:', err)
          resolvePending(false)
        })
    },
    onError: () => {
      console.error('Google token request failed')
      resolvePending(false)
    },
    onNonOAuthError: () => {
      resolvePending(false)
    },
  })

  requestTokenRef.current = requestToken

  function requestTokenInteractive() {
    if (pendingTokenRef.current) return pendingTokenRef.current.promise

    let resolve
    const promise = new Promise((res) => {
      resolve = res
    })
    const timeoutId = setTimeout(() => {
      resolvePending(false)
    }, 120_000)

    pendingTokenRef.current = { resolve, timeoutId, promise }

    try {
      requestTokenRef.current?.({ prompt: 'select_account' })
    } catch (err) {
      console.error('Interactive token request failed to start:', err)
      resolvePending(false)
    }

    return promise
  }

  function isSessionFresh() {
    return Boolean(
      accessTokenRef.current
      && expiresAtRef.current
      && Date.now() < expiresAtRef.current - MIN_VALID_MS,
    )
  }

  /**
   * Returns the app session token when still valid.
   * Shows the re-auth modal only when the session has expired.
   */
  const ensureAccessToken = useCallback(async () => {
    if (isSessionFresh()) return accessTokenRef.current

    const stored = readStoredSession()
    if (stored?.token) {
      accessTokenRef.current = stored.token
      expiresAtRef.current = Number(stored.expiresAt) || 0
      setAccessToken(stored.token)
      if (isSessionFresh()) return stored.token
    }

    clearStoredSession()
    accessTokenRef.current = null
    expiresAtRef.current = 0
    setAccessToken(null)
    setTokenExpired(Boolean(userRef.current))
    return null
  }, [])

  const recoverFromTokenExpiry = useCallback(async () => {
    clearStoredSession()
    accessTokenRef.current = null
    setAccessToken(null)
    expiresAtRef.current = 0
    setTokenExpired(true)
    return null
  }, [])

  async function login(userInfo, googleAccessToken) {
    // Prefer Google access token exchange; userInfo is ignored once Worker returns profile.
    void userInfo
    return establishSessionFromGoogle(googleAccessToken)
  }

  function reLogin() {
    setTokenExpired(false)
    requestTokenInteractive().catch(() => {
      setTokenExpired(true)
    })
  }

  function logout() {
    resolvePending(false)
    clearStoredSession()
    localStorage.removeItem('tc_user')
    userRef.current = null
    accessTokenRef.current = null
    expiresAtRef.current = 0
    setUser(null)
    setAccessToken(null)
    setTokenExpired(false)
  }

  // Returning visitor: restore app session without Google until they sign out.
  useEffect(() => {
    if (!user) return
    if (bootstrapDoneRef.current) return
    bootstrapDoneRef.current = true

    const stored = readStoredSession()
    if (stored?.token) {
      accessTokenRef.current = stored.token
      expiresAtRef.current = Number(stored.expiresAt) || 0
      setAccessToken(stored.token)
      setTokenExpired(false)
      return
    }

    // User profile cached but session gone — force sign-in.
    setTokenExpired(true)
  }, [user, scriptLoadedSuccessfully])

  useEffect(() => () => {
    resolvePending(false)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      accessToken,
      tokenExpired,
      setTokenExpired,
      login,
      reLogin,
      logout,
      ensureAccessToken,
      recoverFromTokenExpiry,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
