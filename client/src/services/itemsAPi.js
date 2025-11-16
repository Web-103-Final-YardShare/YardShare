const API_URL = '/api/items'

export const itemsApi = {
  // Get single item with full details
  getItem: async (itemId) => {
    const response = await fetch(`${API_URL}/${itemId}`)
    if (!response.ok) throw new Error('Failed to fetch item')
    return response.json()
  },

  // Get all items (with optional filters)
  getItems: async (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.category) params.append('category', filters.category)
    if (filters.search) params.append('search', filters.search)
    
    const response = await fetch(`${API_URL}?${params}`)
    if (!response.ok) throw new Error('Failed to fetch items')
    return response.json()
  },

  // Get items for specific yard sale
  getItemsByListing: async (listingId) => {
    const response = await fetch(`${API_URL}/listings/${listingId}`)
    if (!response.ok) throw new Error('Failed to fetch items')
    return response.json()
  },

  // Add item to yard sale
  createItem: async (listingId, itemData) => {
    const response = await fetch(`${API_URL}/listings/${listingId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData)
    })
    if (!response.ok) throw new Error('Failed to create item')
    return response.json()
  },

  // Update item
  updateItem: async (itemId, updates) => {
    const response = await fetch(`${API_URL}/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    if (!response.ok) throw new Error('Failed to update item')
    return response.json()
  },

  // Delete item
  deleteItem: async (itemId) => {
    const response = await fetch(`${API_URL}/${itemId}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete item')
    return response.json()
  }
}