export const DIRECTIONS = ['Front', 'Right', 'Rear', 'Left']

export const ELEV_ITEMS = [
  {
    id: 'ev0', lbl: 'Siding',
    fields: [
      { t: 'select', l: 'Material', o: ['Select', 'Aluminum', 'Brick', 'EIFS', 'Fiber Cement', 'Stone', 'Stucco', 'Vinyl', 'Wood'] },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ev1', lbl: 'Fascia / Eave Board',
    fields: [
      { t: 'select', l: 'Material', o: ['Select', 'Aluminum', 'Fiber Cement', 'Vinyl', 'Wood'] },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ev2', lbl: 'Soffit',
    fields: [
      { t: 'select', l: 'Material', o: ['Select', 'Aluminum', 'Fiber Cement', 'Vinyl', 'Wood'] },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ev3', lbl: 'Gutters',
    fields: [
      { t: 'select', l: 'Material', o: ['Select', 'Aluminum', 'Steel', 'Copper', 'Vinyl'] },
      { t: 'num', l: 'Size (Inches)', p: '4' },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ev4', lbl: 'Downspouts',
    fields: [
      { t: 'num', l: 'Qty' },
      { t: 'select', l: 'Material', o: ['Select', 'Aluminum', 'Steel', 'Copper', 'Vinyl'] },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ev5', lbl: 'Window Screens',
    fields: [
      { t: 'num', l: 'Qty' },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ev6', lbl: 'Shutters',
    fields: [
      { t: 'num', l: 'Qty' },
      { t: 'select', l: 'Material', o: ['Select', 'Aluminum', 'Composite', 'Vinyl', 'Wood'] },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ev7', lbl: 'Entry Doors',
    fields: [
      { t: 'num', l: 'Qty' },
      { t: 'select', l: 'Material', o: ['Select', 'Aluminum', 'Fiberglass', 'Steel', 'Wood'] },
      { t: 'yn', l: 'Storm Door' },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ev8', lbl: 'Garage Doors',
    compactOptionPairRow: true,
    fields: [
      { t: 'num', l: 'Qty' },
      { t: 'select', l: 'Material', o: ['Select', 'Aluminum', 'Fiberglass', 'Steel', 'Wood'] },
      { t: 'select', l: 'Panel Style', o: ['Select', 'Carriage Style', 'Flush Panel', 'Raised Panel'] },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ev9', lbl: 'A/C Condenser',
    fields: [
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ev10', lbl: 'Other / Notes',
    fields: [
      { t: 'textarea', l: 'Notes', p: 'Other items or observations on this elevation…' },
    ],
  },
]
