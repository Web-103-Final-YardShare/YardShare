const pool = require('../db/pool')

// GET current user's profile
const getUserProfile = async (req, res) => {
  try {
    const user_id = req.user ? req.user.id : null
    if (!user_id) {
      return res.status(401).json({ error: 'Must be logged in' })
    }

    const results = await pool.query(`
      SELECT
        u.id,
        u.username,
        u.avatarurl,
        u.created_at,
        up.bio,
        up.phone,
        up.preferred_contact
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = $1
    `, [user_id])

    if (results.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.status(200).json(results.rows[0])
  } catch (error) {
    console.error('Error in getUserProfile:', error)
    res.status(500).json({ error: error.message })
  }
}

// PUT update current user's profile
const updateUserProfile = async (req, res) => {
  try {
    const user_id = req.user ? req.user.id : null
    if (!user_id) {
      return res.status(401).json({ error: 'Must be logged in' })
    }

    const { bio, phone, preferred_contact } = req.body

    // Check if profile exists
    const existing = await pool.query(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [user_id]
    )

    let results
    if (existing.rows.length > 0) {
      // Update existing profile
      results = await pool.query(`
        UPDATE user_profiles
        SET bio = $1, phone = $2, preferred_contact = $3, updated_at = NOW()
        WHERE user_id = $4
        RETURNING *
      `, [bio || null, phone || null, preferred_contact || 'email', user_id])
    } else {
      // Create new profile
      results = await pool.query(`
        INSERT INTO user_profiles (user_id, bio, phone, preferred_contact)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [user_id, bio || null, phone || null, preferred_contact || 'email'])
    }

    res.status(200).json(results.rows[0])
  } catch (error) {
    console.error('Error in updateUserProfile:', error)
    res.status(500).json({ error: error.message })
  }
}

// GET public user profile by username (for viewing other users)
const getPublicProfile = async (req, res) => {
  try {
    const { username } = req.params

    const results = await pool.query(`
      SELECT
        u.id,
        u.username,
        u.avatarurl,
        u.created_at,
        up.bio,
        up.preferred_contact,
        COUNT(DISTINCT l.id) as listing_count
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN listings l ON u.id = l.seller_id AND l.status != 'cancelled'
      WHERE u.username = $1
      GROUP BY u.id, u.username, u.avatarurl, u.created_at, up.bio, up.preferred_contact
    `, [username])

    if (results.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Don't expose phone number in public profile
    const profile = results.rows[0]
    delete profile.phone

    res.status(200).json(profile)
  } catch (error) {
    console.error('Error in getPublicProfile:', error)
    res.status(500).json({ error: error.message })
  }
}

module.exports = {
  getUserProfile,
  updateUserProfile,
  getPublicProfile
}
