const pool = require('../db/pool')

const unifiedSearch = async (req, res) => {
    try {
        const searchQuery = req.query.q ? String(req.query.q).trim() : ''
        const categoryFilter = req.query.category ? String(req.query.category).trim() : null
        const userLat = req.query.user_lat ? parseFloat(req.query.user_lat) : null
        const userLng = req.query.user_lng ? parseFloat(req.query.user_lng) : null
        const radiusKm = req.query.radius_km ? parseFloat(req.query.radius_km) : null
   
        if (!searchQuery && categoryFilter) {
            return res.status(200).json({listings: [], items: [] })
        }

        const listingsQuery = `

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

        /* Text search with fuzzy matching (case-insensitive) */

        $4::text IS NULL OR $4::text = '' OR

        l.title ILIKE '%' || $4::text || '%' OR

        l.description ILIKE '%' || $4::text || '%' OR

        l.location ILIKE '%' || $4::text || '%'

      )

      AND (

        /* Category filter */

        $5::text IS NULL OR c.name = $5::text

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

    `

    const itemsQuery = `

      SELECT

        items.*,

        c.name as category_name,

        listings.id as listing_id,

        listings.title as sale_title,

        listings.location as sale_location,

        listings.latitude,

        listings.longitude,

        listings.sale_date,

        listings.start_time,

        listings.end_time,

        /* Distance in KM if lat/lng provided */

        CASE

          WHEN $1::numeric IS NULL OR $2::numeric IS NULL OR listings.latitude IS NULL OR listings.longitude IS NULL THEN NULL

          ELSE (

            6371 * acos(

              cos(radians($1::numeric)) * cos(radians(listings.latitude)) *

              cos(radians(listings.longitude) - radians($2::numeric)) +

              sin(radians($1::numeric)) * sin(radians(listings.latitude))

            )

          )

        END AS distance_km,

        COALESCE(

          json_agg(

            json_build_object('id', ip.id, 'url', ip.url, 'is_primary', ip.is_primary, 'position', ip.position)

            ORDER BY ip.position

          ) FILTER (WHERE ip.id IS NOT NULL),

          '[]'::json

        ) as photos

      FROM items

      JOIN listings ON items.listing_id = listings.id

      LEFT JOIN categories c ON items.category_id = c.id

      LEFT JOIN item_photos ip ON items.id = ip.item_id

      WHERE items.sold = false

      AND listings.is_active = true

      AND (

        /* Text search with fuzzy matching (case-insensitive) */

        $4::text IS NULL OR $4::text = '' OR

        items.title ILIKE '%' || $4::text || '%' OR

        items.description ILIKE '%' || $4::text || '%' OR

        c.name ILIKE '%' || $4::text || '%'

      )

      AND (

        /* Category filter */

        $5::text IS NULL OR c.name = $5::text

      )

      AND (

        /* Location filter within radius if provided */

        $1::numeric IS NULL OR $2::numeric IS NULL OR $3::numeric IS NULL OR (

          listings.latitude IS NOT NULL AND listings.longitude IS NOT NULL AND (

            6371 * acos(

              cos(radians($1::numeric)) * cos(radians(listings.latitude)) *

              cos(radians(listings.longitude) - radians($2::numeric)) +

              sin(radians($1::numeric)) * sin(radians(listings.latitude))

            )

          ) <= $3::numeric

        )

      )

      GROUP BY items.id, c.name, listings.id, listings.title, listings.location, listings.latitude, listings.longitude, listings.sale_date, listings.start_time, listings.end_time

      ORDER BY

        CASE WHEN $1::numeric IS NULL OR $2::numeric IS NULL THEN NULL ELSE 1 END,

        CASE WHEN $1::numeric IS NULL OR $2::numeric IS NULL THEN NULL ELSE (

          6371 * acos(

            cos(radians($1::numeric)) * cos(radians(listings.latitude)) *

            cos(radians(listings.longitude) - radians($2::numeric)) +

            sin(radians($1::numeric)) * sin(radians(listings.latitude))

          )

        ) END ASC NULLS LAST,

        items.created_at DESC

    `

    const [listingsResult, itemsResult] = await Promise.all([
        pool.query(listingsQuery, [userLat, userLng, radiusKm, searchQuery || null, categoryFilter]),
        pool.query(itemsQuery, [userLat, userLng, radiusKm, searchQuery || null, categoryFilter]),
    ])

    res.status(200).json({
        listings: listingsResult.rows,
        items: itemsResult.rows,
        searchQuery,
        category: categoryFilter,
        location: userLat && userLng ? {userLat, userLng, radius_km: radiusKm} : null
    })
    } catch (error) {
        console.error('Error in unifiedSearch:', error)
        res.status(500).json({error: error.message})
    }
}

module.exports = {
    unifiedSearch
}