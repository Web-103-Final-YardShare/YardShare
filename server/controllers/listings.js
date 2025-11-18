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
        /* Count unsold items */
        COUNT(DISTINCT i.id) FILTER (WHERE i.sold = false) as item_count,
        /* Array of unique category names from items */
        ARRAY_AGG(DISTINCT ic.name) FILTER (WHERE ic.name IS NOT NULL) as item_categories,
        /* Photos from listing_photos table */
        COALESCE(
          json_agg(
            json_build_object('id', lp.id, 'url', lp.url, 'is_primary', lp.is_primary, 'position', lp.position)
            ORDER BY lp.position
          ) FILTER (WHERE lp.id IS NOT NULL),
          '[]'::json
        ) as photos
      FROM listings l
      LEFT JOIN users u ON l.seller_id = u.id
      LEFT JOIN categories c ON l.category_id = c.id
      LEFT JOIN items i ON i.listing_id = l.id
      LEFT JOIN categories ic ON i.category_id = ic.id
      LEFT JOIN listing_photos lp ON l.id = lp.listing_id
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
    console.error('Error in getAllListings:', error)
    res.status(500).json({ error: error.message })
  }
}

// GET single listing
const getListing = async (req, res) => {
  try {
    const id = parseInt(req.params.listingId)
    const results = await pool.query(`
      SELECT
        l.*,
        u.username as seller_username,
        u.avatarurl as seller_avatar,
        c.name as category_name,
        /* Count unsold items */
        COUNT(DISTINCT i.id) FILTER (WHERE i.sold = false) as item_count,
        /* Array of unique category names from items */
        ARRAY_AGG(DISTINCT ic.name) FILTER (WHERE ic.name IS NOT NULL) as item_categories,
        /* Photos from listing_photos table (aggregated in a subquery to preserve ordering and avoid DISTINCT+ORDER conflicts) */
        (
          SELECT COALESCE(
            json_agg(json_build_object('id', p.id, 'url', p.url, 'is_primary', p.is_primary, 'position', p.position) ORDER BY p.position),
            '[]'::json
          )
          FROM listing_photos p
          WHERE p.listing_id = l.id
        ) as photos,
        /* Check-in count (from attendees table) */
        (
          SELECT COUNT(*) FROM attendees a2 WHERE a2.listing_id = l.id
        ) as check_in_count,
        /* Checked-in users info (aggregated in a subquery) */
        (
          SELECT COALESCE(
            json_agg(json_build_object('id', u2.id, 'username', u2.username, 'avatarurl', u2.avatarurl) ORDER BY u2.username),
            '[]'::json
          )
          FROM attendees a2
          JOIN users u2 ON a2.user_id = u2.id
          WHERE a2.listing_id = l.id
        ) as checked_in_users
      FROM listings l
      LEFT JOIN users u ON l.seller_id = u.id
      LEFT JOIN categories c ON l.category_id = c.id
      LEFT JOIN items i ON i.listing_id = l.id
      LEFT JOIN categories ic ON i.category_id = ic.id
      WHERE l.id = $1
      GROUP BY l.id, u.username, u.avatarurl, c.name
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
    const { title, description, category_id, sale_date, start_time, end_time, pickup_notes, location, latitude, longitude, photos, primaryIndex, items } = req.body
    console.log('[createListing] req.user:', req.user);
    const seller_id = req.user ? req.user.id : null
    console.log('[createListing] seller_id:', seller_id);

    if (!seller_id) {
      console.error('[createListing] No seller_id - user not authenticated');
      return res.status(401).json({ error: 'Must be logged in to create listing' })
    }

    // Verify user exists in database
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [seller_id]);
    console.log('[createListing] User exists in DB:', userCheck.rows.length > 0, 'user_id:', seller_id);

    if (userCheck.rows.length === 0) {
      console.error('[createListing] User not found in database:', seller_id);
      return res.status(401).json({ error: 'User account not found. Please log out and log in again.' })
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
    console.log('[createListing] Inserting listing with seller_id:', seller_id, 'category_id:', category_id);
    let results;
    try {
      results = await pool.query(`
        INSERT INTO listings (seller_id, category_id, title, description, sale_date, start_time, end_time, pickup_notes, location, latitude, longitude, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
        RETURNING *
      `, [seller_id, category_id || null, title, description || '', sale_date || null, start_time || null, end_time || null, pickup_notes || '', location || '', latitude || null, longitude || null])
    } catch (insertError) {
      console.error('[createListing] INSERT failed:', insertError.message);
      console.error('[createListing] INSERT error detail:', insertError.detail);
      console.error('[createListing] Parameters:', { seller_id, category_id, title });
      throw insertError;
    }

    const listing = results.rows[0]

    // If files uploaded, upload to Cloudinary and store in listing_photos table
    // Filter only files with fieldname 'photos' (listing photos)
    const allFiles = req.files || []
    const listingPhotoFiles = allFiles.filter(f => f.fieldname === 'photos')
    if (listingPhotoFiles.length > 0) {
      const primaryIdx = primaryIndex !== undefined ? parseInt(primaryIndex) : 0
      for (let i = 0; i < listingPhotoFiles.length; i++) {
        const f = listingPhotoFiles[i]
        try {
          const result = await uploadBufferToCloudinary(f.buffer, { folder: process.env.CLOUDINARY_FOLDER || 'yardshare' })
          const url = result.secure_url || result.url
          const isPrimary = (i === primaryIdx)

          await pool.query(`
            INSERT INTO listing_photos (listing_id, url, is_primary, position)
            VALUES ($1, $2, $3, $4)
          `, [listing.id, url, isPrimary, i])
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
            
            // Check if item has photo uploaded
            let itemImage = it.image_url || null
            if (it.hasPhoto && req.files) {
              // Look for item_photo_{i} in req.files
              const itemPhotoField = `item_photo_${i}`
              const itemPhotoFile = Array.isArray(req.files) 
                ? req.files.find(f => f.fieldname === itemPhotoField)
                : req.files[itemPhotoField]?.[0]
                
              if (itemPhotoFile) {
                try {
                  const result = await uploadBufferToCloudinary(itemPhotoFile.buffer, { 
                    folder: process.env.CLOUDINARY_FOLDER ? `${process.env.CLOUDINARY_FOLDER}/items` : 'yardshare/items' 
                  })
                  itemImage = result.secure_url || result.url
                } catch (uploadErr) {
                  console.error(`Failed to upload item photo ${i}:`, uploadErr)
                  // Continue without image
                }
              }
            }
            
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

    // Return listing with photos from listing_photos table
    const withPhotos = await pool.query(`
      SELECT
        l.*,
        COALESCE(
          json_agg(
            json_build_object('id', lp.id, 'url', lp.url, 'is_primary', lp.is_primary, 'position', lp.position)
            ORDER BY lp.position
          ) FILTER (WHERE lp.id IS NOT NULL),
          '[]'::json
        ) as photos
      FROM listings l
      LEFT JOIN listing_photos lp ON l.id = lp.listing_id
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
    const id = parseInt(req.params.listingId)
    const { title, description, category_id, sale_date, start_time, end_time, pickup_notes, location, latitude, longitude, is_active, is_available, photos, primaryIndex, items } = req.body

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
          category_id = COALESCE($3, category_id),
          sale_date = COALESCE($4, sale_date),
          start_time = COALESCE($5, start_time),
          end_time = COALESCE($6, end_time),
          pickup_notes = COALESCE($7, pickup_notes),
          location = COALESCE($8, location),
          latitude = COALESCE($9, latitude),
          longitude = COALESCE($10, longitude),
          is_active = COALESCE($11, is_active)
      WHERE id = $12
      RETURNING *
    `, [title, description, category_id, sale_date, start_time, end_time, pickup_notes, location, latitude, longitude, finalIsActive, id])

    const updated = results.rows[0]

    // If photos provided (URLs) or files uploaded, replace photos in listing_photos table
    // ONLY process files with fieldname "photos" for listing photos, not item photos
    const allFiles = req.files || []
    const listingPhotoFiles = Array.isArray(allFiles)
      ? allFiles.filter(f => f.fieldname === 'photos')
      : []

    if (Array.isArray(photos) || listingPhotoFiles.length > 0) {
      // Delete existing photos
      await pool.query('DELETE FROM listing_photos WHERE listing_id = $1', [id])

      const primaryIdx = primaryIndex !== undefined ? parseInt(primaryIndex) : 0
      let position = 0

      // If photo URLs provided directly, insert them
      if (Array.isArray(photos) && photos.length > 0) {
        for (let i = 0; i < photos.length; i++) {
          const isPrimary = (position === primaryIdx)
          await pool.query(`
            INSERT INTO listing_photos (listing_id, url, is_primary, position)
            VALUES ($1, $2, $3, $4)
          `, [id, photos[i], isPrimary, position])
          position++
        }
      }

      // Upload new files to Cloudinary and insert
      if (listingPhotoFiles.length > 0) {
        for (let i = 0; i < listingPhotoFiles.length; i++) {
          const f = listingPhotoFiles[i]
          try {
            const result = await uploadBufferToCloudinary(f.buffer, { folder: process.env.CLOUDINARY_FOLDER || 'yardshare' })
            const url = result.secure_url || result.url
            const isPrimary = (position === primaryIdx)

            await pool.query(`
              INSERT INTO listing_photos (listing_id, url, is_primary, position)
              VALUES ($1, $2, $3, $4)
            `, [id, url, isPrimary, position])
            position++
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
            
            // Check if item has photo uploaded
            let itemImage = it.image_url || null
            if (it.hasPhoto && req.files) {
              // Look for item_photo_{i} in req.files
              const itemPhotoField = `item_photo_${i}`
              const itemPhotoFile = Array.isArray(req.files) 
                ? req.files.find(f => f.fieldname === itemPhotoField)
                : req.files[itemPhotoField]?.[0]
                
              if (itemPhotoFile) {
                try {
                  const result = await uploadBufferToCloudinary(itemPhotoFile.buffer, { 
                    folder: process.env.CLOUDINARY_FOLDER ? `${process.env.CLOUDINARY_FOLDER}/items` : 'yardshare/items' 
                  })
                  itemImage = result.secure_url || result.url
                } catch (uploadErr) {
                  console.error(`Failed to upload item photo ${i}:`, uploadErr)
                  // Continue without image
                }
              }
            }
            
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
            json_build_object('id', lp.id, 'url', lp.url, 'is_primary', lp.is_primary, 'position', lp.position)
            ORDER BY lp.position
          ) FILTER (WHERE lp.id IS NOT NULL),
          '[]'::json
        ) as photos
      FROM listings l
      LEFT JOIN listing_photos lp ON l.id = lp.listing_id
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
    const id = parseInt(req.params.listingId)
    
    // Check ownership
    const ownerCheck = await pool.query('SELECT seller_id FROM listings WHERE id = $1', [id])
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' })
    }
    if (req.user && ownerCheck.rows[0].seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this listing' })
    }
    
    // Delete associated records (CASCADE should handle most of these, but being explicit)
    await pool.query('DELETE FROM listing_photos WHERE listing_id = $1', [id])
    await pool.query('DELETE FROM listing_favorites WHERE listing_id = $1', [id])
    await pool.query('DELETE FROM item_favorites WHERE item_id IN (SELECT id FROM items WHERE listing_id = $1)', [id])
    await pool.query('DELETE FROM items WHERE listing_id = $1', [id])
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
        c.name as category_name,
        COUNT(DISTINCT i.id) FILTER (WHERE i.sold = false) as item_count,
        ARRAY_AGG(DISTINCT ic.name) FILTER (WHERE ic.name IS NOT NULL) as item_categories,
        COALESCE(
          json_agg(
            json_build_object('id', lp.id, 'url', lp.url, 'is_primary', lp.is_primary, 'position', lp.position)
            ORDER BY lp.position
          ) FILTER (WHERE lp.id IS NOT NULL),
          '[]'::json
        ) as photos
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      LEFT JOIN items i ON i.listing_id = l.id
      LEFT JOIN categories ic ON i.category_id = ic.id
      LEFT JOIN listing_photos lp ON l.id = lp.listing_id
      WHERE l.seller_id = $1
      GROUP BY l.id, c.name
      ORDER BY l.created_at DESC
    `, [seller_id])
    
    res.status(200).json(results.rows)
  } catch (error) {
    console.error('Error in getSellerListings:', error)
    res.status(500).json({ error: error.message })
  }
}

// Binary photo handler removed - using Cloudinary URLs instead
// Photos are stored in photo_urls TEXT[] column

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
    const user_id = req.user ? req.user.id : null
    if (!user_id) {
      return res.status(401).json({ error: 'Must be logged in to check in' })
    }

    const listingId = parseInt(req.params.listingId)

    // Check if listing exists
    const listingCheck = await pool.query('SELECT id FROM listings WHERE id = $1', [listingId])
    if (listingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' })
    }

    // Check if already checked in
    const existing = await pool.query(
      'SELECT * FROM attendees WHERE user_id = $1 AND listing_id = $2',
      [user_id, listingId]
    )

    if (existing.rows.length > 0) {
      return res.status(200).json({ message: 'Already checked in', checked_in: true })
    }

    // Insert check-in
    await pool.query(
      'INSERT INTO attendees (user_id, listing_id, checked_in_at) VALUES ($1, $2, NOW())',
      [user_id, listingId]
    )

    res.status(201).json({ message: 'Checked in successfully', checked_in: true })
  } catch (error) {
    console.error('Error in checkInListing:', error)
    res.status(500).json({ error: error.message })
  }
}

// DELETE check-in
const uncheckInListing = async (req, res) => {
  try {
    const user_id = req.user ? req.user.id : null
    if (!user_id) {
      return res.status(401).json({ error: 'Must be logged in' })
    }

    const listingId = parseInt(req.params.listingId)

    await pool.query(
      'DELETE FROM attendees WHERE user_id = $1 AND listing_id = $2',
      [user_id, listingId]
    )

    res.status(200).json({ message: 'Checked out successfully', checked_in: false })
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
  getNearbyCount,
  checkInListing,
  uncheckInListing
}