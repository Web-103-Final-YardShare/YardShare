const express = require('express')
const router = express.Router()
const multer = require('multer')
const {
  getItem,
  getAllItems,
  getItemsByListing,
  createItem,
  updateItem,
  deleteItem
} = require('../controllers/items')

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } })

// GET /api/items/:itemId - Get single item
router.get('/:itemId', getItem)

// GET /api/items - Get all items (with filters)
router.get('/', getAllItems)

// GET /api/items/listings/:listingId - Get items for a listing
router.get('/listings/:listingId', getItemsByListing)

// POST /api/items/listings/:listingId - Add item to listing
router.post('/listings/:listingId', upload.single('photo'), createItem)

// PATCH /api/items/:itemId - Update item
router.patch('/:itemId', upload.single('photo'), updateItem)

// DELETE /api/items/:itemId - Delete item
router.delete('/:itemId', deleteItem)

module.exports = router