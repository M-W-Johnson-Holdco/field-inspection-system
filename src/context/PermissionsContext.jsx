import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import {
  DEFAULT_PERMISSIONS,
  isAccessAdmin,
  viewableOrgs,
} from '../lib/accessConfig'
import { loadPermissions, savePermissions } from '../lib/permissionsService'

const PermissionsContext = createContext(null)

export function PermissionsProvider({ children }) {
  const { accessToken, user } = useAuth()
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

  const updatePermissions = useCallback(async (nextPermissions) => {
    if (!accessToken) throw new Error('Not signed in')
    const saved = await savePermissions(accessToken, nextPermissions)
    setPermissions(saved)
    return saved
  }, [accessToken])

  const value = useMemo(() => ({
    permissions,
    status,
    reloadPermissions,
    updatePermissions,
    isAccessAdmin: isAccessAdmin(user?.email, permissions),
    viewableOrgs: viewableOrgs(user?.email, permissions),
  }), [permissions, status, reloadPermissions, updatePermissions, user?.email])

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
