const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'foodrescue',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z',
  dateStrings: true
};

// If using a cloud MySQL provider requiring SSL (e.g. TiDB Cloud, Aiven, Railway, AWS RDS)
if (process.env.DB_SSL === 'true' || process.env.DB_SSL === '1') {
  dbConfig.ssl = {
    rejectUnauthorized: false
  };
}

const pool = mysql.createPool(dbConfig);

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`[Database] Successfully connected to MySQL database: ${process.env.DB_NAME || 'foodrescue'} on ${process.env.DB_HOST || 'localhost'}`);
    connection.release();
    return true;
  } catch (err) {
    console.error(`[Database Warning] Could not connect to MySQL (${err.message}). Verify DB credentials in .env or Vercel Environment Variables.`);
    return false;
  }
}

module.exports = { pool, testConnection };
