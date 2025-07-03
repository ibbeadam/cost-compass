const { PrismaClient } = require('@prisma/client');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// You'll need to provide your service account key
// const serviceAccount = require('./firebase-service-account.json');
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? 
  JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) : 
  require('./firebase-service-account.json'); // Create this file with your service account key

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://cost-controll.firebaseio.com'
});

const prisma = new PrismaClient();
const db = admin.firestore();

async function migrateUsers() {
  console.log('Migrating users...');
  
  const usersSnapshot = await db.collection('users').get();
  
  for (const doc of usersSnapshot.docs) {
    const userData = doc.data();
    
    try {
      await prisma.user.create({
        data: {
          id: doc.id,
          email: userData.email,
          name: userData.displayName || userData.name,
          role: userData.role || 'user',
          isActive: userData.isActive !== false,
          department: userData.department,
          phoneNumber: userData.phoneNumber,
          permissions: userData.permissions || [],
          createdAt: userData.createdAt?.toDate() || new Date(),
          updatedAt: userData.updatedAt?.toDate() || new Date(),
          lastLoginAt: userData.lastLoginAt?.toDate(),
        },
      });
      console.log(`Migrated user: ${userData.email}`);
    } catch (error) {
      console.error(`Error migrating user ${userData.email}:`, error);
    }
  }
}

async function migrateOutlets() {
  console.log('Migrating outlets...');
  
  const outletsSnapshot = await db.collection('outlets').get();
  
  for (const doc of outletsSnapshot.docs) {
    const outletData = doc.data();
    
    try {
      await prisma.outlet.create({
        data: {
          id: doc.id,
          name: outletData.name,
          isActive: outletData.isActive !== false,
          address: outletData.address,
          phoneNumber: outletData.phoneNumber,
          email: outletData.email,
          type: outletData.type,
          currency: outletData.currency,
          timezone: outletData.timezone,
          defaultBudgetFoodCostPct: outletData.defaultBudgetFoodCostPct,
          defaultBudgetBeverageCostPct: outletData.defaultBudgetBeverageCostPct,
          targetOccupancy: outletData.targetOccupancy,
          createdAt: outletData.createdAt?.toDate() || new Date(),
          updatedAt: outletData.updatedAt?.toDate() || new Date(),
        },
      });
      console.log(`Migrated outlet: ${outletData.name}`);
    } catch (error) {
      console.error(`Error migrating outlet ${outletData.name}:`, error);
    }
  }
}

async function migrateCategories() {
  console.log('Migrating categories...');
  
  const categoriesSnapshot = await db.collection('categories').get();
  
  for (const doc of categoriesSnapshot.docs) {
    const categoryData = doc.data();
    
    try {
      await prisma.category.create({
        data: {
          id: doc.id,
          name: categoryData.name,
          description: categoryData.description,
          type: categoryData.type,
          createdAt: categoryData.createdAt?.toDate() || new Date(),
          updatedAt: categoryData.updatedAt?.toDate() || new Date(),
        },
      });
      console.log(`Migrated category: ${categoryData.name}`);
    } catch (error) {
      console.error(`Error migrating category ${categoryData.name}:`, error);
    }
  }
}

async function migrateDailyFinancialSummaries() {
  console.log('Migrating daily financial summaries...');
  
  const summariesSnapshot = await db.collection('dailyFinancialSummaries').get();
  
  for (const doc of summariesSnapshot.docs) {
    const summaryData = doc.data();
    
    try {
      await prisma.dailyFinancialSummary.create({
        data: {
          id: doc.id,
          date: summaryData.date?.toDate() || new Date(),
          outletId: summaryData.outlet_id,
          actualFoodRevenue: summaryData.actual_food_revenue || 0,
          actualBeverageRevenue: summaryData.actual_beverage_revenue || 0,
          budgetFoodRevenue: summaryData.budget_food_revenue || 0,
          budgetBeverageRevenue: summaryData.budget_beverage_revenue || 0,
          budgetFoodCost: summaryData.budget_food_cost || 0,
          budgetBeverageCost: summaryData.budget_beverage_cost || 0,
          grossFoodCost: summaryData.gross_food_cost || 0,
          grossBeverageCost: summaryData.gross_beverage_cost || 0,
          netFoodCost: summaryData.net_food_cost || 0,
          netBeverageCost: summaryData.net_beverage_cost || 0,
          totalAdjustedFoodCost: summaryData.total_adjusted_food_cost || 0,
          totalAdjustedBeverageCost: summaryData.total_adjusted_beverage_cost || 0,
          totalCovers: summaryData.total_covers || 0,
          averageCheck: summaryData.average_check || 0,
          budgetFoodCostPct: summaryData.budget_food_cost_pct || 0,
          budgetBeverageCostPct: summaryData.budget_beverage_cost_pct || 0,
          entFood: summaryData.ent_food || 0,
          ocFood: summaryData.oc_food || 0,
          otherFoodAdjustment: summaryData.other_food_adjustment || 0,
          entertainmentBeverageCost: summaryData.entertainment_beverage_cost || 0,
          officerCheckCompBeverage: summaryData.officer_check_comp_beverage || 0,
          otherBeverageAdjustments: summaryData.other_beverage_adjustments || 0,
          actualFoodCost: summaryData.actual_food_cost,
          actualFoodCostPct: summaryData.actual_food_cost_pct,
          foodVariancePct: summaryData.food_variance_pct,
          actualBeverageCost: summaryData.actual_beverage_cost,
          actualBeverageCostPct: summaryData.actual_beverage_cost_pct,
          beverageVariancePct: summaryData.beverage_variance_pct,
          notes: summaryData.notes,
          createdAt: summaryData.createdAt?.toDate() || new Date(),
          updatedAt: summaryData.updatedAt?.toDate() || new Date(),
        },
      });
      console.log(`Migrated daily summary for outlet: ${summaryData.outlet_id}`);
    } catch (error) {
      console.error(`Error migrating daily summary:`, error);
    }
  }
}

async function main() {
  try {
    console.log('Starting migration from Firebase to MySQL...');
    
    // Migrate in order due to foreign key constraints
    await migrateUsers();
    await migrateOutlets();
    await migrateCategories();
    await migrateDailyFinancialSummaries();
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();