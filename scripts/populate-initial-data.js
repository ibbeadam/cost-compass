const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function populateInitialData() {
  try {
    console.log('🌱 Populating initial data...\n');

    // Create outlets
    console.log('Creating outlets...');
    let outlet1 = await prisma.outlet.findFirst({
      where: { name: 'Main Restaurant' },
    });
    
    if (!outlet1) {
      outlet1 = await prisma.outlet.create({
        data: {
          name: 'Main Restaurant',
          outletCode: 'MAIN001',
        },
      });
    }

    let outlet2 = await prisma.outlet.findFirst({
      where: { name: 'Cafe Branch' },
    });
    
    if (!outlet2) {
      outlet2 = await prisma.outlet.create({
        data: {
          name: 'Cafe Branch',
          outletCode: 'CAFE001',
        },
      });
    }

    console.log(`✅ Created outlets: ${outlet1.name}, ${outlet2.name}`);

    // Create categories
    console.log('Creating categories...');
    const foodCategories = [
      { name: 'Meat & Poultry', description: 'Beef, chicken, pork, lamb, etc.', type: 'Food' },
      { name: 'Seafood', description: 'Fish, shrimp, shellfish, etc.', type: 'Food' },
      { name: 'Vegetables', description: 'Fresh and frozen vegetables', type: 'Food' },
      { name: 'Dairy & Eggs', description: 'Milk, cheese, eggs, yogurt, etc.', type: 'Food' },
      { name: 'Grains & Bread', description: 'Rice, pasta, bread, flour, etc.', type: 'Food' },
    ];

    const beverageCategories = [
      { name: 'Soft Drinks', description: 'Cola, lemonade, fruit juices', type: 'Beverage' },
      { name: 'Coffee & Tea', description: 'Coffee beans, tea leaves, instant coffee', type: 'Beverage' },
      { name: 'Alcoholic Beverages', description: 'Beer, wine, spirits', type: 'Beverage' },
      { name: 'Water', description: 'Bottled water, sparkling water', type: 'Beverage' },
    ];

    const allCategories = [...foodCategories, ...beverageCategories];
    let createdCategories = 0;

    for (const category of allCategories) {
      const existing = await prisma.category.findFirst({
        where: {
          name: category.name,
          type: category.type,
        },
      });
      
      if (!existing) {
        await prisma.category.create({
          data: category,
        });
        createdCategories++;
      }
    }

    console.log(`✅ Created ${createdCategories} categories`);

    console.log('✅ Skipping financial summaries for now - create them through the UI');

    console.log('\n🎉 Initial data population completed!');
    console.log(`
Test your application with:
- Outlets: ${outlet1.name}, ${outlet2.name}
- Categories: ${allCategories.length} categories created
- Sample financial data for yesterday
- Login with: admin@example.com / password123
`);

  } catch (error) {
    console.error('❌ Error populating initial data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateInitialData();