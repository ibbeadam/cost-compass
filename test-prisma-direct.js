// Test Prisma connection directly
const { PrismaClient } = require('@prisma/client');

async function testPrismaConnection() {
  console.log('Testing Prisma connection...');
  
  try {
    const prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
    
    console.log('📡 Attempting to connect...');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Prisma connected successfully!');
    
    // Test a simple query
    const userCount = await prisma.user.count();
    console.log(`👥 Users in database: ${userCount}`);
    
    // Check if any tables exist
    const tables = await prisma.$queryRaw`SHOW TABLES`;
    console.log(`📊 Tables found: ${tables.length}`);
    
    await prisma.$disconnect();
    console.log('✅ Prisma disconnected');
    
  } catch (error) {
    console.error('❌ Prisma connection failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    
    if (error.code === 'P1001') {
      console.log('\n💡 This confirms the database is not reachable');
    }
  }
}

testPrismaConnection();