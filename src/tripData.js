import rawMd from '../NYC-SLC-6-National-Parks-Roadtrip-Oct4-18-2025.md?raw'

// Minimal coordinates for key locations (approximate city/airport centers)
export const places = {
  NYC: { name: 'New York City', lat: 40.7128, lng: -74.006 },
  EWR: { name: 'Newark (EWR)', lat: 40.6895, lng: -74.1745 },
  SLC: { name: 'Salt Lake City (SLC)', lat: 40.7899, lng: -111.9791 },
  'West Yellowstone': { name: 'West Yellowstone, MT', lat: 44.662, lng: -111.104 },
  Jackson: { name: 'Jackson, WY', lat: 43.4799, lng: -110.7624 },
  Moab: { name: 'Moab, UT', lat: 38.5733, lng: -109.5498 },
  Torrey: { name: 'Torrey, UT', lat: 38.3008, lng: -111.4196 },
  'Bryce Canyon City': { name: 'Bryce Canyon City, UT', lat: 37.673, lng: -112.156 },
  Springdale: { name: 'Springdale, UT', lat: 37.188, lng: -113.003 },
  Provo: { name: 'Provo, UT', lat: 40.2338, lng: -111.6585 },
}

// Extract basic time/distance from the markdown's Driving Segments and Flights sections for display.
function extractSummary(md) {
  const lines = md.split('\n')
  const flights = []
  const drives = []

  // Flights section: capture arrival and departure lines
  let inFlights = false
  for (const line of lines) {
    if (line.startsWith('**Flights**')) inFlights = true
    else if (inFlights && line.startsWith('**Parks & Order')) inFlights = false
    if (!inFlights) continue
    const arrive = line.match(/Arrive SLC.*?landing\s+\*\*(.*?)\*\*\s+on\s+\*\*(.*?)\*\*/i)
    if (arrive) {
      flights.push({
        type: 'flight',
        from: 'NYC',
        to: 'SLC',
        title: 'Flight: NYC → SLC (UA 2166)',
        when: `${arrive[2]} ${arrive[1]}`,
      })
      continue
    }
    const dep = line.match(/Depart SLC → EWR.*?\*\*(\d+:\d+\s*[AP]M) → (\d+:\d+\s*[AP]M)\*\*\s+on\s+\*\*(.*?)\*\*/i)
    if (dep) {
      flights.push({
        type: 'flight',
        from: 'SLC',
        to: 'EWR',
        title: 'Flight: SLC → EWR (UA 1553)',
        when: `${dep[3]} ${dep[1]} → ${dep[2]}`,
        durationHours: 6.4,
      })
      continue
    }
  }

  // Driving Segments at a glance
  let inDrive = false
  for (const raw of lines) {
    const line = raw.trim()
    if (line.startsWith('## Driving Segments')) inDrive = true
    else if (inDrive && line.startsWith('---')) break
    if (!inDrive || !line.startsWith('-')) continue

    // Pattern: **FROM → TO:** ... possibly includes miles and hours
    const m = line.match(/\*\*(.*?)\s*→\s*(.*?)\*\*:\s*(.*)/)
    if (m) {
      const from = m[1]
      const to = m[2]
      const info = m[3]
      // Duration hours: pick the last number range or explicit hours
      let durationHours
      const approx = info.match(/(~?)(\d+(?:\.\d+)?)\s*h/i)
      if (approx) durationHours = parseFloat(approx[2])
      // Miles
      let distanceMiles
      const miles = info.match(/(\d+)\s*mi/i)
      if (miles) distanceMiles = parseInt(miles[1], 10)
      drives.push({ type: 'drive', from, to, info, durationHours, distanceMiles })
    }
  }

  return { flights, drives }
}

const summary = extractSummary(rawMd)

// Curate an ordered sequence of trip segments with coordinates and durations.
export const tripSegments = [
  {
    type: 'flight',
    from: 'NYC',
    to: 'SLC',
    title: summary.flights[0]?.title || 'Flight: NYC → SLC',
    when: summary.flights[0]?.when,
    durationHours: 4.8,
  },
  {
    type: 'drive',
    from: 'SLC',
    to: 'West Yellowstone',
    title: 'SLC → West Yellowstone',
    durationHours: 6.5,
    distanceMiles: 320,
    when: 'Sat Oct 4',
  },
  {
    type: 'drive',
    from: 'West Yellowstone',
    to: 'Jackson',
    title: 'West Yellowstone → Jackson',
    durationHours: 4.0,
    distanceMiles: 130,
    when: 'Tue Oct 7',
  },
  {
    type: 'drive',
    from: 'Jackson',
    to: 'Moab',
    title: 'Jackson → Moab',
    durationHours: 9.5,
    distanceMiles: 486,
    when: 'Thu Oct 9',
  },
  {
    type: 'drive',
    from: 'Moab',
    to: 'Torrey',
    title: 'Moab → Torrey',
    durationHours: 3.0,
    distanceMiles: 155,
    when: 'Sat Oct 11',
  },
  {
    type: 'drive',
    from: 'Torrey',
    to: 'Bryce Canyon City',
    title: 'Torrey → Bryce Canyon',
    durationHours: 2.3,
    distanceMiles: 110,
    when: 'Sun Oct 12',
  },
  {
    type: 'drive',
    from: 'Bryce Canyon City',
    to: 'Springdale',
    title: 'Bryce → Springdale (Zion)',
    durationHours: 1.8,
    distanceMiles: 80,
    when: 'Mon Oct 13',
  },
  {
    type: 'drive',
    from: 'Springdale',
    to: 'Provo',
    title: 'Springdale → Provo/SLC',
    durationHours: 5.5,
    distanceMiles: 300,
    when: 'Thu Oct 16',
  },
  {
    type: 'flight',
    from: 'SLC',
    to: 'EWR',
    title: summary.flights[1]?.title || 'Flight: SLC → EWR',
    when: summary.flights[1]?.when,
    durationHours: summary.flights[1]?.durationHours || 6.3,
  },
]

export function getLatLng(key) {
  return places[key] || null
}

export function segmentPath(seg) {
  const a = getLatLng(seg.from)
  const b = getLatLng(seg.to)
  if (!a || !b) return []
  return [ [a.lat, a.lng], [b.lat, b.lng] ]
}

export function totalDurationHours() {
  return tripSegments.reduce((s, x) => s + (x.durationHours || 1), 0)
}

