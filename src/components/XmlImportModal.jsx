export default function XmlImportModal({ parsed, existing, onApply, onClose }) {
  const { address, pitch, lineLengths, valleyPresent } = parsed

  const rows = []
  if (address?.address1) {
    const parts = [address.address1, address.city, address.state, address.zipcode].filter(Boolean)
    rows.push({ label: 'Property Address', value: parts.join(', '), overwrite: Boolean(existing?.addr) })
  }
  if (pitch) {
    rows.push({ label: 'Predominant Pitch', value: pitch, overwrite: Boolean(existing?.pitch) })
  }
  if (lineLengths?.RIDGE > 0) {
    rows.push({ label: 'Ridge Vent — Length (LF)', value: `${lineLengths.RIDGE} LF`, overwrite: Boolean(existing?.ridgeLF) })
  }
  if (valleyPresent) {
    rows.push({ label: 'Valley', value: 'Include in inspection', overwrite: Boolean(existing?.valleyIncluded) })
  }

  const hasOverwrites = rows.some(r => r.overwrite)

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="xml-import-title">
      <div className="address-modal app-card">
        <div className="address-modal__header">
          <div>
            <p className="section-eyebrow">XML Import</p>
            <h3 id="xml-import-title">Measurements Found</h3>
          </div>
        </div>

        {rows.length === 0 ? (
          <p style={{ padding: '0 0 1rem', color: 'var(--text-secondary, #666)', fontSize: '0.9rem' }}>
            No mappable fields were found in this file.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', fontSize: '0.9rem' }}>
            <tbody>
              {rows.map(row => (
                <tr key={row.label} style={{ borderBottom: '1px solid var(--border, #e5e7eb)' }}>
                  <td style={{ padding: '0.5rem 0.75rem 0.5rem 0', color: 'var(--text-secondary, #666)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                    {row.label}
                  </td>
                  <td style={{ padding: '0.5rem 0', verticalAlign: 'top' }}>
                    <span style={{ fontWeight: 500 }}>{row.value}</span>
                    {row.overwrite && (
                      <span style={{ display: 'block', fontSize: '0.75rem', color: '#b45309', marginTop: '0.15rem' }}>
                        ⚠ Will overwrite existing value
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!hasOverwrites && rows.length > 0 && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #888)', marginBottom: '1rem' }}>
            Fields not listed above are unchanged.
          </p>
        )}

        <div className="address-modal__actions">
          <button type="button" className="modal-btn modal-btn--secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="modal-btn modal-btn--primary" onClick={onApply} disabled={rows.length === 0}>Apply</button>
        </div>
      </div>
    </div>
  )
}
