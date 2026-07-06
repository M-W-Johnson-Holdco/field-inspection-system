export const DIRECTIONS = ['Front', 'Right', 'Rear', 'Left']

export const ELEV_ITEMS = [
  {
    id: 'ev0', lbl: 'Siding',
    fields: [
      { t: 'select', l: 'Material', o: ['Select', 'Vinyl', 'Aluminum', 'Wood', 'Fiber Cement', 'Stucco', 'Brick', 'Stone', 'EIFS'] },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ev1', lbl: 'Fascia / Eave Board',
    fields: [
      { t: 'select', l: 'Material', o: ['Select', 'Wood', 'Aluminum', 'Vinyl', 'Fiber Cement'] },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ev2', lbl: 'Soffit',
    fields: [
      { t: 'select', l: 'Material', o: ['Select', 'Wood', 'Aluminum', 'Vinyl', 'Fiber Cement'] },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ev3', lbl: 'Gutters',
    fields: [
      { t: 'select', l: 'Material', o: ['Select', 'Aluminum', 'Steel', 'Copper', 'Vinyl'] },
      { t: 'select', l: 'Size', o: ['Select', '4"', '5"', '6"'] },
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
      { t: 'select', l: 'Material', o: ['Select', 'Wood', 'Vinyl', 'Aluminum', 'Composite'] },
      { t: 'num', l: 'Qty' },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ev7', lbl: 'Entry Doors',
    fields: [
      { t: 'num', l: 'Qty' },
      { t: 'select', l: 'Material', o: ['Select', 'Steel', 'Fiberglass', 'Wood', 'Aluminum'] },
      { t: 'yn', l: 'Storm Door' },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ev8', lbl: 'Garage Doors',
    fields: [
      { t: 'num', l: 'Qty' },
      { t: 'select', l: 'Material', o: ['Select', 'Steel', 'Wood', 'Aluminum', 'Fiberglass'] },
      { t: 'select', l: 'Panel Style', o: ['Select', 'Raised Panel', 'Flush Panel', 'Carriage Style'] },
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
