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
      { t: 'select', l: 'Style', o: ['Select', 'Half Round', 'K-Style'] },
      { t: 'num', l: 'Size (Inches)', p: '4' },
      { t: 'num', l: 'Length (LF)', lfFeetOnly: true },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ev11', lbl: 'Gutter Guards',
    fields: [
      { t: 'select', l: 'Style', o: ['Select', 'Screen', 'Micro-Mesh', 'Reverse Curve', 'Proprietary', 'None'] },
      { t: 'select', l: 'Material', o: ['Select', 'Plastic', 'Metal'], allowNA: true },
      { t: 'num', l: 'Qty' },
      { t: 'num', l: 'Length (LF)', lfFeetOnly: true },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ev4', lbl: 'Downspouts',
    fields: [
      { t: 'select', l: 'Material', o: ['Select', 'Aluminum', 'Steel', 'Copper', 'Vinyl'] },
      { t: 'select', l: 'Style', o: ['Select', 'Round', 'Box'] },
      { t: 'select', l: 'Width', o: ['Select', '3" Std', '4" Oversized'], allowNA: false },
      { t: 'yn', l: 'Painted' },
      { t: 'num', l: 'Qty' },
      { t: 'num', l: 'Length (LF)', lfFeetOnly: true },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ev12', lbl: 'Windows',
    fields: [
      { t: 'select', l: 'Grade', o: ['Select', 'Vinyl', 'Wood', 'Composite', 'Aluminum'], allowNA: false },
      { t: 'select', l: 'Type', o: ['Select', 'Single Hung', 'Double Hung', 'Casement', 'Fixed'], allowNA: false },
      { t: 'select', l: 'Glaze', o: ['Select', 'Single', 'Double', 'Triple'], allowNA: false },
      { t: 'num', l: 'Small (3–11 sq ft)' },
      { t: 'num', l: 'Medium (12–19 sq ft)' },
      { t: 'num', l: 'Large (19+ sq ft)' },
      { t: 'yn', l: 'Painted' },
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
