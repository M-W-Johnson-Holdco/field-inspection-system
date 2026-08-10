import { useInspection } from '../../context/InspectionContext'
import { formatPitch, parsePitchNumerator } from '../../utils/pitch'
import { formatPropertyAddress } from '../../utils/address'

const WORKER_URL = 'https://field-inspection-worker.k-liss.workers.dev'

// Maps AI JSON roof keys → { itemId, fieldLabel }
const ROOF_MAP = [
  { key: 'shingleStyle',            itemId: 'ri0',  label: 'Style' },
  { key: 'metalShingleGauge',       itemId: 'ri0',  label: 'Metal Gauge' },
  { key: 'stories',                 itemId: 'ri0',  label: 'Stories' },
  { key: 'layers',                  itemId: 'ri0',  label: 'Layers' },
  { key: 'pitch',                   itemId: 'ri0',  label: 'Predominant Pitch (x/12)' },
  { key: 'deckingType',             itemId: 'ri34', label: 'Type' },
  { key: 'deckingDamaged',          itemId: 'ri34', label: 'Damaged' },
  { key: 'deckingDamageDescription', itemId: 'ri34', label: '_damage' },
  { key: 'deckingNotes',            itemId: 'ri34', label: '_notes' },
  { key: 'edgeFlashingType',        itemId: 'ri1',  label: 'Type' },
  { key: 'edgeMaterial',            itemId: 'ri1',  label: 'Material' },
  { key: 'edgePainted',             itemId: 'ri1',  label: 'Painted' },
  { key: 'edgeDamaged',             itemId: 'ri1',  label: 'Damaged' },
  { key: 'edgeDamageDescription',   itemId: 'ri1',  label: '_damage' },
  { key: 'underlaymentGrade',       itemId: 'ri2',  label: 'Grade' },
  { key: 'underlaymentLayers',      itemId: 'ri2',  label: 'Layers' },
  { key: 'ridgeCapGrade',           itemId: 'ri3',  label: 'Grade' },
  { key: 'ridgeCapExposure',        itemId: 'ri3',  label: 'Exposure (inches)' },
  { key: 'ridgeCapDamaged',         itemId: 'ri3',  label: 'Damaged' },
  { key: 'ridgeCapDamageDescription', itemId: 'ri3', label: '_damage' },
  { key: 'starterStyle',            itemId: 'ri4',  label: 'Style' },
  { key: 'valleyStyle',             itemId: 'ri5',  label: 'Grade' },
  { key: 'valleyChooseOne',         itemId: 'ri5',  label: 'Choose Ice & Water Style' },
  { key: 'valleyMetalChooseOne',    itemId: 'ri5',  label: 'Choose Valley Metal Style' },
  { key: 'valleyNAChooseOne',       itemId: 'ri5',  label: 'Choose N/A Style' },
  { key: 'valleyWValleyChooseOne',  itemId: 'ri5',  label: 'Choose W-Valley Style' },
  { key: 'valleyWValleyPainted',    itemId: 'ri5',  label: 'W-Valley Painted' },
  { key: 'solarPanelQty',           itemId: 'ri24', label: 'Qty' },
  { key: 'solarPanelDamaged',       itemId: 'ri24', label: 'Damaged' },
  { key: 'solarPanelDamageDescription', itemId: 'ri24', label: '_damage' },
  { key: 'windVaneQty',             itemId: 'ri30', label: 'Qty' },
  { key: 'windVaneMaterial',        itemId: 'ri30', label: 'Material' },
  { key: 'windVanePainted',         itemId: 'ri30', label: 'Painted' },
  { key: 'windVaneDnR',             itemId: 'ri30', label: 'DnR' },
  { key: 'windVaneDamaged',         itemId: 'ri30', label: 'Damaged' },
  { key: 'windVaneDamageDescription', itemId: 'ri30', label: '_damage' },
  { key: 'cupolaQty',               itemId: 'ri31', label: 'Qty' },
  { key: 'cupolaDnR',               itemId: 'ri31', label: 'DnR' },
  { key: 'cupolaDamaged',           itemId: 'ri31', label: 'Damaged' },
  { key: 'cupolaDamageDescription', itemId: 'ri31', label: '_damage' },
  { key: 'cupolaNotes',             itemId: 'ri31', label: '_notes' },
  { key: 'turretQty',               itemId: 'ri32', label: 'Qty' },
  { key: 'turretGrade',             itemId: 'ri32', label: 'Grade' },
  { key: 'turretCapExisting',       itemId: 'ri32', label: 'Turret Cap Existing' },
  { key: 'turretCapGrade',          itemId: 'ri32', label: 'Cap Grade' },
  { key: 'turretCapPainted',        itemId: 'ri32', label: 'Painted' },
  { key: 'turretNotes',             itemId: 'ri32', label: '_notes' },
  { key: 'ridgeVentLF',             itemId: 'ri6',  label: 'Length (LF)' },
  { key: 'ridgeVentWidth',          itemId: 'ri6',  label: 'Width (inches)' },
  { key: 'ridgeVentType',           itemId: 'ri6',  label: 'Type' },
  { key: 'ridgeVentPainted',        itemId: 'ri6',  label: 'Painted' },
  { key: 'ridgeVentDamaged',        itemId: 'ri6',  label: 'Damaged' },
  { key: 'ridgeVentDamageDescription', itemId: 'ri6', label: '_damage' },
  { key: 'boxVentQty',              itemId: 'ri7',  label: 'Qty' },
  { key: 'boxVentMaterial',         itemId: 'ri7',  label: 'Material' },
  { key: 'boxVentPainted',          itemId: 'ri7',  label: 'Painted' },
  { key: 'boxVentDamaged',          itemId: 'ri7',  label: 'Damaged' },
  { key: 'boxVentDamageDescription', itemId: 'ri7', label: '_damage' },
  { key: 'turbineQty',              itemId: 'ri8',  label: 'Qty' },
  { key: 'turbinePainted',          itemId: 'ri8',  label: 'Painted' },
  { key: 'turbineDamaged',          itemId: 'ri8',  label: 'Damaged' },
  { key: 'turbineDamageDescription', itemId: 'ri8', label: '_damage' },
  { key: 'powerVentQty',            itemId: 'ri9',  label: 'Qty' },
  { key: 'powerVentMaterial',       itemId: 'ri9',  label: 'Material' },
  { key: 'powerVentPainted',        itemId: 'ri9',  label: 'Painted' },
  { key: 'powerVentDamaged',        itemId: 'ri9',  label: 'Damaged' },
  { key: 'powerVentDamageDescription', itemId: 'ri9', label: '_damage' },
  { key: 'solarVentQty',            itemId: 'ri10', label: 'Qty' },
  { key: 'solarVentPainted',        itemId: 'ri10', label: 'Painted' },
  { key: 'solarVentDamaged',        itemId: 'ri10', label: 'Damaged' },
  { key: 'solarVentDamageDescription', itemId: 'ri10', label: '_damage' },
  { key: 'offRidgeVentQty',         itemId: 'ri25', label: 'Qty' },
  { key: 'offRidgeVentPainted',     itemId: 'ri25', label: 'Painted' },
  { key: 'offRidgeVentDamaged',     itemId: 'ri25', label: 'Damaged' },
  { key: 'offRidgeVentDamageDescription', itemId: 'ri25', label: '_damage' },
  { key: 'domeVentQty',             itemId: 'ri26', label: 'Qty' },
  { key: 'domeVentPainted',         itemId: 'ri26', label: 'Painted' },
  { key: 'domeVentDamaged',         itemId: 'ri26', label: 'Damaged' },
  { key: 'domeVentDamageDescription', itemId: 'ri26', label: '_damage' },
  { key: 'rooftopIntakeVentQty',    itemId: 'ri27', label: 'Qty' },
  { key: 'rooftopIntakeVentPainted', itemId: 'ri27', label: 'Painted' },
  { key: 'rooftopIntakeVentDamaged', itemId: 'ri27', label: 'Damaged' },
  { key: 'rooftopIntakeVentDamageDescription', itemId: 'ri27', label: '_damage' },
  { key: 'kickoutsExisting',        itemId: 'ri13', label: 'Existing' },
  { key: 'kickoutsExistingCount',   itemId: 'ri13', label: 'Existing Kickouts Count' },
  { key: 'kickoutsNeeded',          itemId: 'ri13', label: 'Needed' },
  { key: 'kickoutsPainted',         itemId: 'ri13', label: 'Painted' },
  { key: 'rainDiverterPainted',     itemId: 'ri15', label: 'Painted' },
  { key: 'powerMeterMastQty',       itemId: 'ri16', label: 'Qty' },
  { key: 'chimneyCoverType',        itemId: 'ri29', label: 'Type' },
  { key: 'chimneyCoverGrade',       itemId: 'ri29', label: 'Grade' },
  { key: 'chimneyCoverFlue',        itemId: 'ri29', label: 'Flue' },
  { key: 'chimneyCoverCondition',   itemId: 'ri29', label: 'Condition' },
  { key: 'chimneyCoverPainted',     itemId: 'ri29', label: 'Painted' },
  { key: 'chimneyCoverDamaged',     itemId: 'ri29', label: 'Damaged' },
  { key: 'chimneyCoverDamageDescription', itemId: 'ri29', label: '_damage' },
  { key: 'corniceReturnMaterial',   itemId: 'ri21', label: 'Material' },
  { key: 'corniceReturnStories',    itemId: 'ri21', label: 'Stories' },
  { key: 'corniceReturnQty',        itemId: 'ri21', label: 'Qty' },
  { key: 'corniceReturnPainted',    itemId: 'ri21', label: 'Painted' },
  { key: 'corniceReturnDamaged',    itemId: 'ri21', label: 'Damaged' },
  { key: 'corniceReturnDamageDescription', itemId: 'ri21', label: '_damage' },
  { key: 'corniceStripMaterial',    itemId: 'ri28', label: 'Material' },
  { key: 'corniceStripPainted',     itemId: 'ri28', label: 'Painted' },
  { key: 'openCornicesExisting',    itemId: 'ri33', label: 'Existing?' },
  { key: 'openCornicesDamaged',     itemId: 'ri33', label: 'Damaged' },
  { key: 'openCornicesDamageDescription', itemId: 'ri33', label: '_damage' },
  { key: 'openCornicesNotes',       itemId: 'ri33', label: '_notes' },
  // Legacy parse keys
  { key: 'corniceGableStory',       itemId: 'ri21', label: 'Stories' },
  { key: 'corniceGableQty',         itemId: 'ri21', label: 'Qty' },
]
// Pipe jacks, exhaust stacks, rain diverters, chimneys, skylights, and low-slope sections
// are variable-length repeatables — each is imported directly from its
// roof.<key>[] array (see applyParsed), not through ROOF_MAP.
// Step/counter/L flashing use importRoofFlashingItems.

// Maps AI JSON elevation keys → { itemId, fieldLabel } per direction
const ELEV_MAP = [
  { key: 'sidingStyle',          itemId: 'ev0',  label: 'Style' },
  { key: 'sidingGrade',          itemId: 'ev0',  label: 'Grade' },
  { key: 'sidingExposure',       itemId: 'ev0',  label: 'Exposure (Inches)' },
  { key: 'sidingDamage',         itemId: 'ev0',  label: 'Damaged' },
  { key: 'sidingDamageDescription', itemId: 'ev0', label: '_damage' },
  { key: 'fasciaMaterial',       itemId: 'ev1',  label: 'Material' },
  { key: 'fasciaWidth',          itemId: 'ev1',  label: 'Width (Inches)' },
  { key: 'fasciaPainted',        itemId: 'ev1',  label: 'Painted' },
  { key: 'fasciaDamage',         itemId: 'ev1',  label: 'Damaged' },
  { key: 'fasciaDamageDescription', itemId: 'ev1', label: '_damage' },
  { key: 'gutterStyle',          itemId: 'ev3',  label: 'Style' },
  { key: 'gutterMaterial',       itemId: 'ev3',  label: 'Material' },
  { key: 'gutterSize',           itemId: 'ev3',  label: 'Size (Inches)' },
  { key: 'gutterPainted',        itemId: 'ev3',  label: 'Painted' },
  { key: 'gutterLF',             itemId: 'ev3',  label: 'Length (LF)' },
  { key: 'gutterDamage',         itemId: 'ev3',  label: 'Damaged' },
  { key: 'gutterDamageDescription', itemId: 'ev3', label: '_damage' },
  { key: 'gutterGuardStyle',     itemId: 'ev11', label: 'Style' },
  { key: 'gutterGuardMaterial',  itemId: 'ev11', label: 'Material' },
  { key: 'gutterGuardLF',        itemId: 'ev11', label: 'Length (LF)' },
  { key: 'gutterGuardDamage',    itemId: 'ev11', label: 'Damaged' },
  { key: 'gutterGuardDamageDescription', itemId: 'ev11', label: '_damage' },
  // Legacy: qty expands into N cards during apply
  { key: 'gutterGuardQty',       itemId: 'ev11', label: 'Qty' },
  { key: 'downspoutQty',         itemId: 'ev4',  label: 'Qty' },
  { key: 'downspoutLF',          itemId: 'ev4',  label: 'Length (LF)' },
  { key: 'downspoutMaterial',    itemId: 'ev4',  label: 'Material' },
  { key: 'downspoutStyle',       itemId: 'ev4',  label: 'Style' },
  { key: 'downspoutWidth',       itemId: 'ev4',  label: 'Width' },
  { key: 'downspoutPainted',     itemId: 'ev4',  label: 'Painted' },
  { key: 'downspoutDamage',      itemId: 'ev4',  label: 'Damaged' },
  { key: 'downspoutDamageDescription', itemId: 'ev4', label: '_damage' },
  { key: 'windowGrade',          itemId: 'ev12', label: 'Grade' },
  { key: 'windowType',           itemId: 'ev12', label: 'Type' },
  { key: 'windowGlaze',          itemId: 'ev12', label: 'Glaze' },
  { key: 'windowPainted',        itemId: 'ev12', label: 'Painted' },
  { key: 'windowLength',         itemId: 'ev12', label: 'Length (ft)' },
  { key: 'windowWidth',          itemId: 'ev12', label: 'Width (ft)' },
  { key: 'windowDamage',         itemId: 'ev12', label: 'Damaged' },
  { key: 'windowDamageDescription', itemId: 'ev12', label: '_damage' },
  { key: 'windowQty',            itemId: 'ev12', label: 'Qty' },
  { key: 'windowSmallQty',       itemId: 'ev12', label: '_smallQty' },
  { key: 'windowMediumQty',      itemId: 'ev12', label: '_mediumQty' },
  { key: 'windowLargeQty',       itemId: 'ev12', label: '_largeQty' },
  { key: 'screenType',           itemId: 'ev5',  label: 'Type' },
  { key: 'screenGrade',          itemId: 'ev5',  label: 'Grade' },
  { key: 'screenLength',         itemId: 'ev5',  label: 'Length (ft)' },
  { key: 'screenWidth',          itemId: 'ev5',  label: 'Width (ft)' },
  { key: 'screenDamage',         itemId: 'ev5',  label: 'Damaged' },
  { key: 'screenDamageDescription', itemId: 'ev5', label: '_damage' },
  { key: 'screenQty',            itemId: 'ev5',  label: 'Qty' },
  { key: 'screenSmallQty',       itemId: 'ev5',  label: '_smallQty' },
  { key: 'screenMediumQty',      itemId: 'ev5',  label: '_mediumQty' },
  { key: 'screenLargeQty',       itemId: 'ev5',  label: '_largeQty' },
  { key: 'screenXLargeQty',      itemId: 'ev5',  label: '_xLargeQty' },
  { key: 'gableVentQty',         itemId: 'ev13', label: 'Qty' },
  { key: 'gableVentMaterial',    itemId: 'ev13', label: 'Material' },
  { key: 'gableVentDamage',      itemId: 'ev13', label: 'Damaged' },
  { key: 'gableVentDamageDescription', itemId: 'ev13', label: '_damage' },
  { key: 'shutterMaterial',      itemId: 'ev6',  label: 'Grade' },
  { key: 'shutterGrade',         itemId: 'ev6',  label: 'Grade' },
  { key: 'shutterCustomGrade',   itemId: 'ev6',  label: 'Custom Grade' },
  { key: 'shutterLength',        itemId: 'ev6',  label: 'Length (in)' },
  { key: 'shutterWidth',         itemId: 'ev6',  label: 'Width (in)' },
  { key: 'shutterPainted',       itemId: 'ev6',  label: 'Painted' },
  { key: 'shutterDamage',        itemId: 'ev6',  label: 'Damaged' },
  { key: 'shutterDamageDescription', itemId: 'ev6', label: '_damage' },
  { key: 'shutterQty',           itemId: 'ev6',  label: 'Qty' },
  // Legacy size-qty keys → used only to expand card count
  { key: 'shutterSmallQty',      itemId: 'ev6',  label: '_smallQty' },
  { key: 'shutterMediumQty',     itemId: 'ev6',  label: '_mediumQty' },
  { key: 'shutterLargeQty',      itemId: 'ev6',  label: '_largeQty' },
  { key: 'doorGrade',            itemId: 'ev7',  label: 'Grade' },
  { key: 'doorStyle',            itemId: 'ev7',  label: 'Style' },
  { key: 'doorConfiguration',    itemId: 'ev7',  label: 'Configuration' },
  { key: 'doorPainted',          itemId: 'ev7',  label: 'Painted' },
  { key: 'doorLength',           itemId: 'ev7',  label: 'Length (in)' },
  { key: 'doorWidth',            itemId: 'ev7',  label: 'Width (in)' },
  { key: 'doorAction',           itemId: 'ev7',  label: 'Action' },
  { key: 'doorDamage',           itemId: 'ev7',  label: 'Damaged' },
  { key: 'doorDamageDescription', itemId: 'ev7', label: '_damage' },
  { key: 'doorQty',              itemId: 'ev7',  label: 'Qty' },
  // Legacy flat fields
  { key: 'doorSize',             itemId: 'ev7',  label: 'Size' },
  { key: 'doorMaterial',         itemId: 'ev7',  label: 'Material' },
  { key: 'stormDoor',            itemId: 'ev7',  label: 'Storm Door' },
  { key: 'garageDoorType',       itemId: 'ev8',  label: 'Type' },
  { key: 'garageDoorMaterial',   itemId: 'ev8',  label: 'Grade' },
  { key: 'garageDoorGrade',      itemId: 'ev8',  label: 'Grade' },
  { key: 'garageDoorInsulated',  itemId: 'ev8',  label: 'Insulated' },
  { key: 'garageDoorWindows',    itemId: 'ev8',  label: 'Windows' },
  { key: 'garageDoorWindowQty',  itemId: 'ev8',  label: 'Window Qty' },
  { key: 'garageDoorPainted',    itemId: 'ev8',  label: 'Painted' },
  { key: 'garageDoorLength',     itemId: 'ev8',  label: 'Length (ft)' },
  { key: 'garageDoorWidth',      itemId: 'ev8',  label: 'Width (ft)' },
  { key: 'garageDoorDamage',     itemId: 'ev8',  label: 'Damaged' },
  { key: 'garageDoorDamageDescription', itemId: 'ev8', label: '_damage' },
  { key: 'garageDoorQty',        itemId: 'ev8',  label: 'Qty' },
  { key: 'deckMaterial',         itemId: 'ev14', label: 'Material' },
  { key: 'deckHandrailHeight',   itemId: 'ev14', label: 'Handrail Height (Inches)' },
  { key: 'deckSteps',            itemId: 'ev14', label: 'Steps' },
  { key: 'deckLength',           itemId: 'ev14', label: 'Deck Length (ft)' },
  { key: 'deckWidth',            itemId: 'ev14', label: 'Deck Width (ft)' },
  { key: 'deckTreadLength',      itemId: 'ev14', label: 'Tread Length (in)' },
  { key: 'deckTreadWidth',       itemId: 'ev14', label: 'Tread Width (in)' },
  { key: 'deckPainted',          itemId: 'ev14', label: 'Painted' },
  { key: 'deckDamage',           itemId: 'ev14', label: 'Damaged' },
  { key: 'deckDamageDescription', itemId: 'ev14', label: '_damage' },
  { key: 'deckQty',              itemId: 'ev14', label: 'Qty' },
]

// Maps AI JSON exterior keys → { itemId, fieldLabel }
const EXTERIOR_MAP = [
  { key: 'fenceMaterial',          itemId: 'ei_fence',   label: 'Material' },
  { key: 'fenceStyle',             itemId: 'ei_fence',   label: 'Style' },
  { key: 'fencePosts',             itemId: 'ei_fence',   label: 'Posts' },
  { key: 'fencePostQty',           itemId: 'ei_fence',   label: 'Post Qty' },
  { key: 'fencePostSpacing',       itemId: 'ei_fence',   label: 'Post Spacing (LF)' },
  { key: 'fenceHeight',            itemId: 'ei_fence',   label: 'Height (FT)' },
  { key: 'fenceStained',           itemId: 'ei_fence',   label: 'Stained' },
  { key: 'fencePainted',           itemId: 'ei_fence',   label: 'Painted' },
  { key: 'fenceDamaged',           itemId: 'ei_fence',   label: '_damagePresent' },
  { key: 'fenceDamage',            itemId: 'ei_fence',   label: '_damage' },
  { key: 'gatesQty',               itemId: 'ei_gates',   label: 'Qty' },
  { key: 'gatesMaterial',          itemId: 'ei_gates',   label: 'Material' },
  { key: 'gatesDamaged',           itemId: 'ei_gates',   label: '_damagePresent' },
  { key: 'gatesDamage',            itemId: 'ei_gates',   label: '_damage' },
  { key: 'poolDamaged',            itemId: 'ei_pool',    label: '_damagePresent' },
  { key: 'poolDamageNotes',        itemId: 'ei_pool',    label: '_damage' },
  { key: 'outdoorDamagedItems',    itemId: 'ei_outdoor', label: 'Damaged Items' },
  { key: 'outdoorOther',           itemId: 'ei_outdoor', label: 'Other' },
  { key: 'outdoorDamaged',         itemId: 'ei_outdoor', label: '_damagePresent' },
  { key: 'outdoorNotes',           itemId: 'ei_outdoor', label: '_damage' },
  { key: 'deliveryPlacement',      itemId: 'ei_site',    label: 'Delivery / Trailer Placement' },
  { key: 'landscapingProtect',     itemId: 'ei_site',    label: 'Landscaping to Protect' },
  { key: 'okSaturdayBuild',        itemId: 'ei_site',    label: 'OK Saturday Build' },
  { key: 'pestControlFlashing',    itemId: 'ei_site',    label: 'Pest Control Flashing' },
  { key: 'portapottyNeeded',       itemId: 'ei_site',    label: 'Portapotty Needed?' },
  { key: 'overheadClearanceIssue', itemId: 'ei_site',    label: 'Overhead Clearance Issue' },
]

function normalizeGutterSize(val) {
  if (val == null || val === '' || val === 'Select') return ''
  if (val === '5"' || val === '6"') return val
  const match = String(val).match(/(\d+(?:\.\d+)?)/)
  if (!match) return String(val).trim()
  const inches = match[1]
  if (inches === '5' || inches === '6') return `${inches}"`
  return ''
}

function normalizeDownspoutWidth(val) {
  if (val == null || val === '' || val === 'Select') return val
  const raw = String(val).trim()
  if (/^3"?\s*(std|standard)$/i.test(raw)) return '3" Standard'
  if (/^4"?\s*oversized$/i.test(raw)) return '4" Oversized'
  return raw
}

function normalizeDoorParseFields(fields = {}) {
  const next = { ...fields }
  const grades = ['Wood', 'Aluminum', 'Steel', 'Composite', 'Fiberglass', 'None']
  if (next.Material != null && next.Material !== '' && (next.Grade == null || next.Grade === '' || next.Grade === 'Select')) {
    const match = grades.find(g => g.toLowerCase() === String(next.Material).toLowerCase())
    if (match) next.Grade = match
  }
  delete next.Material
  if ((next['Storm Door'] === 'Yes' || next['Storm Door'] === true)
    && (next.Style == null || next.Style === '' || next.Style === 'Select')) {
    next.Style = 'Storm Door'
  }
  delete next['Storm Door']
  if (next.Size === 'S' || next.Size === 'M' || next.Size === 'L') delete next.Size
  return next
}

function normalizeGarageDoorParseFields(fields = {}) {
  const next = { ...fields }
  if (next.Material != null && next.Material !== '' && (next.Grade == null || next.Grade === '' || next.Grade === 'Select')) {
    const legacy = String(next.Material)
    if (legacy === 'Aluminum') next.Grade = 'Aluminum'
    else if (legacy === 'Wood') next.Grade = 'Wood Paint'
    else if (legacy === 'Composite') next.Grade = 'Composite'
  }
  delete next.Material
  delete next['Panel Style']
  if (next.Windows !== 'Yes') delete next['Window Qty']
  return next
}

function normalizeShutterParseFields(fields = {}) {
  const next = { ...fields }
  if (next.Material != null && next.Material !== '' && (next.Grade == null || next.Grade === '' || next.Grade === 'Select')) {
    const match = ['Vinyl', 'Wood'].find(g => g.toLowerCase() === String(next.Material).toLowerCase())
    if (match) next.Grade = match
  }
  delete next.Material
  delete next.Qty
  delete next._smallQty
  delete next._mediumQty
  delete next._largeQty
  return next
}

function normalizeScreenParseFields(fields = {}) {
  const next = { ...fields }
  delete next.Qty
  delete next._smallQty
  delete next._mediumQty
  delete next._largeQty
  delete next._xLargeQty
  return next
}

function normalizeWindowParseFields(fields = {}) {
  const next = { ...fields }
  delete next.Qty
  delete next._smallQty
  delete next._mediumQty
  delete next._largeQty
  return next
}

const SIDING_STYLES = new Set(['Flat', 'Double Dutch', 'Textured', 'Other', 'N/A', 'Select'])

function normalizeSidingStyle(val) {
  const raw = String(val || '').trim()
  if (!raw) return raw
  if (SIDING_STYLES.has(raw) || raw.startsWith('Other - ')) return raw
  const known = [...SIDING_STYLES].find(opt => opt.toLowerCase() === raw.toLowerCase())
  if (known) return known
  return `Other - ${raw}`
}

// Convert comma string from AI to array for multiRadio fields
function toArray(val) {
  if (Array.isArray(val)) return val
  if (!val) return []
  return String(val).split(',').map(s => s.trim()).filter(Boolean)
}

// Apply parsed JSON to InspectionContext
function applyParsed(parsed, ctx) {
  const {
    updateJobInfo, updateRoofField, updateElevField, updateExteriorField, updateNote,
    importRoofPipeJacks, importRoofExhaustStacks, importRoofRainDiverters, importRoofCorniceStrips, importRoofChimneys, importRoofFlashingItems,
    importRoofLowSlopeItems, importRoofSkylights, importRoofOtherStructures,
    importInteriorRooms,
    replaceElevSubItems,
  } = ctx

  // Job info
  const ji = parsed.jobInfo || {}
  const JOB_FIELDS = ['cust','phone','email','pm','insp','ins','claim','claimFileDate','stormDate','residenceType','tenantname','tenantphone','isMainContact','contactName','contactRelationship','contactPhone','contactEmail','gatedCommunity','gateCode','damageSquares','frontOfRiskDirection']
  JOB_FIELDS.forEach(f => { if (ji[f] != null) updateJobInfo(f, ji[f]) })
  if (ji.isMainContact == null && ji.hasSeparateContact != null) {
    // Legacy AI key shared the same Yes/No meaning for collecting contact fields
    updateJobInfo('isMainContact', ji.hasSeparateContact)
  }
  if (ji.date != null && ji.claimFileDate == null) updateJobInfo('claimFileDate', ji.date)
  if (ji.preferredContact != null) {
    updateJobInfo('preferredContact', toArray(ji.preferredContact))
  }
  if (ji.lossType != null) {
    updateJobInfo('lossType', toArray(ji.lossType))
  }
  if (ji.frontOfRiskDetection != null && ji.frontOfRiskDirection == null) {
    updateJobInfo('frontOfRiskDirection', ji.frontOfRiskDetection)
  }
  if (ji.contactPreferredContact != null) {
    updateJobInfo('contactPreferredContact', toArray(ji.contactPreferredContact))
  }

  // Property address — the form's source of truth is addrParts, with `addr` derived from it.
  if (ji.address1 || ji.city || ji.state || ji.zipcode) {
    const addrParts = {
      address1: ji.address1 || '',
      address2: ji.address2 || '',
      city: ji.city || '',
      state: String(ji.state || '').toUpperCase().slice(0, 2),
      zipcode: ji.zipcode || '',
    }
    updateJobInfo('addrParts', addrParts)
    updateJobInfo('addr', formatPropertyAddress(addrParts))
  } else if (ji.addr != null) {
    updateJobInfo('addr', ji.addr)
  }

  // Notes
  const notes = parsed.notes || {}
  Object.entries(notes).forEach(([k, v]) => { if (v != null) updateNote(k, v) })

  // Roof
  const roof = parsed.roof || {}
  ROOF_MAP.forEach(({ key, itemId, label }) => {
    let val = roof[key]
    if (val == null) return
    if (key === 'pitch') val = formatPitch(parsePitchNumerator(val, 0))
    if (key === 'shingleStyle') val = toArray(val)
    if (key === 'valleyStyle') val = toArray(val)
    if (key === 'valleyChooseOne' && val === 'Cut') val = 'Closed Cut'
    if (key === 'valleyMetalChooseOne' && val === 'Cut') val = 'Closed Cut'
    if (key === 'valleyNAChooseOne' && val === 'Cut') val = 'Closed Cut'
    if (key === 'edgeFlashingType') val = toArray(val)
    if (key === 'chimneyCoverDamaged') val = toArray(val)
    updateRoofField(itemId, label, val)
  })

  // Items with an auto-rendered "Damaged" toggle (flags includes 'D') require the
  // _damage notes field to be either a real description or "n/a" to count as filled —
  // the manual UI sets "n/a" automatically when Damaged is toggled to No/N/A, so mirror
  // that here for AI-driven updates, or these fields would cap completion forever.
  const DAMAGE_FLAG_ITEMS = [
    { itemId: 'ri1',  key: 'edgeDamaged' },
    { itemId: 'ri34', key: 'deckingDamaged' },
    { itemId: 'ri3',  key: 'ridgeCapDamaged' },
    { itemId: 'ri6',  key: 'ridgeVentDamaged' },
    { itemId: 'ri7',  key: 'boxVentDamaged' },
    { itemId: 'ri8',  key: 'turbineDamaged' },
    { itemId: 'ri9',  key: 'powerVentDamaged' },
    { itemId: 'ri10', key: 'solarVentDamaged' },
    { itemId: 'ri25', key: 'offRidgeVentDamaged' },
    { itemId: 'ri26', key: 'domeVentDamaged' },
    { itemId: 'ri27', key: 'rooftopIntakeVentDamaged' },
    { itemId: 'ri30', key: 'windVaneDamaged' },
    { itemId: 'ri31', key: 'cupolaDamaged' },
    { itemId: 'ri33', key: 'openCornicesDamaged' },
  ]
  DAMAGE_FLAG_ITEMS.forEach(({ itemId, key }) => {
    const val = roof[key]
    if (val === 'No' || val === 'N/A') updateRoofField(itemId, '_damage', 'n/a')
  })
  {
    const parts = toArray(roof.chimneyCoverDamaged)
    if (roof.chimneyCoverDamaged != null && parts.length === 0) {
      updateRoofField('ri29', '_damage', 'n/a')
    }
  }

  importRoofPipeJacks(roof)
  importRoofExhaustStacks(roof)
  importRoofRainDiverters(roof)
  importRoofCorniceStrips(roof)
  importRoofChimneys(roof)
  importRoofFlashingItems(roof)
  importRoofLowSlopeItems(roof)
  importRoofSkylights(roof)
  importRoofOtherStructures(roof)

  const chimneyNotes = (Array.isArray(roof.chimneys) ? roof.chimneys : [])
    .map(c => c?.conditionNotes).filter(Boolean).join(' ')
  if (chimneyNotes) {
    updateNote('defects', notes.defects ? `${notes.defects} ${chimneyNotes}` : chimneyNotes)
  }

  // Elevations
  const elevations = parsed.elevations || {}
  const DIRS = ['Front', 'Right', 'Rear', 'Left']
  const ADDMORE_ELEV_IDS = new Set(['ev3', 'ev11', 'ev4', 'ev12', 'ev5', 'ev6', 'ev7', 'ev8', 'ev14'])
  const ADDMORE_PARENT_FIELDS_BY_ID = {
    ev3: new Set(['Style', 'Material', 'Size (Inches)', 'Painted']),
    ev11: new Set(['Style', 'Material']),
    ev4: new Set(['Style', 'Material', 'Width', 'Painted']),
    ev12: new Set(['Grade', 'Type', 'Glaze', 'Painted']),
    ev5: new Set(['Type', 'Grade']),
    ev6: new Set(['Grade', 'Custom Grade', 'Painted']),
  }
  DIRS.forEach(dir => {
    const dirData = elevations[dir] || {}
    const addMoreFields = {}
    const parentFieldUpdates = []
    ELEV_MAP.forEach(({ key, itemId, label }) => {
      let val = dirData[key]
      if (val == null) return
      if (key === 'gutterSize') val = normalizeGutterSize(val)
      if (key === 'downspoutWidth') val = normalizeDownspoutWidth(val)
      if (key === 'sidingStyle' || key === 'sidingMaterial') {
        val = normalizeSidingStyle(val)
        updateElevField(`${itemId}_${dir}`, 'Style', val)
        return
      }
      if (ADDMORE_ELEV_IDS.has(itemId)) {
        const cellKey = `${itemId}_${dir}`
        if (ADDMORE_PARENT_FIELDS_BY_ID[itemId]?.has(label)) {
          parentFieldUpdates.push([cellKey, label, val])
          return
        }
        if (!addMoreFields[cellKey]) addMoreFields[cellKey] = {}
        addMoreFields[cellKey][label] = val
        return
      }
      updateElevField(`${itemId}_${dir}`, label, val)
    })
    Object.entries(addMoreFields).forEach(([cellKey, fields]) => {
      if (fields.Damaged === 'No' || fields.Damaged === 'N/A') fields._damage = 'n/a'
      const qtyRaw = fields.Qty
      delete fields.Qty
      // Downspouts / gutter guards / doors / garage doors / shutters: qty becomes N cards
      if (
        cellKey.startsWith('ev4_')
        || cellKey.startsWith('ev11_')
        || cellKey.startsWith('ev12_')
        || cellKey.startsWith('ev5_')
        || cellKey.startsWith('ev6_')
        || cellKey.startsWith('ev7_')
        || cellKey.startsWith('ev8_')
        || cellKey.startsWith('ev14_')
      ) {
        let count = Math.max(1, Math.floor(Number(qtyRaw)) || 1)
        let cardFields = { ...fields }
        if (cellKey.startsWith('ev12_')) {
          const small = Math.floor(Number(fields._smallQty)) || 0
          const medium = Math.floor(Number(fields._mediumQty)) || 0
          const large = Math.floor(Number(fields._largeQty)) || 0
          const sizeTotal = small + medium + large
          if (sizeTotal > 0) count = sizeTotal
          cardFields = normalizeWindowParseFields(cardFields)
        } else if (cellKey.startsWith('ev5_')) {
          const small = Math.floor(Number(fields._smallQty)) || 0
          const medium = Math.floor(Number(fields._mediumQty)) || 0
          const large = Math.floor(Number(fields._largeQty)) || 0
          const xLarge = Math.floor(Number(fields._xLargeQty)) || 0
          const sizeTotal = small + medium + large + xLarge
          if (sizeTotal > 0) count = sizeTotal
          cardFields = normalizeScreenParseFields(cardFields)
        } else if (cellKey.startsWith('ev6_')) {
          const small = Math.floor(Number(fields._smallQty)) || 0
          const medium = Math.floor(Number(fields._mediumQty)) || 0
          const large = Math.floor(Number(fields._largeQty)) || 0
          const sizeTotal = small + medium + large
          if (sizeTotal > 0) count = sizeTotal
          cardFields = normalizeShutterParseFields(cardFields)
        } else if (cellKey.startsWith('ev7_')) {
          cardFields = normalizeDoorParseFields(cardFields)
        } else if (cellKey.startsWith('ev8_')) {
          cardFields = normalizeGarageDoorParseFields(cardFields)
        } else if (cellKey.startsWith('ev14_')) {
          delete cardFields.Qty
        } else {
          cardFields = {
            ...(fields['Length (LF)'] != null ? { 'Length (LF)': fields['Length (LF)'] } : {}),
            ...(fields.Damaged != null ? { Damaged: fields.Damaged } : {}),
            ...(fields._damage != null ? { _damage: fields._damage } : {}),
          }
        }
        replaceElevSubItems(
          cellKey,
          Array.from({ length: count }, () => ({ fields: { ...cardFields }, photos: [] })),
        )
        return
      }
      replaceElevSubItems(cellKey, [{ fields, photos: [] }])
    })
    parentFieldUpdates.forEach(([cellKey, label, val]) => {
      updateElevField(cellKey, label, val)
    })
  })

  // Interior rooms (variable-length)
  const interior = parsed.interior || {}
  importInteriorRooms(Array.isArray(interior.rooms) ? interior.rooms : [])

  // Exterior
  const ext = parsed.exterior || {}
  EXTERIOR_MAP.forEach(({ key, itemId, label }) => {
    let val = ext[key]
    if (val == null) return
    if (key === 'outdoorDamagedItems') val = toArray(val)
    if (key === 'fenceMaterial' && Array.isArray(val)) {
      val = val.find(v => v != null && String(v).trim() !== '') || ''
    }
    updateExteriorField(itemId, label, val)
  })

  // Mirror the manual UI's damage-toggle side effect: when the damage status is
  // No/N/A, the notes field should read "n/a" rather than sit blank.
  const EXT_DAMAGE_STATUS_ITEMS = [
    { itemId: 'ei_fence',   key: 'fenceDamaged' },
    { itemId: 'ei_gates',   key: 'gatesDamaged' },
    { itemId: 'ei_pool',    key: 'poolDamaged' },
    { itemId: 'ei_outdoor', key: 'outdoorDamaged' },
  ]
  EXT_DAMAGE_STATUS_ITEMS.forEach(({ itemId, key }) => {
    const val = ext[key]
    if (val === 'No' || val === 'N/A') updateExteriorField(itemId, '_damage', 'n/a')
  })
}

// ── Component ─────────────────────────────────────────────────────
export default function AIParseSection() {
  const ctx = useInspection()
  const { aiParseState, setAiParseState } = ctx
  const { transcript, status, statusMsg, flags } = aiParseState

  function setTranscript(next) {
    setAiParseState(prev => ({ ...prev, transcript: next }))
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText()
      if (text.trim()) setTranscript(text)
    } catch {
      alert('Clipboard access denied — paste manually.')
    }
  }

  async function handleParse() {
    if (!transcript.trim()) {
      alert('Paste a transcript first.')
      return
    }
    setAiParseState(prev => ({ ...prev, status: 'parsing', statusMsg: 'Sending transcript to AI — this takes 10–20 seconds…', flags: [] }))

    try {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcript.trim() }),
      })

      const json = await res.json()

      if (!res.ok || json.error) {
        throw new Error(json.error || `HTTP ${res.status}`)
      }

      applyParsed(json, ctx)

      const flagList = json.flags || []
      const fieldCount = Object.values(json.jobInfo || {}).filter(Boolean).length
        + Object.values(json.notes || {}).filter(Boolean).length
        + Object.values(json.roof || {}).filter(Boolean).length
      setAiParseState(prev => ({
        ...prev,
        status: 'done',
        flags: flagList,
        statusMsg: `Done — ${fieldCount} fields populated.${flagList.length ? ` ${flagList.length} fields flagged for review.` : ' All fields confident.'}`,
      }))
    } catch (err) {
      console.error('AI parse error:', err)
      setAiParseState(prev => ({ ...prev, status: 'error', statusMsg: `Parse failed: ${err.message}. Check your connection and try again.` }))
    }
  }

  return (
    <div className="ai-section">
      <p className="section-eyebrow">Section 6</p>
      <h2 className="section-title">AI Transcript Parser</h2>
      <p className="ai-section__hint">
        Dictate the inspection using Plaud, then paste the transcript below. AI will populate the form across all sections.
      </p>

      <div className="ai-card app-card">
        <div className="ai-card__label-row">
          <label className="ai-card__label">Transcript Text</label>
          {transcript
            ? <button className="ai-transcript-btn ai-card__corner-btn" onClick={() => setAiParseState({ transcript: '', status: 'idle', statusMsg: '', flags: [] })}>Clear</button>
            : <button className="ai-transcript-btn ai-card__corner-btn" onClick={handlePaste}>Paste</button>
          }
        </div>
        <textarea
          className="ai-card__textarea"
          rows={12}
          placeholder={`Paste your Plaud transcript here.\n\nThe AI will extract: customer info, roof specs, measurements, ventilation, flashings, elevation details, interior damage, exterior items, and inspector notes.\n\nSpeak naturally — the AI handles variations in phrasing. After parsing, review any flagged fields before saving.`}
          value={transcript}
          onChange={e => setTranscript(e.target.value)}
        />
        <button
          className="ai-parse-btn"
          onClick={handleParse}
          disabled={status === 'parsing'}
        >
          {status === 'parsing' ? '⏳ Parsing…' : '🤖 Parse Transcript and Populate Form'}
        </button>

        {status !== 'idle' && (
          <div className={`ai-status ai-status--${status}`}>
            {statusMsg}
          </div>
        )}

        {flags.length > 0 && (
          <div className="ai-flags">
            <p className="ai-flags__header">Review these fields — AI was uncertain:</p>
            {flags.map((f, i) => (
              <div key={i} className="ai-flag-item">
                <strong>{f}</strong> — verify manually
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="ai-card app-card">
        <label className="ai-card__label">ℹ️ How It Works</label>
        <div className="ai-card__info">
          <p><strong>What populates automatically:</strong> Customer name, address, insurance info, roof specs, stories, pitch, layers, all vent types and quantities, pipe jacks, flashings, chimney, valley, underlayment — plus per-elevation details (siding, fascia, gutters, downspouts, screens, shutters, doors, garage doors) for all four sides. Also exterior items and all notes fields.</p>
          <p><strong>What requires manual entry:</strong> Photos (always manual) and any fields flagged for review below the Parse button.</p>
          <p><strong>Review before saving:</strong> Flagged fields are ones the AI was uncertain about. Always verify them before hitting Save.</p>
          <p><strong>Plaud tip:</strong> Walk through each section out loud by name. For example: "Roof — architectural shingles, two stories, four-twelve pitch, one layer. Ridge vent — twenty linear feet, metal, not painted. Front elevation — five-inch aluminum gutters, damaged. Two downspouts, aluminum, not damaged." The more structured your dictation, the fewer flags you'll see.</p>
        </div>
      </div>
    </div>
  )
}
