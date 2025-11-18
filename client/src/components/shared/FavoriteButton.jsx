import { Heart } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Shared favorite button component for both listings and items
 * Eliminates code duplication across 6+ components
 *
 * @param {object} props
 * @param {'listing'|'item'} props.type - Type of entity being favorited
 * @param {number} props.id - ID of the listing or item
 * @param {boolean} props.isSaved - Whether this entity is currently favorited
 * @param {function} props.onToggle - Callback function to toggle favorite state
 * @param {boolean} props.isAuthenticated - Whether user is logged in
 * @param {boolean} props.disabled - Whether button should be disabled
 * @param {'sm'|'md'|'lg'} props.size - Size of the heart icon
 * @param {'button'|'icon'} props.variant - Display as full button or icon only
 * @param {string} props.className - Additional CSS classes
 */
export function FavoriteButton({
  type = 'listing',
  id,
  isSaved,
  onToggle,
  isAuthenticated,
  disabled = false,
  size = 'md',
  variant = 'button',
  className = '',
  label = null  // Custom label override
}) {
  const handleClick = async (e) => {
    e.stopPropagation()

    if (!isAuthenticated) {
      toast.error(`Please login to save ${type === 'listing' ? 'yard sales' : 'items'}`)
      return
    }

    if (disabled) return

    try {
      await onToggle(id)
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast.error('Failed to update favorites')
    }
  }

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const heartIcon = (
    <Heart
      className={`${sizeClasses[size]} ${isSaved ? 'fill-red-500 text-red-500' : ''}`}
    />
  )

  // Icon-only variant (for compact spaces)
  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 transition-colors ${className}`}
        aria-label={isSaved ? 'Remove from favorites' : 'Add to favorites'}
      >
        {heartIcon}
      </button>
    )
  }

  // Full button variant (default)
  const buttonLabel = label || (
    isSaved
      ? `Saved`
      : `Save ${type === 'listing' ? 'Listing' : 'Item'}`
  )

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 transition-colors ${
        disabled
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
          : isSaved
            ? 'bg-red-50 text-red-600 hover:bg-red-100 border-2 border-red-200'
            : 'bg-emerald-600 text-white hover:bg-emerald-700'
      } ${className}`}
    >
      {heartIcon}
      <span>{buttonLabel}</span>
    </button>
  )
}
