import { Layout } from './Layout'
import { useEffect, useState } from 'react'
import { Heart, MapPin, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import { LoadingSpinner } from './LoadingSpinner'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function SavedPage({ isAuthenticated, user, favorites, onLogout }) {
  const [savedListings, setSavedListings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Saved Items - YardSaleApp'
    loadSavedListings()
  }, [])

  const loadSavedListings = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/favorites`, {
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        const parsed = data.map(item => ({
          ...item,
          photos: typeof item.photos === 'string' ? JSON.parse(item.photos) : item.photos
        }))
        setSavedListings(parsed)
      }
    } catch (error) {
      console.error('Failed to load saved listings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUnsave = async (listingId) => {
    try {
      const res = await fetch(`${API_BASE}/api/favorites/${listingId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (res.ok) {
        setSavedListings(prev => prev.filter(l => l.id !== listingId))
        toast.success('Removed from favorites')
      } else {
        throw new Error('Failed to remove')
      }
    } catch (error) {
      toast.error('Failed to remove favorite')
      console.error('Failed to remove favorite:', error)
    }
  }

  const getPrimaryPhoto = (listing) => {
    if (!listing.photos || listing.photos.length === 0) {
      return listing.image_url || 'https://via.placeholder.com/400x300?text=No+Image'
    }
    const primary = listing.photos.find(p => p.is_primary)
    const photo = primary || listing.photos[0]
    if (photo.url.startsWith('/api/')) {
      return `${API_BASE}${photo.url}`
    }
    return photo.url || 'https://via.placeholder.com/400x300?text=No+Image'
  }

  const formatPrice = (value) => {
    const num = typeof value === 'number' ? value : parseFloat(value)
    if (Number.isFinite(num) && num > 0) return num.toFixed(2)
    return null
  }

  return (
    <Layout isAuthenticated={isAuthenticated} user={user} favoritesCount={favorites?.length || 0} onLogout={onLogout}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl mb-4">Saved Yard Sales</h1>
        {loading ? (
          <LoadingSpinner text="Loading your saved items..." />
        ) : savedListings.length === 0 ? (
          <p className="text-gray-600">You haven't saved any yard sales yet. Start browsing to find great deals!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedListings.map(listing => (
              <div key={listing.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <img 
                    src={getPrimaryPhoto(listing)} 
                    alt={listing.title}
                    className="w-full h-48 object-cover"
                  />
                  <button
                    onClick={() => handleUnsave(listing.id)}
                    className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-md hover:bg-gray-100"
                    title="Remove from saved"
                  >
                    <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                  </button>
                  {!listing.is_available && (
                    <div className="absolute bottom-2 left-2 bg-gray-900 text-white px-2 py-1 rounded text-sm">
                      Unavailable
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2">{listing.title}</h3>
                  <p className="text-gray-600 text-sm mb-2 line-clamp-2">{listing.description}</p>
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <MapPin className="w-4 h-4 mr-1" />
                    {listing.location || 'No location specified'}
                  </div>
                  {formatPrice(listing.price) && (
                    <div className="flex items-center text-emerald-600 font-semibold">
                      <DollarSign className="w-4 h-4" />
                      {formatPrice(listing.price)}
                    </div>
                  )}
                  {listing.category_name && (
                    <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {listing.category_name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
