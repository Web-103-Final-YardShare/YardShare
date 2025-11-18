import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from './Layout'
import { LoadingSpinner } from './LoadingSpinner'
import { MapView } from './MapView'
import { ItemCard } from './ItemCard'
import { ItemDetailModal } from './ItemDetailPage'
import { Heart, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { getPrimaryPhotoUrl } from '../utils/photoHelpers'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Reusable listing content component
export function ListingDetailContent({ listingId, isAuthenticated, user, asModal = false, onClose = null }) {
  const navigate = useNavigate()
  const [listing, setListing] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isListingSaved, setIsListingSaved] = useState(false)
  const [savedItems, setSavedItems] = useState(new Set())
  const [selectedItemId, setSelectedItemId] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        // Fetch listing
        const listingRes = await fetch(`${API_BASE}/api/listings/${listingId}`, { credentials: 'include' })
        const listingData = await listingRes.json()
        if (!listingRes.ok) throw new Error(listingData?.error || 'Failed to load')
        setListing(listingData)

        // Check if listing is saved
        if (isAuthenticated) {
          const favRes = await fetch(`${API_BASE}/api/favorites`, { credentials: 'include' })
          if (favRes.ok) {
            const favData = await favRes.json()
            setIsListingSaved(favData.some(f => f.id === parseInt(listingId)))
          }
          
          // Load saved items from API
          const itemFavRes = await fetch(`${API_BASE}/api/favorites/items`, { credentials: 'include' })
          if (itemFavRes.ok) {
            const itemFavData = await itemFavRes.json()
            setSavedItems(new Set(itemFavData.map(item => item.id)))
          }
        }

        // Fetch items
        const itemsRes = await fetch(`${API_BASE}/api/listings/${listingId}/items`, { credentials: 'include' })
        if (itemsRes.ok) {
          const itemsData = await itemsRes.json()
          setItems(itemsData)
        }
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [listingId, user, isAuthenticated])

  const handleSaveListing = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to save listings')
      return
    }
    try {
      if (isListingSaved) {
        const res = await fetch(`${API_BASE}/api/favorites/${listingId}`, {
          method: 'DELETE',
          credentials: 'include'
        })
        if (res.ok) {
          setIsListingSaved(false)
          toast.success('Listing removed from favorites')
        }
      } else {
        const res = await fetch(`${API_BASE}/api/favorites/${listingId}`, {
          method: 'POST',
          credentials: 'include'
        })
        if (res.ok) {
          setIsListingSaved(true)
          toast.success('Added to saved')
        }
      }
    } catch (e) {
      toast.error('Failed to update saved status')
    }
  }

  const handleSaveItem = async (itemId) => {
    if (!isAuthenticated) {
      toast.error('Please login to save items')
      return
    }
    try {
      if (savedItems.has(itemId)) {
        // Remove item favorite via API
        const res = await fetch(`${API_BASE}/api/favorites/items/${itemId}`, {
          method: 'DELETE',
          credentials: 'include'
        })
        if (res.ok) {
          setSavedItems(prev => {
            const next = new Set(prev)
            next.delete(itemId)
            return next
          })
          toast.success('Item removed from saved')
        } else {
          throw new Error('Failed to remove')
        }
      } else {
        // Add item favorite via API
        const res = await fetch(`${API_BASE}/api/favorites/items/${itemId}`, {
          method: 'POST',
          credentials: 'include'
        })
        if (res.ok) {
          setSavedItems(prev => {
            const next = new Set(prev)
            next.add(itemId)
            return next
          })
          toast.success('Item saved')
        } else {
          throw new Error('Failed to save')
        }
      }
    } catch (e) {
      toast.error('Failed to save item')
    }
  }

  // Force re-render every minute to update status badge in real-time
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1)
    }, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  const status = useMemo(() => {
    try {
      if (!listing?.sale_date) return 'upcoming'
      
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      // Parse the sale_date string (YYYY-MM-DD format from database)
      const [year, month, day] = listing.sale_date.split('T')[0].split('-').map(Number)
      const saleDate = new Date(year, month - 1, day)
      
      // Check if it's today
      if (saleDate.getTime() === today.getTime()) {
        // Parse start and end times
        if (listing.start_time && listing.end_time) {
          const [startHour, startMin] = listing.start_time.split(':').map(Number)
          const [endHour, endMin] = listing.end_time.split(':').map(Number)
          
          const currentHour = now.getHours()
          const currentMin = now.getMinutes()
          const currentTime = currentHour * 60 + currentMin
          const startTime = startHour * 60 + startMin
          const endTime = endHour * 60 + endMin
          
          if (currentTime >= startTime && currentTime <= endTime) {
            return 'now'
          } else if (currentTime > endTime) {
            return 'ended'
          }
        }
        return 'today' // Event is today (either before start time or no time specified)
      } else if (saleDate < today) {
        return 'ended'
      }
      
      return 'upcoming'
    } catch (e) { 
      return 'upcoming'
    }
  }, [listing?.sale_date, listing?.start_time, listing?.end_time, tick])

  const formatDate = () => {
    if (!listing?.sale_date) return ''
    try {
      const [year, month, day] = listing.sale_date.split('T')[0].split('-').map(Number)
      const date = new Date(year, month - 1, day)
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      if (date.getTime() === today.getTime()) return 'Today'
      return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    } catch (e) {
      return ''
    }
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    const [hh, mm] = timeStr.split(':')
    let hour = parseInt(hh)
    const am = hour < 12
    if (hour === 0) hour = 12
    if (hour > 12) hour -= 12
    return `${hour}${am ? 'am' : 'pm'}`
  }

  if (loading) {
    if (asModal) {
      return <div className="p-8"><LoadingSpinner text="Loading listing..." /></div>
    }
    return <div className="py-12"><LoadingSpinner text="Loading listing..." /></div>
  }

  if (error || !listing) {
    if (asModal) {
      return <div className="p-8 text-center text-red-600">{error || 'Listing not found'}</div>
    }
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <p className="text-red-600">{error || 'Listing not found'}</p>
        <button onClick={() => navigate('/')} className="mt-4 text-emerald-600 hover:underline">← Back to listings</button>
      </div>
    )
  }

  // Use photo helper to handle both legacy and new photo formats
  const photoUrl = getPrimaryPhotoUrl(
    listing.photos,
    listing.image_url || 'https://placehold.co/800x400?text=No+Image'
  )

  return (
    <>
      {asModal && onClose && (
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold">{listing.title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
      <div className={asModal ? "p-6" : "max-w-4xl mx-auto px-6 py-8"}>
        {!asModal && (
          <button onClick={() => navigate('/')} className="text-emerald-600 hover:underline mb-4">← Back to listings</button>
        )}
        
        <div className="bg-white rounded-lg border overflow-hidden">
          {/* Header Image */}
          <div className="relative h-64">
            <img src={photoUrl} alt={listing.title} className="w-full h-full object-cover" />
            <button
              onClick={handleSaveListing}
              className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors"
              title={isListingSaved ? 'Remove from saved' : 'Save listing'}
            >
              <Heart className={`w-6 h-6 ${
                isListingSaved ? 'fill-red-500 text-red-500' : 'text-gray-400'
              }`} />
            </button>
            <span className={`absolute top-4 left-4 text-xs font-bold px-3 py-1.5 rounded ${
              status === 'now' ? 'bg-emerald-500 text-white' : status === 'ended' ? 'bg-red-500 text-white' : status === 'today' ? 'bg-blue-500 text-white' : 'bg-gray-400 text-white'
            }`}>
              {status === 'now' ? '● HAPPENING NOW' : status === 'ended' ? 'ENDED' : status === 'today' ? 'TODAY' : 'UPCOMING'}
            </span>
          </div>

          {/* Content */}
          <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{listing.title}</h1>
            <p className="text-gray-600 mb-4">{listing.location}</p>
            
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
              <span>📅 {formatDate()}</span>
              {listing.start_time && listing.end_time && (
                <>
                  <span>•</span>
                  <span>🕐 {formatTime(listing.start_time)} - {formatTime(listing.end_time)}</span>
                </>
              )}
              <span>•</span>
              <span>📦 {listing.item_count || items.length} items</span>
            </div>

            {listing.description && (
              <p className="text-gray-700 mb-6">{listing.description}</p>
            )}

            {/* Hosted By */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Hosted by</h3>
              <div className="flex items-center gap-3">
                <img
                  src={listing.seller_avatar || 'https://i.pravatar.cc/40'}
                  alt={listing.seller_username}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="font-medium">{listing.seller_username}</p>
                  <button className="text-sm text-emerald-600 hover:underline">Message Seller</button>
                </div>
              </div>
            </div>

            {/* Location Map */}
            {listing.latitude && listing.longitude && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4">Location</h2>
                <div className="rounded-lg overflow-hidden border h-64">
                  <MapView 
                    location={{ lat: listing.latitude, lng: listing.longitude }} 
                    searchQuery="" 
                    radiusMiles={0.5}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">📍 {listing.location}</p>
              </div>
            )}

            {/* Items for Sale */}
            {items.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Items for Sale</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {items.map(item => (
                    <ItemCard 
                      key={item.id}
                      item={item}
                      isSaved={savedItems.has(item.id)}
                      onSave={handleSaveItem}
                      onItemClick={setSelectedItemId}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Item Detail Modal */}
        <ItemDetailModal
          itemId={selectedItemId}
          isOpen={selectedItemId !== null}
          onClose={() => setSelectedItemId(null)}
          isAuthenticated={isAuthenticated}
          onFavoriteChange={() => {
            // Refetch listing to update item favorite states
            fetch(`${API_BASE}/api/listings/${listingId}`, { credentials: 'include' })
              .then(res => res.json())
              .then(data => setListing(data))
              .catch(() => {})
          }}
        />
      </div>
    </>
  )
}

// Page wrapper component
export function ListingDetailPage({ isAuthenticated, user, favoritesCount, onLogout }) {
  const { id } = useParams()
  
  return (
    <Layout isAuthenticated={isAuthenticated} user={user} favoritesCount={favoritesCount} onLogout={onLogout}>
      <ListingDetailContent listingId={id} isAuthenticated={isAuthenticated} user={user} />
    </Layout>
  )
}
