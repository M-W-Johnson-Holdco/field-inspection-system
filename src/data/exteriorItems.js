export const EXTERIOR_SUBSECTIONS = {
  ei_fence:   '4A — Fencing & Gates',
  ei_pool:    '4B — Pool & Outdoor Equipment',
  ei_outdoor: '4C — Outdoor Structures & Furnishings',
  ei_site:    '4D — Site Access & Conditions',
}

export const EXTERIOR_ITEMS = [
  {
    id: 'ei_fence', lbl: 'Fence', flags: ['P', 'M', 'D'],
    fields: [
      { t: 'radio', l: 'Material', o: ['Aluminum', 'Cedar', 'Other Wood', 'Pine', 'Rod Iron', 'Vinyl'], full: true },
      { t: 'radio', l: 'Style', o: ['Privacy', 'Board on Board', 'Picket'], full: true },
      { t: 'radio', l: 'Posts', o: ['Metal Rod', '4x4', '6x6'], full: true },
      { t: 'num', l: 'Post Qty', p: '0', full: true },
      { t: 'num', l: 'Post Spacing (LF)', p: '8', lfFeetOnly: true, full: true },
      { t: 'num', l: 'Height (FT)', p: '6', full: true },
      { t: 'computedFenceLf', l: 'Total Linear Footage', full: true },
      { t: 'yn', l: 'Stained', full: true },
    ],
    damageLabel: 'Damage Description',
    damagePlaceholder: 'Describe damaged sections...',
  },
  {
    id: 'ei_gates', lbl: 'Privacy Gates', flags: ['P', 'D'],
    fields: [
      { t: 'num', l: 'Qty', p: '0', full: true },
      { t: 'radio', l: 'Material', o: ['Aluminum', 'Cedar', 'Pine', 'Steel', 'Vinyl', 'Wood'], full: true },
    ],
    damageLabel: 'Damage Description',
    damagePlaceholder: 'Describe damage...',
  },
  {
    id: 'ei_pool', lbl: 'Pool / Cover / Equipment', flags: ['P', 'D'],
    fields: [],
    damageLabel: 'Damage Description',
    damagePlaceholder: 'Pump, heater, specific damage...',
  },
  {
    id: 'ei_outdoor', lbl: 'Outdoor Damaged Items', flags: ['P', 'D'],
    fields: [
      {
        t: 'multiRadio',
        l: 'Damaged Items',
        o: ['Grill / Cover', 'Outdoor Furniture', 'Playset', 'Trampoline', 'Table Umbrella', 'Retractable Awning', 'Landscape Lighting', 'Potted Plants', 'Other'],
        allowNA: false,
        nativeMenu: true,
        full: true,
        labelHint: 'SELECT ALL THAT APPLY',
      },
      { t: 'txt', l: 'Other', showWhen: { field: 'Damaged Items', includes: 'Other' }, full: true, p: 'Describe other damaged item' },
    ],
    damageLabel: 'Damage Description',
    damagePlaceholder: 'Grill qty 1 - sticker photo taken. Trampoline netting torn...',
  },
  {
    id: 'ei_site', lbl: 'Site Access', flags: [],
    fields: [
      { t: 'textarea', l: 'Delivery / Trailer Placement', p: 'Materials right side, trailer left...', full: true },
      { t: 'textarea', l: 'Landscaping to Protect', p: 'Cover shrubs, AC unit, flower beds...', full: true },
      { t: 'yn', l: 'OK Saturday Build', full: true },
      { t: 'yn', l: 'Pest Control Flashing', full: true },
      { t: 'txt', l: 'Gate Code', p: 'If applicable', full: true },
      { t: 'yn', l: 'Overhead Clearance Issue', full: true },
    ],
  },
]
