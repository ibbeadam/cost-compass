#!/usr/bin/env node

/**
 * Currency seeding script
 * Run this after applying the Currency table migration
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting currency seeding process...');

try {
  // Run the TypeScript seeding script
  const seedPath = path.join(__dirname, '..', 'prisma', 'migrations', 'seed-currencies.ts');
  
  console.log('📦 Running currency seed...');
  execSync(`npx tsx "${seedPath}"`, { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('✅ Currency seeding completed successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Currencies are now available in the database');
  console.log('2. Super admins can manage currencies at /dashboard/settings/currencies');
  console.log('3. Properties can now use any active currency');
  
} catch (error) {
  console.error('❌ Currency seeding failed:', error.message);
  process.exit(1);
}