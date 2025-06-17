"use server";

import { collection, query, where, getDocs, Timestamp, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, startOfMonth, endOfMonth } from "date-fns";
import type { DailyFinancialSummary, MonthlyProfitLossReport, PLStatementItem, Outlet, FoodCostEntry, BeverageCostEntry } from "@/types";
import { getOutletsAction } from "./foodCostActions";

const DAILY_FINANCIAL_SUMMARIES_COLLECTION = "dailyFinancialSummaries";
const FOOD_COST_ENTRIES_COLLECTION = "foodCostEntries";
const BEVERAGE_COST_ENTRIES_COLLECTION = "beverageCostEntries";

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
    totalIncome,
    expenseItems,
    totalExpenses,
    netIncomeBeforeTaxes: netIncome, // No tax, so net income before taxes = net income
    incomeTaxExpense: 0,
    netIncome,
    // OC/ENT and Other Adjustments for display (custom fields)
    ocEntFood: totalOCENTFood,
    ocEntBeverage: totalOCENTBeverage,
    otherAdjFood: totalOtherAdjFood,
    otherAdjBeverage: totalOtherAdjBeverage,
  } as any;
} 