import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function FilterDialog({ open, onClose, filters, setFilters }) {
  const [categories, setCategories] = useState([]);

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/categories`);
        if (res.ok) {
          const data = await res.json();
          setCategories(data.map(c => c.name));
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        // Fallback to empty array on error
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  if (!open) return null;

  const handleStatusChange = (status) => {
    setFilters({ ...filters, status });
  };

  const handleDistanceChange = (distance) => {
    setFilters({ ...filters, distance: parseInt(distance) });
  };

  const toggleCategory = (category) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    setFilters({ ...filters, categories: newCategories });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Filter Sales</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Status Filter */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Status</label>
          <div className="flex gap-2">
            {['all', 'happening', 'today', 'upcoming'].map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  filters.status === status
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Distance Filter */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Distance: Within {filters.distance} miles
          </label>
          <input
            type="range"
            min="1"
            max="50"
            value={filters.distance}
            onChange={(e) => handleDistanceChange(e.target.value)}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1 mi</span>
            <span>50 mi</span>
          </div>
        </div>

        {/* Categories Filter */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Categories</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  filters.categories.includes(category)
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button 
            onClick={() => {
              setFilters({ status: 'all', distance: 10, categories: [] });
            }}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
          >
            Reset
          </button>
          <button 
            onClick={onClose} 
            className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-md hover:shadow-lg transition-all"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
}
