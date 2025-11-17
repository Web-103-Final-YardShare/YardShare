import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from './Layout'
import { LoadingSpinner } from './LoadingSpinner'
import { MapView } from './MapView'
import { Heart } from 'lucide-react'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function ListingDetailPage({ isAuthenticated, user, favoritesCount, onLogout }) {
  const { id } = useParams()
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
  const [savedItems, setSavedItems] = useState(new Set())

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        // Fetch listing
        const listingRes = await fetch(`${API_BASE}/api/listings/${id}`, { credentials: 'include' })
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
            setIsListingSaved(favData.some(f => f.id === parseInt(id)))
          }
        }

        // Fetch items
        const itemsRes = await fetch(`${API_BASE}/api/listings/${id}/items`, { credentials: 'include' })
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
  }, [id, user])

  const handleCheckIn = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to check in')
      return
    }
    setChecking(true)
    try {
      if (isCheckedIn) {
        const res = await fetch(`${API_BASE}/api/listings/${id}/checkin`, {
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
      } else {
        const res = await fetch(`${API_BASE}/api/listings/${id}/checkin`, {
          method: 'POST',
          credentials: 'include'
        })
        if (res.ok) {
          setIsCheckedIn(true)
          setCheckInCount(prev => prev + 1)
          if (user) {
            setCheckedInUsers(prev => [
              { id: Date.now(), username: user.username, avatarurl: user.avatar_url },
              ...prev
            ])
          }
          toast.success('Checked in!')
        }
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
        const res = await fetch(`${API_BASE}/api/favorites/${id}`, {
          method: 'DELETE',
          credentials: 'include'
        })
        if (res.ok) {
          setIsListingSaved(false)
          toast.success('Removed from saved')
        }
      } else {
        const res = await fetch(`${API_BASE}/api/favorites/${id}`, {
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
        // TODO: Implement item-specific favorites API endpoint
        setSavedItems(prev => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
        toast.success('Item removed from saved')
      } else {
        // TODO: Implement item-specific favorites API endpoint
        setSavedItems(prev => new Set(prev).add(itemId))
        toast.success('Item saved')
      }
    } catch (e) {
      toast.error('Failed to save item')
    }
  }

  const getStatus = () => {
    if (!listing?.sale_date) return 'upcoming'
    try {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const [year, month, day] = listing.sale_date.split('T')[0].split('-').map(Number)
      const saleDate = new Date(year, month - 1, day)
      
      if (saleDate.getTime() === today.getTime()) {
        if (listing.start_time && listing.end_time) {
          const [startHour, startMin] = listing.start_time.split(':').map(Number)
          const [endHour, endMin] = listing.end_time.split(':').map(Number)
          const currentHour = now.getHours()
          const currentMin = now.getMinutes()
          const currentTime = currentHour * 60 + currentMin
          const startTime = startHour * 60 + startMin
          const endTime = endHour * 60 + endMin
          
          if (currentTime >= startTime && currentTime <= endTime) return 'now'
          if (currentTime > endTime) return 'ended'
        }
        return 'now'
      }
      if (saleDate < today) return 'ended'
      return 'upcoming'
    } catch (e) {
      return 'upcoming'
    }
  }

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
    return (
      <Layout isAuthenticated={isAuthenticated} user={user} favoritesCount={favoritesCount} onLogout={onLogout}>
        <div className="py-12">
          <LoadingSpinner text="Loading listing..." />
        </div>
      </Layout>
    )
  }

  if (error || !listing) {
    return (
      <Layout isAuthenticated={isAuthenticated} user={user} favoritesCount={favoritesCount} onLogout={onLogout}>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <p className="text-red-600">{error || 'Listing not found'}</p>
          <button onClick={() => navigate('/')} className="mt-4 text-emerald-600 hover:underline">← Back to listings</button>
        </div>
      </Layout>
    )
  }

  const status = getStatus()
  const photoUrl = listing.photos?.[0]?.url || listing.image_url || 'https://via.placeholder.com/800x400?text=Yard+Sale'

  return (
    <Layout isAuthenticated={isAuthenticated} user={user} favoritesCount={favoritesCount} onLogout={onLogout}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <button onClick={() => navigate('/')} className="text-emerald-600 hover:underline mb-4">← Back to listings</button>
        
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
              status === 'now' ? 'bg-emerald-500 text-white' : status === 'ended' ? 'bg-red-500 text-white' : 'bg-gray-400 text-white'
            }`}>
              {status === 'now' ? '● HAPPENING NOW' : status === 'ended' ? 'ENDED' : 'UPCOMING'}
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
                    <div key={item.id} className="border rounded-lg overflow-hidden hover:shadow-md transition">
                      {item.image_url && (
                        <img src={item.image_url} alt={item.title} className="w-full h-40 object-cover" />
                      )}
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold">{item.title}</h3>
                          <span className="text-emerald-600 font-bold">${item.price}</span>
                        </div>
                        <div className="flex gap-2 mb-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            item.condition === 'excellent' ? 'bg-green-100 text-green-700' :
                            item.condition === 'good' ? 'bg-blue-100 text-blue-700' :
                            item.condition === 'fair' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {item.condition}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">{item.description}</p>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSaveItem(item.id)
                          }}
                          className={`mt-3 w-full py-2 rounded font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                            savedItems.has(item.id)
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${
                            savedItems.has(item.id) ? 'fill-red-500' : ''
                          }`} />
                          {savedItems.has(item.id) ? 'Saved' : 'Save Item'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
