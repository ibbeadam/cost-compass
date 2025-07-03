const mysql = require('mysql2/promise');
require('dotenv').config();

// Common MySQL ports and configurations
const configs = [
  { host: 'localhost', port: 3306, user: 'root', password: '', database: 'cost_compass' },
  { host: '127.0.0.1', port: 3306, user: 'root', password: '', database: 'cost_compass' },
  { host: 'localhost', port: 3307, user: 'root', password: '', database: 'cost_compass' },
  { host: 'localhost', port: 3308, user: 'root', password: '', database: 'cost_compass' },
  { host: 'localhost', port: 33060, user: 'root', password: '', database: 'cost_compass' }, // MySQL X Protocol
];

async function testMultiplePorts() {
  console.log('Testing multiple MySQL configurations...\n');
  
  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    console.log(`Testing: ${config.host}:${config.port}`);
    
    try {
      const connection = await mysql.createConnection(config);
      console.log(`✅ SUCCESS: Connected to MySQL at ${config.host}:${config.port}`);
      
      // Test a query
      const [rows] = await connection.execute('SHOW TABLES');
      console.log(`📊 Tables found: ${rows.length}`);
      if (rows.length > 0) {
        console.log(`📋 Tables: ${rows.map(r => Object.values(r)[0]).join(', ')}`);
      }
      
      await connection.end();
      console.log('✅ Connection closed\n');
      return config; // Return working config
      
    } catch (error) {
      console.log(`❌ Failed: ${error.code || error.message}`);
    }
  }
  
  console.log('\n❌ No working MySQL connection found');
  return null;
}

testMultiplePorts().then(workingConfig => {
  if (workingConfig) {
    console.log('\n🎯 Working configuration found!');
    console.log('Update your .env file with:');
    console.log(`DATABASE_URL="mysql://${workingConfig.user}:${workingConfig.password}@${workingConfig.host}:${workingConfig.port}/${workingConfig.database}"`);
  }
});