function pointDistance(p1, p2) {
  const dx = p2[0] - p1[0]
  const dy = p2[1] - p1[1]
  const dz = p2[2] - p1[2]
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export function parseXmlMeasurements(xmlText) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'application/xml')

  if (doc.querySelector('parsererror')) throw new Error('Invalid XML file.')

  const result = {}

  const loc = doc.querySelector('LOCATION')
  if (loc) {
    result.address = {
      address1: loc.getAttribute('address') || '',
      city: loc.getAttribute('city') || '',
      state: loc.getAttribute('state') || '',
      zipcode: loc.getAttribute('postal') || '',
    }
  }

  const points = {}
  doc.querySelectorAll('POINT').forEach(pt => {
    const data = (pt.getAttribute('data') || '').split(',').map(Number)
    points[pt.getAttribute('id')] = data
  })

  const lineLengths = { RIDGE: 0, VALLEY: 0, EAVE: 0, RAKE: 0 }
  doc.querySelectorAll('LINE').forEach(line => {
    const type = line.getAttribute('type')
    if (!(type in lineLengths)) return
    const path = (line.getAttribute('path') || '').split(',')
    if (path.length < 2) return
    const p1 = points[path[0]]
    const p2 = points[path[1]]
    if (!p1 || !p2) return
    lineLengths[type] += pointDistance(p1, p2)
  })
  Object.keys(lineLengths).forEach(k => {
    lineLengths[k] = Math.round(lineLengths[k] * 10) / 10
  })
  result.lineLengths = lineLengths
  result.valleyPresent = lineLengths.VALLEY > 0

  const pitchCounts = {}
  let totalSqFt = 0
  doc.querySelectorAll('POLYGON').forEach(poly => {
    const pitch = poly.getAttribute('pitch')
    if (pitch) pitchCounts[pitch] = (pitchCounts[pitch] || 0) + 1

    const unrounded = Number(poly.getAttribute('unroundedsize'))
    const rounded = Number(poly.getAttribute('size'))
    if (Number.isFinite(unrounded) && unrounded > 0) totalSqFt += unrounded
    else if (Number.isFinite(rounded) && rounded > 0) totalSqFt += rounded
  })
  const pitchEntries = Object.entries(pitchCounts)
  if (pitchEntries.length) {
    const dominant = pitchEntries.sort((a, b) => b[1] - a[1])[0][0]
    result.pitch = `${dominant}/12`
  }

  // EagleView polygon sizes are sq ft; roofing squares = sq ft / 100
  if (totalSqFt > 0) {
    result.squares = Math.round((totalSqFt / 100) * 10) / 10
  }

  return result
}
