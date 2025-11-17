import { useEffect, useRef, useState } from 'react'

export function LocationPicker({ value, onChange }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markerRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)

  // Initialize map
  useEffect(() => {
    if (mapRef.current && !mapInstance.current && window.L) {
      const L = window.L
      const center = value?.latitude && value?.longitude ? [value.latitude, value.longitude] : [37.773972, -122.431297]
      mapInstance.current = L.map(mapRef.current).setView(center, value?.latitude ? 14 : 11)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstance.current)

      // Click to set location
      mapInstance.current.on('click', (e) => {
        const { lat, lng } = e.latlng
        setMarker(lat, lng)
        onChange?.({ ...value, latitude: lat, longitude: lng })
      })

      if (value?.latitude && value?.longitude) setMarker(value.latitude, value.longitude)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const text = value?.address || ''
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!text || text.length < 3) return
    debounceRef.current = setTimeout(() => {
      handleGeocodeLocation(text)
    }, 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.address])

  const setMarker = (lat, lng) => {
    const L = window.L
    if (!L || !mapInstance.current) return
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    } else {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapInstance.current)
      markerRef.current.on('dragend', () => {
        const { lat, lng } = markerRef.current.getLatLng()
        onChange?.({ ...value, latitude: lat, longitude: lng })
      })
    }
  }

  const handleGeocodeLocation = async (text) => {
    if (!text || text.length < 3) return
    setLoading(true)
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=1`
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'YardShareWeb103/1.0 (codepath project)'
        }
      })
      if (!res.ok) throw new Error('Geocode failed')
      const results = await res.json()
      if (results && results.length > 0) {
        const { lat, lon } = results[0]
        const latitude = parseFloat(lat)
        const longitude = parseFloat(lon)
        onChange?.({ address: text, latitude, longitude })
        if (mapInstance.current) {
          mapInstance.current.setView([latitude, longitude], 12)
          setMarker(latitude, longitude)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }



  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm text-gray-700 mb-1">Location (city, neighborhood, or address)</label>
        <input
          value={value?.address || ''}
          onChange={(e) => onChange?.({ ...value, address: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
            }
          }}
          placeholder="e.g., Orlando, FL or 123 Main St"
          className="w-full border rounded px-3 py-2"
        />
        {loading && <div className="text-sm text-gray-500 mt-1">Finding location…</div>}
      </div>

      <div ref={mapRef} className="h-64 w-full rounded overflow-hidden border" />


    </div>
  )
}
