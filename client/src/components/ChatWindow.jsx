import { useState, useEffect, useRef, useCallback } from 'react'
import { Send } from 'lucide-react'
import { getMessages, sendMessage } from '../services/messagesApi'
import { LoadingSpinner } from './shared/LoadingSpinner'
import toast from 'react-hot-toast'

export function ChatWindow({ conversationId, conversation, currentUserId }) {
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Fetch messages when conversation changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      return
    }
    
    const fetchMessages = async () => {
      setLoading(true)
      try {
        const data = await getMessages(conversationId)
        setMessages(data)
        setTimeout(scrollToBottom, 100)
      } catch (error) {
        console.error('Failed to load messages:', error)
        toast.error('Failed to load messages')
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()
  }, [conversationId, scrollToBottom])

  // Auto-scroll when new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!inputText.trim() || sending) return

    const messageText = inputText.trim()
    setSending(true)
    setInputText('') // Clear input immediately for better UX

    try {
      const newMsg = await sendMessage(conversationId, messageText)
      setMessages(prev => [...prev, newMsg])
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('Failed to send message')
      setInputText(messageText) // Restore message on error
    } finally {
      setSending(false)
    }
  }

  if (!conversationId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Select a conversation to start messaging</p>
      </div>
    )
  }

  const isBuyer = conversation?.buyer_id === currentUserId
  const otherUser = isBuyer
    ? { username: conversation?.seller_username, avatar: conversation?.seller_avatar }
    : { username: conversation?.buyer_username, avatar: conversation?.buyer_avatar }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 bg-white">
        <div className="flex items-center gap-3">
          <img
            src={otherUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.username)}&background=random`}
            alt={otherUser.username}
            className="size-10 rounded-full object-cover"
          />
          <div>
            <h3 className="font-semibold text-gray-900">{otherUser.username}</h3>
            <p className="text-sm text-gray-600">{conversation?.listing_title}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner text="Loading messages..." />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.sender_id === currentUserId
            return (
              <div
                key={msg.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                    isOwnMessage
                      ? 'bg-emerald-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-900 rounded-bl-sm shadow-sm'
                  }`}
                >
                  <p className="wrap-break-word">{msg.body}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isOwnMessage ? 'text-emerald-100' : 'text-gray-500'
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-gray-200 p-4 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="bg-emerald-600 text-white p-3 rounded-full hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="size-5" />
          </button>
        </div>
      </form>
    </div>
  )
}
