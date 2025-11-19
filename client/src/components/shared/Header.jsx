import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, Heart, Plus, User, LogOut, MessageCircle } from 'lucide-react';
import { Button } from '../Button';
import { getConversations } from '../../services/messagesApi';
import toast from 'react-hot-toast';

export function Header({ searchQuery, setSearchQuery, isAuthenticated, user, favoritesCount, onLogout, location, setLocation }) {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [inputLocation, setInputLocation] = useState(location?.name || 'Orlando, FL');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const abortRef = useRef(null);

  const handleUpdateLocation = async () => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(inputLocation)}&limit=1&countrycodes=us`, {
        headers: { 'User-Agent': 'YardShareWeb103/1.0' }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setLocation({ name: display_name, lat: parseFloat(lat), lng: parseFloat(lon) });
        setShowLocationModal(false);
      } else {
        alert('Location not found. Try a different query.');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to geocode location');
    }
  };

  // Autocomplete suggestions for US locations (city, zip, addresses)
  useEffect(() => {
    if (!showLocationModal) return;
    const q = inputLocation?.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const run = async () => {
      try {
        setLoadingSuggest(true);
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&countrycodes=us&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'YardShareWeb103/1.0', 'Accept-Language': 'en-US' },
          signal: controller.signal
        });
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(data || []);
      } catch (e) {
        if (e.name !== 'AbortError') console.error('suggestions failed', e);
      } finally {
        setLoadingSuggest(false);
      }
    };
    const t = setTimeout(run, 250);
    return () => { clearTimeout(t); controller.abort(); };
  }, [inputLocation, showLocationModal]);

  const pickSuggestion = (s) => {
    const name = s.display_name;
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    setLocation({ name, lat, lng });
    setInputLocation(name);
    setShowLocationModal(false);
  };

  // Polling messages
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    const checkMessages = async () => {
      try {
        const conversations = await getConversations();
        const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
        const totalMessages = conversations.reduce((sum, conv) => sum + (conv.message_count || 0), 0);
        
        setUnreadCount(totalUnread);
        
        // Show toast if new messages arrived
        if (lastMessageCount > 0 && totalMessages > lastMessageCount) {
          const newCount = totalMessages - lastMessageCount;
          toast.success(`${newCount} new message${newCount > 1 ? 's' : ''}!`, {
            icon: '💬',
            duration: 3000
          });
        }
        
        setLastMessageCount(totalMessages);
      } catch (error) {
        console.error('Failed to check messages:', error);
      }
    };

    checkMessages();
    const interval = setInterval(checkMessages, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [isAuthenticated, lastMessageCount]);

  return (
    <header className="bg-emerald-600 text-white px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="shrink-0">
          <h1 className="text-white cursor-pointer text-2xl font-medium leading-none" onClick={() => navigate('/')}>
            YardLoop
          </h1>
        </div>

        <button 
          onClick={() => setShowLocationModal(true)}
          className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 h-10 px-4 rounded-full transition-colors"
        >
          <MapPin className="size-5" />
          <span>{location?.name || 'Orlando, FL'}</span>
        </button>

        {showLocationModal && (
          <>
            <div 
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowLocationModal(false)}
            ></div>
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 w-96 z-50 shadow-xl">
              <h3 className="text-gray-900 mb-4 font-semibold">Set Community</h3>
              <div className="relative mb-4">
                <input 
                  type="text"
                  placeholder="Enter community, city, or ZIP"
                  value={inputLocation}
                  onChange={(e) => setInputLocation(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {/* Suggestions dropdown */}
                {(suggestions.length > 0 || loadingSuggest) && (
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg max-h-64 overflow-auto shadow-lg z-10">
                    {loadingSuggest && (
                      <div className="px-4 py-2 text-sm text-gray-500">Searching…</div>
                    )}
                    {suggestions.map((s) => (
                      <button
                        key={`${s.place_id}`}
                        onClick={() => pickSuggestion(s)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-800"
                      >
                        {s.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="secondary"
                  onClick={() => setShowLocationModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary"
                  onClick={handleUpdateLocation}
                  className="flex-1"
                >
                  Update
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Search */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search sales, items, or keywords"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-4 rounded-full text-gray-900 placeholder:text-gray-500 bg-white/90 shadow-sm focus:outline-none focus:ring-4 focus:ring-emerald-300/40"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated && (
            <button 
              onClick={() => navigate('/messages')}
              className="relative flex items-center gap-2 hover:bg-emerald-700 h-10 px-4 rounded-lg transition-colors"
            >
              <MessageCircle className="size-5" />
              <span className="hidden lg:inline">Messages</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full size-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )}

          {/* Saved Button - only show count if authenticated */}
          <button 
            onClick={() => {
              if (isAuthenticated) {
                navigate('/saved');
              } else {
                alert('Please login to view saved sales!');
                navigate('/auth');
              }
            }}
            className="flex items-center gap-2 hover:bg-emerald-700 h-10 px-4 rounded-lg transition-colors"
          >
            <Heart className="size-5" />
            <span>Saved</span>
            {isAuthenticated && (
              <span className="text-emerald-200">({favoritesCount})</span>
            )}
          </button>

          <Button 
            variant="secondary"
            className="rounded-full h-10 px-6"
            onClick={() => {
              if (!isAuthenticated) {
                navigate('/auth');
              } else {
                navigate('/create');
              }
            }}
          >
            <Plus className="size-5 mr-2" />
            Host a Sale
          </Button>

          {/* User Profile / Login */}
          {isAuthenticated && user ? (
            <div className="relative">
              <button 
                className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 px-3 py-2 rounded-full transition-colors"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                {user.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt={user.username}
                    className="size-8 rounded-full border-2 border-white object-cover"
                  />
                ) : (
                  <div className="size-8 rounded-full bg-emerald-700 flex items-center justify-center border-2 border-white">
                    <User className="size-5" />
                  </div>
                )}
                <span className="hidden lg:inline">{user.username}</span>
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <>
                  {/* Backdrop to close menu */}
                  <div 
                    className="fixed inset-0" 
                    style={{ zIndex: 1500 }}
                    onClick={() => setShowUserMenu(false)}
                  ></div>
                  
                  {/* Dropdown */}
                  <div 
                    className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2"
                    style={{ zIndex: 2000 }}
                  >
                    <button
                      onClick={() => {
                        navigate('/profile');
                        setShowUserMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      My Profile
                    </button>
                    <button
                      onClick={() => {
                        navigate('/my-sales');
                        setShowUserMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      My Sales
                    </button>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                      onClick={() => {
                        onLogout();
                        setShowUserMenu(false);
                        navigate('/');
                      }}
                      className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-100 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="size-4" />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button 
              className="flex items-center justify-center size-12 bg-emerald-800 hover:bg-emerald-900 rounded-full transition-colors"
              onClick={() => navigate('/auth')}
            >
              <User className="size-6" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
