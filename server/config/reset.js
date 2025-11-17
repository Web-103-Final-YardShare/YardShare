require('dotenv').config()
const pool = require('../db/pool')

const dropTables = async () => {
  try {
    console.log('🗑️  Dropping tables...')
    await pool.query('DROP TABLE IF EXISTS items CASCADE')
    await pool.query('DROP TABLE IF EXISTS listings CASCADE')
    await pool.query('DROP TABLE IF EXISTS users CASCADE')
    console.log('✅ Tables dropped')
  } catch (error) {
    console.error('❌ Error dropping tables:', error.message)
  }
}

const createTables = async () => {
  try {
    console.log('🔨 Creating tables...')
    
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        githubid BIGINT NOT NULL UNIQUE,
        username VARCHAR(200) NOT NULL UNIQUE,
        avatarurl VARCHAR(500),
        accesstoken VARCHAR(500) NOT NULL,
        bio TEXT,
        phone VARCHAR(20),
        favorite_listing_ids INTEGER[] DEFAULT '{}',
        favorite_item_ids INTEGER[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    
    // Listings table (yard sales)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS listings (
        id SERIAL PRIMARY KEY,
        seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        sale_date DATE,
        start_time TIME,
        end_time TIME,
        is_active BOOLEAN DEFAULT true,
        pickup_notes TEXT,
        location VARCHAR(255),
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        photo_urls TEXT[] DEFAULT '{}',
        attendee_ids INTEGER[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller_id)
    `)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_listings_location ON listings(latitude, longitude)
    `)

    // Items table (individual items in yard sales)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        condition VARCHAR(20) NOT NULL CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),
        category VARCHAR(100),
        image_url VARCHAR(500),
        sold BOOLEAN DEFAULT FALSE,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_items_listing_id ON items(listing_id)
    `)
    
    console.log('✅ Tables created')
  } catch (error) {
    console.error('❌ Error creating tables:', error.message)
  }
}

const seedTestData = async () => {
  try {
    console.log('🌱 Seeding test data...')
    
    // Create test user
    const userResult = await pool.query(`
      INSERT INTO users (githubid, username, avatarurl, accesstoken)
      VALUES (12345, 'testuser', 'https://avatars.githubusercontent.com/u/12345', 'test_token')
      ON CONFLICT (githubid) DO NOTHING
      RETURNING id
    `)
    
    if (userResult.rows.length === 0) {
      const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', ['testuser'])
      if (existingUser.rows.length === 0) {
        console.log('⚠️  Could not create or find test user')
        return
      }
      var userId = existingUser.rows[0].id
    } else {
      var userId = userResult.rows[0].id
    }
    
    // Create Orlando-based yard sales
    const listing1 = await pool.query(`
      INSERT INTO listings (seller_id, title, description, sale_date, start_time, end_time, pickup_notes, location, latitude, longitude, is_active, photo_urls, attendee_ids)
      VALUES ($1, $2, $3, CURRENT_DATE, '08:00', '13:00', $4, $5, $6, $7, true, $8, '{}'::INTEGER[])
      RETURNING id
    `, [
      userId,
      'Moving Sale at 543 Oak Street',
      'Moving sale! High quality furniture, vintage books, gaming consoles and more. Everything must go!',
      'Loading help available. Cash preferred.',
      '543 Oak Street, Orlando, FL 32801',
      28.5402,
      -81.3816,
      ['https://placehold.co/800x600?text=Yard+Sale+1']
    ])
    const listingId1 = listing1.rows[0].id

    const listing2 = await pool.query(`
      INSERT INTO listings (seller_id, title, description, sale_date, start_time, end_time, pickup_notes, location, latitude, longitude, is_active, photo_urls, attendee_ids)
      VALUES ($1, $2, $3, CURRENT_DATE + 1, '09:00', '15:00', $4, $5, $6, $7, true, $8, '{}'::INTEGER[])
      RETURNING id
    `, [
      userId,
      'Multi-Family Garage Sale',
      'Tons of great stuff from multiple families. Books, toys, clothes, and household items.',
      'Bring your own bags. Early birds welcome!',
      '789 Maple Avenue, Orlando, FL 32803',
      28.5433,
      -81.3462,
      ['https://placehold.co/800x600?text=Yard+Sale+2']
    ])
    const listingId2 = listing2.rows[0].id

    // Add items to listing 1 (543 Oak Street)
    const listing1Items = [
      {
        title: 'Mid century dresser',
        description: 'Beautiful walnut dresser from the 1960s in excellent condition. Six spacious drawers with original hardware.',
        price: 75.00,
        condition: 'excellent',
        category: 'Furniture',
        image_url: 'https://placehold.co/400x400?text=Dresser'
      },
      {
        title: 'PlayStation 4 Bundle',
        description: 'PS4 with 2 controllers and 5 games. Everything works great! Includes all cables and original box.',
        price: 100.00,
        condition: 'good',
        category: 'Electronics',
        image_url: 'https://placehold.co/400x400?text=PS4'
      },
      {
        title: 'Vintage Book Collection',
        description: 'Set of 12 vintage hardcover books, first editions from the 1950s-60s.',
        price: 45.00,
        condition: 'excellent',
        category: 'Books',
        image_url: 'https://placehold.co/400x400?text=Books'
      },
      {
        title: 'Coffee Table',
        description: 'Modern glass coffee table with wooden legs. Minor scratches but structurally sound.',
        price: 35.00,
        condition: 'good',
        category: 'Furniture',
        image_url: 'https://placehold.co/400x400?text=Table'
      }
    ]

    for (let i = 0; i < listing1Items.length; i++) {
      const item = listing1Items[i]
      await pool.query(`
        INSERT INTO items (listing_id, category, title, description, price, condition, image_url, display_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [listingId1, item.category, item.title, item.description, item.price, item.condition, item.image_url, i])
    }

    // Add items to listing 2 (789 Maple Avenue)
    const listing2Items = [
      {
        title: 'Kids Bicycle',
        description: 'Red 16" bike with training wheels. Great condition, just outgrown.',
        price: 30.00,
        condition: 'good',
        category: 'Toys & Games',
        image_url: 'https://placehold.co/400x400?text=Bike'
      },
      {
        title: 'Kitchen Mixer',
        description: 'Stand mixer with multiple attachments. Works perfectly.',
        price: 40.00,
        condition: 'excellent',
        category: 'Kitchen',
        image_url: 'https://placehold.co/400x400?text=Mixer'
      },
      {
        title: 'Garden Tools Set',
        description: 'Complete set of garden tools including rake, shovel, and pruners.',
        price: 25.00,
        condition: 'fair',
        category: 'Tools',
        image_url: 'https://placehold.co/400x400?text=Tools'
      }
    ]

    for (let i = 0; i < listing2Items.length; i++) {
      const item = listing2Items[i]
      await pool.query(`
        INSERT INTO items (listing_id, category, title, description, price, condition, image_url, display_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [listingId2, item.category, item.title, item.description, item.price, item.condition, item.image_url, i])
    }

    // Create an extra test user to simulate neighbors attending
    const extraUserResult = await pool.query(`
      INSERT INTO users (githubid, username, avatarurl, accesstoken)
      VALUES (54321, 'bryan', 'https://i.pravatar.cc/150?img=12', 'token_bryan')
      ON CONFLICT (githubid) DO NOTHING
      RETURNING id
    `)
    let bryanId
    if (extraUserResult.rows.length === 0) {
      const existing = await pool.query('SELECT id FROM users WHERE username = $1', ['bryan'])
      bryanId = existing.rows[0].id
    } else {
      bryanId = extraUserResult.rows[0].id
    }

    // Add attendees to listing1
    await pool.query(`
      UPDATE listings SET attendee_ids = $1::INTEGER[] WHERE id = $2
    `, [[userId, bryanId], listingId1])
    
    console.log('✅ Test data seeded')
    console.log(`   - Created 2 yard sales`)
    console.log(`   - Added ${listing1Items.length} items to listing 1`)
    console.log(`   - Added ${listing2Items.length} items to listing 2`)
  } catch (error) {
    console.error('❌ Error seeding test data:', error.message)
  }
}

const resetDatabase = async () => {
  console.log('🔄 Resetting database...\n')
  await dropTables()
  await createTables()
  await seedTestData()
  console.log('\n✅ Database reset complete!')
  process.exit(0)
}

resetDatabase()