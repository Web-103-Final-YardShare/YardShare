import { useNavigate } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { startConversationWithSeller } from '../../utils/messageHelpers'
import toast from 'react-hot-toast'


export function MessageSellerButton({ 
  listingId, 
  isAuthenticated, 
  disabled = false,
  variant = 'secondary',
  size = 'md',
  className = ''
}) {
  const navigate = useNavigate()

  const handleClick = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!isAuthenticated) {
      toast.error('Please login to message sellers')
      return
    }

    await startConversationWithSeller(
      listingId, 
      navigate, 
      () => toast.error('Failed to start conversation')
    )
  }

  const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variantClasses = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
    text: 'text-emerald-600 hover:text-emerald-700 hover:underline'
  }
  
  const sizeClasses = {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-5 py-3'
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || !isAuthenticated}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      <MessageCircle className={size === 'sm' ? 'size-3.5' : size === 'lg' ? 'size-5' : 'size-4'} />
      <span>Message Seller</span>
    </button>
  )
}
