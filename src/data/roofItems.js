export const SUBSECTIONS = {
  ri0:  '1A — General Roof',
  ri6:  '1B — Ventilation',
  ri11: '1C — Pipe Jacks & Exhaust',
  ri13: '1D — Kickouts',
  ri14: '1E — Skylights & Flashings',
  ri22: '1F — Low Slope & Other Structures',
}

export const ROOF_ITEMS = [
  {
    id: 'ri0', lbl: 'Shingle Style / Grade', flags: ['P'],
    fields: [
      { t: 'multiRadio', l: 'Style', o: ['3-Tab', 'Architectural', 'Designer', 'Disco', 'Impact Resistant'] },
      { t: 'num', l: 'Stories' },
      { t: 'num', l: 'Layers' },
      { t: 'pitch', l: 'Predominant Pitch', p: '4/12' },
    ],
  },
  {
    id: 'ri1', lbl: 'Edge Flashings', flags: ['P'],
    fields: [
      { t: 'radio', l: 'Type', o: ['Drip Edge', 'Critter Guard'] },
      { t: 'radio', l: 'Material', o: ['Galvanized', 'Aluminum'] },
      { t: 'yn', l: 'Painted' },
    ],
  },
  {
    id: 'ri2', lbl: 'Underlayment', flags: ['P'],
    fields: [
      { t: 'radio', l: 'Grade', o: ['Synthetic', 'Felt', 'Unknown'] },
      { t: 'num', l: 'Layers' },
    ],
  },
  {
    id: 'ri3', lbl: 'Ridge Cap', flags: ['P', 'M'],
    fields: [
      { t: 'radio', l: 'Grade', o: ['3-Tab', 'H&R', 'Hi Profile'] },
      { t: 'num', l: 'Exposure (inches)' },
    ],
  },
  {
    id: 'ri4', lbl: 'Starter Shingle', flags: ['P'],
    fields: [
      { t: 'radio', l: 'Style', o: ['Starter Strip', '3-Tab'] },
    ],
  },
  {
    id: 'ri5', lbl: 'Valley', flags: ['P'],
    fields: [
      { t: 'radio', l: 'Style', o: ['Ice & Water', 'W-Valley', 'Valley Metal'] },
    ],
  },
  {
    id: 'ri6', lbl: 'Ridge Vent', flags: ['P', 'M'],
    fields: [
      { t: 'num', l: 'Length (LF)', lfFeetOnly: true },
      { t: 'radio', l: 'Type', o: ['Metal', 'Shingle Over'] },
      { t: 'yn', l: 'Painted' },
    ],
  },
  {
    id: 'ri7', lbl: 'Box Vents', flags: ['P', 'M'],
    fields: [
      { t: 'radio', l: 'Material', o: ['Metal', 'Plastic', 'Wood'] },
      { t: 'yn', l: 'Painted' },
      { t: 'num', l: 'Qty' },
    ],
  },
  {
    id: 'ri8', lbl: 'Turbines', flags: ['P', 'M'],
    fields: [
      { t: 'radio', l: 'Material', o: ['Metal', 'Plastic'] },
      { t: 'yn', l: 'Painted' },
      { t: 'num', l: 'Qty' },
    ],
  },
  {
    id: 'ri9', lbl: 'Power Vents', flags: ['P', 'M'],
    fields: [
      { t: 'yn', l: 'Painted' },
      { t: 'num', l: 'Qty' },
    ],
  },
  {
    id: 'ri10', lbl: 'Solar Vents', flags: ['P', 'M'],
    fields: [
      { t: 'yn', l: 'Painted' },
      { t: 'num', l: 'Qty' },
    ],
  },
  {
    id: 'ri11', lbl: 'Pipe Jacks', flags: ['P', 'M'],
    addMore: true,
    addMoreLabel: 'Add Pipe Jack',
    subItemPhotos: true,
    subItemDamaged: true,
    subFieldsUseMaterialColumnWidth: true,
    subItemSizeCounters: { field: 'Size (inches)', sizes: ['1.5', '2', '3', '4'], compact: true },
    fields: [],
    subFields: [
      { t: 'select', l: 'Size (inches)', o: ['Select', '1.5', '2', '3', '4'] },
      { t: 'radio', l: 'Type', o: ['3-in-1/Neoprene', 'Lead', 'Lifetime/Silicone'] },
      { t: 'yn', l: 'Painted' },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ri12', lbl: 'Exhaust Stacks', flags: ['P', 'M'],
    addMore: true,
    addMoreLabel: 'Add Exhaust Stack',
    subItemPhotos: true,
    subItemDamaged: true,
    subItemSizeCounters: { field: 'Type', sizes: ['Flange', 'Stack', 'Cap'], labelSuffix: '', counterLabel: 'type', compact: true },
    fields: [],
    subFields: [
      { t: 'select', l: 'Type', o: ['Select', 'Flange', 'Stack', 'Cap'] },
      { t: 'yn', l: 'Painted' },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ri13', lbl: 'Kickouts', flags: ['P'],
    fields: [
      { t: 'yn', l: 'Needed' },
      { t: 'yn', l: 'Painted' },
    ],
  },
  {
    id: 'ri14', lbl: 'Skylights', flags: ['P', 'M'],
    addMore: true,
    addMoreLabel: 'Add Skylight',
    subItemPhotos: true,
    subItemDamaged: true,
    subItemSizeCounters: { field: 'Style', sizes: ['Fixed', 'Venting', 'Tubular'], labelSuffix: '', counterLabel: 'style', compact: true },
    fields: [],
    subFields: [
      { t: 'select', l: 'Style', o: ['Select', 'Fixed', 'Venting', 'Tubular'] },
      { t: 'select', l: 'Mount', o: ['Select', 'Flush Mount', 'Curb Mount'] },
      { t: 'lwxw', l: 'Size (L x W – Inches)', lengthKey: 'Length (in)', widthKey: 'Width (in)' },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ri15', lbl: 'Rain Diverter', flags: ['P', 'M'],
    fields: [
      { t: 'num', l: 'Qty' },
      { t: 'num', l: 'Length (LF)', lfFeetOnly: true },
      { t: 'yn', l: 'Painted' },
    ],
  },
  {
    id: 'ri16', lbl: 'Power Meter Mast', flags: ['P'],
    fields: [
      { t: 'num', l: 'Qty' },
    ],
  },
  {
    id: 'ri17', lbl: 'Chimney Flashing', flags: ['P', 'M'],
    addMore: true,
    addMoreLabel: 'Add Chimney',
    subItemPhotos: true,
    subItemDamaged: true,
    subItemSizeCounters: { field: 'Size / Width', sizes: ['Small', 'Medium', 'Large'], labelSuffix: '', counterLabel: 'size', matchPrefix: true, compact: true },
    fields: [],
    subFields: [
      { t: 'select', l: 'Size / Width', fullRow: true, o: ['Select', 'Small (width < 24")', 'Medium (width 24"–36")', 'Large (width > 36")'] },
      { t: 'radio', l: 'Counter Flashing', o: ['Replace', 'Reuse'] },
      { t: 'yn', l: 'Painted' },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ri18', lbl: 'Step Flashing', flags: ['P', 'M'],
    addMore: true,
    addMoreLabel: 'Add Step Flashing',
    subItemPhotos: true,
    subItemDamaged: true,
    subItemTotalCounter: { label: 'Flashes' },
    fields: [],
    subFields: [
      { t: 'num', l: 'Length (LF)', lfFeetOnly: true },
      { t: 'yn', l: 'Painted' },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ri19', lbl: 'Counter Flashing', flags: ['P', 'M'],
    addMore: true,
    addMoreLabel: 'Add Counter Flashing',
    subItemPhotos: true,
    subItemDamaged: true,
    subItemTotalCounter: { label: 'Flashes' },
    fields: [],
    subFields: [
      { t: 'num', l: 'Length (LF)', lfFeetOnly: true },
      { t: 'yn', l: 'Painted' },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ri20', lbl: 'L Flashing', flags: ['P', 'M'],
    addMore: true,
    addMoreLabel: 'Add L Flashing',
    subItemPhotos: true,
    subItemDamaged: true,
    subItemTotalCounter: { label: 'Flashes' },
    fields: [],
    subFields: [
      { t: 'num', l: 'Length (LF)', lfFeetOnly: true },
      { t: 'yn', l: 'Painted' },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ri21', lbl: 'Cornice Gables', flags: ['P', 'M'],
    addMore: true,
    addMoreLabel: 'Add Cornice Gable',
    subItemPhotos: true,
    subItemSizeCounters: { field: 'Type', sizes: ['Shingles', 'Metal'], labelSuffix: '', counterLabel: 'type', compact: true },
    fields: [],
    subFields: [
      { t: 'select', l: 'Type', o: ['Select', 'Shingles', 'Metal'] },
      { t: 'num', l: 'Story', p: '1' },
      { t: 'num', l: 'Qty' },
    ],
  },
  {
    id: 'ri22', lbl: 'Low Slope (Porch / Flat)', flags: ['P', 'M'],
    addMore: true,
    addMoreLabel: 'Add Low Slope',
    subItemPhotos: true,
    subItemDamaged: true,
    subItemSizeCounters: { field: 'Location', sizes: ['Front Porch', 'Back Porch', 'Other'], labelSuffix: '', counterLabel: 'location', compact: true },
    fields: [],
    subFields: [
      { t: 'select', l: 'Location', fullRow: true, o: ['Select', 'Front Porch', 'Back Porch', 'Other'] },
      { t: 'txt', l: '(Other)', showWhen: { field: 'Location', equals: 'Other' }, full: true },
      { t: 'txt', l: 'Style / Grade', p: 'e.g. TPO, Mod.Bitumen, EPDM', full: true },
      { t: 'yn', l: 'Exposed Rafters' },
      { t: 'pitch', l: 'Pitch', p: '1/12' },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ri23', lbl: 'Other Structures', flags: ['P', 'M'],
    addMore: true,
    addMoreLabel: 'Add Structure',
    subItemPhotos: true,
    subItemDamaged: true,
    subItemTotalCounter: { label: 'Structures' },
    fields: [],
    subFields: [
      { t: 'txt', l: 'Type', p: 'Detached garage / shed', full: true },
      { t: 'txt', l: 'Style / Grade', full: true },
      { t: 'pitch', l: 'Pitch', p: '4/12' },
      { t: 'yn', l: 'Damaged' },
    ],
  },
]
