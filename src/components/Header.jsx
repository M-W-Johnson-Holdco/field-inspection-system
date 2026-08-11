import { useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useInspection } from '../context/InspectionContext'
import { brandForEmail, orgForEmail } from '../lib/accessConfig'
import { ChevronDown } from 'lucide-react'
import tcLogo from '../assets/tc_logo.png'
import ptLogo from '../assets/pt_logo.png'

const LOGO_BY_ORG = {
  PT: ptLogo,
  TC: tcLogo,
}

export default function Header() {
  const { user, logout } = useAuth()
  const { driveSaveStatus, completion } = useInspection()
  const [isOpen, setIsOpen] = useState(true)

  const brand = useMemo(() => brandForEmail(user?.email), [user?.email])
  const logo = LOGO_BY_ORG[orgForEmail(user?.email)] ?? tcLogo

  const saveLabel = {
    saved: 'Saved',
    saving: 'Saving',
    unsaved: 'Unsaved',
    error: 'Failed',
  }[driveSaveStatus]

  const saveTitle = {
    saved: 'Saved to cloud (R2)',
    saving: 'Saving to cloud…',
    unsaved: 'Not saved to cloud yet — tap Save in the toolbar',
    error: 'Cloud save failed — tap Save to retry',
  }[driveSaveStatus]

  const isUnsaved = driveSaveStatus === 'unsaved' || driveSaveStatus === 'error'

  function handleLogout() {
    const dirty = driveSaveStatus === 'unsaved' || driveSaveStatus === 'error' || driveSaveStatus === 'saving'
    if (dirty) {
      if (!window.confirm('Sign out? Current changes are not saved to the cloud and may be lost on this device if you clear site data.')) {
        return
      }
    }
    logout()
  }

  return (
    <details
      className="app-header"
      open={isOpen}
      onToggle={e => setIsOpen(e.currentTarget.open)}
    >
      <summary className="app-header__summary">
        <div className="app-header__progress app-header__progress--summary" aria-label={`Inspection ${completion.percent}% complete`}>
          <div className="app-header__progress-top">
            <span>Inspection Progress</span>
            <strong>{completion.percent}%</strong>
          </div>
          <div className="app-header__progress-row">
            <div className="app-header__progress-track">
              <div className="app-header__progress-fill" style={{ width: `${completion.percent}%` }} />
            </div>
            <span
              className={`status-pill status-pill--compact ${isUnsaved ? 'status-pill--unsaved' : ''}`}
              title={saveTitle}
            >
              {saveLabel}
            </span>
          </div>
        </div>
        <ChevronDown className="app-header__summary-icon" aria-hidden="true" />
      </summary>
      <div className="app-header__details">
        <div className="app-header__brand">
          <img src={logo} alt={brand.logoAlt} className="app-header__logo" />
          <div className="app-header__title-group">
            <h1 className="app-header__title">
              <span className="app-header__title-mobile">{brand.titleMobile}</span>
              <span className="app-header__title-desktop">{brand.title}</span>
            </h1>
            <p className="app-header__subtitle">{brand.subtitle}</p>
          </div>
        </div>
        <div className="app-header__progress app-header__progress--details" aria-label={`Inspection ${completion.percent}% complete`}>
          <div className="app-header__progress-top">
            <span>Inspection Progress</span>
            <strong>{completion.percent}%</strong>
          </div>
          <div className="app-header__progress-row">
            <div className="app-header__progress-track">
              <div className="app-header__progress-fill" style={{ width: `${completion.percent}%` }} />
            </div>
            <span
              className={`status-pill status-pill--compact ${isUnsaved ? 'status-pill--unsaved' : ''}`}
              title={saveTitle}
            >
              {saveLabel}
            </span>
          </div>
        </div>
        <div className="app-header__user">
          {user?.picture && (
            <img className="app-header__avatar" src={user.picture} alt="" referrerPolicy="no-referrer" />
          )}
          <div>
            <p className="app-header__user-name">{user?.name}</p>
            <button className="link-button" onClick={handleLogout}>Sign out</button>
          </div>
        </div>
      </div>
    </details>
  )
}
