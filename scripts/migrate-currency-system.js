#!/usr/bin/env node

/**
 * Currency system migration script
 * This safely migrates from string-based currency to relational currency system
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

console.log('🚀 Starting currency system migration...');
console.log('⚠️  This will modify your database structure and data.');
console.log('⚠️  Make sure you have a backup before proceeding.');
console.log('');

// Load environment variables
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    // Parse database URL
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable not found');
    }
    
    // Extract connection details from URL
    const url = new URL(databaseUrl);
    const connectionConfig = {
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Remove leading slash
      multipleStatements: true
    };
    
    console.log(`📡 Connecting to database: ${connectionConfig.database} at ${connectionConfig.host}:${connectionConfig.port}`);
    
    // Create connection
    connection = await mysql.createConnection(connectionConfig);
    
    console.log('✅ Connected to database');
    
    // Check if currencies table already exists
    const [tables] = await connection.execute("SHOW TABLES LIKE 'currencies'");
    
    if (tables.length > 0) {
      console.log('📋 Currencies table already exists. Checking structure...');
      
      // Check if properties table still has the old currency column
      const [columns] = await connection.execute("SHOW COLUMNS FROM properties LIKE 'currency'");
      
      if (columns.length === 0) {
        console.log('✅ Migration appears to be already completed.');
        console.log('📊 Currency system is ready to use.');
        return;
      } else {
        console.log('🔄 Found old currency column, proceeding with migration...');
      }
    }
    
    // Read and execute migration SQL
    const migrationPath = path.join(__dirname, '..', 'prisma', 'migrations', 'migrate-currency-system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🛠️  Executing migration...');
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        console.log(`   ⏳ Executing step ${i + 1}/${statements.length}...`);
        await connection.execute(statement);
      }
    }
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the migration
    console.log('🔍 Verifying migration...');
    
    const [currencyCount] = await connection.execute('SELECT COUNT(*) as count FROM currencies');
    const [propertyColumns] = await connection.execute("SHOW COLUMNS FROM properties LIKE 'currency_id'");
    
    console.log(`📊 Found ${currencyCount[0].count} currencies in database`);
    console.log(`🔗 Properties table ${propertyColumns.length > 0 ? 'has' : 'missing'} currency_id column`);
    
    if (currencyCount[0].count > 0 && propertyColumns.length > 0) {
      console.log('✅ Migration verification passed!');
    } else {
      throw new Error('Migration verification failed');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('');
    console.error('🔧 Troubleshooting steps:');
    console.error('1. Check your DATABASE_URL in .env file');
    console.error('2. Ensure the database is accessible');
    console.error('3. Make sure you have the necessary permissions');
    console.error('4. Check the migration SQL file exists');
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

async function seedCurrencies() {
  console.log('');
  console.log('🌱 Seeding additional currencies...');
  
  try {
    // Run the TypeScript seeding script
    const seedPath = path.join(__dirname, '..', 'prisma', 'migrations', 'seed-currencies.ts');
    
    execSync(`npx tsx "${seedPath}"`, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    console.log('✅ Currency seeding completed!');
  } catch (error) {
    console.warn('⚠️  Currency seeding failed, but basic currencies are available');
    console.warn('   You can run the seed script manually later if needed');
  }
}

async function updatePrismaSchema() {
  console.log('');
  console.log('🔄 Updating Prisma client...');
  
  try {
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    console.log('✅ Prisma client updated!');
  } catch (error) {
    console.warn('⚠️  Failed to update Prisma client');
    console.warn('   Run "npx prisma generate" manually');
  }
}

// Main execution
async function main() {
  await runMigration();
  await seedCurrencies();
  await updatePrismaSchema();
  
  console.log('');
  console.log('🎉 Currency system migration completed successfully!');
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. Restart your development server');
  console.log('2. Check /dashboard/settings/currencies (super_admin only)');
  console.log('3. Verify existing properties can still be edited');
  console.log('4. Test creating new properties with different currencies');
}

main().catch(console.error);