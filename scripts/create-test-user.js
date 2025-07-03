const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('Creating test user...');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    // Create or update test user
    const user = await prisma.user.upsert({
      where: {
        email: 'admin@example.com'
      },
      update: {
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        name: 'Admin User'
      },
      create: {
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        name: 'Admin User',
        department: 'IT',
      }
    });
    
    console.log('✅ Test user created/updated successfully!');
    console.log('📧 Email: admin@example.com');
    console.log('🔐 Password: password123');
    console.log('👤 Role: admin');
    console.log(`🆔 ID: ${user.id}`);
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();