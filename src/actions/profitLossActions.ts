"use server";

import { collection, query, where, getDocs, Timestamp, orderBy, getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, startOfMonth, endOfMonth } from "date-fns";
import type { DailyFinancialSummary, MonthlyProfitLossReport, PLStatementItem, Outlet, FoodCostEntry, BeverageCostEntry, BudgetVsActualsReport, DailyRevenueTrendsReport } from "@/types";
import { getOutletsAction } from "./foodCostActions";

const DAILY_FINANCIAL_SUMMARIES_COLLECTION = "dailyFinancialSummaries";
const FOOD_COST_ENTRIES_COLLECTION = "foodCostEntries";
const BEVERAGE_COST_ENTRIES_COLLECTION = "beverageCostEntries";
const OUTLETS_COLLECTION = "outlets";

export async function getMonthlyProfitLossReportAction(
  year: number,
  month: number // 0-indexed (0 for January, 11 for December)
): Promise<MonthlyProfitLossReport> {
  if (!db) {
    throw new Error("Firestore 'db' instance is not available.");
  }

  const startDate = startOfMonth(new Date(year, month));
  const endDate = endOfMonth(new Date(year, month));

  const startTimestamp = Timestamp.fromDate(startDate);
  const endTimestamp = Timestamp.fromDate(endDate);

  const q = query(
    collection(db, DAILY_FINANCIAL_SUMMARIES_COLLECTION),
    where("date", ">=", startTimestamp),
    where("date", "<=", endTimestamp),
    orderBy("date", "asc")
  );

  const querySnapshot = await getDocs(q);

  let totalFoodRevenue = 0;
  let totalBeverageRevenue = 0;
  let totalActualFoodCost = 0;
  let totalActualBeverageCost = 0;
  let totalBudgetFoodCostPct = 0;
  let budgetFoodCostPctCount = 0;
  let totalBudgetBeverageCostPct = 0;
  let budgetBeverageCostPctCount = 0;

  querySnapshot.forEach((doc) => {
    const data = doc.data() as DailyFinancialSummary;
    totalFoodRevenue += data.food_revenue || 0;
    totalBeverageRevenue += data.beverage_revenue || 0;
    totalActualFoodCost += data.actual_food_cost || 0;
    totalActualBeverageCost += data.actual_beverage_cost || 0;

    if (data.budget_food_cost_pct != null) {
      totalBudgetFoodCostPct += data.budget_food_cost_pct;
      budgetFoodCostPctCount++;
    }
    if (data.budget_beverage_cost_pct != null) {
      totalBudgetBeverageCostPct += data.budget_beverage_cost_pct;
      budgetBeverageCostPctCount++;
    }
  });

  const totalRevenue = totalFoodRevenue + totalBeverageRevenue;
  const totalActualCost = totalActualFoodCost + totalActualBeverageCost;
  const grossProfit = totalRevenue - totalActualCost;

  const foodCostPercentage = totalFoodRevenue > 0 ? (totalActualFoodCost / totalFoodRevenue) * 100 : 0;
  const beverageCostPercentage = totalBeverageRevenue > 0 ? (totalActualBeverageCost / totalBeverageRevenue) * 100 : 0;
  const overallCostPercentage = totalRevenue > 0 ? (totalActualCost / totalRevenue) * 100 : 0;

  const averageBudgetFoodCostPct = budgetFoodCostPctCount > 0 ? totalBudgetFoodCostPct / budgetFoodCostPctCount : 0;
  const averageBudgetBeverageCostPct = budgetBeverageCostPctCount > 0 ? totalBudgetBeverageCostPct / budgetBeverageCostPctCount : 0;

  // Placeholder for detailed P&L. Actual values would come from more comprehensive data sources.
  const incomeItems: PLStatementItem[] = [
    { referenceId: "A1111-4267", description: "Guest Reservations", amount: totalRevenue },
    { referenceId: "A1111-4268", description: "Food Purchases", amount: totalFoodRevenue }, // Interpreted as Food Revenue/Sales
    { referenceId: "A1111-4269", description: "Events", amount: 151000 }, // Placeholder
    { referenceId: "A1111-4270", description: "Other", amount: 48750 },   // Placeholder
  ];
  const salesReturnsAllowances = -7562; // Placeholder, as a negative amount

  const totalIncome = incomeItems.reduce((sum, item) => sum + item.amount, 0);
  const totalRevenuePL = totalIncome + salesReturnsAllowances;

  const expenseItems: PLStatementItem[] = [
    { referenceId: "R4444-5345", description: "Utilities", amount: 21500 }, // Placeholder
    { referenceId: "R4444-5346", description: "Maintenance", amount: 17640 }, // Placeholder
    { referenceId: "R4444-5347", description: "Depreciation", amount: 29500 }, // Placeholder
    { referenceId: "R4444-5348", description: "Staff Wages", amount: 250400 }, // Placeholder
    { referenceId: "R4444-5349", description: "Insurance", amount: 16500 }, // Placeholder
    { referenceId: "R4444-5350", description: "Legal Fees", amount: 7800 }, // Placeholder
    { referenceId: "R4444-5351", description: "Advertising", amount: 18500 }, // Placeholder
    { referenceId: "R4444-5352", description: "Supplies", amount: 4750 }, // Placeholder
    { referenceId: "R4444-5353", description: "Other", amount: 8500 }, // Placeholder
  ];
  const totalExpenses = expenseItems.reduce((sum, item) => sum + item.amount, 0);

  const netIncomeBeforeTaxes = totalRevenuePL - totalExpenses;
  const taxRate = 0.0953; // Placeholder for 9.53%
  const incomeTaxExpense = netIncomeBeforeTaxes * taxRate;
  const netIncome = netIncomeBeforeTaxes - incomeTaxExpense;

  return {
    monthYear: format(startDate, "MMMM yyyy"),
    totalFoodRevenue,
    totalBeverageRevenue,
    totalRevenue,
    totalActualFoodCost,
    totalActualBeverageCost,
    totalActualCost,
    grossProfit,
    foodCostPercentage,
    beverageCostPercentage,
    overallCostPercentage,
    averageBudgetFoodCostPct,
    averageBudgetBeverageCostPct,
    incomeItems,
    salesReturnsAllowances,
    totalIncome,
    totalRevenuePL,
    expenseItems,
    totalExpenses,
    netIncomeBeforeTaxes,
    taxRate,
    incomeTaxExpense,
    netIncome,
  };
}

export async function getMonthlyProfitLossReportForDateRangeAction(
  startDate: Date,
  endDate: Date
): Promise<MonthlyProfitLossReport> {
  if (!db) {
    throw new Error("Firestore 'db' instance is not available.");
  }

  const startTimestamp = Timestamp.fromDate(startDate);
  const endTimestamp = Timestamp.fromDate(endDate);

  // 1. Fetch all outlets
  const outlets: Outlet[] = await getOutletsAction();

  // 2. Fetch all DailyFinancialSummary in range
  const summaryQuery = query(
    collection(db, DAILY_FINANCIAL_SUMMARIES_COLLECTION),
    where("date", ">=", startTimestamp),
    where("date", "<=", endTimestamp),
    orderBy("date", "asc")
  );
  const summarySnapshot = await getDocs(summaryQuery);
  let totalFoodRevenue = 0;
  let totalBeverageRevenue = 0;
  let totalActualFoodCost = 0;
  let totalActualBeverageCost = 0;
  let totalBudgetFoodCostPct = 0;
  let budgetFoodCostPctCount = 0;
  let totalBudgetBeverageCostPct = 0;
  let budgetBeverageCostPctCount = 0;
  let totalOcFood = 0;
  let totalEntFood = 0;
  let totalOtherFoodAdjustments = 0;
  let totalOcBeverage = 0;
  let totalEntBeverage = 0;
  let totalOtherBeverageAdjustments = 0;

  summarySnapshot.forEach((doc) => {
    const data = doc.data() as DailyFinancialSummary;
    totalFoodRevenue += data.food_revenue || 0;
    totalBeverageRevenue += data.beverage_revenue || 0;
    totalActualFoodCost += data.actual_food_cost || 0;
    totalActualBeverageCost += data.actual_beverage_cost || 0;
    if (data.budget_food_cost_pct != null) {
      totalBudgetFoodCostPct += data.budget_food_cost_pct;
      budgetFoodCostPctCount++;
    }
    if (data.budget_beverage_cost_pct != null) {
      totalBudgetBeverageCostPct += data.budget_beverage_cost_pct;
      budgetBeverageCostPctCount++;
    }
    totalOcFood += data.oc_food || 0;
    totalEntFood += data.ent_food || 0;
    totalOtherFoodAdjustments += data.other_food_adjustment || 0;
    totalOcBeverage += data.officer_check_comp_beverage || 0;
    totalEntBeverage += data.entertainment_beverage_cost || 0;
    totalOtherBeverageAdjustments += data.other_beverage_adjustments || 0;
  });

  // 3. Fetch all food and beverage cost entries in range, outlet-wise
  const foodExpenseByOutlet: Record<string, number> = {};
  const beverageExpenseByOutlet: Record<string, number> = {};

  for (const outlet of outlets) {
    // Food
    const foodEntriesQuery = query(
      collection(db, FOOD_COST_ENTRIES_COLLECTION),
      where("outlet_id", "==", outlet.id),
      where("date", ">=", startTimestamp),
      where("date", "<=", endTimestamp)
    );
    const foodEntriesSnapshot = await getDocs(foodEntriesQuery);
    let foodTotal = 0;
    foodEntriesSnapshot.forEach(doc => {
      const entry = doc.data() as FoodCostEntry;
      foodTotal += entry.total_food_cost || 0;
    });
    foodExpenseByOutlet[outlet.id] = foodTotal;

    // Beverage
    const beverageEntriesQuery = query(
      collection(db, BEVERAGE_COST_ENTRIES_COLLECTION),
      where("outlet_id", "==", outlet.id),
      where("date", ">=", startTimestamp),
      where("date", "<=", endTimestamp)
    );
    const beverageEntriesSnapshot = await getDocs(beverageEntriesQuery);
    let beverageTotal = 0;
    beverageEntriesSnapshot.forEach(doc => {
      const entry = doc.data() as BeverageCostEntry;
      beverageTotal += entry.total_beverage_cost || 0;
    });
    beverageExpenseByOutlet[outlet.id] = beverageTotal;
  }

  // 4. Prepare Income Section
  const incomeItems: PLStatementItem[] = [
    { referenceId: "INCOME-FOOD", description: "Food Revenue", amount: totalFoodRevenue },
    { referenceId: "INCOME-BEVERAGE", description: "Beverage Revenue", amount: totalBeverageRevenue },
  ];
  const totalIncome = totalFoodRevenue + totalBeverageRevenue;

  // 5. Prepare Expense Section (outlet-wise, food and beverage)
  const expenseItems: PLStatementItem[] = [];
  for (const outlet of outlets) {
    if (foodExpenseByOutlet[outlet.id] > 0) {
      expenseItems.push({
        referenceId: `FOOD-${outlet.id}`,
        description: `Food Expense - ${outlet.name}`,
        amount: foodExpenseByOutlet[outlet.id],
      });
    }
    if (beverageExpenseByOutlet[outlet.id] > 0) {
      expenseItems.push({
        referenceId: `BEV-${outlet.id}`,
        description: `Beverage Expense - ${outlet.name}`,
        amount: beverageExpenseByOutlet[outlet.id],
      });
    }
  }
  const totalFoodExpense = Object.values(foodExpenseByOutlet).reduce((a, b) => a + b, 0);
  const totalBeverageExpense = Object.values(beverageExpenseByOutlet).reduce((a, b) => a + b, 0);
  const totalExpenses = totalFoodExpense + totalBeverageExpense;

  // 6. OC/ENT and Other Adjustments
  const totalOCENTFood = totalOcFood + totalEntFood;
  const totalOCENTBeverage = totalOcBeverage + totalEntBeverage;
  const totalOtherAdjFood = totalOtherFoodAdjustments;
  const totalOtherAdjBeverage = totalOtherBeverageAdjustments;

  // 7. Total Actual Cost
  const totalActualCostFood = totalFoodExpense - totalOCENTFood + totalOtherAdjFood;
  const totalActualCostBeverage = totalBeverageExpense - totalOCENTBeverage + totalOtherAdjBeverage;
  const totalActualCost = totalActualCostFood + totalActualCostBeverage;

  // 8. Net Income
  const netIncome = totalIncome - totalActualCost;

  // 9. Prepare monthYear label
  const monthYear = format(startDate, "MMM dd, yyyy") === format(endDate, "MMM dd, yyyy")
    ? format(startDate, "MMMM yyyy")
    : `${format(startDate, "MMM dd, yyyy")} - ${format(endDate, "MMM dd, yyyy")}`;

  // 10. Calculate percentages for summary cards
  const foodCostPercentage = totalFoodRevenue > 0 ? (totalActualCostFood / totalFoodRevenue) * 100 : 0;
  const beverageCostPercentage = totalBeverageRevenue > 0 ? (totalActualCostBeverage / totalBeverageRevenue) * 100 : 0;
  const overallCostPercentage = totalIncome > 0 ? (totalActualCost / totalIncome) * 100 : 0;
  const averageBudgetFoodCostPct = budgetFoodCostPctCount > 0 ? totalBudgetFoodCostPct / budgetFoodCostPctCount : 0;
  const averageBudgetBeverageCostPct = budgetBeverageCostPctCount > 0 ? totalBudgetBeverageCostPct / budgetBeverageCostPctCount : 0;

  return {
    monthYear,
    totalFoodRevenue,
    totalBeverageRevenue,
    totalRevenue: totalIncome,
    totalActualFoodCost: totalActualCostFood,
    totalActualBeverageCost: totalActualCostBeverage,
    totalActualCost,
    grossProfit: netIncome, // For this P&L, net income is the gross profit
    foodCostPercentage,
    beverageCostPercentage,
    overallCostPercentage,
    averageBudgetFoodCostPct,
    averageBudgetBeverageCostPct,
    incomeItems,
    salesReturnsAllowances: 0, // No sales returns/allowances in this implementation
    totalIncome,
    totalRevenuePL: totalIncome, // Same as totalIncome since no sales returns
    expenseItems,
    totalExpenses,
    netIncomeBeforeTaxes: netIncome, // No tax, so net income before taxes = net income
    taxRate: 0, // No tax rate in this implementation
    incomeTaxExpense: 0,
    netIncome,
    // OC/ENT and Other Adjustments for display (custom fields)
    ocEntFood: totalOCENTFood,
    ocEntBeverage: totalOCENTBeverage,
    otherAdjFood: totalOtherAdjFood,
    otherAdjBeverage: totalOtherAdjBeverage,
  } as any;
}

export async function getBudgetVsActualsReportAction(
  startDate: Date,
  endDate: Date,
  outletId?: string
): Promise<BudgetVsActualsReport> {
  console.log(`[getBudgetVsActualsReportAction] Generating report for ${startDate.toISOString()} to ${endDate.toISOString()}, outlet: ${outletId || 'all'}`);
  
  if (!db) {
    throw new Error("Firebase not initialized");
  }

  const startTimestamp = Timestamp.fromDate(startDate);
  const endTimestamp = Timestamp.fromDate(endDate);

  // 1. Fetch DailyFinancialSummary data for the date range
  let summaryQuery = query(
    collection(db, DAILY_FINANCIAL_SUMMARIES_COLLECTION),
    where("date", ">=", startTimestamp),
    where("date", "<=", endTimestamp),
    orderBy("date", "asc")
  );

  // Filter by outlet if specified
  if (outletId && outletId !== "all") {
    summaryQuery = query(
      collection(db, DAILY_FINANCIAL_SUMMARIES_COLLECTION),
      where("date", ">=", startTimestamp),
      where("date", "<=", endTimestamp),
      where("outlet_id", "==", outletId),
      orderBy("date", "asc")
    );
  }

  const summarySnapshot = await getDocs(summaryQuery);
  
  if (summarySnapshot.empty) {
    console.log(`[getBudgetVsActualsReportAction] No DailyFinancialSummary documents found for date range`);
    // Return empty report structure
    return {
      dateRange: { from: startDate, to: endDate },
      outletId,
      outletName: outletId && outletId !== "all" ? "Unknown Outlet" : undefined,
      foodBudget: { budgetedRevenue: 0, budgetedCostPercentage: 0, budgetedCost: 0 },
      foodActual: { actualRevenue: 0, actualCost: 0, actualCostPercentage: 0 },
      foodVariance: { revenueVariance: 0, revenueVariancePercentage: 0, costVariance: 0, costVariancePercentage: 0, costPercentageVariance: 0 },
      beverageBudget: { budgetedRevenue: 0, budgetedCostPercentage: 0, budgetedCost: 0 },
      beverageActual: { actualRevenue: 0, actualCost: 0, actualCostPercentage: 0 },
      beverageVariance: { revenueVariance: 0, revenueVariancePercentage: 0, costVariance: 0, costVariancePercentage: 0, costPercentageVariance: 0 },
      combinedBudget: { budgetedRevenue: 0, budgetedCost: 0, budgetedCostPercentage: 0 },
      combinedActual: { actualRevenue: 0, actualCost: 0, actualCostPercentage: 0 },
      combinedVariance: { revenueVariance: 0, revenueVariancePercentage: 0, costVariance: 0, costVariancePercentage: 0, costPercentageVariance: 0 },
      dailyBreakdown: [],
      performanceIndicators: { foodRevenueAchievement: 0, beverageRevenueAchievement: 0, foodCostControl: 0, beverageCostControl: 0, overallPerformance: 0 }
    };
  }

  // 2. Get outlet name if outletId is specified
  let outletName: string | undefined;
  if (outletId && outletId !== "all") {
    try {
      const outletDoc = await getDoc(doc(db, OUTLETS_COLLECTION, outletId));
      if (outletDoc.exists()) {
        outletName = outletDoc.data().name;
      }
    } catch (error) {
      console.error(`[getBudgetVsActualsReportAction] Error fetching outlet name:`, error);
    }
  }

  // 3. Calculate budget vs actuals
  let totalFoodBudgetedRevenue = 0;
  let totalFoodActualRevenue = 0;
  let totalFoodBudgetedCost = 0;
  let totalFoodActualCost = 0;
  let totalBeverageBudgetedRevenue = 0;
  let totalBeverageActualRevenue = 0;
  let totalBeverageBudgetedCost = 0;
  let totalBeverageActualCost = 0;
  
  const dailyBreakdown: BudgetVsActualsReport['dailyBreakdown'] = [];

  summarySnapshot.forEach((doc) => {
    const data = doc.data() as DailyFinancialSummary;
    const date = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date as any);
    
    // Food calculations
    const foodRevenue = data.food_revenue || 0;
    const foodBudgetPct = data.budget_food_cost_pct || 0;
    const foodActualCost = data.actual_food_cost || 0;
    const foodBudgetedCost = foodRevenue * (foodBudgetPct / 100);
    
    totalFoodBudgetedRevenue += foodRevenue;
    totalFoodActualRevenue += foodRevenue;
    totalFoodBudgetedCost += foodBudgetedCost;
    totalFoodActualCost += foodActualCost;
    
    // Beverage calculations
    const beverageRevenue = data.beverage_revenue || 0;
    const beverageBudgetPct = data.budget_beverage_cost_pct || 0;
    const beverageActualCost = data.actual_beverage_cost || 0;
    const beverageBudgetedCost = beverageRevenue * (beverageBudgetPct / 100);
    
    totalBeverageBudgetedRevenue += beverageRevenue;
    totalBeverageActualRevenue += beverageRevenue;
    totalBeverageBudgetedCost += beverageBudgetedCost;
    totalBeverageActualCost += beverageActualCost;
    
    // Daily breakdown
    dailyBreakdown.push({
      date,
      foodBudgetedRevenue: foodRevenue,
      foodActualRevenue: foodRevenue,
      foodBudgetedCost,
      foodActualCost,
      beverageBudgetedRevenue: beverageRevenue,
      beverageActualRevenue: beverageRevenue,
      beverageBudgetedCost,
      beverageActualCost,
    });
  });

  // 4. Calculate variances
  const foodRevenueVariance = totalFoodActualRevenue - totalFoodBudgetedRevenue;
  const foodRevenueVariancePercentage = totalFoodBudgetedRevenue > 0 ? (foodRevenueVariance / totalFoodBudgetedRevenue) * 100 : 0;
  const foodCostVariance = totalFoodActualCost - totalFoodBudgetedCost;
  const foodCostVariancePercentage = totalFoodBudgetedCost > 0 ? (foodCostVariance / totalFoodBudgetedCost) * 100 : 0;
  
  const beverageRevenueVariance = totalBeverageActualRevenue - totalBeverageBudgetedRevenue;
  const beverageRevenueVariancePercentage = totalBeverageBudgetedRevenue > 0 ? (beverageRevenueVariance / totalBeverageBudgetedRevenue) * 100 : 0;
  const beverageCostVariance = totalBeverageActualCost - totalBeverageBudgetedCost;
  const beverageCostVariancePercentage = totalBeverageBudgetedCost > 0 ? (beverageCostVariance / totalBeverageBudgetedCost) * 100 : 0;

  // 5. Calculate percentages
  const foodBudgetedCostPercentage = totalFoodBudgetedRevenue > 0 ? (totalFoodBudgetedCost / totalFoodBudgetedRevenue) * 100 : 0;
  const foodActualCostPercentage = totalFoodActualRevenue > 0 ? (totalFoodActualCost / totalFoodActualRevenue) * 100 : 0;
  const foodCostPercentageVariance = foodActualCostPercentage - foodBudgetedCostPercentage;
  
  const beverageBudgetedCostPercentage = totalBeverageBudgetedRevenue > 0 ? (totalBeverageBudgetedCost / totalBeverageBudgetedRevenue) * 100 : 0;
  const beverageActualCostPercentage = totalBeverageActualRevenue > 0 ? (totalBeverageActualCost / totalBeverageActualRevenue) * 100 : 0;
  const beverageCostPercentageVariance = beverageActualCostPercentage - beverageBudgetedCostPercentage;

  // 6. Combined calculations
  const totalBudgetedRevenue = totalFoodBudgetedRevenue + totalBeverageBudgetedRevenue;
  const totalActualRevenue = totalFoodActualRevenue + totalBeverageActualRevenue;
  const totalBudgetedCost = totalFoodBudgetedCost + totalBeverageBudgetedCost;
  const totalActualCost = totalFoodActualCost + totalBeverageActualCost;
  
  const combinedRevenueVariance = totalActualRevenue - totalBudgetedRevenue;
  const combinedRevenueVariancePercentage = totalBudgetedRevenue > 0 ? (combinedRevenueVariance / totalBudgetedRevenue) * 100 : 0;
  const combinedCostVariance = totalActualCost - totalBudgetedCost;
  const combinedCostVariancePercentage = totalBudgetedCost > 0 ? (combinedCostVariance / totalBudgetedCost) * 100 : 0;
  
  const combinedBudgetedCostPercentage = totalBudgetedRevenue > 0 ? (totalBudgetedCost / totalBudgetedRevenue) * 100 : 0;
  const combinedActualCostPercentage = totalActualRevenue > 0 ? (totalActualCost / totalActualRevenue) * 100 : 0;
  const combinedCostPercentageVariance = combinedActualCostPercentage - combinedBudgetedCostPercentage;

  // 7. Performance indicators
  const foodRevenueAchievement = totalFoodBudgetedRevenue > 0 ? (totalFoodActualRevenue / totalFoodBudgetedRevenue) * 100 : 0;
  const beverageRevenueAchievement = totalBeverageBudgetedRevenue > 0 ? (totalBeverageActualRevenue / totalBeverageBudgetedRevenue) * 100 : 0;
  
  // Cost control: lower is better (actual vs budget percentage)
  const foodCostControl = foodBudgetedCostPercentage > 0 ? (foodActualCostPercentage / foodBudgetedCostPercentage) * 100 : 0;
  const beverageCostControl = beverageBudgetedCostPercentage > 0 ? (beverageActualCostPercentage / beverageBudgetedCostPercentage) * 100 : 0;
  
  // Overall performance score (weighted average)
  const overallPerformance = (
    (foodRevenueAchievement * 0.4) + 
    (beverageRevenueAchievement * 0.4) + 
    (Math.max(0, 100 - foodCostControl) * 0.1) + 
    (Math.max(0, 100 - beverageCostControl) * 0.1)
  );

  console.log(`[getBudgetVsActualsReportAction] Report generated successfully with ${dailyBreakdown.length} days of data`);

  const result = {
    dateRange: { from: startDate, to: endDate },
    outletId,
    outletName,
    foodBudget: {
      budgetedRevenue: totalFoodBudgetedRevenue,
      budgetedCostPercentage: foodBudgetedCostPercentage,
      budgetedCost: totalFoodBudgetedCost,
    },
    foodActual: {
      actualRevenue: totalFoodActualRevenue,
      actualCost: totalFoodActualCost,
      actualCostPercentage: foodActualCostPercentage,
    },
    foodVariance: {
      revenueVariance: foodRevenueVariance,
      revenueVariancePercentage: foodRevenueVariancePercentage,
      costVariance: foodCostVariance,
      costVariancePercentage: foodCostVariancePercentage,
      costPercentageVariance: foodCostPercentageVariance,
    },
    beverageBudget: {
      budgetedRevenue: totalBeverageBudgetedRevenue,
      budgetedCostPercentage: beverageBudgetedCostPercentage,
      budgetedCost: totalBeverageBudgetedCost,
    },
    beverageActual: {
      actualRevenue: totalBeverageActualRevenue,
      actualCost: totalBeverageActualCost,
      actualCostPercentage: beverageActualCostPercentage,
    },
    beverageVariance: {
      revenueVariance: beverageRevenueVariance,
      revenueVariancePercentage: beverageRevenueVariancePercentage,
      costVariance: beverageCostVariance,
      costVariancePercentage: beverageCostVariancePercentage,
      costPercentageVariance: beverageCostPercentageVariance,
    },
    combinedBudget: {
      budgetedRevenue: totalBudgetedRevenue,
      budgetedCost: totalBudgetedCost,
      budgetedCostPercentage: combinedBudgetedCostPercentage,
    },
    combinedActual: {
      actualRevenue: totalActualRevenue,
      actualCost: totalActualCost,
      actualCostPercentage: combinedActualCostPercentage,
    },
    combinedVariance: {
      revenueVariance: combinedRevenueVariance,
      revenueVariancePercentage: combinedRevenueVariancePercentage,
      costVariance: combinedCostVariance,
      costVariancePercentage: combinedCostVariancePercentage,
      costPercentageVariance: combinedCostPercentageVariance,
    },
    dailyBreakdown,
    performanceIndicators: {
      foodRevenueAchievement,
      beverageRevenueAchievement,
      foodCostControl,
      beverageCostControl,
      overallPerformance,
    },
  };

  console.log(`[getBudgetVsActualsReportAction] Final result structure:`, {
    hasFoodBudget: !!result.foodBudget,
    hasFoodActual: !!result.foodActual,
    hasFoodVariance: !!result.foodVariance,
    hasBeverageBudget: !!result.beverageBudget,
    hasBeverageActual: !!result.beverageActual,
    hasBeverageVariance: !!result.beverageVariance,
    hasCombinedBudget: !!result.combinedBudget,
    hasCombinedActual: !!result.combinedActual,
    hasCombinedVariance: !!result.combinedVariance,
    hasDailyBreakdown: !!result.dailyBreakdown,
    hasPerformanceIndicators: !!result.performanceIndicators,
    dailyBreakdownLength: result.dailyBreakdown.length
  });

  return result;
}

export async function getDailyRevenueTrendsReportAction(
  startDate: Date,
  endDate: Date,
  outletId?: string
): Promise<DailyRevenueTrendsReport> {
  console.log(`[getDailyRevenueTrendsReportAction] Generating report for ${startDate.toISOString()} to ${endDate.toISOString()}, outlet: ${outletId || 'all'}`);
  
  try {
    if (!db) {
      throw new Error("Firebase not initialized");
    }

    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    // 1. Fetch DailyFinancialSummary data for the date range
    let summaryQuery = query(
      collection(db, DAILY_FINANCIAL_SUMMARIES_COLLECTION),
      where("date", ">=", startTimestamp),
      where("date", "<=", endTimestamp),
      orderBy("date", "asc")
    );

    // Filter by outlet if specified
    if (outletId && outletId !== "all") {
      summaryQuery = query(
        collection(db, DAILY_FINANCIAL_SUMMARIES_COLLECTION),
        where("date", ">=", startTimestamp),
        where("date", "<=", endTimestamp),
        where("outlet_id", "==", outletId),
        orderBy("date", "asc")
      );
    }

    const summarySnapshot = await getDocs(summaryQuery);
    console.log(`[getDailyRevenueTrendsReportAction] Found ${summarySnapshot.size} documents`);
    
    if (summarySnapshot.empty) {
      console.log(`[getDailyRevenueTrendsReportAction] No DailyFinancialSummary documents found for date range`);
      // Return empty report structure
      return {
        dateRange: { from: startDate, to: endDate },
        outletId,
        outletName: outletId && outletId !== "all" ? "Unknown Outlet" : undefined,
        summary: {
          totalFoodRevenue: 0,
          totalBeverageRevenue: 0,
          totalRevenue: 0,
          averageDailyFoodRevenue: 0,
          averageDailyBeverageRevenue: 0,
          averageDailyTotalRevenue: 0,
          totalDays: 0,
          highestRevenueDay: { date: startDate, foodRevenue: 0, beverageRevenue: 0, totalRevenue: 0 },
          lowestRevenueDay: { date: startDate, foodRevenue: 0, beverageRevenue: 0, totalRevenue: 0 }
        },
        dailyTrends: [],
        weeklyTrends: [],
        performanceMetrics: {
          foodRevenueGrowth: 0,
          beverageRevenueGrowth: 0,
          totalRevenueGrowth: 0,
          foodRevenueVolatility: 0,
          beverageRevenueVolatility: 0,
          totalRevenueVolatility: 0,
          bestPerformingDay: "N/A",
          worstPerformingDay: "N/A",
          revenueConsistency: 0
        },
        trendAnalysis: {
          overallTrend: 'stable',
          foodTrend: 'stable',
          beverageTrend: 'stable',
          trendStrength: 0,
          seasonalityDetected: false,
          peakDays: [],
          slowDays: []
        }
      };
    }

    // 2. Get outlet name if outletId is specified
    let outletName: string | undefined;
    if (outletId && outletId !== "all") {
      try {
        const outletDoc = await getDoc(doc(db, OUTLETS_COLLECTION, outletId));
        if (outletDoc.exists()) {
          outletName = outletDoc.data().name;
        }
      } catch (error) {
        console.error(`[getDailyRevenueTrendsReportAction] Error fetching outlet name:`, error);
      }
    }

    // 3. Process daily data
    const dailyData: Array<{
      date: Date;
      foodRevenue: number;
      beverageRevenue: number;
      totalRevenue: number;
    }> = [];

    summarySnapshot.forEach((doc) => {
      const data = doc.data() as DailyFinancialSummary;
      const date = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date as any);
      
      const foodRevenue = data.food_revenue || 0;
      const beverageRevenue = data.beverage_revenue || 0;
      const totalRevenue = foodRevenue + beverageRevenue;
      
      dailyData.push({
        date,
        foodRevenue,
        beverageRevenue,
        totalRevenue,
      });
    });

    // Sort by date to ensure proper order
    dailyData.sort((a, b) => a.date.getTime() - b.date.getTime());

    // 4. Calculate daily trends with change percentages
    const dailyTrends: DailyRevenueTrendsReport['dailyTrends'] = dailyData.map((day, index) => {
      const prevDay = index > 0 ? dailyData[index - 1] : null;
      
      const foodRevenueChange = prevDay ? day.foodRevenue - prevDay.foodRevenue : 0;
      const beverageRevenueChange = prevDay ? day.beverageRevenue - prevDay.beverageRevenue : 0;
      const totalRevenueChange = prevDay ? day.totalRevenue - prevDay.totalRevenue : 0;
      
      const foodRevenueChangePercentage = prevDay && prevDay.foodRevenue > 0 ? (foodRevenueChange / prevDay.foodRevenue) * 100 : 0;
      const beverageRevenueChangePercentage = prevDay && prevDay.beverageRevenue > 0 ? (beverageRevenueChange / prevDay.beverageRevenue) * 100 : 0;
      const totalRevenueChangePercentage = prevDay && prevDay.totalRevenue > 0 ? (totalRevenueChange / prevDay.totalRevenue) * 100 : 0;
      
      return {
        date: day.date,
        foodRevenue: day.foodRevenue,
        beverageRevenue: day.beverageRevenue,
        totalRevenue: day.totalRevenue,
        foodRevenueChange,
        beverageRevenueChange,
        totalRevenueChange,
        foodRevenueChangePercentage,
        beverageRevenueChangePercentage,
        totalRevenueChangePercentage,
      };
    });

    // 5. Calculate summary statistics
    const totalFoodRevenue = dailyData.reduce((sum, day) => sum + day.foodRevenue, 0);
    const totalBeverageRevenue = dailyData.reduce((sum, day) => sum + day.beverageRevenue, 0);
    const totalRevenue = totalFoodRevenue + totalBeverageRevenue;
    const totalDays = dailyData.length;
    
    const averageDailyFoodRevenue = totalDays > 0 ? totalFoodRevenue / totalDays : 0;
    const averageDailyBeverageRevenue = totalDays > 0 ? totalBeverageRevenue / totalDays : 0;
    const averageDailyTotalRevenue = totalDays > 0 ? totalRevenue / totalDays : 0;

    // Find highest and lowest revenue days
    const highestRevenueDay = dailyData.reduce((max, day) => 
      day.totalRevenue > max.totalRevenue ? day : max, dailyData[0]);
    const lowestRevenueDay = dailyData.reduce((min, day) => 
      day.totalRevenue < min.totalRevenue ? day : min, dailyData[0]);

    // 6. Calculate weekly trends
    const weeklyTrends: DailyRevenueTrendsReport['weeklyTrends'] = [];
    const weekMap = new Map<number, Array<typeof dailyData[0]>>();

    dailyData.forEach(day => {
      const weekStart = new Date(day.date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
      const weekNumber = Math.floor(weekStart.getTime() / (7 * 24 * 60 * 60 * 1000));
      
      if (!weekMap.has(weekNumber)) {
        weekMap.set(weekNumber, []);
      }
      weekMap.get(weekNumber)!.push(day);
    });

    weekMap.forEach((weekDays, weekNumber) => {
      if (weekDays.length === 0) return; // Skip empty weeks
      
      const weekStart = new Date(weekDays[0].date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const weekFoodRevenue = weekDays.reduce((sum, day) => sum + day.foodRevenue, 0);
      const weekBeverageRevenue = weekDays.reduce((sum, day) => sum + day.beverageRevenue, 0);
      const weekTotalRevenue = weekFoodRevenue + weekBeverageRevenue;
      
      weeklyTrends.push({
        weekStart,
        weekEnd,
        weekNumber,
        totalFoodRevenue: weekFoodRevenue,
        totalBeverageRevenue: weekBeverageRevenue,
        totalRevenue: weekTotalRevenue,
        averageDailyFoodRevenue: weekDays.length > 0 ? weekFoodRevenue / weekDays.length : 0,
        averageDailyBeverageRevenue: weekDays.length > 0 ? weekBeverageRevenue / weekDays.length : 0,
        averageDailyTotalRevenue: weekDays.length > 0 ? weekTotalRevenue / weekDays.length : 0,
        daysInWeek: weekDays.length,
      });
    });

    // 7. Calculate performance metrics
    const foodRevenues = dailyData.map(day => day.foodRevenue);
    const beverageRevenues = dailyData.map(day => day.beverageRevenue);
    const totalRevenues = dailyData.map(day => day.totalRevenue);

    // Calculate growth rates (simple linear regression slope)
    const foodRevenueGrowth = calculateGrowthRate(foodRevenues);
    const beverageRevenueGrowth = calculateGrowthRate(beverageRevenues);
    const totalRevenueGrowth = calculateGrowthRate(totalRevenues);

    // Calculate volatility (standard deviation)
    const foodRevenueVolatility = calculateStandardDeviation(foodRevenues);
    const beverageRevenueVolatility = calculateStandardDeviation(beverageRevenues);
    const totalRevenueVolatility = calculateStandardDeviation(totalRevenues);

    // Find best and worst performing days of the week
    const dayOfWeekRevenue = new Map<string, number[]>();
    dailyData.forEach(day => {
      const dayName = day.date.toLocaleDateString('en-US', { weekday: 'long' });
      if (!dayOfWeekRevenue.has(dayName)) {
        dayOfWeekRevenue.set(dayName, []);
      }
      dayOfWeekRevenue.get(dayName)!.push(day.totalRevenue);
    });

    let bestPerformingDay = "N/A";
    let worstPerformingDay = "N/A";
    let bestAverage = 0;
    let worstAverage = Infinity;

    dayOfWeekRevenue.forEach((revenues, dayName) => {
      const average = revenues.reduce((sum, rev) => sum + rev, 0) / revenues.length;
      if (average > bestAverage) {
        bestAverage = average;
        bestPerformingDay = dayName;
      }
      if (average < worstAverage) {
        worstAverage = average;
        worstPerformingDay = dayName;
      }
    });

    // Calculate revenue consistency (inverse of coefficient of variation)
    const revenueConsistency = calculateRevenueConsistency(totalRevenues);

    // 8. Trend analysis
    const overallTrend = determineTrend(totalRevenueGrowth);
    const foodTrend = determineTrend(foodRevenueGrowth);
    const beverageTrend = determineTrend(beverageRevenueGrowth);
    
    const trendStrength = Math.abs(totalRevenueGrowth) / (totalRevenueVolatility || 1) * 100;
    
    // Detect seasonality (simplified - check for weekly patterns)
    const seasonalityDetected = dayOfWeekRevenue.size >= 3;
    
    // Identify peak and slow days
    const peakDays: string[] = [];
    const slowDays: string[] = [];
    dayOfWeekRevenue.forEach((revenues, dayName) => {
      const average = revenues.reduce((sum, rev) => sum + rev, 0) / revenues.length;
      const overallAverage = totalRevenue / totalDays;
      if (average > overallAverage * 1.1) {
        peakDays.push(dayName);
      } else if (average < overallAverage * 0.9) {
        slowDays.push(dayName);
      }
    });

    console.log(`[getDailyRevenueTrendsReportAction] Report generated successfully with ${dailyData.length} days of data`);

    return {
      dateRange: { from: startDate, to: endDate },
      outletId,
      outletName,
      summary: {
        totalFoodRevenue,
        totalBeverageRevenue,
        totalRevenue,
        averageDailyFoodRevenue,
        averageDailyBeverageRevenue,
        averageDailyTotalRevenue,
        totalDays,
        highestRevenueDay: {
          date: highestRevenueDay.date,
          foodRevenue: highestRevenueDay.foodRevenue,
          beverageRevenue: highestRevenueDay.beverageRevenue,
          totalRevenue: highestRevenueDay.totalRevenue,
        },
        lowestRevenueDay: {
          date: lowestRevenueDay.date,
          foodRevenue: lowestRevenueDay.foodRevenue,
          beverageRevenue: lowestRevenueDay.beverageRevenue,
          totalRevenue: lowestRevenueDay.totalRevenue,
        },
      },
      dailyTrends,
      weeklyTrends,
      performanceMetrics: {
        foodRevenueGrowth,
        beverageRevenueGrowth,
        totalRevenueGrowth,
        foodRevenueVolatility,
        beverageRevenueVolatility,
        totalRevenueVolatility,
        bestPerformingDay,
        worstPerformingDay,
        revenueConsistency,
      },
      trendAnalysis: {
        overallTrend,
        foodTrend,
        beverageTrend,
        trendStrength,
        seasonalityDetected,
        peakDays,
        slowDays,
      },
    };
  } catch (error) {
    console.error(`[getDailyRevenueTrendsReportAction] Error generating report:`, error);
    throw error; // Re-throw the error to be handled by the client
  }
}

// Helper functions
function calculateGrowthRate(values: number[]): number {
  if (values.length < 2) return 0;
  
  const n = values.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((sum, val, index) => sum + val * index, 0);
  const sumXY = values.reduce((sum, val, index) => sum + val * index, 0);
  const sumX2 = values.reduce((sum, _, index) => sum + index * index, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope;
}

function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  
  return Math.sqrt(variance);
}

function calculateRevenueConsistency(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const stdDev = calculateStandardDeviation(values);
  
  if (mean === 0) return 0;
  
  const coefficientOfVariation = stdDev / mean;
  const consistency = Math.max(0, 100 - (coefficientOfVariation * 100));
  
  return Math.min(100, consistency);
}

function determineTrend(growthRate: number): 'increasing' | 'decreasing' | 'stable' {
  const threshold = 0.01; // 1% threshold for trend detection
  if (growthRate > threshold) return 'increasing';
  if (growthRate < -threshold) return 'decreasing';
  return 'stable';
} 