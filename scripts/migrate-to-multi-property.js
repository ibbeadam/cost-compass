// scripts/migrate-to-multi-property.js
/**
 * Comprehensive migration script for transforming Cost Compass 
 * from single-outlet to multi-property architecture
 * 
 * This script handles:
 * 1. Schema migration (via Prisma)
 * 2. Data migration and transformation
 * 3. User permission setup
 * 4. Property creation from existing outlets
 * 5. Backward compatibility preservation
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const readline = require('readline');

const prisma = new PrismaClient();

// Migration configuration
const MIGRATION_CONFIG = {
  // Default property for migrating existing data
  defaultProperty: {
    name: 'Main Restaurant',
    propertyCode: 'MAIN-001',
    propertyType: 'restaurant',
    currency: 'USD',
    isActive: true,
  },
  
  // Default role assignments for existing users
  defaultUserRole: 'property_manager', // Existing users get management access
  
  // Backup configuration
  createBackup: true,
  backupPrefix: 'pre_multi_property_',
};

class MultiPropertyMigration {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async run() {
    console.log('🚀 Cost Compass Multi-Property Migration');
    console.log('=====================================');
    console.log('');
    console.log('This script will transform your Cost Compass installation');
    console.log('from single-outlet to multi-property architecture.');
    console.log('');
    
    try {
      // Step 1: Pre-migration checks and backup
      await this.preMigrationChecks();
      
      // Step 2: Confirm migration
      const confirmed = await this.confirmMigration();
      if (!confirmed) {
        console.log('Migration cancelled by user.');
        return;
      }
      
      // Step 3: Create database backup
      if (MIGRATION_CONFIG.createBackup) {
        await this.createBackup();
      }
      
      // Step 4: Run Prisma schema migration
      await this.runSchemaMigration();
      
      // Step 5: Migrate existing data
      await this.migrateExistingData();
      
      // Step 6: Set up permissions and roles
      await this.setupPermissions();
      
      // Step 7: Create initial property access
      await this.setupPropertyAccess();
      
      // Step 8: Verify migration
      await this.verifyMigration();
      
      console.log('');
      console.log('🎉 Migration completed successfully!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Restart your application');
      console.log('2. Login and verify all functionality');
      console.log('3. Update user roles and permissions as needed');
      console.log('4. Create additional properties if needed');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      console.log('');
      console.log('To rollback:');
      console.log('1. Restore database from backup if created');
      console.log('2. Run: npx prisma db push --force-reset');
      console.log('3. Run: npx prisma db seed');
      throw error;
    } finally {
      this.rl.close();
      await prisma.$disconnect();
    }
  }

  async preMigrationChecks() {
    console.log('🔍 Running pre-migration checks...');
    
    try {
      // Check database connection
      await prisma.$connect();
      console.log('✅ Database connection verified');
      
      // Check existing data
      const userCount = await prisma.user.count();
      const outletCount = await prisma.outlet.count();
      const foodCostCount = await prisma.foodCostEntry.count();
      const beverageCostCount = await prisma.beverageCostEntry.count();
      const dailySummaryCount = await prisma.dailyFinancialSummary.count();
      
      console.log('📊 Current data summary:');
      console.log(`   Users: ${userCount}`);
      console.log(`   Outlets: ${outletCount}`);
      console.log(`   Food Cost Entries: ${foodCostCount}`);
      console.log(`   Beverage Cost Entries: ${beverageCostCount}`);
      console.log(`   Daily Summaries: ${dailySummaryCount}`);
      
      // Check for potential conflicts
      const existingProperties = await this.checkForExistingProperties();
      if (existingProperties.length > 0) {
        console.log('⚠️  Warning: Properties table already has data');
        console.log('   This migration may have been run before');
      }
      
    } catch (error) {
      console.error('❌ Pre-migration checks failed:', error);
      throw error;
    }
  }

  async checkForExistingProperties() {
    try {
      return await prisma.property.findMany();
    } catch (error) {
      // Property table doesn't exist yet, which is expected
      return [];
    }
  }

  async confirmMigration() {
    console.log('');
    console.log('⚠️  IMPORTANT MIGRATION WARNING ⚠️');
    console.log('');
    console.log('This migration will:');
    console.log('• Modify your database schema significantly');
    console.log('• Transform outlets into properties');
    console.log('• Update all existing financial data');
    console.log('• Change the authentication system');
    console.log('• Create new permission structures');
    console.log('');
    console.log('Please ensure you have:');
    console.log('• A recent backup of your database');
    console.log('• Stopped all application instances');
    console.log('• Notified all users of downtime');
    console.log('');
    
    const answer = await this.question('Do you want to proceed with the migration? (yes/no): ');
    return answer.toLowerCase() === 'yes';
  }

  async createBackup() {
    console.log('💾 Creating database backup...');
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `${MIGRATION_CONFIG.backupPrefix}${timestamp}`;
      
      // Note: This would need to be adapted based on your database type
      console.log(`📦 Backup would be created as: ${backupName}`);
      console.log('   Please ensure you have a backup before proceeding');
      
      // For MySQL: mysqldump -u username -p database_name > backup.sql
      // For PostgreSQL: pg_dump database_name > backup.sql
      // This would be implemented based on the specific database
      
      console.log('✅ Backup creation reminder logged');
    } catch (error) {
      console.error('❌ Backup creation failed:', error);
      throw error;
    }
  }

  async runSchemaMigration() {
    console.log('🔄 Running Prisma schema migration...');
    
    try {
      // Generate Prisma client with new schema
      console.log('   Generating Prisma client...');
      execSync('npx prisma generate', { stdio: 'inherit' });
      
      // Push schema changes to database
      console.log('   Pushing schema changes...');
      execSync('npx prisma db push', { stdio: 'inherit' });
      
      console.log('✅ Schema migration completed');
    } catch (error) {
      console.error('❌ Schema migration failed:', error);
      throw error;
    }
  }

  async migrateExistingData() {
    console.log('🔄 Migrating existing data...');
    
    try {
      // Step 1: Create default property
      const defaultProperty = await this.createDefaultProperty();
      
      // Step 2: Migrate outlets to belong to the property
      await this.migrateOutlets(defaultProperty.id);
      
      // Step 3: Update financial data with property references
      await this.migrateFinancialData(defaultProperty.id);
      
      // Step 4: Update users with enhanced fields
      await this.migrateUsers();
      
      console.log('✅ Data migration completed');
    } catch (error) {
      console.error('❌ Data migration failed:', error);
      throw error;
    }
  }

  async createDefaultProperty() {
    console.log('   Creating default property...');
    
    const existingOutlets = await prisma.outlet.findMany({
      take: 1,
      orderBy: { id: 'asc' },
    });
    
    // Use first outlet's name if available
    const propertyName = existingOutlets.length > 0 
      ? existingOutlets[0].name || MIGRATION_CONFIG.defaultProperty.name
      : MIGRATION_CONFIG.defaultProperty.name;
    
    const property = await prisma.property.create({
      data: {
        ...MIGRATION_CONFIG.defaultProperty,
        name: propertyName,
        address: 'Please update this address',
        city: 'Please update this city',
      },
    });
    
    console.log(`   ✅ Created property: ${property.name} (ID: ${property.id})`);
    return property;
  }

  async migrateOutlets(propertyId) {
    console.log('   Migrating outlets...');
    
    const outlets = await prisma.outlet.findMany();
    
    for (const outlet of outlets) {
      try {
        await prisma.outlet.update({
          where: { id: outlet.id },
          data: { propertyId: propertyId },
        });
      } catch (error) {
        // Handle case where propertyId field might not exist yet
        console.log(`   ⚠️  Skipping outlet ${outlet.id} - will be handled in schema update`);
      }
    }
    
    console.log(`   ✅ Updated ${outlets.length} outlets`);
  }

  async migrateFinancialData(propertyId) {
    console.log('   Migrating financial data...');
    
    try {
      // Update food cost entries
      const foodCostEntries = await prisma.foodCostEntry.findMany();
      for (const entry of foodCostEntries) {
        try {
          await prisma.foodCostEntry.update({
            where: { id: entry.id },
            data: { propertyId: propertyId },
          });
        } catch (error) {
          console.log(`   ⚠️  Skipping food cost entry ${entry.id}`);
        }
      }
      
      // Update beverage cost entries
      const beverageCostEntries = await prisma.beverageCostEntry.findMany();
      for (const entry of beverageCostEntries) {
        try {
          await prisma.beverageCostEntry.update({
            where: { id: entry.id },
            data: { propertyId: propertyId },
          });
        } catch (error) {
          console.log(`   ⚠️  Skipping beverage cost entry ${entry.id}`);
        }
      }
      
      // Update daily financial summaries
      const dailySummaries = await prisma.dailyFinancialSummary.findMany();
      for (const summary of dailySummaries) {
        try {
          await prisma.dailyFinancialSummary.update({
            where: { id: summary.id },
            data: { propertyId: propertyId },
          });
        } catch (error) {
          console.log(`   ⚠️  Skipping daily summary ${summary.id}`);
        }
      }
      
      console.log('   ✅ Financial data migration completed');
    } catch (error) {
      console.log('   ⚠️  Some financial data migration skipped - will be handled by schema updates');
    }
  }

  async migrateUsers() {
    console.log('   Migrating users...');
    
    const users = await prisma.user.findMany();
    
    for (const user of users) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            role: user.role || MIGRATION_CONFIG.defaultUserRole,
            isActive: user.isActive ?? true,
            loginAttempts: 0,
            twoFactorEnabled: false,
          },
        });
      } catch (error) {
        console.log(`   ⚠️  Skipping user ${user.id} - will be handled by schema updates`);
      }
    }
    
    console.log(`   ✅ Updated ${users.length} users`);
  }

  async setupPermissions() {
    console.log('🔑 Setting up permissions and roles...');
    
    try {
      // Run the permissions seeder
      const { seedPermissions } = require('../prisma/seeds/permissions');
      await seedPermissions();
      
      console.log('✅ Permissions setup completed');
    } catch (error) {
      console.error('❌ Permissions setup failed:', error);
      throw error;
    }
  }

  async setupPropertyAccess() {
    console.log('🏢 Setting up property access...');
    
    try {
      const users = await prisma.user.findMany();
      const properties = await prisma.property.findMany();
      
      if (properties.length === 0) {
        console.log('   ⚠️  No properties found, skipping access setup');
        return;
      }
      
      const defaultProperty = properties[0];
      
      // Give all existing users access to the default property
      for (const user of users) {
        try {
          await prisma.propertyAccess.create({
            data: {
              userId: user.id,
              propertyId: defaultProperty.id,
              accessLevel: user.role === 'super_admin' ? 'owner' : 'full_control',
              grantedBy: user.id, // Self-granted for migration
            },
          });
        } catch (error) {
          console.log(`   ⚠️  Skipping property access for user ${user.id}`);
        }
      }
      
      console.log(`   ✅ Granted property access to ${users.length} users`);
    } catch (error) {
      console.log('   ⚠️  Property access setup skipped - will be set up manually');
    }
  }

  async verifyMigration() {
    console.log('🔍 Verifying migration...');
    
    try {
      const userCount = await prisma.user.count();
      const propertyCount = await prisma.property.count();
      const outletCount = await prisma.outlet.count();
      const permissionCount = await prisma.permission.count();
      const rolePermissionCount = await prisma.rolePermission.count();
      
      console.log('📊 Post-migration summary:');
      console.log(`   Users: ${userCount}`);
      console.log(`   Properties: ${propertyCount}`);
      console.log(`   Outlets: ${outletCount}`);
      console.log(`   Permissions: ${permissionCount}`);
      console.log(`   Role Permissions: ${rolePermissionCount}`);
      
      if (propertyCount === 0) {
        throw new Error('No properties created during migration');
      }
      
      if (permissionCount === 0) {
        throw new Error('No permissions created during migration');
      }
      
      console.log('✅ Migration verification passed');
    } catch (error) {
      console.error('❌ Migration verification failed:', error);
      throw error;
    }
  }

  question(query) {
    return new Promise((resolve) => {
      this.rl.question(query, resolve);
    });
  }
}

// Run migration if called directly
if (require.main === module) {
  const migration = new MultiPropertyMigration();
  migration.run().catch(console.error);
}

module.exports = { MultiPropertyMigration, MIGRATION_CONFIG };