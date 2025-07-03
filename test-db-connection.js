const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('Testing MySQL connection...');
    console.log('Database URL:', process.env.DATABASE_URL);
    
    // Parse the DATABASE_URL
    const url = new URL(process.env.DATABASE_URL);
    
    const connection = await mysql.createConnection({
      host: url.hostname,
      port: url.port || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Remove leading '/'
    });

    console.log('✅ Successfully connected to MySQL!');
    
    // Test a simple query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Test query successful:', rows);
    
    await connection.end();
    console.log('✅ Connection closed successfully');
    
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Suggestions:');
      console.log('- Make sure MySQL server is running');
      console.log('- Check if the port 3306 is correct');
      console.log('- Verify your connection credentials');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Suggestions:');
      console.log('- Check your username and password');
      console.log('- Make sure the user has proper permissions');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n💡 Suggestions:');
      console.log('- Create the database: CREATE DATABASE cost_compass;');
    }
  }
}

testConnection();