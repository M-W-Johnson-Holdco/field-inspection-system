export const SUBSECTIONS = {
  ri0:  '1A — General Roof',
  ri6:  '1B — Ventilation',
  ri11: '1C — Flashings',
  ri14: '1D — Accessories',
  ri22: '1E — Low Slope & Other Structures',
}

export const ROOF_ITEMS = [
  {
    id: 'ri0', lbl: 'Shingle Style / Grade', flags: ['P'],
    fields: [
      { t: 'multiRadio', l: 'Style', o: ['3-Tab', 'Architectural', 'Designer', 'Disco', 'Impact Resistant', 'Metal', 'Copper'], allowNA: false, nativeMenu: true, wrapSelected: true, labelHint: 'SELECT ALL THAT APPLY' },
      {
        t: 'select',
        l: 'Metal Gauge',
        o: ['Select', '24GA.', '22GA.', '20GA.', '18GA.', '16GA.', '14GA.', 'N/A'],
        full: true,
        showWhen: { field: 'Style', includes: 'Metal' },
      },
      { t: 'num', l: 'Stories', full: true },
      { t: 'num', l: 'Layers', full: true },
      { t: 'pitch', l: 'Predominant Pitch (x/12)', p: '4', full: true, showNumeratorOnly: true },
    ],
  },
  {
    id: 'ri1', lbl: 'Edge Flashings', flags: ['P', 'D'],
    fields: [
      {
        t: 'multiRadio',
        l: 'Type',
        o: ['Critter Guard', 'Drip Edge'],
        allowNA: false,
        nativeMenu: true,
        wrapSelected: true,
        labelHint: 'SELECT ALL THAT APPLY',
        full: true,
      },
      { t: 'radio', l: 'Material', o: ['Aluminum', 'Galvanized'], full: true },
      { t: 'yn', l: 'Painted', full: true },
      { t: 'yn', l: 'Damaged', full: true },
    ],
  },
  {
    id: 'ri2', lbl: 'Underlayment', flags: ['P'],
    fields: [
      { t: 'radio', l: 'Grade', o: ['Felt - 15lbs', 'Felt - 30lbs', 'Synthetic', 'Premium Synthetic', 'Unknown'] },
      { t: 'num', l: 'Layers', full: true },
    ],
  },
  {
    id: 'ri3', lbl: 'Ridge Cap', flags: ['P', 'M', 'D'],
    fields: [
      { t: 'radio', l: 'Grade', o: ['3-Tab', 'H&R', 'Hi Profile', 'Impact Resistant'] },
      { t: 'num', l: 'Exposure (inches)', full: true },
    ],
  },
  {
    id: 'ri4', lbl: 'Starter Shingle', flags: ['P'],
    fields: [
      { t: 'radio', l: 'Style', o: ['3-Tab', 'Starter Strip', 'Double Layer/Premium', 'Double Laminate'] },
    ],
  },
  {
    id: 'ri5', lbl: 'Valley', flags: ['P'],
    fields: [
      {
        t: 'multiRadio',
        l: 'Grade',
        o: ['Ice & Water', 'Valley Metal', 'W-Valley', 'N/A'],
        allowNA: true,
        nativeMenu: true,
        wrapSelected: true,
        labelHint: 'SELECT ALL THAT APPLY',
      },
      {
        t: 'select',
        l: 'Choose Ice & Water Style',
        o: ['Select', 'Closed Cut', 'Weaved', 'N/A'],
        full: true,
        showWhen: { field: 'Grade', includes: 'Ice & Water' },
      },
      {
        t: 'select',
        l: 'Choose Valley Metal Style',
        o: ['Select', 'Closed Cut', 'Weaved', 'N/A'],
        full: true,
        showWhen: { field: 'Grade', includes: 'Valley Metal' },
      },
      {
        t: 'select',
        l: 'Choose N/A Style',
        o: ['Select', 'Closed Cut', 'Weaved', 'N/A'],
        full: true,
        showWhen: { field: 'Grade', includes: 'N/A' },
      },
      {
        t: 'select',
        l: 'Choose W-Valley Style',
        o: ['Select', 'Aluminum', 'Copper', 'N/A'],
        full: true,
        showWhen: { field: 'Grade', includes: 'W-Valley' },
      },
      {
        t: 'yn',
        l: 'W-Valley Painted',
        allowNA: true,
        full: true,
        noTopDivider: true,
        showWhen: { field: 'Grade', includes: 'W-Valley' },
      },
    ],
  },
  {
    id: 'ri21', lbl: 'Cornice Returns', flags: ['P', 'M'],
    fields: [
      { t: 'radio', l: 'Material', o: ['3-Tab', 'Laminate', 'Metal', 'Copper'], full: true },
      { t: 'num', l: 'Stories', p: '1', full: true },
      { t: 'num', l: 'Qty', full: true },
      { t: 'yn', l: 'Painted', full: true },
      { t: 'yn', l: 'Damaged', full: true },
    ],
  },
  {
    id: 'ri28', lbl: 'Cornice Strips', flags: ['P', 'M'],
    fields: [
      { t: 'radio', l: 'Material', o: ['3-Tab', 'Laminate', 'Metal', 'Copper'], full: true },
      { t: 'num', l: 'Length (LF)', lfFeetOnly: true, full: true },
      { t: 'num', l: 'Stories', p: '1', full: true },
      { t: 'yn', l: 'Painted', full: true },
      { t: 'yn', l: 'Damaged', full: true },
    ],
  },
  {
    id: 'ri6', lbl: 'Ridge Vent', flags: ['P', 'M', 'D'],
    fields: [
      { t: 'radio', l: 'Type', o: ['Metal', 'Shingle Over'] },
      { t: 'yn', l: 'Painted' },
      { t: 'num', l: 'Length (LF)', lfFeetOnly: true },
      { t: 'num', l: 'Width (inches)', full: true },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ri12', lbl: 'Exhaust Stacks', flags: ['P', 'M'],
    addMore: true,
    addMoreLabel: 'Add Exhaust Stack',
    subItemPhotos: true,
    subItemDamaged: true,
    fields: [
      { t: 'yn', l: 'Painted', allowNA: false },
    ],
    subFields: [
      { t: 'select', l: 'Size', o: ['Select', 'Small (3-4")', 'Medium (5-7")', 'Large (8"+)'], fullRow: true },
      { t: 'multi', l: 'Damaged', o: ['Cap', 'Stack', 'Flange'], allowNA: false, halfWidthDesktop: true, nativeMenu: true },
    ],
  },
  {
    id: 'ri7', lbl: 'Box Vents', flags: ['P', 'M', 'D'],
    fields: [
      { t: 'radio', l: 'Material', o: ['Metal', 'Plastic'] },
      { t: 'num', l: 'Qty', full: true },
      { t: 'yn', l: 'Painted' },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ri8', lbl: 'Turbines', flags: ['P', 'M', 'D'],
    fields: [
      { t: 'num', l: 'Qty', full: true },
      { t: 'yn', l: 'Painted' },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ri9', lbl: 'Power Vents', flags: ['P', 'M', 'D'],
    fields: [
      { t: 'radio', l: 'Material', o: ['Metal', 'Plastic'] },
      { t: 'num', l: 'Qty', full: true },
      { t: 'yn', l: 'Painted' },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ri10', lbl: 'Solar Vents', flags: ['P', 'M', 'D'],
    fields: [
      { t: 'num', l: 'Qty', full: true },
      { t: 'yn', l: 'Painted' },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ri25', lbl: 'Off-Ridge Vents', flags: ['P', 'M', 'D'],
    fields: [
      { t: 'num', l: 'Qty', full: true },
      { t: 'yn', l: 'Painted' },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ri26', lbl: 'Dome Vents', flags: ['P', 'M', 'D'],
    fields: [
      { t: 'num', l: 'Qty', full: true },
      { t: 'yn', l: 'Painted' },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ri27', lbl: 'Rooftop Intake Vents', flags: ['P', 'M', 'D'],
    fields: [
      { t: 'num', l: 'Qty', full: true },
      { t: 'yn', l: 'Painted' },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ri11', lbl: 'Pipe Jacks', flags: ['P', 'M'],
    subItemSizeCounters: {
      field: 'Size (inches)',
      sizes: ['1.5', '2', '3', '4', '5'],
      compact: true,
      editable: true,
    },
    fields: [
      { t: 'radio', l: 'Type', o: ['3-in-1/Neoprene', 'Lead', 'Lifetime/Silicone'], fullRow: true },
      { t: 'yn', l: 'Painted' },
    ],
  },
  {
    id: 'ri13', lbl: 'Kickouts', flags: ['P'],
    fields: [
      { t: 'yn', l: 'Existing' },
      {
        t: 'num',
        l: 'Existing Kickouts Count',
        full: true,
        showWhen: { field: 'Existing', equals: 'Yes' },
      },
      { t: 'yn', l: 'Needed' },
      { t: 'yn', l: 'Painted' },
    ],
  },
  {
    id: 'ri15', lbl: 'Rain Diverter', flags: ['P', 'M'],
    addMore: true,
    addMoreLabel: 'Add Rain Diverter',
    subItemPhotos: true,
    fields: [
      { t: 'yn', l: 'Painted', full: true },
    ],
    subFields: [
      { t: 'num', l: 'Length (LF)', lfFeetOnly: true, full: true },
    ],
  },
  {
    id: 'ri29', lbl: 'Chimney Cover', flags: ['P', 'D'],
    fields: [
      { t: 'select', l: 'Type', o: ['Select', 'Shroud', 'Chase Cover', 'N/A'], full: true },
      { t: 'select', l: 'Grade', o: ['Select', 'Aluminum', 'Steel', 'Copper', 'N/A'], full: true },
      { t: 'yn', l: 'Flue', allowNA: true, full: true },
      { t: 'txt', l: 'Condition', full: true, p: 'Describe condition...' },
      { t: 'yn', l: 'Painted', allowNA: true, full: true },
      {
        t: 'multi',
        l: 'Damaged',
        o: ['Cover', 'Flue'],
        allowNA: false,
        nativeMenu: true,
        wrapSelected: true,
        full: true,
        labelHint: 'SELECT ALL THAT APPLY',
      },
    ],
  },
  {
    id: 'ri17', lbl: 'Chimney Flashing', flags: ['P', 'M'],
    addMore: true,
    addMoreLabel: 'Add Chimney',
    subItemPhotos: true,
    subItemDamaged: true,
    subItemSizeCounters: { field: 'Size / Width', sizes: ['Small', 'Medium', 'Large'], labelSuffix: '', counterLabel: 'size', matchPrefix: true, equalWidth: true },
    fields: [
      { t: 'yn', l: 'Painted', full: true },
    ],
    subFields: [
      { t: 'select', l: 'Size / Width', fullRow: true, o: ['Select', 'Small (width ≤23")', 'Medium (width 24"–36")', 'Large (width 37+")'] },
      { t: 'radio', l: 'Material', o: ['Galvanized', 'Copper', 'Aluminum'], full: true },
      { t: 'radio', l: 'Counter Flashing', o: ['Replace', 'Reuse'], full: true },
      { t: 'yn', l: 'Cricket Present', full: true },
      { t: 'yn', l: 'Damaged', full: true },
    ],
  },
  {
    id: 'ri18', lbl: 'Step Flashing', flags: ['P', 'M'],
    fields: [
      { t: 'radio', l: 'Material', o: ['Galvanized', 'Copper', 'Aluminum'], full: true },
      { t: 'yn', l: 'Painted' },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ri19', lbl: 'Counter Flashing', flags: ['P', 'M'],
    fields: [
      { t: 'radio', l: 'Material', o: ['Galvanized', 'Copper', 'Aluminum'], full: true },
      { t: 'yn', l: 'Painted' },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ri20', lbl: 'L Flashing', flags: ['P', 'M'],
    fields: [
      { t: 'radio', l: 'Material', o: ['Galvanized', 'Copper', 'Aluminum'], full: true },
      { t: 'yn', l: 'Painted' },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ri14', lbl: 'Skylights', flags: ['P', 'M'],
    addMore: true,
    addMoreLabel: 'Add Skylight',
    subItemPhotos: true,
    subItemDamaged: true,
    subItemSizeCounters: {
      field: 'Style',
      sizes: ['Fixed', 'Tubular', 'Venting'],
      labelSuffix: '',
      counterLabel: 'style',
      equalWidth: true,
    },
    fields: [],
    subFields: [
      { t: 'select', l: 'Style', o: ['Select', 'Fixed', 'Tubular', 'Venting'], full: true },
      { t: 'select', l: 'Mount', o: ['Select', 'Flush Mount', 'Curb Mount'], full: true },
      {
        t: 'lwxw',
        l: 'Size',
        full: true,
        lengthKey: 'Length (ft)',
        widthKey: 'Width (ft)',
        lengthLabel: 'Length (Feet)',
        widthLabel: 'Width (Feet)',
        showArea: true,
        areaUnit: 'ft²',
        showWhen: { field: 'Style', notEquals: 'Tubular' },
      },
      {
        t: 'diameter',
        l: 'Diameter',
        full: true,
        diameterKey: 'Diameter (in)',
        diameterLabel: 'Diameter (Inches)',
        showCircumference: true,
        circumferenceKey: 'Circumference (in)',
        circumferenceLabel: 'Total Circumference (Inches)',
        showWhen: { field: 'Style', equals: 'Tubular' },
      },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ri16', lbl: 'Power Meter Mast', flags: ['P'],
    fields: [
      { t: 'num', l: 'Qty' },
    ],
  },
  {
    id: 'ri24', lbl: 'Solar Panels', flags: ['P'],
    fields: [
      { t: 'num', l: 'Qty' },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ri30', lbl: 'Wind Vane', flags: ['P', 'D'],
    fields: [
      { t: 'num', l: 'Qty' },
      { t: 'radio', l: 'Material', o: ['Metal', 'Copper'], full: true },
      { t: 'yn', l: 'Painted', allowNA: true },
      { t: 'yn', l: 'DnR', allowNA: true },
      { t: 'yn', l: 'Damaged', allowNA: true },
    ],
  },
  {
    id: 'ri31', lbl: 'Cupola', flags: ['P', 'D'],
    fields: [
      { t: 'num', l: 'Qty' },
      { t: 'yn', l: 'DnR', allowNA: true },
      { t: 'yn', l: 'Damaged', allowNA: true },
    ],
  },
  {
    id: 'ri32', lbl: 'Turret', flags: ['P'],
    fields: [
      { t: 'num', l: 'Qty' },
      { t: 'radio', l: 'Grade', o: ['Metal', 'Copper'], full: true },
      { t: 'yn', l: 'Turret Cap Existing', allowNA: true, full: true },
      {
        t: 'radio',
        l: 'Cap Grade',
        o: ['Metal', 'Copper'],
        full: true,
        showWhen: { field: 'Turret Cap Existing', equals: 'Yes' },
      },
      {
        t: 'yn',
        l: 'Painted',
        allowNA: true,
        full: true,
        showWhen: { field: 'Turret Cap Existing', equals: 'Yes' },
      },
    ],
  },
  {
    id: 'ri22', lbl: 'Low Slope (Porch / Flat)', flags: ['P', 'M'],
    addMore: true,
    addMoreLabel: 'Add Low Slope',
    subItemPhotos: true,
    subItemDamaged: true,
    subItemSizeCounters: { field: 'Location', sizes: ['Back Porch', 'Front Porch', 'Other'], labelSuffix: '', counterLabel: 'location', compact: true },
    fields: [],
    subFields: [
      { t: 'select', l: 'Location', fullRow: true, o: ['Select', 'Back Porch', 'Front Porch', 'Other'] },
      { t: 'txt', l: '(Other)', showWhen: { field: 'Location', equals: 'Other' }, full: true },
      { t: 'txt', l: 'Style / Grade', p: 'e.g. TPO, Mod.Bitumen, EPDM', full: true },
      { t: 'yn', l: 'Exposed Rafters' },
      { t: 'pitch', l: 'Pitch (x/12)', p: '1', full: true, showNumeratorOnly: true },
      { t: 'yn', l: 'Edgemetal Existing?', full: true },
      {
        t: 'num',
        l: 'Edgemetal Width (Inches)',
        full: true,
        noTopDivider: true,
        showWhen: { field: 'Edgemetal Existing?', equals: 'Yes' },
      },
      {
        t: 'radio',
        l: 'Edgemetal Material',
        o: ['Galvanized', 'Aluminum', 'Copper'],
        full: true,
        noTopDivider: true,
        showWhen: { field: 'Edgemetal Existing?', equals: 'Yes' },
      },
      {
        t: 'yn',
        l: 'Edgemetal Painted',
        full: true,
        noTopDivider: true,
        showWhen: { field: 'Edgemetal Existing?', equals: 'Yes' },
      },
      { t: 'yn', l: 'Damaged' },
    ],
  },
  {
    id: 'ri23', lbl: 'Other Structures', flags: ['P', 'M'],
    addMore: true,
    addMoreLabel: 'Add Other Structure',
    subItemPhotos: true,
    subItemDamaged: true,
    subItemTotalCounter: { label: 'Structures' },
    fields: [],
    subFields: [
      { t: 'txt', l: 'Type', p: 'Detached garage / shed', full: true },
      { t: 'txt', l: 'Style / Grade', full: true },
      { t: 'pitch', l: 'Pitch (x/12)', p: '4', full: true, showNumeratorOnly: true },
      { t: 'yn', l: 'Damaged' },
    ],
  },
]
