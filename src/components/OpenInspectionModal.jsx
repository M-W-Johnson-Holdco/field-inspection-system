import { useState, useEffect, useRef } from 'react'
import { Search, X, FolderOpen, Loader } from 'lucide-react'
import { listInspectionFolders, loadInspectionFromDrive, TokenExpiredError } from '../lib/driveService'
import { useAuth } from '../context/AuthContext'
import { usePermissions } from '../context/PermissionsContext'

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

export default function OpenInspectionModal({ token, saveStatus, onLoad, onClose }) {
  const { setTokenExpired } = useAuth()
  const { viewableOrgs } = usePermissions()
  const [folders, setFolders] = useState([])
  const [listStatus, setListStatus] = useState('loading') // loading | ready | error
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('This Week')
  const [inspectorFilter, setInspectorFilter] = useState('All')
  const [loadingId, setLoadingId] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingFolder, setPendingFolder] = useState(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const searchRef = useRef(null)

  useEffect(() => {
    listInspectionFolders(token, viewableOrgs)
      .then(files => {
        setFolders(files.map(parseFolder).sort(sortByNewestInspection))
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
  }, [token, viewableOrgs, onClose, setTokenExpired])

  useEffect(() => {
    if (listStatus === 'ready') searchRef.current?.focus()
  }, [listStatus])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [search, dateFilter, inspectorFilter])

  const inspectors = ['All', ...Array.from(new Set(folders.map(f => f.inspector).filter(Boolean))).sort()]

  const days = DATE_FILTERS.find(f => f.label === dateFilter)?.days ?? null

  const filtered = folders.filter(f => {
    if (!withinDays(f.date, days)) return false
    if (inspectorFilter !== 'All' && f.inspector !== inspectorFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      if (!f.name.toLowerCase().includes(q)) return false
    }
    return true
  })

  const visibleFolders = filtered.slice(0, visibleCount)
  const remainingCount = Math.max(0, filtered.length - visibleFolders.length)

  function requestOpen(folder) {
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
      onLoad(data)
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

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-sheet" role="dialog" aria-modal="true" aria-label="Open Inspection">
        <div className="modal-sheet__header">
          <h2 className="modal-sheet__title">Open Inspection</h2>
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
          {listStatus === 'ready' && filtered.length === 0 && (
            <div className="modal-sheet__state">No inspections found.</div>
          )}
          {listStatus === 'ready' && visibleFolders.map(folder => (
            <button
              key={folder.id}
              className="modal-inspection-row"
              onClick={() => requestOpen(folder)}
              disabled={loadingId === folder.id}
            >
              <FolderOpen size={18} className="modal-inspection-row__icon" />
              <span className="modal-inspection-row__name">
                {viewableOrgs.length > 1 && folder.org && (
                  <span className="modal-inspection-row__org">{folder.org}</span>
                )}
                {folder.name}
              </span>
              {loadingId === folder.id && <Loader size={16} className="spin modal-inspection-row__loader" />}
            </button>
          ))}
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
