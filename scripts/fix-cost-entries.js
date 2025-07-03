// scripts/fix-cost-entries.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixExistingData() {
  try {
    console.log('🔧 Fixing existing cost entries...');
    
    // Get the default property
    const defaultProperty = await prisma.property.findFirst({
      where: { isActive: true }
    });
    
    if (!defaultProperty) {
      console.log('❌ No default property found');
      return;
    }
    
    console.log(`Using default property: ${defaultProperty.name} (ID: ${defaultProperty.id})`);
    
    // Update food cost entries that have null propertyId
    const updatedFoodCosts = await prisma.foodCostEntry.updateMany({
      where: { propertyId: null },
      data: { propertyId: defaultProperty.id }
    });
    
    console.log(`✅ Updated ${updatedFoodCosts.count} food cost entries`);
    
    // Update beverage cost entries that have null propertyId
    const updatedBeverageCosts = await prisma.beverageCostEntry.updateMany({
      where: { propertyId: null },
      data: { propertyId: defaultProperty.id }
    });
    
    console.log(`✅ Updated ${updatedBeverageCosts.count} beverage cost entries`);
    
    console.log('\n🔄 Now triggering recalculation...');
    
    // Get all daily financial summaries and trigger recalculation
    const summaries = await prisma.dailyFinancialSummary.findMany();
    
    for (const summary of summaries) {
      console.log(`Recalculating for ${summary.date.toISOString().split('T')[0]}...`);
      
      // Calculate totals from food cost entries for this property and date
      const normalizedDate = new Date(summary.date);
      normalizedDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(normalizedDate.getTime() + 24 * 60 * 60 * 1000);
      
      const foodCostEntries = await prisma.foodCostEntry.findMany({
        where: {
          date: {
            gte: normalizedDate,
            lt: nextDay,
          },
          propertyId: summary.propertyId,
        },
      });
      
      const totalFoodCost = foodCostEntries.reduce((sum, entry) => sum + entry.totalFoodCost, 0);
      
      // Calculate totals from beverage cost entries
      const beverageCostEntries = await prisma.beverageCostEntry.findMany({
        where: {
          date: {
            gte: normalizedDate,
            lt: nextDay,
          },
          propertyId: summary.propertyId,
        },
      });
      
      const totalBeverageCost = beverageCostEntries.reduce((sum, entry) => sum + entry.totalBeverageCost, 0);
      
      // Calculate actual costs with adjustments
      const actualFoodCost = totalFoodCost - summary.entFood - summary.coFood + summary.otherFoodAdjustment;
      const actualBeverageCost = totalBeverageCost - summary.entBeverage - summary.coBeverage + summary.otherBeverageAdjustment;
      
      // Calculate percentages
      const actualFoodCostPct = summary.actualFoodRevenue > 0 ? (actualFoodCost / summary.actualFoodRevenue) * 100 : 0;
      const actualBeverageCostPct = summary.actualBeverageRevenue > 0 ? (actualBeverageCost / summary.actualBeverageRevenue) * 100 : 0;
      
      // Calculate variances
      const foodVariancePct = actualFoodCostPct - summary.budgetFoodCostPct;
      const beverageVariancePct = actualBeverageCostPct - summary.budgetBeverageCostPct;
      
      // Update the summary
      await prisma.dailyFinancialSummary.update({
        where: { id: summary.id },
        data: {
          actualFoodCost,
          actualFoodCostPct,
          foodVariancePct,
          actualBeverageCost,
          actualBeverageCostPct,
          beverageVariancePct,
        },
      });
      
      console.log(`  ✅ Updated: Food Cost $${actualFoodCost}, Beverage Cost $${actualBeverageCost}`);
    }
    
    console.log('\n🎉 All calculations updated!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  fixExistingData().catch(console.error);
}

module.exports = { fixExistingData };