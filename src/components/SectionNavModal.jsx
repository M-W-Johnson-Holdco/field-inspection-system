import { useEffect, useMemo, useRef } from 'react'
import { X } from 'lucide-react'
import { useInspection } from '../context/InspectionContext'
import { buildSectionNavCatalog, groupNavEntries } from '../lib/sectionNav'

export default function SectionNavModal({ activeNavId, onJump, onClose }) {
  const { data } = useInspection()
  const listRef = useRef(null)
  const activeRef = useRef(null)

  const groups = useMemo(() => {
    const rooms = data.interiorData?.rooms || []
    return groupNavEntries(buildSectionNavCatalog(rooms))
  }, [data.interiorData?.rooms])

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [activeNavId, groups])

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className="modal-sheet section-nav-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="section-nav-title"
      >
        <div className="modal-sheet__header">
          <h2 id="section-nav-title" className="modal-sheet__title">Jump to Section</h2>
          <button className="modal-sheet__close" type="button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="section-nav-modal__body" ref={listRef}>
          {groups.map(group => (
            <div key={group.label} className="section-nav-modal__group">
              <div className="section-nav-modal__group-label">{group.label}</div>
              <ul className="section-nav-modal__list">
                {group.items.map(entry => {
                  const isActive = activeNavId === entry.id
                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        ref={isActive ? activeRef : null}
                        className={`section-nav-modal__item${isActive ? ' section-nav-modal__item--active' : ''}`}
                        aria-current={isActive ? 'true' : undefined}
                        onClick={() => {
                          onJump(entry)
                          onClose()
                        }}
                      >
                        <span className="section-nav-modal__item-label">{entry.label}</span>
                        {entry.subgroup && (
                          <span className="section-nav-modal__item-meta">{entry.subgroup}</span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
