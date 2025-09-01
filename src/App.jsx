import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { places, segmentPath, totalDurationHours, tripSegments } from './tripData.js'

const carIcon = new L.DivIcon({ className: 'car-marker', html: '🚗', iconSize: [24, 24], iconAnchor: [12, 12] })
const planeIcon = new L.DivIcon({ className: 'plane-marker', html: '✈️', iconSize: [24, 24], iconAnchor: [12, 12] })

function MovingMarker({ seg, progress }) {
  const path = segmentPath(seg)
  if (path.length < 2) return null
  const pos = [
    path[0][0] + (path[1][0]-path[0][0]) * progress,
    path[0][1] + (path[1][1]-path[0][1]) * progress,
  ]
  const icon = seg.type === 'flight' ? planeIcon : carIcon
  return <Marker position={pos} icon={icon} />
}

function FitBoundsOnSegment({ seg }) {
  const map = useMap()
  useEffect(() => {
    const path = segmentPath(seg)
    if (path.length >= 2) {
      map.fitBounds(path, { padding: [60, 60], maxZoom: 7 })
    }
  }, [seg, map])
  return null
}

function BottomTimeline({ playing, setPlaying, slider, setSlider, label }) {
  return (
    <div className="timeline">
      <button className="play" onClick={() => setPlaying(p => !p)}>{playing ? 'Pause' : 'Play'}</button>
      <input type="range" min={0} max={1000} value={slider} onChange={e => setSlider(parseInt(e.target.value, 10))} />
      <div className="label">{label}</div>
    </div>
  )
}

function App() {
  const [slider, setSlider] = useState(0) // 0..1000 across entire trip
  const [playing, setPlaying] = useState(true)
  const totalHours = useMemo(() => totalDurationHours(), [])
  const cum = useMemo(() => {
    let s = 0
    return tripSegments.map(x => (s += (x.durationHours || 1)))
  }, [])

  const { segIndex, segProgress } = useMemo(() => {
    const tHours = (slider / 1000) * totalHours
    let i = 0
    while (i < tripSegments.length && tHours > cum[i]) i++
    const prevCum = i === 0 ? 0 : cum[i-1]
    const seg = tripSegments[Math.min(i, tripSegments.length - 1)]
    const dur = seg?.durationHours || 1
    const within = Math.min(Math.max((tHours - prevCum) / dur, 0), 1)
    return { segIndex: Math.min(i, tripSegments.length - 1), segProgress: within }
  }, [slider, totalHours, cum])

  const speed = 1000 // ms per hour of itinerary
  const raf = useRef()
  const last = useRef()
  useEffect(() => {
    function tick(ts) {
      if (!playing) { last.current = ts; raf.current = requestAnimationFrame(tick); return }
      if (last.current == null) last.current = ts
      const dt = ts - last.current
      last.current = ts
      const totalMs = totalHours * speed
      setSlider(v => {
        const next = v + (dt / totalMs) * 1000
        return next >= 1000 ? 1000 : next
      })
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [playing, totalHours])

  const seg = tripSegments[segIndex]
  const path = segmentPath(seg)
  const label = `${seg.title} • ${seg.when || ''} ${seg.type === 'drive' ? `• ${seg.distanceMiles ?? ''} mi • ${seg.durationHours} h` : `• ~${seg.durationHours} h`}`

  return (
    <div className="app">
      <MapContainer center={[41.5, -111]} zoom={5} className="map-root">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />

        {tripSegments.slice(0, segIndex).map((s, idx) => (
          <Polyline key={`done-${idx}`} positions={segmentPath(s)} pathOptions={{ color: s.type === 'flight' ? '#1f77b4' : '#ff7f0e', dashArray: s.type === 'flight' ? '6 6' : undefined, weight: 4, opacity: 0.9 }} />
        ))}

        {path.length === 2 && (
          <>
            <Polyline positions={[path[0], path[1]]} pathOptions={{ color: '#bbb', weight: 3, opacity: 0.5, dashArray: seg.type === 'flight' ? '6 6' : undefined }} />
            <Polyline positions={[path[0], [
              path[0][0] + (path[1][0]-path[0][0]) * segProgress,
              path[0][1] + (path[1][1]-path[0][1]) * segProgress,
            ]]} pathOptions={{ color: seg.type === 'flight' ? '#1f77b4' : '#ff7f0e', weight: 5, opacity: 1, dashArray: seg.type === 'flight' ? '6 6' : undefined }} />
            <MovingMarker seg={seg} progress={segProgress} />
            <FitBoundsOnSegment seg={seg} />
          </>
        )}

        {Object.values(places).map((p) => (
          <Marker key={p.name} position={[p.lat, p.lng]} icon={L.divIcon({ className: 'place', html: '•', iconSize: [10,10] })}>
            <Tooltip>{p.name}</Tooltip>
          </Marker>
        ))}
      </MapContainer>

      <BottomTimeline playing={playing} setPlaying={setPlaying} slider={slider} setSlider={setSlider} label={label} />
    </div>
  )
}

export default App
