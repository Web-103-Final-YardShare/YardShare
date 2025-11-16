const express = require('express')
const router = express.Router()
const {
  getItem,
  getAllItems,
  getItemsByListing,
  createItem,
  updateItem,
  deleteItem
} = require('../controllers/items')

// GET /api/items/:id - Get single item
router.get('/:id', getItem)

// GET /api/items - Get all items (with filters)
router.get('/', getAllItems)

// GET /api/items/listings/:listingId - Get items for a listing
router.get('/listings/:listingId', getItemsByListing)

// POST /api/items/listings/:listingId - Add item to listing
router.post('/listings/:listingId', createItem)

// PATCH /api/items/:id - Update item
router.patch('/:id', updateItem)

// DELETE /api/items/:id - Delete item
router.delete('/:id', deleteItem)

module.exports = router