const express = require('express')
const { getUserFavorites, addFavorite, removeFavorite } = require('../controllers/favorites')

const router = express.Router()

router.get('/', getUserFavorites)
router.post('/:listingId', addFavorite)
router.delete('/:listingId', removeFavorite)

module.exports = router
