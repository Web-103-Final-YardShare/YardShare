const express = require('express')
const { getUserProfile, updateUserProfile, getPublicProfile } = require('../controllers/users')

const router = express.Router()

// Current user's profile
router.get('/profile', getUserProfile)
router.put('/profile', updateUserProfile)

// Public profile by username
router.get('/:username', getPublicProfile)

module.exports = router
