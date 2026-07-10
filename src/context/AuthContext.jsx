import { createContext, useContext, useState, useCallback } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { hasAppAccess, isAllowedDomainEmail, normalizeEmail } from '../lib/accessConfig'
import { loadPermissions } from '../lib/permissionsService'

const AuthContext = createContext(null)

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive'

export function AuthProvider({ children }) {
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

  async function authorizeUser(userInfo, token) {
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
    setUser(userData)
    setAccessToken(token)
    setTokenExpired(false)
    return { success: true, permissions }
  }

  async function handleTokenResponse(tokenResponse) {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
    })
    if (!res.ok) throw new Error('Failed to fetch user info')
    const userInfo = await res.json()
    return authorizeUser(userInfo, tokenResponse.access_token)
  }

  async function login(userInfo, token) {
    return authorizeUser(userInfo, token)
  }

  const reLogin = useGoogleLogin({
    scope: `openid email profile ${DRIVE_SCOPE}`,
    onSuccess: (tokenResponse) => {
      handleTokenResponse(tokenResponse).catch(console.error)
    },
    onError: () => console.error('Re-authentication failed'),
  })

  function logout() {
    localStorage.removeItem('tc_user')
    setUser(null)
    setAccessToken(null)
    setTokenExpired(false)
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, tokenExpired, setTokenExpired, login, reLogin, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
