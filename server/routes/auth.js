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

// Dev/test login with username & password (for internal testing)
const pool = require('../db/pool')

router.post('/dev/password-login', async (req, res) => {
  try {
    const { username, password } = req.body || {}
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' })
    }

    const allowed = new Set(['bryan', 'testuser'])
    if (!allowed.has(username)) {
      return res.status(403).json({ error: 'Dev login allowed only for bryan or testuser' })
    }

    const key = username.toUpperCase()
    const expected = process.env[key] || process.env[`${key}_PASSWORD`]
    if (!expected) {
      return res.status(500).json({ error: `Missing env var ${key} or ${key}_PASSWORD` })
    }
    if (password !== expected) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    const user = result.rows[0]
    const token = signUserToken({ id: user.id, username: user.username, avatarurl: user.avatarurl })
    return res.json({ token, user: { id: user.id, username: user.username, avatarurl: user.avatarurl } })
  } catch (error) {
    console.error('Dev password login error:', error)
    return res.status(500).json({ error: 'Login failed' })
  }
})

module.exports = router
