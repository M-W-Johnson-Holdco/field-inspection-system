import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useInspection } from '../../context/InspectionContext'
import { filterInsuranceCompanies } from '../../data/insuranceCompanies'
import { withSelectPlaceholderClass } from '../../utils/fieldGrid'
import useExpandedSection from '../../hooks/useExpandedSection'
import { formatPropertyAddress } from '../../utils/address'

const CONTACT_OPTIONS = ['Phone', 'Email', 'Text']
const LOSS_TYPE_OPTIONS = [
  'Wind',
  'Hail',
  'Falling Objects or Debris',
  'Fire',
  'Lightning',
  'Ice/Snow',
]
const EMPTY_ADDRESS = { address1: '', address2: '', city: '', state: '', zipcode: '' }

function phoneDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

function formatPhone(value) {
  const digits = phoneDigits(value).slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

function validateAddressParts(parts) {
  return {
    address1: !String(parts.address1 || '').trim(),
    city: !String(parts.city || '').trim(),
    state: String(parts.state || '').trim().length !== 2,
    zipcode: !/^\d{5}$/.test(String(parts.zipcode || '').trim()),
  }
}

function hasAddressErrors(errors) {
  return Object.values(errors).some(Boolean)
}

function InsuranceField({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const suggestions = open ? filterInsuranceCompanies(value, 3) : []

  function selectCompany(name) {
    onChange(name)
    setOpen(false)
  }

  return (
    <div className={`form-field autocomplete${suggestions.length > 0 ? ' autocomplete--open' : ''}`}>
      <label className="form-label" htmlFor="ins">Insurance Co</label>
      <input
        id="ins"
        name="ins"
        className="form-input"
        value={value}
        placeholder="State Farm"
        autoComplete="off"
        onChange={e => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
      />
      {suggestions.length > 0 && (
        <ul className="autocomplete__menu" role="listbox" aria-label="Insurance company suggestions">
          {suggestions.map(name => (
            <li key={name}>
              <button
                type="button"
                className="autocomplete__option"
                role="option"
                onMouseDown={e => {
                  e.preventDefault()
                  selectCompany(name)
                }}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function JobInfoGroup({ title, headingId, defaultOpen = true, children }) {
  const [isOpen, setIsOpen] = useExpandedSection(`jobInfo:${headingId}`, defaultOpen)
  const panelId = `${headingId}-panel`

  return (
    <section className={`job-info-group ${isOpen ? 'job-info-group--open' : ''}`}>
      <button
        type="button"
        className="job-info-group__toggle"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen(open => !open)}
      >
        <h3 id={headingId} className="job-info-group__title">{title}</h3>
        <ChevronDown className="job-info-group__chevron" aria-hidden="true" />
      </button>
      <div
        id={panelId}
        className={`collapse-panel ${isOpen ? 'collapse-panel--open' : ''}`}
        aria-hidden={!isOpen}
        aria-labelledby={headingId}
      >
        <div className="collapse-panel__inner">
          <div className="job-info-group__content">
            {children}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function JobInfo() {
  const { data, updateJobInfo } = useInspection()
  const ji = data.jobInfo
  const [addressOpen, setAddressOpen] = useState(false)
  const [addressDraft, setAddressDraft] = useState({ ...EMPTY_ADDRESS, ...(ji.addrParts || {}) })
  const [addressTouched, setAddressTouched] = useState(false)
  const [isOpen, setIsOpen] = useExpandedSection('jobInfo:main', true)

  function field(id, label, props = {}) {
    const { full, validation, required, ...inputProps } = props
    const value = ji[id] || ''
    const showPhoneError = validation === 'phone' && value && phoneDigits(value).length !== 10
    const showEmailError = validation === 'email' && value && !isValidEmail(value)
    const error = showPhoneError
      ? 'Enter a 10-digit phone number.'
      : showEmailError
        ? 'Enter a valid email address.'
        : ''

    function handleChange(e) {
      const nextValue = validation === 'phone' ? formatPhone(e.target.value) : e.target.value
      updateJobInfo(id, nextValue)
    }

    return (
      <div className={`form-field ${full ? 'form-field--full' : ''}`}>
        <label className="form-label" htmlFor={id}>
          {label}{required && <span className="required-star"> *</span>}
        </label>
        <input
          id={id}
          name={id}
          className={`form-input ${error ? 'form-input--invalid' : ''}`}
          value={value}
          onChange={handleChange}
          required={required}
          aria-invalid={Boolean(error)}
          {...inputProps}
        />
        {error && <p className="form-error">{error}</p>}
      </div>
    )
  }

  function toggleContact(val) {
    const cur = ji.preferredContact || []
    updateJobInfo('preferredContact',
      cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val]
    )
  }

  function toggleLossType(val) {
    const current = Array.isArray(ji.lossType) ? ji.lossType : []
    updateJobInfo(
      'lossType',
      current.includes(val) ? current.filter(item => item !== val) : [...current, val],
    )
  }

  function setSeparateContact(val) {
    updateJobInfo('hasSeparateContact', val)
    if (val !== 'Yes') {
      updateJobInfo('contactName', '')
      updateJobInfo('contactPhone', '')
      updateJobInfo('contactEmail', '')
    }
  }

  function setResidence(val) {
    updateJobInfo('residenceType', val)
    if (val === 'Primary') {
      updateJobInfo('tenantname', '')
      updateJobInfo('tenantphone', '')
    }
  }

  function openAddressPopup() {
    setAddressDraft({ ...EMPTY_ADDRESS, ...(ji.addrParts || {}) })
    setAddressTouched(false)
    setAddressOpen(true)
  }

  function updateAddressDraft(field, value) {
    let nextValue = value
    if (field === 'state') nextValue = value.replace(/[^a-z]/gi, '').slice(0, 2).toUpperCase()
    if (field === 'zipcode') nextValue = value.replace(/\D/g, '').slice(0, 5)
    setAddressDraft(prev => ({ ...prev, [field]: nextValue }))
  }

  function completeAddress() {
    const normalized = {
      address1: addressDraft.address1.trim(),
      address2: addressDraft.address2.trim(),
      city: addressDraft.city.trim(),
      state: addressDraft.state.trim().toUpperCase(),
      zipcode: addressDraft.zipcode.trim(),
    }
    const errors = validateAddressParts(normalized)
    if (hasAddressErrors(errors)) {
      setAddressTouched(true)
      return
    }

    updateJobInfo('addrParts', normalized)
    updateJobInfo('addr', formatPropertyAddress(normalized))
    setAddressOpen(false)
  }

  const addressErrors = validateAddressParts(addressDraft)
  const showAddressErrors = addressTouched && hasAddressErrors(addressErrors)
  const addressCanComplete = !hasAddressErrors(addressErrors)

  return (
    <section className={`job-card app-card ${isOpen ? 'job-card--open' : ''}`}>
      <button
        type="button"
        className="card-header card-header--toggle"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(open => !open)}
      >
        <div>
          <h2 className="card-title">Job Information</h2>
          <p className="card-subtitle">Customer, claim, contact, and assignment details.</p>
        </div>
        <div className="card-header__actions">
          <ChevronDown className={`card-header__chevron ${isOpen ? 'card-header__chevron--open' : ''}`} aria-hidden="true" />
        </div>
      </button>
      <div className={`collapse-panel ${isOpen ? 'collapse-panel--open' : ''}`} aria-hidden={!isOpen}>
        <div className="collapse-panel__inner">
          <div className="job-info-groups">
            <JobInfoGroup title="Customer & Contact" headingId="job-info-customer-heading">
              <div className="form-grid">
                {field('cust', 'Customer Name(s)', { full: true, placeholder: 'John Jones, Mary Jones', required: true })}
                {field('phone', 'Customer Phone', { type: 'tel', inputMode: 'tel', placeholder: '(214) 555-0100', validation: 'phone', required: true })}
                {field('email', 'Customer Email', { type: 'email', placeholder: 'john@email.com', validation: 'email', required: true })}

                <div className="form-field form-field--full">
                  <label className="form-label">Separate Contact?</label>
                  <select
                    className={withSelectPlaceholderClass('field-select compact-select', ji.hasSeparateContact)}
                    value={ji.hasSeparateContact || ''}
                    onChange={e => setSeparateContact(e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>

                {(ji.hasSeparateContact === 'Yes') && (
                  <>
                    {field('contactName', 'Contact Name', { full: true, placeholder: 'Full name', required: true })}
                    {field('contactPhone', 'Contact Phone', { type: 'tel', inputMode: 'tel', placeholder: '(214) 555-0101', validation: 'phone', required: true })}
                    {field('contactEmail', 'Contact Email', { type: 'email', placeholder: 'contact@email.com', validation: 'email', required: true })}
                  </>
                )}

                <div className="form-field form-field--full">
                  <label className="form-label">Preferred Contact Method</label>
                  <details className="multi-select multi-select--field-select">
                    <summary className={withSelectPlaceholderClass('field-select compact-select', (ji.preferredContact || []).length ? ji.preferredContact.join(', ') : '')}>
                      {(ji.preferredContact || []).length ? ji.preferredContact.join(', ') : 'Select'}
                    </summary>
                    <div
                      className="multi-select__menu"
                      onMouseDown={e => e.preventDefault()}
                      onClick={e => e.stopPropagation()}
                    >
                      {CONTACT_OPTIONS.map(opt => (
                        <label key={opt} className="multi-select__option">
                          <input
                            type="checkbox"
                            checked={(ji.preferredContact || []).includes(opt)}
                            onChange={() => toggleContact(opt)}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </details>
                </div>
              </div>
            </JobInfoGroup>

            <JobInfoGroup title="Property Details" headingId="job-info-property-heading">
              <div className="form-grid">
                <div className="form-field form-field--full">
                  <label className="form-label">Property Type</label>
                  <select
                    className="field-select compact-select"
                    value={ji.residenceType || 'Primary'}
                    onChange={e => setResidence(e.target.value)}
                  >
                    <option value="Primary">Primary Property</option>
                    <option value="Secondary">Secondary Property</option>
                    <option value="Rental">Rental Property</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>

                <div className="form-field form-field--full">
                  <label className="form-label">Property Address <span className="required-star">*</span></label>
                  <button
                    id="addr"
                    type="button"
                    className={`address-trigger ${ji.addr ? '' : 'address-trigger--empty'}`}
                    onClick={openAddressPopup}
                  >
                    {ji.addr || 'Tap to enter property address'}
                  </button>
                </div>

                {ji.residenceType === 'Rental' && (
                  <>
                    {field('tenantname', 'Tenant Name', { placeholder: 'Tenant full name' })}
                    {field('tenantphone', 'Tenant Phone', { type: 'tel', inputMode: 'tel', placeholder: '(214) 555-0101', validation: 'phone' })}
                  </>
                )}

                {field('pm', 'Project Manager', { placeholder: 'Name' })}
                {field('insp', 'Inspector / Rep', { placeholder: 'Name' })}
                <InsuranceField value={ji.ins || ''} onChange={val => updateJobInfo('ins', val)} />
                {field('claim', 'Claim #', { placeholder: 'Pending if not filed' })}
                {field('claimFileDate', 'Claim File Date', { type: 'date', full: true })}
                {field('stormDate', 'Date of Loss', { type: 'date', full: true })}
                <div className="form-field form-field--full">
                  <label className="form-label">Loss Type</label>
                  <details className="multi-select multi-select--field-select">
                    <summary className={withSelectPlaceholderClass(
                      'field-select compact-select',
                      (ji.lossType || []).length ? ji.lossType.join(', ') : '',
                    )}>
                      {(ji.lossType || []).length ? ji.lossType.join(', ') : 'Select'}
                    </summary>
                    <div
                      className="multi-select__menu"
                      onMouseDown={e => e.preventDefault()}
                      onClick={e => e.stopPropagation()}
                    >
                      {LOSS_TYPE_OPTIONS.map(option => (
                        <label key={option} className="multi-select__option">
                          <input
                            type="checkbox"
                            checked={(ji.lossType || []).includes(option)}
                            onChange={() => toggleLossType(option)}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </details>
                  {(ji.lossType || []).length > 0 && (
                    <div className="multi-select__selected" aria-label="Selected loss types">
                      {ji.lossType.map(option => (
                        <span key={option} className="multi-select__chip">{option}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </JobInfoGroup>
          </div>
        </div>
      </div>

      {addressOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="address-modal-title">
          <div className="address-modal app-card">
            <div className="address-modal__header">
              <div>
                <p className="section-eyebrow">Property Address</p>
                <h3 id="address-modal-title">Enter Address</h3>
              </div>
            </div>

            <div className="address-modal__grid">
              <div className="form-field form-field--full">
                <label className="form-label">Address 1 <span className="required-star">*</span></label>
                <input
                  className={`form-input ${addressTouched && addressErrors.address1 ? 'form-input--invalid' : ''}`}
                  value={addressDraft.address1}
                  placeholder="Street address"
                  onChange={e => updateAddressDraft('address1', e.target.value)}
                />
              </div>
              <div className="form-field form-field--full">
                <label className="form-label">Address 2</label>
                <input
                  className="form-input"
                  value={addressDraft.address2}
                  placeholder="Apt, suite, unit, etc. (optional)"
                  onChange={e => updateAddressDraft('address2', e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label">City <span className="required-star">*</span></label>
                <input
                  className={`form-input ${addressTouched && addressErrors.city ? 'form-input--invalid' : ''}`}
                  value={addressDraft.city}
                  placeholder="City"
                  onChange={e => updateAddressDraft('city', e.target.value)}
                />
              </div>
              <div className="form-field address-state-field">
                <label className="form-label">State <span className="required-star">*</span></label>
                <input
                  className={`form-input ${addressTouched && addressErrors.state ? 'form-input--invalid' : ''}`}
                  value={addressDraft.state}
                  placeholder="TX"
                  maxLength={2}
                  onChange={e => updateAddressDraft('state', e.target.value)}
                />
              </div>
              <div className="form-field address-zip-field">
                <label className="form-label">Zipcode <span className="required-star">*</span></label>
                <input
                  className={`form-input ${addressTouched && addressErrors.zipcode ? 'form-input--invalid' : ''}`}
                  value={addressDraft.zipcode}
                  placeholder="75098"
                  inputMode="numeric"
                  onChange={e => updateAddressDraft('zipcode', e.target.value)}
                />
              </div>
            </div>

            {showAddressErrors && (
              <p className="form-error">Complete all required address fields. State must be 2 letters and zipcode must be 5 digits.</p>
            )}

            <div className="address-modal__actions">
              <button type="button" className="modal-btn modal-btn--secondary" onClick={() => setAddressOpen(false)}>Cancel</button>
              <button type="button" className="modal-btn modal-btn--primary" onClick={completeAddress} disabled={!addressCanComplete}>Complete</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
