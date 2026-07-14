import { useMemo, useState } from 'react'
import { Loader, Shield, Trash2, X } from 'lucide-react'
import {
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  ROLES,
  accessLabel,
  isAllowedDomainEmail,
  isBootstrapAccessAdmin,
  normalizeEmail,
  normalizeRole,
  orgForEmail,
  withBootstrapAdmins,
} from '../lib/accessConfig'
import { usePermissions } from '../context/PermissionsContext'
import { TokenExpiredError } from '../lib/driveService'
import { useAuth } from '../context/AuthContext'

const ROLE_OPTIONS = [ROLES.sales, ROLES.supervisor, ROLES.admin]

export default function AccessAdminModal({ onClose }) {
  const { user, accessToken, setTokenExpired } = useAuth()
  const { permissions, updatePermissions } = usePermissions()
  const [draftUsers, setDraftUsers] = useState(() =>
    withBootstrapAdmins(permissions).users.map(entry => ({
      email: normalizeEmail(entry.email),
      role: normalizeRole(entry.role) || ROLES.sales,
    }))
  )
  const [newEmail, setNewEmail] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const sortedUsers = useMemo(
    () => [...draftUsers].sort((a, b) => a.email.localeCompare(b.email)),
    [draftUsers],
  )

  function addUser() {
    const email = normalizeEmail(newEmail)
    setError(null)
    if (!email) {
      setError('Enter an email address.')
      return
    }
    if (!isAllowedDomainEmail(email)) {
      setError('Email must be @peachtreerestorations.com or @tcroofingexperts.com.')
      return
    }
    if (draftUsers.some(entry => entry.email === email)) {
      setError('That email is already on the list.')
      return
    }
    setDraftUsers(current => [...current, { email, role: ROLES.sales }])
    setNewEmail('')
  }

  function setUserRole(email, role) {
    if (isBootstrapAccessAdmin(email) && role !== ROLES.admin) {
      setError('Bootstrap admins must remain Admin.')
      return
    }
    setError(null)
    setDraftUsers(current =>
      current.map(entry => (entry.email === email ? { ...entry, role } : entry))
    )
  }

  function removeUser(email) {
    if (isBootstrapAccessAdmin(email)) {
      setError('Bootstrap admins cannot be removed.')
      return
    }
    if (normalizeEmail(email) === normalizeEmail(user?.email)) {
      setError('You cannot remove your own access.')
      return
    }
    setError(null)
    setDraftUsers(current => current.filter(entry => entry.email !== email))
  }

  async function handleSave() {
    if (!accessToken) {
      setError('Google Drive session expired. Sign in again, then save.')
      setTokenExpired(true)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const selfEmail = normalizeEmail(user?.email)
      let users = draftUsers
        .map(entry => ({
          email: normalizeEmail(entry.email),
          role: normalizeRole(entry.role) || ROLES.sales,
        }))
        .filter(entry => isAllowedDomainEmail(entry.email))

      const rejected = draftUsers.filter(entry => !isAllowedDomainEmail(entry.email))
      if (rejected.length) {
        setError('Only @peachtreerestorations.com or @tcroofingexperts.com emails are allowed.')
        setDraftUsers(current => current.filter(entry => isAllowedDomainEmail(entry.email)))
        setSaving(false)
        return
      }

      // Keep the current admin on the list as Admin so they cannot lock themselves out.
      if (selfEmail && isAllowedDomainEmail(selfEmail)) {
        const self = users.find(entry => entry.email === selfEmail)
        if (!self) users = [...users, { email: selfEmail, role: ROLES.admin }]
        else if (self.role !== ROLES.admin) {
          users = users.map(entry =>
            entry.email === selfEmail ? { ...entry, role: ROLES.admin } : entry
          )
        }
      }

      await updatePermissions(withBootstrapAdmins({ users }))
      onClose()
    } catch (err) {
      console.error('Failed to save access settings:', err)
      if (err instanceof TokenExpiredError) {
        setError('Google Drive session expired. Sign in again, then save.')
        setTokenExpired(true)
      } else {
        const detail = String(err?.message || '').trim()
        setError(
          detail
            ? `Could not save access settings. ${detail}`
            : 'Could not save access settings. Try again.'
        )
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-sheet access-admin-modal" role="dialog" aria-modal="true" aria-labelledby="access-admin-title">
        <div className="modal-sheet__header">
          <h2 id="access-admin-title" className="modal-sheet__title">Drive Access</h2>
          <button className="modal-sheet__close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="access-admin-modal__body">
          <p className="access-admin-modal__intro">
            Only people on this list can sign in. Choose a role for each user:
            <strong> Sales</strong> (own inspections),
            <strong> Supervisor</strong> (their company),
            <strong> Admin</strong> (PT + TC and Access settings).
          </p>

          <div className="access-admin-modal__add-row">
            <input
              className="access-admin-modal__input"
              type="email"
              placeholder="name@peachtreerestorations.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addUser()
                }
              }}
            />
            <button className="app-button app-button--primary access-admin-modal__add-btn" type="button" onClick={addUser}>
              Add
            </button>
          </div>

          {error && <p className="access-admin-modal__error">{error}</p>}

          <div className="access-admin-modal__list">
            {sortedUsers.length === 0 && (
              <p className="access-admin-modal__empty">No users yet. Add emails to grant access.</p>
            )}
            {sortedUsers.map(entry => {
              const locked = isBootstrapAccessAdmin(entry.email)
              return (
                <div key={entry.email} className="access-admin-modal__row">
                  <div className="access-admin-modal__row-main">
                    <Shield size={16} className="access-admin-modal__row-icon" aria-hidden="true" />
                    <div>
                      <p className="access-admin-modal__email">{entry.email}</p>
                      <p className="access-admin-modal__meta">
                        Company: {orgForEmail(entry.email) || '—'} · {ROLE_DESCRIPTIONS[entry.role]}
                        {locked ? ' · Default admin' : ''}
                      </p>
                    </div>
                  </div>
                  <select
                    className="access-admin-modal__role-select access-admin-modal__role-select--row"
                    value={entry.role}
                    onChange={e => setUserRole(entry.email, e.target.value)}
                    aria-label={`Role for ${entry.email}`}
                    disabled={locked}
                  >
                    {ROLE_OPTIONS.map(role => (
                      <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="access-admin-modal__remove"
                    aria-label={`Remove ${entry.email}`}
                    onClick={() => removeUser(entry.email)}
                    disabled={locked}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            })}
          </div>

          <p className="access-admin-modal__note">
            Your current access: <strong>{accessLabel(user?.email, { users: draftUsers })}</strong>.
            Saves always go to your company folder ({orgForEmail(user?.email) || '—'}).
          </p>
        </div>

        <div className="access-admin-modal__actions">
          <button className="app-button app-button--secondary" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="app-button app-button--primary" type="button" onClick={handleSave} disabled={saving}>
            {saving ? <Loader size={16} className="spin" /> : 'Save'}
          </button>
        </div>
      </div>
    </>
  )
}
