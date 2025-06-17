"use server";

import { collection, query, where, getDocs, Timestamp, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, startOfMonth, endOfMonth } from "date-fns";
import type { DailyFinancialSummary, MonthlyProfitLossReport } from "@/types";

const DAILY_FINANCIAL_SUMMARIES_COLLECTION = "dailyFinancialSummaries";

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
  };
} 