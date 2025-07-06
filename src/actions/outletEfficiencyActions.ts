"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { startOfDay, endOfDay } from "date-fns";

export interface OutletEfficiencyData {
  outletId: number;
  outletName: string;
  outletCode: string;
  propertyId: number;
  propertyName: string;
  propertyCode: string;
  isActive: boolean;
  
  // Revenue Metrics
  totalFoodRevenue: number;
  totalBeverageRevenue: number;
  totalRevenue: number;
  avgDailyRevenue: number;
  revenuePerDay: number;
  
  // Cost Metrics
  totalFoodCost: number;
  totalBeverageCost: number;
  totalCost: number;
  avgDailyCost: number;
  costPerDay: number;
  
  // Efficiency Metrics
  revenueToCostRatio: number; // Revenue / Cost efficiency
  profitMargin: number; // (Revenue - Cost) / Revenue * 100
  netProfit: number; // Revenue - Cost
  dailyProfitability: number; // Net profit per day
  
  // Cost Percentage Metrics
  foodCostPercentage: number;
  beverageCostPercentage: number;
  totalCostPercentage: number;
  
  // Budget vs Actual
  budgetFoodCostPct: number;
  budgetBeverageCostPct: number;
  foodVariance: number; // Actual - Budget
  beverageVariance: number;
  
  // Performance Indicators
  rankByRevenue: number;
  rankByProfit: number;
  rankByEfficiency: number;
  performanceRating: "Excellent" | "Good" | "Fair" | "Poor";
  
  // Trend Analysis (current period vs previous period)
  revenueGrowth: number;
  costGrowth: number;
  profitGrowth: number;
  efficiencyTrend: "Improving" | "Declining" | "Stable";
}

export interface OutletComparison {
  metric: string;
  bestOutlet: {
    name: string;
    value: number;
    formattedValue: string;
  };
  worstOutlet: {
    name: string;
    value: number;
    formattedValue: string;
  };
  average: number;
  formattedAverage: string;
}

export interface OutletEfficiencyProfitabilityReport {
  dateRange: {
    from: Date;
    to: Date;
  };
  reportTitle: string;
  outletData: OutletEfficiencyData[];
  
  // Summary Statistics
  summary: {
    totalOutlets: number;
    activeOutlets: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    avgProfitMargin: number;
    avgEfficiencyRatio: number;
    topPerformingOutlet: {
      name: string;
      metric: string;
      value: number;
    };
    bottomPerformingOutlet: {
      name: string;
      metric: string;
      value: number;
    };
  };
  
  // Rankings
  rankings: {
    byRevenue: OutletEfficiencyData[];
    byProfit: OutletEfficiencyData[];
    byEfficiency: OutletEfficiencyData[];
    byCostControl: OutletEfficiencyData[];
  };
  
  // Comparative Analysis
  comparisons: OutletComparison[];
  
  // Property-level Summary (if multiple properties)
  propertyAnalysis?: {
    propertyName: string;
    propertyCode: string;
    outletCount: number;
    totalRevenue: number;
    avgProfitMargin: number;
    topOutlet: string;
  }[];
  
  // Insights and Recommendations
  insights: {
    topPerformers: string[];
    underPerformers: string[];
    recommendations: string[];
    keyFindings: string[];
  };
  
  propertyInfo?: {
    id: number;
    name: string;
  };
}

export async function getOutletEfficiencyProfitabilityReportAction(
  startDate: Date,
  endDate: Date,
  outletId?: string,
  propertyId?: string
): Promise<OutletEfficiencyProfitabilityReport> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    const normalizedStartDate = startOfDay(startDate);
    const normalizedEndDate = endOfDay(endDate);

    // Determine which outlets to analyze based on user role and selections
    let outletsToAnalyze: number[] = [];
    let selectedProperty = null;

    // Build outlet filter conditions
    let outletWhereClause: any = {
      isActive: true
    };

    if (user.role === "super_admin") {
      if (propertyId && propertyId !== "all") {
        outletWhereClause.propertyId = parseInt(propertyId);
        selectedProperty = await prisma.property.findUnique({
          where: { id: parseInt(propertyId) },
          select: { id: true, name: true }
        });
      }
      if (outletId && outletId !== "all") {
        outletWhereClause.id = parseInt(outletId);
      }
    } else {
      // Non-super admin users can only see outlets from their accessible properties
      const userPropertyIds = user.propertyAccess?.map(access => access.propertyId) || [];
      if (userPropertyIds.length === 0) {
        throw new Error("No property access found for user");
      }
      outletWhereClause.propertyId = { in: userPropertyIds };
      
      if (outletId && outletId !== "all") {
        outletWhereClause.id = parseInt(outletId);
      }
    }

    // Fetch outlets with their property information
    const outlets = await prisma.outlet.findMany({
      where: outletWhereClause,
      include: {
        property: {
          select: {
            id: true,
            name: true,
            propertyCode: true
          }
        }
      }
    });

    if (outlets.length === 0) {
      throw new Error("No outlets found for analysis");
    }

    const outletEfficiencyData: OutletEfficiencyData[] = [];

    // Calculate metrics for each outlet
    for (const outlet of outlets) {
      // Get daily financial summaries for the outlet's property
      const dailySummaries = await prisma.dailyFinancialSummary.findMany({
        where: {
          propertyId: outlet.propertyId,
          date: {
            gte: normalizedStartDate,
            lte: normalizedEndDate
          }
        }
      });

      // Get food cost entries for this outlet
      const foodCostEntries = await prisma.foodCostEntry.findMany({
        where: {
          outletId: outlet.id,
          date: {
            gte: normalizedStartDate,
            lte: normalizedEndDate
          }
        }
      });

      // Get beverage cost entries for this outlet
      const beverageCostEntries = await prisma.beverageCostEntry.findMany({
        where: {
          outletId: outlet.id,
          date: {
            gte: normalizedStartDate,
            lte: normalizedEndDate
          }
        }
      });

      // Calculate outlet-specific metrics
      const totalFoodCost = foodCostEntries.reduce((sum, entry) => sum + entry.totalFoodCost, 0);
      const totalBeverageCost = beverageCostEntries.reduce((sum, entry) => sum + entry.totalBeverageCost, 0);
      const totalCost = totalFoodCost + totalBeverageCost;

      // For revenue, we'll estimate based on property-level data and outlet share
      // This is a simplified approach - in reality, you'd want outlet-specific revenue tracking
      const propertyTotalRevenue = dailySummaries.reduce((sum, s) => sum + s.actualFoodRevenue + s.actualBeverageRevenue, 0);
      const propertyTotalCost = dailySummaries.reduce((sum, s) => sum + (s.actualFoodCost || 0) + (s.actualBeverageCost || 0), 0);
      
      // Calculate outlet revenue share based on cost contribution
      const costShare = propertyTotalCost > 0 ? totalCost / propertyTotalCost : 0;
      const estimatedRevenue = propertyTotalRevenue * costShare;
      
      // If outlet has significant costs but property has no revenue data, use cost-based estimation
      const totalFoodRevenue = estimatedRevenue * 0.7; // Assume 70% food revenue
      const totalBeverageRevenue = estimatedRevenue * 0.3; // Assume 30% beverage revenue
      const totalRevenue = totalFoodRevenue + totalBeverageRevenue;

      // Calculate periods and averages
      const daysInPeriod = Math.ceil((normalizedEndDate.getTime() - normalizedStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const avgDailyRevenue = totalRevenue / daysInPeriod;
      const avgDailyCost = totalCost / daysInPeriod;

      // Calculate efficiency metrics
      const netProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
      const revenueToCostRatio = totalCost > 0 ? totalRevenue / totalCost : 0;
      const dailyProfitability = netProfit / daysInPeriod;

      // Calculate cost percentages
      const foodCostPercentage = totalFoodRevenue > 0 ? (totalFoodCost / totalFoodRevenue) * 100 : 0;
      const beverageCostPercentage = totalBeverageRevenue > 0 ? (totalBeverageCost / totalBeverageRevenue) * 100 : 0;
      const totalCostPercentage = totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 0;

      // Budget analysis based on property averages
      const budgetFoodCostPct = dailySummaries.length > 0 
        ? dailySummaries.reduce((sum, s) => sum + s.budgetFoodCostPct, 0) / dailySummaries.length 
        : 0;
      const budgetBeverageCostPct = dailySummaries.length > 0 
        ? dailySummaries.reduce((sum, s) => sum + s.budgetBeverageCostPct, 0) / dailySummaries.length 
        : 0;

      const foodVariance = foodCostPercentage - budgetFoodCostPct;
      const beverageVariance = beverageCostPercentage - budgetBeverageCostPct;

      // Calculate growth trends (current period vs previous period)
      const previousStartDate = new Date(normalizedStartDate.getTime() - (daysInPeriod * 24 * 60 * 60 * 1000));
      const previousEndDate = new Date(normalizedStartDate.getTime() - 1);

      const previousFoodEntries = await prisma.foodCostEntry.findMany({
        where: {
          outletId: outlet.id,
          date: { gte: previousStartDate, lte: previousEndDate }
        }
      });

      const previousBeverageEntries = await prisma.beverageCostEntry.findMany({
        where: {
          outletId: outlet.id,
          date: { gte: previousStartDate, lte: previousEndDate }
        }
      });

      const previousTotalCost = previousFoodEntries.reduce((sum, entry) => sum + entry.totalFoodCost, 0) +
                               previousBeverageEntries.reduce((sum, entry) => sum + entry.totalBeverageCost, 0);

      // Estimate previous revenue using same methodology
      const previousPropertySummaries = await prisma.dailyFinancialSummary.findMany({
        where: {
          propertyId: outlet.propertyId,
          date: { gte: previousStartDate, lte: previousEndDate }
        }
      });

      const previousPropertyRevenue = previousPropertySummaries.reduce((sum, s) => sum + s.actualFoodRevenue + s.actualBeverageRevenue, 0);
      const previousPropertyCost = previousPropertySummaries.reduce((sum, s) => sum + (s.actualFoodCost || 0) + (s.actualBeverageCost || 0), 0);
      const previousCostShare = previousPropertyCost > 0 ? previousTotalCost / previousPropertyCost : 0;
      const previousEstimatedRevenue = previousPropertyRevenue * previousCostShare;
      const previousNetProfit = previousEstimatedRevenue - previousTotalCost;

      // Calculate growth rates
      const revenueGrowth = previousEstimatedRevenue > 0 ? ((totalRevenue - previousEstimatedRevenue) / previousEstimatedRevenue) * 100 : 0;
      const costGrowth = previousTotalCost > 0 ? ((totalCost - previousTotalCost) / previousTotalCost) * 100 : 0;
      const profitGrowth = previousNetProfit > 0 ? ((netProfit - previousNetProfit) / Math.abs(previousNetProfit)) * 100 : 0;

      // Determine efficiency trend
      const previousEfficiency = previousTotalCost > 0 ? previousEstimatedRevenue / previousTotalCost : 0;
      let efficiencyTrend: "Improving" | "Declining" | "Stable" = "Stable";
      if (revenueToCostRatio > previousEfficiency * 1.05) {
        efficiencyTrend = "Improving";
      } else if (revenueToCostRatio < previousEfficiency * 0.95) {
        efficiencyTrend = "Declining";
      }

      // Determine performance rating
      let performanceRating: "Excellent" | "Good" | "Fair" | "Poor" = "Poor";
      if (profitMargin >= 15 && revenueToCostRatio >= 4) {
        performanceRating = "Excellent";
      } else if (profitMargin >= 10 && revenueToCostRatio >= 3) {
        performanceRating = "Good";
      } else if (profitMargin >= 5 && revenueToCostRatio >= 2) {
        performanceRating = "Fair";
      }

      outletEfficiencyData.push({
        outletId: outlet.id,
        outletName: outlet.name,
        outletCode: outlet.outletCode,
        propertyId: outlet.propertyId,
        propertyName: outlet.property?.name || "Unknown Property",
        propertyCode: outlet.property?.propertyCode || "N/A",
        isActive: outlet.isActive,
        totalFoodRevenue,
        totalBeverageRevenue,
        totalRevenue,
        avgDailyRevenue,
        revenuePerDay: avgDailyRevenue,
        totalFoodCost,
        totalBeverageCost,
        totalCost,
        avgDailyCost,
        costPerDay: avgDailyCost,
        revenueToCostRatio,
        profitMargin,
        netProfit,
        dailyProfitability,
        foodCostPercentage,
        beverageCostPercentage,
        totalCostPercentage,
        budgetFoodCostPct,
        budgetBeverageCostPct,
        foodVariance,
        beverageVariance,
        rankByRevenue: 0, // Will be calculated after all outlets
        rankByProfit: 0,
        rankByEfficiency: 0,
        performanceRating,
        revenueGrowth,
        costGrowth,
        profitGrowth,
        efficiencyTrend
      });
    }

    // Calculate rankings
    const revenueRanked = [...outletEfficiencyData].sort((a, b) => b.totalRevenue - a.totalRevenue);
    const profitRanked = [...outletEfficiencyData].sort((a, b) => b.profitMargin - a.profitMargin);
    const efficiencyRanked = [...outletEfficiencyData].sort((a, b) => b.revenueToCostRatio - a.revenueToCostRatio);
    const costControlRanked = [...outletEfficiencyData].sort((a, b) => a.totalCostPercentage - b.totalCostPercentage);

    // Assign rankings
    outletEfficiencyData.forEach(outlet => {
      outlet.rankByRevenue = revenueRanked.findIndex(o => o.outletId === outlet.outletId) + 1;
      outlet.rankByProfit = profitRanked.findIndex(o => o.outletId === outlet.outletId) + 1;
      outlet.rankByEfficiency = efficiencyRanked.findIndex(o => o.outletId === outlet.outletId) + 1;
    });

    // Calculate summary statistics
    const totalOutlets = outletEfficiencyData.length;
    const activeOutlets = outletEfficiencyData.filter(o => o.isActive).length;
    const totalRevenue = outletEfficiencyData.reduce((sum, o) => sum + o.totalRevenue, 0);
    const totalCost = outletEfficiencyData.reduce((sum, o) => sum + o.totalCost, 0);
    const totalProfit = totalRevenue - totalCost;
    const avgProfitMargin = totalOutlets > 0 ? outletEfficiencyData.reduce((sum, o) => sum + o.profitMargin, 0) / totalOutlets : 0;
    const avgEfficiencyRatio = totalOutlets > 0 ? outletEfficiencyData.reduce((sum, o) => sum + o.revenueToCostRatio, 0) / totalOutlets : 0;

    const topPerformingOutlet = profitRanked.length > 0 ? profitRanked[0] : null;
    const bottomPerformingOutlet = profitRanked.length > 0 ? profitRanked[profitRanked.length - 1] : null;

    // Generate comparative analysis
    const comparisons: OutletComparison[] = [];
    
    if (revenueRanked.length > 0) {
      comparisons.push({
        metric: "Total Revenue",
        bestOutlet: {
          name: revenueRanked[0].outletName,
          value: revenueRanked[0].totalRevenue,
          formattedValue: `$${revenueRanked[0].totalRevenue.toFixed(2)}`
        },
        worstOutlet: {
          name: revenueRanked[revenueRanked.length - 1].outletName,
          value: revenueRanked[revenueRanked.length - 1].totalRevenue,
          formattedValue: `$${revenueRanked[revenueRanked.length - 1].totalRevenue.toFixed(2)}`
        },
        average: totalOutlets > 0 ? totalRevenue / totalOutlets : 0,
        formattedAverage: `$${totalOutlets > 0 ? (totalRevenue / totalOutlets).toFixed(2) : '0.00'}`
      });

      comparisons.push({
        metric: "Profit Margin",
        bestOutlet: {
          name: profitRanked[0].outletName,
          value: profitRanked[0].profitMargin,
          formattedValue: `${profitRanked[0].profitMargin.toFixed(2)}%`
        },
        worstOutlet: {
          name: profitRanked[profitRanked.length - 1].outletName,
          value: profitRanked[profitRanked.length - 1].profitMargin,
          formattedValue: `${profitRanked[profitRanked.length - 1].profitMargin.toFixed(2)}%`
        },
        average: avgProfitMargin,
        formattedAverage: `${avgProfitMargin.toFixed(2)}%`
      });

      comparisons.push({
        metric: "Efficiency Ratio",
        bestOutlet: {
          name: efficiencyRanked[0].outletName,
          value: efficiencyRanked[0].revenueToCostRatio,
          formattedValue: `${efficiencyRanked[0].revenueToCostRatio.toFixed(2)}x`
        },
        worstOutlet: {
          name: efficiencyRanked[efficiencyRanked.length - 1].outletName,
          value: efficiencyRanked[efficiencyRanked.length - 1].revenueToCostRatio,
          formattedValue: `${efficiencyRanked[efficiencyRanked.length - 1].revenueToCostRatio.toFixed(2)}x`
        },
        average: avgEfficiencyRatio,
        formattedAverage: `${avgEfficiencyRatio.toFixed(2)}x`
      });
    }

    // Property-level analysis (if multiple properties)
    const propertyGroups = outletEfficiencyData.reduce((groups, outlet) => {
      const key = `${outlet.propertyId}-${outlet.propertyName}`;
      if (!groups[key]) {
        groups[key] = {
          propertyName: outlet.propertyName,
          propertyCode: outlet.propertyCode,
          outlets: []
        };
      }
      groups[key].outlets.push(outlet);
      return groups;
    }, {} as Record<string, { propertyName: string, propertyCode: string, outlets: OutletEfficiencyData[] }>);

    const propertyAnalysis = Object.values(propertyGroups).map(group => {
      const totalRevenue = group.outlets.reduce((sum, o) => sum + o.totalRevenue, 0);
      const avgProfitMargin = group.outlets.length > 0 ? group.outlets.reduce((sum, o) => sum + o.profitMargin, 0) / group.outlets.length : 0;
      const topOutlet = group.outlets.length > 0 ? group.outlets.reduce((best, current) => 
        current.profitMargin > best.profitMargin ? current : best
      ) : { outletName: "N/A" };

      return {
        propertyName: group.propertyName,
        propertyCode: group.propertyCode,
        outletCount: group.outlets.length,
        totalRevenue,
        avgProfitMargin,
        topOutlet: topOutlet.outletName
      };
    });

    // Generate insights and recommendations
    const topPerformers = profitRanked.slice(0, 3).map(o => o.outletName);
    const underPerformers = profitRanked.slice(-3).map(o => o.outletName);
    
    const recommendations: string[] = [];
    const keyFindings: string[] = [];

    if (totalOutlets === 0) {
      recommendations.push("No outlet data available for the selected period. Please check data entry and date range.");
      keyFindings.push("No outlets found for analysis");
    } else {
      if (avgProfitMargin < 10) {
        recommendations.push("Overall profit margins are below target (10%). Focus on cost optimization across all outlets.");
      }
      if (efficiencyRanked.length > 0 && efficiencyRanked[0].revenueToCostRatio > 5) {
        recommendations.push(`${efficiencyRanked[0].outletName} shows excellent efficiency. Study their practices for replication.`);
      }
      if (costControlRanked.length > 0 && costControlRanked[costControlRanked.length - 1].totalCostPercentage > 40) {
        recommendations.push(`${costControlRanked[costControlRanked.length - 1].outletName} has high cost percentages. Immediate cost review needed.`);
      }

      if (topPerformingOutlet) {
        keyFindings.push(`Top performing outlet: ${topPerformingOutlet.outletName} with ${topPerformingOutlet.profitMargin.toFixed(2)}% profit margin`);
      }
      keyFindings.push(`Average efficiency ratio across outlets: ${avgEfficiencyRatio.toFixed(2)}x`);
      keyFindings.push(`${outletEfficiencyData.filter(o => o.performanceRating === "Excellent" || o.performanceRating === "Good").length} out of ${totalOutlets} outlets performing well`);
    }

    const reportTitle = selectedProperty 
      ? `Outlet Efficiency & Profitability Analysis - ${selectedProperty.name}`
      : outletEfficiencyData.length === 1 
        ? `Outlet Analysis - ${outletEfficiencyData[0].outletName}`
        : "Outlet Efficiency & Profitability Report";

    return {
      dateRange: {
        from: normalizedStartDate,
        to: normalizedEndDate
      },
      reportTitle,
      outletData: outletEfficiencyData,
      summary: {
        totalOutlets,
        activeOutlets,
        totalRevenue,
        totalCost,
        totalProfit,
        avgProfitMargin,
        avgEfficiencyRatio,
        topPerformingOutlet: {
          name: topPerformingOutlet?.outletName || "N/A",
          metric: "Profit Margin",
          value: topPerformingOutlet?.profitMargin || 0
        },
        bottomPerformingOutlet: {
          name: bottomPerformingOutlet?.outletName || "N/A",
          metric: "Profit Margin",
          value: bottomPerformingOutlet?.profitMargin || 0
        }
      },
      rankings: {
        byRevenue: revenueRanked,
        byProfit: profitRanked,
        byEfficiency: efficiencyRanked,
        byCostControl: costControlRanked
      },
      comparisons,
      propertyAnalysis: propertyAnalysis.length > 1 ? propertyAnalysis : undefined,
      insights: {
        topPerformers,
        underPerformers,
        recommendations,
        keyFindings
      },
      propertyInfo: selectedProperty
    };

  } catch (error) {
    console.error("Error generating outlet efficiency profitability report:", error);
    throw new Error("Failed to generate outlet efficiency profitability report");
  }
}