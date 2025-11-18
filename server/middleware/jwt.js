const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'change-me'

function signUserToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    avatarurl: user.avatarurl || user.avatar_url || null,
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET)
}

function attachUserFromJWT(req, _res, next) {
  try {
    const auth = req.headers['authorization'] || ''
    const m = auth.match(/^Bearer\s+(.+)$/i)
    if (m && m[1]) {
      const decoded = verifyToken(m[1])
      req.user = decoded
    }
  } catch (e) {
  }
  next()
}

module.exports = { signUserToken, verifyToken, attachUserFromJWT }
