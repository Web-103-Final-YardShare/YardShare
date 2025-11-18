const passport = require('passport')
const GitHubStrategy = require('passport-github2').Strategy
const pool = require('../db/pool')

const options = {
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3001/auth/github/callback',
}

const verify = async (accessToken, refreshToken, profile, callback) => {
  try {
    const { _json: { id, login, avatar_url } } = profile

    // Check for existing user by username (preferred unique) or githubid
    const findRes = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR githubid = $2 LIMIT 1',
      [login, id]
    )
    const user = findRes.rows[0]
    if (user) {
      return callback(null, user)
    }

    const insertRes = await pool.query(
      `INSERT INTO users (githubid, username, avatarurl, accesstoken)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, login, avatar_url, accessToken]
    )
    const newUser = insertRes.rows[0]

    // Create user profile with default values
    await pool.query(
      `INSERT INTO user_profiles (user_id, bio, phone, preferred_contact)
       VALUES ($1, $2, $3, $4)`,
      [newUser.id, null, null, 'messages']
    )

    return callback(null, newUser)
  } catch (error) {
    return callback(error)
  }
}

passport.use(new GitHubStrategy(options, verify))

passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((user, done) => {
  done(null, user)
})

module.exports = { passport }
