import { useEffect, useState, useMemo } from 'react';
import { MapPin, Heart, Filter, DollarSign } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function SalesList({ searchQuery, onFilterClick, favorites, toggleFavorite, isAuthenticated, location, distanceMiles = 10 }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const radiusKm = useMemo(() => Math.max(1, Math.round(distanceMiles * 1.60934)), [distanceMiles]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchListings = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set('q', searchQuery);
        if (location?.lat && location?.lng) {
          params.set('lat', String(location.lat));
          params.set('lng', String(location.lng));
          params.set('radius_km', String(radiusKm));
        }
        const url = `${API_BASE}/api/listings${params.toString() ? `?${params.toString()}` : ''}`;
        const res = await fetch(url, { credentials: 'include', signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setItems(data);
        }
      } catch (e) {
        if (e.name !== 'AbortError') console.error('Failed to load listings', e);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
    return () => controller.abort();
  }, [searchQuery, location?.lat, location?.lng, radiusKm]);

  return (
    <div className="w-96 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-gray-900">Sales Near You</h2>
          <button 
            onClick={onFilterClick}
            className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700"
          >
            <Filter className="size-5" />
            <span>Filter</span>
          </button>
        </div>
        <p className="text-gray-600">{loading ? 'Loading…' : <>Showing <span className="text-emerald-600">{items.length}</span> within {distanceMiles} mi</>}</p>
      </div>

      <div className="p-4 space-y-4">
        {loading && (
          <div className="py-12">
            <LoadingSpinner text="Loading listings..." />
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No sales found matching your criteria</p>
          </div>
        )}
        {!loading && items.map(l => (
          <SaleCard 
            key={l.id}
            listing={l}
            isFavorite={favorites.includes(l.id)}
            onToggleFavorite={toggleFavorite}
            isAuthenticated={isAuthenticated}
          />
        ))}
      </div>
    </div>
  );
}

function SaleCard({ listing, isFavorite, onToggleFavorite, isAuthenticated }) {
  const photoUrl = useMemo(() => {
    if (listing.image_url && listing.image_url.startsWith('/')) return `${API_BASE}${listing.image_url}`;
    return listing.image_url || 'https://via.placeholder.com/400x300?text=Yard+Sale';
  }, [listing.image_url]);

  const distanceMi = useMemo(() => {
    return typeof listing.distance_km === 'number' ? Math.round(listing.distance_km * 0.621371) : null;
  }, [listing.distance_km]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative">
        <img src={photoUrl} alt={listing.title} className="w-full h-40 object-cover" />
        <button 
          onClick={() => {
            if (isAuthenticated) {
              onToggleFavorite(listing.id);
            } else {
              alert('Please login to save favorites');
            }
          }}
          className={`absolute top-2 right-2 bg-white/90 rounded-full p-2 shadow ${!isAuthenticated ? 'opacity-50' : ''}`}
          title={!isAuthenticated ? 'Login to save favorites' : isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={`size-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-500'}`} />
        </button>
      </div>

      <div className="p-4">
        <h3 className="text-gray-900 mb-1 font-semibold line-clamp-1">{listing.title || listing.location || 'Yard Sale'}</h3>
        <div className="flex items-center gap-2 mb-2">
          {listing.seller_avatar ? (
            <img
              src={listing.seller_avatar.startsWith('/') ? `${API_BASE}${listing.seller_avatar}` : listing.seller_avatar}
              alt={listing.seller_username || 'Seller'}
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-200" />
          )}
          <span className="text-xs text-gray-600">{listing.seller_username || 'Seller'}</span>
        </div>
        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{listing.description}</p>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <MapPin className="size-4" />
            <span className="line-clamp-1">{listing.location || 'No location'}</span>
          </div>
          {typeof listing.price === 'number' && listing.price > 0 && (
            <div className="flex items-center text-emerald-600 font-medium">
              <DollarSign className="size-4" />
              {listing.price.toFixed(2)}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>{listing.category_name || 'General'}</span>
          {distanceMi !== null && <span>{distanceMi} mi</span>}
        </div>
      </div>
    </div>
  );
}
