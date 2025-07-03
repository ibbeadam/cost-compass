const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('🚀 Creating default admin user...');
    
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@costcompass.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.ADMIN_NAME || 'System Administrator';
    
    console.log('Email:', adminEmail);
    console.log('Name:', adminName);
    console.log('Password:', adminPassword);
    console.log('');
    
    // Check if admin user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    });
    
    if (existingUser) {
      console.log('⚠️  Admin user already exists!');
      console.log('User ID:', existingUser.id);
      console.log('Role:', existingUser.role);
      console.log('Active:', existingUser.isActive);
      
      if (existingUser.role === 'admin') {
        console.log('✅ Admin user is already set up correctly!');
        return existingUser;
      } else {
        console.log('🔄 Updating user role to admin...');
        const updatedUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: { 
            role: 'admin',
            isActive: true,
            updatedAt: new Date()
          }
        });
        console.log('✅ User role updated to admin!');
        return updatedUser;
      }
    }
    
    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    
    // Create admin user
    console.log('📝 Creating admin user in database...');
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        department: 'IT',
        phoneNumber: null,
        permissions: ['all']
      }
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('User ID:', adminUser.id);
    console.log('Email:', adminUser.email);
    console.log('Role:', adminUser.role);
    console.log('');
    console.log('🎉 You can now login with:');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('');
    console.log('⚠️  IMPORTANT: Change the default password after first login!');
    
    return adminUser;
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    
    if (error.code === 'P2002') {
      console.log('');
      console.log('🔧 This error usually means the email already exists.');
      console.log('Try running the script again or check your database.');
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  createAdminUser()
    .then(() => {
      console.log('Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = createAdminUser;