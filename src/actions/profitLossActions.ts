"use server";

import { prisma } from "@/lib/prisma";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
// @ts-ignore
import type { BudgetVsActualsReport, DailyRevenueTrendsReport } from "@/types/index";
import { getCurrentUser } from "@/lib/server-auth";
import { auditReportExport } from "@/lib/audit-middleware";

export async function getMonthlyProfitLossReportAction(
  year: number,
  month: number, // 0-indexed (0 for January, 11 for December)
  taxRate?: number // Optional tax rate (as percentage, e.g., 25 for 25%)
): Promise<any> {
  const startDate = startOfMonth(new Date(year, month));
  const endDate = endOfMonth(new Date(year, month));

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Authentication required");
    }
    // Get all financial summaries for the month
    const summaries = await prisma.dailyFinancialSummary.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Get outlet-wise food cost entries
    const foodCostEntries = await prisma.foodCostEntry.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        outlet: true,
        details: {
          include: {
            category: true,
          },
        },
      },
    });

    // Get outlet-wise beverage cost entries
    const beverageCostEntries = await prisma.beverageCostEntry.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        outlet: true,
        details: {
          include: {
            category: true,
          },
        },
      },
    });

    // Calculate totals
    const totalFoodRevenue = summaries.reduce((sum, s) => sum + (s.actualFoodRevenue || 0), 0);
    const totalBeverageRevenue = summaries.reduce((sum, s) => sum + (s.actualBeverageRevenue || 0), 0);
    const totalRevenue = totalFoodRevenue + totalBeverageRevenue;

    const totalActualFoodCost = summaries.reduce((sum, s) => sum + (s.actualFoodCost || 0), 0);
    const totalActualBeverageCost = summaries.reduce((sum, s) => sum + (s.actualBeverageCost || 0), 0);
    const totalActualCost = totalActualFoodCost + totalActualBeverageCost;

    // Calculate OC&ENT totals
    const totalEntFood = summaries.reduce((sum, s) => sum + (s.entFood || 0), 0);
    const totalCoFood = summaries.reduce((sum, s) => sum + (s.coFood || 0), 0);
    const totalOtherFoodAdjustment = summaries.reduce((sum, s) => sum + (s.otherFoodAdjustment || 0), 0);
    const totalEntBeverage = summaries.reduce((sum, s) => sum + (s.entBeverage || 0), 0);
    const totalCoBeverage = summaries.reduce((sum, s) => sum + (s.coBeverage || 0), 0);
    const totalOtherBeverageAdjustment = summaries.reduce((sum, s) => sum + (s.otherBeverageAdjustment || 0), 0);

    const grossProfit = totalRevenue - totalActualCost;
    const foodCostPercentage = totalFoodRevenue > 0 ? (totalActualFoodCost / totalFoodRevenue) * 100 : 0;
    const beverageCostPercentage = totalBeverageRevenue > 0 ? (totalActualBeverageCost / totalBeverageRevenue) * 100 : 0;
    const overallCostPercentage = totalRevenue > 0 ? (totalActualCost / totalRevenue) * 100 : 0;

    // Calculate average budget percentages
    const validSummaries = summaries.filter(s => s.budgetFoodCostPct && s.budgetBeverageCostPct);
    const averageBudgetFoodCostPct = validSummaries.length > 0 
      ? validSummaries.reduce((sum, s) => sum + (s.budgetFoodCostPct || 0), 0) / validSummaries.length 
      : 0;
    const averageBudgetBeverageCostPct = validSummaries.length > 0 
      ? validSummaries.reduce((sum, s) => sum + (s.budgetBeverageCostPct || 0), 0) / validSummaries.length 
      : 0;

    // Create basic income and expense items
    const incomeItems = [
      {
        referenceId: "food-revenue",
        description: "Food Revenue",
        amount: totalFoodRevenue,
      },
      {
        referenceId: "beverage-revenue", 
        description: "Beverage Revenue",
        amount: totalBeverageRevenue,
      },
    ];

    // Group outlet-wise expenses
    const outletExpenses = new Map();
    
    // Process food cost entries by outlet
    foodCostEntries.forEach(entry => {
      const outletKey = `${entry.outlet.name} (${entry.outlet.outletCode})`;
      if (!outletExpenses.has(outletKey)) {
        outletExpenses.set(outletKey, {
          outletName: entry.outlet.name,
          outletCode: entry.outlet.outletCode,
          foodCost: 0,
          beverageCost: 0,
        });
      }
      outletExpenses.get(outletKey).foodCost += entry.totalFoodCost;
    });

    // Process beverage cost entries by outlet
    beverageCostEntries.forEach(entry => {
      const outletKey = `${entry.outlet.name} (${entry.outlet.outletCode})`;
      if (!outletExpenses.has(outletKey)) {
        outletExpenses.set(outletKey, {
          outletName: entry.outlet.name,
          outletCode: entry.outlet.outletCode,
          foodCost: 0,
          beverageCost: 0,
        });
      }
      outletExpenses.get(outletKey).beverageCost += entry.totalBeverageCost;
    });

    // Build expense items with outlet-wise breakdown
    const expenseItems: {
      referenceId: string;
      description: string;
      amount: number;
      outlet?: string;
      outletCode?: string;
    }[] = [];
    
    // Add outlet-wise food costs
    Array.from(outletExpenses.entries()).forEach(([outletKey, outletData]) => {
      if (outletData.foodCost > 0) {
        expenseItems.push({
          referenceId: `food-cost-${outletData.outletCode}`,
          description: `Food Cost - ${outletData.outletName}`,
          amount: outletData.foodCost,
          outlet: outletData.outletName,
          outletCode: outletData.outletCode,
        });
      }
    });

    // Add outlet-wise beverage costs
    Array.from(outletExpenses.entries()).forEach(([outletKey, outletData]) => {
      if (outletData.beverageCost > 0) {
        expenseItems.push({
          referenceId: `beverage-cost-${outletData.outletCode}`,
          description: `Beverage Cost - ${outletData.outletName}`,
          amount: outletData.beverageCost,
          outlet: outletData.outletName,
          outletCode: outletData.outletCode,
        });
      }
    });

    // Add OC&ENT items
    const ocEntItems = [];
    if (totalEntFood > 0) {
      ocEntItems.push({
        referenceId: "ent-food",
        description: "ENT Food",
        amount: totalEntFood,
      });
    }
    if (totalCoFood > 0) {
      ocEntItems.push({
        referenceId: "co-food", 
        description: "CO Food",
        amount: totalCoFood,
      });
    }
    if (totalEntBeverage > 0) {
      ocEntItems.push({
        referenceId: "ent-beverage",
        description: "ENT Beverage", 
        amount: totalEntBeverage,
      });
    }
    if (totalCoBeverage > 0) {
      ocEntItems.push({
        referenceId: "co-beverage",
        description: "CO Beverage",
        amount: totalCoBeverage,
      });
    }

    // Add other adjustments
    const otherAdjustmentItems = [];
    if (totalOtherFoodAdjustment !== 0) {
      otherAdjustmentItems.push({
        referenceId: "other-food-adjustment",
        description: "Other Food Adjustment",
        amount: totalOtherFoodAdjustment,
      });
    }
    if (totalOtherBeverageAdjustment !== 0) {
      otherAdjustmentItems.push({
        referenceId: "other-beverage-adjustment",
        description: "Other Beverage Adjustment",
        amount: totalOtherBeverageAdjustment,
      });
    }

    const totalIncome = incomeItems.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = expenseItems.reduce((sum, item) => sum + item.amount, 0);
    const totalOcEnt = ocEntItems.reduce((sum, item) => sum + item.amount, 0);
    const totalOtherAdjustments = otherAdjustmentItems.reduce((sum, item) => sum + item.amount, 0);
    
    // Calculate Total Expenses After Adjustments = Expense Total - OC & ENT Total + Other Adjustments Total
    const totalExpensesAfterAdjustments = totalExpenses - totalOcEnt + totalOtherAdjustments;
    
    const netIncomeBeforeTaxes = totalIncome - totalExpensesAfterAdjustments;
    const finalTaxRate = (taxRate ?? 25) / 100; // Convert percentage to decimal, default 25%
    const incomeTaxExpense = netIncomeBeforeTaxes * finalTaxRate;
    const netIncome = netIncomeBeforeTaxes - incomeTaxExpense;

    // Create audit log for report access
    await auditReportExport(
      currentUser.id,
      "monthly_profit_loss",
      { year, month, taxRate, startDate, endDate },
      currentUser.propertyAccess?.[0]?.propertyId
    );

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
      salesReturnsAllowances: 0,
      totalIncome,
      totalRevenuePL: totalIncome,
      expenseItems,
      ocEntItems,
      otherAdjustmentItems,
      totalExpenses,
      totalOcEnt,
      totalOtherAdjustments,
      totalExpensesAfterAdjustments,
      netIncomeBeforeTaxes,
      taxRate: taxRate ?? 25, // Return as percentage
      incomeTaxExpense,
      netIncome,
      // Add totals for OC&ENT and adjustments
      totalEntFood,
      totalCoFood,
      totalOtherFoodAdjustment,
      totalEntBeverage,
      totalCoBeverage,
      totalOtherBeverageAdjustment,
      outletExpenses: Array.from(outletExpenses.values()),
    };
  } catch (error) {
    console.error("Error generating monthly profit loss report:", error);
    throw new Error("Failed to generate monthly profit loss report");
  }
}

export async function getBudgetVsActualsReportAction(
  startDate: Date,
  endDate: Date,
  outletId?: string
): Promise<BudgetVsActualsReport> {
  try {
    // Get all financial summaries for the date range (no outlet filtering since DFS is aggregated)
    const summaries = await prisma.dailyFinancialSummary.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    // If outlet filtering is requested, we need to get outlet-specific cost data
    let outletName: string | undefined;
    let outletFoodCost = 0;
    let outletBeverageCost = 0;
    
    if (outletId && outletId !== "all") {
      const outlet = await prisma.outlet.findUnique({
        where: { id: parseInt(outletId) },
      });
      outletName = outlet?.name;

      // Get outlet-specific food costs
      const outletFoodEntries = await prisma.foodCostEntry.findMany({
        where: {
          outletId: parseInt(outletId),
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Get outlet-specific beverage costs
      const outletBeverageEntries = await prisma.beverageCostEntry.findMany({
        where: {
          outletId: parseInt(outletId),
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      outletFoodCost = outletFoodEntries.reduce((sum, entry) => sum + entry.totalFoodCost, 0);
      outletBeverageCost = outletBeverageEntries.reduce((sum, entry) => sum + entry.totalBeverageCost, 0);
    }

    // Calculate food metrics
    const foodBudgetedRevenue = summaries.reduce((sum, s) => sum + (s.budgetFoodRevenue || 0), 0);
    const foodActualRevenue = summaries.reduce((sum, s) => sum + (s.actualFoodRevenue || 0), 0);
    const foodBudgetedCost = summaries.reduce((sum, s) => sum + (s.budgetFoodCost || 0), 0);
    
    // Use outlet-specific costs if filtering by outlet, otherwise use financial summary costs
    const foodActualCost = (outletId && outletId !== "all") 
      ? outletFoodCost 
      : summaries.reduce((sum, s) => sum + (s.actualFoodCost || 0), 0);

    // Calculate beverage metrics
    const beverageBudgetedRevenue = summaries.reduce((sum, s) => sum + (s.budgetBeverageRevenue || 0), 0);
    const beverageActualRevenue = summaries.reduce((sum, s) => sum + (s.actualBeverageRevenue || 0), 0);
    const beverageBudgetedCost = summaries.reduce((sum, s) => sum + (s.budgetBeverageCost || 0), 0);
    
    // Use outlet-specific costs if filtering by outlet, otherwise use financial summary costs
    const beverageActualCost = (outletId && outletId !== "all") 
      ? outletBeverageCost 
      : summaries.reduce((sum, s) => sum + (s.actualBeverageCost || 0), 0);

    // Get budgeted cost percentages from financial summary (not calculated)
    const validSummaries = summaries.filter(s => s.budgetFoodCostPct != null && s.budgetBeverageCostPct != null);
    const foodBudgetedCostPercentage = validSummaries.length > 0 
      ? validSummaries.reduce((sum, s) => sum + (s.budgetFoodCostPct || 0), 0) / validSummaries.length 
      : 0;
    const beverageBudgetedCostPercentage = validSummaries.length > 0 
      ? validSummaries.reduce((sum, s) => sum + (s.budgetBeverageCostPct || 0), 0) / validSummaries.length 
      : 0;

    // Calculate actual cost percentages
    const foodActualCostPercentage = foodActualRevenue > 0 ? (foodActualCost / foodActualRevenue) * 100 : 0;
    const beverageActualCostPercentage = beverageActualRevenue > 0 ? (beverageActualCost / beverageActualRevenue) * 100 : 0;

    return {
      dateRange: { from: startDate, to: endDate },
      outletId,
      outletName,
      foodBudget: {
        budgetedRevenue: foodBudgetedRevenue,
        budgetedCostPercentage: foodBudgetedCostPercentage,
        budgetedCost: foodBudgetedCost,
      },
      foodActual: {
        actualRevenue: foodActualRevenue,
        actualCost: foodActualCost,
        actualCostPercentage: foodActualCostPercentage,
      },
      foodVariance: {
        revenueVariance: foodActualRevenue - foodBudgetedRevenue,
        revenueVariancePercentage: foodBudgetedRevenue > 0 ? ((foodActualRevenue - foodBudgetedRevenue) / foodBudgetedRevenue) * 100 : 0,
        costVariance: foodActualCost - foodBudgetedCost,
        costVariancePercentage: foodBudgetedCost > 0 ? ((foodActualCost - foodBudgetedCost) / foodBudgetedCost) * 100 : 0,
        costPercentageVariance: foodActualCostPercentage - foodBudgetedCostPercentage,
      },
      beverageBudget: {
        budgetedRevenue: beverageBudgetedRevenue,
        budgetedCostPercentage: beverageBudgetedCostPercentage,
        budgetedCost: beverageBudgetedCost,
      },
      beverageActual: {
        actualRevenue: beverageActualRevenue,
        actualCost: beverageActualCost,
        actualCostPercentage: beverageActualCostPercentage,
      },
      beverageVariance: {
        revenueVariance: beverageActualRevenue - beverageBudgetedRevenue,
        revenueVariancePercentage: beverageBudgetedRevenue > 0 ? ((beverageActualRevenue - beverageBudgetedRevenue) / beverageBudgetedRevenue) * 100 : 0,
        costVariance: beverageActualCost - beverageBudgetedCost,
        costVariancePercentage: beverageBudgetedCost > 0 ? ((beverageActualCost - beverageBudgetedCost) / beverageBudgetedCost) * 100 : 0,
        costPercentageVariance: beverageActualCostPercentage - beverageBudgetedCostPercentage,
      },
      combinedBudget: {
        budgetedRevenue: foodBudgetedRevenue + beverageBudgetedRevenue,
        budgetedCost: foodBudgetedCost + beverageBudgetedCost,
        budgetedCostPercentage: (foodBudgetedRevenue + beverageBudgetedRevenue) > 0 ? ((foodBudgetedCost + beverageBudgetedCost) / (foodBudgetedRevenue + beverageBudgetedRevenue)) * 100 : 0,
      },
      combinedActual: {
        actualRevenue: foodActualRevenue + beverageActualRevenue,
        actualCost: foodActualCost + beverageActualCost,
        actualCostPercentage: (foodActualRevenue + beverageActualRevenue) > 0 ? ((foodActualCost + beverageActualCost) / (foodActualRevenue + beverageActualRevenue)) * 100 : 0,
      },
      combinedVariance: {
        revenueVariance: (foodActualRevenue + beverageActualRevenue) - (foodBudgetedRevenue + beverageBudgetedRevenue),
        revenueVariancePercentage: (foodBudgetedRevenue + beverageBudgetedRevenue) > 0 ? (((foodActualRevenue + beverageActualRevenue) - (foodBudgetedRevenue + beverageBudgetedRevenue)) / (foodBudgetedRevenue + beverageBudgetedRevenue)) * 100 : 0,
        costVariance: (foodActualCost + beverageActualCost) - (foodBudgetedCost + beverageBudgetedCost),
        costVariancePercentage: (foodBudgetedCost + beverageBudgetedCost) > 0 ? (((foodActualCost + beverageActualCost) - (foodBudgetedCost + beverageBudgetedCost)) / (foodBudgetedCost + beverageBudgetedCost)) * 100 : 0,
        costPercentageVariance: ((foodActualRevenue + beverageActualRevenue) > 0 ? ((foodActualCost + beverageActualCost) / (foodActualRevenue + beverageActualRevenue)) * 100 : 0) - ((foodBudgetedRevenue + beverageBudgetedRevenue) > 0 ? ((foodBudgetedCost + beverageBudgetedCost) / (foodBudgetedRevenue + beverageBudgetedRevenue)) * 100 : 0),
      },
      dailyBreakdown: summaries.map(s => ({
        date: s.date,
        foodBudgetedRevenue: s.budgetFoodRevenue || 0,
        foodActualRevenue: s.actualFoodRevenue || 0,
        foodBudgetedCost: s.budgetFoodCost || 0,
        foodActualCost: s.actualFoodCost || 0,
        beverageBudgetedRevenue: s.budgetBeverageRevenue || 0,
        beverageActualRevenue: s.actualBeverageRevenue || 0,
        beverageBudgetedCost: s.budgetBeverageCost || 0,
        beverageActualCost: s.actualBeverageCost || 0,
      })),
      performanceIndicators: {
        foodRevenueAchievement: foodBudgetedRevenue > 0 ? (foodActualRevenue / foodBudgetedRevenue) * 100 : 0,
        beverageRevenueAchievement: beverageBudgetedRevenue > 0 ? (beverageActualRevenue / beverageBudgetedRevenue) * 100 : 0,
        foodCostControl: foodBudgetedCostPercentage > 0 ? (foodActualCostPercentage / foodBudgetedCostPercentage) * 100 : 0,
        beverageCostControl: beverageBudgetedCostPercentage > 0 ? (beverageActualCostPercentage / beverageBudgetedCostPercentage) * 100 : 0,
        overallPerformance: 75, // Placeholder calculation
      },
    };
  } catch (error) {
    console.error("Error generating budget vs actuals report:", error);
    throw new Error("Failed to generate budget vs actuals report");
  }
}

// Add more report functions as needed...
export async function getMonthlyProfitLossReportForDateRangeAction(
  startDate: Date,
  endDate: Date,
  outletId?: string,
  taxRate?: number // Optional tax rate (as percentage)
): Promise<any[]> {
  try {
    const whereClause: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (outletId) {
      whereClause.outletId = outletId;
    }

    const summaries = await prisma.dailyFinancialSummary.findMany({
      where: whereClause,
      orderBy: {
        date: "asc",
      },
    });

    // Group by month and calculate reports
    const monthlyData = new Map();
    
    summaries.forEach(summary => {
      const monthKey = format(summary.date, 'yyyy-MM');
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, []);
      }
      
      monthlyData.get(monthKey).push(summary);
    });

    // Fix: Add type for MonthlyProfitLossReport or use 'any' if not defined
    // If MonthlyProfitLossReport is not defined, use 'any[]' to avoid type error
    const reports: any[] = [];
    
    for (const [monthKey, monthlySummaries] of monthlyData) {
      const [year, month] = monthKey.split('-');
      const monthIndex = parseInt(month, 10) - 1; // Convert to 0-indexed
      const yearNum = parseInt(year);
      
      const report = await getMonthlyProfitLossReportAction(yearNum, monthIndex, taxRate);
      reports.push(report);
    }

    return reports;
  } catch (error) {
    console.error("Error generating monthly profit loss reports for date range:", error);
    throw new Error("Failed to generate monthly profit loss reports for date range");
  }
}

export async function getDailyRevenueTrendsReportAction(
  startDate: Date,
  endDate: Date,
  outletId?: string
): Promise<DailyRevenueTrendsReport> {
  try {
    // Note: dailyFinancialSummary contains aggregated data for all outlets
    // outletId filtering is not available at this level since it's already aggregated
    const summaries = await prisma.dailyFinancialSummary.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    const dailyTrends = summaries.map(summary => ({
      date: summary.date,
      totalRevenue: (summary.actualFoodRevenue || 0) + (summary.actualBeverageRevenue || 0),
      foodRevenue: summary.actualFoodRevenue || 0,
      beverageRevenue: summary.actualBeverageRevenue || 0,
      totalCosts: (summary.actualFoodCost || 0) + (summary.actualBeverageCost || 0),
      foodCosts: summary.actualFoodCost || 0,
      beverageCosts: summary.actualBeverageCost || 0,
      netProfit: ((summary.actualFoodRevenue || 0) + (summary.actualBeverageRevenue || 0)) - ((summary.actualFoodCost || 0) + (summary.actualBeverageCost || 0)),
      totalCovers: (summary as any).totalCovers || 0,
      averageCheck: (summary as any).averageCheck || 0,
    }));

    const totalRevenue = dailyTrends.reduce((sum, day) => sum + day.totalRevenue, 0);
    const totalCosts = dailyTrends.reduce((sum, day) => sum + day.totalCosts, 0);
    const totalFoodRevenue = dailyTrends.reduce((sum, day) => sum + day.foodRevenue, 0);
    const totalBeverageRevenue = dailyTrends.reduce((sum, day) => sum + day.beverageRevenue, 0);
    const averageDailyRevenue = dailyTrends.length > 0 ? totalRevenue / dailyTrends.length : 0;
    const averageDailyCosts = dailyTrends.length > 0 ? totalCosts / dailyTrends.length : 0;

    // Find highest and lowest revenue days
    const sortedByRevenue = [...dailyTrends].sort((a, b) => b.totalRevenue - a.totalRevenue);
    const highestRevenueDay = sortedByRevenue[0] || {
      date: new Date(),
      totalRevenue: 0,
      foodRevenue: 0,
      beverageRevenue: 0,
      totalCosts: 0,
      foodCosts: 0,
      beverageCosts: 0,
      netProfit: 0,
      totalCovers: 0,
      averageCheck: 0
    };
    const lowestRevenueDay = sortedByRevenue[sortedByRevenue.length - 1] || highestRevenueDay;

    // Calculate growth trend
    const firstWeekRevenue = dailyTrends.slice(0, 7).reduce((sum, day) => sum + day.totalRevenue, 0);
    const lastWeekRevenue = dailyTrends.slice(-7).reduce((sum, day) => sum + day.totalRevenue, 0);
    const revenueGrowthTrend = firstWeekRevenue > 0 ? ((lastWeekRevenue - firstWeekRevenue) / firstWeekRevenue) * 100 : 0;

    // Calculate weekly trends
    const weeklyTrends = [];
    let currentWeekStart = new Date(startDate);
    
    while (currentWeekStart <= endDate) {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      if (weekEnd > endDate) weekEnd.setTime(endDate.getTime());
      
      const weekData = dailyTrends.filter(day => 
        day.date >= currentWeekStart && day.date <= weekEnd
      );
      
      if (weekData.length > 0) {
        const weekTotalRevenue = weekData.reduce((sum, day) => sum + day.totalRevenue, 0);
        const weekFoodRevenue = weekData.reduce((sum, day) => sum + day.foodRevenue, 0);
        const weekBeverageRevenue = weekData.reduce((sum, day) => sum + day.beverageRevenue, 0);
        const weekTotalCosts = weekData.reduce((sum, day) => sum + day.totalCosts, 0);
        
        weeklyTrends.push({
          weekStartDate: new Date(currentWeekStart),
          weekEndDate: new Date(weekEnd),
          totalRevenue: weekTotalRevenue,
          foodRevenue: weekFoodRevenue,
          beverageRevenue: weekBeverageRevenue,
          totalCosts: weekTotalCosts,
          netProfit: weekTotalRevenue - weekTotalCosts,
          averageDailyRevenue: weekTotalRevenue / weekData.length,
          daysInWeek: weekData.length
        });
      }
      
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    // Calculate performance metrics
    const revenueValues = dailyTrends.map(d => d.totalRevenue);
    const foodRevenueValues = dailyTrends.map(d => d.foodRevenue);
    const beverageRevenueValues = dailyTrends.map(d => d.beverageRevenue);
    
    const calculateVolatility = (values: number[]) => {
      if (values.length < 2) return 0;
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      return Math.sqrt(variance) / mean * 100; // CV as percentage
    };

    const bestDay = sortedByRevenue[0];
    const worstDay = sortedByRevenue[sortedByRevenue.length - 1];

    // Calculate weekday vs weekend averages
    const weekdayRevenues = dailyTrends.filter(day => {
      const dayOfWeek = day.date.getDay();
      return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
    }).map(d => d.totalRevenue);
    
    const weekendRevenues = dailyTrends.filter(day => {
      const dayOfWeek = day.date.getDay();
      return dayOfWeek === 0 || dayOfWeek === 6; // Saturday and Sunday
    }).map(d => d.totalRevenue);

    const weekdayAverage = weekdayRevenues.length > 0 ? weekdayRevenues.reduce((sum, val) => sum + val, 0) / weekdayRevenues.length : 0;
    const weekendAverage = weekendRevenues.length > 0 ? weekendRevenues.reduce((sum, val) => sum + val, 0) / weekendRevenues.length : 0;

    // Determine trend direction
    const determineTrend = (values: number[]): "increasing" | "decreasing" | "stable" => {
      if (values.length < 2) return "stable";
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
      const change = (secondAvg - firstAvg) / firstAvg * 100;
      
      if (change > 5) return "increasing";
      if (change < -5) return "decreasing";
      return "stable";
    };

    return {
      dateRange: { from: startDate, to: endDate },
      outletName: outletId ? `Outlet ${outletId}` : 'All Outlets', // Note: filtering not supported at summary level
      
      summary: {
        totalFoodRevenue,
        totalBeverageRevenue,
        totalRevenue,
        totalCosts,
        totalNetProfit: totalRevenue - totalCosts,
        averageDailyRevenue,
        averageDailyCosts,
        averageDailyProfit: averageDailyRevenue - averageDailyCosts,
        averageDailyFoodRevenue: dailyTrends.length > 0 ? totalFoodRevenue / dailyTrends.length : 0,
        averageDailyBeverageRevenue: dailyTrends.length > 0 ? totalBeverageRevenue / dailyTrends.length : 0,
        averageDailyTotalRevenue: averageDailyRevenue,
        totalDays: dailyTrends.length,
        revenueGrowthTrend,
        profitMargin: totalRevenue > 0 ? ((totalRevenue - totalCosts) / totalRevenue) * 100 : 0,
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
        foodRevenueGrowth: revenueGrowthTrend, // Simplified for now
        beverageRevenueGrowth: revenueGrowthTrend, // Simplified for now
        totalRevenueGrowth: revenueGrowthTrend,
        foodRevenueVolatility: calculateVolatility(foodRevenueValues),
        beverageRevenueVolatility: calculateVolatility(beverageRevenueValues),
        totalRevenueVolatility: calculateVolatility(revenueValues),
        bestPerformingDay: bestDay ? bestDay.date.toLocaleDateString() : 'N/A',
        worstPerformingDay: worstDay ? worstDay.date.toLocaleDateString() : 'N/A',
        revenueConsistency: 100 - calculateVolatility(revenueValues), // Higher is more consistent
      },
      
      trendAnalysis: {
        overallTrend: determineTrend(revenueValues),
        foodTrend: determineTrend(foodRevenueValues),
        beverageTrend: determineTrend(beverageRevenueValues),
        trendStrength: Math.abs(revenueGrowthTrend),
        seasonalityDetected: false, // Could be enhanced with more sophisticated analysis
        peakDays: sortedByRevenue.slice(0, 3).map(d => d.date.toLocaleDateString()),
        slowDays: sortedByRevenue.slice(-3).map(d => d.date.toLocaleDateString()),
      },
      
      insights: {
        bestPerformingDays: dailyTrends
          .sort((a, b) => b.totalRevenue - a.totalRevenue)
          .slice(0, 5),
        worstPerformingDays: dailyTrends
          .sort((a, b) => a.totalRevenue - b.totalRevenue)
          .slice(0, 5),
        weekdayAverage,
        weekendAverage,
        recommendations: [
          ...(weekendAverage > weekdayAverage * 1.2 ? ['Focus on weekend marketing and promotions for best ROI'] : []),
          ...(calculateVolatility(revenueValues) > 30 ? ['Revenue shows high volatility - consider stabilizing operations'] : []),
          ...(revenueGrowthTrend < 0 ? ['Revenue trend is declining - review pricing and menu offerings'] : []),
        ],
      },
    };
  } catch (error) {
    console.error("Error generating daily revenue trends report:", error);
    throw new Error("Failed to generate daily revenue trends report");
  }
}

export async function getRealTimeKPIDashboardAction(
  outletId?: string
): Promise<any> {
  try {
    console.log("Starting Real-Time KPI Dashboard generation", { outletId });
    
    const today = new Date();
    const startOfToday = startOfYear(today);
    const endOfToday = endOfYear(today);
    
    // Get today's summary
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
    
    const todaySummary = await prisma.dailyFinancialSummary.findFirst({
      where: {
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    // Get month-to-date summaries
    const startOfCurrentMonth = startOfMonth(today);
    const monthlySummaries = await prisma.dailyFinancialSummary.findMany({
      where: {
        date: {
          gte: startOfCurrentMonth,
          lte: today,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Get previous month data for comparison
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    const lastMonthSummaries = await prisma.dailyFinancialSummary.findMany({
      where: {
        date: {
          gte: lastMonth,
          lte: endOfLastMonth,
        },
      },
    });

    // Calculate current period metrics
    const todayRevenue = todaySummary ? (todaySummary.actualFoodRevenue || 0) + (todaySummary.actualBeverageRevenue || 0) : 0;
    const todayFoodRevenue = todaySummary?.actualFoodRevenue || 0;
    const todayBeverageRevenue = todaySummary?.actualBeverageRevenue || 0;
    const todayFoodCost = todaySummary?.actualFoodCost || 0;
    const todayBeverageCost = todaySummary?.actualBeverageCost || 0;
    const todayCosts = todayFoodCost + todayBeverageCost;

    // Calculate budget values
    const todayBudgetFoodRevenue = todaySummary?.budgetFoodRevenue || 0;
    const todayBudgetBeverageRevenue = todaySummary?.budgetBeverageRevenue || 0;
    const todayBudgetRevenue = todayBudgetFoodRevenue + todayBudgetBeverageRevenue;
    const todayBudgetFoodCost = todaySummary?.budgetFoodCost || 0;
    const todayBudgetBeverageCost = todaySummary?.budgetBeverageCost || 0;

    // Calculate monthly metrics
    const monthlyRevenue = monthlySummaries.reduce((sum, s) => sum + (s.actualFoodRevenue || 0) + (s.actualBeverageRevenue || 0), 0);
    const monthlyFoodRevenue = monthlySummaries.reduce((sum, s) => sum + (s.actualFoodRevenue || 0), 0);
    const monthlyBeverageRevenue = monthlySummaries.reduce((sum, s) => sum + (s.actualBeverageRevenue || 0), 0);
    const monthlyCosts = monthlySummaries.reduce((sum, s) => sum + (s.actualFoodCost || 0) + (s.actualBeverageCost || 0), 0);
    const monthlyFoodCosts = monthlySummaries.reduce((sum, s) => sum + (s.actualFoodCost || 0), 0);
    const monthlyBeverageCosts = monthlySummaries.reduce((sum, s) => sum + (s.actualBeverageCost || 0), 0);

    // Calculate budget monthly metrics
    const monthlyBudgetRevenue = monthlySummaries.reduce((sum, s) => sum + (s.budgetFoodRevenue || 0) + (s.budgetBeverageRevenue || 0), 0);
    const monthlyBudgetFoodCosts = monthlySummaries.reduce((sum, s) => sum + (s.budgetFoodCost || 0), 0);
    const monthlyBudgetBeverageCosts = monthlySummaries.reduce((sum, s) => sum + (s.budgetBeverageCost || 0), 0);

    // Calculate last month metrics for comparison
    const lastMonthRevenue = lastMonthSummaries.reduce((sum, s) => sum + (s.actualFoodRevenue || 0) + (s.actualBeverageRevenue || 0), 0);
    const lastMonthCosts = lastMonthSummaries.reduce((sum, s) => sum + (s.actualFoodCost || 0) + (s.actualBeverageCost || 0), 0);

    // Calculate KPI metrics
    const currentFoodCostPct = monthlyFoodRevenue > 0 ? (monthlyFoodCosts / monthlyFoodRevenue) * 100 : 0;
    const currentBeverageCostPct = monthlyBeverageRevenue > 0 ? (monthlyBeverageCosts / monthlyBeverageRevenue) * 100 : 0;
    
    // Calculate target percentages (average of budget percentages)
    const validSummaries = monthlySummaries.filter(s => s.budgetFoodCostPct && s.budgetBeverageCostPct);
    const targetFoodCostPct = validSummaries.length > 0 
      ? validSummaries.reduce((sum, s) => sum + (s.budgetFoodCostPct || 0), 0) / validSummaries.length 
      : 30; // Default target
    const targetBeverageCostPct = validSummaries.length > 0 
      ? validSummaries.reduce((sum, s) => sum + (s.budgetBeverageCostPct || 0), 0) / validSummaries.length 
      : 25; // Default target

    // Revenue achievement and variance
    const revenueAchievement = todayBudgetRevenue > 0 ? (todayRevenue / todayBudgetRevenue) * 100 : 0;
    const revenueVariance = todayBudgetRevenue > 0 ? ((todayRevenue - todayBudgetRevenue) / todayBudgetRevenue) * 100 : 0;

    // Cost variances
    const foodCostVariance = targetFoodCostPct > 0 ? ((currentFoodCostPct - targetFoodCostPct) / targetFoodCostPct) * 100 : 0;
    const beverageCostVariance = targetBeverageCostPct > 0 ? ((currentBeverageCostPct - targetBeverageCostPct) / targetBeverageCostPct) * 100 : 0;

    // Profit calculations
    const profitMargin = todayRevenue > 0 ? ((todayRevenue - todayCosts) / todayRevenue) * 100 : 0;
    const foodRevenuePercentage = todayRevenue > 0 ? (todayFoodRevenue / todayRevenue) * 100 : 0;
    const costEfficiencyRatio = todayRevenue > 0 ? (1 - (todayCosts / todayRevenue)) * 100 : 0;

    // Calculate trends (month-over-month)
    const revenueGrowth = lastMonthRevenue > 0 ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
    const costTrend = lastMonthCosts > 0 ? ((monthlyCosts - lastMonthCosts) / lastMonthCosts) * 100 : 0;
    const profitTrend = revenueGrowth - costTrend; // Simplified profit trend

    // Create trending KPIs
    const trendingKPIs = [
      {
        name: "Revenue Achievement",
        value: revenueAchievement,
        target: 100,
        trend: revenueAchievement >= 100 ? "up" : "down",
        trendPercentage: revenueVariance,
        status: revenueAchievement >= 100 ? "excellent" : revenueAchievement >= 90 ? "good" : revenueAchievement >= 75 ? "warning" : "critical",
      },
      {
        name: "Food Cost Control",
        value: currentFoodCostPct,
        target: targetFoodCostPct,
        trend: currentFoodCostPct <= targetFoodCostPct ? "up" : "down",
        trendPercentage: -foodCostVariance, // Negative because lower is better
        status: currentFoodCostPct <= targetFoodCostPct ? "excellent" : currentFoodCostPct <= targetFoodCostPct * 1.05 ? "good" : currentFoodCostPct <= targetFoodCostPct * 1.1 ? "warning" : "critical",
      },
      {
        name: "Beverage Cost Control",
        value: currentBeverageCostPct,
        target: targetBeverageCostPct,
        trend: currentBeverageCostPct <= targetBeverageCostPct ? "up" : "down",
        trendPercentage: -beverageCostVariance, // Negative because lower is better
        status: currentBeverageCostPct <= targetBeverageCostPct ? "excellent" : currentBeverageCostPct <= targetBeverageCostPct * 1.05 ? "good" : currentBeverageCostPct <= targetBeverageCostPct * 1.1 ? "warning" : "critical",
      },
      {
        name: "Profit Margin",
        value: profitMargin,
        target: 15, // Target 15% profit margin
        trend: profitMargin >= 15 ? "up" : profitMargin >= 10 ? "stable" : "down",
        trendPercentage: profitTrend,
        status: profitMargin >= 15 ? "excellent" : profitMargin >= 10 ? "good" : profitMargin >= 5 ? "warning" : "critical",
      },
    ];

    // Generate alerts based on performance
    const alerts = [];
    
    if (revenueAchievement < 75) {
      alerts.push({
        message: `Revenue achievement is critically low at ${revenueAchievement.toFixed(1)}%. Immediate action required.`,
        type: "revenue_critical",
        severity: "high" as const,
        timestamp: new Date(),
      });
    } else if (revenueAchievement < 90) {
      alerts.push({
        message: `Revenue achievement is below target at ${revenueAchievement.toFixed(1)}%. Monitor closely.`,
        type: "revenue_warning",
        severity: "medium" as const,
        timestamp: new Date(),
      });
    }

    if (currentFoodCostPct > targetFoodCostPct * 1.1) {
      alerts.push({
        message: `Food cost percentage is ${currentFoodCostPct.toFixed(1)}%, significantly above target of ${targetFoodCostPct.toFixed(1)}%.`,
        type: "food_cost_high",
        severity: "high" as const,
        timestamp: new Date(),
      });
    }

    if (currentBeverageCostPct > targetBeverageCostPct * 1.1) {
      alerts.push({
        message: `Beverage cost percentage is ${currentBeverageCostPct.toFixed(1)}%, significantly above target of ${targetBeverageCostPct.toFixed(1)}%.`,
        type: "beverage_cost_high",
        severity: "high" as const,
        timestamp: new Date(),
      });
    }

    if (profitMargin < 5) {
      alerts.push({
        message: `Profit margin is critically low at ${profitMargin.toFixed(1)}%. Review pricing and costs immediately.`,
        type: "profit_critical",
        severity: "high" as const,
        timestamp: new Date(),
      });
    }

    const outletName = outletId ? `Outlet ${outletId}` : 'All Outlets';

    console.log("Real-Time KPI Dashboard calculation completed", {
      todayRevenue,
      revenueAchievement,
      currentFoodCostPct,
      currentBeverageCostPct,
      alertsCount: alerts.length
    });

    return {
      lastUpdated: new Date(),
      outletName,
      currentPeriodKPIs: {
        todayRevenue,
        revenueTarget: todayBudgetRevenue,
        revenueAchievement,
        revenueVariance,
        currentFoodCostPct,
        targetFoodCostPct,
        currentBeverageCostPct,
        targetBeverageCostPct,
        profitMargin,
        foodRevenuePercentage,
        costEfficiencyRatio,
        foodCostVariance,
        beverageCostVariance,
      },
      trendingKPIs,
      alerts,
      monthToDateMetrics: {
        totalRevenue: monthlyRevenue,
        totalCosts: monthlyCosts,
        netProfit: monthlyRevenue - monthlyCosts,
        profitMargin: monthlyRevenue > 0 ? ((monthlyRevenue - monthlyCosts) / monthlyRevenue) * 100 : 0,
        averageDailyRevenue: monthlySummaries.length > 0 ? monthlyRevenue / monthlySummaries.length : 0,
        averageDailyCosts: monthlySummaries.length > 0 ? monthlyCosts / monthlySummaries.length : 0,
        revenueGrowth,
        costTrend,
      },
    };
  } catch (error) {
    console.error("Error generating real-time KPI dashboard:", error);
    throw new Error("Failed to generate real-time KPI dashboard");
  }
}

export async function getForecastingReportAction(
  historicalPeriod: { from: Date; to: Date },
  forecastPeriod: { from: Date; to: Date },
  outletId?: string
): Promise<any> {
  try {
    console.log("Starting Forecasting Report generation", { 
      historicalPeriod, 
      forecastPeriod, 
      outletId 
    });
    
    // Extract dates from the period objects
    const startDate = historicalPeriod.from;
    const endDate = historicalPeriod.to;
    
    // Get historical data for the specified period
    const summaries = await prisma.dailyFinancialSummary.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    if (summaries.length === 0) {
      throw new Error("No historical data found for the specified period");
    }

    // Calculate historical metrics
    const totalRevenue = summaries.reduce((sum, s) => sum + (s.actualFoodRevenue || 0) + (s.actualBeverageRevenue || 0), 0);
    const totalFoodRevenue = summaries.reduce((sum, s) => sum + (s.actualFoodRevenue || 0), 0);
    const totalBeverageRevenue = summaries.reduce((sum, s) => sum + (s.actualBeverageRevenue || 0), 0);
    const totalCosts = summaries.reduce((sum, s) => sum + (s.actualFoodCost || 0) + (s.actualBeverageCost || 0), 0);
    const totalFoodCosts = summaries.reduce((sum, s) => sum + (s.actualFoodCost || 0), 0);
    const totalBeverageCosts = summaries.reduce((sum, s) => sum + (s.actualBeverageCost || 0), 0);

    // Calculate averages
    const averageDailyRevenue = totalRevenue / summaries.length;
    const averageDailyFoodRevenue = totalFoodRevenue / summaries.length;
    const averageDailyBeverageRevenue = totalBeverageRevenue / summaries.length;
    const averageDailyCosts = totalCosts / summaries.length;
    const averageDailyFoodCosts = totalFoodCosts / summaries.length;
    const averageDailyBeverageCosts = totalBeverageCosts / summaries.length;

    // Calculate cost percentages
    const averageFoodCostPct = totalFoodRevenue > 0 ? (totalFoodCosts / totalFoodRevenue) * 100 : 0;
    const averageBeverageCostPct = totalBeverageRevenue > 0 ? (totalBeverageCosts / totalBeverageRevenue) * 100 : 0;
    const costEfficiencyRatio = totalRevenue > 0 ? (totalCosts / totalRevenue) * 100 : 0;

    // Calculate growth trends
    const firstHalf = summaries.slice(0, Math.floor(summaries.length / 2));
    const secondHalf = summaries.slice(Math.floor(summaries.length / 2));
    
    const firstHalfAvg = firstHalf.length > 0 
      ? firstHalf.reduce((sum, s) => sum + (s.actualFoodRevenue || 0) + (s.actualBeverageRevenue || 0), 0) / firstHalf.length 
      : 0;
    const secondHalfAvg = secondHalf.length > 0 
      ? secondHalf.reduce((sum, s) => sum + (s.actualFoodRevenue || 0) + (s.actualBeverageRevenue || 0), 0) / secondHalf.length 
      : 0;
    
    const growthRate = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

    // Calculate volatility for confidence levels
    const dailyRevenues = summaries.map(s => (s.actualFoodRevenue || 0) + (s.actualBeverageRevenue || 0));
    const variance = dailyRevenues.reduce((sum, revenue) => sum + Math.pow(revenue - averageDailyRevenue, 2), 0) / dailyRevenues.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = averageDailyRevenue > 0 ? (standardDeviation / averageDailyRevenue) * 100 : 0;
    
    // Calculate confidence level (lower volatility = higher confidence)
    const baseConfidence = Math.max(60, 95 - coefficientOfVariation);

    // Use the provided forecast period
    const forecastStartDate = forecastPeriod.from;
    const forecastEndDate = forecastPeriod.to;

    // Apply seasonal adjustment based on day of week patterns
    const dayOfWeekPattern = Array(7).fill(0);
    const dayOfWeekCounts = Array(7).fill(0);
    
    summaries.forEach(s => {
      const dayOfWeek = s.date.getDay();
      const revenue = (s.actualFoodRevenue || 0) + (s.actualBeverageRevenue || 0);
      dayOfWeekPattern[dayOfWeek] += revenue;
      dayOfWeekCounts[dayOfWeek]++;
    });

    // Calculate day-of-week multipliers
    const dayOfWeekMultipliers = dayOfWeekPattern.map((total, index) => 
      dayOfWeekCounts[index] > 0 
        ? (total / dayOfWeekCounts[index]) / averageDailyRevenue 
        : 1
    );

    // Calculate the number of days in the forecast period
    const forecastDays = Math.ceil((forecastEndDate.getTime() - forecastStartDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    
    // Generate daily forecasts for the forecast period
    const dailyRevenueForecast = [];
    const dailyCostForecast = [];
    
    for (let i = 0; i < forecastDays; i++) {
      const forecastDate = new Date(forecastStartDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dayOfWeek = forecastDate.getDay();
      const seasonalMultiplier = dayOfWeekMultipliers[dayOfWeek] || 1;
      
      // Apply growth trend and seasonal adjustment
      const trendMultiplier = 1 + (growthRate / 100) * (i / forecastDays);
      const predictedRevenue = averageDailyRevenue * seasonalMultiplier * trendMultiplier;
      const predictedFoodRevenue = averageDailyFoodRevenue * seasonalMultiplier * trendMultiplier;
      const predictedBeverageRevenue = averageDailyBeverageRevenue * seasonalMultiplier * trendMultiplier;
      
      // Calculate confidence range (±1 standard deviation)
      const confidenceInterval = {
        lower: Math.max(0, predictedRevenue - standardDeviation),
        upper: predictedRevenue + standardDeviation,
      };

      dailyRevenueForecast.push({
        date: forecastDate,
        predictedRevenue,
        predictedFoodRevenue,
        predictedBeverageRevenue,
        confidenceInterval,
        confidenceLevel: Math.max(60, baseConfidence - (i * 0.5)), // Confidence decreases over time
      });

      // Cost forecasting based on predicted revenue and historical cost percentages
      const predictedFoodCost = predictedFoodRevenue * (averageFoodCostPct / 100);
      const predictedBeverageCost = predictedBeverageRevenue * (averageBeverageCostPct / 100);
      const predictedTotalCost = predictedFoodCost + predictedBeverageCost;

      // Calculate cost confidence interval
      const costConfidenceInterval = {
        lower: Math.max(0, predictedTotalCost * 0.9), // 10% lower bound
        upper: predictedTotalCost * 1.1, // 10% upper bound
      };

      dailyCostForecast.push({
        date: forecastDate,
        predictedTotalCost,
        predictedFoodCost,
        predictedBeverageCost,
        predictedFoodCostPct: averageFoodCostPct,
        predictedBeverageCostPct: averageBeverageCostPct,
        confidenceInterval: costConfidenceInterval,
        confidenceLevel: Math.max(60, baseConfidence - (i * 0.5)),
      });
    }

    // Generate monthly forecasts for next 3 months
    const monthlyForecasts = [];
    for (let i = 0; i < 3; i++) {
      const forecastMonth = new Date(endDate.getFullYear(), endDate.getMonth() + i + 1, 1);
      const daysInMonth = new Date(forecastMonth.getFullYear(), forecastMonth.getMonth() + 1, 0).getDate();
      
      // Calculate monthly totals
      const monthlyRevenue = averageDailyRevenue * daysInMonth * (1 + (growthRate / 100));
      const monthlyCosts = averageDailyCosts * daysInMonth * (1 + (growthRate / 100));
      const monthlyProfit = monthlyRevenue - monthlyCosts;
      
      // Calculate seasonal factor (simplified - could be enhanced with historical data)
      const seasonalFactor = 1.0 + (Math.sin((forecastMonth.getMonth() / 12) * 2 * Math.PI) * 0.1);
      
      // Calculate confidence interval for monthly forecast
      const monthlyConfidenceInterval = {
        lower: Math.max(0, monthlyRevenue * 0.85), // 15% lower bound
        upper: monthlyRevenue * 1.15, // 15% upper bound
      };
      
      monthlyForecasts.push({
        month: forecastMonth, // Date object as expected by UI
        predictedRevenue: monthlyRevenue,
        seasonalFactor,
        confidenceInterval: monthlyConfidenceInterval,
        forecastRevenue: monthlyRevenue, // Keep for backward compatibility
        forecastCosts: monthlyCosts,
        forecastProfit: monthlyProfit,
        confidenceLevel: Math.max(65, baseConfidence - (i * 5)),
      });
    }

    // Generate insights and recommendations
    const riskFactors = [];
    const opportunities = [];
    const recommendations = [];

    if (coefficientOfVariation > 30) {
      riskFactors.push("High revenue volatility detected - consider stabilizing factors");
    }
    if (averageFoodCostPct > 35) {
      riskFactors.push("Food cost percentage is above industry average");
    }
    if (averageBeverageCostPct > 25) {
      riskFactors.push("Beverage cost percentage is above optimal range");
    }
    if (growthRate < 0) {
      riskFactors.push("Negative growth trend detected in historical data");
    }

    if (growthRate > 5) {
      opportunities.push("Strong positive growth trend - consider expansion strategies");
    }
    if (averageFoodCostPct < 30) {
      opportunities.push("Good food cost control - maintain current practices");
    }
    if (averageBeverageCostPct < 20) {
      opportunities.push("Excellent beverage cost management");
    }

    if (riskFactors.length > 0) {
      recommendations.push("Implement cost control measures to reduce identified risk factors");
    }
    if (coefficientOfVariation > 20) {
      recommendations.push("Develop strategies to reduce revenue volatility");
    }
    recommendations.push("Monitor daily performance against forecasted values");
    recommendations.push("Review and adjust forecasts monthly based on actual performance");

    const outletName = outletId ? `Outlet ${outletId}` : 'All Outlets';

    console.log("Forecasting Report calculation completed", {
      historicalDays: summaries.length,
      averageDailyRevenue,
      growthRate,
      baseConfidence,
      forecastDays: dailyRevenueForecast.length
    });

    return {
      dateRange: { from: startDate, to: endDate },
      forecastPeriod: { from: forecastStartDate, to: forecastEndDate },
      outletName,
      
      // Historical analysis
      historicalAnalysis: {
        totalRevenue,
        totalCosts,
        averageDailyRevenue,
        averageDailyCosts,
        growthRate,
        volatility: coefficientOfVariation,
        dataPoints: summaries.length,
      },

      // Revenue forecasting
      revenueForecast: {
        daily: dailyRevenueForecast,
        monthly: monthlyForecasts,
        methodology: "Trend Analysis with Seasonal Adjustment",
        confidenceLevel: baseConfidence,
      },

      // Cost forecasting
      costForecast: {
        daily: dailyCostForecast,
        predictedFoodCostPct: averageFoodCostPct,
        predictedBeverageCostPct: averageBeverageCostPct,
        costEfficiencyRatio,
        confidenceLevel: baseConfidence,
      },

      // Key insights
      insights: {
        expectedGrowth: growthRate,
        riskFactors,
        opportunities,
        recommendations,
        keyMetrics: {
          revenueVolatility: coefficientOfVariation,
          costStability: costEfficiencyRatio,
          forecastAccuracy: baseConfidence,
        },
      },

      // Methodology information
      methodology: {
        model: 'Advanced Trend Analysis with Seasonal Patterns',
        dataPoints: summaries.length,
        accuracy: baseConfidence,
        lastUpdated: new Date(),
        techniques: [
          'Historical trend analysis',
          'Day-of-week seasonal adjustment',
          'Volatility-based confidence intervals',
          'Growth trend projection'
        ],
      },

      // Forecast assumptions
      assumptions: [
        `Based on ${summaries.length} days of historical data`,
        `Historical growth rate of ${growthRate.toFixed(1)}% is assumed to continue`,
        `Day-of-week seasonal patterns from historical data are maintained`,
        `Cost percentages remain stable at current levels (Food: ${averageFoodCostPct.toFixed(1)}%, Beverage: ${averageBeverageCostPct.toFixed(1)}%)`,
        `No major external factors or market disruptions are anticipated`,
        `Revenue volatility remains within historical range (${coefficientOfVariation.toFixed(1)}% coefficient of variation)`,
        `Seasonal adjustments based on historical day-of-week performance patterns`,
        `Confidence levels calculated using statistical volatility measures`,
        summaries.length < 30 ? 'Limited historical data may affect forecast accuracy' : 'Sufficient historical data provides reliable baseline for forecasting'
      ],

      // Top-level properties expected by UI
      riskFactors,
      recommendations,
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error generating forecasting report:", error);
      throw new Error(`Failed to generate forecasting report: ${error.message}`);
    } else {
      console.error("Error generating forecasting report:", error);
      throw new Error("Failed to generate forecasting report: Unknown error");
    }
  }
}

export async function getYearOverYearReportAction(
  currentYear: number,
  previousYear: number
): Promise<any> {
  try {
    console.log("Starting Year-over-Year report generation", { 
      currentYear, 
      previousYear,
      currentYearType: typeof currentYear,
      previousYearType: typeof previousYear 
    });
    
    // Convert to numbers and provide default for previous year if undefined
    const currentYearNum = Number(currentYear);
    const previousYearNum = previousYear !== undefined ? Number(previousYear) : currentYearNum - 1;
    
    console.log("After conversion and defaults:", {
      currentYearNum,
      previousYearNum,
      originalPreviousYear: previousYear
    });
    
    if (isNaN(currentYearNum) || isNaN(previousYearNum) || currentYearNum <= 1900 || previousYearNum <= 1900 || currentYearNum > 2100 || previousYearNum > 2100) {
      console.error("Invalid year parameters:", { 
        currentYear, 
        previousYear, 
        currentYearNum, 
        previousYearNum,
        currentYearType: typeof currentYear,
        previousYearType: typeof previousYear
      });
      throw new Error(`Invalid year parameters: currentYear=${currentYear}, previousYear=${previousYear}`);
    }
    
    // Use the validated numbers
    const validCurrentYear = currentYearNum;
    const validPreviousYear = previousYearNum;
    
    console.log("Using years:", { validCurrentYear, validPreviousYear });

    console.log("Creating date ranges...");
    // Get data for both years using validated numbers
    const currentYearStart = startOfYear(new Date(validCurrentYear, 0));
    const currentYearEnd = endOfYear(new Date(validCurrentYear, 0));
    const previousYearStart = startOfYear(new Date(validPreviousYear, 0));
    const previousYearEnd = endOfYear(new Date(validPreviousYear, 0));
    
    console.log("Date ranges created:", {
      currentYearStart,
      currentYearEnd,
      previousYearStart,
      previousYearEnd
    });

    console.log("Fetching financial summaries...");
    const [currentYearSummaries, previousYearSummaries] = await Promise.all([
      prisma.dailyFinancialSummary.findMany({
        where: {
          date: {
            gte: currentYearStart,
            lte: currentYearEnd,
          },
        },
      }),
      prisma.dailyFinancialSummary.findMany({
        where: {
          date: {
            gte: previousYearStart,
            lte: previousYearEnd,
          },
        },
      }),
    ]);
    
    console.log("Financial summaries fetched:", {
      currentYearCount: currentYearSummaries?.length || 0,
      previousYearCount: previousYearSummaries?.length || 0
    });

    // Validate that we have summaries arrays
    if (!Array.isArray(currentYearSummaries) || !Array.isArray(previousYearSummaries)) {
      console.error("Invalid summaries arrays:", {
        currentYearSummaries: typeof currentYearSummaries,
        previousYearSummaries: typeof previousYearSummaries
      });
      throw new Error("Failed to retrieve financial summaries");
    }

    console.log("Calculating basic metrics...");
    
    // Simple calculation with better error handling
    let currentTotalRevenue = 0;
    let currentTotalFoodRevenue = 0;
    let currentTotalBeverageRevenue = 0;
    let currentTotalCosts = 0;
    
    try {
      currentTotalRevenue = currentYearSummaries.reduce((sum, s) => {
        if (!s) return sum;
        const foodRev = Number(s.actualFoodRevenue) || 0;
        const bevRev = Number(s.actualBeverageRevenue) || 0;
        return sum + foodRev + bevRev;
      }, 0);
      
      currentTotalFoodRevenue = currentYearSummaries.reduce((sum, s) => {
        return sum + (Number(s?.actualFoodRevenue) || 0);
      }, 0);
      
      currentTotalBeverageRevenue = currentYearSummaries.reduce((sum, s) => {
        return sum + (Number(s?.actualBeverageRevenue) || 0);
      }, 0);
      
      currentTotalCosts = currentYearSummaries.reduce((sum, s) => {
        if (!s) return sum;
        const foodCost = Number(s.actualFoodCost) || 0;
        const bevCost = Number(s.actualBeverageCost) || 0;
        return sum + foodCost + bevCost;
      }, 0);
      
      console.log("Current year calculations completed:", {
        currentTotalRevenue,
        currentTotalFoodRevenue,
        currentTotalBeverageRevenue,
        currentTotalCosts
      });
    } catch (err) {
      console.error("Error in current year calculations:", err);
      throw new Error("Failed to calculate current year metrics");
    }

    // Calculate metrics for previous year
    let previousTotalRevenue = 0;
    let previousTotalFoodRevenue = 0;
    let previousTotalBeverageRevenue = 0;
    let previousTotalCosts = 0;
    
    try {
      previousTotalRevenue = previousYearSummaries.reduce((sum, s) => {
        if (!s) return sum;
        const foodRev = Number(s.actualFoodRevenue) || 0;
        const bevRev = Number(s.actualBeverageRevenue) || 0;
        return sum + foodRev + bevRev;
      }, 0);
      
      previousTotalFoodRevenue = previousYearSummaries.reduce((sum, s) => {
        return sum + (Number(s?.actualFoodRevenue) || 0);
      }, 0);
      
      previousTotalBeverageRevenue = previousYearSummaries.reduce((sum, s) => {
        return sum + (Number(s?.actualBeverageRevenue) || 0);
      }, 0);
      
      previousTotalCosts = previousYearSummaries.reduce((sum, s) => {
        if (!s) return sum;
        const foodCost = Number(s.actualFoodCost) || 0;
        const bevCost = Number(s.actualBeverageCost) || 0;
        return sum + foodCost + bevCost;
      }, 0);
      
      console.log("Previous year calculations completed:", {
        previousTotalRevenue,
        previousTotalFoodRevenue,
        previousTotalBeverageRevenue,
        previousTotalCosts
      });
    } catch (err) {
      console.error("Error in previous year calculations:", err);
      throw new Error("Failed to calculate previous year metrics");
    }

    console.log("Calculating growth metrics...");
    
    // Calculate growth metrics with safety checks
    const revenueGrowth = previousTotalRevenue > 0 ? ((currentTotalRevenue - previousTotalRevenue) / previousTotalRevenue) * 100 : 0;
    const foodRevenueGrowth = previousTotalFoodRevenue > 0 ? ((currentTotalFoodRevenue - previousTotalFoodRevenue) / previousTotalFoodRevenue) * 100 : 0;
    const beverageRevenueGrowth = previousTotalBeverageRevenue > 0 ? ((currentTotalBeverageRevenue - previousTotalBeverageRevenue) / previousTotalBeverageRevenue) * 100 : 0;
    const costGrowth = previousTotalCosts > 0 ? ((currentTotalCosts - previousTotalCosts) / previousTotalCosts) * 100 : 0;

    // Calculate margin improvement
    const currentMargin = currentTotalRevenue > 0 ? ((currentTotalRevenue - currentTotalCosts) / currentTotalRevenue) * 100 : 0;
    const previousMargin = previousTotalRevenue > 0 ? ((previousTotalRevenue - previousTotalCosts) / previousTotalRevenue) * 100 : 0;
    const marginImprovement = currentMargin - previousMargin;
    
    console.log("Growth metrics calculated:", {
      revenueGrowth,
      foodRevenueGrowth,
      beverageRevenueGrowth,
      costGrowth,
      marginImprovement
    });

    console.log("Implementing complex monthly analysis...");
    
    // Advanced Monthly Data Processing
    const currentMonthlyData = new Map<number, {
      revenue: number;
      foodRevenue: number;
      beverageRevenue: number;
      costs: number;
      foodCosts: number;
      beverageCosts: number;
      profit: number;
      margin: number;
      daysWithData: number;
    }>();
    
    const previousMonthlyData = new Map<number, {
      revenue: number;
      foodRevenue: number;
      beverageRevenue: number;
      costs: number;
      foodCosts: number;
      beverageCosts: number;
      profit: number;
      margin: number;
      daysWithData: number;
    }>();

    console.log("Processing current year monthly data...");
    // Process current year data with enhanced metrics
    currentYearSummaries.forEach(summary => {
      if (!summary || !summary.date) return;
      try {
        const month = summary.date.getMonth();
        if (!currentMonthlyData.has(month)) {
          currentMonthlyData.set(month, {
            revenue: 0,
            foodRevenue: 0,
            beverageRevenue: 0,
            costs: 0,
            foodCosts: 0,
            beverageCosts: 0,
            profit: 0,
            margin: 0,
            daysWithData: 0
          });
        }
        const monthData = currentMonthlyData.get(month)!;
        const dayRevenue = (summary.actualFoodRevenue || 0) + (summary.actualBeverageRevenue || 0);
        const dayCosts = (summary.actualFoodCost || 0) + (summary.actualBeverageCost || 0);
        
        monthData.revenue += dayRevenue;
        monthData.foodRevenue += summary.actualFoodRevenue || 0;
        monthData.beverageRevenue += summary.actualBeverageRevenue || 0;
        monthData.costs += dayCosts;
        monthData.foodCosts += summary.actualFoodCost || 0;
        monthData.beverageCosts += summary.actualBeverageCost || 0;
        monthData.profit += dayRevenue - dayCosts;
        monthData.daysWithData += 1;
        monthData.margin = monthData.revenue > 0 ? (monthData.profit / monthData.revenue) * 100 : 0;
      } catch (err) {
        console.warn("Error processing current year summary:", err);
      }
    });

    console.log("Processing previous year monthly data...");
    // Process previous year data with enhanced metrics
    previousYearSummaries.forEach(summary => {
      if (!summary || !summary.date) return;
      try {
        const month = summary.date.getMonth();
        if (!previousMonthlyData.has(month)) {
          previousMonthlyData.set(month, {
            revenue: 0,
            foodRevenue: 0,
            beverageRevenue: 0,
            costs: 0,
            foodCosts: 0,
            beverageCosts: 0,
            profit: 0,
            margin: 0,
            daysWithData: 0
          });
        }
        const monthData = previousMonthlyData.get(month)!;
        const dayRevenue = (summary.actualFoodRevenue || 0) + (summary.actualBeverageRevenue || 0);
        const dayCosts = (summary.actualFoodCost || 0) + (summary.actualBeverageCost || 0);
        
        monthData.revenue += dayRevenue;
        monthData.foodRevenue += summary.actualFoodRevenue || 0;
        monthData.beverageRevenue += summary.actualBeverageRevenue || 0;
        monthData.costs += dayCosts;
        monthData.foodCosts += summary.actualFoodCost || 0;
        monthData.beverageCosts += summary.actualBeverageCost || 0;
        monthData.profit += dayRevenue - dayCosts;
        monthData.daysWithData += 1;
        monthData.margin = monthData.revenue > 0 ? (monthData.profit / monthData.revenue) * 100 : 0;
      } catch (err) {
        console.warn("Error processing previous year summary:", err);
      }
    });

    console.log("Creating detailed monthly comparison...");
    // Create comprehensive monthly comparison
    const monthlyComparison = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    try {
      for (let month = 0; month < 12; month++) {
        const currentData = currentMonthlyData.get(month) || { 
          revenue: 0, foodRevenue: 0, beverageRevenue: 0, costs: 0, 
          foodCosts: 0, beverageCosts: 0, profit: 0, margin: 0, daysWithData: 0 
        };
        const previousData = previousMonthlyData.get(month) || { 
          revenue: 0, foodRevenue: 0, beverageRevenue: 0, costs: 0, 
          foodCosts: 0, beverageCosts: 0, profit: 0, margin: 0, daysWithData: 0 
        };
        
        // Calculate various growth metrics
        const revenueGrowth = previousData.revenue > 0 ? ((currentData.revenue - previousData.revenue) / previousData.revenue) * 100 : 0;
        const profitGrowth = previousData.profit > 0 ? ((currentData.profit - previousData.profit) / Math.abs(previousData.profit)) * 100 : 0;
        const marginChange = currentData.margin - previousData.margin;
        const foodGrowth = previousData.foodRevenue > 0 ? ((currentData.foodRevenue - previousData.foodRevenue) / previousData.foodRevenue) * 100 : 0;
        const beverageGrowth = previousData.beverageRevenue > 0 ? ((currentData.beverageRevenue - previousData.beverageRevenue) / previousData.beverageRevenue) * 100 : 0;
        
        // Calculate efficiency metrics
        const currentEfficiency = currentData.revenue > 0 ? currentData.profit / currentData.revenue : 0;
        const previousEfficiency = previousData.revenue > 0 ? previousData.profit / previousData.revenue : 0;
        const efficiencyImprovement = currentEfficiency - previousEfficiency;
        
        // Determine performance category based on growth
        let performance = 'stable';
        if (revenueGrowth > 10) {
          performance = 'excellent';
        } else if (revenueGrowth > 5) {
          performance = 'good';
        } else if (revenueGrowth > 0) {
          performance = 'moderate';
        } else if (revenueGrowth > -5) {
          performance = 'declining';
        } else {
          performance = 'poor';
        }

        monthlyComparison.push({
          month: month + 1, // UI expects 1-based month index
          monthName: monthNames[month],
          monthIndex: month,
          
          // UI expected properties
          previousYearRevenue: Math.round(previousData.revenue),
          currentYearRevenue: Math.round(currentData.revenue),
          growth: Number(revenueGrowth.toFixed(2)),
          performance: performance,
          
          // Additional detailed properties
          currentRevenue: Math.round(currentData.revenue),
          previousRevenue: Math.round(previousData.revenue),
          currentFoodRevenue: Math.round(currentData.foodRevenue),
          previousFoodRevenue: Math.round(previousData.foodRevenue),
          currentBeverageRevenue: Math.round(currentData.beverageRevenue),
          previousBeverageRevenue: Math.round(previousData.beverageRevenue),
          currentCosts: Math.round(currentData.costs),
          previousCosts: Math.round(previousData.costs),
          currentProfit: Math.round(currentData.profit),
          previousProfit: Math.round(previousData.profit),
          currentMargin: Number(currentData.margin.toFixed(2)),
          previousMargin: Number(previousData.margin.toFixed(2)),
          revenueGrowth: Number(revenueGrowth.toFixed(2)),
          profitGrowth: Number(profitGrowth.toFixed(2)),
          marginChange: Number(marginChange.toFixed(2)),
          foodGrowth: Number(foodGrowth.toFixed(2)),
          beverageGrowth: Number(beverageGrowth.toFixed(2)),
          efficiencyImprovement: Number((efficiencyImprovement * 100).toFixed(2)),
          revenueChange: Math.round(currentData.revenue - previousData.revenue),
          costChange: Math.round(currentData.costs - previousData.costs),
          profitChange: Math.round(currentData.profit - previousData.profit),
          currentDaysWithData: currentData.daysWithData,
          previousDaysWithData: previousData.daysWithData,
          avgDailyRevenue: currentData.daysWithData > 0 ? Math.round(currentData.revenue / currentData.daysWithData) : 0,
          avgDailyProfit: currentData.daysWithData > 0 ? Math.round(currentData.profit / currentData.daysWithData) : 0,
        });
      }
    } catch (err) {
      console.warn("Error creating monthly comparison:", err);
    }

    console.log("Analyzing performance patterns...");
    // Advanced Performance Analysis
    const performanceMetrics = {
      // Growth consistency analysis
      revenueVolatility: 0,
      profitVolatility: 0,
      bestGrowthMonth: '',
      worstGrowthMonth: '',
      
      // Seasonal analysis
      q1Performance: 0, // Jan-Mar
      q2Performance: 0, // Apr-Jun  
      q3Performance: 0, // Jul-Sep
      q4Performance: 0, // Oct-Dec
      
      // Efficiency metrics
      avgEfficiencyImprovement: 0,
      consistentGrowthMonths: 0,
      decliningMonths: 0,
      
      // Business insights
      strongestCategory: '',
      weakestCategory: '',
      avgMonthlyGrowth: 0,
      peakSeasonMonths: [] as string[],
      lowSeasonMonths: [] as string[],
    };

    try {
      // Calculate volatility (coefficient of variation)
      const revenueGrowths = monthlyComparison.filter(m => m.currentYearRevenue > 0).map(m => m.growth);
      const profitGrowths = monthlyComparison.filter(m => m.currentProfit !== 0).map(m => m.profitGrowth);
      
      if (revenueGrowths.length > 0) {
        const avgRevenueGrowth = revenueGrowths.reduce((sum, val) => sum + val, 0) / revenueGrowths.length;
        const revenueVariance = revenueGrowths.reduce((sum, val) => sum + Math.pow(val - avgRevenueGrowth, 2), 0) / revenueGrowths.length;
        performanceMetrics.revenueVolatility = Math.sqrt(revenueVariance);
        performanceMetrics.avgMonthlyGrowth = avgRevenueGrowth;
      }
      
      if (profitGrowths.length > 0) {
        const avgProfitGrowth = profitGrowths.reduce((sum, val) => sum + val, 0) / profitGrowths.length;
        const profitVariance = profitGrowths.reduce((sum, val) => sum + Math.pow(val - avgProfitGrowth, 2), 0) / profitGrowths.length;
        performanceMetrics.profitVolatility = Math.sqrt(profitVariance);
      }

      // Find best and worst performing months
      const sortedByGrowth = [...monthlyComparison].sort((a, b) => b.revenueGrowth - a.revenueGrowth);
      performanceMetrics.bestGrowthMonth = typeof sortedByGrowth[0]?.monthName === 'string' ? sortedByGrowth[0].monthName : 'N/A';
      performanceMetrics.worstGrowthMonth = typeof sortedByGrowth[sortedByGrowth.length - 1]?.monthName === 'string'
        ? sortedByGrowth[sortedByGrowth.length - 1].monthName
        : 'N/A';

      // Quarterly performance analysis
      const q1Months = monthlyComparison.slice(0, 3);
      const q2Months = monthlyComparison.slice(3, 6);
      const q3Months = monthlyComparison.slice(6, 9);
      const q4Months = monthlyComparison.slice(9, 12);

      performanceMetrics.q1Performance = q1Months.reduce((sum, m) => sum + m.growth, 0) / 3;
      performanceMetrics.q2Performance = q2Months.reduce((sum, m) => sum + m.growth, 0) / 3;
      performanceMetrics.q3Performance = q3Months.reduce((sum, m) => sum + m.growth, 0) / 3;
      performanceMetrics.q4Performance = q4Months.reduce((sum, m) => sum + m.growth, 0) / 3;

      // Count consistent growth and declining months
      performanceMetrics.consistentGrowthMonths = monthlyComparison.filter(m => m.growth > 0).length;
      performanceMetrics.decliningMonths = monthlyComparison.filter(m => m.growth < 0).length;

      // Efficiency improvement
      performanceMetrics.avgEfficiencyImprovement = monthlyComparison.reduce((sum, m) => sum + m.efficiencyImprovement, 0) / 12;

      // Category performance analysis
      const avgFoodGrowth = monthlyComparison.reduce((sum, m) => sum + m.foodGrowth, 0) / 12;
      const avgBeverageGrowth = monthlyComparison.reduce((sum, m) => sum + m.beverageGrowth, 0) / 12;
      performanceMetrics.strongestCategory = avgFoodGrowth > avgBeverageGrowth ? 'Food' : 'Beverage';
      performanceMetrics.weakestCategory = avgFoodGrowth < avgBeverageGrowth ? 'Food' : 'Beverage';

      // Peak and low season identification
      const avgGrowth = monthlyComparison.reduce((sum, m) => sum + m.growth, 0) / 12;
      performanceMetrics.peakSeasonMonths = monthlyComparison
        .filter(m => m.growth > avgGrowth + 5)
        .map(m => m.monthName);
      performanceMetrics.lowSeasonMonths = monthlyComparison
        .filter(m => m.growth < avgGrowth - 5)
        .map(m => m.monthName);

    } catch (err) {
      console.warn("Error in performance analysis:", err);
    }

    console.log("Generating intelligent insights and recommendations...");
    // Advanced Insights and Recommendations Engine
    const insights = {
      strongestMonths: [] as string[],
      weakestMonths: [] as string[],
      seasonalTrends: [] as string[],
      recommendations: [] as string[],
      keyFindings: [] as string[],
      riskFactors: [] as string[],
      opportunities: [] as string[],
      operationalInsights: [] as string[],
    };

    try {
      // Identify strongest and weakest months
      const sortedByGrowth = [...monthlyComparison]
        .filter(m => m.currentYearRevenue > 0)
        .sort((a, b) => b.growth - a.growth);
      
      insights.strongestMonths = sortedByGrowth.slice(0, 3).map(m => m.monthName);
      insights.weakestMonths = sortedByGrowth.slice(-3).map(m => m.monthName).reverse();

      // Seasonal trend analysis
      if (performanceMetrics.q4Performance > performanceMetrics.q1Performance + 10) {
        insights.seasonalTrends.push("Strong Q4 performance - capitalize on holiday season momentum");
      }
      if (performanceMetrics.q2Performance > performanceMetrics.q3Performance + 5) {
        insights.seasonalTrends.push("Q2 outperforms Q3 - consider summer strategy adjustments");
      }
      if (performanceMetrics.peakSeasonMonths.length > 0) {
        insights.seasonalTrends.push(`Peak season identified: ${performanceMetrics.peakSeasonMonths.join(', ')}`);
      }

      // Key findings generation
      if (revenueGrowth > 10) {
        insights.keyFindings.push(`Excellent revenue growth of ${revenueGrowth.toFixed(1)}% year-over-year`);
      } else if (revenueGrowth > 0) {
        insights.keyFindings.push(`Positive revenue growth of ${revenueGrowth.toFixed(1)}% maintained`);
      } else {
        insights.keyFindings.push(`Revenue declined by ${Math.abs(revenueGrowth).toFixed(1)}% - immediate attention required`);
      }

      if (marginImprovement > 2) {
        insights.keyFindings.push(`Profit margins improved by ${marginImprovement.toFixed(1)} percentage points`);
      } else if (marginImprovement < -2) {
        insights.keyFindings.push(`Profit margins declined by ${Math.abs(marginImprovement).toFixed(1)} percentage points`);
      }

      if (performanceMetrics.consistentGrowthMonths >= 8) {
        insights.keyFindings.push(`Strong consistency with ${performanceMetrics.consistentGrowthMonths} months of growth`);
      }

      // Risk factor identification
      if (performanceMetrics.revenueVolatility > 15) {
        insights.riskFactors.push("High revenue volatility detected - indicates unstable performance");
      }
      if (performanceMetrics.decliningMonths > 6) {
        insights.riskFactors.push(`${performanceMetrics.decliningMonths} months showed declining revenue`);
      }
      if (costGrowth > revenueGrowth + 5) {
        insights.riskFactors.push("Cost growth significantly exceeds revenue growth");
      }
      if (marginImprovement < -3) {
        insights.riskFactors.push("Significant profit margin erosion detected");
      }

      // Opportunity identification
      if (performanceMetrics.strongestCategory === 'Beverage' && beverageRevenueGrowth > foodRevenueGrowth + 10) {
        insights.opportunities.push("Beverage category shows strong growth - consider expanding beverage offerings");
      }
      if (performanceMetrics.avgEfficiencyImprovement > 0) {
        insights.opportunities.push("Operational efficiency is improving - build on this momentum");
      }
      if (performanceMetrics.peakSeasonMonths.length > 0) {
        insights.opportunities.push(`Leverage peak months (${performanceMetrics.peakSeasonMonths.join(', ')}) for maximum impact`);
      }
      if (performanceMetrics.q4Performance > 15) {
        insights.opportunities.push("Strong Q4 performance suggests effective holiday strategies");
      }

      // Operational insights
      const avgDailyRevenueGrowth = monthlyComparison.reduce((sum, m) => {
        return sum + (m.avgDailyRevenue - (m.previousRevenue / m.previousDaysWithData || 0));
      }, 0) / 12;
      
      if (avgDailyRevenueGrowth > 100) {
        insights.operationalInsights.push("Daily revenue averages are improving significantly");
      }

      // Strategic recommendations based on data patterns
      if (revenueGrowth < 0) {
        insights.recommendations.push("URGENT: Implement revenue recovery strategy - analyze pricing, menu, and market positioning");
      }
      if (costGrowth > revenueGrowth + 3) {
        insights.recommendations.push("Cost optimization required - review supplier contracts and operational efficiency");
      }
      if (marginImprovement < -1) {
        insights.recommendations.push("Focus on margin improvement - analyze portion control and waste reduction");
      }
      if (performanceMetrics.revenueVolatility > 20) {
        insights.recommendations.push("Implement strategies to stabilize revenue - diversify offerings and improve forecasting");
      }
      if (foodRevenueGrowth < beverageRevenueGrowth - 10) {
        insights.recommendations.push("Food category underperforming - review menu appeal and kitchen efficiency");
      }
      if (beverageRevenueGrowth < foodRevenueGrowth - 10) {
        insights.recommendations.push("Beverage category underperforming - enhance beverage menu and staff training");
      }
      if (performanceMetrics.lowSeasonMonths.length > 4) {
        insights.recommendations.push(`Address low season performance in ${performanceMetrics.lowSeasonMonths.join(', ')} - develop targeted promotions`);
      }
      if (performanceMetrics.avgEfficiencyImprovement > 2) {
        insights.recommendations.push("Efficiency improvements are working - scale successful practices across all operations");
      }
      if (revenueGrowth > 0 && marginImprovement > 0) {
        insights.recommendations.push("Strong performance foundation - consider expansion or new revenue streams");
      }

      // Add positive reinforcement recommendations
      if (insights.recommendations.length === 0 || revenueGrowth > 15) {
        insights.recommendations.push("Excellent performance trajectory - maintain current strategies and monitor for optimization opportunities");
      }

    } catch (err) {
      console.warn("Error generating insights:", err);
    }

    // Calculate enhanced profit growth
    const enhancedProfitGrowth = Math.abs(previousTotalRevenue - previousTotalCosts) > 0 
      ? ((currentTotalRevenue - currentTotalCosts) - (previousTotalRevenue - previousTotalCosts)) / Math.abs(previousTotalRevenue - previousTotalCosts) * 100 
      : 0;

    console.log("Preparing comprehensive return data...");
    
    return {
      currentYearData: {
        year: validCurrentYear,
        totalRevenue: currentTotalRevenue || 0,
        totalFoodRevenue: currentTotalFoodRevenue || 0,
        totalBeverageRevenue: currentTotalBeverageRevenue || 0,
        totalCosts: currentTotalCosts || 0,
        netProfit: (currentTotalRevenue || 0) - (currentTotalCosts || 0),
        avgMonthlyRevenue: (currentTotalRevenue || 0) / 12,
        profitMargin: currentMargin || 0,
        dataQuality: {
          totalDataPoints: currentYearSummaries.length,
          monthsWithData: Array.from(currentMonthlyData.keys()).length,
        }
      },
      previousYearData: {
        year: validPreviousYear,
        totalRevenue: previousTotalRevenue || 0,
        totalFoodRevenue: previousTotalFoodRevenue || 0,
        totalBeverageRevenue: previousTotalBeverageRevenue || 0,
        totalCosts: previousTotalCosts || 0,
        netProfit: (previousTotalRevenue || 0) - (previousTotalCosts || 0),
        avgMonthlyRevenue: (previousTotalRevenue || 0) / 12,
        profitMargin: previousMargin || 0,
        dataQuality: {
          totalDataPoints: previousYearSummaries.length,
          monthsWithData: Array.from(previousMonthlyData.keys()).length,
        }
      },
      growthMetrics: {
        revenueGrowth: Number(revenueGrowth.toFixed(2)) || 0,
        foodRevenueGrowth: Number(foodRevenueGrowth.toFixed(2)) || 0,
        beverageRevenueGrowth: Number(beverageRevenueGrowth.toFixed(2)) || 0,
        costGrowth: Number(costGrowth.toFixed(2)) || 0,
        profitGrowth: Number(enhancedProfitGrowth.toFixed(2)) || 0,
        marginImprovement: Number(marginImprovement.toFixed(2)) || 0,
        volatilityMetrics: {
          revenueVolatility: Number(performanceMetrics.revenueVolatility.toFixed(2)),
          profitVolatility: Number(performanceMetrics.profitVolatility.toFixed(2)),
        }
      },
      monthlyComparison,
      performanceAnalysis: {
        quarterlyPerformance: {
          q1: Number(performanceMetrics.q1Performance.toFixed(2)),
          q2: Number(performanceMetrics.q2Performance.toFixed(2)),
          q3: Number(performanceMetrics.q3Performance.toFixed(2)),
          q4: Number(performanceMetrics.q4Performance.toFixed(2)),
        },
        bestPerformingMonth: performanceMetrics.bestGrowthMonth,
        worstPerformingMonth: performanceMetrics.worstGrowthMonth,
        consistentGrowthMonths: performanceMetrics.consistentGrowthMonths,
        decliningMonths: performanceMetrics.decliningMonths,
        avgMonthlyGrowth: Number(performanceMetrics.avgMonthlyGrowth.toFixed(2)),
        categoryPerformance: {
          strongest: performanceMetrics.strongestCategory,
          weakest: performanceMetrics.weakestCategory,
        },
        seasonalAnalysis: {
          peakMonths: performanceMetrics.peakSeasonMonths,
          lowMonths: performanceMetrics.lowSeasonMonths,
        }
      },
      insights,
    };
  } catch (error) {
    console.error("Error generating year over year report:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      currentYear,
      previousYear
    });
    throw new Error(`Failed to generate year over year report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}