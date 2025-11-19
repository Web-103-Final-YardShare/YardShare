require('dotenv').config();
const pool = require('./db/pool');

// Actual commercial/public addresses within 10 miles of Orlando, FL
const addresses = [
  { street: '8001 S Orange Blossom Trail', city: 'Orlando', state: 'FL', zip: '32809', lat: 28.4456, lng: -81.3856 },
  { street: '5483 W Colonial Drive', city: 'Orlando', state: 'FL', zip: '32808', lat: 28.5558, lng: -81.4456 },
  { street: '7600 Dr Phillips Blvd', city: 'Orlando', state: 'FL', zip: '32819', lat: 28.4525, lng: -81.4856 },
  { street: '4012 Central Florida Pkwy', city: 'Orlando', state: 'FL', zip: '32837', lat: 28.3925, lng: -81.4625 },
  { street: '1800 N Alafaya Trail', city: 'Orlando', state: 'FL', zip: '32826', lat: 28.5825, lng: -81.2056 }
];

const listings = [
  {
    title: 'Huge Moving Sale - Everything Must Go!',
    description: 'Selling everything before our big move. Furniture, electronics, books, and more!',
    address: addresses[0],
    items: [
      { title: 'Leather Sofa', description: 'Brown leather 3-seater', price: '150.00', category: 'Furniture', condition: 'good' },
      { title: 'Coffee Table', description: 'Modern glass top', price: '45.00', category: 'Furniture', condition: 'excellent' },
      { title: 'HP Laptop', description: '15 inch, works great', price: '200.00', category: 'Electronics', condition: 'good' },
      { title: 'Bookshelf', description: 'Wooden 5-shelf unit', price: '35.00', category: 'Furniture', condition: 'fair' }
    ]
  },
  {
    title: 'Estate Sale - Antiques and Collectibles',
    description: 'Beautiful estate sale featuring vintage items and quality furniture',
    address: addresses[1],
    items: [
      { title: 'Vintage Dresser', description: 'Oak 6-drawer dresser from 1950s', price: '180.00', category: 'Furniture', condition: 'good' },
      { title: 'Tool Set', description: 'Complete mechanics tool set', price: '75.00', category: 'Tools', condition: 'excellent' },
      { title: 'Kitchen Aid Mixer', description: 'Red stand mixer', price: '125.00', category: 'Kitchen', condition: 'excellent' },
      { title: 'Garden Tools', description: 'Shovels, rakes, pruners', price: '30.00', category: 'Home & Garden', condition: 'good' }
    ]
  },
  {
    title: 'Kids Toys and Clothing Sale',
    description: 'Gently used toys, games, and clothing for kids',
    address: addresses[2],
    items: [
      { title: 'LEGO Sets', description: 'Various complete sets', price: '40.00', category: 'Toys', condition: 'excellent' },
      { title: 'Kids Bike', description: '16 inch with training wheels', price: '45.00', category: 'Sports & Outdoors', condition: 'good' },
      { title: 'Kids Clothes Bundle', description: 'Size 5-7, mixed items', price: '25.00', category: 'Clothing', condition: 'good' },
      { title: 'Board Games', description: 'Monopoly, Scrabble, more', price: '15.00', category: 'Toys', condition: 'good' }
    ]
  },
  {
    title: 'Tech and Electronics Garage Sale',
    description: 'Upgrading our home - selling electronics and gadgets',
    address: addresses[3],
    items: [
      { title: 'Samsung Smart TV', description: '42 inch LED', price: '250.00', category: 'Electronics', condition: 'excellent' },
      { title: 'iPad Air', description: '64GB, WiFi only', price: '275.00', category: 'Electronics', condition: 'excellent' },
      { title: 'Bluetooth Speaker', description: 'JBL Charge 4', price: '60.00', category: 'Electronics', condition: 'good' },
      { title: 'Gaming Chair', description: 'Ergonomic with lumbar support', price: '85.00', category: 'Furniture', condition: 'good' }
    ]
  },
  {
    title: 'Books and Kitchen Items Sale',
    description: 'Downsizing - tons of books and kitchen supplies',
    address: addresses[4],
    items: [
      { title: 'Classic Novels Bundle', description: '20+ hardcover classics', price: '35.00', category: 'Books', condition: 'good' },
      { title: 'Cookbook Collection', description: '15 cookbooks various cuisines', price: '25.00', category: 'Books', condition: 'excellent' },
      { title: 'Pots and Pans Set', description: 'Stainless steel 10-piece', price: '55.00', category: 'Kitchen', condition: 'good' },
      { title: 'Dinner Plates Set', description: 'Service for 8, white ceramic', price: '40.00', category: 'Kitchen', condition: 'excellent' }
    ]
  }
];

async function createListings() {
  console.log('Creating test listings with items...\n');
  
  // First, get the first user ID from the database
  const userResult = await pool.query('SELECT id FROM users LIMIT 1');
  if (userResult.rows.length === 0) {
    console.error('No users found in database. Please create a user first.');
    process.exit(1);
  }
  const sellerId = userResult.rows[0].id;
  console.log(`Using seller_id: ${sellerId}\n`);
  
  // Get category mappings
  const categoriesResult = await pool.query('SELECT id, name FROM categories');
  const categoryMap = {};
  categoriesResult.rows.forEach(cat => {
    categoryMap[cat.name] = cat.id;
  });
  
  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    const addr = listing.address;
    
    try {
      const location = `${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`;
      
      console.log(`Creating: ${listing.title}`);
      console.log(`Location: ${location}`);
      console.log(`Items: ${listing.items.length}`);
      
      // Insert listing
      const listingResult = await pool.query(
        `INSERT INTO listings (seller_id, title, description, location, latitude, longitude, sale_date, start_time, end_time, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
         RETURNING id`,
        [sellerId, listing.title, listing.description, location, addr.lat, addr.lng, '2025-11-23', '08:00', '14:00']
      );
      
      const listingId = listingResult.rows[0].id;
      console.log(`✅ Created listing #${listingId}`);
      
      // Insert items
      for (const item of listing.items) {
        const categoryId = categoryMap[item.category];
        if (!categoryId) {
          console.log(`⚠️  Category not found: ${item.category}, skipping item: ${item.title}`);
          continue;
        }
        
        await pool.query(
          `INSERT INTO items (listing_id, title, description, price, category_id, condition, sold)
           VALUES ($1, $2, $3, $4, $5, $6, false)`,
          [listingId, item.title, item.description, item.price, categoryId, item.condition]
        );
        console.log(`  ✓ Added item: ${item.title}`);
      }
      
      console.log('');
      
    } catch (error) {
      console.error(`❌ Error creating listing: ${error.message}\n`);
    }
  }
  
  console.log('Done! Created 5 listings with 20 total items across multiple categories.');
  process.exit(0);
}

createListings().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
