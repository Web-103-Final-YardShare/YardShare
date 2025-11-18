# Frontend Migration Status

## Completed Backend Refactoring ✅
All backend controllers and database schema have been updated to use the new normalized structure:
- ✅ user_profiles table
- ✅ categories table with FKs
- ✅ listing_photos table
- ✅ favorites/item_favorites junction tables
- ✅ All controllers updated

## Completed Frontend Updates ✅

### 1. Photo Helper Utility (`client/src/utils/photoHelpers.js`)
- ✅ Created utility functions to handle both legacy (string array) and new (object array) photo formats
- ✅ `getPrimaryPhotoUrl()` - Gets primary photo or first photo by position
- ✅ `getAllPhotoUrls()` - Gets all photos sorted by position
- ✅ Backwards compatible with existing data

### 2. SalesList Component (`client/src/components/SalesList.jsx`)
- ✅ Updated to use `getPrimaryPhotoUrl()` helper
- ✅ Removed all check-in/check-out functionality (backend feature disabled)
- ✅ Removed state: `checking`, `localCheckInCount`, `isCheckedIn`, `localCheckedInUsers`
- ✅ Removed function: `handleCheckIn()`
- ✅ Removed UI: "Who's Going" section
- ✅ Categories handling already correct (uses `item_categories` from backend)

### 3. SavedPage Component (`client/src/components/SavedPage.jsx`)
- ✅ Updated to use `getPrimaryPhotoUrl()` helper
- ✅ Updated `getPrimaryPhoto()` function to handle new format
- ✅ Favorites API calls work correctly with new junction table backend

## Remaining Frontend Work 🚧

### HIGH PRIORITY (Core Functionality)

#### 1. ListingDetailPage (`client/src/components/ListingDetailPage.jsx`)
**Status:** ❌ Not Started
**Changes Needed:**
- Import and use `getPrimaryPhotoUrl()` for photos (line ~306-309)
- Remove check-in functionality:
  - State variables (lines 20-23): `showConfirmModal`, `checkingIn`, `isCheckedIn`
  - `useEffect` for check-in status (lines 39-45)
  - `handleCheckIn()` and `confirmCheckIn()` functions (lines 78-136)
  - "Who's Going" UI section (lines 383-407)
  - Check-in confirmation modal (lines 461-494)
- Update favorites handling if needed (backend returns junction table data)

**Code Pattern:**
```javascript
// OLD
const photoUrl = (Array.isArray(listing.photos) && listing.photos.length > 0)
  ? listing.photos[0]
  : listing.image_url || 'https://placehold.co/800x400?text=No+Image'

// NEW
import { getPrimaryPhotoUrl } from '../utils/photoHelpers';
const photoUrl = getPrimaryPhotoUrl(listing.photos, listing.image_url || 'https://placehold.co/800x400?text=No+Image')
```

#### 2. MySalesPage (`client/src/components/MySalesPage.jsx`)
**Status:** ❌ Not Started
**Changes Needed:**
- Import and use `getPrimaryPhotoUrl()` (lines 103-106)
- Handle new photo object structure in edit form (lines 124-126, 184)
- Update photo display to work with `{id, url, is_primary, position}` format
- Categories already use `category_id` correctly ✅

**Code Pattern:**
```javascript
// Photo display in list
const photoUrl = getPrimaryPhotoUrl(listing.photos, listing.image_url)

// Photo display in edit view - show thumbnails with primary indicator
{(l.photos || []).map((p, i) => (
  <img
    key={p.id || i}
    src={p.url}
    className={`w-12 h-12 object-cover rounded ${p.is_primary ? 'ring-2 ring-emerald-500' : ''}`}
  />
))}
```

#### 3. ItemCard & ItemDetailPage (Category Handling)
**Status:** ❌ Not Started
**Files:**
- `client/src/components/ItemCard.jsx` (lines 55-75)
- `client/src/components/ItemDetailPage.jsx` (lines 185-200)

**Changes Needed:**
```javascript
// OLD
const cat = item.category || item.category_name || null

// NEW (backend returns category_name via JOIN)
const cat = item.category_name || null
```

#### 4. App.jsx (Favorites Handling)
**Status:** ❌ Not Started
**Location:** Lines 42-113
**Changes Needed:**
- Backend now returns full listing objects with JOINs (should work as-is)
- Verify favorites array structure matches expected format
- May need to update `toggleFavorite()` if response format changed

### MEDIUM PRIORITY (Feature Enhancement)

#### 5. FilterDialog (`client/src/components/FilterDialog.jsx`)
**Status:** ❌ Not Started
**Location:** Lines 12-19
**Changes Needed:**
```javascript
// OLD (hardcoded)
const categories = ['Furniture', 'Electronics', ...];

// NEW (fetch from API)
const [categories, setCategories] = useState([]);
useEffect(() => {
  fetch(`${API_BASE}/api/categories`)
    .then(res => res.json())
    .then(data => setCategories(data.map(c => c.name)));
}, []);
```

#### 6. MapView (`client/src/components/MapView.jsx`)
**Status:** ⚠️ Minor Update
**Location:** Line 76
**Changes Needed:**
- Verify `category_name` is returned by backend (should be via JOIN)
- If backend returns `category_id` only, may need to fetch category name

### LOW PRIORITY (Future Features)

#### 7. ProfilePage (`client/src/components/ProfilePage.jsx`)
**Status:** 🆕 New Feature Needed
**Current:** Placeholder only
**Changes Needed:**
- Create complete profile page
- Display bio and phone from `user_profiles` table
- Add edit functionality
- Form validation

**Implementation:**
```javascript
// Fetch user profile
const res = await fetch(`${API_BASE}/api/users/${userId}/profile`);
const profile = await res.json();

// Display bio, phone, preferred_contact
// Add edit form with PUT to /api/users/profile
```

**Note:** Requires new backend endpoint `/api/users/profile` (not yet implemented)

## Testing Checklist

- [ ] Create a new yard sale with photos
- [ ] Edit existing yard sale
- [ ] View yard sale details (no check-in button should appear)
- [ ] Favorite/unfavorite listings
- [ ] Favorite/unfavorite items
- [ ] View saved listings page
- [ ] Filter by categories
- [ ] Search listings
- [ ] View map with listings
- [ ] Create items with categories
- [ ] Edit items

## API Endpoints That Changed

### Photos
- **GET /api/listings** - Now returns `photos` as JSON array of objects instead of string array
- **GET /api/listings/:id** - Same
- **GET /api/favorites** - Same

### Check-ins (Disabled)
- **POST /api/listings/:id/checkin** - Returns 501 (Not Implemented)
- **DELETE /api/listings/:id/checkin** - Returns 501 (Not Implemented)

### Categories
- **GET /api/categories** - Working correctly
- Items and listings now return `category_name` via SQL JOIN

### Favorites
- **GET /api/favorites** - Returns full listing objects (with JOINs)
- **GET /api/favorites/items** - Returns full item objects (with JOINs)
- Backend uses junction tables but returns complete objects for frontend convenience

## Backwards Compatibility

The photo helper utilities support both formats:
- ✅ Legacy: `photos: ["url1", "url2"]`
- ✅ New: `photos: [{id: 1, url: "url1", is_primary: true, position: 0}]`

This allows gradual migration and prevents breaking existing listings.

## Next Steps

1. Update ListingDetailPage (remove check-ins, update photos)
2. Update MySalesPage (photo handling)
3. Update ItemCard/ItemDetailPage (category handling)
4. Test all functionality
5. Update FilterDialog to fetch categories from API
6. Consider implementing ProfilePage (requires backend endpoint)

## Files Not Requiring Changes

- ✅ CreateSalePage.jsx - Already uses `category_id`
- ✅ HomePage.jsx - Just passes props
- ✅ Header.jsx - No schema-dependent code
- ✅ AuthPage.jsx - GitHub OAuth unchanged
- ✅ All utility components (Button, Badge, Input, etc.)
