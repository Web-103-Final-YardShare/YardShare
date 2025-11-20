import { MessageCircle, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

// Helper to get user info for display
const getOtherUserInfo = (conversation, currentUserId, currentUsername) => {
  const hasId = currentUserId !== undefined && currentUserId !== null
  const currId = hasId ? Number(currentUserId) : null
  const buyerId = Number(conversation.buyer_id)
  const sellerId = Number(conversation.seller_id)

  if (hasId) {
    if (buyerId === currId) {
      return { username: conversation.seller_username, avatar: conversation.seller_avatar }
    }
    if (sellerId === currId) {
      return { username: conversation.buyer_username, avatar: conversation.buyer_avatar }
    }
  }

  if (currentUsername) {
    if (conversation.buyer_username === currentUsername) {
      return { username: conversation.seller_username, avatar: conversation.seller_avatar }
    }
    if (conversation.seller_username === currentUsername) {
      return { username: conversation.buyer_username, avatar: conversation.buyer_avatar }
    }
  }

  return { username: conversation.seller_username, avatar: conversation.seller_avatar }
}

// Individual conversation item component
function ConversationItem({ conversation, isSelected, onSelect, currentUserId, currentUsername, onDelete }) {
  const otherUser = getOtherUserInfo(conversation, currentUserId, currentUsername)
  const lastMsg = conversation.last_message
  const hasUnread = conversation.unread_count > 0

  const handleDelete = async (e) => {
    e.stopPropagation()
    if (!confirm(`Hide conversation with ${otherUser.username}?`)) return
    
    try {
      await onDelete(conversation.id)
      toast.success('Conversation hidden')
    } catch {
      toast.error('Failed to delete conversation')
    }
  }

  return (
    <div
      className={`relative group w-full p-4 text-left hover:bg-gray-50 transition-colors ${
        isSelected ? 'bg-emerald-50 border-l-4 border-emerald-600' : ''
      }`}
    >
      <button
        onClick={() => onSelect(conversation.id)}
        className="w-full text-left"
      >
        <div className="flex items-start gap-3">
          <img
            src={otherUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.username)}&background=random`}
            alt={otherUser.username}
            className="size-12 rounded-full object-cover shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className={`font-semibold text-gray-900 ${hasUnread ? 'font-bold' : ''}`}>
                {otherUser.username}
              </span>
              {hasUnread && (
                <span className="bg-emerald-600 text-white text-xs font-bold rounded-full size-5 flex items-center justify-center">
                  {conversation.unread_count}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 truncate mb-1">{conversation.listing_title}</p>
            {lastMsg && (
              <p className={`text-sm truncate ${hasUnread ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                {Number(lastMsg.sender_id) === Number(currentUserId) ? 'You: ' : ''}
                {lastMsg.body}
              </p>
            )}
          </div>
        </div>
      </button>
      
      {/* Delete button - shows on hover */}
      <button
        onClick={handleDelete}
        className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Hide conversation"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}

// Empty state component
function EmptyConversations() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
      <MessageCircle className="size-12 mb-3 opacity-50" />
      <p className="text-center font-medium">No conversations yet</p>
      <p className="text-sm text-center mt-2">
        Start a conversation by clicking "Message Seller" on any listing
      </p>
    </div>
  )
}

// Main conversations list component
export function ConversationsList({ conversations, selectedId, onSelect, currentUserId, currentUsername, onDelete }) {
  if (!conversations || conversations.length === 0) {
    return <EmptyConversations />
  }

  return (
    <div className="divide-y divide-gray-200">
      {conversations.map((conv) => (
        <ConversationItem
          key={conv.id}
          conversation={conv}
          isSelected={conv.id === selectedId}
          onSelect={onSelect}
          currentUserId={currentUserId}
          currentUsername={currentUsername}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
