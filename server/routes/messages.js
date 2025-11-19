const express = require('express')
const { listConversations, getOrCreateConversation, listMessages, sendMessage, deleteConversation } = require('../controllers/messages')

const router = express.Router()

// Conversations
router.get('/conversations', listConversations)
router.post('/conversations', getOrCreateConversation)
router.delete('/conversations/:id', deleteConversation)

// Messages in a conversation
router.get('/conversations/:id/messages', listMessages)
router.post('/conversations/:id/messages', sendMessage)

module.exports = router
