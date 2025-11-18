/**
 * Photo helper utilities for handling new photo table structure
 * Photos are now objects: {id, url, is_primary, position}
 * Instead of simple string arrays
 */

/**
 * Get the primary photo URL from a listing or fallback to first photo
 * @param {Array|Object} photos - Array of photo objects or photos field
 * @param {string} fallbackUrl - Fallback URL if no photos exist
 * @returns {string} Photo URL
 */
export const getPrimaryPhotoUrl = (photos, fallbackUrl = 'https://placehold.co/600x400?text=No+Image') => {
  // Handle legacy photo_urls array of strings
  if (Array.isArray(photos) && photos.length > 0) {
    if (typeof photos[0] === 'string') {
      // Legacy format: array of URL strings
      return photos[0]
    }

    // New format: array of photo objects
    // First try to find primary photo
    const primaryPhoto = photos.find(p => p && p.is_primary)
    if (primaryPhoto && primaryPhoto.url) {
      return primaryPhoto.url
    }

    // Otherwise return first photo by position
    const sortedPhotos = [...photos]
      .filter(p => p && p.url)
      .sort((a, b) => (a.position || 0) - (b.position || 0))

    if (sortedPhotos.length > 0) {
      return sortedPhotos[0].url
    }
  }

  return fallbackUrl
}

/**
 * Get all photo URLs sorted by position
 * @param {Array} photos - Array of photo objects
 * @returns {Array<string>} Array of photo URLs
 */
export const getAllPhotoUrls = (photos) => {
  if (!Array.isArray(photos) || photos.length === 0) {
    return []
  }

  // Handle legacy format
  if (typeof photos[0] === 'string') {
    return photos
  }

  // New format: sort by position and extract URLs
  return [...photos]
    .filter(p => p && p.url)
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map(p => p.url)
}

/**
 * Check if photos array uses new table structure
 * @param {Array} photos - Photos array
 * @returns {boolean} True if new format
 */
export const isNewPhotoFormat = (photos) => {
  return Array.isArray(photos) &&
         photos.length > 0 &&
         typeof photos[0] === 'object' &&
         photos[0] !== null &&
         'url' in photos[0]
}
