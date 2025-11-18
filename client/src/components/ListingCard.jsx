import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { getPrimaryPhotoUrl } from '../utils/photoHelpers';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function ListingCard({ listing, isFavorite, onToggleFavorite, isAuthenticated, user }) {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [localCheckInCount, setLocalCheckInCount] = useState(parseInt(listing.check_in_count) || 0);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [localCheckedInUsers, setLocalCheckedInUsers] = useState(listing.checked_in_users || []);

  // Initialize check-in state based on current user
  useEffect(() => {
    if (user && listing.checked_in_users) {
      setIsCheckedIn(listing.checked_in_users.some(u => u.username === user.username));
    }
  }, [user, listing.checked_in_users]);

  // Force re-render every minute to update status badge in real-time
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const photoUrl = useMemo(() => {
    // Use photo helper to correctly handle photo objects from listing_photos table
    const primaryPhoto = getPrimaryPhotoUrl(listing.photos);
    if (primaryPhoto && primaryPhoto !== 'https://placehold.co/600x400?text=No+Image') {
      return primaryPhoto;
    }
    // Fallback to legacy image_url
    if (listing.image_url) {
      if (listing.image_url.startsWith('/')) {
        return `${API_BASE}${listing.image_url}`;
      }
      return listing.image_url;
    }
    return 'https://placehold.co/600x400?text=No+Image';
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

  const checkedInUsers = useMemo(() => localCheckedInUsers, [localCheckedInUsers]);

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

  const handleCheckIn = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      alert('Please login to check in');
      return;
    }
    setChecking(true);
    try {
      if (isCheckedIn) {
        // Check out
        const res = await fetch(`${API_BASE}/api/listings/${listing.id}/checkin`, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (res.ok) {
          setIsCheckedIn(false);
          setLocalCheckInCount(prev => Math.max(0, prev - 1));
          // Remove current user from the list
          if (user) {
            setLocalCheckedInUsers(prev => prev.filter(u => u.username !== user.username));
          }
        }
      } else {
        // Check in
        const res = await fetch(`${API_BASE}/api/listings/${listing.id}/checkin`, {
          method: 'POST',
          credentials: 'include'
        });
        if (res.ok) {
          setIsCheckedIn(true);
          setLocalCheckInCount(prev => prev + 1);
          // Add current user to the list
          if (user) {
            setLocalCheckedInUsers(prev => [
              { id: Date.now(), username: user.username, avatarurl: user.avatar_url },
              ...prev
            ]);
          }
        }
      }
    } catch (e) {
      console.error('Check-in failed:', e);
    } finally {
      setChecking(false);
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

        {/* Who's Going Section */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Avatars */}
              <div className="flex -space-x-2">
                {checkedInUsers.slice(0, 3).map(user => (
                  <img
                    key={user.id}
                    src={user.avatarurl && user.avatarurl.startsWith('/')
                      ? `${API_BASE}${user.avatarurl}`
                      : (user.avatarurl || 'https://i.pravatar.cc/40')}
                    alt={user.username}
                    className="w-8 h-8 rounded-full border-2 border-white object-cover"
                  />
                ))}
                {localCheckInCount > 3 && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 text-xs flex items-center justify-center border-2 border-white font-medium text-gray-700">
                    +{localCheckInCount - 3}
                  </div>
                )}
              </div>

              {/* Names */}
              <div className="text-xs">
                {localCheckInCount === 0 ? (
                  <span className="text-gray-500">Who's going?</span>
                ) : localCheckInCount === 1 ? (
                  <span className="text-gray-700">
                    {checkedInUsers[0]?.username || '1 person'}
                  </span>
                ) : (
                  <span className="text-gray-700">
                    {checkedInUsers[0]?.username || 'Someone'}
                    {` + ${localCheckInCount - 1}`}
                  </span>
                )}
              </div>
            </div>

            {/* Check In Button */}
            <button
              onClick={handleCheckIn}
              disabled={checking}
              className={`px-4 py-1.5 rounded text-xs font-semibold transition-colors ${
                checking
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : isCheckedIn
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {checking ? 'Loading...' : isCheckedIn ? 'Checked in' : 'Check in!'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
