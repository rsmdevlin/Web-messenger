import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get DATABASE_URL from environment or ask user
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.log('Please set DATABASE_URL or pass it as an environment variable');
  process.exit(1);
}

async function initializeDatabase() {
  let connection;
  try {
    // Parse the connection string
    const url = new URL(DATABASE_URL);
    const config = {
      host: url.hostname,
      port: url.port || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.substring(1),
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    };

    console.log(`Connecting to database: ${config.host}:${config.port}/${config.database}`);

    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database');

    // Read the SQL migration file
    const migrationPath = path.join(__dirname, 'server/migrations/001_init_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split by semicolon and execute each statement
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          console.log(`Executing: ${statement.substring(0, 50)}...`);
          await connection.execute(statement);
          console.log('✅ Success');
        } catch (error) {
          // Ignore "table already exists" and "index already exists" errors
          if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === 'ER_DUP_KEYNAME') {
            console.log(`⚠️  Already exists (skipping): ${error.message}`);
          } else {
            console.error(`❌ Error: ${error.message}`);
            throw error;
          }
        }
      }
    }

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initializeDatabase();
