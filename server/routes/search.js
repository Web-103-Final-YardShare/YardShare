const express = require('express')
const router = express.Router()
const{ unifiedSearch } = require('../controllers/search')

router.get('/', unifiedSearch)

module.exports = router