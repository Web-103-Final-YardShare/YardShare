const { Pool } = require('pg')

const isRender = (process.env.PGHOST || '').includes('render.com')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.PGHOST,
  port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: isRender ? { rejectUnauthorized: false } : undefined,
})

module.exports = pool