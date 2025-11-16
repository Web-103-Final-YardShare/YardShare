import { useEffect, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function MapView({ location, searchQuery, radiusMiles = 10 }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const highlightCircle = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    // Initialize Leaflet map once
    if (mapRef.current && !mapInstance.current && window.L) {
      const L = window.L
      const initLat = location?.lat || 28.5383
      const initLng = location?.lng || -81.3792
      mapInstance.current = L.map(mapRef.current).setView([initLat, initLng], 11)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstance.current)
      
      // Initial highlight circle
      highlightCircle.current = L.circle([initLat, initLng], {
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.15,
        radius: radiusMiles * 1609.34
      }).addTo(mapInstance.current)
    }
  }, [location?.lat, location?.lng, radiusMiles])

  useEffect(() => {
    if (mapInstance.current && location?.lat && location?.lng && window.L) {
      mapInstance.current.setView([location.lat, location.lng], 12)
      
      // Update highlight circle
      const L = window.L
      if (highlightCircle.current) {
        mapInstance.current.removeLayer(highlightCircle.current)
      }
      highlightCircle.current = L.circle([location.lat, location.lng], {
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.15,
        radius: radiusMiles * 1609.34
      }).addTo(mapInstance.current)
    }
  }, [location, radiusMiles])

  useEffect(() => {
    // Fetch listings and add markers, optionally filtered by search only
    const controller = new AbortController()
    const run = async () => {
      try {
        const params = new URLSearchParams()
        if (searchQuery) params.set('q', searchQuery)
        if (location?.lat && location?.lng) {
          params.set('lat', String(location.lat))
          params.set('lng', String(location.lng))
          params.set('radius_km', String(Math.max(1, Math.round(radiusMiles * 1.60934))))
        }
        const url = `${API_BASE}/api/listings${params.toString() ? `?${params.toString()}` : ''}`
        const res = await fetch(url, { credentials: 'include', signal: controller.signal })
        const data = await res.json()
        const L = window.L
        // Clear old markers
        markersRef.current.forEach(m => mapInstance.current.removeLayer(m))
        markersRef.current = []
        data.forEach(l => {
          if (l.latitude && l.longitude) {
            const marker = L.marker([l.latitude, l.longitude]).addTo(mapInstance.current)
            const title = l.title || l.location || 'Listing'
            const imgSrc = l.image_url && l.image_url.startsWith('/') ? `${API_BASE}${l.image_url}` : l.image_url
            const img = imgSrc ? `<img src="${imgSrc}" style="width:160px;height:auto;border-radius:8px;"/>` : ''
            marker.bindPopup(`<b>${title}</b><br/>${l.category_name || ''}<br/>${img}`)
            markersRef.current.push(marker)
          }
        })
      } catch (e) {
        if (e.name !== 'AbortError') console.error('Failed to load listings for map', e)
      }
    }
    run()
    return () => controller.abort()
  }, [searchQuery, location?.lat, location?.lng, radiusMiles])

  const recenterToUser = () => {
    if (!navigator.geolocation || !mapInstance.current) return
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords
      mapInstance.current.setView([latitude, longitude], 13)
      const L = window.L
      if (L) {
        L.marker([latitude, longitude]).addTo(mapInstance.current).bindPopup('You are here').openPopup()
      }
    })
  }

  return (
    <div className="flex-1 relative z-0">
      <div className="absolute right-4 top-4 z-10">
        <button onClick={recenterToUser} className="px-3 py-1 rounded bg-white border shadow text-sm">My Location</button>
      </div>
      <div ref={mapRef} className="h-full min-h-[600px] w-full" />
    </div>
  )
}
