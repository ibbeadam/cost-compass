const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createSampleFinancialData() {
  console.log('🌱 Creating sample financial data...');

  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));

  // Create 30 days of sample data
  for (let i = 0; i < 30; i++) {
    const date = new Date(thirtyDaysAgo.getTime() + (i * 24 * 60 * 60 * 1000));
    
    // Check if data already exists for this date
    const existing = await prisma.dailyFinancialSummary.findUnique({
      where: { date: date }
    });

    if (!existing) {
      // Generate some realistic sample data
      const foodRevenue = 1500 + Math.random() * 1000; // $1500-2500
      const beverageRevenue = 800 + Math.random() * 600; // $800-1400
      const foodCostPct = 0.28 + Math.random() * 0.08; // 28-36%
      const beverageCostPct = 0.20 + Math.random() * 0.08; // 20-28%

      await prisma.dailyFinancialSummary.create({
        data: {
          date: date,
          actualFoodRevenue: Math.round(foodRevenue * 100) / 100,
          budgetFoodRevenue: Math.round((foodRevenue * 0.95) * 100) / 100,
          actualFoodCost: Math.round((foodRevenue * foodCostPct) * 100) / 100,
          budgetFoodCost: Math.round((foodRevenue * 0.30) * 100) / 100,
          actualFoodCostPct: Math.round(foodCostPct * 10000) / 100,
          budgetFoodCostPct: 30.0,
          foodVariancePct: Math.round((foodCostPct - 0.30) * 10000) / 100,
          entFood: 0,
          coFood: 0,
          otherFoodAdjustment: 0,
          actualBeverageRevenue: Math.round(beverageRevenue * 100) / 100,
          budgetBeverageRevenue: Math.round((beverageRevenue * 0.92) * 100) / 100,
          actualBeverageCost: Math.round((beverageRevenue * beverageCostPct) * 100) / 100,
          budgetBeverageCost: Math.round((beverageRevenue * 0.25) * 100) / 100,
          actualBeverageCostPct: Math.round(beverageCostPct * 10000) / 100,
          budgetBeverageCostPct: 25.0,
          beverageVariancePct: Math.round((beverageCostPct - 0.25) * 10000) / 100,
          entBeverage: 0,
          coBeverage: 0,
          otherBeverageAdjustment: 0,
          note: `Sample data for ${date.toDateString()}`,
        }
      });
    }
  }

  console.log('✅ Sample financial data created for the last 30 days');
  await prisma.$disconnect();
}

createSampleFinancialData().catch(console.error);