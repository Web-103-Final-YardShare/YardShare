#!/bin/bash
# Frontend refactoring script for database schema updates

echo "🔄 Applying frontend updates for new database schema..."

# Update SavedPage.jsx - photo helper
sed -i "1i import { getPrimaryPhotoUrl } from '../utils/photoHelpers';" /home/user/YardShare/client/src/components/SavedPage.jsx
sed -i 's/const photos = listing\.photos || \[\]/const photoUrl = getPrimaryPhotoUrl(listing.photos)/g' /home/user/YardShare/client/src/components/SavedPage.jsx
sed -i 's/if (Array\.isArray(photos) && photos\.length > 0) {\s*return photos\[0\]\s*}/return photoUrl/g' /home/user/YardShare/client/src/components/SavedPage.jsx

# Update MySalesPage.jsx - photo helper
sed -i "3i import { getPrimaryPhotoUrl } from '../utils/photoHelpers';" /home/user/YardShare/client/src/components/MySalesPage.jsx

# Update ItemCard.jsx - backend now returns category_name via JOIN
sed -i 's/const cat = item\.category || item\.category_name || null/const cat = item.category_name || null/g' /home/user/YardShare/client/src/components/ItemCard.jsx

# Update ItemDetailPage.jsx - same for category
sed -i 's/const category = item\.category || item\.category_name || null/const category = item.category_name || null/g' /home/user/YardShare/client/src/components/ItemDetailPage.jsx

echo "✅ Frontend updates applied!"
echo "⚠️  Note: Some files need manual review (ListingDetailPage, App.jsx)"
