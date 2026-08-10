import { useInspection } from '../../context/InspectionContext'
import { NOTES_FIELDS } from '../../data/notesFields'
import { navAnchorId } from '../../lib/sectionNav'

export default function NotesSection() {
  const { data, updateNote } = useInspection()
  const notes = data.notesData

  return (
    <div className="notes-section">
      <p className="section-eyebrow">Section 5</p>
      <h2 className="section-title">Inspector Notes</h2>

      {NOTES_FIELDS.map(({ key, label, rows, placeholder }) => (
        <div
          key={key}
          id={navAnchorId(`note-${key}`)}
          data-nav-anchor={`note-${key}`}
          className="notes-card app-card"
        >
          <label className="notes-card__label">{label}</label>
          <textarea
            className="notes-card__textarea"
            rows={rows}
            placeholder={placeholder}
            value={notes[key] || ''}
            onChange={e => updateNote(key, e.target.value)}
          />
        </div>
      ))}
    </div>
  )
}
