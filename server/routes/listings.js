const express = require('express')
const {
  getAllListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
  getSellerListings,
  getListingPhoto,
  getNearbyCount,
  checkInListing,
  uncheckInListing
} = require('../controllers/listings')
const multer = require('multer')

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 10 } })

const router = express.Router()

// Custom non-RESTful route for statistics
router.get('/stats/nearby-count', getNearbyCount)

router.get('/', getAllListings)
router.get('/my-listings', getSellerListings)
router.get('/:listingId/photos/:photoId', getListingPhoto)
router.get('/:listingId/items', require('../controllers/items').getItemsByListing)
router.get('/:listingId', getListing)
router.post('/', upload.array('photos', 10), createListing)
// Check-in endpoints
router.post('/:listingId/checkin', checkInListing)
router.delete('/:listingId/checkin', uncheckInListing)
router.patch('/:listingId', upload.array('photos', 10), updateListing)
router.delete('/:listingId', deleteListing)

module.exports = router
