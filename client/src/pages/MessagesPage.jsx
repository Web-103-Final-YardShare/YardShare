import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { getConversations, deleteConversation } from '../services/messagesApi'
import { ConversationsList } from '../components/ConversationsList'
import { ChatWindow } from '../components/ChatWindow'
import { LoadingSpinner } from '../components/shared/LoadingSpinner'
import { Layout } from '../components/shared/Layout'
import toast from 'react-hot-toast'

export function MessagesPage({
  isAuthenticated,
  user,
  favoritesCount = 0,
  onLogout,
  searchQuery,
  setSearchQuery,
  location,
  setLocation,
}) {
  const [conversations, setConversations] = useState([])
  const [selectedConvId, setSelectedConvId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()

  const loadConversations = useCallback(async () => {
    try {
      const data = await getConversations()
      setConversations(data)
      
      // Check for conversation query param (e.g., from "Message Seller" button)
      const convParam = searchParams.get('conversation')
      if (convParam) {
        const convId = parseInt(convParam)
        // Verify the conversation exists in the list
        if (data.some(c => c.id === convId)) {
          setSelectedConvId(convId)
        } else {
          toast.error('Conversation not found')
          if (data.length > 0) setSelectedConvId(data[0].id)
        }
      } else if (data.length > 0 && !selectedConvId) {
        // Auto-select first conversation if no selection
        setSelectedConvId(data[0].id)
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
      toast.error('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }, [searchParams, selectedConvId])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const handleDelete = async (conversationId) => {
    await deleteConversation(conversationId)
    // If deleted conversation was selected, clear selection
    if (selectedConvId === conversationId) {
      setSelectedConvId(null)
    }
    // Reload conversations
    await loadConversations()
  }

  const selectedConversation = conversations.find(c => c.id === selectedConvId)

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
      {loading ? (
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <LoadingSpinner text="Loading messages..." />
        </div>
      ) : (
        <div className="flex h-[calc(100vh-80px)]">
          {/* Conversations Sidebar */}
          <div className="w-96 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className="size-6 text-emerald-600" />
                <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
              </div>
              <p className="text-sm text-gray-600">
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              </p>
            </div>
            <ConversationsList
              conversations={conversations}
              selectedId={selectedConvId}
              onSelect={setSelectedConvId}
              currentUserId={user?.id}
              currentUsername={user?.username}
              onDelete={handleDelete}
            />
          </div>

          {/* Chat Window */}
          <div className="flex-1 bg-gray-50">
            <ChatWindow
              conversationId={selectedConvId}
              conversation={selectedConversation}
              currentUserId={user?.id}
              currentUsername={user?.username}
              onMessagesRead={loadConversations}
            />
          </div>
        </div>
      )}
    </Layout>
  )
}
