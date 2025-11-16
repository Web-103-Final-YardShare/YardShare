const pool = require('../db/pool')

// GET user's favorites
const getUserFavorites = async (req, res) => {
  try {
    const user_id = req.user ? req.user.id : null
    if (!user_id) {
      return res.status(401).json({ error: 'Must be logged in' })
    }

    const results = await pool.query(`
      SELECT l.*, u.username as seller_username, f.favorited_at
      FROM favorites f
      JOIN listings l ON f.listing_id = l.id
      LEFT JOIN users u ON l.seller_id = u.id
      WHERE f.user_id = $1
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
    
    const listing_id = parseInt(req.params.listing_id)
    
    // Check if already favorited
    const existing = await pool.query(
      'SELECT * FROM favorites WHERE user_id = $1 AND listing_id = $2',
      [user_id, listing_id]
    )
    
    if (existing.rows.length > 0) {
      return res.status(200).json(existing.rows[0])
    }
    
    const results = await pool.query(
      'INSERT INTO favorites (user_id, listing_id, favorited_at) VALUES ($1, $2, NOW()) RETURNING *',
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
    
    const listing_id = parseInt(req.params.listing_id)
    
    await pool.query(
      'DELETE FROM favorites WHERE user_id = $1 AND listing_id = $2',
      [user_id, listing_id]
    )
    
    res.status(200).json({ message: 'Favorite removed' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

module.exports = {
  getUserFavorites,
  addFavorite,
  removeFavorite
}
