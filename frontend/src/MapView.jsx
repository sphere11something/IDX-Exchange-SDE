import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const short = (n) => (n >= 1e6 ? `$${+(n / 1e6).toFixed(2)}M` : `$${Math.round(n / 1e3)}K`)

export default function MapView({ params, base = '' }) {
  const el = useRef(), map = useRef(), layer = useRef(), nav = useNavigate()
  useEffect(() => {
    map.current = L.map(el.current, { zoomControl: true }).setView([34.09, -118.13], 12)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 19 }).addTo(map.current)
    layer.current = L.layerGroup().addTo(map.current)
    return () => map.current.remove()
  }, [])
  useEffect(() => {
    const n = new URLSearchParams(params); n.delete('page'); n.delete('sort')
    let live = true
    fetch('/api/properties/map?' + n).then((r) => r.json()).then((rows) => {
      if (!live) return
      layer.current.clearLayers()
      const pts = []
      rows.forEach((p) => {
        const ll = [+p.lat, +p.lng]; pts.push(ll)
        L.marker(ll, { icon: L.divIcon({ className: '', html: `<div class="pin">${short(p.price)}</div>`, iconSize: null }) })
          .on('click', () => nav(base + '/property/' + p.id)).addTo(layer.current)
      })
      map.current.invalidateSize()
      if (pts.length) map.current.fitBounds(pts, { padding: [40, 40], maxZoom: 15 })
    })
    return () => { live = false }
  }, [params.toString()])
  return <div ref={el} style={{ width: '100%', height: '100%' }} />
}
