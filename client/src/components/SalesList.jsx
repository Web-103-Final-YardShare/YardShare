import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Heart, Filter, DollarSign } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { getPrimaryPhotoUrl } from '../utils/photoHelpers';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function SalesList({ searchQuery, onFilterClick, favorites, toggleFavorite, isAuthenticated, user, location, distanceMiles = 10, filters }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [allListings, setAllListings] = useState([]);
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
          setAllListings(data);
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

  // Apply filters to listings
  useEffect(() => {
    if (!filters) {
      setItems(allListings);
      return;
    }

    let filtered = [...allListings];

    // Filter by status
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(listing => {
        const status = calculateStatus(listing);
        if (filters.status === 'happening') return status === 'now';
        if (filters.status === 'today') return status === 'today';
        if (filters.status === 'upcoming') return status === 'upcoming';
        return true;
      });
    }

    // Filter by categories
    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter(listing => {
        const listingCategories = listing.item_categories || [];
        return filters.categories.some(cat => listingCategories.includes(cat));
      });
    }

    setItems(filtered);
  }, [allListings, filters]);

  // Helper function to calculate status
  const calculateStatus = (listing) => {
    try {
      if (!listing.sale_date) return 'upcoming';
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const [year, month, day] = listing.sale_date.split('T')[0].split('-').map(Number);
      const saleDate = new Date(year, month - 1, day);
      
      if (saleDate.getTime() === today.getTime()) {
        if (listing.start_time && listing.end_time) {
          const [startHour, startMin] = listing.start_time.split(':').map(Number);
          const [endHour, endMin] = listing.end_time.split(':').map(Number);
          const currentHour = now.getHours();
          const currentMin = now.getMinutes();
          const currentTime = currentHour * 60 + currentMin;
          const startTime = startHour * 60 + startMin;
          const endTime = endHour * 60 + endMin;
          
          if (currentTime >= startTime && currentTime <= endTime) return 'now';
          if (currentTime > endTime) return 'ended';
        }
        return 'today';
      }
      if (saleDate < today) return 'ended';
      return 'upcoming';
    } catch (e) { 
      return 'upcoming';
    }
  };

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
            user={user}
          />
        ))}
      </div>
    </div>
  );
}

function SaleCard({ listing, isFavorite, onToggleFavorite, isAuthenticated, user }) {
  const navigate = useNavigate();

  // Force re-render every minute to update status badge in real-time
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const photoUrl = useMemo(() => {
    // Use helper to handle both legacy and new photo formats
    const fallback = listing.image_url && listing.image_url.startsWith('/')
      ? `${API_BASE}${listing.image_url}`
      : (listing.image_url || 'https://placehold.co/600x400?text=No+Image');
    return getPrimaryPhotoUrl(listing.photos, fallback);
  }, [listing.photos, listing.image_url]);

  const distanceMi = useMemo(() => {
    return typeof listing.distance_km === 'number' ? (listing.distance_km * 0.621371).toFixed(1) : null;
  }, [listing.distance_km]);

  const status = useMemo(() => {
    try {
      if (!listing.sale_date) return 'upcoming';
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Parse the sale_date string (YYYY-MM-DD format from database)
      const [year, month, day] = listing.sale_date.split('T')[0].split('-').map(Number);
      const saleDate = new Date(year, month - 1, day);
      
      // Check if it's today
      if (saleDate.getTime() === today.getTime()) {
        // Parse start and end times
        if (listing.start_time && listing.end_time) {
          const [startHour, startMin] = listing.start_time.split(':').map(Number);
          const [endHour, endMin] = listing.end_time.split(':').map(Number);
          
          const currentHour = now.getHours();
          const currentMin = now.getMinutes();
          const currentTime = currentHour * 60 + currentMin;
          const startTime = startHour * 60 + startMin;
          const endTime = endHour * 60 + endMin;
          
          if (currentTime >= startTime && currentTime <= endTime) {
            return 'now';
          } else if (currentTime > endTime) {
            return 'ended';
          }
        }
        return 'today'; // Event is today (either before start time or no time specified)
      } else if (saleDate < today) {
        return 'ended';
      }
      
      return 'upcoming';
    } catch (e) { 
      return 'upcoming';
    }
  }, [listing.sale_date, listing.start_time, listing.end_time, tick]);

  const categoryEmojis = useMemo(() => {
    const map = {
      'Furniture': '🪑',
      'Electronics': '📱',
      'Books': '📚',
      'Tools': '🔧',
      'Clothing': '👕',
      'Toys & Games': '🧸',
      'Kitchen': '🍳',
      'Sports & Outdoors': '⚽',
      'Home & Garden': '🌿',
      'Other': '📦'
    };
    const categories = listing.item_categories || [];
    return categories.slice(0, 3).map(cat => map[cat] || '📦');
  }, [listing.item_categories]);

  const formatTimeRange = (dateStr, start, end) => {
    if (!dateStr) return '';
    try {
      // Parse the sale_date string (YYYY-MM-DD format from database)
      const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
      const saleDate = new Date(year, month - 1, day);
      
      if (isNaN(saleDate.getTime())) return '';
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const sameDay = saleDate.getTime() === today.getTime();
      
      const dayLabel = sameDay ? 'Today' : saleDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      
      const formatHour = (t) => {
        if (!t) return '';
        const [hh, mm] = t.split(':');
        let hour = parseInt(hh);
        const am = hour < 12;
        if (hour === 0) hour = 12;
        if (hour > 12) hour = hour - 12;
        return `${hour}${am ? 'am' : 'pm'}`;
      };
      
      const startFmt = start ? formatHour(start) : '';
      const endFmt = end ? formatHour(end) : '';
      return `${dayLabel} ${startFmt}${endFmt ? ' - ' + endFmt : ''}`;
    } catch (e) {
      return '';
    }
  };

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAuthenticated) {
      onToggleFavorite(listing.id);
    } else {
      alert('Please login to save favorites');
    }
  };

  return (
    <div 
      onClick={() => navigate(`/listings/${listing.id}`)}
      className="block border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transform hover:-translate-y-1 transition-all bg-white cursor-pointer no-underline"
    >
      {/* Photo */}
      <div className="relative h-48 bg-gray-100">
        <img 
          src={photoUrl} 
          alt={listing.title || 'Yard sale'} 
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = 'https://placehold.co/600x400?text=No+Image';
          }}
        />
        {/* Status Badge - positioned over photo */}
        <span className={`absolute top-2 left-2 text-xs font-bold px-2.5 py-1 rounded ${
          status === 'now' 
            ? 'bg-emerald-500 text-white' 
            : status === 'ended'
              ? 'bg-red-500 text-white'
              : status === 'today'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-400 text-white'
        }`}>
          {status === 'now' ? '● HAPPENING NOW' : status === 'ended' ? 'ENDED' : status === 'today' ? 'TODAY' : 'UPCOMING'}
        </span>
        {/* Heart Save Icon - positioned over photo */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-2 right-2 bg-white rounded-full p-1 hover:bg-gray-50 transition-colors"
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={`w-5 h-5 ${
            isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'
          }`} />
        </button>
      </div>

      {/* Card Content */}
      <div className="p-3">
        {/* Title */}
        <h3 className="text-gray-900 font-bold text-base mb-1 line-clamp-1">
          {listing.title || listing.location || 'Yard Sale'}
        </h3>

        {/* Distance & Time */}
        <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
          <span>📍 {distanceMi ? `${distanceMi} mi` : 'Location'}</span>
          <span>•</span>
          <span>🕐 {formatTimeRange(listing.sale_date, listing.start_time, listing.end_time)}</span>
        </div>

        {/* Category Icons & Item Count */}
        <div className="flex items-center gap-1.5 mb-3 text-gray-700">
          {categoryEmojis.map((emoji, idx) => (
            <span key={idx} className="text-lg">{emoji}</span>
          ))}
          <span className="text-sm text-gray-600">
            +{listing.item_count || 0} items
          </span>
        </div>

        {/* Category Names (small text) */}
        {listing.item_categories && listing.item_categories.length > 0 && (
          <p className="text-xs text-gray-500 mb-3">
            {listing.item_categories.join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}
