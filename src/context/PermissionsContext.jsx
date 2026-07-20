import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import {
  DEFAULT_PERMISSIONS,
  hasAppAccess,
  isAccessAdmin,
  roleForEmail,
  viewableOrgs,
} from '../lib/accessConfig'
import { loadPermissions, savePermissions } from '../lib/permissionsService'

const PermissionsContext = createContext(null)

export function PermissionsProvider({ children }) {
  const { accessToken, user, logout, ensureAccessToken } = useAuth()
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS)
  const [status, setStatus] = useState('idle') // idle | loading | ready | error

  const reloadPermissions = useCallback(async () => {
    if (!accessToken) {
      setPermissions(DEFAULT_PERMISSIONS)
      setStatus('idle')
      return
    }
    setStatus('loading')
    try {
      const next = await loadPermissions(accessToken)
      setPermissions(next)
      setStatus('ready')
    } catch {
      setPermissions(DEFAULT_PERMISSIONS)
      setStatus('error')
    }
  }, [accessToken])

  useEffect(() => {
    reloadPermissions()
  }, [reloadPermissions])

  // Kick out signed-in users who are no longer on the allowlist.
  useEffect(() => {
    if (!user?.email || !accessToken) return
    if (status !== 'ready' && status !== 'error') return
    if (!hasAppAccess(user.email, permissions)) {
      logout()
    }
  }, [user?.email, accessToken, status, permissions, logout])

  const updatePermissions = useCallback(async (nextPermissions) => {
    const token = await ensureAccessToken()
    if (!token) throw new Error('Not signed in')
    const saved = await savePermissions(token, nextPermissions)
    setPermissions(saved)
    return saved
  }, [ensureAccessToken])

  const role = roleForEmail(user?.email, permissions)

  const value = useMemo(() => ({
    permissions,
    status,
    role,
    reloadPermissions,
    updatePermissions,
    isAccessAdmin: isAccessAdmin(user?.email, permissions),
    viewableOrgs: viewableOrgs(user?.email, permissions),
  }), [permissions, status, role, reloadPermissions, updatePermissions, user?.email])

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  const context = useContext(PermissionsContext)
  if (!context) {
    throw new Error('usePermissions must be used within PermissionsProvider')
  }
  return context
}
