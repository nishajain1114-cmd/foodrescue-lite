const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function setupDatabase() {
  console.log('--- Initializing FoodRescue Lite MySQL Database ---');
  
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT, 10) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'foodrescue';

  console.log(`Connecting to MySQL server at ${host}:${port} as user '${user}'...`);

  let connection;
  try {
    // 1. Connect without database selected first
    connection = await mysql.createConnection({ host, port, user, password, multipleStatements: true });
    console.log('[OK] Connected to MySQL server.');

    // 2. Read schema.sql
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('Executing database/schema.sql...');
    await connection.query(schemaSql);
    console.log('[OK] Schema applied successfully! Database "foodrescue" and tables created.');

    // 3. Read seed.sql
    const seedPath = path.join(__dirname, '../../database/seed.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    console.log('Executing database/seed.sql...');
    await connection.query(seedSql);
    console.log('[OK] Seed data inserted successfully (Admin, 2 Providers, 4 Recipients, 10 Food Posts)!');

    console.log('\nDatabase setup is COMPLETE and ready for use.');
  } catch (err) {
    console.error('[Database Setup Error]:', err.message);
    console.error('\nTroubleshooting tips:');
    console.error('1. Make sure MySQL service is running on your machine (e.g. XAMPP, MySQL Server).');
    console.error('2. Check your .env file credentials (DB_USER, DB_PASSWORD, DB_PORT).');
  } finally {
    if (connection) await connection.end();
  }
}

setupDatabase();
