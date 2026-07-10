import { useEffect, useRef, useState } from 'react'
import { useInspection } from '../context/InspectionContext'
import { useAuth } from '../context/AuthContext'
import { saveInspectionToDrive, TokenExpiredError } from '../lib/driveService'
import OpenInspectionModal from './OpenInspectionModal'
import AccessAdminModal from './AccessAdminModal'
import ImportChooserModal from './ImportChooserModal'
import ImageImportModal from './ImageImportModal'
import XmlImportModal from './XmlImportModal'
import { usePermissions } from '../context/PermissionsContext'
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Save,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  FolderOpen,
  FilePlus,
  CircleHelp,
  FileInput,
  Shield,
  MoveHorizontal,
} from 'lucide-react'

const TOTAL_TABS = 6
const TOOLBAR_SCALE_KEY = 'tc_toolbar_scale_v2'
const TOOLBAR_SCALE_MIN = 0.75
const TOOLBAR_SCALE_MAX = 2.5
const TOOLBAR_SCALE_DEFAULT = 1
const TOOLBAR_VIEWPORT_MARGIN = 20

const DESKTOP_TOOLBAR_MQ = '(min-width: 760px)'

function isDesktopToolbar() {
  return window.matchMedia(DESKTOP_TOOLBAR_MQ).matches
}

function getViewportMaxToolbarScale(barEl) {
  if (!barEl) return TOOLBAR_SCALE_MAX
  const available = window.innerWidth - TOOLBAR_VIEWPORT_MARGIN
  const unscaledWidth = barEl.offsetWidth
  if (!unscaledWidth) return TOOLBAR_SCALE_MAX
  return available / unscaledWidth
}

function readToolbarScale() {
  const stored = Number(localStorage.getItem(TOOLBAR_SCALE_KEY))
  if (!Number.isFinite(stored)) return TOOLBAR_SCALE_DEFAULT
  return Math.min(TOOLBAR_SCALE_MAX, Math.max(TOOLBAR_SCALE_MIN, stored))
}

function clampToolbarScale(value, barEl = null) {
  if (isDesktopToolbar()) return 1
  let next = Math.min(TOOLBAR_SCALE_MAX, Math.max(TOOLBAR_SCALE_MIN, value))
  if (barEl) {
    next = Math.min(next, getViewportMaxToolbarScale(barEl))
  }
  return next
}

function getTouchDistance(touches) {
  return Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY,
  )
}

function phoneDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

function isValidAddressParts(parts) {
  return Boolean(
    parts &&
    String(parts.address1 || '').trim() &&
    String(parts.city || '').trim() &&
    /^[A-Z]{2}$/i.test(String(parts.state || '').trim()) &&
    /^\d{5}$/.test(String(parts.zipcode || '').trim())
  )
}

function getJobInfoSaveError(jobInfo) {
  if (!String(jobInfo?.cust || '').trim()) {
    return { field: 'cust', message: 'Customer name is required before saving.' }
  }
  if (phoneDigits(jobInfo?.phone).length !== 10) {
    return { field: 'phone', message: 'Enter a 10-digit customer phone before saving.' }
  }
  if (!isValidEmail(jobInfo?.email)) {
    return { field: 'email', message: 'Enter a valid customer email before saving.' }
  }
  if (!isValidAddressParts(jobInfo?.addrParts)) {
    return { field: 'addr', message: 'Property address is required before saving.' }
  }
  if (jobInfo?.hasSeparateContact === 'Yes') {
    if (!String(jobInfo?.contactName || '').trim()) {
      return { field: 'contactName', message: 'Contact name is required when separate contact is enabled.' }
    }
    if (phoneDigits(jobInfo?.contactPhone).length !== 10) {
      return { field: 'contactPhone', message: 'Enter a 10-digit contact phone when separate contact is enabled.' }
    }
    if (!isValidEmail(jobInfo?.contactEmail)) {
      return { field: 'contactEmail', message: 'Enter a valid contact email when separate contact is enabled.' }
    }
  }
  return null
}

export default function ActionBar() {
  const { activeTab, setActiveTab, resetAll, startNewInspection, data, driveSaveStatus, setDriveSaveStatus, loadInspection, applyXmlImport } = useInspection()
  const { accessToken, user, setTokenExpired } = useAuth()
  const { isAccessAdmin } = usePermissions()
  const canManageAccess = isAccessAdmin
  const [driveStatus, setDriveStatus] = useState('idle') // idle | saving | done | error
  const [showOpen, setShowOpen] = useState(false)
  const [showAccessAdmin, setShowAccessAdmin] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showImportChooser, setShowImportChooser] = useState(false)
  const [showImportXml, setShowImportXml] = useState(false)
  const [showImportImages, setShowImportImages] = useState(false)
  const [toolbarScale, setToolbarScale] = useState(readToolbarScale)
  const actionBarRef = useRef(null)
  const toolbarScaleRef = useRef(toolbarScale)
  const pinchStateRef = useRef(null)
  const canGoBack = activeTab > 0
  const canGoNext = activeTab < TOTAL_TABS - 1

  useEffect(() => {
    toolbarScaleRef.current = toolbarScale
  }, [toolbarScale])

  useEffect(() => {
    function syncScaleToViewport() {
      const bar = actionBarRef.current
      if (!bar) return
      if (isDesktopToolbar()) {
        if (toolbarScaleRef.current !== 1) {
          toolbarScaleRef.current = 1
          setToolbarScale(1)
        }
        return
      }
      const next = clampToolbarScale(toolbarScaleRef.current, bar)
      if (next === toolbarScaleRef.current) return
      toolbarScaleRef.current = next
      setToolbarScale(next)
      localStorage.setItem(TOOLBAR_SCALE_KEY, String(next))
    }

    syncScaleToViewport()
    const frame = requestAnimationFrame(syncScaleToViewport)
    window.addEventListener('resize', syncScaleToViewport)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', syncScaleToViewport)
    }
  }, [])

  useEffect(() => {
    const bar = actionBarRef.current
    if (!bar) return undefined

    function handleTouchStart(e) {
      if (isDesktopToolbar() || e.touches.length !== 2) return
      pinchStateRef.current = {
        startDistance: getTouchDistance(e.touches),
        startScale: toolbarScaleRef.current,
      }
    }

    function handleTouchMove(e) {
      if (e.touches.length !== 2 || !pinchStateRef.current) return
      e.preventDefault()
      const distance = getTouchDistance(e.touches)
      const ratio = distance / pinchStateRef.current.startDistance
      const next = clampToolbarScale(pinchStateRef.current.startScale * ratio, bar)
      toolbarScaleRef.current = next
      setToolbarScale(next)
    }

    function finishPinch() {
      if (!pinchStateRef.current) return
      pinchStateRef.current = null
      localStorage.setItem(TOOLBAR_SCALE_KEY, String(toolbarScaleRef.current))
    }

    function handleTouchEnd() {
      finishPinch()
    }

    function handleWheel(e) {
      if (isDesktopToolbar() || !e.ctrlKey) return
      e.preventDefault()
      const next = clampToolbarScale(toolbarScaleRef.current + (e.deltaY > 0 ? -0.04 : 0.04), bar)
      toolbarScaleRef.current = next
      setToolbarScale(next)
      localStorage.setItem(TOOLBAR_SCALE_KEY, String(next))
    }

    bar.addEventListener('touchstart', handleTouchStart, { passive: true })
    bar.addEventListener('touchmove', handleTouchMove, { passive: false })
    bar.addEventListener('touchend', handleTouchEnd, { passive: true })
    bar.addEventListener('touchcancel', handleTouchEnd, { passive: true })
    bar.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      bar.removeEventListener('touchstart', handleTouchStart)
      bar.removeEventListener('touchmove', handleTouchMove)
      bar.removeEventListener('touchend', handleTouchEnd)
      bar.removeEventListener('touchcancel', handleTouchEnd)
      bar.removeEventListener('wheel', handleWheel)
    }
  }, [])

  function scrollToSectionTop() {
    requestAnimationFrame(() => {
      document.getElementById('section-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function goToSection(nextTab) {
    setActiveTab(nextTab)
    scrollToSectionTop()
  }

  async function handleSaveToDrive() {
    const saveError = getJobInfoSaveError(data.jobInfo)
    if (saveError) {
      window.alert(saveError.message)
      goToSection(0)
      setTimeout(() => document.getElementById(saveError.field)?.focus(), 100)
      return
    }

    if (!accessToken) {
      setTokenExpired(true)
      return
    }
    setDriveStatus('saving')
    setDriveSaveStatus('saving')
    try {
      const { folderName, photoCount } = await saveInspectionToDrive(accessToken, data, user?.fullName, user?.email)
      setDriveStatus('done')
      setDriveSaveStatus('saved')
      setTimeout(() => setDriveStatus('idle'), 3000)
      console.info(`Saved to Drive: ${folderName} (${photoCount} photos)`)
    } catch (err) {
      console.error('Drive save failed:', err)
      if (err instanceof TokenExpiredError) {
        setDriveStatus('idle')
        setDriveSaveStatus('unsaved')
        setTokenExpired(true)
      } else {
        setDriveStatus('error')
        setDriveSaveStatus('error')
        setTimeout(() => setDriveStatus('idle'), 4000)
      }
    }
  }

  function handleImport() {
    setShowImportChooser(true)
  }

  function handleChooseMeasurements() {
    setShowImportChooser(false)
    setShowImportXml(true)
  }

  function handleChooseImages() {
    setShowImportChooser(false)
    setShowImportImages(true)
  }

  function handleXmlApply(parsed) {
    applyXmlImport(parsed)
  }

  function handleNew() {
    if (!window.confirm('Start a new inspection? This will clear the current form.')) return
    startNewInspection()
    goToSection(0)
    window.scrollTo(0, 0)
  }

  function handleOpenInspection() {
    if (!accessToken) {
      setTokenExpired(true)
      return
    }
    setShowOpen(true)
  }

  function handleLoad(inspectionData) {
    loadInspection(inspectionData)
    setShowOpen(false)
    window.scrollTo(0, 0)
  }

  function handleReset() {
    resetAll()
  }

  const SaveIcon =
    driveStatus === 'done'  ? CheckCircle :
    driveStatus === 'error' ? AlertCircle : Save

  return (
    <>
      <div
        ref={actionBarRef}
        className="action-bar"
        style={{ '--toolbar-scale': toolbarScale }}
        title="Swipe for more actions. Pinch with two fingers to resize."
        aria-label="Inspection toolbar. Swipe horizontally for more actions. Pinch with two fingers to resize."
      >
        <div className="action-bar__scroll" role="toolbar" aria-label="Inspection actions">
          <button
            className={`app-button app-button--secondary ${canGoBack ? 'app-button--active-nav' : ''}`}
            type="button"
            aria-label="Back"
            title="Back"
            onClick={() => goToSection(Math.max(0, activeTab - 1))}
            disabled={!canGoBack}
          >
            <ArrowLeft className="app-button__icon" aria-hidden="true" />
            <span className="app-button__label">Back</span>
          </button>
          <button
            className="app-button app-button--primary"
            type="button"
            aria-label="Next"
            title="Next"
            onClick={() => goToSection(Math.min(TOTAL_TABS - 1, activeTab + 1))}
            disabled={!canGoNext}
          >
            <ArrowRight className="app-button__icon" aria-hidden="true" />
            <span className="app-button__label">Next</span>
          </button>
          <button
            className="app-button app-button--save"
            type="button"
            aria-label="Save to Google Drive"
            title="Save to Google Drive"
            onClick={handleSaveToDrive}
            disabled={driveStatus === 'saving'}
          >
            <SaveIcon className="app-button__icon" aria-hidden="true" />
            <span className="app-button__label">Save</span>
          </button>
          <button
            className="app-button app-button--open"
            type="button"
            aria-label="Open inspection"
            title="Open inspection"
            onClick={handleOpenInspection}
          >
            <FolderOpen className="app-button__icon" aria-hidden="true" />
            <span className="app-button__label">Open</span>
          </button>
          <button
            className="app-button app-button--open"
            type="button"
            aria-label="Import measurements or images"
            title="Import measurements or images"
            onClick={handleImport}
          >
            <FileInput className="app-button__icon" aria-hidden="true" />
            <span className="app-button__label">Import</span>
          </button>
          <button
            className="app-button app-button--export"
            type="button"
            aria-label="Export"
            title="Export"
            disabled
          >
            <ExternalLink className="app-button__icon" aria-hidden="true" />
            <span className="app-button__label">Export</span>
          </button>
          <button
            className="app-button app-button--new"
            type="button"
            aria-label="New inspection"
            title="New inspection"
            onClick={handleNew}
          >
            <FilePlus className="app-button__icon" aria-hidden="true" />
            <span className="app-button__label">New</span>
          </button>
          <button
            className="app-button app-button--reset"
            type="button"
            aria-label="Reset"
            title="Reset"
            onClick={handleReset}
          >
            <RotateCcw className="app-button__icon" aria-hidden="true" />
            <span className="app-button__label">Reset</span>
          </button>
          <button
            className="app-button app-button--help"
            type="button"
            aria-label="Help"
            title="Help"
            onClick={() => setShowHelp(true)}
          >
            <CircleHelp className="app-button__icon" aria-hidden="true" />
            <span className="app-button__label">Help</span>
          </button>
          {canManageAccess && (
            <button
              className="app-button app-button--access"
              type="button"
              aria-label="Drive access settings"
              title="Drive access settings"
              onClick={() => setShowAccessAdmin(true)}
            >
              <Shield className="app-button__icon" aria-hidden="true" />
              <span className="app-button__label">Access</span>
            </button>
          )}
        </div>
      </div>

      {showImportChooser && (
        <ImportChooserModal
          onChooseMeasurements={handleChooseMeasurements}
          onChooseImages={handleChooseImages}
          onClose={() => setShowImportChooser(false)}
        />
      )}

      {showImportXml && (
        <XmlImportModal
          existing={{
            addr: data.jobInfo?.addr,
            pitch: data.roofData?.ri0?.fields?.['Predominant Pitch'],
            ridgeLF: data.roofData?.ri6?.fields?.['Length (LF)'],
            valleyIncluded: !data.roofData?.ri5?.excluded,
          }}
          onApply={handleXmlApply}
          onClose={() => setShowImportXml(false)}
        />
      )}

      {showImportImages && (
        <ImageImportModal onClose={() => setShowImportImages(false)} />
      )}

      {showOpen && accessToken && (
        <OpenInspectionModal
          token={accessToken}
          saveStatus={driveSaveStatus}
          onLoad={handleLoad}
          onClose={() => setShowOpen(false)}
        />
      )}

      {showAccessAdmin && (
        <AccessAdminModal onClose={() => setShowAccessAdmin(false)} />
      )}

      {showHelp && (
        <>
          <div className="modal-backdrop modal-backdrop--top" onClick={() => setShowHelp(false)} />
          <div className="toolbar-help-modal" role="dialog" aria-modal="true" aria-labelledby="toolbar-help-title">
            <div className="toolbar-help-modal__header">
              <h2 id="toolbar-help-title">Toolbar Help</h2>
              <button className="toolbar-help-modal__close" type="button" onClick={() => setShowHelp(false)} aria-label="Close help">
                ×
              </button>
            </div>
            <div className="toolbar-help-modal__list">
              <p><ArrowLeft className="toolbar-help-modal__icon" aria-hidden="true" /><span><strong>Back:</strong> Go to the previous inspection section.</span></p>
              <p><ArrowRight className="toolbar-help-modal__icon" aria-hidden="true" /><span><strong>Next:</strong> Go to the next inspection section.</span></p>
              <p><Save className="toolbar-help-modal__icon" aria-hidden="true" /><span><strong>Save:</strong> Save the current inspection to Google Drive.</span></p>
              <p><FolderOpen className="toolbar-help-modal__icon" aria-hidden="true" /><span><strong>Open:</strong> Open a saved inspection from Google Drive.</span></p>
              <p><FileInput className="toolbar-help-modal__icon" aria-hidden="true" /><span><strong>Import:</strong> Choose measurements (EagleView XML) or bulk-assign photos to form categories.</span></p>
              <p><ExternalLink className="toolbar-help-modal__icon" aria-hidden="true" /><span><strong>Export:</strong> Reserved for exporting inspection reports.</span></p>
              <p><FilePlus className="toolbar-help-modal__icon" aria-hidden="true" /><span><strong>New:</strong> Start a new inspection form.</span></p>
              <p><RotateCcw className="toolbar-help-modal__icon" aria-hidden="true" /><span><strong>Reset:</strong> Clear all current inspection data.</span></p>
              <p><CircleHelp className="toolbar-help-modal__icon" aria-hidden="true" /><span><strong>Help:</strong> Show this toolbar guide.</span></p>
              <p><Shield className="toolbar-help-modal__icon" aria-hidden="true" /><span><strong>Access:</strong> Manage who can sign in and their role — Sales, PM, or Admin (admins only).</span></p>
              <p><MoveHorizontal className="toolbar-help-modal__icon" aria-hidden="true" /><span><strong>Scroll:</strong> Swipe the toolbar left or right to see more buttons.</span></p>
              <p><CircleHelp className="toolbar-help-modal__icon" aria-hidden="true" /><span><strong>Resize:</strong> Pinch the toolbar with two fingers to make it bigger or smaller. On desktop, use Ctrl + scroll over the toolbar.</span></p>
            </div>
          </div>
        </>
      )}
    </>
  )
}
