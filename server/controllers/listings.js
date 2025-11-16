const pool = require('../db/pool')

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
        c.name as category_name,
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
      LEFT JOIN categories c ON l.category_id = c.id
      LEFT JOIN listing_photos p ON p.listing_id = l.id
      WHERE (
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
      GROUP BY l.id, u.username, u.avatarurl, c.name
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
        c.name as category_name,
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
      LEFT JOIN categories c ON l.category_id = c.id
      LEFT JOIN listing_photos p ON p.listing_id = l.id
      WHERE l.id = $1
      GROUP BY l.id, u.username, u.avatarurl, c.name
    `, [id])
    
    if (results.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' })
    }
    
    res.status(200).json(results.rows[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// POST new listing
const createListing = async (req, res) => {
  try {
    const { title, description, price, category_id, pickup_notes, location, latitude, longitude, image_url, photos, primaryIndex } = req.body
    const seller_id = req.user ? req.user.id : null
    
    if (!seller_id) {
      return res.status(401).json({ error: 'Must be logged in to create listing' })
    }
    
    // VALIDATIO
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' })
    }
    if (title.trim().length > 255) {
      return res.status(400).json({ error: 'Title must be 255 characters or less' })
    }
    if (price && (isNaN(parseFloat(price)) || parseFloat(price) < 0)) {
      return res.status(400).json({ error: 'Price must be a non-negative number' })
    }
    if (latitude && (isNaN(parseFloat(latitude)) || parseFloat(latitude) < -90 || parseFloat(latitude) > 90)) {
      return res.status(400).json({ error: 'Invalid latitude' })
    }
    if (longitude && (isNaN(parseFloat(longitude)) || parseFloat(longitude) < -180 || parseFloat(longitude) > 180)) {
      return res.status(400).json({ error: 'Invalid longitude' })
    }
    
    const results = await pool.query(`
      INSERT INTO listings (seller_id, category_id, title, description, price, pickup_notes, location, latitude, longitude, image_url, is_available)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
      RETURNING *
    `, [seller_id, category_id || null, title, description || '', price || 0, pickup_notes || '', location || '', latitude || null, longitude || null, image_url || ''])

    const listing = results.rows[0]

    // If URL photos provided, insert them and set primary
    if (Array.isArray(photos) && photos.length > 0) {
      const primaryIdx = Number.isInteger(primaryIndex) ? primaryIndex : 0
      for (let i = 0; i < photos.length; i++) {
        const url = photos[i]
        const isPrimary = i === primaryIdx
        await pool.query(
          `INSERT INTO listing_photos (listing_id, url, is_primary, position) VALUES ($1, $2, $3, $4)`,
          [listing.id, url, isPrimary, i]
        )
        if (isPrimary && !image_url) {
          await pool.query('UPDATE listings SET image_url = $1 WHERE id = $2', [url, listing.id])
        }
      }
    }

    // If files uploaded set primary
    const files = req.files || []
    if (files.length > 0) {
      const primaryIdx = Number.isInteger(parseInt(primaryIndex)) ? parseInt(primaryIndex) : 0
      let primaryPhotoId = null
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        const isPrimary = i === primaryIdx
        const ins = await pool.query(
          `INSERT INTO listing_photos (listing_id, data, mime_type, is_primary, position) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [listing.id, f.buffer, f.mimetype, isPrimary, i]
        )
        if (isPrimary) primaryPhotoId = ins.rows[0].id
      }
      if (primaryPhotoId && !image_url) {
        const path = `/api/listings/${listing.id}/photos/${primaryPhotoId}`
        await pool.query('UPDATE listings SET image_url = $1 WHERE id = $2', [path, listing.id])
      }
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
    
    res.status(201).json(withPhotos.rows[0])
  } catch (error) {
    res.status(409).json({ error: error.message })
  }
}

// PATCH update listing
const updateListing = async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const { title, description, price, category_id, pickup_notes, location, latitude, longitude, image_url, is_available, photos, primaryIndex } = req.body
    
    // Check ownership
    const ownerCheck = await pool.query('SELECT seller_id FROM listings WHERE id = $1', [id])
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' })
    }
    if (req.user && ownerCheck.rows[0].seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to edit this listing' })
    }
    
    const results = await pool.query(`
      UPDATE listings
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          price = COALESCE($3, price),
          category_id = COALESCE($4, category_id),
          pickup_notes = COALESCE($5, pickup_notes),
          location = COALESCE($6, location),
          latitude = COALESCE($7, latitude),
          longitude = COALESCE($8, longitude),
          image_url = COALESCE($9, image_url),
          is_available = COALESCE($10, is_available)
      WHERE id = $11
      RETURNING *
    `, [title, description, price, category_id, pickup_notes, location, latitude, longitude, image_url, is_available, id])

    const updated = results.rows[0]

    // If photos provided (URLs) or files uploaded, replace photos
    const filesUpd = req.files || []
    if (Array.isArray(photos) || filesUpd.length > 0) {
      await pool.query('DELETE FROM listing_photos WHERE listing_id = $1', [id])
      const primaryIdx = Number.isInteger(parseInt(primaryIndex)) ? parseInt(primaryIndex) : 0
      let primaryPhotoPath = null
      if (Array.isArray(photos)) {
        for (let i = 0; i < photos.length; i++) {
          const url = photos[i]
          const isPrimary = i === primaryIdx
          await pool.query(
            `INSERT INTO listing_photos (listing_id, url, is_primary, position) VALUES ($1, $2, $3, $4)`,
            [id, url, isPrimary, i]
          )
          if (isPrimary) primaryPhotoPath = url
        }
      }
      if (filesUpd.length > 0) {
        for (let i = 0; i < filesUpd.length; i++) {
          const f = filesUpd[i]
          const isPrimary = i === primaryIdx
          const ins = await pool.query(
            `INSERT INTO listing_photos (listing_id, data, mime_type, is_primary, position) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [id, f.buffer, f.mimetype, isPrimary, i]
          )
          if (isPrimary) primaryPhotoPath = `/api/listings/${id}/photos/${ins.rows[0].id}`
        }
      }
      if (primaryPhotoPath) {
        await pool.query('UPDATE listings SET image_url = $1 WHERE id = $2', [primaryPhotoPath, id])
      }
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
        c.name as category_name,
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
      LEFT JOIN categories c ON l.category_id = c.id
      LEFT JOIN listing_photos p ON p.listing_id = l.id
      WHERE l.seller_id = $1
      GROUP BY l.id, c.name
      ORDER BY l.created_at DESC
    `, [seller_id])
    
    res.status(200).json(results.rows)
  } catch (error) {
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
        AND l.is_available = true
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

module.exports = {
  getAllListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
  getSellerListings,
  getListingPhoto,
  getNearbyCount
}
