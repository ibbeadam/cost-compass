"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { startOfDay, endOfDay } from "date-fns";

export interface PropertyPerformanceData {
  propertyId: number;
  propertyName: string;
  propertyCode: string;
  propertyType: string;
  outletCount: number;
  
  // Revenue Metrics
  totalFoodRevenue: number;
  totalBeverageRevenue: number;
  totalRevenue: number;
  avgDailyRevenue: number;
  
  // Cost Metrics
  totalFoodCost: number;
  totalBeverageCost: number;
  totalCost: number;
  avgDailyCost: number;
  
  // Percentage Metrics
  avgFoodCostPct: number;
  avgBeverageCostPct: number;
  avgTotalCostPct: number;
  
  // Budget vs Actual
  budgetFoodCostPct: number;
  budgetBeverageCostPct: number;
  foodVariancePct: number;
  beverageVariancePct: number;
  
  // Performance Indicators
  profitMargin: number;
  revenuePerOutlet: number;
  costPerOutlet: number;
  efficiency: number; // Revenue to cost ratio
  
  // Trend Data (last 30 days vs previous 30 days)
  revenueGrowth: number;
  costGrowth: number;
  profitGrowth: number;
}

export interface PropertyPerformanceComparisonReport {
  dateRange: {
    from: Date;
    to: Date;
  };
  reportTitle: string;
  propertyData: PropertyPerformanceData[];
  overallSummary: {
    totalProperties: number;
    totalOutlets: number;
    totalRevenue: number;
    totalCost: number;
    avgProfitMargin: number;
    bestPerformingProperty: {
      name: string;
      metric: string;
      value: number;
    };
    worstPerformingProperty: {
      name: string;
      metric: string;
      value: number;
    };
  };
  rankings: {
    byRevenue: PropertyPerformanceData[];
    byProfitMargin: PropertyPerformanceData[];
    byEfficiency: PropertyPerformanceData[];
    byCostControl: PropertyPerformanceData[];
  };
  propertyInfo?: {
    id: number;
    name: string;
  };
}

export async function getPropertyPerformanceComparisonReportAction(
  startDate: Date,
  endDate: Date,
  propertyId?: string
): Promise<PropertyPerformanceComparisonReport> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    const normalizedStartDate = startOfDay(startDate);
    const normalizedEndDate = endOfDay(endDate);

    // Determine which properties to analyze based on user role and selection
    let propertiesToAnalyze: number[] = [];
    let selectedProperty = null;

    if (user.role === "super_admin") {
      if (propertyId && propertyId !== "all") {
        // Single property analysis for super admin
        propertiesToAnalyze = [parseInt(propertyId)];
        selectedProperty = await prisma.property.findUnique({
          where: { id: parseInt(propertyId) },
          select: { id: true, name: true }
        });
      } else {
        // All properties for super admin
        const allProperties = await prisma.property.findMany({
          where: { isActive: true },
          select: { id: true }
        });
        propertiesToAnalyze = allProperties.map(p => p.id);
      }
    } else {
      // Non-super admin users can only see their accessible properties
      const userPropertyIds = user.propertyAccess?.map(access => access.propertyId) || [];
      if (userPropertyIds.length === 0) {
        throw new Error("No property access found for user");
      }
      propertiesToAnalyze = userPropertyIds;
    }

    if (propertiesToAnalyze.length === 0) {
      throw new Error("No properties found for analysis");
    }

    // Fetch property data for analysis
    const properties = await prisma.property.findMany({
      where: {
        id: { in: propertiesToAnalyze },
        isActive: true
      },
      include: {
        outlets: {
          where: { isActive: true },
          select: { id: true }
        }
      }
    });

    const propertyPerformanceData: PropertyPerformanceData[] = [];

    // Calculate metrics for each property
    for (const property of properties) {
      // Get daily financial summaries for the date range
      const dailySummaries = await prisma.dailyFinancialSummary.findMany({
        where: {
          propertyId: property.id,
          date: {
            gte: normalizedStartDate,
            lte: normalizedEndDate
          }
        }
      });

      if (dailySummaries.length === 0) {
        // Include property with zero data
        propertyPerformanceData.push({
          propertyId: property.id,
          propertyName: property.name,
          propertyCode: property.propertyCode,
          propertyType: property.propertyType,
          outletCount: property.outlets.length,
          totalFoodRevenue: 0,
          totalBeverageRevenue: 0,
          totalRevenue: 0,
          avgDailyRevenue: 0,
          totalFoodCost: 0,
          totalBeverageCost: 0,
          totalCost: 0,
          avgDailyCost: 0,
          avgFoodCostPct: 0,
          avgBeverageCostPct: 0,
          avgTotalCostPct: 0,
          budgetFoodCostPct: 0,
          budgetBeverageCostPct: 0,
          foodVariancePct: 0,
          beverageVariancePct: 0,
          profitMargin: 0,
          revenuePerOutlet: 0,
          costPerOutlet: 0,
          efficiency: 0,
          revenueGrowth: 0,
          costGrowth: 0,
          profitGrowth: 0
        });
        continue;
      }

      // Calculate totals and averages
      const totalFoodRevenue = dailySummaries.reduce((sum, s) => sum + s.actualFoodRevenue, 0);
      const totalBeverageRevenue = dailySummaries.reduce((sum, s) => sum + s.actualBeverageRevenue, 0);
      const totalRevenue = totalFoodRevenue + totalBeverageRevenue;

      const totalFoodCost = dailySummaries.reduce((sum, s) => sum + (s.actualFoodCost || 0), 0);
      const totalBeverageCost = dailySummaries.reduce((sum, s) => sum + (s.actualBeverageCost || 0), 0);
      const totalCost = totalFoodCost + totalBeverageCost;

      const avgDailyRevenue = totalRevenue / dailySummaries.length;
      const avgDailyCost = totalCost / dailySummaries.length;

      const avgFoodCostPct = totalFoodRevenue > 0 ? (totalFoodCost / totalFoodRevenue) * 100 : 0;
      const avgBeverageCostPct = totalBeverageRevenue > 0 ? (totalBeverageCost / totalBeverageRevenue) * 100 : 0;
      const avgTotalCostPct = totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 0;

      // Budget averages
      const budgetFoodCostPct = dailySummaries.reduce((sum, s) => sum + s.budgetFoodCostPct, 0) / dailySummaries.length;
      const budgetBeverageCostPct = dailySummaries.reduce((sum, s) => sum + s.budgetBeverageCostPct, 0) / dailySummaries.length;

      // Variance calculations
      const foodVariancePct = avgFoodCostPct - budgetFoodCostPct;
      const beverageVariancePct = avgBeverageCostPct - budgetBeverageCostPct;

      // Performance indicators
      const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
      const revenuePerOutlet = property.outlets.length > 0 ? totalRevenue / property.outlets.length : 0;
      const costPerOutlet = property.outlets.length > 0 ? totalCost / property.outlets.length : 0;
      const efficiency = totalCost > 0 ? totalRevenue / totalCost : 0;

      // Calculate growth trends (current period vs previous period)
      const periodDays = Math.ceil((normalizedEndDate.getTime() - normalizedStartDate.getTime()) / (1000 * 60 * 60 * 24));
      const previousStartDate = new Date(normalizedStartDate.getTime() - (periodDays * 24 * 60 * 60 * 1000));
      const previousEndDate = new Date(normalizedStartDate.getTime() - 1);

      const previousSummaries = await prisma.dailyFinancialSummary.findMany({
        where: {
          propertyId: property.id,
          date: {
            gte: previousStartDate,
            lte: previousEndDate
          }
        }
      });

      let revenueGrowth = 0;
      let costGrowth = 0;
      let profitGrowth = 0;

      if (previousSummaries.length > 0) {
        const prevTotalRevenue = previousSummaries.reduce((sum, s) => sum + s.actualFoodRevenue + s.actualBeverageRevenue, 0);
        const prevTotalCost = previousSummaries.reduce((sum, s) => sum + (s.actualFoodCost || 0) + (s.actualBeverageCost || 0), 0);
        const prevProfit = prevTotalRevenue - prevTotalCost;
        const currentProfit = totalRevenue - totalCost;

        revenueGrowth = prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 : 0;
        costGrowth = prevTotalCost > 0 ? ((totalCost - prevTotalCost) / prevTotalCost) * 100 : 0;
        profitGrowth = prevProfit > 0 ? ((currentProfit - prevProfit) / Math.abs(prevProfit)) * 100 : 0;
      }

      propertyPerformanceData.push({
        propertyId: property.id,
        propertyName: property.name,
        propertyCode: property.propertyCode,
        propertyType: property.propertyType,
        outletCount: property.outlets.length,
        totalFoodRevenue,
        totalBeverageRevenue,
        totalRevenue,
        avgDailyRevenue,
        totalFoodCost,
        totalBeverageCost,
        totalCost,
        avgDailyCost,
        avgFoodCostPct,
        avgBeverageCostPct,
        avgTotalCostPct,
        budgetFoodCostPct,
        budgetBeverageCostPct,
        foodVariancePct,
        beverageVariancePct,
        profitMargin,
        revenuePerOutlet,
        costPerOutlet,
        efficiency,
        revenueGrowth,
        costGrowth,
        profitGrowth
      });
    }

    // Calculate overall summary
    const totalProperties = propertyPerformanceData.length;
    const totalOutlets = propertyPerformanceData.reduce((sum, p) => sum + p.outletCount, 0);
    const totalRevenue = propertyPerformanceData.reduce((sum, p) => sum + p.totalRevenue, 0);
    const totalCost = propertyPerformanceData.reduce((sum, p) => sum + p.totalCost, 0);
    const avgProfitMargin = propertyPerformanceData.reduce((sum, p) => sum + p.profitMargin, 0) / totalProperties;

    // Find best and worst performing properties
    const bestPerformingProperty = propertyPerformanceData.reduce((best, current) => 
      current.profitMargin > best.profitMargin ? current : best
    );
    const worstPerformingProperty = propertyPerformanceData.reduce((worst, current) => 
      current.profitMargin < worst.profitMargin ? current : worst
    );

    // Create rankings
    const rankings = {
      byRevenue: [...propertyPerformanceData].sort((a, b) => b.totalRevenue - a.totalRevenue),
      byProfitMargin: [...propertyPerformanceData].sort((a, b) => b.profitMargin - a.profitMargin),
      byEfficiency: [...propertyPerformanceData].sort((a, b) => b.efficiency - a.efficiency),
      byCostControl: [...propertyPerformanceData].sort((a, b) => a.avgTotalCostPct - b.avgTotalCostPct)
    };

    const reportTitle = selectedProperty 
      ? `Property Performance Analysis - ${selectedProperty.name}`
      : propertiesToAnalyze.length === 1 
        ? `Property Performance Analysis - ${propertyPerformanceData[0]?.propertyName || 'Unknown'}`
        : "Property Performance Comparison Report";

    return {
      dateRange: {
        from: normalizedStartDate,
        to: normalizedEndDate
      },
      reportTitle,
      propertyData: propertyPerformanceData,
      overallSummary: {
        totalProperties,
        totalOutlets,
        totalRevenue,
        totalCost,
        avgProfitMargin,
        bestPerformingProperty: {
          name: bestPerformingProperty.propertyName,
          metric: "Profit Margin",
          value: bestPerformingProperty.profitMargin
        },
        worstPerformingProperty: {
          name: worstPerformingProperty.propertyName,
          metric: "Profit Margin",
          value: worstPerformingProperty.profitMargin
        }
      },
      rankings,
      propertyInfo: selectedProperty
    };

  } catch (error) {
    console.error("Error generating property performance comparison report:", error);
    throw new Error("Failed to generate property performance comparison report");
  }
}