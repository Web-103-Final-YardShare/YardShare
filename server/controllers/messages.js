const pool = require('../db/pool')

// Utils
const ensureParticipant = async (conversationId, userId) => {
  const r = await pool.query(
    'SELECT * FROM conversations WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)'
    , [conversationId, userId]
  )
  if (r.rows.length === 0) {
    const e = new Error('Not authorized for this conversation')
    e.status = 403
    throw e
  }
  return r.rows[0]
}

// GET /api/messages/conversations
const listConversations = async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Must be logged in' })

    const results = await pool.query(`
      SELECT
        c.*,
        l.title as listing_title,
        l.location as listing_location,
        u_b.username as buyer_username,
        u_b.avatarurl as buyer_avatar,
        u_s.username as seller_username,
        u_s.avatarurl as seller_avatar,
        -- Last message
        (
          SELECT json_build_object('id', m2.id, 'sender_id', m2.sender_id, 'body', m2.body, 'created_at', m2.created_at)
          FROM messages m2
          WHERE m2.conversation_id = c.id
          ORDER BY m2.created_at DESC
          LIMIT 1
        ) AS last_message,
        -- Unread count for this user
        (
          SELECT COUNT(*)::int FROM messages m3
          WHERE m3.conversation_id = c.id
            AND m3.sender_id <> $1
            AND m3.read_at IS NULL
        ) AS unread_count
      FROM conversations c
      JOIN listings l ON c.listing_id = l.id
      JOIN users u_b ON c.buyer_id = u_b.id
      JOIN users u_s ON c.seller_id = u_s.id
      WHERE c.buyer_id = $1 OR c.seller_id = $1
      ORDER BY COALESCE((
        SELECT MAX(m.created_at) FROM messages m WHERE m.conversation_id = c.id
      ), c.updated_at) DESC
    `, [userId])

    res.json(results.rows)
  } catch (error) {
    console.error('Error listConversations:', error)
    res.status(error.status || 500).json({ error: error.message })
  }
}

// POST /api/messages/conversations
// body: { listing_id }
const getOrCreateConversation = async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Must be logged in' })

    const { listing_id } = req.body || {}
    if (!listing_id) return res.status(400).json({ error: 'listing_id required' })

    const l = await pool.query('SELECT id, seller_id FROM listings WHERE id = $1', [listing_id])
    if (l.rows.length === 0) return res.status(404).json({ error: 'Listing not found' })

    const sellerId = l.rows[0].seller_id
    if (sellerId === userId) return res.status(400).json({ error: 'Cannot start a conversation with yourself' })

    let conv = await pool.query(
      'SELECT * FROM conversations WHERE listing_id = $1 AND buyer_id = $2 AND seller_id = $3',
      [listing_id, userId, sellerId]
    )

    if (conv.rows.length === 0) {
      conv = await pool.query(
        `INSERT INTO conversations (listing_id, buyer_id, seller_id) VALUES ($1, $2, $3) RETURNING *`,
        [listing_id, userId, sellerId]
      )
    }

    res.status(201).json(conv.rows[0])
  } catch (error) {
    console.error('Error getOrCreateConversation:', error)
    res.status(error.status || 500).json({ error: error.message })
  }
}

// GET /api/messages/conversations/:id/messages
const listMessages = async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Must be logged in' })

    const conversationId = parseInt(req.params.id)
    await ensureParticipant(conversationId, userId)

    const msgs = await pool.query(
      `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [conversationId]
    )

    // Mark messages from other user as read
    await pool.query(
      `UPDATE messages SET read_at = NOW() WHERE conversation_id = $1 AND sender_id <> $2 AND read_at IS NULL`,
      [conversationId, userId]
    )

    res.json(msgs.rows)
  } catch (error) {
    console.error('Error listMessages:', error)
    res.status(error.status || 500).json({ error: error.message })
  }
}

// POST /api/messages/conversations/:id/messages
// body: { body }
const sendMessage = async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Must be logged in' })

    const conversationId = parseInt(req.params.id)
    const { body } = req.body || {}
    if (!body || !String(body).trim()) return res.status(400).json({ error: 'Message body required' })

    await ensureParticipant(conversationId, userId)

    const r = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, body) VALUES ($1, $2, $3) RETURNING *`,
      [conversationId, userId, String(body).trim()]
    )

    // bump conversation updated_at
    await pool.query(`UPDATE conversations SET updated_at = NOW() WHERE id = $1`, [conversationId])

    res.status(201).json(r.rows[0])
  } catch (error) {
    console.error('Error sendMessage:', error)
    res.status(error.status || 500).json({ error: error.message })
  }
}

module.exports = {
  listConversations,
  getOrCreateConversation,
  listMessages,
  sendMessage,
}
