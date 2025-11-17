const pool = require('../db/pool')

// GET single item with sale info
const getItem = async (req, res) => {
  try {
    const { itemId } = req.params
    
    const result = await pool.query(`
      SELECT 
        items.*,
        items.category as category_name,
        listings.title as sale_title,
        listings.location as sale_location,
        listings.latitude,
        listings.longitude,
        listings.sale_date,
        listings.start_time,
        listings.end_time
      FROM items
      JOIN listings ON items.listing_id = listings.id
      WHERE items.id = $1
    `, [itemId])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' })
    }
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching item:', error)
    res.status(500).json({ error: 'Server error' })
  }
}

// GET all items (for search)
const getAllItems = async (req, res) => {
  try {
    const { category, search } = req.query
    
    let query = `
      SELECT 
        items.*,
        items.category as category_name,
        listings.title as sale_title,
        listings.location as sale_location,
        listings.latitude,
        listings.longitude
      FROM items
      JOIN listings ON items.listing_id = listings.id
      WHERE items.sold = false AND listings.is_active = true
    `
    
    const params = []
    
    // Filter by category
    if (category) {
      params.push(category)
      query += ` AND items.category = $${params.length}`
    }
    
    // Search by title/description
    if (search) {
      params.push(`%${search}%`)
      query += ` AND (items.title ILIKE $${params.length} OR items.description ILIKE $${params.length})`
    }
    
    query += ` ORDER BY items.created_at DESC`
    
    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching items:', error)
    res.status(500).json({ error: 'Server error' })
  }
}

// GET items for a specific listing
const getItemsByListing = async (req, res) => {
  try {
    const { listingId } = req.params
    
    const result = await pool.query(`
      SELECT 
        items.*,
        items.category as category_name
      FROM items
      WHERE items.listing_id = $1
      ORDER BY items.display_order, items.created_at
    `, [listingId])
    
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching items for listing:', error)
    res.status(500).json({ error: 'Server error' })
  }
}

// POST new item to listing
const createItem = async (req, res) => {
  try {
    const { listingId } = req.params
    const { title, description, price, condition, category, image_url } = req.body
    
    // Validate required fields
    if (!title || !price || !condition) {
      return res.status(400).json({ error: 'Title, price, and condition are required' })
    }
    
    // Check if listing exists and user owns it
    const listingCheck = await pool.query('SELECT seller_id FROM listings WHERE id = $1', [listingId])
    if (listingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' })
    }
    
    if (req.user && listingCheck.rows[0].seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to add items to this listing' })
    }
    
    const result = await pool.query(`
      INSERT INTO items (listing_id, title, description, price, condition, category, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [listingId, title, description, price, condition, category, image_url])
    
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating item:', error)
    res.status(500).json({ error: 'Server error' })
  }
}

// PATCH update item
const updateItem = async (req, res) => {
  try {
    const { itemId } = req.params
    const { title, description, price, condition, category, image_url, sold } = req.body
    
    // Check ownership
    const ownerCheck = await pool.query(`
      SELECT listings.seller_id 
      FROM items 
      JOIN listings ON items.listing_id = listings.id 
      WHERE items.id = $1
    `, [itemId])
    
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' })
    }
    
    if (req.user && ownerCheck.rows[0].seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to edit this item' })
    }
    
    const result = await pool.query(`
      UPDATE items
      SET 
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        condition = COALESCE($4, condition),
        category = COALESCE($5, category),
        image_url = COALESCE($6, image_url),
        sold = COALESCE($7, sold)
      WHERE id = $8
      RETURNING *
    `, [title, description, price, condition, category, image_url, sold, itemId])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' })
    }
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error updating item:', error)
    res.status(500).json({ error: 'Server error' })
  }
}

// DELETE item
const deleteItem = async (req, res) => {
  try {
    const { itemId } = req.params
    
    // Check ownership
    const ownerCheck = await pool.query(`
      SELECT listings.seller_id 
      FROM items 
      JOIN listings ON items.listing_id = listings.id 
      WHERE items.id = $1
    `, [itemId])
    
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' })
    }
    
    if (req.user && ownerCheck.rows[0].seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this item' })
    }
    
    const result = await pool.query('DELETE FROM items WHERE id = $1 RETURNING *', [itemId])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' })
    }
    
    res.json({ message: 'Item deleted' })
  } catch (error) {
    console.error('Error deleting item:', error)
    res.status(500).json({ error: 'Server error' })
  }
}

module.exports = {
  getItem,
  getAllItems,
  getItemsByListing,
  createItem,
  updateItem,
  deleteItem
}