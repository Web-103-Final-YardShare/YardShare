const pool = require('../db/pool')

// GET user's favorites
const getUserListingFavorites = async (req, res) => {
  try {
    const user_id = req.user ? req.user.id : null
    if (!user_id) {
      return res.status(401).json({ error: 'Must be logged in' })
    }

    const results = await pool.query(`
      SELECT
        l.*,
        u.username as seller_username,
        f.favorited_at,
        COALESCE(
          json_agg(
            json_build_object('id', lp.id, 'url', lp.url, 'is_primary', lp.is_primary, 'position', lp.position)
            ORDER BY lp.position
          ) FILTER (WHERE lp.id IS NOT NULL),
          '[]'::json
        ) as photos
      FROM listing_favorites f
      JOIN listings l ON f.listing_id = l.id
      LEFT JOIN users u ON l.seller_id = u.id
      LEFT JOIN listing_photos lp ON l.id = lp.listing_id
      WHERE f.user_id = $1
      GROUP BY l.id, u.username, f.favorited_at
      ORDER BY f.favorited_at DESC
    `, [user_id])

    res.status(200).json(results.rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// POST add favorite
const addFavorite = async (req, res) => {
  try {
    const user_id = req.user ? req.user.id : null
    if (!user_id) {
      return res.status(401).json({ error: 'Must be logged in' })
    }
    
    const listing_id = parseInt(req.params.listingId)
    
    // Check if already favorited
    const existing = await pool.query(
      'SELECT * FROM listing_favorites WHERE user_id = $1 AND listing_id = $2',
      [user_id, listing_id]
    )

    if (existing.rows.length > 0) {
      return res.status(200).json(existing.rows[0])
    }

    const results = await pool.query(
      'INSERT INTO listing_favorites (user_id, listing_id, favorited_at) VALUES ($1, $2, NOW()) RETURNING *',
      [user_id, listing_id]
    )
    
    res.status(201).json(results.rows[0])
  } catch (error) {
    res.status(409).json({ error: error.message })
  }
}

// DELETE remove favorite
const removeFavorite = async (req, res) => {
  try {
    const user_id = req.user ? req.user.id : null
    if (!user_id) {
      return res.status(401).json({ error: 'Must be logged in' })
    }
    
    const listing_id = parseInt(req.params.listingId)

    await pool.query(
      'DELETE FROM listing_favorites WHERE user_id = $1 AND listing_id = $2',
      [user_id, listing_id]
    )

    res.status(200).json({ message: 'Favorite removed' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// GET user's saved item ids / item details
const getUserItemFavorites = async (req, res) => {
  try {
    const user_id = req.user ? req.user.id : null
    if (!user_id) return res.status(401).json({ error: 'Must be logged in' })

    const results = await pool.query(`
      SELECT
        items.*,
        listings.title as sale_title,
        listings.location as sale_location,
        c.name as category_name,
        if.favorited_at
      FROM item_favorites if
      JOIN items ON if.item_id = items.id
      JOIN listings ON items.listing_id = listings.id
      LEFT JOIN categories c ON items.category_id = c.id
      WHERE if.user_id = $1
      ORDER BY if.favorited_at DESC
    `, [user_id])

    res.status(200).json(results.rows)
  } catch (error) {
    console.error('Error in getUserItemFavorites:', error)
    res.status(500).json({ error: error.message })
  }
}

// POST add item favorite
const addItemFavorite = async (req, res) => {
  try {
    const user_id = req.user ? req.user.id : null
    if (!user_id) return res.status(401).json({ error: 'Must be logged in' })
    const itemId = parseInt(req.params.itemId)

    // Check if already favorited
    const existing = await pool.query(
      'SELECT * FROM item_favorites WHERE user_id = $1 AND item_id = $2',
      [user_id, itemId]
    )

    if (existing.rows.length > 0) {
      return res.status(200).json(existing.rows[0])
    }

    const results = await pool.query(
      'INSERT INTO item_favorites (user_id, item_id, favorited_at) VALUES ($1, $2, NOW()) RETURNING *',
      [user_id, itemId]
    )

    res.status(201).json(results.rows[0])
  } catch (error) {
    console.error('Error in addItemFavorite:', error)
    res.status(500).json({ error: error.message })
  }
}

// DELETE remove item favorite
const removeItemFavorite = async (req, res) => {
  try {
    const user_id = req.user ? req.user.id : null
    if (!user_id) return res.status(401).json({ error: 'Must be logged in' })
    const itemId = parseInt(req.params.itemId)

    await pool.query(
      'DELETE FROM item_favorites WHERE user_id = $1 AND item_id = $2',
      [user_id, itemId]
    )

    res.status(200).json({ message: 'Item favorite removed' })
  } catch (error) {
    console.error('Error in removeItemFavorite:', error)
    res.status(500).json({ error: error.message })
  }
}

module.exports = {
  getUserListingFavorites,
  addFavorite,
  removeFavorite,
  getUserItemFavorites,
  addItemFavorite,
  removeItemFavorite
}
