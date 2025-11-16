require('dotenv').config()
const pool = require('../db/pool')

const dropTables = async () => {
  try {
    console.log('🗑️  Dropping tables...')
    await pool.query('DROP TABLE IF EXISTS listing_photos CASCADE')
    await pool.query('DROP TABLE IF EXISTS favorites CASCADE')
    await pool.query('DROP TABLE IF EXISTS listings CASCADE')
    await pool.query('DROP TABLE IF EXISTS categories CASCADE')
    await pool.query('DROP TABLE IF EXISTS user_profiles CASCADE')
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
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    
    // User profiles table (one-to-one relationship)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        bio TEXT,
        phone VARCHAR(20),
        preferred_contact VARCHAR(50) DEFAULT 'messages',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)
    
    // Categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE
      )
    `)
    
    // Listings table 
    await pool.query(`
      CREATE TABLE IF NOT EXISTS listings (
        id SERIAL PRIMARY KEY,
        seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) DEFAULT 0,
        is_available BOOLEAN DEFAULT true,
        pickup_notes TEXT,
        location VARCHAR(255),
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

    // Listing photos table 
    await pool.query(`
      CREATE TABLE IF NOT EXISTS listing_photos (
        id SERIAL PRIMARY KEY,
        listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
        url VARCHAR(500),
        data BYTEA,
        mime_type VARCHAR(100),
        is_primary BOOLEAN DEFAULT FALSE,
        position INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_primary_photo_per_listing
      ON listing_photos (listing_id)
      WHERE is_primary
    `)
    
    // Favorites table 
    await pool.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
        favorited_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (user_id, listing_id)
      )
    `)
    
    console.log('✅ Tables created')
  } catch (error) {
    console.error('❌ Error creating tables:', error.message)
  }
}

const seedCategories = async () => {
  try {
    console.log('🌱 Seeding categories...')
    const categories = [
      'Furniture',
      'Electronics',
      'Tools',
      'Clothing',
      'Books',
      'Toys & Games',
      'Sports & Outdoors',
      'Home & Garden',
      'Kitchen',
      'Other'
    ]
    
    for (const name of categories) {
      await pool.query(
        'INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [name]
      )
    }
    console.log('✅ Categories seeded')
  } catch (error) {
    console.error('❌ Error seeding categories:', error.message)
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
      // User already exists, fetch it
      const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', ['testuser'])
      if (existingUser.rows.length === 0) {
        console.log('⚠️  Could not create or find test user')
        return
      }
      var userId = existingUser.rows[0].id
    } else {
      var userId = userResult.rows[0].id
    }
    
    // Get category IDs
    const furnitureResult = await pool.query('SELECT id FROM categories WHERE name = $1', ['Furniture'])
    const electronicsResult = await pool.query('SELECT id FROM categories WHERE name = $1', ['Electronics'])
    
    const furnitureId = furnitureResult.rows[0]?.id
    const electronicsId = electronicsResult.rows[0]?.id
    
    // Create Orlando-based test listings (with coordinates)
    const listings = [
      {
        title: 'Downtown Yard Sale - Furniture',
        description: 'Moving sale! Sofa, end tables, and lamps in good condition.',
        price: 120.00,
        category_id: furnitureId,
        pickup_notes: 'Loading help available. Cash preferred.',
        location: '200 S Orange Ave, Orlando, FL 32801',
        latitude: 28.5402,
        longitude: -81.3816,
        image_url: 'https://placehold.co/600x400?text=Furniture+Sale'
      },
      {
        title: 'Lake Eola Electronics',
        description: 'Selling keyboards, monitors, and small gadgets. All tested.',
        price: 85.00,
        category_id: electronicsId,
        pickup_notes: 'Text on arrival. Street parking nearby.',
        location: '400 E Central Blvd, Orlando, FL 32801',
        latitude: 28.5436,
        longitude: -81.3733,
        image_url: 'https://placehold.co/600x400?text=Electronics'
      },
      {
        title: 'Metrowest Multi-family Sale',
        description: 'Tools, sports gear, kids toys, and books. Priced to move!',
        price: 0,
        category_id: furnitureId,
        pickup_notes: 'Please bring small bills. First-come, first-served.',
        location: '2415 S Hiawassee Rd, Orlando, FL 32835',
        latitude: 28.5108,
        longitude: -81.4767,
        image_url: 'https://placehold.co/600x400?text=Yard+Sale'
      },
      {
        title: 'Milk District Porch Pickup',
        description: 'Kitchen items and decor. Gently used, smoke-free home.',
        price: 25.00,
        category_id: furnitureId,
        pickup_notes: 'Porch pickup only. Message for bundle deals.',
        location: '2432 E Robinson St, Orlando, FL 32803',
        latitude: 28.5433,
        longitude: -81.3462,
        image_url: 'https://placehold.co/600x400?text=Home+%26+Kitchen'
      }
    ]

    for (const l of listings) {
      await pool.query(`
        INSERT INTO listings (seller_id, category_id, title, description, price, pickup_notes, location, latitude, longitude, image_url, is_available)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
      `, [userId, l.category_id, l.title, l.description, l.price, l.pickup_notes, l.location, l.latitude, l.longitude, l.image_url])
    }
    
    console.log('✅ Test data seeded')
  } catch (error) {
    console.error('❌ Error seeding test data:', error.message)
  }
}

const resetDatabase = async () => {
  console.log('🔄 Resetting database...\n')
  await dropTables()
  await createTables()
  await seedCategories()
  await seedTestData()
  console.log('\n✅ Database reset complete!')
  process.exit(0)
}

resetDatabase()
