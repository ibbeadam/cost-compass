/**
 * Phase 3 Database Setup Script
 * Sets up additional tables for advanced permission management features
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupPhase3Tables() {
  console.log('🚀 Setting up Phase 3 permission management tables...');

  try {
    // The tables are defined in the Prisma schema and will be created by Prisma migrations
    // This script ensures they exist and seeds initial data

    console.log('✅ Checking table existence...');

    // Check if new tables exist, if not, recommend running prisma migrate
    try {
      await prisma.$queryRaw`SELECT 1 FROM permission_delegations LIMIT 1`;
      console.log('✅ permission_delegations table exists');
    } catch (error) {
      console.log('⚠️  permission_delegations table does not exist - run: npx prisma migrate dev');
    }

    try {
      await prisma.$queryRaw`SELECT 1 FROM permission_templates LIMIT 1`;
      console.log('✅ permission_templates table exists');
    } catch (error) {
      console.log('⚠️  permission_templates table does not exist - run: npx prisma migrate dev');
    }

    try {
      await prisma.$queryRaw`SELECT 1 FROM bulk_operations LIMIT 1`;
      console.log('✅ bulk_operations table exists');
    } catch (error) {
      console.log('⚠️  bulk_operations table does not exist - run: npx prisma migrate dev');
    }

    // Try to create some default permission templates
    console.log('📝 Creating default permission templates...');

    const superAdminUser = await prisma.user.findFirst({
      where: { role: 'super_admin' }
    });

    if (superAdminUser) {
      try {
        // Create a basic role template
        await prisma.permissionTemplate.upsert({
          where: { name: 'Basic Staff Template' },
          update: {},
          create: {
            name: 'Basic Staff Template',
            description: 'Standard permissions for staff members',
            type: 'role_template',
            permissions: [
              'financial.daily_summary.read',
              'financial.food_costs.read',
              'financial.food_costs.create',
              'financial.beverage_costs.read',
              'financial.beverage_costs.create',
              'reports.basic.read',
              'outlets.read',
              'dashboard.view'
            ],
            isActive: true,
            createdBy: superAdminUser.id
          }
        });

        // Create a manager template
        await prisma.permissionTemplate.upsert({
          where: { name: 'Manager Template' },
          update: {},
          create: {
            name: 'Manager Template',
            description: 'Enhanced permissions for managers',
            type: 'role_template',
            permissions: [
              'financial.daily_summary.read',
              'financial.daily_summary.create',
              'financial.daily_summary.update',
              'financial.food_costs.read',
              'financial.food_costs.create',
              'financial.food_costs.update',
              'financial.beverage_costs.read',
              'financial.beverage_costs.create',
              'financial.beverage_costs.update',
              'reports.basic.read',
              'reports.advanced.read',
              'outlets.read',
              'outlets.update',
              'dashboard.view',
              'analytics.basic.read'
            ],
            isActive: true,
            createdBy: superAdminUser.id
          }
        });

        console.log('✅ Default permission templates created');

        // Create a basic user group
        await prisma.userGroup.upsert({
          where: { name: 'All Staff' },
          update: {},
          create: {
            name: 'All Staff',
            description: 'Default group for all staff members',
            type: 'role_group',
            rules: {
              autoAssign: true,
              roles: ['staff', 'supervisor']
            },
            createdBy: superAdminUser.id
          }
        });

        console.log('✅ Default user groups created');

      } catch (error) {
        console.log('⚠️  Could not create default templates (tables may not exist yet)');
        console.log('   Run "npx prisma migrate dev" first, then run this script again');
      }
    } else {
      console.log('⚠️  No super admin user found - cannot create default templates');
    }

    console.log('🎉 Phase 3 setup completed successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Run "npx prisma migrate dev" if tables do not exist');
    console.log('2. Access the Permission Management Dashboard at /dashboard/permissions');
    console.log('3. Create additional templates and user groups as needed');
    console.log('4. Set up compliance policies for your organization');

  } catch (error) {
    console.error('❌ Error setting up Phase 3 tables:', error);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Ensure your database is running and accessible');
    console.log('2. Run "npx prisma generate" to update the Prisma client');
    console.log('3. Run "npx prisma migrate dev" to apply schema changes');
    console.log('4. Run this script again after migrations are complete');
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
setupPhase3Tables();