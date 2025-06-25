"use server";

import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  getDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, startOfMonth, endOfMonth } from "date-fns";
import type {
  DailyFinancialSummary,
  MonthlyProfitLossReport,
  PLStatementItem,
  Outlet,
  FoodCostEntry,
  BeverageCostEntry,
  BudgetVsActualsReport,
  DailyRevenueTrendsReport,
  YearOverYearReport,
  RealTimeKPIDashboard,
  ForecastingReport,
} from "@/types";
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
    totalFoodRevenue += data.actual_food_revenue || 0;
    totalBeverageRevenue += data.actual_beverage_revenue || 0;
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

  const foodCostPercentage =
    totalFoodRevenue > 0 ? (totalActualFoodCost / totalFoodRevenue) * 100 : 0;
  const beverageCostPercentage =
    totalBeverageRevenue > 0
      ? (totalActualBeverageCost / totalBeverageRevenue) * 100
      : 0;
  const overallCostPercentage =
    totalRevenue > 0 ? (totalActualCost / totalRevenue) * 100 : 0;

  const averageBudgetFoodCostPct =
    budgetFoodCostPctCount > 0
      ? totalBudgetFoodCostPct / budgetFoodCostPctCount
      : 0;
  const averageBudgetBeverageCostPct =
    budgetBeverageCostPctCount > 0
      ? totalBudgetBeverageCostPct / budgetBeverageCostPctCount
      : 0;

  // Calculate income items based on actual data
  const incomeItems: PLStatementItem[] = [
    {
      referenceId: "A1111-4267",
      description: "Food Revenue",
      amount: totalFoodRevenue,
    },
    {
      referenceId: "A1111-4268",
      description: "Beverage Revenue",
      amount: totalBeverageRevenue,
    },
  ];
  const salesReturnsAllowances = 0; // No returns/allowances data available

  const totalIncome = incomeItems.reduce((sum, item) => sum + item.amount, 0);
  const totalRevenuePL = totalIncome + salesReturnsAllowances;

  // Calculate expense items based on actual cost data
  const expenseItems: PLStatementItem[] = [
    {
      referenceId: "R4444-5345",
      description: "Food Cost",
      amount: totalActualFoodCost,
    },
    {
      referenceId: "R4444-5346",
      description: "Beverage Cost",
      amount: totalActualBeverageCost,
    },
  ];
  const totalExpenses = expenseItems.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const netIncomeBeforeTaxes = totalRevenuePL - totalExpenses;
  const taxRate = 0; // No tax data available
  const incomeTaxExpense = 0;
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
    totalFoodRevenue += data.actual_food_revenue || 0;
    totalBeverageRevenue += data.actual_beverage_revenue || 0;
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
    foodEntriesSnapshot.forEach((doc) => {
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
    beverageEntriesSnapshot.forEach((doc) => {
      const entry = doc.data() as BeverageCostEntry;
      beverageTotal += entry.total_beverage_cost || 0;
    });
    beverageExpenseByOutlet[outlet.id] = beverageTotal;
  }

  // 4. Prepare Income Section
  const incomeItems: PLStatementItem[] = [
    {
      referenceId: "INCOME-FOOD",
      description: "Food Revenue",
      amount: totalFoodRevenue,
    },
    {
      referenceId: "INCOME-BEVERAGE",
      description: "Beverage Revenue",
      amount: totalBeverageRevenue,
    },
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
  const totalFoodExpense = Object.values(foodExpenseByOutlet).reduce(
    (a, b) => a + b,
    0
  );
  const totalBeverageExpense = Object.values(beverageExpenseByOutlet).reduce(
    (a, b) => a + b,
    0
  );
  const totalExpenses = totalFoodExpense + totalBeverageExpense;

  // 6. OC/ENT and Other Adjustments
  const totalOCENTFood = totalOcFood + totalEntFood;
  const totalOCENTBeverage = totalOcBeverage + totalEntBeverage;
  const totalOtherAdjFood = totalOtherFoodAdjustments;
  const totalOtherAdjBeverage = totalOtherBeverageAdjustments;

  // 7. Total Actual Cost
  const totalActualCostFood =
    totalFoodExpense - totalOCENTFood + totalOtherAdjFood;
  const totalActualCostBeverage =
    totalBeverageExpense - totalOCENTBeverage + totalOtherAdjBeverage;
  const totalActualCost = totalActualCostFood + totalActualCostBeverage;

  // 8. Net Income
  const netIncome = totalIncome - totalActualCost;

  // 9. Prepare monthYear label
  const monthYear =
    format(startDate, "MMM dd, yyyy") === format(endDate, "MMM dd, yyyy")
      ? format(startDate, "MMMM yyyy")
      : `${format(startDate, "MMM dd, yyyy")} - ${format(
          endDate,
          "MMM dd, yyyy"
        )}`;

  // 10. Calculate percentages for summary cards
  const foodCostPercentage =
    totalFoodRevenue > 0 ? (totalActualCostFood / totalFoodRevenue) * 100 : 0;
  const beverageCostPercentage =
    totalBeverageRevenue > 0
      ? (totalActualCostBeverage / totalBeverageRevenue) * 100
      : 0;
  const overallCostPercentage =
    totalIncome > 0 ? (totalActualCost / totalIncome) * 100 : 0;
  const averageBudgetFoodCostPct =
    budgetFoodCostPctCount > 0
      ? totalBudgetFoodCostPct / budgetFoodCostPctCount
      : 0;
  const averageBudgetBeverageCostPct =
    budgetBeverageCostPctCount > 0
      ? totalBudgetBeverageCostPct / budgetBeverageCostPctCount
      : 0;

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
  console.log(
    `[getBudgetVsActualsReportAction] Generating report for ${startDate.toISOString()} to ${endDate.toISOString()}, outlet: ${
      outletId || "all"
    }`
  );

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
    console.log(
      `[getBudgetVsActualsReportAction] No DailyFinancialSummary documents found for date range`
    );
    // Return empty report structure
    return {
      dateRange: { from: startDate, to: endDate },
      outletId,
      outletName: outletId && outletId !== "all" ? "Unknown Outlet" : undefined,
      foodBudget: {
        budgetedRevenue: 0,
        budgetedCostPercentage: 0,
        budgetedCost: 0,
      },
      foodActual: { actualRevenue: 0, actualCost: 0, actualCostPercentage: 0 },
      foodVariance: {
        revenueVariance: 0,
        revenueVariancePercentage: 0,
        costVariance: 0,
        costVariancePercentage: 0,
        costPercentageVariance: 0,
      },
      beverageBudget: {
        budgetedRevenue: 0,
        budgetedCostPercentage: 0,
        budgetedCost: 0,
      },
      beverageActual: {
        actualRevenue: 0,
        actualCost: 0,
        actualCostPercentage: 0,
      },
      beverageVariance: {
        revenueVariance: 0,
        revenueVariancePercentage: 0,
        costVariance: 0,
        costVariancePercentage: 0,
        costPercentageVariance: 0,
      },
      combinedBudget: {
        budgetedRevenue: 0,
        budgetedCost: 0,
        budgetedCostPercentage: 0,
      },
      combinedActual: {
        actualRevenue: 0,
        actualCost: 0,
        actualCostPercentage: 0,
      },
      combinedVariance: {
        revenueVariance: 0,
        revenueVariancePercentage: 0,
        costVariance: 0,
        costVariancePercentage: 0,
        costPercentageVariance: 0,
      },
      dailyBreakdown: [],
      performanceIndicators: {
        foodRevenueAchievement: 0,
        beverageRevenueAchievement: 0,
        foodCostControl: 0,
        beverageCostControl: 0,
        overallPerformance: 0,
      },
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
      console.error(
        `[getBudgetVsActualsReportAction] Error fetching outlet name:`,
        error
      );
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

  const dailyBreakdown: BudgetVsActualsReport["dailyBreakdown"] = [];

  summarySnapshot.forEach((doc) => {
    const data = doc.data() as DailyFinancialSummary;
    const date =
      data.date instanceof Timestamp
        ? data.date.toDate()
        : new Date(data.date as any);

    // Food calculations - using new field names
    const foodActualRevenue = data.actual_food_revenue || 0;
    const foodBudgetedRevenue = data.budget_food_revenue || 0;
    const foodBudgetedCost = data.budget_food_cost || 0;
    const foodActualCost = data.actual_food_cost || 0;
    const foodBudgetPct = data.budget_food_cost_pct || 0;

    totalFoodBudgetedRevenue += foodBudgetedRevenue;
    totalFoodActualRevenue += foodActualRevenue;
    totalFoodBudgetedCost += foodBudgetedCost;
    totalFoodActualCost += foodActualCost;

    // Beverage calculations - using new field names
    const beverageActualRevenue = data.actual_beverage_revenue || 0;
    const beverageBudgetedRevenue = data.budget_beverage_revenue || 0;
    const beverageBudgetedCost = data.budget_beverage_cost || 0;
    const beverageActualCost = data.actual_beverage_cost || 0;
    const beverageBudgetPct = data.budget_beverage_cost_pct || 0;

    totalBeverageBudgetedRevenue += beverageBudgetedRevenue;
    totalBeverageActualRevenue += beverageActualRevenue;
    totalBeverageBudgetedCost += beverageBudgetedCost;
    totalBeverageActualCost += beverageActualCost;

    // Daily breakdown
    dailyBreakdown.push({
      date,
      foodBudgetedRevenue,
      foodActualRevenue,
      foodBudgetedCost,
      foodActualCost,
      beverageBudgetedRevenue,
      beverageActualRevenue,
      beverageBudgetedCost,
      beverageActualCost,
    });
  });

  // 4. Calculate variances
  const foodRevenueVariance = totalFoodActualRevenue - totalFoodBudgetedRevenue;
  const foodRevenueVariancePercentage =
    totalFoodBudgetedRevenue > 0
      ? (foodRevenueVariance / totalFoodBudgetedRevenue) * 100
      : 0;
  const foodCostVariance = totalFoodActualCost - totalFoodBudgetedCost;
  const foodCostVariancePercentage =
    totalFoodBudgetedCost > 0
      ? (foodCostVariance / totalFoodBudgetedCost) * 100
      : 0;

  const beverageRevenueVariance =
    totalBeverageActualRevenue - totalBeverageBudgetedRevenue;
  const beverageRevenueVariancePercentage =
    totalBeverageBudgetedRevenue > 0
      ? (beverageRevenueVariance / totalBeverageBudgetedRevenue) * 100
      : 0;
  const beverageCostVariance =
    totalBeverageActualCost - totalBeverageBudgetedCost;
  const beverageCostVariancePercentage =
    totalBeverageBudgetedCost > 0
      ? (beverageCostVariance / totalBeverageBudgetedCost) * 100
      : 0;

  // 5. Calculate percentages
  const foodBudgetedCostPercentage =
    totalFoodBudgetedRevenue > 0
      ? (totalFoodBudgetedCost / totalFoodBudgetedRevenue) * 100
      : 0;
  const foodActualCostPercentage =
    totalFoodActualRevenue > 0
      ? (totalFoodActualCost / totalFoodActualRevenue) * 100
      : 0;
  const foodCostPercentageVariance =
    foodActualCostPercentage - foodBudgetedCostPercentage;

  const beverageBudgetedCostPercentage =
    totalBeverageBudgetedRevenue > 0
      ? (totalBeverageBudgetedCost / totalBeverageBudgetedRevenue) * 100
      : 0;
  const beverageActualCostPercentage =
    totalBeverageActualRevenue > 0
      ? (totalBeverageActualCost / totalBeverageActualRevenue) * 100
      : 0;
  const beverageCostPercentageVariance =
    beverageActualCostPercentage - beverageBudgetedCostPercentage;

  // 6. Combined calculations
  const totalBudgetedRevenue =
    totalFoodBudgetedRevenue + totalBeverageBudgetedRevenue;
  const totalActualRevenue =
    totalFoodActualRevenue + totalBeverageActualRevenue;
  const totalBudgetedCost = totalFoodBudgetedCost + totalBeverageBudgetedCost;
  const totalActualCost = totalFoodActualCost + totalBeverageActualCost;

  const combinedRevenueVariance = totalActualRevenue - totalBudgetedRevenue;
  const combinedRevenueVariancePercentage =
    totalBudgetedRevenue > 0
      ? (combinedRevenueVariance / totalBudgetedRevenue) * 100
      : 0;
  const combinedCostVariance = totalActualCost - totalBudgetedCost;
  const combinedCostVariancePercentage =
    totalBudgetedCost > 0
      ? (combinedCostVariance / totalBudgetedCost) * 100
      : 0;

  const combinedBudgetedCostPercentage =
    totalBudgetedRevenue > 0
      ? (totalBudgetedCost / totalBudgetedRevenue) * 100
      : 0;
  const combinedActualCostPercentage =
    totalActualRevenue > 0 ? (totalActualCost / totalActualRevenue) * 100 : 0;
  const combinedCostPercentageVariance =
    combinedActualCostPercentage - combinedBudgetedCostPercentage;

  // 7. Performance indicators
  const foodRevenueAchievement =
    totalFoodBudgetedRevenue > 0
      ? (totalFoodActualRevenue / totalFoodBudgetedRevenue) * 100
      : 0;
  const beverageRevenueAchievement =
    totalBeverageBudgetedRevenue > 0
      ? (totalBeverageActualRevenue / totalBeverageBudgetedRevenue) * 100
      : 0;

  // Cost control: lower is better (actual vs budget percentage)
  const foodCostControl =
    foodBudgetedCostPercentage > 0
      ? (foodActualCostPercentage / foodBudgetedCostPercentage) * 100
      : 0;
  const beverageCostControl =
    beverageBudgetedCostPercentage > 0
      ? (beverageActualCostPercentage / beverageBudgetedCostPercentage) * 100
      : 0;

  // Overall performance score (weighted average)
  const overallPerformance =
    foodRevenueAchievement * 0.4 +
    beverageRevenueAchievement * 0.4 +
    Math.max(0, 100 - foodCostControl) * 0.1 +
    Math.max(0, 100 - beverageCostControl) * 0.1;

  console.log(
    `[getBudgetVsActualsReportAction] Report generated successfully with ${dailyBreakdown.length} days of data`
  );

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
    dailyBreakdownLength: result.dailyBreakdown.length,
  });

  return result;
}

export async function getDailyRevenueTrendsReportAction(
  startDate: Date,
  endDate: Date,
  outletId?: string
): Promise<DailyRevenueTrendsReport> {
  console.log(
    `[getDailyRevenueTrendsReportAction] Generating report for ${startDate.toISOString()} to ${endDate.toISOString()}, outlet: ${
      outletId || "all"
    }`
  );

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
    console.log(
      `[getDailyRevenueTrendsReportAction] Found ${summarySnapshot.size} documents`
    );

    if (summarySnapshot.empty) {
      console.log(
        `[getDailyRevenueTrendsReportAction] No DailyFinancialSummary documents found for date range`
      );
      // Return empty report structure
      return {
        dateRange: { from: startDate, to: endDate },
        outletId,
        outletName:
          outletId && outletId !== "all" ? "Unknown Outlet" : undefined,
        summary: {
          totalFoodRevenue: 0,
          totalBeverageRevenue: 0,
          totalRevenue: 0,
          averageDailyFoodRevenue: 0,
          averageDailyBeverageRevenue: 0,
          averageDailyTotalRevenue: 0,
          totalDays: 0,
          highestRevenueDay: {
            date: startDate,
            foodRevenue: 0,
            beverageRevenue: 0,
            totalRevenue: 0,
          },
          lowestRevenueDay: {
            date: startDate,
            foodRevenue: 0,
            beverageRevenue: 0,
            totalRevenue: 0,
          },
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
          revenueConsistency: 0,
        },
        trendAnalysis: {
          overallTrend: "stable",
          foodTrend: "stable",
          beverageTrend: "stable",
          trendStrength: 0,
          seasonalityDetected: false,
          peakDays: [],
          slowDays: [],
        },
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
        console.error(
          `[getDailyRevenueTrendsReportAction] Error fetching outlet name:`,
          error
        );
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
      const date =
        data.date instanceof Timestamp
          ? data.date.toDate()
          : new Date(data.date as any);

      const foodRevenue = data.actual_food_revenue || 0;
      const beverageRevenue = data.actual_beverage_revenue || 0;
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
    const dailyTrends: DailyRevenueTrendsReport["dailyTrends"] = dailyData.map(
      (day, index) => {
        const prevDay = index > 0 ? dailyData[index - 1] : null;
        const foodRevenueChange = prevDay
          ? day.foodRevenue - prevDay.foodRevenue
          : 0;
        const beverageRevenueChange = prevDay
          ? day.beverageRevenue - prevDay.beverageRevenue
          : 0;
        const totalRevenueChange = prevDay
          ? day.totalRevenue - prevDay.totalRevenue
          : 0;
        const foodRevenueChangePercentage =
          prevDay && prevDay.foodRevenue > 0
            ? (foodRevenueChange / prevDay.foodRevenue) * 100
            : prevDay && prevDay.foodRevenue === 0 && day.foodRevenue > 0
            ? 100 // Show 100% when going from 0 to positive value
            : prevDay && prevDay.foodRevenue === 0 && day.foodRevenue === 0
            ? 0 // Show 0% when both days have 0 revenue
            : null;
        const beverageRevenueChangePercentage =
          prevDay && prevDay.beverageRevenue > 0
            ? (beverageRevenueChange / prevDay.beverageRevenue) * 100
            : prevDay && prevDay.beverageRevenue === 0 && day.beverageRevenue > 0
            ? 100 // Show 100% when going from 0 to positive value
            : prevDay && prevDay.beverageRevenue === 0 && day.beverageRevenue === 0
            ? 0 // Show 0% when both days have 0 revenue
            : null;
        const totalRevenueChangePercentage =
          prevDay && prevDay.totalRevenue > 0
            ? (totalRevenueChange / prevDay.totalRevenue) * 100
            : prevDay && prevDay.totalRevenue === 0 && day.totalRevenue > 0
            ? 100 // Show 100% when going from 0 to positive value
            : prevDay && prevDay.totalRevenue === 0 && day.totalRevenue === 0
            ? 0 // Show 0% when both days have 0 revenue
            : null;
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
      }
    );

    // 5. Calculate summary statistics
    const totalFoodRevenue = dailyData.reduce(
      (sum, day) => sum + day.foodRevenue,
      0
    );
    const totalBeverageRevenue = dailyData.reduce(
      (sum, day) => sum + day.beverageRevenue,
      0
    );
    const totalRevenue = totalFoodRevenue + totalBeverageRevenue;
    const totalDays = dailyData.length;

    const averageDailyFoodRevenue =
      totalDays > 0 ? totalFoodRevenue / totalDays : 0;
    const averageDailyBeverageRevenue =
      totalDays > 0 ? totalBeverageRevenue / totalDays : 0;
    const averageDailyTotalRevenue =
      totalDays > 0 ? totalRevenue / totalDays : 0;

    // Find highest and lowest revenue days
    const highestRevenueDay = dailyData.reduce(
      (max, day) => (day.totalRevenue > max.totalRevenue ? day : max),
      dailyData[0]
    );
    const lowestRevenueDay = dailyData.reduce(
      (min, day) => (day.totalRevenue < min.totalRevenue ? day : min),
      dailyData[0]
    );

    // 6. Calculate weekly trends
    const weeklyTrends: DailyRevenueTrendsReport["weeklyTrends"] = [];
    const weekMap = new Map<number, Array<(typeof dailyData)[0]>>();

    dailyData.forEach((day) => {
      const weekStart = new Date(day.date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
      const weekNumber = Math.floor(
        weekStart.getTime() / (7 * 24 * 60 * 60 * 1000)
      );

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

      const weekFoodRevenue = weekDays.reduce(
        (sum, day) => sum + day.foodRevenue,
        0
      );
      const weekBeverageRevenue = weekDays.reduce(
        (sum, day) => sum + day.beverageRevenue,
        0
      );
      const weekTotalRevenue = weekFoodRevenue + weekBeverageRevenue;

      weeklyTrends.push({
        weekStart,
        weekEnd,
        weekNumber,
        totalFoodRevenue: weekFoodRevenue,
        totalBeverageRevenue: weekBeverageRevenue,
        totalRevenue: weekTotalRevenue,
        averageDailyFoodRevenue:
          weekDays.length > 0 ? weekFoodRevenue / weekDays.length : 0,
        averageDailyBeverageRevenue:
          weekDays.length > 0 ? weekBeverageRevenue / weekDays.length : 0,
        averageDailyTotalRevenue:
          weekDays.length > 0 ? weekTotalRevenue / weekDays.length : 0,
        daysInWeek: weekDays.length,
      });
    });

    // 7. Calculate performance metrics
    const foodRevenues = dailyData.map((day) => day.foodRevenue);
    const beverageRevenues = dailyData.map((day) => day.beverageRevenue);
    const totalRevenues = dailyData.map((day) => day.totalRevenue);

    // Calculate growth rates (simple linear regression slope)
    const foodRevenueGrowth = calculateGrowthRate(foodRevenues);
    const beverageRevenueGrowth = calculateGrowthRate(beverageRevenues);
    const totalRevenueGrowth = calculateGrowthRate(totalRevenues);

    // Calculate volatility (standard deviation)
    const foodRevenueVolatility = calculateStandardDeviation(foodRevenues);
    const beverageRevenueVolatility =
      calculateStandardDeviation(beverageRevenues);
    const totalRevenueVolatility = calculateStandardDeviation(totalRevenues);

    // Find best and worst performing days of the week
    const dayOfWeekRevenue = new Map<string, number[]>();
    dailyData.forEach((day) => {
      const dayName = day.date.toLocaleDateString("en-US", { weekday: "long" });
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
      const average =
        revenues.reduce((sum, rev) => sum + rev, 0) / revenues.length;
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

    const trendStrength =
      (Math.abs(totalRevenueGrowth) / (totalRevenueVolatility || 1)) * 100;

    // Detect seasonality (simplified - check for weekly patterns)
    const seasonalityDetected = dayOfWeekRevenue.size >= 3;

    // Identify peak and slow days
    const peakDays: string[] = [];
    const slowDays: string[] = [];
    dayOfWeekRevenue.forEach((revenues, dayName) => {
      const average =
        revenues.reduce((sum, rev) => sum + rev, 0) / revenues.length;
      const overallAverage = totalRevenue / totalDays;
      if (average > overallAverage * 1.1) {
        peakDays.push(dayName);
      } else if (average < overallAverage * 0.9) {
        slowDays.push(dayName);
      }
    });

    console.log(
      `[getDailyRevenueTrendsReportAction] Report generated successfully with ${dailyData.length} days of data`
    );

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
    console.error(
      `[getDailyRevenueTrendsReportAction] Error generating report:`,
      error
    );
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
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  const variance =
    squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;

  return Math.sqrt(variance);
}

function calculateRevenueConsistency(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const stdDev = calculateStandardDeviation(values);

  if (mean === 0) return 0;

  const coefficientOfVariation = stdDev / mean;
  const consistency = Math.max(0, 100 - coefficientOfVariation * 100);

  return Math.min(100, consistency);
}

function determineTrend(
  growthRate: number
): "increasing" | "decreasing" | "stable" {
  const threshold = 0.01; // 1% threshold for trend detection
  if (growthRate > threshold) return "increasing";
  if (growthRate < -threshold) return "decreasing";
  return "stable";
}

// Year-over-Year Comparison Report
export async function getYearOverYearReportAction(
  currentYear: number,
  outletId?: string
): Promise<YearOverYearReport> {
  try {
    const previousYear = currentYear - 1;
    
    // Get data for both years
    const currentYearData = await getYearlyAggregatedData(currentYear, outletId);
    const previousYearData = await getYearlyAggregatedData(previousYear, outletId);
    
    // Calculate growth metrics
    const growthMetrics = calculateGrowthMetrics(currentYearData, previousYearData);
    
    // Get monthly comparison
    const monthlyComparison = await getMonthlyComparisonData(currentYear, previousYear, outletId);
    
    // Generate insights
    const insights = generateYearOverYearInsights(monthlyComparison, growthMetrics);
    
    return {
      currentYearData,
      previousYearData,
      growthMetrics,
      monthlyComparison,
      insights,
    };
  } catch (error) {
    console.error("Error generating year-over-year report:", error);
    throw new Error(`Failed to generate year-over-year report: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function getYearlyAggregatedData(year: number, outletId?: string) {
  const startDate = new Date(year, 0, 1); // January 1st
  const endDate = new Date(year, 11, 31); // December 31st
  
  let q = query(
    collection(db!, DAILY_FINANCIAL_SUMMARIES_COLLECTION),
    where("date", ">=", Timestamp.fromDate(startDate)),
    where("date", "<=", Timestamp.fromDate(endDate)),
    orderBy("date", "asc")
  );
  
  if (outletId && outletId !== "all") {
    q = query(q, where("outlet_id", "==", outletId));
  }
  
  const snapshot = await getDocs(q);
  const summaries: DailyFinancialSummary[] = snapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id,
  } as DailyFinancialSummary));
  
  // Aggregate yearly data
  const totalFoodRevenue = summaries.reduce((sum, s) => sum + (s.actual_food_revenue || 0), 0);
  const totalBeverageRevenue = summaries.reduce((sum, s) => sum + (s.actual_beverage_revenue || 0), 0);
  const totalRevenue = totalFoodRevenue + totalBeverageRevenue;
  
  const totalFoodCost = summaries.reduce((sum, s) => sum + (s.actual_food_cost || s.net_food_cost || 0), 0);
  const totalBeverageCost = summaries.reduce((sum, s) => sum + (s.actual_beverage_cost || s.net_beverage_cost || 0), 0);
  const totalCosts = totalFoodCost + totalBeverageCost;
  
  const netProfit = totalRevenue - totalCosts;
  const avgMonthlyRevenue = totalRevenue / 12;
  
  return {
    year,
    totalRevenue,
    totalFoodRevenue,
    totalBeverageRevenue,
    totalCosts,
    netProfit,
    avgMonthlyRevenue,
  };
}

function calculateGrowthMetrics(currentYear: any, previousYear: any) {
  const revenueGrowth = previousYear.totalRevenue > 0 
    ? ((currentYear.totalRevenue - previousYear.totalRevenue) / previousYear.totalRevenue) * 100 
    : 0;
    
  const foodRevenueGrowth = previousYear.totalFoodRevenue > 0 
    ? ((currentYear.totalFoodRevenue - previousYear.totalFoodRevenue) / previousYear.totalFoodRevenue) * 100 
    : 0;
    
  const beverageRevenueGrowth = previousYear.totalBeverageRevenue > 0 
    ? ((currentYear.totalBeverageRevenue - previousYear.totalBeverageRevenue) / previousYear.totalBeverageRevenue) * 100 
    : 0;
    
  const costGrowth = previousYear.totalCosts > 0 
    ? ((currentYear.totalCosts - previousYear.totalCosts) / previousYear.totalCosts) * 100 
    : 0;
    
  const profitGrowth = previousYear.netProfit !== 0 
    ? ((currentYear.netProfit - previousYear.netProfit) / Math.abs(previousYear.netProfit)) * 100 
    : 0;
    
  const currentMargin = currentYear.totalRevenue > 0 ? (currentYear.netProfit / currentYear.totalRevenue) * 100 : 0;
  const previousMargin = previousYear.totalRevenue > 0 ? (previousYear.netProfit / previousYear.totalRevenue) * 100 : 0;
  const marginImprovement = currentMargin - previousMargin;
  
  return {
    revenueGrowth,
    foodRevenueGrowth,
    beverageRevenueGrowth,
    costGrowth,
    profitGrowth,
    marginImprovement,
  };
}

async function getMonthlyComparisonData(currentYear: number, previousYear: number, outletId?: string) {
  const monthlyComparison = [];
  
  for (let month = 1; month <= 12; month++) {
    const currentMonthData = await getMonthlyData(currentYear, month, outletId);
    const previousMonthData = await getMonthlyData(previousYear, month, outletId);
    
    const growth = previousMonthData > 0 
      ? ((currentMonthData - previousMonthData) / previousMonthData) * 100 
      : 0;
      
    let performance: "outperforming" | "underperforming" | "on_track";
    if (growth > 5) performance = "outperforming";
    else if (growth < -5) performance = "underperforming";
    else performance = "on_track";
    
    monthlyComparison.push({
      month,
      currentYearRevenue: currentMonthData,
      previousYearRevenue: previousMonthData,
      growth,
      performance,
    });
  }
  
  return monthlyComparison;
}

async function getMonthlyData(year: number, month: number, outletId?: string): Promise<number> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Last day of month
  
  let q = query(
    collection(db!, DAILY_FINANCIAL_SUMMARIES_COLLECTION),
    where("date", ">=", Timestamp.fromDate(startDate)),
    where("date", "<=", Timestamp.fromDate(endDate))
  );
  
  if (outletId && outletId !== "all") {
    q = query(q, where("outlet_id", "==", outletId));
  }
  
  const snapshot = await getDocs(q);
  const summaries = snapshot.docs.map(doc => doc.data() as DailyFinancialSummary);
  
  return summaries.reduce((sum, s) => 
    sum + (s.actual_food_revenue || 0) + (s.actual_beverage_revenue || 0), 0
  );
}

function generateYearOverYearInsights(monthlyComparison: any[], growthMetrics: any) {
  // Find strongest and weakest months
  const sortedByGrowth = [...monthlyComparison].sort((a, b) => b.growth - a.growth);
  const strongestMonths = sortedByGrowth.slice(0, 3).map(m => getMonthName(m.month));
  const weakestMonths = sortedByGrowth.slice(-3).map(m => getMonthName(m.month));
  
  // Seasonal trends (simplified)
  const seasonalTrends = [
    "Q1 performance shows seasonal patterns",
    "Summer months indicate peak performance",
    "Holiday seasons drive revenue spikes"
  ];
  
  // Recommendations based on growth metrics
  const recommendations = [];
  if (growthMetrics.revenueGrowth > 10) {
    recommendations.push("Maintain current growth strategies");
  } else if (growthMetrics.revenueGrowth < 0) {
    recommendations.push("Focus on revenue recovery initiatives");
  }
  
  if (growthMetrics.costGrowth > growthMetrics.revenueGrowth) {
    recommendations.push("Implement cost control measures");
  }
  
  if (growthMetrics.marginImprovement < 0) {
    recommendations.push("Review pricing and cost structure");
  }
  
  return {
    strongestMonths,
    weakestMonths,
    seasonalTrends,
    recommendations,
  };
}

function getMonthName(month: number): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return months[month - 1];
}

// Real-Time KPI Dashboard
export async function getRealTimeKPIDashboardAction(
  outletId?: string,
  fromDate?: Date,
  toDate?: Date
): Promise<RealTimeKPIDashboard> {
  try {
    // Use provided date range or default to current period (last 7 days)
    const today = new Date();
    const defaultFromDate = new Date(today);
    defaultFromDate.setDate(today.getDate() - 7);
    
    const actualFromDate = fromDate || defaultFromDate;
    const actualToDate = toDate || today;
    
    // Get aggregated data for the period (same as dashboard approach)
    const aggregatedData = await getAggregatedPeriodData(actualFromDate, actualToDate, outletId);
    const previousPeriodData = await getPreviousPeriodData(7, outletId); // Last 7 days for trends
    
    // Calculate current period KPIs using aggregated data
    const currentPeriodKPIs = calculateCurrentPeriodKPIs(aggregatedData);
    
    // Calculate trending KPIs
    const trendingKPIs = calculateTrendingKPIs(aggregatedData, previousPeriodData);
    
    // Generate alerts
    const alerts = generateKPIAlerts(aggregatedData, currentPeriodKPIs);
    
    return {
      outletId,
      outletName: aggregatedData?.outletName || "All Outlets",
      lastUpdated: new Date(),
      currentPeriodKPIs,
      trendingKPIs,
      alerts,
    };
  } catch (error) {
    console.error("Error generating real-time KPI dashboard:", error);
    throw new Error(`Failed to generate KPI dashboard: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function getAggregatedPeriodData(fromDate: Date, toDate: Date, outletId?: string) {
  // Get all daily financial summaries for the period (same approach as dashboard)
  let q = query(
    collection(db!, DAILY_FINANCIAL_SUMMARIES_COLLECTION),
    where("date", ">=", Timestamp.fromDate(fromDate)),
    where("date", "<=", Timestamp.fromDate(toDate)),
    orderBy("date", "desc")
  );
  
  if (outletId && outletId !== "all") {
    q = query(q, where("outlet_id", "==", outletId));
  }
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  
  const dailySummaries = snapshot.docs.map(doc => doc.data() as DailyFinancialSummary);
  
  // Aggregate totals (same as dashboard calculation)
  let totalFoodRevenue = 0;
  let totalBeverageRevenue = 0;
  let totalFoodCost = 0;
  let totalBeverageCost = 0;
  let totalBudgetFoodRevenue = 0;
  let totalBudgetBeverageRevenue = 0;
  let sumOfBudgetFoodCostPct = 0;
  let sumOfBudgetBeverageCostPct = 0;
  let countBudgetFoodCostPct = 0;
  let countBudgetBeverageCostPct = 0;
  let totalCovers = 0;

  dailySummaries.forEach((summary) => {
    totalFoodRevenue += summary.actual_food_revenue || 0;
    totalBeverageRevenue += summary.actual_beverage_revenue || 0;
    totalFoodCost += summary.actual_food_cost || 0;
    totalBeverageCost += summary.actual_beverage_cost || 0;
    totalBudgetFoodRevenue += summary.budget_food_revenue || 0;
    totalBudgetBeverageRevenue += summary.budget_beverage_revenue || 0;
    totalCovers += summary.total_covers || 0;
    
    if (summary.budget_food_cost_pct != null) {
      sumOfBudgetFoodCostPct += summary.budget_food_cost_pct;
      countBudgetFoodCostPct++;
    }
    if (summary.budget_beverage_cost_pct != null) {
      sumOfBudgetBeverageCostPct += summary.budget_beverage_cost_pct;
      countBudgetBeverageCostPct++;
    }
  });

  const avgBudgetFoodCostPct = countBudgetFoodCostPct > 0 ? sumOfBudgetFoodCostPct / countBudgetFoodCostPct : 0;
  const avgBudgetBeverageCostPct = countBudgetBeverageCostPct > 0 ? sumOfBudgetBeverageCostPct / countBudgetBeverageCostPct : 0;

  // Get outlet name if needed
  let outletName = "All Outlets";
  if (outletId && outletId !== "all") {
    try {
      const outlets = await getOutletsAction();
      const outlet = outlets.find(o => o.id === outletId);
      outletName = outlet?.name || "Unknown Outlet";
    } catch (error) {
      console.warn("Could not fetch outlet name:", error);
    }
  }
  
  // Return aggregated data in the format expected by calculateCurrentPeriodKPIs
  return {
    actual_food_revenue: totalFoodRevenue,
    actual_beverage_revenue: totalBeverageRevenue,
    actual_food_cost: totalFoodCost,
    actual_beverage_cost: totalBeverageCost,
    budget_food_revenue: totalBudgetFoodRevenue,
    budget_beverage_revenue: totalBudgetBeverageRevenue,
    budget_food_cost_pct: avgBudgetFoodCostPct,
    budget_beverage_cost_pct: avgBudgetBeverageCostPct,
    total_covers: totalCovers,
    average_check: totalCovers > 0 ? (totalFoodRevenue + totalBeverageRevenue) / totalCovers : 0,
    outletName,
  };
}

async function getLatestDailyData(outletId?: string) {
  // Get the most recent daily financial summary
  let q = query(
    collection(db!, DAILY_FINANCIAL_SUMMARIES_COLLECTION),
    orderBy("date", "desc")
  );
  
  if (outletId && outletId !== "all") {
    q = query(q, where("outlet_id", "==", outletId));
  }
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  
  const latestDoc = snapshot.docs[0];
  const data = latestDoc.data() as DailyFinancialSummary;
  
  // Get outlet name if needed
  let outletName = "All Outlets";
  if (outletId && outletId !== "all") {
    try {
      const outlets = await getOutletsAction();
      const outlet = outlets.find(o => o.id === outletId);
      outletName = outlet?.name || "Unknown Outlet";
    } catch (error) {
      console.warn("Could not fetch outlet name:", error);
    }
  }
  
  return {
    ...data,
    outletName,
  };
}

async function getPreviousPeriodData(days: number, outletId?: string) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);
  
  let q = query(
    collection(db!, DAILY_FINANCIAL_SUMMARIES_COLLECTION),
    where("date", ">=", Timestamp.fromDate(startDate)),
    where("date", "<=", Timestamp.fromDate(endDate)),
    orderBy("date", "desc")
  );
  
  if (outletId && outletId !== "all") {
    q = query(q, where("outlet_id", "==", outletId));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as DailyFinancialSummary);
}

function calculateCurrentPeriodKPIs(latestData: any) {
  if (!latestData) {
    // Return default KPIs if no data
    return {
      todayRevenue: 0,
      revenueTarget: 0,
      revenueAchievement: 0,
      currentFoodCostPct: 0,
      currentBeverageCostPct: 0,
      targetFoodCostPct: 0,
      targetBeverageCostPct: 0,
      customersServed: 0,
      averageCheck: 0,
      tableUtilization: 0,
      salesPerHour: 0,
      salesPerEmployee: 0,
      orderAccuracy: 0,
    };
  }
  
  const todayRevenue = (latestData.actual_food_revenue || 0) + (latestData.actual_beverage_revenue || 0);
  const revenueTarget = (latestData.budget_food_revenue || 0) + (latestData.budget_beverage_revenue || 0);
  const revenueAchievement = revenueTarget > 0 ? (todayRevenue / revenueTarget) * 100 : 0;
  
  // Calculate cost percentages the same way as dashboard: (actualCost / actualRevenue) * 100
  // This ensures consistency between dashboard and KPI dashboard cost percentages
  const actualFoodRevenue = latestData.actual_food_revenue || 0;
  const actualBeverageRevenue = latestData.actual_beverage_revenue || 0;
  const actualFoodCost = latestData.actual_food_cost || 0;
  const actualBeverageCost = latestData.actual_beverage_cost || 0;
  
  const currentFoodCostPct = actualFoodRevenue > 0 ? (actualFoodCost / actualFoodRevenue) * 100 : 0;
  const currentBeverageCostPct = actualBeverageRevenue > 0 ? (actualBeverageCost / actualBeverageRevenue) * 100 : 0;
  const targetFoodCostPct = latestData.budget_food_cost_pct || 0;
  const targetBeverageCostPct = latestData.budget_beverage_cost_pct || 0;
  
  // Calculate useful operational efficiency metrics using actual data
  const totalCost = actualFoodCost + actualBeverageCost;
  const profitMargin = todayRevenue > 0 ? ((todayRevenue - totalCost) / todayRevenue) * 100 : 0;
  
  // Revenue mix analysis
  const foodRevenuePercentage = todayRevenue > 0 ? (actualFoodRevenue / todayRevenue) * 100 : 0;
  const beverageRevenuePercentage = todayRevenue > 0 ? (actualBeverageRevenue / todayRevenue) * 100 : 0;
  
  // Cost variance from budget
  const foodCostVariance = targetFoodCostPct > 0 ? currentFoodCostPct - targetFoodCostPct : 0;
  const beverageCostVariance = targetBeverageCostPct > 0 ? currentBeverageCostPct - targetBeverageCostPct : 0;
  
  // Revenue efficiency and variance
  const revenuePerDay = todayRevenue; // Could be average if period > 1 day
  const costEfficiencyRatio = todayRevenue > 0 ? (totalCost / todayRevenue) * 100 : 0;
  const revenueVariance = revenueTarget > 0 ? ((todayRevenue - revenueTarget) / revenueTarget) * 100 : 0;
  
  return {
    todayRevenue,
    revenueTarget,
    revenueAchievement,
    revenueVariance,
    currentFoodCostPct,
    currentBeverageCostPct,
    targetFoodCostPct,
    targetBeverageCostPct,
    profitMargin,
    foodRevenuePercentage,
    beverageRevenuePercentage,
    foodCostVariance,
    beverageCostVariance,
    costEfficiencyRatio,
  };
}

function calculateTrendingKPIs(latestData: any, historicalData: any[]) {
  if (!latestData || historicalData.length === 0) {
    return [];
  }
  
  // Calculate averages from historical data
  const avgRevenue = historicalData.reduce((sum, d) => 
    sum + (d.actual_food_revenue || 0) + (d.actual_beverage_revenue || 0), 0
  ) / historicalData.length;
  
  // Calculate cost percentages the same way as dashboard for historical data
  const avgFoodCostPct = historicalData.reduce((sum, d) => {
    const foodRevenue = d.actual_food_revenue || 0;
    const foodCost = d.actual_food_cost || 0;
    const costPct = foodRevenue > 0 ? (foodCost / foodRevenue) * 100 : 0;
    return sum + costPct;
  }, 0) / historicalData.length;
  
  const avgBeverageCostPct = historicalData.reduce((sum, d) => {
    const beverageRevenue = d.actual_beverage_revenue || 0;
    const beverageCost = d.actual_beverage_cost || 0;
    const costPct = beverageRevenue > 0 ? (beverageCost / beverageRevenue) * 100 : 0;
    return sum + costPct;
  }, 0) / historicalData.length;
  
  const avgCovers = historicalData.reduce((sum, d) => 
    sum + (d.total_covers || 0), 0
  ) / historicalData.length;
  
  const currentRevenue = (latestData.actual_food_revenue || 0) + (latestData.actual_beverage_revenue || 0);
  
  // Calculate current cost percentages the same way as dashboard
  const currentFoodRevenue = latestData.actual_food_revenue || 0;
  const currentBeverageRevenue = latestData.actual_beverage_revenue || 0;
  const currentFoodCost = latestData.actual_food_cost || 0;
  const currentBeverageCost = latestData.actual_beverage_cost || 0;
  
  const currentFoodCostPct = currentFoodRevenue > 0 ? (currentFoodCost / currentFoodRevenue) * 100 : 0;
  const currentBeverageCostPct = currentBeverageRevenue > 0 ? (currentBeverageCost / currentBeverageRevenue) * 100 : 0;
  const currentCovers = latestData.total_covers || 0;
  
  // Get budget targets (same as main KPI section)
  const budgetFoodCostPct = latestData.budget_food_cost_pct || 0;
  const budgetBeverageCostPct = latestData.budget_beverage_cost_pct || 0;
  const budgetRevenue = (latestData.budget_food_revenue || 0) + (latestData.budget_beverage_revenue || 0);

  return [
    {
      name: "Daily Revenue",
      value: currentRevenue,
      target: budgetRevenue || avgRevenue, // Use budget target, fallback to historical average
      trend: (currentRevenue > (budgetRevenue || avgRevenue) ? "up" : currentRevenue < (budgetRevenue || avgRevenue) ? "down" : "stable") as "up" | "down" | "stable",
      trendPercentage: (budgetRevenue || avgRevenue) > 0 ? ((currentRevenue - (budgetRevenue || avgRevenue)) / (budgetRevenue || avgRevenue)) * 100 : 0,
      status: (currentRevenue > (budgetRevenue || avgRevenue) * 1.1 ? "excellent" : 
              currentRevenue > (budgetRevenue || avgRevenue) * 0.9 ? "good" : 
              currentRevenue > (budgetRevenue || avgRevenue) * 0.8 ? "warning" : "critical") as "excellent" | "good" | "warning" | "critical",
    },
    {
      name: "Food Cost %",
      value: currentFoodCostPct,
      target: budgetFoodCostPct || avgFoodCostPct, // Use budget target, fallback to historical average
      trend: (currentFoodCostPct < (budgetFoodCostPct || avgFoodCostPct) ? "up" : currentFoodCostPct > (budgetFoodCostPct || avgFoodCostPct) ? "down" : "stable") as "up" | "down" | "stable", // Lower is better for costs
      trendPercentage: (budgetFoodCostPct || avgFoodCostPct) > 0 ? ((currentFoodCostPct - (budgetFoodCostPct || avgFoodCostPct)) / (budgetFoodCostPct || avgFoodCostPct)) * 100 : 0, // Standard calculation: current vs target
      status: (currentFoodCostPct < (budgetFoodCostPct || avgFoodCostPct) * 0.9 ? "excellent" : 
              currentFoodCostPct < (budgetFoodCostPct || avgFoodCostPct) * 1.1 ? "good" : 
              currentFoodCostPct < (budgetFoodCostPct || avgFoodCostPct) * 1.2 ? "warning" : "critical") as "excellent" | "good" | "warning" | "critical",
    },
    {
      name: "Beverage Cost %",
      value: currentBeverageCostPct,
      target: budgetBeverageCostPct || avgBeverageCostPct, // Use budget target, fallback to historical average
      trend: (currentBeverageCostPct < (budgetBeverageCostPct || avgBeverageCostPct) ? "up" : currentBeverageCostPct > (budgetBeverageCostPct || avgBeverageCostPct) ? "down" : "stable") as "up" | "down" | "stable", // Lower is better for costs
      trendPercentage: (budgetBeverageCostPct || avgBeverageCostPct) > 0 ? ((currentBeverageCostPct - (budgetBeverageCostPct || avgBeverageCostPct)) / (budgetBeverageCostPct || avgBeverageCostPct)) * 100 : 0, // Standard calculation: current vs target
      status: (currentBeverageCostPct < (budgetBeverageCostPct || avgBeverageCostPct) * 0.9 ? "excellent" : 
              currentBeverageCostPct < (budgetBeverageCostPct || avgBeverageCostPct) * 1.1 ? "good" : 
              currentBeverageCostPct < (budgetBeverageCostPct || avgBeverageCostPct) * 1.2 ? "warning" : "critical") as "excellent" | "good" | "warning" | "critical",
    },
  ];
}

function generateKPIAlerts(latestData: any, kpis: any): { type: "cost_variance" | "revenue_shortfall" | "efficiency_issue"; message: string; severity: "high" | "medium" | "low"; timestamp: Date; }[] {
  const alerts: { type: "cost_variance" | "revenue_shortfall" | "efficiency_issue"; message: string; severity: "high" | "medium" | "low"; timestamp: Date; }[] = [];
  const now = new Date();
  
  if (!latestData) return alerts;
  
  // Revenue shortfall alert
  if (kpis.revenueAchievement < 80) {
    alerts.push({
      type: "revenue_shortfall" as const,
      message: `Revenue is ${(100 - kpis.revenueAchievement).toFixed(1)}% below target`,
      severity: kpis.revenueAchievement < 50 ? "high" as const : "medium" as const,
      timestamp: now,
    });
  }
  
  // Cost variance alerts
  if (kpis.currentFoodCostPct > kpis.targetFoodCostPct * 1.1) {
    alerts.push({
      type: "cost_variance" as const,
      message: `Food cost is ${(kpis.currentFoodCostPct - kpis.targetFoodCostPct).toFixed(1)}% above target`,
      severity: kpis.currentFoodCostPct > kpis.targetFoodCostPct * 1.2 ? "high" as const : "medium" as const,
      timestamp: now,
    });
  }
  
  if (kpis.currentBeverageCostPct > kpis.targetBeverageCostPct * 1.1) {
    alerts.push({
      type: "cost_variance" as const,
      message: `Beverage cost is ${(kpis.currentBeverageCostPct - kpis.targetBeverageCostPct).toFixed(1)}% above target`,
      severity: kpis.currentBeverageCostPct > kpis.targetBeverageCostPct * 1.2 ? "high" as const : "medium" as const,
      timestamp: now,
    });
  }
  
  // Efficiency alerts
  if (kpis.customersServed < 50 && kpis.todayRevenue > 0) { // Assuming this indicates low efficiency
    alerts.push({
      type: "efficiency_issue" as const,
      message: `Low customer volume: only ${kpis.customersServed} customers served`,
      severity: "low" as const,
      timestamp: now,
    });
  }
  
  return alerts;
}

// Revenue & Cost Forecasting Report (Basic Implementation)
export async function getForecastingReportAction(
  historicalDateRange: { from: Date; to: Date },
  forecastPeriod: { from: Date; to: Date },
  outletId?: string
): Promise<ForecastingReport> {
  try {
    // Get historical data for trend analysis
    const historicalData = await getHistoricalDataForForecasting(historicalDateRange, outletId);
    
    if (historicalData.length < 3) {
      throw new Error("Insufficient historical data for forecasting. Need at least 3 days of data.");
    }
    
    // For limited data, use simple averaging instead of complex trend analysis
    const isLimitedData = historicalData.length < 7;
    
    // Calculate trend coefficients
    const revenueTrend = calculateLinearTrend(historicalData.map(d => (d.actual_food_revenue || 0) + (d.actual_beverage_revenue || 0)));
    
    // Calculate cost percentages on the fly from actual costs and revenues
    const foodCostPercentages = historicalData.map(d => {
      const foodRevenue = d.actual_food_revenue || 0;
      const foodCost = d.actual_food_cost || 0;
      return foodRevenue > 0 ? (foodCost / foodRevenue) * 100 : 0;
    });
    
    const beverageCostPercentages = historicalData.map(d => {
      const beverageRevenue = d.actual_beverage_revenue || 0;
      const beverageCost = d.actual_beverage_cost || 0;
      return beverageRevenue > 0 ? (beverageCost / beverageRevenue) * 100 : 0;
    });
    
    const foodCostTrend = calculateLinearTrend(foodCostPercentages);
    const beverageCostTrend = calculateLinearTrend(beverageCostPercentages);
    const customerTrend = calculateLinearTrend(historicalData.map(d => d.total_covers || 0));
    
    // Generate forecasts
    const revenueForecast = generateRevenueForecast(forecastPeriod, revenueTrend, historicalData);
    const costForecast = generateCostForecast(foodCostTrend, beverageCostTrend, revenueTrend, historicalData, isLimitedData, forecastPeriod);
    const businessForecast = generateBusinessForecast(historicalData, revenueTrend, foodCostTrend, beverageCostTrend);
    
    // Generate insights
    const assumptions = generateForecastAssumptions(isLimitedData, historicalData.length);
    const riskFactors = generateRiskFactors(revenueTrend, costForecast, isLimitedData);
    const recommendations = generateForecastRecommendations(revenueTrend, costForecast, isLimitedData);
    
    return {
      dateRange: historicalDateRange,
      forecastPeriod,
      outletId,
      outletName: "All Outlets", // Would be fetched from outlet data
      revenueForecast,
      costForecast,
      businessForecast,
      assumptions,
      riskFactors,
      recommendations,
    };
  } catch (error) {
    console.error("Error generating forecasting report:", error);
    throw new Error(`Failed to generate forecasting report: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function getHistoricalDataForForecasting(dateRange: { from: Date; to: Date }, outletId?: string) {
  let q = query(
    collection(db!, DAILY_FINANCIAL_SUMMARIES_COLLECTION),
    where("date", ">=", Timestamp.fromDate(dateRange.from)),
    where("date", "<=", Timestamp.fromDate(dateRange.to)),
    orderBy("date", "asc")
  );
  
  if (outletId && outletId !== "all") {
    q = query(q, where("outlet_id", "==", outletId));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as DailyFinancialSummary);
}

function calculateLinearTrend(values: number[]) {
  if (values.length < 2) return { slope: 0, intercept: values[0] || 0 };
  
  const n = values.length;
  const xSum = (n * (n - 1)) / 2; // Sum of 0, 1, 2, ..., n-1
  const ySum = values.reduce((sum, val) => sum + val, 0);
  const xySum = values.reduce((sum, val, index) => sum + (val * index), 0);
  const xxSum = values.reduce((sum, _, index) => sum + (index * index), 0);
  
  const slope = (n * xySum - xSum * ySum) / (n * xxSum - xSum * xSum);
  const intercept = (ySum - slope * xSum) / n;
  
  return { slope, intercept };
}

function generateRevenueForecast(
  forecastPeriod: { from: Date; to: Date },
  revenueTrend: { slope: number; intercept: number },
  historicalData: DailyFinancialSummary[]
) {
  const dailyForecasts = [];
  const monthlyForecasts = [];
  
  // Calculate average revenue for confidence intervals
  const avgRevenue = historicalData.reduce((sum, d) => 
    sum + (d.actual_food_revenue || 0) + (d.actual_beverage_revenue || 0), 0
  ) / historicalData.length;
  
  const revenueStdDev = Math.sqrt(
    historicalData.reduce((sum, d) => {
      const revenue = (d.actual_food_revenue || 0) + (d.actual_beverage_revenue || 0);
      return sum + Math.pow(revenue - avgRevenue, 2);
    }, 0) / historicalData.length
  );
  
  // Generate daily forecasts
  const daysDiff = Math.ceil((forecastPeriod.to.getTime() - forecastPeriod.from.getTime()) / (1000 * 60 * 60 * 24));
  
  for (let i = 0; i <= daysDiff; i++) {
    const forecastDate = new Date(forecastPeriod.from);
    forecastDate.setDate(forecastDate.getDate() + i);
    
    const predictedRevenue = Math.max(0, revenueTrend.intercept + (revenueTrend.slope * (historicalData.length + i)));
    const confidenceRange = revenueStdDev * 1.96; // 95% confidence interval
    
    dailyForecasts.push({
      date: forecastDate,
      predictedRevenue,
      confidenceInterval: {
        lower: Math.max(0, predictedRevenue - confidenceRange),
        upper: predictedRevenue + confidenceRange,
      },
    });
  }
  
  // Generate monthly forecasts (simplified)
  const monthsInPeriod = Math.ceil(daysDiff / 30);
  for (let i = 0; i < monthsInPeriod; i++) {
    const monthDate = new Date(forecastPeriod.from);
    monthDate.setMonth(monthDate.getMonth() + i);
    
    const monthlyRevenue = (revenueTrend.intercept + (revenueTrend.slope * (historicalData.length + (i * 30)))) * 30;
    const seasonalFactor = 1 + (Math.sin((monthDate.getMonth() / 12) * 2 * Math.PI) * 0.1); // Simple seasonal adjustment
    
    monthlyForecasts.push({
      month: monthDate,
      predictedRevenue: Math.max(0, monthlyRevenue * seasonalFactor),
      confidenceInterval: {
        lower: Math.max(0, monthlyRevenue * seasonalFactor * 0.8),
        upper: monthlyRevenue * seasonalFactor * 1.2,
      },
      seasonalFactor,
    });
  }
  
  return { daily: dailyForecasts, monthly: monthlyForecasts };
}

function generateCostForecast(
  foodCostTrend: { slope: number; intercept: number },
  beverageCostTrend: { slope: number; intercept: number },
  revenueTrend: { slope: number; intercept: number },
  historicalData: DailyFinancialSummary[],
  isLimitedData = false,
  forecastPeriod?: { from: Date; to: Date }
) {
  const predictedFoodCostPct = Math.max(0, Math.min(100, foodCostTrend.intercept + foodCostTrend.slope * 30));
  const predictedBeverageCostPct = Math.max(0, Math.min(100, beverageCostTrend.intercept + beverageCostTrend.slope * 30));
  
  // Calculate average cost efficiency from historical data
  const avgCostEfficiency = historicalData.reduce((sum, d) => {
    const totalRevenue = (d.actual_food_revenue || 0) + (d.actual_beverage_revenue || 0);
    const totalCost = (d.actual_food_cost || 0) + (d.actual_beverage_cost || 0);
    return sum + (totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 0);
  }, 0) / historicalData.length;
  
  // Project future cost efficiency ratio
  const costEfficiencyRatio = avgCostEfficiency + ((predictedFoodCostPct + predictedBeverageCostPct) / 2 - avgCostEfficiency) * 0.5;
  
  // Calculate predicted profit margin
  const predictedProfitMargin = Math.max(0, 100 - costEfficiencyRatio);
  
  // Calculate historical averages for cost forecasting
  const avgFoodCost = historicalData.reduce((sum, d) => sum + (d.actual_food_cost || 0), 0) / historicalData.length;
  const avgBeverageCost = historicalData.reduce((sum, d) => sum + (d.actual_beverage_cost || 0), 0) / historicalData.length;
  const avgTotalCost = avgFoodCost + avgBeverageCost;
  
  // Calculate cost standard deviations for confidence intervals
  const foodCostStdDev = Math.sqrt(
    historicalData.reduce((sum, d) => {
      const cost = d.actual_food_cost || 0;
      return sum + Math.pow(cost - avgFoodCost, 2);
    }, 0) / historicalData.length
  );
  
  const beverageCostStdDev = Math.sqrt(
    historicalData.reduce((sum, d) => {
      const cost = d.actual_beverage_cost || 0;
      return sum + Math.pow(cost - avgBeverageCost, 2);
    }, 0) / historicalData.length
  );
  
  // Generate daily cost forecasts
  const dailyCostForecasts = [];
  const monthlyCostForecasts = [];
  
  if (forecastPeriod) {
    const daysDiff = Math.ceil((forecastPeriod.to.getTime() - forecastPeriod.from.getTime()) / (1000 * 60 * 60 * 24));
    
    // Daily forecasts
    for (let i = 0; i <= daysDiff; i++) {
      const forecastDate = new Date(forecastPeriod.from);
      forecastDate.setDate(forecastDate.getDate() + i);
      
      // Predict based on revenue forecast and cost percentage trends
      const dayIndex = historicalData.length + i;
      const predictedRevenue = Math.max(0, revenueTrend.intercept + (revenueTrend.slope * dayIndex));
      
      // Calculate cost percentages for this day
      const dayFoodCostPct = Math.max(0, Math.min(100, foodCostTrend.intercept + (foodCostTrend.slope * dayIndex)));
      const dayBeverageCostPct = Math.max(0, Math.min(100, beverageCostTrend.intercept + (beverageCostTrend.slope * dayIndex)));
      
      // Estimate revenue split (use historical average)
      const historicalFoodRevenueRatio = historicalData.reduce((sum, d) => {
        const totalRev = (d.actual_food_revenue || 0) + (d.actual_beverage_revenue || 0);
        return sum + (totalRev > 0 ? (d.actual_food_revenue || 0) / totalRev : 0.6); // Default 60% food
      }, 0) / historicalData.length;
      
      const predictedFoodRevenue = predictedRevenue * historicalFoodRevenueRatio;
      const predictedBeverageRevenue = predictedRevenue * (1 - historicalFoodRevenueRatio);
      
      // Calculate predicted costs
      const predictedFoodCost = (predictedFoodRevenue * dayFoodCostPct) / 100;
      const predictedBeverageCost = (predictedBeverageRevenue * dayBeverageCostPct) / 100;
      const predictedTotalCost = predictedFoodCost + predictedBeverageCost;
      
      // Calculate confidence intervals
      const confidenceRange = (foodCostStdDev + beverageCostStdDev) * 1.96; // 95% confidence
      
      dailyCostForecasts.push({
        date: forecastDate,
        predictedFoodCost,
        predictedBeverageCost,
        predictedTotalCost,
        confidenceInterval: {
          lower: Math.max(0, predictedTotalCost - confidenceRange),
          upper: predictedTotalCost + confidenceRange,
        },
      });
    }
    
    // Monthly forecasts
    const monthsInPeriod = Math.ceil(daysDiff / 30);
    for (let i = 0; i < monthsInPeriod; i++) {
      const monthDate = new Date(forecastPeriod.from);
      monthDate.setMonth(monthDate.getMonth() + i);
      
      // Calculate monthly averages from daily forecasts in this month
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      
      const dailyForecastsInMonth = dailyCostForecasts.filter(forecast => 
        forecast.date >= monthStart && forecast.date <= monthEnd
      );
      
      if (dailyForecastsInMonth.length > 0) {
        const avgFoodCost = dailyForecastsInMonth.reduce((sum, f) => sum + f.predictedFoodCost, 0) / dailyForecastsInMonth.length;
        const avgBeverageCost = dailyForecastsInMonth.reduce((sum, f) => sum + f.predictedBeverageCost, 0) / dailyForecastsInMonth.length;
        const avgTotalCost = avgFoodCost + avgBeverageCost;
        
        // Apply seasonal factor (similar to revenue forecasting)
        const seasonalFactor = 1 + (Math.sin((monthDate.getMonth() / 12) * 2 * Math.PI) * 0.05); // 5% seasonal variation for costs
        
        const monthlyFoodCost = avgFoodCost * seasonalFactor * 30; // Monthly total
        const monthlyBeverageCost = avgBeverageCost * seasonalFactor * 30;
        const monthlyTotalCost = monthlyFoodCost + monthlyBeverageCost;
        
        monthlyCostForecasts.push({
          month: monthDate,
          predictedFoodCost: monthlyFoodCost,
          predictedBeverageCost: monthlyBeverageCost,
          predictedTotalCost: monthlyTotalCost,
          confidenceInterval: {
            lower: Math.max(0, monthlyTotalCost * 0.85),
            upper: monthlyTotalCost * 1.15,
          },
          seasonalFactor,
        });
      }
    }
  }
  
  return {
    predictedFoodCostPct,
    predictedBeverageCostPct,
    predictedProfitMargin,
    costEfficiencyRatio,
    confidenceLevel: isLimitedData ? 50 : 75,
    daily: dailyCostForecasts,
    monthly: monthlyCostForecasts,
  };
}

function generateBusinessForecast(
  historicalData: DailyFinancialSummary[],
  revenueTrend: { slope: number; intercept: number },
  foodCostTrend: { slope: number; intercept: number },
  beverageCostTrend: { slope: number; intercept: number }
) {
  // Calculate current revenue mix from historical data
  const totalHistoricalFoodRevenue = historicalData.reduce((sum, d) => sum + (d.actual_food_revenue || 0), 0);
  const totalHistoricalBeverageRevenue = historicalData.reduce((sum, d) => sum + (d.actual_beverage_revenue || 0), 0);
  const totalHistoricalRevenue = totalHistoricalFoodRevenue + totalHistoricalBeverageRevenue;
  
  const currentFoodMix = totalHistoricalRevenue > 0 ? (totalHistoricalFoodRevenue / totalHistoricalRevenue) * 100 : 50;
  const currentBeverageMix = totalHistoricalRevenue > 0 ? (totalHistoricalBeverageRevenue / totalHistoricalRevenue) * 100 : 50;
  
  // Calculate revenue growth rate (annualized from daily slope)
  const dailyGrowthRate = revenueTrend.slope;
  const avgRevenue = historicalData.reduce((sum, d) => 
    sum + (d.actual_food_revenue || 0) + (d.actual_beverage_revenue || 0), 0
  ) / historicalData.length;
  const revenueGrowthRate = avgRevenue > 0 ? (dailyGrowthRate / avgRevenue) * 365 * 100 : 0; // Annualized growth %
  
  // Calculate average budget cost percentages for variance forecast
  const avgBudgetFoodCostPct = historicalData.reduce((sum, d) => sum + (d.budget_food_cost_pct || 0), 0) / historicalData.length;
  const avgBudgetBeverageCostPct = historicalData.reduce((sum, d) => sum + (d.budget_beverage_cost_pct || 0), 0) / historicalData.length;
  
  const predictedFoodCostPct = Math.max(0, Math.min(100, foodCostTrend.intercept + foodCostTrend.slope * 30));
  const predictedBeverageCostPct = Math.max(0, Math.min(100, beverageCostTrend.intercept + beverageCostTrend.slope * 30));
  
  // Calculate cost variances from budget
  const foodCostVariance = avgBudgetFoodCostPct > 0 ? predictedFoodCostPct - avgBudgetFoodCostPct : 0;
  const beverageCostVariance = avgBudgetBeverageCostPct > 0 ? predictedBeverageCostPct - avgBudgetBeverageCostPct : 0;
  
  // Calculate break-even revenue (assuming fixed cost structure)
  const avgCostRatio = historicalData.reduce((sum, d) => {
    const revenue = (d.actual_food_revenue || 0) + (d.actual_beverage_revenue || 0);
    const cost = (d.actual_food_cost || 0) + (d.actual_beverage_cost || 0);
    return sum + (revenue > 0 ? cost / revenue : 0);
  }, 0) / historicalData.length;
  
  const projectedCostRatio = (predictedFoodCostPct * currentFoodMix/100 + predictedBeverageCostPct * currentBeverageMix/100) / 100;
  const breakEvenRevenue = avgRevenue * (projectedCostRatio / avgCostRatio); // Revenue needed to maintain current profit levels
  
  return {
    revenueMixForecast: {
      foodRevenuePercentage: currentFoodMix,
      beverageRevenuePercentage: currentBeverageMix,
    },
    revenueGrowthRate: Math.round(revenueGrowthRate * 100) / 100, // Round to 2 decimal places
    breakEvenRevenue,
    costVarianceForecast: {
      foodCostVariance: Math.round(foodCostVariance * 100) / 100,
      beverageCostVariance: Math.round(beverageCostVariance * 100) / 100,
    },
  };
}

function generateForecastAssumptions(isLimitedData = false, dataPoints = 0) {
  const baseAssumptions = [
    isLimitedData 
      ? `Based on limited data analysis (${dataPoints} days) - forecast accuracy may be reduced`
      : "Based on linear trend analysis of historical data",
    "Assumes current market conditions remain stable",
    isLimitedData 
      ? "Simple averaging used due to limited historical data"
      : "Seasonal adjustments applied using historical patterns",
    "External factors (events, weather) not included",
  ];
  
  if (!isLimitedData) {
    baseAssumptions.push("95% confidence intervals calculated from historical variance");
  } else {
    baseAssumptions.push("Wider confidence intervals due to limited data sample");
  }
  
  return baseAssumptions;
}

function generateRiskFactors(
  revenueTrend: { slope: number; intercept: number },
  costForecast: any,
  isLimitedData = false
) {
  const risks = [];
  
  if (revenueTrend.slope < 0) {
    risks.push("Declining revenue trend may continue");
  }
  
  if (costForecast.predictedFoodCostPct > 35) {
    risks.push("Food costs may exceed sustainable levels");
  }
  
  if (costForecast.predictedBeverageCostPct > 25) {
    risks.push("Beverage costs trending above industry standards");
  }
  
  if (isLimitedData) {
    risks.push("Limited historical data reduces forecast reliability");
    risks.push("Predictions based on short-term trends may not reflect long-term patterns");
  }
  
  risks.push("Economic conditions may impact customer demand");
  risks.push("Supply chain disruptions could affect costs");
  
  return risks;
}

function generateForecastRecommendations(
  revenueTrend: { slope: number; intercept: number },
  costForecast: any,
  isLimitedData = false
) {
  const recommendations = [];
  
  if (revenueTrend.slope > 0) {
    recommendations.push("Continue current growth strategies");
  } else {
    recommendations.push("Implement revenue recovery initiatives");
  }
  
  if (costForecast.predictedFoodCostPct > 30) {
    recommendations.push("Review food cost control measures");
  }
  
  if (costForecast.predictedBeverageCostPct > 20) {
    recommendations.push("Optimize beverage purchasing and inventory");
  }
  
  if (isLimitedData) {
    recommendations.push("Collect more historical data to improve forecast accuracy");
    recommendations.push("Use current forecasts as preliminary estimates only");
    recommendations.push("Re-run forecasts weekly as more data becomes available");
  } else {
    recommendations.push("Monitor forecasts weekly and adjust strategies");
  }
  
  recommendations.push("Collect additional data points for improved accuracy");
  
  return recommendations;
}
