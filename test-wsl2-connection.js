const mysql = require('mysql2/promise');

async function testWSL2Connection() {
  const windowsHostIP = '10.255.255.254'; // WSL2 host IP
  
  const configs = [
    // Try Windows host IP
    { host: windowsHostIP, port: 3306, user: 'root', password: '', database: 'cost_compass' },
    // Try localhost (might work if port forwarding is set up)
    { host: 'localhost', port: 3306, user: 'root', password: '', database: 'cost_compass' },
    // Try 127.0.0.1
    { host: '127.0.0.1', port: 3306, user: 'root', password: '', database: 'cost_compass' },
  ];

  console.log('🔍 Testing WSL2 to Windows MySQL connection...\n');
  
  for (const config of configs) {
    console.log(`🧪 Testing: ${config.host}:${config.port}`);
    
    try {
      const connection = await mysql.createConnection(config);
      console.log(`✅ SUCCESS: Connected via ${config.host}!`);
      
      // Test query
      const [result] = await connection.execute('SELECT VERSION() as version');
      console.log(`📊 MySQL Version: ${result[0].version}`);
      
      // Check database
      const [databases] = await connection.execute('SHOW DATABASES');
      const dbExists = databases.some(d => Object.values(d)[0] === 'cost_compass');
      console.log(`📁 Database 'cost_compass' exists: ${dbExists}`);
      
      if (dbExists) {
        await connection.execute('USE cost_compass');
        const [tables] = await connection.execute('SHOW TABLES');
        console.log(`📋 Tables: ${tables.length}`);
      }
      
      await connection.end();
      console.log('✅ Connection closed\n');
      
      return { ...config, working: true };
      
    } catch (error) {
      console.log(`❌ Failed: ${error.code || error.message}\n`);
    }
  }
  
  return null;
}

testWSL2Connection().then(workingConfig => {
  if (workingConfig) {
    console.log('🎯 WORKING WSL2 CONFIGURATION FOUND!');
    console.log('\nUpdate your .env.local file with:');
    console.log(`DATABASE_URL="mysql://${workingConfig.user}:${workingConfig.password}@${workingConfig.host}:${workingConfig.port}/${workingConfig.database}"`);
    console.log('\nThis should fix the Prisma connection issue!');
  } else {
    console.log('❌ No working WSL2 configuration found.');
    console.log('\n💡 WSL2 Solutions to try:');
    console.log('1. Update .env.local to use Windows host IP');
    console.log('2. Configure port forwarding');
    console.log('3. Run the app directly on Windows (outside WSL2)');
  }
});