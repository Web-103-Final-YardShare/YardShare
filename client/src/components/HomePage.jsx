import { useState } from 'react';
import { Header } from './Header';
import { SalesList } from './SalesList';
import { MapView } from './MapView';
import { FilterDialog } from './FilterDialog';

export function HomePage({ isAuthenticated, user, favorites, toggleFavorite, onLogout }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    categories: [],
    distance: 10,
    status: 'all'
  });
  const [location, setLocation] = useState({ name: 'Orlando, FL', lat: 28.5383, lng: -81.3792 });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isAuthenticated={isAuthenticated}
        user={user}
        favoritesCount={favorites.length}
        onLogout={onLogout}
        location={location}
        setLocation={setLocation}
      />
      
      <div className="flex h-[calc(100vh-80px)]">
        <SalesList 
          searchQuery={searchQuery}
          onFilterClick={() => setShowFilters(true)}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
          isAuthenticated={isAuthenticated}
          location={location}
          distanceMiles={filters.distance}
        />
        <MapView location={location} searchQuery={searchQuery} radiusMiles={filters.distance} />
      </div>

      <FilterDialog 
        open={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        setFilters={setFilters}
      />
    </div>
  );
}