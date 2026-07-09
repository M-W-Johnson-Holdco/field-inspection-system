import { useMemo, useState } from 'react'
import { Loader, Shield, Trash2, X } from 'lucide-react'
import {
  defaultAccessLabel,
  isAllowedAppEmail,
  normalizeEmail,
  orgForEmail,
} from '../lib/accessConfig'
import { usePermissions } from '../context/PermissionsContext'
import { TokenExpiredError } from '../lib/driveService'
import { useAuth } from '../context/AuthContext'

export default function AccessAdminModal({ onClose }) {
  const { user, setTokenExpired } = useAuth()
  const { permissions, updatePermissions } = usePermissions()
  const [draft, setDraft] = useState(() => ({
    crossOrgViewers: [...permissions.crossOrgViewers],
    accessAdmins: [...permissions.accessAdmins],
  }))
  const [newEmail, setNewEmail] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const sortedViewers = useMemo(
    () => [...draft.crossOrgViewers].sort((a, b) => a.localeCompare(b)),
    [draft.crossOrgViewers],
  )

  function addCrossOrgViewer() {
    const email = normalizeEmail(newEmail)
    setError(null)
    if (!email) {
      setError('Enter an email address.')
      return
    }
    if (!isAllowedAppEmail(email)) {
      setError('Email must be @peachtreerestorations.com or @tcroofingexperts.com.')
      return
    }
    if (draft.crossOrgViewers.includes(email)) {
      setError('That email is already on the list.')
      return
    }
    setDraft(current => ({
      ...current,
      crossOrgViewers: [...current.crossOrgViewers, email],
    }))
    setNewEmail('')
  }

  function removeCrossOrgViewer(email) {
    setDraft(current => ({
      ...current,
      crossOrgViewers: current.crossOrgViewers.filter(entry => entry !== email),
    }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const next = {
        ...draft,
        accessAdmins: draft.accessAdmins.includes(normalizeEmail(user?.email))
          ? draft.accessAdmins
          : [...draft.accessAdmins, normalizeEmail(user?.email)],
      }
      await updatePermissions(next)
      onClose()
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        onClose()
        setTokenExpired(true)
      } else {
        setError('Could not save access settings. Try again.')
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
            By default, users only see inspections in their company folder
            (<strong>PT</strong> or <strong>TC</strong>) based on their email domain.
            Add emails below to let someone see <strong>both</strong> folders in Open.
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
                  addCrossOrgViewer()
                }
              }}
            />
            <button className="app-button app-button--primary access-admin-modal__add-btn" type="button" onClick={addCrossOrgViewer}>
              Add
            </button>
          </div>

          {error && <p className="access-admin-modal__error">{error}</p>}

          <div className="access-admin-modal__list">
            {sortedViewers.length === 0 && (
              <p className="access-admin-modal__empty">No cross-company viewers yet.</p>
            )}
            {sortedViewers.map(email => (
              <div key={email} className="access-admin-modal__row">
                <div className="access-admin-modal__row-main">
                  <Shield size={16} className="access-admin-modal__row-icon" aria-hidden="true" />
                  <div>
                    <p className="access-admin-modal__email">{email}</p>
                    <p className="access-admin-modal__meta">
                      Default folder: {orgForEmail(email) || '—'} · Access: PT + TC
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="access-admin-modal__remove"
                  aria-label={`Remove ${email}`}
                  onClick={() => removeCrossOrgViewer(email)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <p className="access-admin-modal__note">
            Your current access: <strong>{defaultAccessLabel(user?.email, permissions)}</strong>.
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
