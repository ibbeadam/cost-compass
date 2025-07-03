import { getFoodCostEntriesByDateRangeAction } from "@/actions/foodCostActions";
import { getBeverageCostEntriesByDateRangeAction } from "@/actions/beverageCostActions";
import { getDailyFinancialSummariesByDateRangeAction } from "@/actions/dailyFinancialSummaryActions";
import { getAllCategoriesAction } from "@/actions/categoryActions";
import { getOutletByIdAction } from "@/actions/prismaOutletActions";
import { analyzeDashboardData, type DashboardAdvisorInput, type DashboardAdvisorOutput } from "@/ai/flows/dashboard-cost-advisor-flow";
import type { FoodCostEntry, BeverageCostEntry, DailyFinancialSummary, Category, Outlet } from "@/types";

/**
 * Enhanced Cost Advisor Integration
 * Provides comprehensive cost analysis with real data integration and smart notifications
 */

// Historical data collection with 30-day lookback
export async function collectHistoricalData(
  outletId: string,
  endDate: Date = new Date(),
  daysBack: number = 30
): Promise<Array<{
  date: string,
  foodRevenue: number,
  foodCostPct: number,
  beverageRevenue: number,
  beverageCostPct: number
}>> {
  try {
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - daysBack);

    // Fetch daily financial summaries using Prisma action
    const summaries = await getDailyFinancialSummariesByDateRangeAction(startDate, endDate);
    const historicalData = [];

    for (const summary of summaries) {
      // Calculate food and beverage costs for this day
      const foodStats = await calculateDailyFoodStats(Number(outletId), summary.date);
      const beverageStats = await calculateDailyBeverageStats(Number(outletId), summary.date);

      historicalData.push({
        date: summary.date.toISOString().split('T')[0],
        foodRevenue: summary.actualFoodRevenue || 0,
        foodCostPct: foodStats.costPercentage,
        beverageRevenue: summary.actualBeverageRevenue || 0,
        beverageCostPct: beverageStats.costPercentage
      });
    }

    return historicalData.sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error("Error collecting historical data:", error);
    return [];
  }
}

// Calculate daily food cost statistics
async function calculateDailyFoodStats(outletId: number, date: Date): Promise<{
  totalCost: number,
  costPercentage: number,
  revenue: number
}> {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get food cost entries for the specific date and outlet using Prisma action
    const foodEntries = await getFoodCostEntriesByDateRangeAction(startOfDay, endOfDay, outletId);
    
    let totalCost = 0;

    foodEntries.forEach(entry => {
      totalCost += entry.totalFoodCost || 0;
    });

    // Note: Revenue data would come from financial summary, not food cost entries
    // For now, return 0 revenue as food cost entries don't contain revenue
    return {
      totalCost,
      costPercentage: 0, // Will be calculated from financial summary data
      revenue: 0
    };
  } catch (error) {
    console.error("Error calculating daily food stats:", error);
    return { totalCost: 0, costPercentage: 0, revenue: 0 };
  }
}

// Calculate daily beverage cost statistics
async function calculateDailyBeverageStats(outletId: number, date: Date): Promise<{
  totalCost: number,
  costPercentage: number,
  revenue: number
}> {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get beverage cost entries for the specific date and outlet using Prisma action
    const beverageEntries = await getBeverageCostEntriesByDateRangeAction(startOfDay, endOfDay, outletId);
    
    let totalCost = 0;

    beverageEntries.forEach(entry => {
      totalCost += entry.totalBeverageCost || 0;
    });

    // Note: Revenue data would come from financial summary, not beverage cost entries
    // For now, return 0 revenue as beverage cost entries don't contain revenue
    return {
      totalCost,
      costPercentage: 0, // Will be calculated from financial summary data
      revenue: 0
    };
  } catch (error) {
    console.error("Error calculating daily beverage stats:", error);
    return { totalCost: 0, costPercentage: 0, revenue: 0 };
  }
}

// Collect category breakdown data
export async function collectCategoryBreakdown(
  outletId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  food?: Array<{category: string, costPct: number, revenue: number}>,
  beverage?: Array<{category: string, costPct: number, revenue: number}>
}> {
  try {
    const outletIdNumber = Number(outletId);
    
    // Get all categories using Prisma action
    const categories = await getAllCategoriesAction();

    // Get food cost entries using Prisma action
    const foodEntries = await getFoodCostEntriesByDateRangeAction(startDate, endDate, outletIdNumber);
    const foodByCategory: Record<string, { cost: number, revenue: number }> = {};

    foodEntries.forEach(entry => {
      entry.details?.forEach(detail => {
        const categoryName = detail.category?.name || detail.categoryName || "Unknown";
        
        if (!foodByCategory[categoryName]) {
          foodByCategory[categoryName] = { cost: 0, revenue: 0 };
        }
        
        foodByCategory[categoryName].cost += detail.cost || 0;
        // Note: Revenue data is not available in cost details, would need to be calculated from financial summaries
        foodByCategory[categoryName].revenue += 0;
      });
    });

    // Get beverage cost entries using Prisma action
    const beverageEntries = await getBeverageCostEntriesByDateRangeAction(startDate, endDate, outletIdNumber);
    const beverageByCategory: Record<string, { cost: number, revenue: number }> = {};

    beverageEntries.forEach(entry => {
      entry.details?.forEach(detail => {
        const categoryName = detail.category?.name || detail.categoryName || "Unknown";
        
        if (!beverageByCategory[categoryName]) {
          beverageByCategory[categoryName] = { cost: 0, revenue: 0 };
        }
        
        beverageByCategory[categoryName].cost += detail.cost || 0;
        // Note: Revenue data is not available in cost details, would need to be calculated from financial summaries
        beverageByCategory[categoryName].revenue += 0;
      });
    });

    // Convert to required format
    const foodBreakdown = Object.entries(foodByCategory).map(([category, data]) => ({
      category,
      costPct: 0, // Cannot calculate percentage without revenue data
      revenue: data.revenue
    }));

    const beverageBreakdown = Object.entries(beverageByCategory).map(([category, data]) => ({
      category,
      costPct: 0, // Cannot calculate percentage without revenue data
      revenue: data.revenue
    }));

    return {
      food: foodBreakdown,
      beverage: beverageBreakdown
    };
  } catch (error) {
    console.error("Error collecting category breakdown:", error);
    return {};
  }
}

// Get outlet information
export async function getOutletInfo(outletId: string): Promise<{
  name: string,
  type: "restaurant" | "cafe" | "bar" | "hotel" | "catering",
  capacity?: number,
  location?: string
} | null> {
  try {
    const outlet = await getOutletByIdAction(Number(outletId));
    
    if (!outlet) return null;
    
    return {
      name: outlet.name,
      type: (outlet.type as any) || "restaurant",
      capacity: outlet.capacity || undefined,
      location: outlet.location || undefined
    };
  } catch (error) {
    console.error("Error getting outlet info:", error);
    return null;
  }
}

// Detect current season
function getCurrentSeason(): "spring" | "summer" | "fall" | "winter" {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "fall";
  return "winter";
}

// Get current day of week
function getCurrentDayOfWeek(): "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday" {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[new Date().getDay()] as any;
}

// Enhanced cost analysis with real data integration
export async function runEnhancedCostAnalysis(
  outletId: string,
  startDate: Date,
  endDate: Date,
  currentData: {
    totalFoodRevenue: number,
    budgetFoodCostPct: number,
    actualFoodCostPct: number,
    totalBeverageRevenue: number,
    budgetBeverageCostPct: number,
    actualBeverageCostPct: number
  },
  businessContext?: {
    specialEvents?: string[],
    marketConditions?: string,
    staffingLevel?: "understaffed" | "normal" | "overstaffed"
  }
): Promise<DashboardAdvisorOutput> {
  try {
    const numberOfDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Collect all required data (converted to use Prisma actions)
    const [historicalData, categoryBreakdown, outletInfo] = await Promise.all([
      collectHistoricalData(outletId, endDate, 30),
      collectCategoryBreakdown(outletId, startDate, endDate),
      getOutletInfo(outletId)
    ]);

    // Build comprehensive input
    const input: DashboardAdvisorInput = {
      numberOfDays,
      ...currentData,
      historicalData,
      businessContext: {
        season: getCurrentSeason(),
        dayOfWeek: getCurrentDayOfWeek(),
        ...businessContext
      },
      categoryBreakdown,
      outlet: outletInfo || undefined
    };

    // Run the enhanced analysis
    const result = await analyzeDashboardData(input);
    
    console.log("Enhanced cost analysis completed successfully", {
      outletId,
      dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      alertLevel: result.alertLevel,
      overallScore: result.performanceMetrics.overallScore
    });

    return result;
  } catch (error) {
    console.error("Enhanced cost analysis failed:", error);
    throw new Error(`Enhanced analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Smart notification triggers based on analysis results
export interface SmartNotificationConfig {
  enableAlerts: boolean;
  enableInsights: boolean;
  enableRecommendations: boolean;
  minAlertLevel: "none" | "low" | "medium" | "high" | "critical";
  maxNotificationsPerSession: number;
}

export async function generateSmartNotifications(
  analysis: DashboardAdvisorOutput,
  config: SmartNotificationConfig = {
    enableAlerts: true,
    enableInsights: true,
    enableRecommendations: true,
    minAlertLevel: "low",
    maxNotificationsPerSession: 5
  }
): Array<{
  type: "alert" | "insight" | "recommendation";
  priority: "low" | "medium" | "high" | "urgent";
  title: string;
  message: string;
  action?: string;
}> {
  const notifications = [];
  
  // Alert level notifications
  if (config.enableAlerts && await shouldTriggerAlert(analysis.alertLevel, config.minAlertLevel)) {
    notifications.push({
      type: "alert" as const,
      priority: await mapAlertToPriority(analysis.alertLevel),
      title: `${analysis.alertLevel.charAt(0).toUpperCase() + analysis.alertLevel.slice(1)} Cost Alert`,
      message: `Cost variance detected requiring ${analysis.alertLevel === "critical" ? "immediate" : analysis.alertLevel === "high" ? "urgent" : "prompt"} attention`,
      action: analysis.nextSteps[0]
    });
  }
  
  // High-impact insights
  if (config.enableInsights) {
    const highImpactInsights = analysis.keyInsights.filter(insight => insight.impact === "high");
    highImpactInsights.slice(0, 2).forEach(insight => {
      notifications.push({
        type: "insight" as const,
        priority: "high" as const,
        title: "Critical Cost Insight",
        message: insight.insight,
        action: "Review detailed analysis"
      });
    });
  }
  
  // Urgent recommendations
  if (config.enableRecommendations) {
    const urgentRecs = analysis.recommendations.filter(rec => rec.priority === "urgent" || rec.priority === "high");
    urgentRecs.slice(0, 2).forEach(rec => {
      notifications.push({
        type: "recommendation" as const,
        priority: rec.priority === "urgent" ? "urgent" as const : "high" as const,
        title: "Priority Action Required",
        message: rec.action,
        action: `Impact: ${rec.estimatedImpact}`
      });
    });
  }
  
  // Risk-based notifications
  if (analysis.riskAssessment.overallRiskLevel === "high" || analysis.riskAssessment.overallRiskLevel === "critical") {
    notifications.push({
      type: "alert" as const,
      priority: analysis.riskAssessment.overallRiskLevel === "critical" ? "urgent" as const : "high" as const,
      title: "Risk Assessment Alert",
      message: `Overall risk level is ${analysis.riskAssessment.overallRiskLevel}. ${analysis.riskAssessment.riskFactors[0] || 'Review required.'}`,
      action: analysis.riskAssessment.mitigation[0]
    });
  }
  
  // Performance threshold notifications
  if (analysis.performanceMetrics.overallScore < 50) {
    notifications.push({
      type: "alert" as const,
      priority: "high" as const,
      title: "Performance Below Threshold",
      message: `Overall performance score is ${analysis.performanceMetrics.overallScore}/100, requiring immediate improvement`,
      action: "Implement priority recommendations"
    });
  }
  
  // Limit notifications to configured maximum
  return notifications.slice(0, config.maxNotificationsPerSession);
}

async function shouldTriggerAlert(alertLevel: string, minLevel: string): Promise<boolean> {
  const levels = ["none", "low", "medium", "high", "critical"];
  const alertIndex = levels.indexOf(alertLevel);
  const minIndex = levels.indexOf(minLevel);
  return alertIndex >= minIndex;
}

async function mapAlertToPriority(alertLevel: string): Promise<"low" | "medium" | "high" | "urgent"> {
  switch (alertLevel) {
    case "critical": return "urgent";
    case "high": return "high";
    case "medium": return "medium";
    default: return "low";
  }
}

// Example usage helper
export async function runCompleteAnalysisWithNotifications(
  outletId: string,
  startDate: Date,
  endDate: Date,
  currentData: {
    totalFoodRevenue: number,
    budgetFoodCostPct: number,
    actualFoodCostPct: number,
    totalBeverageRevenue: number,
    budgetBeverageCostPct: number,
    actualBeverageCostPct: number
  },
  notificationConfig?: SmartNotificationConfig
) {
  const analysis = await runEnhancedCostAnalysis(outletId, startDate, endDate, currentData);
  const notifications = await generateSmartNotifications(analysis, notificationConfig);
  
  return {
    analysis,
    notifications,
    summary: {
      alertLevel: analysis.alertLevel,
      overallScore: analysis.performanceMetrics.overallScore,
      keyInsight: analysis.keyInsights[0]?.insight || "No insights available",
      primaryRecommendation: analysis.recommendations[0]?.action || "No recommendations available",
      notificationCount: notifications.length
    }
  };
}