const pool = require('../db/pool')
const cloudinary = require('cloudinary').v2
const streamifier = require('streamifier')

// Configure Cloudinary from environment variables. Set CLOUDINARY_URL or the individual vars.
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({ secure: true })
} else if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  })
}

const uploadBufferToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err)
      resolve(result)
    })
    streamifier.createReadStream(buffer).pipe(uploadStream)
  })
}

// GET all listings
const getAllListings = async (req, res) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat) : null
    const lng = req.query.lng ? parseFloat(req.query.lng) : null
    const radiusKm = req.query.radius_km ? parseFloat(req.query.radius_km) : null
    const q = req.query.q ? String(req.query.q).trim() : null

    const results = await pool.query(`
      SELECT 
        l.*, 
        u.username as seller_username, 
        u.avatarurl as seller_avatar,
        /* Distance in KM if lat/lng provided */
        CASE 
          WHEN $1::numeric IS NULL OR $2::numeric IS NULL OR l.latitude IS NULL OR l.longitude IS NULL THEN NULL
          ELSE (
            6371 * acos(
              cos(radians($1::numeric)) * cos(radians(l.latitude)) *
              cos(radians(l.longitude) - radians($2::numeric)) +
              sin(radians($1::numeric)) * sin(radians(l.latitude))
            )
          )
        END AS distance_km,
        /* Count unsold items */
        COUNT(DISTINCT i.id) FILTER (WHERE i.sold = false) as item_count,
        /* Array of unique category names from items */
        ARRAY_AGG(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL) as item_categories,
        /* Checked-in users and count */
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', au.id, 'username', au.username, 'avatarurl', au.avatarurl)) FILTER (WHERE au.id IS NOT NULL), '[]'
        ) AS checked_in_users,
        COUNT(DISTINCT a.user_id) AS check_in_count,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'url', CASE WHEN COALESCE(p.url, '') <> '' THEN p.url ELSE '/api/listings/' || l.id || '/photos/' || p.id END,
              'is_primary', p.is_primary,
              'position', p.position
            )
            ORDER BY p.is_primary DESC, p.position ASC, p.id ASC
          ) FILTER (WHERE p.id IS NOT NULL), '[]'
        ) AS photos
      FROM listings l
      LEFT JOIN users u ON l.seller_id = u.id
      LEFT JOIN listing_photos p ON p.listing_id = l.id
      LEFT JOIN checkins a ON a.listing_id = l.id
      LEFT JOIN users au ON au.id = a.user_id
      LEFT JOIN items i ON i.listing_id = l.id
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE l.is_active = true
      AND (
        /* Text search */
        $4::text IS NULL OR 
        l.title ILIKE '%' || $4::text || '%' OR 
        l.description ILIKE '%' || $4::text || '%' OR 
        l.location ILIKE '%' || $4::text || '%'
      )
      AND (
        /* Location filter within radius if provided */
        $1::numeric IS NULL OR $2::numeric IS NULL OR $3::numeric IS NULL OR (
          l.latitude IS NOT NULL AND l.longitude IS NOT NULL AND (
            6371 * acos(
              cos(radians($1::numeric)) * cos(radians(l.latitude)) *
              cos(radians(l.longitude) - radians($2::numeric)) +
              sin(radians($1::numeric)) * sin(radians(l.latitude))
            )
          ) <= $3::numeric
        )
      )
      GROUP BY l.id, u.username, u.avatarurl
      ORDER BY 
        CASE WHEN $1::numeric IS NULL OR $2::numeric IS NULL THEN NULL ELSE 1 END,
        CASE WHEN $1::numeric IS NULL OR $2::numeric IS NULL THEN NULL ELSE (
          6371 * acos(
            cos(radians($1::numeric)) * cos(radians(l.latitude)) *
            cos(radians(l.longitude) - radians($2::numeric)) +
            sin(radians($1::numeric)) * sin(radians(l.latitude))
          )
        ) END ASC NULLS LAST,
        l.created_at DESC
    `, [lat, lng, radiusKm, q])
    res.status(200).json(results.rows)
  } catch (error) {
    console.error('Error in getAllListings:', error)
    res.status(500).json({ error: error.message })
  }
}

// GET single listing
const getListing = async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const results = await pool.query(`
      SELECT 
        l.*, 
        u.username as seller_username, 
        u.avatarurl as seller_avatar,
        /* Count unsold items */
        COUNT(DISTINCT i.id) FILTER (WHERE i.sold = false) as item_count,
        /* Array of unique category names from items */
        ARRAY_AGG(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL) as item_categories,
        /* Checked-in users and count */
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', au.id, 'username', au.username, 'avatarurl', au.avatarurl)) FILTER (WHERE au.id IS NOT NULL), '[]'
        ) AS checked_in_users,
        COUNT(DISTINCT a.user_id) AS check_in_count,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'url', CASE WHEN COALESCE(p.url, '') <> '' THEN p.url ELSE '/api/listings/' || l.id || '/photos/' || p.id END,
              'is_primary', p.is_primary,
              'position', p.position
            )
            ORDER BY p.is_primary DESC, p.position ASC, p.id ASC
          ) FILTER (WHERE p.id IS NOT NULL), '[]'
        ) AS photos
      FROM listings l
      LEFT JOIN users u ON l.seller_id = u.id
      LEFT JOIN checkins a ON a.listing_id = l.id
      LEFT JOIN users au ON au.id = a.user_id
      LEFT JOIN listing_photos p ON p.listing_id = l.id
      LEFT JOIN items i ON i.listing_id = l.id
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE l.id = $1
      GROUP BY l.id, u.username, u.avatarurl
    `, [id])
    
    if (results.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' })
    }
    
    res.status(200).json(results.rows[0])
  } catch (error) {
    console.error('Error in getListing:', error)
    res.status(500).json({ error: error.message })
  }
}

// POST new listing
const createListing = async (req, res) => {
  try {
    const { title, description, sale_date, start_time, end_time, pickup_notes, location, latitude, longitude, photos, primaryIndex, items } = req.body
    const seller_id = req.user ? req.user.id : null
    
    if (!seller_id) {
      return res.status(401).json({ error: 'Must be logged in to create listing' })
    }
    
    // VALIDATION
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' })
    }
    if (title.trim().length > 255) {
      return res.status(400).json({ error: 'Title must be 255 characters or less' })
    }
    if (latitude && (isNaN(parseFloat(latitude)) || parseFloat(latitude) < -90 || parseFloat(latitude) > 90)) {
      return res.status(400).json({ error: 'Invalid latitude' })
    }
    if (longitude && (isNaN(parseFloat(longitude)) || parseFloat(longitude) < -180 || parseFloat(longitude) > 180)) {
      return res.status(400).json({ error: 'Invalid longitude' })
    }
    
    // Use a transaction so listing, photos, and items are inserted atomically
    await pool.query('BEGIN')
    const results = await pool.query(`
      INSERT INTO listings (seller_id, title, description, sale_date, start_time, end_time, pickup_notes, location, latitude, longitude, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
      RETURNING *
    `, [seller_id, title, description || '', sale_date || null, start_time || null, end_time || null, pickup_notes || '', location || '', latitude || null, longitude || null])

    const listing = results.rows[0]

    // If files uploaded, upload to Cloudinary and insert photo records
    const files = req.files || []
    if (files.length > 0) {
      const primaryIdx = Number.isInteger(parseInt(primaryIndex)) ? parseInt(primaryIndex) : 0
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        const isPrimary = i === primaryIdx
        try {
          const result = await uploadBufferToCloudinary(f.buffer, { folder: process.env.CLOUDINARY_FOLDER || 'yardshare' })
          const url = result.secure_url || result.url
          await pool.query(
            `INSERT INTO listing_photos (listing_id, url, mime_type, is_primary, position) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [listing.id, url, f.mimetype, isPrimary, i]
          )
        } catch (uploadErr) {
          console.error('Cloudinary upload failed:', uploadErr)
          throw uploadErr
        }
      }
    }

    // If items were provided (JSON array or stringified JSON), insert them into `items` table
    try {
      if (items) {
        let parsed = items
        if (typeof items === 'string') {
          try {
            parsed = JSON.parse(items)
          } catch (e) {
            parsed = []
          }
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
          const allowedConditions = ['excellent', 'good', 'fair', 'poor']
          for (let i = 0; i < parsed.length; i++) {
            const it = parsed[i] || {}
            const itemTitle = it.title ? String(it.title).trim() : ''
            if (!itemTitle) continue // skip empty items
            const itemDescription = it.description || ''
            const itemPrice = (it.price !== undefined && it.price !== null && it.price !== '') ? Number(it.price) : 0.00
            const itemCategory = it.category_id ? Number(it.category_id) : null
            const rawCondition = it.condition !== undefined && it.condition !== null ? String(it.condition) : null
            const itemCondition = rawCondition ? String(rawCondition).toLowerCase() : null
            if (!itemCondition || !allowedConditions.includes(itemCondition)) {
              const ve = new Error(`Invalid item condition for item ${i + 1}: ${rawCondition}`)
              ve.status = 400
              throw ve
            }
            const itemImage = it.image_url || null
            await pool.query(`
              INSERT INTO items (listing_id, category_id, title, description, price, condition, image_url, display_order)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [listing.id, itemCategory, itemTitle, itemDescription, itemPrice, itemCondition, itemImage, i])
          }
        }
      }
    } catch (innerErr) {
      console.error('Error inserting items for listing:', innerErr)
      // Rollback will happen below in outer catch
      throw innerErr
    }

    // Return listing with photos
    const withPhotos = await pool.query(`
      SELECT 
        l.*, 
        COALESCE(
          json_agg(
            json_build_object('id', p.id, 'url', p.url, 'is_primary', p.is_primary, 'position', p.position)
            ORDER BY p.is_primary DESC, p.position ASC, p.id ASC
          ) FILTER (WHERE p.id IS NOT NULL), '[]'
        ) AS photos
      FROM listings l
      LEFT JOIN listing_photos p ON p.listing_id = l.id
      WHERE l.id = $1
      GROUP BY l.id
    `, [listing.id])
    
    await pool.query('COMMIT')
    res.status(201).json(withPhotos.rows[0])
  } catch (error) {
    console.error('Error in createListing:', error)
    try {
      await pool.query('ROLLBACK')
    } catch (rbErr) {
      console.error('Rollback failed:', rbErr)
    }
    const status = error && (error.status || error.statusCode) ? (error.status || error.statusCode) : 409
    res.status(status).json({ error: error.message })
  }
}

// PATCH update listing
const updateListing = async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const { title, description, sale_date, start_time, end_time, pickup_notes, location, latitude, longitude, is_active, is_available, photos, primaryIndex, items } = req.body
    
    // Check ownership
    const ownerCheck = await pool.query('SELECT seller_id FROM listings WHERE id = $1', [id])
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' })
    }
    if (req.user && ownerCheck.rows[0].seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to edit this listing' })
    }
    
    // Support frontend `is_available` field (maps to `is_active` in DB)
    const finalIsActive = (is_active !== undefined) ? is_active : (is_available !== undefined ? is_available : null)

    const results = await pool.query(`
      UPDATE listings
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          sale_date = COALESCE($3, sale_date),
          start_time = COALESCE($4, start_time),
          end_time = COALESCE($5, end_time),
          pickup_notes = COALESCE($6, pickup_notes),
          location = COALESCE($7, location),
          latitude = COALESCE($8, latitude),
          longitude = COALESCE($9, longitude),
          is_active = COALESCE($10, is_active)
      WHERE id = $11
      RETURNING *
    `, [title, description, sale_date, start_time, end_time, pickup_notes, location, latitude, longitude, finalIsActive, id])

    const updated = results.rows[0]

    // If photos provided (URLs) or files uploaded, replace photos
    const filesUpd = req.files || []
    if (Array.isArray(photos) || filesUpd.length > 0) {
      await pool.query('DELETE FROM listing_photos WHERE listing_id = $1', [id])
      const primaryIdx = Number.isInteger(parseInt(primaryIndex)) ? parseInt(primaryIndex) : 0
      if (Array.isArray(photos)) {
        for (let i = 0; i < photos.length; i++) {
          const url = photos[i]
          const isPrimary = i === primaryIdx
          await pool.query(
            `INSERT INTO listing_photos (listing_id, url, is_primary, position) VALUES ($1, $2, $3, $4)`,
            [id, url, isPrimary, i]
          )
        }
      }
      if (filesUpd.length > 0) {
        for (let i = 0; i < filesUpd.length; i++) {
          const f = filesUpd[i]
          const isPrimary = i === primaryIdx
          try {
            const result = await uploadBufferToCloudinary(f.buffer, { folder: process.env.CLOUDINARY_FOLDER || 'yardshare' })
            const url = result.secure_url || result.url
            await pool.query(
              `INSERT INTO listing_photos (listing_id, url, mime_type, is_primary, position) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
              [id, url, f.mimetype, isPrimary, i]
            )
          } catch (uploadErr) {
            console.error('Cloudinary upload failed during update:', uploadErr)
            throw uploadErr
          }
        }
      }
    }
    
    // If items provided (JSON array or stringified JSON), replace items
    try {
      if (items !== undefined) {
        let parsed = items
        if (typeof items === 'string') {
          try {
            parsed = JSON.parse(items)
          } catch (e) {
            parsed = []
          }
        }
        if (Array.isArray(parsed)) {
          // Delete existing items for listing and insert the provided ones in order
          await pool.query('DELETE FROM items WHERE listing_id = $1', [id])
          const allowedConditions = ['excellent', 'good', 'fair', 'poor']
          for (let i = 0; i < parsed.length; i++) {
            const it = parsed[i] || {}
            const itemTitle = it.title ? String(it.title).trim() : ''
            if (!itemTitle) continue // skip empty items
            const itemDescription = it.description || ''
            const itemPrice = (it.price !== undefined && it.price !== null && it.price !== '') ? Number(it.price) : 0.00
            const itemCategory = it.category_id ? Number(it.category_id) : null
            const rawCondition = it.condition !== undefined && it.condition !== null ? String(it.condition) : null
            const itemCondition = rawCondition ? String(rawCondition).toLowerCase() : null
            if (!itemCondition || !allowedConditions.includes(itemCondition)) {
              const ve = new Error(`Invalid item condition for item ${i + 1}: ${rawCondition}`)
              ve.status = 400
              throw ve
            }
            const itemImage = it.image_url || null
            await pool.query(`
              INSERT INTO items (listing_id, category_id, title, description, price, condition, image_url, display_order)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [id, itemCategory, itemTitle, itemDescription, itemPrice, itemCondition, itemImage, i])
          }
        }
      }
    } catch (innerErr) {
      console.error('Error updating items for listing:', innerErr)
      throw innerErr
    }

    const withPhotos = await pool.query(`
      SELECT 
        l.*, 
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'url', CASE WHEN COALESCE(p.url, '') <> '' THEN p.url ELSE '/api/listings/' || l.id || '/photos/' || p.id END,
              'is_primary', p.is_primary,
              'position', p.position
            )
            ORDER BY p.is_primary DESC, p.position ASC, p.id ASC
          ) FILTER (WHERE p.id IS NOT NULL), '[]'
        ) AS photos
      FROM listings l
      LEFT JOIN listing_photos p ON p.listing_id = l.id
      WHERE l.id = $1
      GROUP BY l.id
    `, [id])

    res.status(200).json(withPhotos.rows[0])
  } catch (error) {
    console.error('Error in updateListing:', error)
    res.status(409).json({ error: error.message })
  }
}

// DELETE listing
const deleteListing = async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    
    // Check ownership
    const ownerCheck = await pool.query('SELECT seller_id FROM listings WHERE id = $1', [id])
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' })
    }
    if (req.user && ownerCheck.rows[0].seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this listing' })
    }
    
    // Delete associated favorites first
    await pool.query('DELETE FROM favorites WHERE listing_id = $1', [id])
    
    await pool.query('DELETE FROM listings WHERE id = $1', [id])
    
    res.status(200).json({ message: 'Listing deleted successfully' })
  } catch (error) {
    console.error('Error in deleteListing:', error)
    res.status(500).json({ error: error.message })
  }
}

// GET listings by seller
const getSellerListings = async (req, res) => {
  try {
    const seller_id = req.user ? req.user.id : null
    if (!seller_id) {
      return res.status(401).json({ error: 'Must be logged in' })
    }
    
    const results = await pool.query(`
      SELECT 
        l.*, 
        COUNT(DISTINCT i.id) FILTER (WHERE i.sold = false) as item_count,
        ARRAY_AGG(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL) as item_categories,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'url', CASE WHEN COALESCE(p.url, '') <> '' THEN p.url ELSE '/api/listings/' || l.id || '/photos/' || p.id END,
              'is_primary', p.is_primary,
              'position', p.position
            )
            ORDER BY p.is_primary DESC, p.position ASC, p.id ASC
          ) FILTER (WHERE p.id IS NOT NULL), '[]'
        ) AS photos
      FROM listings l
      LEFT JOIN listing_photos p ON p.listing_id = l.id
      LEFT JOIN items i ON i.listing_id = l.id
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE l.seller_id = $1
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `, [seller_id])
    
    res.status(200).json(results.rows)
  } catch (error) {
    console.error('Error in getSellerListings:', error)
    res.status(500).json({ error: error.message })
  }
}

// GET binary photo handler
const getListingPhoto = async (req, res) => {
  try {
    const listingId = parseInt(req.params.id)
    const photoId = parseInt(req.params.photoId)
    const q = await pool.query(
      `SELECT data, mime_type FROM listing_photos WHERE id = $1 AND listing_id = $2 LIMIT 1`,
      [photoId, listingId]
    )
    if (q.rows.length === 0 || !q.rows[0].data) {
      return res.status(404).json({ error: 'Photo not found' })
    }
    const { data, mime_type } = q.rows[0]
    res.set('Content-Type', mime_type || 'application/octet-stream')
    res.send(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Custom non-RESTful route
const getNearbyCount = async (req, res) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat) : null
    const lng = req.query.lng ? parseFloat(req.query.lng) : null
    const radiusKm = req.query.radius_km ? parseFloat(req.query.radius_km) : 10

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' })
    }

    const results = await pool.query(`
      SELECT COUNT(*) as count
      FROM listings l
      WHERE l.latitude IS NOT NULL 
        AND l.longitude IS NOT NULL 
        AND l.is_active = true
        AND (
          6371 * acos(
            cos(radians($1::numeric)) * cos(radians(l.latitude)) *
            cos(radians(l.longitude) - radians($2::numeric)) +
            sin(radians($1::numeric)) * sin(radians(l.latitude))
          )
        ) <= $3::numeric
    `, [lat, lng, radiusKm])
    
    res.status(200).json({ 
      count: parseInt(results.rows[0].count),
      latitude: lat,
      longitude: lng,
      radius_km: radiusKm
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// POST check-in
const checkInListing = async (req, res) => {
  try {
    const listingId = parseInt(req.params.id)
    const userId = req.user ? req.user.id : null
    if (!userId) return res.status(401).json({ error: 'Must be logged in to check in' })

    await pool.query(
      `INSERT INTO checkins (user_id, listing_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, listingId]
    )

    res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Error in checkInListing:', error)
    res.status(500).json({ error: error.message })
  }
}

// DELETE check-in
const uncheckInListing = async (req, res) => {
  try {
    const listingId = parseInt(req.params.id)
    const userId = req.user ? req.user.id : null
    if (!userId) return res.status(401).json({ error: 'Must be logged in to un-check in' })

    await pool.query(`DELETE FROM checkins WHERE user_id = $1 AND listing_id = $2`, [userId, listingId])

    res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Error in uncheckInListing:', error)
    res.status(500).json({ error: error.message })
  }
}

module.exports = {
  getAllListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
  getSellerListings,
  getListingPhoto,
  getNearbyCount,
  checkInListing,
  uncheckInListing
}