const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Get all conversations for current user
export async function getConversations() {
  const res = await fetch(`${API_BASE}/api/messages/conversations`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`Failed to fetch conversations: ${res.status}`)
  return res.json()
}

// Create or get existing conversation for a listing
export async function getOrCreateConversation(listingId) {
  const res = await fetch(`${API_BASE}/api/messages/conversations`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listing_id: listingId }),
  })
  if (!res.ok) throw new Error(`Failed to create conversation: ${res.status}`)
  return res.json()
}

// Get all messages in a conversation
export async function getMessages(conversationId) {
  const res = await fetch(`${API_BASE}/api/messages/conversations/${conversationId}/messages`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`Failed to fetch messages: ${res.status}`)
  return res.json()
}

// Send a new message in a conversation
export async function sendMessage(conversationId, body) {
  const res = await fetch(`${API_BASE}/api/messages/conversations/${conversationId}/messages`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  })
  if (!res.ok) throw new Error(`Failed to send message: ${res.status}`)
  return res.json()
}

// Delete a conversation
export async function deleteConversation(conversationId) {
  const res = await fetch(`${API_BASE}/api/messages/conversations/${conversationId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`Failed to delete conversation: ${res.status}`)
  return res.json()
}
