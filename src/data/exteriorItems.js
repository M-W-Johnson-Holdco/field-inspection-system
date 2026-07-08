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
      { t: 'multiRadio', l: 'Material', o: ['Aluminum', 'Cedar', 'Other Wood', 'Pine', 'Rod Iron', 'Vinyl'] },
      { t: 'radio', l: 'Style', o: ['Privacy', 'Board on Board', 'Picket'] },
      { t: 'radio', l: 'Posts', o: ['Metal Rod', '4x4', '6x6'] },
      { t: 'num', l: 'Post Spacing (LF)', p: '8', lfFeetOnly: true },
      { t: 'num', l: 'Height (FT)', p: '6' },
      { t: 'yn', l: 'Stained' },
    ],
    damageLabel: 'Damage Notes',
    damagePlaceholder: 'Describe damaged sections...',
  },
  {
    id: 'ei_gates', lbl: 'Privacy Gates', flags: ['P', 'D'],
    fields: [
      { t: 'num', l: 'Qty', p: '0' },
      { t: 'radio', l: 'Material', o: ['Aluminum', 'Cedar', 'Pine', 'Steel', 'Vinyl', 'Wood'] },
    ],
    damageLabel: 'Damage Notes',
    damagePlaceholder: 'Describe damage...',
  },
  {
    id: 'ei_pool', lbl: 'Pool / Cover / Equipment', flags: ['P', 'D'],
    fields: [],
    damageLabel: 'Damage Notes',
    damagePlaceholder: 'Pump, heater, specific damage...',
  },
  {
    id: 'ei_outdoor', lbl: 'Outdoor Damaged Items', flags: ['P', 'D'],
    fields: [
      {
        t: 'toggleMulti',
        l: 'Damaged Items',
        o: ['Grill / Cover', 'Outdoor Furniture', 'Playset', 'Trampoline', 'Table Umbrella', 'Retractable Awning', 'Landscape Lighting', 'Potted Plants', 'Other'],
      },
    ],
    damageLabel: 'Damage Notes',
    damagePlaceholder: 'Grill qty 1 - sticker photo taken. Trampoline netting torn...',
  },
  {
    id: 'ei_site', lbl: 'Site Access', flags: [],
    fields: [
      { t: 'textarea', l: 'Delivery / Trailer Placement', p: 'Materials right side, trailer left...' },
      { t: 'textarea', l: 'Landscaping to Protect', p: 'Cover shrubs, AC unit, flower beds...' },
      { t: 'yn', l: 'OK Saturday Build' },
      { t: 'yn', l: 'Pest Control Flashing' },
      { t: 'txt', l: 'Gate Code', p: 'If applicable' },
      { t: 'yn', l: 'Overhead Clearance Issue' },
    ],
  },
]
