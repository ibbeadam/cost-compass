const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupSampleData() {
  console.log('🧹 Cleaning up sample data...');

  try {
    // Delete financial summaries with "Sample data" in the note
    const result = await prisma.dailyFinancialSummary.deleteMany({
      where: {
        note: {
          contains: 'Sample data for'
        }
      }
    });

    console.log(`✅ Deleted ${result.count} sample financial records`);

    // Delete the sample outlets we created
    const outlet1 = await prisma.outlet.deleteMany({
      where: {
        AND: [
          { name: 'Main Restaurant' },
          { outletCode: 'MAIN001' }
        ]
      }
    });

    const outlet2 = await prisma.outlet.deleteMany({
      where: {
        AND: [
          { name: 'Cafe Branch' },
          { outletCode: 'CAFE001' }
        ]
      }
    });

    console.log(`✅ Deleted ${outlet1.count + outlet2.count} sample outlets`);

  } catch (error) {
    console.error('Error cleaning up sample data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupSampleData();