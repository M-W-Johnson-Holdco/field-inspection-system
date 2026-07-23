export const DIRECTIONS = ['Front', 'Right', 'Rear', 'Left']

export const ELEV_ITEMS = [
  {
    id: 'ev0', lbl: 'Siding',
    fields: [
      { t: 'select', l: 'Style', o: ['Select', 'Flat', 'Double Dutch', 'Textured', 'Other'], full: true },
      { t: 'txt', l: '(Other)', showWhen: { field: 'Style', equals: 'Other' }, full: true, p: 'Describe siding style' },
      { t: 'select', l: 'Grade', o: ['Select', 'Composite', 'Vinyl', 'Wood'], full: true },
      { t: 'num', l: 'Exposure (Inches)', p: '0' },
      { t: 'yn', l: 'Damaged', full: true },
    ],
  },
  {
    id: 'ev1', lbl: 'Fascia',
    fields: [
      { t: 'select', l: 'Material', o: ['Select', 'Aluminum', 'Composite', 'Vinyl', 'Wood'], full: true },
      { t: 'num', l: 'Width (Inches)', p: '6' },
      { t: 'yn', l: 'Damaged', full: true },
    ],
  },
  {
    id: 'ev3', lbl: 'Gutters',
    fields: [
      { t: 'select', l: 'Material', o: ['Select', 'Aluminum', 'Steel', 'Copper', 'Vinyl'], full: true },
      { t: 'select', l: 'Style', o: ['Select', 'Half Round', 'K-Style'], full: true },
      { t: 'num', l: 'Size (Inches)', p: '4' },
      { t: 'num', l: 'Length (LF)', lfFeetOnly: true },
      { t: 'yn', l: 'Damaged', full: true },
    ],
  },
  {
    id: 'ev11', lbl: 'Gutter Guards',
    fields: [
      { t: 'select', l: 'Style', o: ['Select', 'Screen', 'Micro-Mesh', 'Reverse Curve', 'Proprietary', 'None'], full: true },
      { t: 'select', l: 'Material', o: ['Select', 'Plastic', 'Metal'], allowNA: true, full: true },
      { t: 'num', l: 'Qty' },
      { t: 'num', l: 'Length (LF)', lfFeetOnly: true },
      { t: 'yn', l: 'Damaged', full: true },
    ],
  },
  {
    id: 'ev4', lbl: 'Downspouts',
    fields: [
      { t: 'select', l: 'Material', o: ['Select', 'Aluminum', 'Steel', 'Copper', 'Vinyl'], full: true },
      { t: 'select', l: 'Style', o: ['Select', 'Round', 'Box'], full: true },
      { t: 'select', l: 'Width', o: ['Select', '3" Std', '4" Oversized'], allowNA: false, full: true },
      { t: 'yn', l: 'Painted', full: true },
      { t: 'num', l: 'Qty' },
      { t: 'num', l: 'Length (LF)', lfFeetOnly: true },
      { t: 'yn', l: 'Damaged', full: true },
    ],
  },
  {
    id: 'ev12', lbl: 'Windows',
    fields: [
      { t: 'select', l: 'Grade', o: ['Select', 'Vinyl', 'Wood', 'Composite', 'Aluminum'], allowNA: false, full: true },
      { t: 'select', l: 'Type', o: ['Select', 'Single Hung', 'Double Hung', 'Casement', 'Fixed'], allowNA: false, full: true },
      { t: 'select', l: 'Glaze', o: ['Select', 'Single', 'Double', 'Triple'], allowNA: false, full: true },
      { t: 'num', l: 'Small (3–11 sq ft)' },
      { t: 'num', l: 'Medium (12–19 sq ft)' },
      { t: 'num', l: 'Large (19+ sq ft)' },
      { t: 'yn', l: 'Painted', full: true },
      { t: 'yn', l: 'Damaged', full: true },
    ],
  },
  {
    id: 'ev5', lbl: 'Window Screens',
    fields: [
      { t: 'num', l: 'Qty' },
      { t: 'yn', l: 'Damaged', full: true },
    ],
  },
  {
    id: 'ev6', lbl: 'Shutters',
    fields: [
      { t: 'num', l: 'Qty' },
      { t: 'select', l: 'Material', o: ['Select', 'Aluminum', 'Composite', 'Vinyl', 'Wood'], full: true },
      { t: 'yn', l: 'Damaged', full: true },
    ],
  },
  {
    id: 'ev7', lbl: 'Entry Doors',
    fields: [
      { t: 'num', l: 'Qty' },
      { t: 'select', l: 'Material', o: ['Select', 'Aluminum', 'Fiberglass', 'Steel', 'Wood'], full: true },
      { t: 'yn', l: 'Storm Door', full: true },
      { t: 'yn', l: 'Damaged', full: true },
    ],
  },
  {
    id: 'ev8', lbl: 'Garage Doors',
    compactOptionPairRow: true,
    fields: [
      { t: 'num', l: 'Qty' },
      { t: 'select', l: 'Material', o: ['Select', 'Aluminum', 'Fiberglass', 'Steel', 'Wood'], full: true },
      { t: 'select', l: 'Panel Style', o: ['Select', 'Carriage Style', 'Flush Panel', 'Raised Panel'], full: true },
      { t: 'yn', l: 'Damaged', full: true },
    ],
  },
  {
    id: 'ev9', lbl: 'A/C Condenser',
    fields: [
      { t: 'yn', l: 'Damaged', full: true },
    ],
  },
  {
    id: 'ev10', lbl: 'Other / Notes',
    fields: [
      { t: 'textarea', l: 'Notes', p: 'Other items or observations on this elevation…' },
    ],
  },
]
