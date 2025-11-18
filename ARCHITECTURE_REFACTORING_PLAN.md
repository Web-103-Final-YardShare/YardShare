# Architecture Refactoring Plan

## Issues Identified

### 1. Item Photos Inconsistency ❌
**Problem:** Items use a single `image_url` VARCHAR field, while listings use a normalized `listing_photos` table with multiple photos, primary indicators, and positions.

**Current State:**
- Listings: `listing_photos` table with `{id, url, is_primary, position}`
- Items: Single `image_url` column in `items` table

**Impact:**
- Items cannot have multiple photos
- No primary photo selection for items
- Inconsistent data model
- Photo helpers don't work for items

### 2. Flat Component Structure ❌
**Problem:** All components are in a single flat `/components/` directory with no distinction between pages and reusable components.

**Current Structure:**
```
client/src/components/
  ├── AuthPage.jsx              (Page)
  ├── HomePage.jsx               (Page)
  ├── SavedPage.jsx              (Page)
  ├── CreateSalePage.jsx         (Page)
  ├── ProfilePage.jsx            (Page)
  ├── MySalesPage.jsx            (Page)
  ├── ListingDetailPage.jsx      (Page)
  ├── Header.jsx                 (Component)
  ├── ItemCard.jsx               (Component)
  ├── FilterDialog.jsx           (Component)
  ├── MapView.jsx                (Component)
  ├── ItemDetailPage.jsx         (Modal Component)
  ├── LocationPicker.jsx         (Component)
  ├── SalesList.jsx              (Component)
  ├── Layout.jsx                 (Component)
  ├── Button.jsx                 (UI Component)
  ├── Badge.jsx                  (UI Component)
  ├── Input.jsx                  (UI Component)
  └── LoadingSpinner.jsx         (UI Component)
```

**Impact:**
- Hard to navigate codebase
- Unclear component responsibilities
- Difficult to maintain as project grows

### 3. Redundant Code ❌
**Problem:** Favorite/heart button logic duplicated across multiple components.

**Duplicated in:**
- `ItemCard.jsx` - Item favorite button
- `ItemDetailPage.jsx` - Item favorite button
- `SalesList.jsx` - Listing favorite button
- `SavedPage.jsx` - Listing favorite button
- `ListingDetailPage.jsx` - Listing favorite button
- `Header.jsx` - Heart icon display

**Duplicated Logic:**
- Heart icon rendering (filled vs outline)
- Click handlers for favorites
- Optimistic UI updates
- Toast notifications
- Loading states

## Proposed Solutions

### Solution 1: Normalize Item Photos

#### Database Changes

**Create `item_photos` table:**
```sql
CREATE TABLE item_photos (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_item_photos_item_id ON item_photos(item_id);
CREATE INDEX idx_item_photos_primary ON item_photos(item_id, is_primary);
```

**Update `items` table:**
- Keep `image_url` for backwards compatibility (legacy data)
- New items will use `item_photos` table
- Photo helpers will check both sources

#### Backend Changes

**Update `server/controllers/items.js`:**
- Modify `getAllItems` to LEFT JOIN `item_photos`
- Use `json_agg()` to return photos array
- Return format: `photos: [{id, url, is_primary, position}]`

**Migration Strategy:**
- Backwards compatible: check both `image_url` and `photos` array
- Frontend photo helpers already support this pattern
- Gradual migration without breaking existing data

### Solution 2: Reorganize Folder Structure

#### Proposed Structure

```
client/src/
  ├── pages/                    # Route-level pages
  │   ├── HomePage/
  │   │   ├── HomePage.jsx
  │   │   └── index.js
  │   ├── AuthPage/
  │   │   ├── AuthPage.jsx
  │   │   └── index.js
  │   ├── SavedPage/
  │   │   ├── SavedPage.jsx
  │   │   └── index.js
  │   ├── CreateSalePage/
  │   │   ├── CreateSalePage.jsx
  │   │   └── index.js
  │   ├── ProfilePage/
  │   │   ├── ProfilePage.jsx
  │   │   └── index.js
  │   ├── MySalesPage/
  │   │   ├── MySalesPage.jsx
  │   │   └── index.js
  │   └── ListingDetailPage/
  │       ├── ListingDetailPage.jsx
  │       └── index.js
  │
  ├── components/               # Reusable feature components
  │   ├── ItemCard/
  │   │   ├── ItemCard.jsx
  │   │   └── index.js
  │   ├── ItemDetailModal/
  │   │   ├── ItemDetailModal.jsx
  │   │   └── index.js
  │   ├── SalesList/
  │   │   ├── SalesList.jsx
  │   │   └── index.js
  │   ├── FilterDialog/
  │   │   ├── FilterDialog.jsx
  │   │   └── index.js
  │   ├── MapView/
  │   │   ├── MapView.jsx
  │   │   └── index.js
  │   ├── LocationPicker/
  │   │   ├── LocationPicker.jsx
  │   │   └── index.js
  │   ├── Header/
  │   │   ├── Header.jsx
  │   │   └── index.js
  │   └── Layout/
  │       ├── Layout.jsx
  │       └── index.js
  │
  ├── shared/                   # Shared/UI components
  │   ├── FavoriteButton/
  │   │   ├── FavoriteButton.jsx
  │   │   └── index.js
  │   ├── Button/
  │   │   ├── Button.jsx
  │   │   └── index.js
  │   ├── Badge/
  │   │   ├── Badge.jsx
  │   │   └── index.js
  │   ├── Input/
  │   │   ├── Input.jsx
  │   │   └── index.js
  │   └── LoadingSpinner/
  │       ├── LoadingSpinner.jsx
  │       └── index.js
  │
  └── utils/
      └── photoHelpers.js
```

#### Benefits

1. **Clear Separation:** Pages vs Components vs Shared UI
2. **Scalability:** Easy to add new features in organized folders
3. **Maintainability:** Clear component responsibilities
4. **Import Clarity:** `import { HomePage } from '@/pages/HomePage'`
5. **Colocation:** Related files together (tests, styles, etc.)

### Solution 3: Extract Shared Components

#### Create `FavoriteButton` Component

**File:** `client/src/shared/FavoriteButton/FavoriteButton.jsx`

```jsx
import { Heart } from 'lucide-react'
import toast from 'react-hot-toast'

export function FavoriteButton({
  type = 'listing',      // 'listing' or 'item'
  itemId,
  isSaved,
  onToggle,
  isAuthenticated,
  disabled = false,
  size = 'md',           // 'sm', 'md', 'lg'
  variant = 'button',    // 'button' or 'icon'
  className = ''
}) {
  const handleClick = async (e) => {
    e.stopPropagation()

    if (!isAuthenticated) {
      toast.error(`Please login to save ${type === 'listing' ? 'listings' : 'items'}`)
      return
    }

    if (disabled) return

    try {
      await onToggle(itemId)
    } catch (error) {
      toast.error('Failed to update favorites')
    }
  }

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const heartIcon = (
    <Heart
      className={`${sizeClasses[size]} ${isSaved ? 'fill-red-500 text-red-500' : ''}`}
    />
  )

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 ${className}`}
        aria-label={isSaved ? 'Remove from favorites' : 'Add to favorites'}
      >
        {heartIcon}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 transition-colors ${
        disabled
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
          : isSaved
            ? 'bg-red-50 text-red-600 hover:bg-red-100 border-2 border-red-200'
            : 'bg-emerald-600 text-white hover:bg-emerald-700'
      } ${className}`}
    >
      {heartIcon}
      <span>{isSaved ? 'Saved' : `Save ${type === 'listing' ? 'Listing' : 'Item'}`}</span>
    </button>
  )
}
```

**Usage Examples:**

```jsx
// In ItemCard
<FavoriteButton
  type="item"
  itemId={item.id}
  isSaved={isSaved}
  onToggle={onSave}
  isAuthenticated={isAuthenticated}
  disabled={item.sold}
  className="w-full py-2.5 rounded-lg font-medium text-sm"
/>

// In ListingDetailPage (icon variant)
<FavoriteButton
  type="listing"
  itemId={listing.id}
  isSaved={isSaved}
  onToggle={toggleFavorite}
  isAuthenticated={isAuthenticated}
  variant="icon"
  size="lg"
/>
```

## Implementation Plan

### Phase 1: Item Photos Normalization (High Priority)
1. Create `item_photos` table in schema
2. Update `items` controller to JOIN and return photos
3. Test photo helpers work with items
4. Update ItemCard and ItemDetailPage to use photos array

### Phase 2: Extract Shared Components (Medium Priority)
1. Create `FavoriteButton` component
2. Replace all Heart button instances
3. Test favorite functionality across all pages
4. Remove duplicated code

### Phase 3: Folder Reorganization (Low Priority)
1. Create new folder structure
2. Move pages to `/pages/`
3. Move components to `/components/`
4. Move UI components to `/shared/`
5. Update all imports in App.jsx and components
6. Test that all routes and imports work
7. Delete old flat structure

## Migration Strategy

### Backwards Compatibility

- Keep `image_url` column in items table
- Photo helpers check both sources
- No breaking changes for existing data
- Gradual migration over time

### Testing Requirements

- [ ] Item photos display correctly
- [ ] Multiple photos per item work
- [ ] Primary photo indicator shows
- [ ] FavoriteButton works for listings
- [ ] FavoriteButton works for items
- [ ] All imports resolve correctly after folder reorganization
- [ ] All pages load and function
- [ ] No broken routes

## Benefits Summary

1. **Consistency:** Items and listings use same photo model
2. **Maintainability:** Clear folder structure and DRY code
3. **Scalability:** Easy to add features in organized structure
4. **Developer Experience:** Clear component responsibilities
5. **Code Quality:** Reduced duplication, shared logic

## Timeline Estimate

- Phase 1 (Item Photos): 2-3 hours
- Phase 2 (Shared Components): 1-2 hours
- Phase 3 (Folder Structure): 2-3 hours
- Testing: 1-2 hours

**Total:** 6-10 hours of development time
