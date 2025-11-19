import { useSearchParams } from "react-router-dom";
import { useState, useEffect } from 'react'
import { ItemCard } from '../components/ItemCard'
import { ListingCard } from '../components/ListingCard'
import { Layout } from '../components/shared/Layout'
import { LoadingSpinner } from '../components/shared/LoadingSpinner'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const CATEGORY_EMOJIS = {
  'Furniture': '🪑',
  'Electronics': '📱',
  'Books': '📚',
  'Tools': '🔧',
  'Clothing': '👕',
  'Toys': '🧸',
  'Kitchen': '🍳',
  'Sports & Outdoors': '⚽',
  'Home & Garden': '🌿',
  'Other': '📦'
}

export function SearchResultsPage({ 
  isAuthenticated, 
  user, 
  favoritesCount, 
  onLogout, 
  searchQuery, 
  setSearchQuery, 
  location, 
  setLocation 
}) {
    const [searchParams] = useSearchParams()
    const [results, setResults] = useState({listings: [], items: []})
    const [loading, setLoading] = useState(true)
    const [selectedItemId, setSelectedItemId] = useState(null)
    const [savedItemIds, setSavedItemIds] = useState(new Set())
    const [selectedCategory, setSelectedCategory] = useState('All Items')
    const [filteredResults, setFilteredResults] = useState({listings: [], items: []})
      
    const query = searchParams.get('q')
    const categoryParam = searchParams.get('category')

    const numResults = filteredResults.listings.length + filteredResults.items.length;

    useEffect(() => {
        if (isAuthenticated) {
            // Load saved items to check which items are saved
            fetch(`${API_BASE}/api/favorites/items`, { credentials: 'include' })
                .then(res => res.ok ? res.json() : [])
                .then(items => setSavedItemIds(new Set(items.map(item => item.id))))
                .catch(() => {})
        }
    }, [isAuthenticated])

    useEffect(() => {
        if (query) {
            setLoading(true);
            console.log('Fetching search results for query:', query);
            // Fetch search results from API
            fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}${categoryParam ? `&category=${encodeURIComponent(categoryParam)}` : ''}`, {
                credentials: 'include'
            })
                .then(res => res.ok ? res.json() : { listings: [], items: [] })
                .then(data => {
                    console.log('API response:', data);
                    // Trust the API results - it already handles search and filtering
                    setResults(data);
                    setFilteredResults(data);
                    setLoading(false);
                })
                .catch(error => {
                    console.error('Error fetching search results:', error);
                    setResults({ listings: [], items: [] });
                    setFilteredResults({ listings: [], items: [] });
                    setLoading(false);
                });
        }
    }, [query, categoryParam])

    // Get all unique categories from results
    const categories = Array.from(new Set([
        ...results.listings.map(listing => listing.category_name).filter(Boolean),
        ...results.items.map(item => item.category_name).filter(Boolean)
    ]))

    // Handle category filter
    const handleCategoryFilter = (category) => {
        setSelectedCategory(category)
        if (category === 'All Items') {
            setFilteredResults(results)
        } else {
            const filteredListings = results.listings.filter(listing => listing.category_name === category)
            const filteredItems = results.items.filter(item => item.category_name === category)
            setFilteredResults({
                listings: filteredListings,
                items: filteredItems
            })
        }
    }

    return (
        <Layout
            isAuthenticated={isAuthenticated}
            user={user}
            favoritesCount={favoritesCount}
            onLogout={onLogout}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            location={location}
            setLocation={setLocation}
        >
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Search Results</h1>
                <p className="text-gray-600 mb-6">Found {numResults} items for "{query}"</p>

                {/* Category Filter */}
                <div className="mb-8">
                    <h2 className="text-sm font-semibold text-gray-700 mb-4">Filter by Category</h2>
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => handleCategoryFilter('All Items')}
                                className={`px-4 py-2 rounded-full font-medium text-sm transition-colors ${
                                    selectedCategory === 'All Items'
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                }`}
                            >
                                📦 All Items
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => handleCategoryFilter(cat)}
                                    className={`px-4 py-2 rounded-full font-medium text-sm transition-colors ${
                                        selectedCategory === cat
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                    }`}
                                >
                                    {CATEGORY_EMOJIS[cat] || '📦'} {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <LoadingSpinner text="Searching..." />
                ) : (
                    <>
                        {/* Listings Section */}
                        {filteredResults.listings.length > 0 && (
                            <div className="mb-8">
                                <h2 className="text-xl font-semibold text-gray-800 mb-4">Listings</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {filteredResults.listings.map(listing => (
                                        <ListingCard 
                                            key={`listing-${listing.id}`}
                                            listing={listing}
                                            isAuthenticated={isAuthenticated}
                                            isFavorite={savedItemIds.has(listing.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Items Section */}
                        {filteredResults.items.length > 0 && (
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800 mb-4">Items</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {filteredResults.items.map(item => (
                                        <ItemCard 
                                            key={`item-${item.id}`}
                                            item={item}
                                            isAuthenticated={isAuthenticated}
                                            isSaved={savedItemIds.has(item.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* No Results Message */}
                        {numResults === 0 && (
                            <div className="text-center py-12">
                                <p className="text-gray-500 text-lg">No items found for "{query}"</p>
                                <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filters</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Layout>
    )
}