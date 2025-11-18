import { useEffect, useState, useMemo } from 'react';
import { Filter } from 'lucide-react';
import { LoadingSpinner } from './shared/LoadingSpinner';
import { ListingCard } from './ListingCard';

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
          <ListingCard
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
