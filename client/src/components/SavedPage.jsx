import { Layout } from './Layout'
import { useEffect, useState } from 'react'
import { Heart, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { LoadingSpinner } from './LoadingSpinner'
import { ItemCard } from './ItemCard'
import { ItemDetailModal } from './ItemDetailPage'
import { ListingDetailContent } from './ListingDetailPage'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function ListingDetailModal({ listingId, isOpen, onClose, isAuthenticated, user, onUnsave }) {
  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <ListingDetailContent 
              listingId={listingId}
              isAuthenticated={isAuthenticated}
              user={user}
              asModal={true}
              onClose={onClose}
            />
          </div>
        </div>
      </div>
    </>
  )
}

export function SavedPage({ isAuthenticated, user, favorites, savedItemsCount = 0, onLogout }) {
  const [savedListings, setSavedListings] = useState([])
  const [savedItems, setSavedItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedItemId, setSelectedItemId] = useState(null)
  const [selectedListingId, setSelectedListingId] = useState(null)

  useEffect(() => {
    document.title = 'Saved Items - YardSaleApp'
    loadSavedData()
  }, [])

  const loadSavedData = async () => {
    try {
      // Load saved listings
      const listingsRes = await fetch(`${API_BASE}/api/favorites`, {
        credentials: 'include'
      })
      if (listingsRes.ok) {
        const data = await listingsRes.json()
        setSavedListings(data)
      }
      
      // Load saved items
      const itemsRes = await fetch(`${API_BASE}/api/favorites/items`, {
        credentials: 'include'
      })
      if (itemsRes.ok) {
        const itemsData = await itemsRes.json()
        setSavedItems(itemsData)
      }
    } catch (error) {
      console.error('Failed to load saved data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUnsaveListing = async (listingId) => {
    try {
      const res = await fetch(`${API_BASE}/api/favorites/${listingId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (res.ok) {
        setSavedListings(prev => prev.filter(l => l.id !== listingId))
        toast.success('Listing removed from favorites')
      } else {
        throw new Error('Failed to remove')
      }
    } catch (error) {
      toast.error('Failed to remove favorite')
      console.error('Failed to remove favorite:', error)
    }
  }

  const handleUnsaveItem = async (itemId) => {
    try {
      const res = await fetch(`${API_BASE}/api/favorites/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (res.ok) {
        setSavedItems(prev => prev.filter(i => i.id !== itemId))
        toast.success('Item removed from favorites')
      } else {
        throw new Error('Failed to remove')
      }
    } catch (error) {
      toast.error('Failed to remove favorite')
      console.error('Failed to remove favorite:', error)
    }
  }

  const getPrimaryPhoto = (listing) => {
    const photos = listing.photos || []
    // photos is an array of URL strings
    if (Array.isArray(photos) && photos.length > 0) {
      return photos[0]
    }
    return listing.image_url || 'https://placehold.co/400x300?text=No+Image'
  }

  const formatPrice = (value) => {
    const num = typeof value === 'number' ? value : parseFloat(value)
    if (Number.isFinite(num) && num > 0) return num.toFixed(2)
    return null
  }

  return (
    <Layout isAuthenticated={isAuthenticated} user={user} favoritesCount={(favorites?.length || 0) + savedItemsCount} onLogout={onLogout}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">Saved Favorites</h1>
        
        {loading ? (
          <LoadingSpinner text="Loading your saved items..." />
        ) : (
          <>
            {/* Saved Listings Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <span>🏘️</span>
                <span>Saved Yard Sales</span>
              </h2>
              {savedListings.length === 0 ? (
                <p className="text-gray-600 bg-gray-50 p-6 rounded-lg">
                  You haven't saved any yard sales yet. Start browsing to find great sales!
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedListings.map(listing => (
                    <div 
                      key={listing.id} 
                      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => setSelectedListingId(listing.id)}
                    >
                      <div className="relative">
                        <img 
                          src={getPrimaryPhoto(listing)} 
                          alt={listing.title}
                          className="w-full h-48 object-cover"
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUnsaveListing(listing.id); }}
                          className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-md hover:bg-gray-100"
                          title="Remove from saved"
                        >
                          <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                        </button>
                        {!listing.is_active && (
                          <div className="absolute bottom-2 left-2 bg-gray-900 text-white px-2 py-1 rounded text-sm">
                            Unavailable
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-lg mb-2">{listing.title}</h3>
                        <div className="flex items-center gap-2 text-gray-600 mb-2">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm">{listing.location}</span>
                        </div>
                        {listing.sale_date && (
                          <p className="text-sm text-gray-500">
                            {new Date(listing.sale_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Saved Items Section */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <span>🛍️</span>
                <span>Saved Items</span>
              </h2>
              {savedItems.length === 0 ? (
                <p className="text-gray-600 bg-gray-50 p-6 rounded-lg">
                  You haven't saved any items yet. Browse yard sales to find items you love!
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {savedItems.map(item => (
                    <ItemCard 
                      key={item.id}
                      item={item}
                      isSaved={true}
                      onSave={handleUnsaveItem}
                      onItemClick={setSelectedItemId}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* Item Detail Modal */}
        <ItemDetailModal 
          itemId={selectedItemId}
          isOpen={selectedItemId !== null}
          onClose={() => setSelectedItemId(null)}
          isAuthenticated={isAuthenticated}
          onFavoriteChange={() => {
            // Refetch saved items
            fetch(`${API_BASE}/api/favorites/items`, { credentials: 'include' })
              .then(res => res.json())
              .then(data => setSavedItems(data))
              .catch(() => {})
          }}
        />

        {/* Listing Detail Modal */}
        <ListingDetailModal
          listingId={selectedListingId}
          isOpen={selectedListingId !== null}
          onClose={() => setSelectedListingId(null)}
          isAuthenticated={isAuthenticated}
          user={user}
          onUnsave={handleUnsaveListing}
        />
      </div>
    </Layout>
  )
}
