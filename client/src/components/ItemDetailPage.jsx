import { useEffect, useState } from 'react'
import { MapPin, X, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { LoadingSpinner } from './shared/LoadingSpinner'
import { getPrimaryPhotoUrl } from '../utils/photoHelpers'
import { FavoriteButton } from './shared/FavoriteButton'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function ItemDetailModal({ itemId, isOpen, onClose, isAuthenticated, onFavoriteChange }) {
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    if (!isOpen || !itemId) return

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        // Fetch item details
        const itemRes = await fetch(`${API_BASE}/api/items/${itemId}`, { credentials: 'include' })
        const itemData = await itemRes.json()
        if (!itemRes.ok) throw new Error(itemData?.error || 'Failed to load item')
        setItem(itemData)

        // Check if item is saved
        if (isAuthenticated) {
          const favRes = await fetch(`${API_BASE}/api/favorites/items`, { credentials: 'include' })
          if (favRes.ok) {
            const favData = await favRes.json()
            setIsSaved(favData.some(f => f.id === parseInt(itemId)))
          }
        }
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [itemId, isAuthenticated, isOpen])

  const handleSave = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to save items')
      return
    }
    try {
      if (isSaved) {
        const res = await fetch(`${API_BASE}/api/favorites/items/${itemId}`, {
          method: 'DELETE',
          credentials: 'include'
        })
        if (res.ok) {
          setIsSaved(false)
          toast.success('Item removed from saved')
          onFavoriteChange?.()
        }
      } else {
        const res = await fetch(`${API_BASE}/api/favorites/items/${itemId}`, {
          method: 'POST',
          credentials: 'include'
        })
        if (res.ok) {
          setIsSaved(true)
          toast.success('Item saved')
          onFavoriteChange?.()
        }
      }
    } catch {
      toast.error('Failed to update saved status')
    }
  }

  const getCategoryEmoji = (category) => {
    const map = {
      'Furniture': '🪑',
      'Electronics': '📱',
      'Books': '📚',
      'Tools': '🔧',
      'Clothing': '👕',
      'Toys & Games': '🧸',
      'Kitchen': '🍳',
      'Sports & Outdoors': '⚽',
      'Home & Garden': '🌿',
      'Other': '📦'
    }
    return map[category] || '📦'
  }

  const getConditionColor = (condition) => {
    switch (condition) {
      case 'excellent':
        return 'bg-green-100 text-green-700 border-green-300'
      case 'good':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'fair':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity"
        onClick={onClose}
      />      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 z-10"
            title="Close"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>

          {loading ? (
            <div className="py-12">
              <LoadingSpinner text="Loading item details..." />
            </div>
          ) : error || !item ? (
            <div className="p-8 text-center">
              <p className="text-red-600 text-lg mb-4">{error || 'Item not found'}</p>
              <button
                onClick={onClose}
                className="text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Close
              </button>
            </div>
          ) : (
            <>

              <div className="grid md:grid-cols-2 gap-0">
                {/* Image Section */}
                <div className="relative bg-gray-100">
                  <div className="h-96 md:h-full md:min-h-[500px]">
                    <img
                      src={getPrimaryPhotoUrl(item.photos, item.image_url || 'https://placehold.co/600x600?text=No+Image')}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://placehold.co/600x600?text=No+Image'
                      }}
                    />
                  </div>
                  {item.sold && (
                    <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                      <span className="bg-red-600 text-white px-8 py-4 rounded-lg font-bold text-2xl">
                        SOLD
                      </span>
                    </div>
                  )}
                </div>

                {/* Details Section */}
                <div className="p-6 md:p-8 flex flex-col">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{item.title}</h1>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <span className="text-3xl md:text-4xl font-bold text-emerald-600">
                      ${parseFloat(item.price).toFixed(2)}
                    </span>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {(() => {
                      const category = item.category_name || null
                      return (
                        <>
                          {category && (
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-800 rounded-lg border border-gray-300 font-medium text-sm">
                              <span className="text-xl">{getCategoryEmoji(category)}</span>
                              <span>{category}</span>
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-medium text-sm ${getConditionColor(item.condition)}`}>
                            {category && <span className="text-xl">{getCategoryEmoji(category)}</span>}
                            <span>{item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}</span>
                          </span>
                        </>
                      )
                    })()}
                  </div>

                  {/* Description */}
                  {item.description && (
                    <div className="mb-6 grow">
                      <h2 className="text-lg font-semibold text-gray-900 mb-2">Description</h2>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{item.description}</p>
                    </div>
                  )}

                  {/* Sale Location Info */}
                  {(item.sale_title || item.sale_location) && (
                    <div className="border-t pt-4 mt-auto">
                      <h2 className="text-base font-semibold text-gray-900 mb-2">Yard Sale Information</h2>
                      {item.sale_title && (
                        <p className="text-gray-700 text-sm mb-1">
                          <span className="font-medium">Sale:</span> {item.sale_title}
                        </p>
                      )}
                      {item.sale_location && (
                        <div className="flex items-start gap-2 text-gray-700 text-sm mb-3">
                          <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{item.sale_location}</span>
                        </div>
                      )}
                      {item.listing_id && (
                        <button
                          onClick={() => {
                            onClose()
                            navigate(`/listings/${item.listing_id}`)
                          }}
                          className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>View Full Yard Sale</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="mt-6 pt-4 border-t">
                    <FavoriteButton
                      type="item"
                      id={itemId}
                      isSaved={isSaved}
                      onToggle={handleSave}
                      isAuthenticated={isAuthenticated}
                      disabled={item.sold}
                      label={item.sold ? 'Item Sold' : (isSaved ? 'Saved to Favorites' : 'Save to Favorites')}
                      className="w-full py-3 rounded-lg font-bold"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
