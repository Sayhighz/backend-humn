import { connectDB, testConnection, query } from '../config/database.config.js';

// Test database connection and basic operations
const testDatabase = async () => {
  console.log('🔍 Testing database connection...\n');

  try {
    // Test basic connection
    const connected = await connectDB();
    if (!connected) {
      console.error('❌ Failed to connect to database');
      return false;
    }

    // Test connection with simple query
    const testResult = await testConnection();
    if (!testResult) {
      console.error('❌ Database connection test failed');
      return false;
    }

    // Test database version
    const versionResult = await query('SELECT version()');
    console.log('📊 Database version:', versionResult.rows[0].version);

    // Test table creation (users table example)
    console.log('\n🏗️  Creating test table if not exists...');
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(50),
        last_name VARCHAR(50),
        avatar_url VARCHAR(255),
        country VARCHAR(2),
        is_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP
      )
    `);
    console.log('✅ Users table ready');

    // Test basic CRUD operations
    console.log('\n🧪 Testing basic CRUD operations...');

    // Test insert
    const insertResult = await query(`
      INSERT INTO users (username, email, password, first_name, last_name)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO NOTHING
      RETURNING id, username, email
    `, [
      'testuser',
      'test@example.com',
      'hashedpassword',
      'Test',
      'User'
    ]);

    if (insertResult.rows.length > 0) {
      console.log('✅ Insert test passed:', insertResult.rows[0]);
    } else {
      console.log('ℹ️  Test user already exists, skipping insert');
    }

    // Test select
    const selectResult = await query(`
      SELECT id, username, email, created_at 
      FROM users 
      WHERE email = $1
    `, ['test@example.com']);

    if (selectResult.rows.length > 0) {
      console.log('✅ Select test passed:', selectResult.rows[0]);
    } else {
      console.log('❌ Select test failed');
    }

    // Test update
    const updateResult = await query(`
      UPDATE users 
      SET last_login_at = CURRENT_TIMESTAMP 
      WHERE email = $1
      RETURNING id, last_login_at
    `, ['test@example.com']);

    if (updateResult.rows.length > 0) {
      console.log('✅ Update test passed:', updateResult.rows[0]);
    } else {
      console.log('❌ Update test failed');
    }

    // Test count
    const countResult = await query('SELECT COUNT(*) as total FROM users');
    console.log('✅ Count test passed - Total users:', countResult.rows[0].total);

    console.log('\n🎉 All database tests passed successfully!');
    return true;

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    return false;
  }
};

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testDatabase()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export default testDatabase;