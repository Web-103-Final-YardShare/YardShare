-- Updated SQL with verified working image URLs from Pexels and Unsplash

-- Update listing photos (800px width)
UPDATE listing_photos SET url = 'https://images.pexels.com/photos/7621136/pexels-photo-7621136.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE listing_id = 1;

UPDATE listing_photos SET url = 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800' WHERE listing_id = 2;

UPDATE listing_photos SET url = 'https://images.unsplash.com/photo-1601814933824-fd0b574dd592?w=800' WHERE listing_id = 3;

UPDATE listing_photos SET url = 'https://images.unsplash.com/photo-1585751119317-84f2be349b32?w=800' WHERE listing_id = 4;

UPDATE listing_photos SET url = 'https://images.pexels.com/photos/4246120/pexels-photo-4246120.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE listing_id = 5;

 

-- Update item photos - Listing 1 items
UPDATE items SET image_url = 'https://images.unsplash.com/photo-1551554781-c46200ea959d?w=600' WHERE listing_id = 1 AND title = 'Mid century dresser';

UPDATE items SET image_url = 'https://images.pexels.com/photos/687811/pexels-photo-687811.jpeg?auto=compress&cs=tinysrgb&w=600' WHERE listing_id = 1 AND title = 'PlayStation 4 Bundle';

UPDATE items SET image_url = 'https://images.pexels.com/photos/207662/pexels-photo-207662.jpeg?auto=compress&cs=tinysrgb&w=600' WHERE listing_id = 1 AND title = 'Vintage Book Collection';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1551516594-56cb78394645?w=600' WHERE listing_id = 1 AND title = 'Coffee Table';

 

-- Listing 2 items
UPDATE items SET image_url = 'https://images.unsplash.com/photo-1610641364934-e6c8f2f5e5b6?w=600' WHERE listing_id = 2 AND title = 'Kids Bicycle';

UPDATE items SET image_url = 'https://images.pexels.com/photos/1450903/pexels-photo-1450903.jpeg?auto=compress&cs=tinysrgb&w=600' WHERE listing_id = 2 AND title = 'Kitchen Mixer';

UPDATE items SET image_url = 'https://images.pexels.com/photos/6231819/pexels-photo-6231819.jpeg?auto=compress&cs=tinysrgb&w=600' WHERE listing_id = 2 AND title = 'Garden Tools Set';

 

-- Listing 3 items (Star Wars)
UPDATE items SET image_url = 'https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?w=600' WHERE listing_id = 3 AND title = 'Death Star Coffee Table';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1608889335941-32ac5f2041b9?w=600' WHERE listing_id = 3 AND title = 'Millennium Falcon Bookshelf';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1609781795038-2d2f2f41e1d2?w=600' WHERE listing_id = 3 AND title = 'R2-D2 Bluetooth Speaker';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1608889476561-6242cfdbf622?w=600' WHERE listing_id = 3 AND title = 'Darth Vader Voice Changer Helmet';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600' WHERE listing_id = 3 AND title = 'Vintage Star Wars T-Shirt Collection';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1601814933824-fd0b574dd592?w=600' WHERE listing_id = 3 AND title = 'Jedi Robe Replica';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?w=600' WHERE listing_id = 3 AND title = 'Original Kenner Action Figures';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1608889335941-32ac5f2041b9?w=600' WHERE listing_id = 3 AND title = 'LEGO Star Wars Millennium Falcon Set';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1608889825271-bbc2d0451d0d?w=600' WHERE listing_id = 3 AND title = 'X-Wing Fighter Model';

UPDATE items SET image_url = 'https://images.pexels.com/photos/2908984/pexels-photo-2908984.jpeg?w=600' WHERE listing_id = 3 AND title = 'Star Wars Expanded Universe Book Collection';

UPDATE items SET image_url = 'https://images.pexels.com/photos/2177482/pexels-photo-2177482.jpeg?w=600' WHERE listing_id = 3 AND title = 'The Art of Star Wars Books';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1620562864792-c6c4c99a2e61?w=600' WHERE listing_id = 3 AND title = 'Star Wars Lightsaber Dueling Set';

UPDATE items SET image_url = 'https://images.pexels.com/photos/8985454/pexels-photo-8985454.jpeg?w=600' WHERE listing_id = 3 AND title = 'Star Wars Multi-Tool Set';

UPDATE items SET image_url = 'https://images.pexels.com/photos/2908281/pexels-photo-2908281.jpeg?w=600' WHERE listing_id = 3 AND title = 'Star Wars Pinball Machine';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1682695796497-31a44224d6d6?w=600' WHERE listing_id = 3 AND title = 'Yoda Fountain Garden Statue';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1611589823943-8b056a1e0c7e?w=600' WHERE listing_id = 3 AND title = 'Star Wars Holiday Special VHS';

 

-- Listing 4 items (WWII)
UPDATE items SET image_url = 'https://images.pexels.com/photos/7474244/pexels-photo-7474244.jpeg?auto=compress&cs=tinysrgb&w=600' WHERE listing_id = 4 AND title = 'WWII US Army Helmet';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1615887824928-efe12fddb2b6?w=600' WHERE listing_id = 4 AND title = 'World War II Propaganda Posters';

UPDATE items SET image_url = 'https://images.pexels.com/photos/27850572/pexels-photo-27850572.jpeg?auto=compress&cs=tinysrgb&w=600' WHERE listing_id = 4 AND title = '1940s Field Radio';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1583946099379-f9c9cb8bc030?w=600' WHERE listing_id = 4 AND title = 'War Ration Books and Stamps';

UPDATE items SET image_url = 'https://images.pexels.com/photos/8535230/pexels-photo-8535230.jpeg?auto=compress&cs=tinysrgb&w=600' WHERE listing_id = 4 AND title = 'Military Medals and Decorations';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600' WHERE listing_id = 4 AND title = 'Leather Flight Jacket';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?w=600' WHERE listing_id = 4 AND title = 'War-Time Letters Collection';

 

-- Listing 5 items (Mixed)
UPDATE items SET image_url = 'https://images.unsplash.com/photo-1543722530-d2c3201371e7?w=600' WHERE listing_id = 5 AND title = 'Professional Telescope with Star Tracking';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1526925712774-5d8c7a89a7d5?w=600' WHERE listing_id = 5 AND title = 'Vintage Record Player';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600' WHERE listing_id = 5 AND title = 'Leather Sofa Set';

UPDATE items SET image_url = 'https://images.pexels.com/photos/4686956/pexels-photo-4686956.jpeg?auto=compress&cs=tinysrgb&w=600' WHERE listing_id = 5 AND title = 'Kitchen Appliance Bundle';

UPDATE items SET image_url = 'https://images.pexels.com/photos/1687845/pexels-photo-1687845.jpeg?auto=compress&cs=tinysrgb&w=600' WHERE listing_id = 5 AND title = 'Camping Gear Collection';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=600' WHERE listing_id = 5 AND title = 'Vintage Board Game Collection';

UPDATE items SET image_url = 'https://images.pexels.com/photos/4505174/pexels-photo-4505174.jpeg?auto=compress&cs=tinysrgb&w=600' WHERE listing_id = 5 AND title = 'Gardening Tool Set';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600' WHERE listing_id = 5 AND title = 'Mystery Novel Collection';