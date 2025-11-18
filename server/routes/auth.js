const express = require('express')
const passport = require('passport')
require('../config/auth')
const { signUserToken } = require('../middleware/jwt')

const router = express.Router()

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'

router.get('/login/success', (req, res) => {
  return res.status(200).json({ success: true, user: req.user || null })
})

router.get('/login/failed', (req, res) => {
  res.status(401).json({ success: false, message: 'failure' })
})

router.get('/logout', (req, res) => {
  try { res.clearCookie('connect.sid', { path: '/' }) } catch {}
  res.json({ status: 'logout', user: {} })
})


router.get('/user', (req, res) => {
  res.status(200).json({ user: req.user || null })
})
router.get('/me', (req, res) => {
  res.status(200).json({ user: req.user || null })
})

router.get('/github',
  passport.authenticate('github', { scope: ['read:user'], session: false })
)

router.get('/github/callback', (req, res, next) => {
  passport.authenticate('github', { session: false }, (err, user) => {
    if (err || !user) {
      return res.redirect(CLIENT_URL)
    }
    try {
      const token = signUserToken(user)
      const redirectUrl = `${CLIENT_URL}#token=${encodeURIComponent(token)}`
      return res.redirect(redirectUrl)
    } catch (e) {
      return res.redirect(CLIENT_URL)
    }
  })(req, res, next)
})

module.exports = router
