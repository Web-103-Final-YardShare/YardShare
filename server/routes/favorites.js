const express = require('express')
const { getUserListingFavorites, addFavorite, removeFavorite, getUserItemFavorites, addItemFavorite, removeItemFavorite } = require('../controllers/favorites')

const router = express.Router()

router.get('/', getUserListingFavorites)
router.post('/:listingId', addFavorite)
router.delete('/:listingId', removeFavorite)

// Item favorites
router.get('/items', getUserItemFavorites)
router.post('/items/:itemId', addItemFavorite)
router.delete('/items/:itemId', removeItemFavorite)

module.exports = router
