import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useGoogleLogin, useGoogleOAuth } from '@react-oauth/google'
import { hasAppAccess, isAllowedDomainEmail, normalizeEmail } from '../lib/accessConfig'
import { loadPermissions } from '../lib/permissionsService'

const AuthContext = createContext(null)

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive'
const AUTH_SCOPE = `openid email profile ${DRIVE_SCOPE}`
/** Refresh this many ms before the token actually expires. */
const REFRESH_BUFFER_MS = 5 * 60 * 1000
/** Treat token as expired if less than this remains. */
const MIN_VALID_MS = 60 * 1000
/** Give up on a silent token request after this long. */
const SILENT_TIMEOUT_MS = 12_000

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
  // Access token is kept in memory only — it expires and must not persist
  const [accessToken, setAccessToken] = useState(null)
  const [tokenExpired, setTokenExpired] = useState(false)

  const userRef = useRef(user)
  const accessTokenRef = useRef(accessToken)
  const expiresAtRef = useRef(0)
  const refreshTimerRef = useRef(null)
  const pendingTokenRef = useRef(null)
  const requestTokenRef = useRef(null)
  const bootstrapDoneRef = useRef(false)

  userRef.current = user
  accessTokenRef.current = accessToken

  function clearRefreshTimer() {
    if (refreshTimerRef.current != null) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }

  function resolvePending(ok, token = null) {
    const pending = pendingTokenRef.current
    if (!pending) return
    pendingTokenRef.current = null
    clearTimeout(pending.timeoutId)
    pending.resolve(ok ? token : null)
  }

  function applyAccessToken(token, expiresInSec) {
    const seconds = Number(expiresInSec)
    const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 3600
    expiresAtRef.current = Date.now() + safeSeconds * 1000
    accessTokenRef.current = token
    setAccessToken(token)
    setTokenExpired(false)
    clearRefreshTimer()
    const delay = Math.max(safeSeconds * 1000 - REFRESH_BUFFER_MS, 30_000)
    refreshTimerRef.current = setTimeout(() => {
      requestTokenQuietly().catch(() => {})
    }, delay)
  }

  async function authorizeUser(userInfo, token, expiresInSec) {
    const email = normalizeEmail(userInfo.email)
    if (!isAllowedDomainEmail(email)) {
      return { error: 'This Google account is not authorized. Contact your administrator.' }
    }

    let permissions
    try {
      permissions = await loadPermissions(token)
    } catch {
      return { error: 'Could not verify Drive access permissions. Try again.' }
    }

    if (!hasAppAccess(email, permissions)) {
      return {
        error: 'Your account has not been granted access to this app. Contact your administrator.',
      }
    }

    const userData = {
      name: userInfo.given_name,
      fullName: userInfo.name,
      email: userInfo.email,
      picture: userInfo.picture,
    }
    localStorage.setItem('tc_user', JSON.stringify(userData))
    userRef.current = userData
    setUser(userData)
    applyAccessToken(token, expiresInSec)
    return { success: true, permissions }
  }

  async function handleTokenResponse(tokenResponse) {
    const token = tokenResponse.access_token
    const expiresIn = tokenResponse.expires_in

    // Already signed into the app — just rotate the Drive access token.
    if (userRef.current) {
      applyAccessToken(token, expiresIn)
      return { success: true }
    }

    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Failed to fetch user info')
    const userInfo = await res.json()
    return authorizeUser(userInfo, token, expiresIn)
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
          resolvePending(true, tokenResponse.access_token)
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

  function requestTokenQuietly() {
    if (pendingTokenRef.current) return pendingTokenRef.current.promise

    let resolve
    const promise = new Promise((res) => {
      resolve = res
    })
    const timeoutId = setTimeout(() => {
      resolvePending(false)
    }, SILENT_TIMEOUT_MS)

    pendingTokenRef.current = { resolve, timeoutId, promise }

    const tryStart = () => {
      try {
        if (!requestTokenRef.current) return false
        // Empty prompt: reuse prior consent when possible (closest to silent refresh).
        requestTokenRef.current({ prompt: '' })
        return true
      } catch (err) {
        console.error('Silent token request failed to start:', err)
        resolvePending(false)
        return true
      }
    }

    if (!tryStart()) {
      const startRetry = setInterval(() => {
        if (!pendingTokenRef.current || tryStart()) clearInterval(startRetry)
      }, 100)
      setTimeout(() => clearInterval(startRetry), SILENT_TIMEOUT_MS)
    }

    return promise
  }

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

  function isTokenFresh() {
    return Boolean(
      accessTokenRef.current
      && Date.now() < expiresAtRef.current - MIN_VALID_MS,
    )
  }

  /**
   * Returns a usable access token, silently refreshing when needed.
   * Shows the re-auth modal only if silent refresh fails.
   */
  const ensureAccessToken = useCallback(async () => {
    if (isTokenFresh()) return accessTokenRef.current

    const token = await requestTokenQuietly()
    if (token) return token

    setTokenExpired(true)
    return null
  }, [])

  /**
   * After a Drive 401: try one quiet refresh; only then show re-auth.
   * @returns {Promise<string|null>} fresh token if recovered
   */
  const recoverFromTokenExpiry = useCallback(async () => {
    accessTokenRef.current = null
    setAccessToken(null)
    expiresAtRef.current = 0
    clearRefreshTimer()

    const token = await requestTokenQuietly()
    if (token) return token

    setTokenExpired(true)
    return null
  }, [])

  async function login(userInfo, token, expiresInSec) {
    return authorizeUser(userInfo, token, expiresInSec)
  }

  function reLogin() {
    setTokenExpired(false)
    requestTokenInteractive().catch(() => {
      setTokenExpired(true)
    })
  }

  function logout() {
    clearRefreshTimer()
    resolvePending(false)
    localStorage.removeItem('tc_user')
    userRef.current = null
    accessTokenRef.current = null
    expiresAtRef.current = 0
    setUser(null)
    setAccessToken(null)
    setTokenExpired(false)
  }

  // Returning visitor: restore Drive token without forcing a login screen.
  useEffect(() => {
    if (!user || !scriptLoadedSuccessfully) return
    if (bootstrapDoneRef.current) return
    bootstrapDoneRef.current = true
    requestTokenQuietly().catch(() => {})
  }, [user, scriptLoadedSuccessfully])

  useEffect(() => () => {
    clearRefreshTimer()
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
