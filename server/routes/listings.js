const express = require('express')
const {
  getAllListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
  getSellerListings,
  getListingPhoto,
  getNearbyCount
} = require('../controllers/listings')
const multer = require('multer')

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 10 } })

const router = express.Router()

// Custom non-RESTful route for statistics
router.get('/stats/nearby-count', getNearbyCount)

router.get('/', getAllListings)
router.get('/my-listings', getSellerListings)
router.get('/:id/photos/:photoId', getListingPhoto)
router.get('/:id', getListing)
router.post('/', upload.array('photos', 10), createListing)
router.patch('/:id', upload.array('photos', 10), updateListing)
router.delete('/:id', deleteListing)

module.exports = router
