const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testAuth() {
  try {
    console.log('🔐 Testing authentication...\n');
    
    // Test credentials
    const email = 'admin@example.com';
    const password = 'password123';
    
    console.log(`Testing login for: ${email}`);
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`✅ User found: ${user.name} (${user.role})`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`🔑 Has password: ${user.password ? 'Yes' : 'No'}`);
    console.log(`👤 Active: ${user.isActive}`);
    
    if (!user.password) {
      console.log('❌ No password set for user');
      return;
    }
    
    // Test password
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log(`🔐 Password match: ${passwordMatch ? '✅ Yes' : '❌ No'}`);
    
    if (passwordMatch && user.isActive) {
      console.log('\n🎉 Authentication successful!');
      console.log('User can login with these credentials.');
    } else {
      console.log('\n❌ Authentication failed!');
    }
    
  } catch (error) {
    console.error('❌ Error testing auth:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuth();