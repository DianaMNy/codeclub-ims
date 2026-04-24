// This file connects our backend to the Supabase database

const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool
// A pool = multiple connections ready and waiting
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test the connection when the file loads
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Database connected successfully!');
    release();
  }
});

// Helper function to run queries
const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };