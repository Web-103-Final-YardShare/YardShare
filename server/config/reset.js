require('dotenv').config()
const pool = require('../db/pool')

const dropTables = async () => {
  try {
    console.log('🗑️  Dropping tables...')
    await pool.query('DROP TABLE IF EXISTS listing_photos CASCADE')
    await pool.query('DROP TABLE IF EXISTS favorites CASCADE')
    await pool.query('DROP TABLE IF EXISTS items CASCADE') // Add this
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
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

    // Items table (individual items in yard sales)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        condition VARCHAR(20) NOT NULL CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),
        image_url VARCHAR(500),
        sold BOOLEAN DEFAULT FALSE,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_items_listing_id ON items(listing_id)
    `)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id)
    `)

    // Listing photos table (for the yard sale itself, not individual items)
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
    
    // Favorites table (for favoriting yard sales)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
        favorited_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (user_id, listing_id)
      )
    `)
    
      // Check-ins / Attendances table (neighbors attending a sale)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS checkins (
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
          checked_in_at TIMESTAMP DEFAULT NOW(),
          PRIMARY KEY (user_id, listing_id)
        )
      `)
    
    // Item favorites table (for favoriting individual items)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS item_favorites (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        favorited_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (user_id, item_id)
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
    const categories = await pool.query('SELECT id, name FROM categories')
    const categoryMap = {}
    categories.rows.forEach(cat => {
      categoryMap[cat.name] = cat.id
    })
    
    // Create Orlando-based yard sales
    const listing1 = await pool.query(`
      INSERT INTO listings (seller_id, title, description, sale_date, start_time, end_time, pickup_notes, location, latitude, longitude, is_active)
      VALUES ($1, $2, $3, CURRENT_DATE, '08:00', '13:00', $4, $5, $6, $7, true)
      RETURNING id
    `, [
      userId,
      'Moving Sale at 543 Oak Street',
      'Moving sale! High quality furniture, vintage books, gaming consoles and more. Everything must go!',
      'Loading help available. Cash preferred.',
      '543 Oak Street, Orlando, FL 32801',
      28.5402,
      -81.3816
    ])
    const listingId1 = listing1.rows[0].id

    const listing2 = await pool.query(`
      INSERT INTO listings (seller_id, title, description, sale_date, start_time, end_time, pickup_notes, location, latitude, longitude, is_active)
      VALUES ($1, $2, $3, CURRENT_DATE + 1, '09:00', '15:00', $4, $5, $6, $7, true)
      RETURNING id
    `, [
      userId,
      'Multi-Family Garage Sale',
      'Tons of great stuff from multiple families. Books, toys, clothes, and household items.',
      'Bring your own bags. Early birds welcome!',
      '789 Maple Avenue, Orlando, FL 32803',
      28.5433,
      -81.3462
    ])
    const listingId2 = listing2.rows[0].id

    // Add items to listing 1 (543 Oak Street)
    const listing1Items = [
      {
        title: 'Mid century dresser',
        description: 'Beautiful walnut dresser from the 1960s in excellent condition. Six spacious drawers with original hardware.',
        price: 75.00,
        condition: 'excellent',
        category_id: categoryMap['Furniture'],
        image_url: 'https://placehold.co/400x400?text=Dresser'
      },
      {
        title: 'PlayStation 4 Bundle',
        description: 'PS4 with 2 controllers and 5 games. Everything works great! Includes all cables and original box.',
        price: 100.00,
        condition: 'good',
        category_id: categoryMap['Electronics'],
        image_url: 'https://placehold.co/400x400?text=PS4'
      },
      {
        title: 'Vintage Book Collection',
        description: 'Set of 12 vintage hardcover books, first editions from the 1950s-60s.',
        price: 45.00,
        condition: 'excellent',
        category_id: categoryMap['Books'],
        image_url: 'https://placehold.co/400x400?text=Books'
      },
      {
        title: 'Coffee Table',
        description: 'Modern glass coffee table with wooden legs. Minor scratches but structurally sound.',
        price: 35.00,
        condition: 'good',
        category_id: categoryMap['Furniture'],
        image_url: 'https://placehold.co/400x400?text=Table'
      }
    ]

    for (let i = 0; i < listing1Items.length; i++) {
      const item = listing1Items[i]
      await pool.query(`
        INSERT INTO items (listing_id, category_id, title, description, price, condition, image_url, display_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [listingId1, item.category_id, item.title, item.description, item.price, item.condition, item.image_url, i])
    }

    // Add items to listing 2 (789 Maple Avenue)
    const listing2Items = [
      {
        title: 'Kids Bicycle',
        description: 'Red 16" bike with training wheels. Great condition, just outgrown.',
        price: 30.00,
        condition: 'good',
        category_id: categoryMap['Toys & Games'],
        image_url: 'https://placehold.co/400x400?text=Bike'
      },
      {
        title: 'Kitchen Mixer',
        description: 'Stand mixer with multiple attachments. Works perfectly.',
        price: 40.00,
        condition: 'excellent',
        category_id: categoryMap['Kitchen'],
        image_url: 'https://placehold.co/400x400?text=Mixer'
      },
      {
        title: 'Garden Tools Set',
        description: 'Complete set of garden tools including rake, shovel, and pruners.',
        price: 25.00,
        condition: 'fair',
        category_id: categoryMap['Tools'],
        image_url: 'https://placehold.co/400x400?text=Tools'
      }
    ]

    for (let i = 0; i < listing2Items.length; i++) {
      const item = listing2Items[i]
      await pool.query(`
        INSERT INTO items (listing_id, category_id, title, description, price, condition, image_url, display_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [listingId2, item.category_id, item.title, item.description, item.price, item.condition, item.image_url, i])
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

    // Seed some checkins: test user and bryan attending listing1
    await pool.query(`INSERT INTO checkins (user_id, listing_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [userId, listingId1])
    await pool.query(`INSERT INTO checkins (user_id, listing_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [bryanId, listingId1])
    
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
  await seedCategories()
  await seedTestData()
  console.log('\n✅ Database reset complete!')
  process.exit(0)
}

resetDatabase()