// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { seedPermissions } from './seeds/permissions';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting database seeding...');
  
  try {
    // Seed permissions and role mappings
    await seedPermissions();
    
    // Seed initial categories (existing functionality preserved)
    await seedCategories();
    
    // Seed initial property (migration from existing outlets)
    await seedInitialProperty();
    
    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function seedCategories() {
  console.log('🌱 Seeding categories...');
  
  const foodCategories = [
    { name: 'Appetizers', description: 'Starter dishes and small plates', type: 'Food' },
    { name: 'Main Courses', description: 'Primary entrees and main dishes', type: 'Food' },
    { name: 'Desserts', description: 'Sweet dishes and after-meal treats', type: 'Food' },
    { name: 'Proteins', description: 'Meat, fish, and protein sources', type: 'Food' },
    { name: 'Vegetables', description: 'Fresh and cooked vegetables', type: 'Food' },
    { name: 'Dairy', description: 'Milk, cheese, and dairy products', type: 'Food' },
    { name: 'Grains', description: 'Rice, pasta, bread, and grain products', type: 'Food' },
    { name: 'Seasonings', description: 'Spices, herbs, and flavoring agents', type: 'Food' },
  ];
  
  const beverageCategories = [
    { name: 'Alcoholic Beverages', description: 'Beer, wine, spirits, and cocktails', type: 'Beverage' },
    { name: 'Non-Alcoholic Beverages', description: 'Soft drinks, juices, and non-alcoholic options', type: 'Beverage' },
    { name: 'Hot Beverages', description: 'Coffee, tea, and hot drinks', type: 'Beverage' },
    { name: 'Cold Beverages', description: 'Iced drinks and cold beverages', type: 'Beverage' },
    { name: 'Specialty Drinks', description: 'Signature beverages and specialty preparations', type: 'Beverage' },
  ];
  
  const allCategories = [...foodCategories, ...beverageCategories];
  
  for (const category of allCategories) {
    await prisma.category.create({
      data: category,
    });
  }
  
  console.log(`✅ Created ${allCategories.length} categories`);
}

async function seedInitialProperty() {
  console.log('🌱 Seeding initial property...');
  
  try {
    // Check if we already have properties
    const existingProperty = await prisma.property.findFirst();
    
    if (!existingProperty) {
      // Create a default property for migration purposes
      const defaultProperty = await prisma.property.create({
        data: {
          name: 'Default Property',
          propertyCode: 'DEFAULT-001',
          propertyType: 'restaurant',
          address: 'To be updated',
          city: 'To be updated',
          country: 'US',
          currencyId: 1, // USD
          isActive: true,
        },
      });
      
      console.log(`✅ Created default property with ID: ${defaultProperty.id}`);
      
      // Check if we have existing outlets without propertyId
      const existingOutlets = await prisma.outlet.findMany({
        where: {
          // This will need to be updated once the migration runs
          // For now, just prepare the structure
        },
      });
      
      console.log(`📋 Found ${existingOutlets.length} existing outlets for potential migration`);
    } else {
      console.log('✅ Properties already exist, skipping initial property creation');
    }
  } catch (error) {
    console.log('⚠️  Property seeding skipped - likely due to schema migration pending');
    console.log('   This is expected if running seeds before migration');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });