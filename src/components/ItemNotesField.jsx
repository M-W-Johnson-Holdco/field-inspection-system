import DamageDescriptionInput from './DamageDescriptionInput'

export default function ItemNotesField({
  value,
  onChange,
  placeholder = 'Add notes…',
  label = 'Notes',
}) {
  return (
    <div className="ri-notes-row">
      <label className="form-label">{label}</label>
      <DamageDescriptionInput
        className="ri-notes-input"
        placeholder={placeholder}
        value={value || ''}
        onChange={onChange}
      />
    </div>
  )
}
