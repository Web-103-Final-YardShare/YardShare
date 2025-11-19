import { getOrCreateConversation } from '../services/messagesApi'

export async function startConversationWithSeller(listingId, navigate, onError = console.error) {
  try {
    const conversation = await getOrCreateConversation(listingId)
    navigate(`/messages?conversation=${conversation.id}`)
  } catch (error) {
    onError(error)
  }
}

export function canMessageSeller(user, sellerUsername) {
  return user && user.username !== sellerUsername
}
