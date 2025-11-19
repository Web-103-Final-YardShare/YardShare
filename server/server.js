require('dotenv').config()

const express = require('express')
const cors = require('cors')
const session = require('express-session')
const passport = require('passport')

// Ensure strategy is registered
require('./config/auth')

const authRoutes = require('./routes/auth')
const listingsRoutes = require('./routes/listings')
const categoriesRoutes = require('./routes/categories')
const favoritesRoutes = require('./routes/favorites')
const itemsRoutes = require('./routes/items')
const usersRoutes = require('./routes/users')
const messagesRoutes = require('./routes/messages')



const app = express()

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001
const SESSION_SECRET = process.env.SESSION_SECRET || 'codepath'

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const isProduction = process.env.NODE_ENV === 'production'
app.set('trust proxy', isProduction ? 1 : 0)
app.use(cors({
	origin: CLIENT_URL,
	methods: 'GET,POST,PUT,DELETE,PATCH',
	credentials: true,
}))

const { attachUserFromJWT } = require('./middleware/jwt')
app.use(attachUserFromJWT)

app.use(session({
	secret: SESSION_SECRET,
	resave: false,
	saveUninitialized: true,
	cookie: {
		httpOnly: true,
		sameSite: isProduction ? 'none' : 'lax',
		secure: isProduction,
	},
}))

app.use(passport.initialize())
// Sessions no longer required for auth, didn't remove it yet 
// app.use(passport.session())


app.get('/health', (req, res) => {
	res.json({ ok: true })
})

app.use('/auth', authRoutes)
app.use('/api/listings', listingsRoutes)
app.use('/api/categories', categoriesRoutes)
app.use('/api/favorites', favoritesRoutes)
app.use('/api/items', itemsRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/messages', messagesRoutes)
app.get('/', (req, res) => {
  res.json({ message: 'YardShare API running', user: req.user || null })
})

app.use((err, req, res, next) => {
	console.error('Server error:', err)
	res.status(500).json({ error: 'Internal Server Error' })
})

app.listen(PORT, () => {
	console.log(`Server listening on http://localhost:${PORT}`)
})

