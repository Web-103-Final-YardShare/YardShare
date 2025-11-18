import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HomePage } from './pages/HomePage';
import { AuthPage } from './pages/AuthPage';
import { SavedPage } from './pages/SavedPage';
import { CreateSalePage } from './pages/CreateSalePage';
import { ProfilePage } from './pages/ProfilePage';
import { MySalesPage } from './pages/MySalesPage';
import { ListingDetailPage } from './pages/ListingDetailPage';

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:3001';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [savedItemsCount, setSavedItemsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Global search state (accessible from all pages)
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState({ name: 'Orlando, FL', lat: 28.5383, lng: -81.3792 });

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/user`, {
        credentials: 'include'
      });

      if (response.ok) {
        const userData = await response.json();
        if (userData && userData.user) {
          setIsAuthenticated(true);
          setUser({
            username: userData.user.username,
            avatar_url: userData.user.avatarurl
          });
          // Load initial favorites for the authenticated user
          try {
            const [favRes, itemsRes] = await Promise.all([
              fetch(`${API_URL}/api/favorites`, { credentials: 'include' }),
              fetch(`${API_URL}/api/favorites/items`, { credentials: 'include' })
            ]);
            
            if (favRes.ok) {
              const favData = await favRes.json();
              setFavorites(Array.isArray(favData) ? favData.map(l => l.id) : []);
            } else {
              setFavorites([]);
            }
            
            if (itemsRes.ok) {
              const itemsData = await itemsRes.json();
              setSavedItemsCount(Array.isArray(itemsData) ? itemsData.length : 0);
            } else {
              setSavedItemsCount(0);
            }
          } catch {
            setFavorites([]);
            setSavedItemsCount(0);
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Toggle favorite - persist to backend
  const toggleFavorite = async (saleId) => {
    if (!isAuthenticated) {
      alert('Please login to save favorites!');
      return;
    }

    const isFavorited = favorites.includes(saleId);
    if (isFavorited) {
      // Optimistic remove
      setFavorites(prev => prev.filter(id => id !== saleId));
      try {
        const res = await fetch(`${API_URL}/api/favorites/${saleId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to remove favorite');
      } catch {
        // Revert on failure
        setFavorites(prev => (prev.includes(saleId) ? prev : [...prev, saleId]));
      }
    } else {
      // Optimistic add
      setFavorites(prev => (prev.includes(saleId) ? prev : [...prev, saleId]));
      try {
        const res = await fetch(`${API_URL}/api/favorites/${saleId}`, {
          method: 'POST',
          credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to add favorite');
      } catch {
        // Revert on failure
        setFavorites(prev => prev.filter(id => id !== saleId));
      }
    }
  };

  // When user logs out
  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'GET',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }
    try {
      localStorage.removeItem('yardshare_token');
    } catch { // ignore 
      }
    
    setIsAuthenticated(false);
    setUser(null);
    setFavorites([]);
    setSavedItemsCount(0);
  };
  

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="size-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              isAuthenticated={isAuthenticated}
              user={user}
              favorites={favorites}
              savedItemsCount={savedItemsCount}
              toggleFavorite={toggleFavorite}
              onLogout={handleLogout}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              location={location}
              setLocation={setLocation}
            />
          }
        />
        <Route 
          path="/auth" 
          element={<AuthPage />} 
        />
        <Route
          path="/saved"
          element={
            isAuthenticated ? (
              <SavedPage
                isAuthenticated={isAuthenticated}
                user={user}
                favorites={favorites}
                savedItemsCount={savedItemsCount}
                onLogout={handleLogout}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                location={location}
                setLocation={setLocation}
              />
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
        <Route
          path="/create"
          element={
            isAuthenticated ? (
              <CreateSalePage
                isAuthenticated={isAuthenticated}
                user={user}
                favoritesCount={favorites.length + savedItemsCount}
                onLogout={handleLogout}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                location={location}
                setLocation={setLocation}
              />
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
        <Route
          path="/profile"
          element={
            isAuthenticated ? (
              <ProfilePage
                isAuthenticated={isAuthenticated}
                user={user}
                favoritesCount={favorites.length + savedItemsCount}
                onLogout={handleLogout}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                location={location}
                setLocation={setLocation}
              />
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
        <Route
          path="/my-sales"
          element={
            isAuthenticated ? (
              <MySalesPage
                isAuthenticated={isAuthenticated}
                user={user}
                favoritesCount={favorites.length + savedItemsCount}
                onLogout={handleLogout}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                location={location}
                setLocation={setLocation}
              />
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
        <Route
          path="/listings/:id"
          element={
            <ListingDetailPage
              isAuthenticated={isAuthenticated}
              user={user}
              favoritesCount={favorites.length + savedItemsCount}
              onLogout={handleLogout}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              location={location}
              setLocation={setLocation}
            />
          }
        />
        <Route 
          path="*" 
          element={<Navigate to="/" replace />} 
        />
      </Routes>
    </Router>
  );
}
