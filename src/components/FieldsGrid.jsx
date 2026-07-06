import { groupFieldsForGrid, fieldsGridStyle, materialOptionColumnStyle, clusterGroupsForGrid } from '../utils/fieldGrid'

export default function FieldsGrid({ fields, renderField, children, gridStyle: gridStyleOverride, compactOptionPairRow = false }) {
  const groups = clusterGroupsForGrid(groupFieldsForGrid(fields))
  const gridStyle = gridStyleOverride || fieldsGridStyle(fields)

  return (
    <div className="ri-fields-grid" style={gridStyle}>
      {groups.map(group => {
        if (group.type === 'row') {
          const rowClass = [
            'field-row',
            group.pairRowSizeType && 'field-row--pair-row-size-type',
            group.pairRow && 'field-row--pair-row',
            group.pairRow && compactOptionPairRow && 'field-row--pair-row-compact',
            group.ynPairRow && 'field-row--yn-pair',
            group.qtyRow && 'field-row--qty-row',
          ].filter(Boolean).join(' ')
          return (
            <div key={group.groups.map(item => item.field.l).join('-')} className={rowClass}>
              {group.groups.map(item => renderField(item.field))}
            </div>
          )
        }

        if (group.type === 'stack') {
          return (
            <div key={group.fields.map(field => field.l).join('-')} className="field-stack">
              {group.fields.map(field => renderField(field))}
            </div>
          )
        }

        return renderField(group.field)
      })}
      {children}
    </div>
  )
}
