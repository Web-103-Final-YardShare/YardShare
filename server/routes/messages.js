const express = require('express')
const { listConversations, getOrCreateConversation, listMessages, sendMessage } = require('../controllers/messages')

const router = express.Router()

// Conversations
router.get('/conversations', listConversations)
router.post('/conversations', getOrCreateConversation)

// Messages in a conversation
router.get('/conversations/:id/messages', listMessages)
router.post('/conversations/:id/messages', sendMessage)

module.exports = router
