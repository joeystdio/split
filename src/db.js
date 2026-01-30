const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'split',
  user: process.env.DB_USER || 'split',
  password: process.env.DB_PASSWORD || 'split'
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
