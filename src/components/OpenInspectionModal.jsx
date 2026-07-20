import { useState, useEffect, useRef } from 'react'
import { Search, X, FolderOpen, FilePlus2, Loader } from 'lucide-react'
import { listInspectionFolders, loadInspectionFromDrive, TokenExpiredError } from '../lib/driveService'
import { useAuth } from '../context/AuthContext'
import { usePermissions } from '../context/PermissionsContext'
import { ROLES, isInspectionOwnedByUser } from '../lib/accessConfig'
import ModalSheetBack from './ModalSheetBack'

const DATE_FILTERS = [
  { label: 'This Week', days: 7 },
  { label: 'This Month', days: 30 },
  { label: 'All', days: null },
]

const PAGE_SIZE = 30

function parseFolder(folder) {
  // Format: YYYY-MM-DD - Address - Customer - Inspector
  const parts = folder.name.split(' - ')
  return {
    id: folder.id,
    name: folder.name,
    org: folder.org || '',
    ownerEmail: folder.ownerEmail || folder.appProperties?.ownerEmail || '',
    date: parts[0] || '',
    address: parts[1] || '',
    customer: parts[2] || '',
    inspector: parts[3] || '',
    createdTime: folder.createdTime,
  }
}

function withinDays(dateStr, days) {
  if (!days) return true
  const d = new Date(dateStr)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return d >= cutoff
}

function dateTime(value) {
  const time = new Date(value || '').getTime()
  return Number.isFinite(time) ? time : 0
}

function sortByNewestInspection(a, b) {
  return dateTime(b.date) - dateTime(a.date) || dateTime(b.createdTime) - dateTime(a.createdTime)
}

function CurrentBadge() {
  return <span className="modal-inspection-row__badge">Current</span>
}

export default function OpenInspectionModal({ token, saveStatus, currentFolderId = null, onLoad, onBack, onClose }) {
  const { user, setTokenExpired } = useAuth()
  const { viewableOrgs, role } = usePermissions()
  const [folders, setFolders] = useState([])
  const [listStatus, setListStatus] = useState('loading') // loading | ready | error
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('All')
  const [inspectorFilter, setInspectorFilter] = useState('All')
  const [loadingId, setLoadingId] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingFolder, setPendingFolder] = useState(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const searchRef = useRef(null)

  const isNewInspection = !currentFolderId

  useEffect(() => {
    listInspectionFolders(token, viewableOrgs)
      .then(files => {
        let next = files.map(parseFolder).sort(sortByNewestInspection)
        if (role === ROLES.sales) {
          next = next.filter(folder => isInspectionOwnedByUser(folder, user))
        }
        setFolders(next)
        setListStatus('ready')
      })
      .catch(err => {
        if (err instanceof TokenExpiredError) {
          onClose()
          setTokenExpired(true)
        } else {
          setListStatus('error')
        }
      })
  }, [token, viewableOrgs, role, user, onClose, setTokenExpired])

  useEffect(() => {
    if (listStatus === 'ready') searchRef.current?.focus()
  }, [listStatus])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [search, dateFilter, inspectorFilter])

  const inspectors = ['All', ...Array.from(new Set(folders.map(f => f.inspector).filter(Boolean))).sort()]

  const days = DATE_FILTERS.find(f => f.label === dateFilter)?.days ?? null

  const filtered = folders.filter(f => {
    if (currentFolderId && f.id === currentFolderId) return false
    if (!withinDays(f.date, days)) return false
    if (inspectorFilter !== 'All' && f.inspector !== inspectorFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      if (!f.name.toLowerCase().includes(q)) return false
    }
    return true
  })

  const currentFolder = currentFolderId
    ? folders.find(f => f.id === currentFolderId) || null
    : null

  const visibleFolders = filtered.slice(0, visibleCount)
  const remainingCount = Math.max(0, filtered.length - visibleFolders.length)
  const showEmptyState = listStatus === 'ready'
    && filtered.length === 0
    && !isNewInspection
    && !currentFolder

  function requestOpen(folder) {
    if (folder.id === currentFolderId) return
    if (saveStatus === 'unsaved') {
      setPendingFolder(folder)
      setConfirmOpen(true)
    } else {
      doOpen(folder)
    }
  }

  async function doOpen(folder) {
    setConfirmOpen(false)
    setLoadingId(folder.id)
    try {
      const data = await loadInspectionFromDrive(token, folder.id)
      onLoad(data, folder.id)
    } catch (err) {
      console.error('Failed to load inspection:', err)
      if (err instanceof TokenExpiredError) {
        onClose()
        setTokenExpired(true)
      } else {
        alert('Failed to load inspection. Please try again.')
      }
    } finally {
      setLoadingId(null)
    }
  }

  function renderFolderRow(folder, { isCurrent = false } = {}) {
    return (
      <button
        key={folder.id}
        type="button"
        className={`modal-inspection-row ${isCurrent ? 'modal-inspection-row--current' : ''}`}
        onClick={() => requestOpen(folder)}
        disabled={loadingId === folder.id}
        aria-current={isCurrent ? 'true' : undefined}
      >
        <FolderOpen size={18} className="modal-inspection-row__icon" />
        <span className="modal-inspection-row__name">
          {viewableOrgs.length > 1 && folder.org && (
            <span className="modal-inspection-row__org">{folder.org}</span>
          )}
          {folder.name}
        </span>
        {isCurrent && <CurrentBadge />}
        {loadingId === folder.id && <Loader size={16} className="spin modal-inspection-row__loader" />}
      </button>
    )
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-sheet" role="dialog" aria-modal="true" aria-label="Open Inspection">
        <div className="modal-sheet__header">
          <div className="modal-sheet__header-main">
            {onBack && <ModalSheetBack onClick={onBack} />}
            <h2 className="modal-sheet__title">Open Inspection</h2>
          </div>
          <button className="modal-sheet__close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-sheet__search-row">
          <Search size={16} className="modal-sheet__search-icon" />
          <input
            ref={searchRef}
            className="modal-sheet__search"
            type="search"
            placeholder="Search address, customer, inspector…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="modal-sheet__filters">
          <div className="modal-sheet__filter-group">
            {DATE_FILTERS.map(f => (
              <button
                key={f.label}
                className={`modal-filter-chip ${dateFilter === f.label ? 'modal-filter-chip--active' : ''}`}
                onClick={() => setDateFilter(f.label)}
              >
                {f.label}
              </button>
            ))}
          </div>
          {inspectors.length > 2 && (
            <select
              className="modal-sheet__select"
              value={inspectorFilter}
              onChange={e => setInspectorFilter(e.target.value)}
            >
              {inspectors.map(i => <option key={i}>{i}</option>)}
            </select>
          )}
        </div>

        <div className="modal-sheet__list">
          {listStatus === 'loading' && (
            <div className="modal-sheet__state">
              <Loader size={20} className="spin" />
              <span>Loading inspections…</span>
            </div>
          )}
          {listStatus === 'error' && (
            <div className="modal-sheet__state modal-sheet__state--error">
              Failed to load inspections. Check your connection and try again.
            </div>
          )}
          {listStatus === 'ready' && isNewInspection && (
            <div
              className="modal-inspection-row modal-inspection-row--current modal-inspection-row--static"
              aria-current="true"
            >
              <FilePlus2 size={18} className="modal-inspection-row__icon" />
              <span className="modal-inspection-row__name">New Inspection File</span>
              <CurrentBadge />
            </div>
          )}
          {listStatus === 'ready' && currentFolder && renderFolderRow(currentFolder, { isCurrent: true })}
          {listStatus === 'ready' && currentFolderId && !currentFolder && (
            <div
              className="modal-inspection-row modal-inspection-row--current modal-inspection-row--static"
              aria-current="true"
            >
              <FolderOpen size={18} className="modal-inspection-row__icon" />
              <span className="modal-inspection-row__name">Current inspection (not in this list)</span>
              <CurrentBadge />
            </div>
          )}
          {showEmptyState && (
            <div className="modal-sheet__state">No inspections found.</div>
          )}
          {listStatus === 'ready' && visibleFolders.map(folder => renderFolderRow(folder))}
          {listStatus === 'ready' && remainingCount > 0 && (
            <button
              type="button"
              className="modal-load-more"
              onClick={() => setVisibleCount(count => count + PAGE_SIZE)}
            >
              Show 30 More ({remainingCount} remaining)
            </button>
          )}
        </div>
      </div>

      {confirmOpen && (
        <>
          <div className="modal-backdrop modal-backdrop--top" />
          <div className="modal-confirm" role="alertdialog" aria-modal="true">
            <p className="modal-confirm__msg">You have unsaved changes. Opening another inspection will discard them.</p>
            <div className="modal-confirm__actions">
              <button className="app-button app-button--secondary" onClick={() => setConfirmOpen(false)}>
                Go Back & Save
              </button>
              <button className="app-button app-button--danger" onClick={() => doOpen(pendingFolder)}>
                Discard & Open
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
