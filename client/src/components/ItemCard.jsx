import { getPrimaryPhotoUrl } from '../utils/photoHelpers'
import { FavoriteButton } from './FavoriteButton'

export function ItemCard({ item, isSaved, onSave, onItemClick }) {

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

  return (
    <div 
      onClick={() => onItemClick?.(item.id)}
      className="bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
    >
      {/* Item Image */}
      <div className="relative h-52 bg-gray-100">
        <img
          src={getPrimaryPhotoUrl(item.photos, item.image_url || 'https://placehold.co/400x300?text=No+Image')}
          alt={item.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = 'https://placehold.co/400x300?text=No+Image'
          }}
        />
        {item.sold && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-lg">SOLD</span>
          </div>
        )}
      </div>
      
      {/* Item Details */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-start gap-2 flex-1">
            <h3 className="font-bold text-lg leading-tight">{item.title}</h3>
          </div>
          <span className="text-emerald-600 font-bold text-xl whitespace-nowrap">
            ${parseFloat(item.price).toFixed(2)}
          </span>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-3 items-center">
          {/** Backend returns category_name via SQL JOIN */}
          {(() => {
            const cat = item.category_name || null
            return (
              <>
                <span className={`text-xs font-medium px-2 py-1 rounded inline-flex items-center gap-2 ${
            item.condition === 'excellent' ? 'bg-green-100 text-green-700 border border-green-300' :
            item.condition === 'good' ? 'bg-blue-100 text-blue-700 border border-blue-300' :
            item.condition === 'fair' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
            'bg-gray-100 text-gray-700 border border-gray-300'
          }`}>
                {cat ? <span className="text-lg leading-none">{getCategoryEmoji(cat)}</span> : null}
                <span>{item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}</span>
              </span>
              {cat && (
                <span className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-700 border border-gray-300">
                  {cat}
                </span>
              )}
            </>
          )})()}
        </div>
        
        {item.description && (
          <p className="text-sm text-gray-600 line-clamp-3 mb-3">{item.description}</p>
        )}

        <FavoriteButton
          type="item"
          id={item.id}
          isSaved={isSaved}
          onToggle={onSave}
          isAuthenticated={true}
          disabled={item.sold}
          label={item.sold ? 'Sold' : null}
          className="w-full py-2.5 rounded-lg font-medium text-sm"
          size="sm"
        />
      </div>
    </div>
  )
}
