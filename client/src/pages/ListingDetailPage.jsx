import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '../components/shared/Layout'
import { LoadingSpinner } from '../components/shared/LoadingSpinner'
import { MapView } from '../components/MapView'
import { ItemCard } from '../components/ItemCard'
import { ItemDetailModal } from '../components/ItemDetailPage'
import { Heart, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { getPrimaryPhotoUrl } from '../utils/photoHelpers'
import { MessageSellerButton } from '../components/shared/MessageSellerButton'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Reusable listing content component
export function ListingDetailContent({ listingId, isAuthenticated, user, asModal = false, onClose = null }) {
  const navigate = useNavigate()
  const [listing, setListing] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [checkInCount, setCheckInCount] = useState(0)
  const [checkedInUsers, setCheckedInUsers] = useState([])
  const [isListingSaved, setIsListingSaved] = useState(false)
  const [showCheckInModal, setShowCheckInModal] = useState(false)

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
        setCheckInCount(parseInt(listingData.check_in_count) || 0)
        setCheckedInUsers(listingData.checked_in_users || [])

        // Check if current user is checked in
        if (user && listingData.checked_in_users) {
          setIsCheckedIn(listingData.checked_in_users.some(u => u.username === user.username))
        }

        // Check if listing is saved
        if (isAuthenticated) {
          const favRes = await fetch(`${API_BASE}/api/favorites`, { credentials: 'include' })
          if (favRes.ok) {
            const favData = await favRes.json()
            setIsListingSaved(favData.some(f => f.id === parseInt(listingId)))
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

  const handleCheckIn = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to check in')
      return
    }

    // If checking in, show modal first
    if (!isCheckedIn) {
      setShowCheckInModal(true)
      return
    }

    // For checkout, do it directly
    setChecking(true)
    try {
      const res = await fetch(`${API_BASE}/api/listings/${listingId}/checkin`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (res.ok) {
        setIsCheckedIn(false)
        setCheckInCount(prev => Math.max(0, prev - 1))
        if (user) {
          setCheckedInUsers(prev => prev.filter(u => u.username !== user.username))
        }
        toast.success('Checked out')
      }
    } catch (e) {
      toast.error('Check-in failed')
    } finally {
      setChecking(false)
    }
  }

  const confirmCheckIn = async () => {
    setChecking(true)
    try {
      const res = await fetch(`${API_BASE}/api/listings/${listingId}/checkin`, {
        method: 'POST',
        credentials: 'include'
      })
      if (res.ok) {
        setIsCheckedIn(true)
        setCheckInCount(prev => prev + 1)
        if (user) {
          setCheckedInUsers(prev => [
            { id: Date.now(), username: user.username, avatarurl: user.avatarurl },
            ...prev
          ])
        }
        toast.success('Checked in!')
        setShowCheckInModal(false) // Close modal on success
      }
    } catch (e) {
      toast.error('Check-in failed')
    } finally {
      setChecking(false)
    }
  }

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
                <div className="flex-1">
                  <p className="font-medium">{listing.seller_username}</p>
                  {user?.username !== listing.seller_username && (
                    <MessageSellerButton
                      listingId={listingId}
                      isAuthenticated={isAuthenticated}
                      variant="text"
                      size="sm"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Who's Going */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3">Who's going?</h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex -space-x-2">
                  {checkedInUsers.slice(0, 3).map(u => (
                    <img key={u.id} src={u.avatarurl || 'https://i.pravatar.cc/40'} alt={u.username} className="w-8 h-8 rounded-full border-2 border-white" />
                  ))}
                  {checkInCount > 3 && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 text-xs flex items-center justify-center border-2 border-white">+{checkInCount - 3}</div>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {checkInCount === 0 ? 'No one yet' : `${checkInCount} ${checkInCount === 1 ? 'person' : 'people'}`}
                </p>
              </div>
              <button
                onClick={handleCheckIn}
                disabled={checking}
                className={`w-full py-2 rounded font-semibold ${
                  checking ? 'bg-gray-300 text-gray-500' : isCheckedIn ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {checking ? 'Loading...' : isCheckedIn ? 'Checked in' : 'Check in!'}
              </button>
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
                      isAuthenticated={isAuthenticated}
                      isSaved={item.is_saved}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Item Detail Modal */}
        <ItemDetailModal
          itemId={null}
          isOpen={false}
          onClose={() => {}}
          isAuthenticated={isAuthenticated}
          onFavoriteChange={() => {
            // Refetch listing to update item favorite states
            fetch(`${API_BASE}/api/listings/${listingId}`, { credentials: 'include' })
              .then(res => res.json())
              .then(data => setListing(data))
              .catch(() => {})
          }}
        />

        {/* Check-in Confirmation Modal */}
        {showCheckInModal && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowCheckInModal(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div
                className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold mb-4">Check in to this yard sale?</h3>
                <p className="text-gray-600 mb-6">
                  Let others know you're planning to attend! You can check out anytime.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCheckInModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmCheckIn}
                    disabled={checking}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {checking ? 'Checking in...' : 'Check in'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

// Page wrapper component
export function ListingDetailPage({
  isAuthenticated,
  user,
  favoritesCount,
  onLogout,
  searchQuery,
  setSearchQuery,
  location,
  setLocation
}) {
  const { id } = useParams()

  return (
    <Layout
      isAuthenticated={isAuthenticated}
      user={user}
      favoritesCount={favoritesCount}
      onLogout={onLogout}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      location={location}
      setLocation={setLocation}
    >
      <ListingDetailContent listingId={id} isAuthenticated={isAuthenticated} user={user} />
    </Layout>
  )
}
