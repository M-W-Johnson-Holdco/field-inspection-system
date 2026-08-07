import { useInspection } from '../../context/InspectionContext'

const NOTES_FIELDS = [
  { key: 'summary',   label: 'Overall Inspection Summary',                              rows: 4, placeholder: 'Overall condition of the property, visible storm damage, initial assessment...' },
  { key: 'concerns',  label: 'Areas of Concern',                                        rows: 3, placeholder: 'Pre-existing damage, active leaks, structural concerns unrelated to storm...' },
  { key: 'crosssell', label: 'Cross-Sell Opportunity',                                  rows: 2, placeholder: 'Siding, gutters, windows, solar, other trades observed that may qualify...' },
  { key: 'roof',      label: 'Roof Condition Notes',                                    rows: 3, placeholder: 'Shingle damage, granule loss, bruising pattern, hail size estimate...' },
  { key: 'roofage',   label: 'Age of Roof',                                             rows: 1, placeholder: 'Estimated or confirmed install year...' },
  { key: 'defects',   label: 'Install Defects / Leaks / Install Issues',                rows: 3, placeholder: 'Poor flashing work, chimney rot, siding rot at penetrations, active leaks, workmanship issues...' },
  { key: 'homeowner', label: 'Homeowner Notes',                                         rows: 3, placeholder: 'Language barrier noted. Primary POC is [name, relationship]. Concerns expressed by owner. Preferred times to contact...' },
  { key: 'misc',      label: 'Misc Notes',                                              rows: 4, placeholder: 'Anything else relevant to this inspection or claim...' },
]

export default function NotesSection() {
  const { data, updateNote } = useInspection()
  const notes = data.notesData

  return (
    <div className="notes-section">
      <p className="section-eyebrow">Section 5</p>
      <h2 className="section-title">Inspector Notes</h2>

      {NOTES_FIELDS.map(({ key, label, rows, placeholder }) => (
        <div key={key} className="notes-card app-card">
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
