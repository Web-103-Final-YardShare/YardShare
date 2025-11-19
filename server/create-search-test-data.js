require('dotenv').config();
const pool = require('./db/pool');

async function createSearchTestData() {
  try {
    console.log('Creating search test data...\n');

    // Get all categories
    const categoriesResult = await pool.query('SELECT id, name FROM categories ORDER BY id');
    const categories = categoriesResult.rows;
    console.log(`Found ${categories.length} categories\n`);

    // Use the existing testuser from the database (created by reset.js)
    const userResult = await pool.query('SELECT id FROM users WHERE username = $1', ['testuser']);
    
    if (userResult.rows.length === 0) {
      throw new Error('No testuser found in database. Please run "npm run reset" first.');
    }
    
    const userId = userResult.rows[0].id;
    console.log(`Using user ID: ${userId}\n`);

    // 1. STAR WARS SALE - Items across ALL categories
    console.log('Creating Star Wars yard sale...');
    const starWarsListing = await pool.query(`
      INSERT INTO listings (seller_id, title, description, location, latitude, longitude, sale_date, start_time, end_time)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [
        userId,
        'Epic Star Wars Memorabilia Collection Sale',
        'Huge Star Wars collection! Everything from original trilogy items to modern collectibles. May the Force be with you!',
        '425 E Central Blvd, Orlando, FL 32801',  // Single location string
        28.5421,
        -81.3782,
        '2024-12-15',
        '08:00:00',
        '16:00:00'
        ]);
    const starWarsListingId = starWarsListing.rows[0].id;

    // Star Wars items across ALL categories
    const starWarsItems = [
      // Furniture
      { name: 'Death Star Coffee Table', description: 'Custom Death Star themed coffee table with LED lighting. That\'s no moon!', category: 'Furniture', price: 250, condition: 'excellent' },
      { name: 'Millennium Falcon Bookshelf', description: 'She may not look like much, but this bookshelf has it where it counts', category: 'Furniture', price: 180, condition: 'good' },
      
      // Electronics
      { name: 'R2-D2 Bluetooth Speaker', description: 'Official Star Wars R2-D2 speaker with authentic sounds and lights', category: 'Electronics', price: 75, condition: 'excellent' },
      { name: 'Darth Vader Voice Changer Helmet', description: 'Electronic helmet with voice changing technology - become the Dark Lord', category: 'Electronics', price: 120, condition: 'good' },
      
      // Clothing
      { name: 'Vintage Star Wars T-Shirt Collection', description: 'Set of 5 original trilogy shirts from the 1980s', category: 'Clothing', price: 150, condition: 'good' },
      { name: 'Jedi Robe Replica', description: 'Full Jedi robe and tunic set, screen-accurate', category: 'Clothing', price: 95, condition: 'excellent' },
      
      // Toys
      { name: 'Original Kenner Action Figures', description: '20+ vintage Star Wars action figures from 1977-1985, includes Luke, Leia, Han, Vader', category: 'Toys & Games', price: 800, condition: 'good' },
      { name: 'LEGO Star Wars Millennium Falcon Set', description: 'Complete Ultimate Collector Series Millennium Falcon with all pieces', category: 'Toys & Games', price: 650, condition: 'excellent' },
      { name: 'X-Wing Fighter Model', description: 'Large scale X-Wing with movable wings and display stand', category: 'Toys & Games', price: 45, condition: 'excellent' },
      
      // Books
      { name: 'Star Wars Expanded Universe Book Collection', description: '30+ Star Wars novels including Thrawn Trilogy and New Jedi Order series', category: 'Books', price: 200, condition: 'good' },
      { name: 'The Art of Star Wars Books', description: 'Complete set of Art of Star Wars books covering all films', category: 'Books', price: 120, condition: 'excellent' },
      
      // Sports
      { name: 'Star Wars Lightsaber Dueling Set', description: 'Two dueling lightsabers with sound effects - perfect for backyard battles', category: 'Sports & Outdoors', price: 60, condition: 'good' },
      
      // Tools
      { name: 'Star Wars Multi-Tool Set', description: 'Officially licensed tool set with Star Wars designs on handles', category: 'Tools', price: 40, condition: 'excellent' },
      
      // Other
      { name: 'Star Wars Pinball Machine', description: 'Full-size arcade pinball machine featuring original trilogy artwork', category: 'Other', price: 2500, condition: 'excellent' },
      { name: 'Yoda Fountain Garden Statue', description: 'Life-size Yoda statue with working water fountain feature', category: 'Other', price: 180, condition: 'good' },
      { name: 'Star Wars Holiday Special VHS', description: 'Rare bootleg copy of the infamous 1978 Star Wars Holiday Special', category: 'Other', price: 50, condition: 'fair' }
    ];

    for (const item of starWarsItems) {
      const category = categories.find(c => c.name === item.category);
      await pool.query(`
        INSERT INTO items (listing_id, category_id, title, description, price, condition)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [starWarsListingId, category.id, item.name, item.description, item.price, item.condition.toLowerCase()]);
    }
    console.log(`Created ${starWarsItems.length} Star Wars items across all categories\n`);

    // 2. WORLD WAR 2 ITEMS - NO "war" in title
    console.log('Creating historical collectibles listing...');
    const ww2Listing = await pool.query(`
      INSERT INTO listings (seller_id, title, description, location, latitude, longitude, sale_date, start_time, end_time)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [
    userId,
    'Historical Military Collectibles Estate Sale',
    'Estate sale featuring authentic 1940s military memorabilia and historical items from the Greatest Generation',
    '151 E Welbourne Ave, Winter Park, FL 32789',  // Combined into single location
    28.5945,
    -81.3523,
    '2024-12-16',
    '09:00:00',
    '15:00:00'
    ]);
    const ww2ListingId = ww2Listing.rows[0].id;

    const ww2Items = [
      { name: 'WWII US Army Helmet', description: 'Authentic World War 2 M1 helmet with original liner and chinstrap', category: 'Other', price: 200, condition: 'good' },
      { name: 'World War II Propaganda Posters', description: 'Collection of 10 original war-time posters including "Rosie the Riveter"', category: 'Other', price: 350, condition: 'good' },
      { name: '1940s Field Radio', description: 'Working WWII-era military field radio used in the European theater of war', category: 'Electronics', price: 450, condition: 'fair' },
      { name: 'War Ration Books and Stamps', description: 'Complete set of World War 2 civilian ration books with unused stamps', category: 'Books', price: 80, condition: 'good' },
      { name: 'Military Medals and Decorations', description: 'Collection of WWII service medals including Purple Heart and Bronze Star from war veteran', category: 'Other', price: 600, condition: 'excellent' },
      { name: 'Leather Flight Jacket', description: 'Original World War Two bomber jacket with squadron patches', category: 'Clothing', price: 800, condition: 'good' },
      { name: 'War-Time Letters Collection', description: 'Bundle of 50+ letters written from the front lines during the war', category: 'Books', price: 150, condition: 'fair' }
    ];

    for (const item of ww2Items) {
      const category = categories.find(c => c.name === item.category);
      await pool.query(`
        INSERT INTO items (listing_id, category_id, title, description, price, condition)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [ww2ListingId, category.id, item.name, item.description, item.price, item.condition.toLowerCase()]);    }
    console.log(`Created ${ww2Items.length} WW2 items (no "war" in listing title)\n`);

    // 3. MIXED ITEMS WITH ASTRONOMY
    console.log('Creating mixed items listing...');
    const mixedListing = await pool.query(`
      INSERT INTO listings (seller_id, title, description, location, latitude, longitude, sale_date, start_time, end_time)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [
      userId,
      'Moving Sale - Everything Must Go!',
      'Downsizing sale with variety of household items, collectibles, and hobby equipment',
      '7300 Sand Lake Rd, Orlando,FL, 32819',
      28.4556,
      -81.4523,
      '2024-12-14',
      '07:00:00',
      '14:00:00'
    ]);
    const mixedListingId = mixedListing.rows[0].id;

    const mixedItems = [
      // THE ASTRONOMY ITEM with "star" in it
      { name: 'Professional Telescope with Star Tracking', description: 'Celestron telescope with computerized star tracking and GPS. Perfect for viewing stars, planets, and deep space objects. Includes star charts and astronomy guide.', category: 'Other', price: 450, condition: 'excellent' },
      { name: 'Vintage Record Player', description: 'Working 1970s turntable with built-in speakers', category: 'Electronics', price: 85, condition: 'good' },
      { name: 'Leather Sofa Set', description: 'Brown leather 3-piece sofa set, minor wear', category: 'Furniture', price: 400, condition: 'good' },
      { name: 'Kitchen Appliance Bundle', description: 'Blender, toaster, coffee maker - all working', category: 'Electronics', price: 60, condition: 'fair' },
      { name: 'Camping Gear Collection', description: 'Tent, sleeping bags, portable stove, and camping chairs', category: 'Sports & Outdoors', price: 150, condition: 'good' },
      { name: 'Vintage Board Game Collection', description: '20+ classic board games from the 80s and 90s', category: 'Toys & Games', price: 75, condition: 'good' },
      { name: 'Gardening Tool Set', description: 'Complete set of hand tools and power trimmer', category: 'Tools', price: 90, condition: 'excellent' },
      { name: 'Mystery Novel Collection', description: '50+ paperback mystery and thriller books', category: 'Books', price: 40, condition: 'good' }
    ];

    for (const item of mixedItems) {
      const category = categories.find(c => c.name === item.category);
      await pool.query(`
        INSERT INTO items (listing_id, category_id, title, description, price, condition)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [mixedListingId, category.id, item.name, item.description, item.price, item.condition.toLowerCase()]);
    }
    console.log(`Created ${mixedItems.length} mixed items including astronomy telescope\n`);

    console.log('✅ Search test data created successfully!\n');
    console.log('Test Scenarios:');
    console.log('1. Search "star wars" → Should return Star Wars listing with all items');
    console.log('2. Search "star" → Should return Star Wars listing AND mixed listing (telescope with star tracking)');
    console.log('3. Search "war" → Should return Star Wars listing AND WW2 listing (war in item descriptions)');
    console.log('4. Search "world war" → Should return WW2 listing items\n');
    
    await pool.end();
    
  } catch (error) {
    console.error('Error creating search test data:', error.message);
    throw error;
  }
}

createSearchTestData();
