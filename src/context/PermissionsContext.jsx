import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import {
  DEFAULT_PERMISSIONS,
  ORG_FOLDERS,
  ROLES,
  hasAppAccess,
  orgForEmail,
  roleForEmail,
} from '../lib/accessConfig'
import { loadPermissionsAndMe, savePermissions } from '../lib/permissionsService'

const PermissionsContext = createContext(null)

export function PermissionsProvider({ children }) {
  const { accessToken, user, logout, ensureAccessToken } = useAuth()
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS)
  // Server's view of the signed-in user. Portal-mapped users aren't on the
  // permissions list, so their role and access come from here.
  const [me, setMe] = useState(null)
  const [status, setStatus] = useState('idle') // idle | loading | ready | error

  const reloadPermissions = useCallback(async () => {
    if (!accessToken) {
      setPermissions(DEFAULT_PERMISSIONS)
      setMe(null)
      setStatus('idle')
      return
    }
    setStatus('loading')
    try {
      const next = await loadPermissionsAndMe(accessToken)
      setPermissions(next.permissions)
      setMe(next.me)
      setStatus('ready')
    } catch {
      setPermissions(DEFAULT_PERMISSIONS)
      setMe(null)
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
    if (!me && !hasAppAccess(user.email, permissions)) {
      logout()
    }
  }, [user?.email, accessToken, status, permissions, me, logout])

  const updatePermissions = useCallback(async (nextPermissions) => {
    const token = await ensureAccessToken()
    if (!token) throw new Error('Not signed in')
    const result = await savePermissions(token, nextPermissions)
    const saved = result?.permissions ?? result
    setPermissions(saved)
    return result
  }, [ensureAccessToken])

  const role = me?.role || roleForEmail(user?.email, permissions)
  const ownOrg = me?.org || orgForEmail(user?.email)
  const viewable = !role ? [] : role === ROLES.admin ? [ORG_FOLDERS.PT, ORG_FOLDERS.TC] : (ownOrg ? [ownOrg] : [])

  const value = useMemo(() => ({
    permissions,
    status,
    role,
    reloadPermissions,
    updatePermissions,
    isAccessAdmin: role === ROLES.admin,
    viewableOrgs: viewable,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [permissions, status, role, reloadPermissions, updatePermissions, viewable.join(',')])

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
