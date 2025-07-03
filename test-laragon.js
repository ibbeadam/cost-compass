const mysql = require('mysql2/promise');

// Common Laragon MySQL configurations
const laragonConfigs = [
  // Default Laragon
  { host: 'localhost', port: 3306, user: 'root', password: '', database: 'cost_compass' },
  { host: '127.0.0.1', port: 3306, user: 'root', password: '', database: 'cost_compass' },
  // Alternative Laragon ports
  { host: 'localhost', port: 3307, user: 'root', password: '', database: 'cost_compass' },
  // With password
  { host: 'localhost', port: 3306, user: 'root', password: 'root', database: 'cost_compass' },
  // Laragon with different user
  { host: 'localhost', port: 3306, user: 'laragon', password: '', database: 'cost_compass' },
];

async function testLaragonConnection() {
  console.log('🔍 Testing Laragon MySQL configurations...\n');
  
  for (let i = 0; i < laragonConfigs.length; i++) {
    const config = laragonConfigs[i];
    console.log(`🧪 Testing: ${config.user}@${config.host}:${config.port} (password: ${config.password ? '***' : 'empty'})`);
    
    try {
      const connection = await mysql.createConnection(config);
      console.log(`✅ SUCCESS: Connected to Laragon MySQL!`);
      
      // Show databases
      const [databases] = await connection.execute('SHOW DATABASES');
      console.log(`📊 Databases: ${databases.map(d => Object.values(d)[0]).join(', ')}`);
      
      // Check if cost_compass exists
      const dbExists = databases.some(d => Object.values(d)[0] === 'cost_compass');
      if (dbExists) {
        console.log(`✅ Database 'cost_compass' exists!`);
        
        // Show tables
        await connection.execute('USE cost_compass');
        const [tables] = await connection.execute('SHOW TABLES');
        console.log(`📋 Tables in cost_compass: ${tables.length}`);
        if (tables.length > 0) {
          console.log(`   ${tables.map(t => Object.values(t)[0]).join(', ')}`);
        }
      } else {
        console.log(`⚠️  Database 'cost_compass' does not exist`);
      }
      
      await connection.end();
      console.log('✅ Connection closed\n');
      
      // Return working config
      return config;
      
    } catch (error) {
      console.log(`❌ Failed: ${error.code || error.message}\n`);
    }
  }
  
  return null;
}

testLaragonConnection().then(workingConfig => {
  if (workingConfig) {
    console.log('🎯 WORKING LARAGON CONFIGURATION FOUND!');
    console.log('Update your .env.local file with:');
    console.log(`DATABASE_URL="mysql://${workingConfig.user}:${workingConfig.password}@${workingConfig.host}:${workingConfig.port}/${workingConfig.database}"`);
  } else {
    console.log('❌ No working configuration found.');
    console.log('💡 Please check:');
    console.log('1. Is Laragon running?');
    console.log('2. Is MySQL service started in Laragon?');
    console.log('3. Check Laragon settings for MySQL port');
  }
});