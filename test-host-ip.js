const mysql = require('mysql2/promise');

async function testHostIP() {
  const hostIP = '172.23.128.1';
  
  console.log(`🔍 Testing connection to Windows host: ${hostIP}:3306\n`);
  
  try {
    const connection = await mysql.createConnection({
      host: hostIP,
      port: 3306,
      user: 'root',
      password: '',
      database: 'cost_compass'
    });
    
    console.log('✅ SUCCESS: Connected to Laragon MySQL from WSL2!');
    
    const [result] = await connection.execute('SELECT VERSION() as version');
    console.log(`📊 MySQL Version: ${result[0].version}`);
    
    const [databases] = await connection.execute('SHOW DATABASES');
    const dbExists = databases.some(d => Object.values(d)[0] === 'cost_compass');
    console.log(`📁 Database 'cost_compass' exists: ${dbExists}`);
    
    if (dbExists) {
      await connection.execute('USE cost_compass');
      const [tables] = await connection.execute('SHOW TABLES');
      console.log(`📋 Tables: ${tables.length}`);
      if (tables.length > 0) {
        console.log(`   ${tables.map(t => Object.values(t)[0]).join(', ')}`);
      }
    }
    
    await connection.end();
    console.log('✅ Connection successful!\n');
    
    console.log('🎯 UPDATE YOUR .env.local FILE:');
    console.log(`DATABASE_URL="mysql://root:@${hostIP}:3306/cost_compass"`);
    
    return true;
    
  } catch (error) {
    console.log(`❌ Connection failed: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Possible solutions:');
      console.log('1. Check Windows Firewall (allow port 3306)');
      console.log('2. Configure MySQL to bind to all interfaces');
      console.log('3. Run the project directly on Windows');
    }
    
    return false;
  }
}

testHostIP();