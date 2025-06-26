// src/ai/flows/dashboard-cost-advisor-flow.ts
"use server";
/**
 * @fileOverview Provides AI-driven cost advisory based on dashboard financial data.
 *
 * - analyzeDashboardData - A function that handles the cost analysis and advice generation.
 * - DashboardAdvisorInput - The input type for the analyzeDashboardData function.
 * - DashboardAdvisorOutput - The return type for the analyzeDashboardData function.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";

const DashboardAdvisorInputSchema = z.object({
  // Current Period Data
  numberOfDays: z
    .number()
    .describe("The number of days in the selected period."),
  totalFoodRevenue: z.number().describe("Total food revenue for the period."),
  budgetFoodCostPct: z
    .number()
    .describe("Budgeted food cost percentage for the period."),
  actualFoodCostPct: z
    .number()
    .describe("Actual average food cost percentage for the period."),
  totalBeverageRevenue: z
    .number()
    .describe("Total beverage revenue for the period."),
  budgetBeverageCostPct: z
    .number()
    .describe("Budgeted beverage cost percentage for the period."),
  actualBeverageCostPct: z
    .number()
    .describe("Actual average beverage cost percentage for the period."),

  // Historical Data for Trends
  historicalData: z
    .array(
      z.object({
        date: z.string().describe("Date in YYYY-MM-DD format"),
        foodRevenue: z.number().describe("Daily food revenue"),
        foodCostPct: z.number().describe("Daily food cost percentage"),
        beverageRevenue: z.number().describe("Daily beverage revenue"),
        beverageCostPct: z.number().describe("Daily beverage cost percentage"),
      })
    )
    .optional()
    .describe("Historical daily data for trend analysis (last 30 days)"),

  // Business Context
  businessContext: z
    .object({
      season: z
        .enum(["spring", "summer", "fall", "winter"])
        .optional()
        .describe("Current season"),
      dayOfWeek: z
        .enum([
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ])
        .optional()
        .describe("Day of week for context"),
      specialEvents: z
        .array(z.string())
        .optional()
        .describe("Any special events during the period"),
      marketConditions: z
        .string()
        .optional()
        .describe("Current market conditions affecting costs"),
      staffingLevel: z
        .enum(["understaffed", "normal", "overstaffed"])
        .optional()
        .describe("Current staffing situation"),
    })
    .optional()
    .describe("Business context for more accurate analysis"),

  // Category Breakdown
  categoryBreakdown: z
    .object({
      food: z
        .array(
          z.object({
            category: z.string().describe("Food category name"),
            costPct: z.number().describe("Cost percentage for this category"),
            revenue: z.number().describe("Revenue for this category"),
          })
        )
        .optional()
        .describe("Detailed food category breakdown"),
      beverage: z
        .array(
          z.object({
            category: z.string().describe("Beverage category name"),
            costPct: z.number().describe("Cost percentage for this category"),
            revenue: z.number().describe("Revenue for this category"),
          })
        )
        .optional()
        .describe("Detailed beverage category breakdown"),
    })
    .optional()
    .describe("Category-wise cost breakdown for detailed analysis"),

  // Outlet Information
  outlet: z
    .object({
      name: z.string().describe("Outlet name"),
      type: z
        .enum(["restaurant", "cafe", "bar", "hotel", "catering"])
        .describe("Type of outlet"),
      capacity: z.number().optional().describe("Seating capacity"),
      location: z
        .string()
        .optional()
        .describe("Location type (city center, suburban, etc.)"),
    })
    .optional()
    .describe("Outlet-specific information for contextualized advice"),
});
export type DashboardAdvisorInput = z.infer<typeof DashboardAdvisorInputSchema>;

const DashboardAdvisorOutputSchema = z.object({
  // Current Analysis
  dailySpendingGuidelineFood: z
    .string()
    .describe("Guideline for daily spending on food to meet budget."),
  dailySpendingGuidelineBeverage: z
    .string()
    .describe("Guideline for daily spending on beverage to meet budget."),
  foodCostAnalysis: z
    .string()
    .describe(
      "Analysis of food cost performance against budget, including monetary impact."
    ),
  beverageCostAnalysis: z
    .string()
    .describe(
      "Analysis of beverage cost performance against budget, including monetary impact."
    ),

  // Enhanced Analysis
  trendAnalysis: z
    .object({
      foodTrend: z
        .enum(["improving", "stable", "deteriorating", "volatile"])
        .describe("Food cost trend direction"),
      beverageTrend: z
        .enum(["improving", "stable", "deteriorating", "volatile"])
        .describe("Beverage cost trend direction"),
      trendSummary: z
        .string()
        .describe("Summary of cost trends over the historical period"),
      predictiveInsight: z
        .string()
        .describe("Prediction of future cost performance based on trends"),
    })
    .describe("Trend analysis based on historical data"),

  // Risk Assessment
  riskAssessment: z
    .object({
      overallRiskLevel: z
        .enum(["low", "medium", "high", "critical"])
        .describe("Overall financial risk level"),
      riskFactors: z
        .array(z.string())
        .describe("Specific risk factors identified"),
      mitigation: z.array(z.string()).describe("Risk mitigation strategies"),
    })
    .describe("Risk assessment and mitigation strategies"),

  // Key Insights
  keyInsights: z
    .array(
      z.object({
        insight: z.string().describe("The insight description"),
        impact: z
          .enum(["low", "medium", "high"])
          .describe("Impact level of this insight"),
        category: z
          .enum(["cost", "revenue", "efficiency", "trend", "risk"])
          .describe("Category of insight"),
      })
    )
    .describe("Enhanced insights with impact and categorization"),

  // Prioritized Recommendations
  recommendations: z
    .array(
      z.object({
        action: z.string().describe("Specific action to take"),
        priority: z
          .enum(["low", "medium", "high", "urgent"])
          .describe("Priority level"),
        estimatedImpact: z
          .string()
          .describe("Estimated financial impact of this action"),
        timeframe: z
          .enum(["immediate", "short-term", "medium-term", "long-term"])
          .describe("Recommended timeframe for implementation"),
        category: z
          .enum([
            "cost-reduction",
            "process-improvement",
            "staff-training",
            "supplier-management",
            "menu-optimization",
          ])
          .describe("Category of recommendation"),
        difficultyLevel: z
          .enum(["easy", "moderate", "difficult"])
          .describe("Implementation difficulty"),
      })
    )
    .describe("Prioritized actionable recommendations with impact estimates"),

  // Performance Metrics
  performanceMetrics: z
    .object({
      efficiency: z.number().describe("Overall cost efficiency score (0-100)"),
      budgetCompliance: z.number().describe("Budget compliance score (0-100)"),
      trendHealth: z.number().describe("Trend health score (0-100)"),
      overallScore: z
        .number()
        .describe("Overall financial health score (0-100)"),
    })
    .describe("Performance metrics and scores"),

  // Alert Level
  alertLevel: z
    .enum(["none", "low", "medium", "high", "critical"])
    .describe("Alert level for immediate attention"),

  // Next Steps
  nextSteps: z
    .array(z.string())
    .describe("Immediate next steps to take based on analysis"),
});
export type DashboardAdvisorOutput = z.infer<
  typeof DashboardAdvisorOutputSchema
>;

export async function analyzeDashboardData(
  input: DashboardAdvisorInput
): Promise<DashboardAdvisorOutput> {
  return dashboardCostAdvisorFlow(input);
}

// Enhanced AI analysis with comprehensive business intelligence
async function generateEnhancedAnalysis(
  input: DashboardAdvisorInput
): Promise<DashboardAdvisorOutput> {
  // Calculate basic metrics
  const targetDailyFoodSpend =
    (input.totalFoodRevenue * input.budgetFoodCostPct) /
    100 /
    input.numberOfDays;
  const targetDailyBeverageSpend =
    (input.totalBeverageRevenue * input.budgetBeverageCostPct) /
    100 /
    input.numberOfDays;

  const foodVariance = input.actualFoodCostPct - input.budgetFoodCostPct;
  const beverageVariance =
    input.actualBeverageCostPct - input.budgetBeverageCostPct;
  const totalVariance = Math.abs(foodVariance) + Math.abs(beverageVariance);

  const foodImpact = (input.totalFoodRevenue * foodVariance) / 100;
  const beverageImpact = (input.totalBeverageRevenue * beverageVariance) / 100;

  // Enhanced trend analysis with historical data
  const trendAnalysis = analyzeHistoricalTrends(
    foodVariance,
    beverageVariance,
    input.historicalData
  );

  // Business context analysis
  const contextualInsights = analyzeBusinessContext(
    foodVariance,
    beverageVariance,
    input.businessContext
  );

  // Category breakdown analysis
  const categoryInsights = analyzeCategoryBreakdown(
    foodVariance,
    beverageVariance,
    input.categoryBreakdown
  );

  // Outlet-specific recommendations
  const outletRecommendations = generateOutletSpecificRecommendations(
    totalVariance,
    input.outlet
  );

  // Advanced risk assessment
  const riskAssessment = performAdvancedRiskAssessment(
    input,
    foodVariance,
    beverageVariance,
    trendAnalysis
  );

  // Determine alert level with enhanced logic
  const alertLevel = determineEnhancedAlertLevel(
    totalVariance,
    trendAnalysis,
    riskAssessment,
    input.businessContext
  );

  // Generate comprehensive insights
  const enhancedInsights = generateComprehensiveInsights({
    input,
    foodVariance,
    beverageVariance,
    totalVariance,
    trendAnalysis,
    contextualInsights,
    categoryInsights,
    riskAssessment,
  });

  // Generate prioritized recommendations
  const prioritizedRecommendations = generatePrioritizedRecommendations({
    input,
    foodVariance,
    beverageVariance,
    totalVariance,
    trendAnalysis,
    riskAssessment,
    outletRecommendations,
  });

  // Calculate enhanced performance metrics
  const performanceMetrics = calculateEnhancedMetrics({
    foodVariance,
    beverageVariance,
    totalVariance,
    trendAnalysis,
    riskAssessment,
  });

  return {
    dailySpendingGuidelineFood: `Target daily food spending: $${targetDailyFoodSpend.toFixed(
      2
    )} (${input.budgetFoodCostPct.toFixed(1)}% of revenue)`,
    dailySpendingGuidelineBeverage: `Target daily beverage spending: $${targetDailyBeverageSpend.toFixed(
      2
    )} (${input.budgetBeverageCostPct.toFixed(1)}% of revenue)`,
    foodCostAnalysis: `Food cost ${input.actualFoodCostPct.toFixed(
      1
    )}% vs budget ${input.budgetFoodCostPct.toFixed(
      1
    )}%. Variance: ${foodVariance.toFixed(1)}% (${
      foodVariance > 0 ? "+" : ""
    }$${foodImpact.toFixed(2)})`,
    beverageCostAnalysis: `Beverage cost ${input.actualBeverageCostPct.toFixed(
      1
    )}% vs budget ${input.budgetBeverageCostPct.toFixed(
      1
    )}%. Variance: ${beverageVariance.toFixed(1)}% (${
      beverageVariance > 0 ? "+" : ""
    }$${beverageImpact.toFixed(2)})`,

    trendAnalysis,
    riskAssessment,
    keyInsights: enhancedInsights,
    recommendations: prioritizedRecommendations,
    performanceMetrics,
    alertLevel,

    nextSteps: generateNextSteps({
      alertLevel,
      foodVariance,
      beverageVariance,
      riskAssessment,
      prioritizedRecommendations,
    }),
  };
}

// Historical trend analysis
function analyzeHistoricalTrends(
  currentFoodVariance: number,
  currentBeverageVariance: number,
  historicalData?: Array<{
    date: string;
    foodRevenue: number;
    foodCostPct: number;
    beverageRevenue: number;
    beverageCostPct: number;
  }>
): {
  foodTrend: "improving" | "stable" | "deteriorating" | "volatile";
  beverageTrend: "improving" | "stable" | "deteriorating" | "volatile";
  trendSummary: string;
  predictiveInsight: string;
} {
  if (!historicalData || historicalData.length === 0) {
    return {
      foodTrend:
        currentFoodVariance > 2
          ? ("deteriorating" as const)
          : currentFoodVariance < -1
          ? ("improving" as const)
          : ("stable" as const),
      beverageTrend:
        currentBeverageVariance > 2
          ? ("deteriorating" as const)
          : currentBeverageVariance < -1
          ? ("improving" as const)
          : ("stable" as const),
      trendSummary: "Limited historical data available for trend analysis",
      predictiveInsight:
        "Establish consistent data collection for better trend insights",
    };
  }

  // Calculate trends over time
  const recentData = historicalData.slice(-7); // Last 7 days
  const olderData = historicalData.slice(
    0,
    Math.min(7, historicalData.length - 7)
  );

  const avgRecentFoodCost =
    recentData.reduce((sum, d) => sum + d.foodCostPct, 0) / recentData.length;
  const avgOlderFoodCost =
    olderData.length > 0
      ? olderData.reduce((sum, d) => sum + d.foodCostPct, 0) / olderData.length
      : avgRecentFoodCost;

  const avgRecentBevCost =
    recentData.reduce((sum, d) => sum + d.beverageCostPct, 0) /
    recentData.length;
  const avgOlderBevCost =
    olderData.length > 0
      ? olderData.reduce((sum, d) => sum + d.beverageCostPct, 0) /
        olderData.length
      : avgRecentBevCost;

  const foodTrendChange = avgRecentFoodCost - avgOlderFoodCost;
  const bevTrendChange = avgRecentBevCost - avgOlderBevCost;

  // Determine volatility
  const foodVolatility = calculateVolatility(
    historicalData.map((d) => d.foodCostPct)
  );
  const beverageVolatility = calculateVolatility(
    historicalData.map((d) => d.beverageCostPct)
  );

  return {
    foodTrend:
      foodVolatility > 3
        ? ("volatile" as const)
        : foodTrendChange > 1
        ? ("deteriorating" as const)
        : foodTrendChange < -1
        ? ("improving" as const)
        : ("stable" as const),
    beverageTrend:
      beverageVolatility > 2
        ? ("volatile" as const)
        : bevTrendChange > 1
        ? ("deteriorating" as const)
        : bevTrendChange < -1
        ? ("improving" as const)
        : ("stable" as const),
    trendSummary: `${historicalData.length}-day analysis shows ${
      foodTrendChange > 0
        ? "rising"
        : foodTrendChange < 0
        ? "declining"
        : "stable"
    } food costs and ${
      bevTrendChange > 0
        ? "rising"
        : bevTrendChange < 0
        ? "declining"
        : "stable"
    } beverage costs`,
    predictiveInsight: generatePredictiveInsight(
      foodTrendChange,
      bevTrendChange,
      foodVolatility,
      beverageVolatility
    ),
  };
}

// Calculate standard deviation for volatility
function calculateVolatility(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length;
  return Math.sqrt(variance);
}

// Generate predictive insights
function generatePredictiveInsight(
  foodTrend: number,
  beverageTrend: number,
  foodVolatility: number,
  beverageVolatility: number
): string {
  if (foodVolatility > 3 || beverageVolatility > 2) {
    return "High cost volatility detected - implement stronger cost controls and review supplier stability";
  }
  if (foodTrend > 2 || beverageTrend > 1.5) {
    return "Rising cost trends suggest need for immediate intervention to prevent budget overruns";
  }
  if (foodTrend < -1 && beverageTrend < -1) {
    return "Positive cost trends indicate effective management - maintain current strategies";
  }
  return "Cost trends are stable - continue monitoring and maintain current operational standards";
}

// Business context analysis
function analyzeBusinessContext(
  foodVariance: number,
  beverageVariance: number,
  context?: {
    season?: "spring" | "summer" | "fall" | "winter";
    dayOfWeek?: string;
    specialEvents?: string[];
    marketConditions?: string;
    staffingLevel?: "understaffed" | "normal" | "overstaffed";
  }
): string[] {
  const insights: string[] = [];

  if (!context) return insights;

  // Seasonal context
  if (context.season) {
    const seasonalExpectations = {
      summer: "Higher beverage costs expected due to increased demand",
      winter: "Food costs may rise due to seasonal ingredient pricing",
      spring: "Ingredient costs typically stabilize after winter fluctuations",
      fall: "Harvest season may provide cost advantages for fresh ingredients",
    };
    insights.push(seasonalExpectations[context.season]);
  }

  // Staffing impact
  if (context.staffingLevel) {
    if (
      context.staffingLevel === "understaffed" &&
      (foodVariance > 1 || beverageVariance > 1)
    ) {
      insights.push(
        "Understaffing may be contributing to higher costs due to operational inefficiencies"
      );
    } else if (context.staffingLevel === "overstaffed") {
      insights.push(
        "Consider optimizing staff levels to improve cost efficiency"
      );
    }
  }

  // Special events impact
  if (context.specialEvents && context.specialEvents.length > 0) {
    insights.push(
      `Special events (${context.specialEvents.join(
        ", "
      )}) may explain cost variations from normal operations`
    );
  }

  // Market conditions
  if (context.marketConditions) {
    insights.push(`Market conditions: ${context.marketConditions}`);
  }

  return insights;
}

// Category breakdown analysis
function analyzeCategoryBreakdown(
  foodVariance: number,
  beverageVariance: number,
  breakdown?: {
    food?: Array<{ category: string; costPct: number; revenue: number }>;
    beverage?: Array<{ category: string; costPct: number; revenue: number }>;
  }
): string[] {
  const insights: string[] = [];

  if (!breakdown) return insights;

  // Analyze food categories
  if (breakdown.food && breakdown.food.length > 0) {
    const highestCostCategory = breakdown.food.reduce((max, cat) =>
      cat.costPct > max.costPct ? cat : max
    );
    const totalFoodRevenue = breakdown.food.reduce(
      (sum, cat) => sum + cat.revenue,
      0
    );
    const categoryImpact =
      (highestCostCategory.revenue / totalFoodRevenue) * 100;

    insights.push(
      `${
        highestCostCategory.category
      } has highest food cost at ${highestCostCategory.costPct.toFixed(
        1
      )}% (${categoryImpact.toFixed(1)}% of food revenue)`
    );
  }

  // Analyze beverage categories
  if (breakdown.beverage && breakdown.beverage.length > 0) {
    const highestCostCategory = breakdown.beverage.reduce((max, cat) =>
      cat.costPct > max.costPct ? cat : max
    );
    const totalBevRevenue = breakdown.beverage.reduce(
      (sum, cat) => sum + cat.revenue,
      0
    );
    const categoryImpact =
      (highestCostCategory.revenue / totalBevRevenue) * 100;

    insights.push(
      `${
        highestCostCategory.category
      } has highest beverage cost at ${highestCostCategory.costPct.toFixed(
        1
      )}% (${categoryImpact.toFixed(1)}% of beverage revenue)`
    );
  }

  return insights;
}

// Helper functions for enhanced analysis
function generateOutletSpecificRecommendations(
  totalVariance: number,
  outlet?: {
    name: string;
    type: "restaurant" | "cafe" | "bar" | "hotel" | "catering";
    capacity?: number;
    location?: string;
  }
): string[] {
  const recommendations: string[] = [];

  if (!outlet) return recommendations;

  // Type-specific recommendations
  switch (outlet.type) {
    case "restaurant":
      if (totalVariance > 3) {
        recommendations.push(
          "Review menu engineering to optimize high-margin items"
        );
        recommendations.push(
          "Implement portion control training for kitchen staff"
        );
      }
      break;
    case "bar":
      if (totalVariance > 2) {
        recommendations.push(
          "Audit beverage inventory and reduce over-pouring"
        );
        recommendations.push("Review cocktail recipes for consistency");
      }
      break;
    case "cafe":
      if (totalVariance > 2) {
        recommendations.push("Optimize coffee bean usage and minimize waste");
        recommendations.push("Review pastry and food item freshness rotation");
      }
      break;
    case "hotel":
      if (totalVariance > 3) {
        recommendations.push("Coordinate F&B costs across all hotel outlets");
        recommendations.push(
          "Leverage hotel purchasing power for better supplier rates"
        );
      }
      break;
    case "catering":
      if (totalVariance > 2) {
        recommendations.push(
          "Improve event cost estimation and portion planning"
        );
        recommendations.push(
          "Negotiate better rates for bulk ingredient purchases"
        );
      }
      break;
  }

  // Capacity-based recommendations
  if (outlet.capacity) {
    if (outlet.capacity > 100 && totalVariance > 2) {
      recommendations.push(
        "Implement economies of scale for high-volume operations"
      );
    } else if (outlet.capacity < 50 && totalVariance > 3) {
      recommendations.push(
        "Focus on high-margin items to offset smaller scale"
      );
    }
  }

  return recommendations;
}

function performAdvancedRiskAssessment(
  input: DashboardAdvisorInput,
  foodVariance: number,
  beverageVariance: number,
  trendAnalysis: any
): {
  overallRiskLevel: "low" | "medium" | "high" | "critical";
  riskFactors: string[];
  mitigation: string[];
} {
  const riskFactors: string[] = [];
  const mitigation: string[] = [];

  // Cost variance risks
  if (Math.abs(foodVariance) > 5) {
    riskFactors.push("Severe food cost deviation threatens profitability");
    mitigation.push(
      "Immediate supplier renegotiation and cost control implementation"
    );
  }

  if (Math.abs(beverageVariance) > 3) {
    riskFactors.push("Beverage cost overruns affecting margins");
    mitigation.push("Review beverage pricing strategy and portion controls");
  }

  // Trend-based risks
  if (
    trendAnalysis.foodTrend === "deteriorating" ||
    trendAnalysis.beverageTrend === "deteriorating"
  ) {
    riskFactors.push("Negative cost trends indicate systemic issues");
    mitigation.push("Comprehensive operational review and process improvement");
  }

  if (
    trendAnalysis.foodTrend === "volatile" ||
    trendAnalysis.beverageTrend === "volatile"
  ) {
    riskFactors.push("High cost volatility creates unpredictable margins");
    mitigation.push(
      "Implement fixed-price supplier contracts and inventory management"
    );
  }

  // Business context risks
  if (input.businessContext?.staffingLevel === "understaffed") {
    riskFactors.push("Understaffing leading to operational inefficiencies");
    mitigation.push("Strategic hiring and cross-training programs");
  }

  // Market condition risks
  if (
    input.businessContext?.marketConditions?.toLowerCase().includes("inflation")
  ) {
    riskFactors.push("Inflationary pressures on ingredient costs");
    mitigation.push("Menu price adjustments and supplier diversification");
  }

  // Determine overall risk level
  const totalVariance = Math.abs(foodVariance) + Math.abs(beverageVariance);
  let overallRiskLevel: "low" | "medium" | "high" | "critical";

  if (totalVariance >= 10 || riskFactors.length >= 4) {
    overallRiskLevel = "critical";
  } else if (totalVariance >= 5 || riskFactors.length >= 3) {
    overallRiskLevel = "high";
  } else if (totalVariance >= 2 || riskFactors.length >= 2) {
    overallRiskLevel = "medium";
  } else {
    overallRiskLevel = "low";
  }

  return {
    overallRiskLevel,
    riskFactors: riskFactors.slice(0, 5),
    mitigation: mitigation.slice(0, 5),
  };
}

function determineEnhancedAlertLevel(
  totalVariance: number,
  trendAnalysis: any,
  riskAssessment: any,
  businessContext?: any
): "none" | "low" | "medium" | "high" | "critical" {
  // Base alert on variance
  let baseAlert: "none" | "low" | "medium" | "high" | "critical";
  if (totalVariance >= 10) baseAlert = "critical";
  else if (totalVariance >= 5) baseAlert = "high";
  else if (totalVariance >= 2) baseAlert = "medium";
  else if (totalVariance >= 1) baseAlert = "low";
  else baseAlert = "none";

  // Escalate based on trends
  if (
    trendAnalysis.foodTrend === "deteriorating" &&
    trendAnalysis.beverageTrend === "deteriorating"
  ) {
    baseAlert = escalateAlert(baseAlert);
  }

  // Escalate based on risk assessment
  if (riskAssessment.overallRiskLevel === "critical") {
    baseAlert = "critical";
  } else if (
    riskAssessment.overallRiskLevel === "high" &&
    baseAlert !== "critical"
  ) {
    baseAlert = escalateAlert(baseAlert);
  }

  // Consider business context
  if (businessContext?.staffingLevel === "understaffed" && totalVariance > 3) {
    baseAlert = escalateAlert(baseAlert);
  }

  return baseAlert;
}

function escalateAlert(
  currentAlert: "none" | "low" | "medium" | "high" | "critical"
): "none" | "low" | "medium" | "high" | "critical" {
  switch (currentAlert) {
    case "none":
      return "low";
    case "low":
      return "medium";
    case "medium":
      return "high";
    case "high":
      return "critical";
    default:
      return currentAlert;
  }
}

function generateComprehensiveInsights(params: {
  input: DashboardAdvisorInput;
  foodVariance: number;
  beverageVariance: number;
  totalVariance: number;
  trendAnalysis: any;
  contextualInsights: string[];
  categoryInsights: string[];
  riskAssessment: any;
}): Array<{
  insight: string;
  impact: "low" | "medium" | "high";
  category: "cost" | "revenue" | "efficiency" | "trend" | "risk";
}> {
  const insights = [];
  const {
    foodVariance,
    beverageVariance,
    totalVariance,
    trendAnalysis,
    contextualInsights,
    categoryInsights,
    riskAssessment,
  } = params;

  // Core cost insights
  insights.push({
    insight: `Food costs are ${
      foodVariance > 0 ? "over" : "under"
    } budget by ${Math.abs(foodVariance).toFixed(1)}%`,
    impact:
      Math.abs(foodVariance) > 5
        ? ("high" as const)
        : Math.abs(foodVariance) > 2
        ? ("medium" as const)
        : ("low" as const),
    category: "cost" as const,
  });

  insights.push({
    insight: `Beverage costs are ${
      beverageVariance > 0 ? "over" : "under"
    } budget by ${Math.abs(beverageVariance).toFixed(1)}%`,
    impact:
      Math.abs(beverageVariance) > 3
        ? ("high" as const)
        : Math.abs(beverageVariance) > 1
        ? ("medium" as const)
        : ("low" as const),
    category: "cost" as const,
  });

  // Trend insights
  if (
    trendAnalysis.foodTrend === "deteriorating" ||
    trendAnalysis.beverageTrend === "deteriorating"
  ) {
    insights.push({
      insight:
        "Cost trends show deteriorating performance requiring intervention",
      impact: "high" as const,
      category: "trend" as const,
    });
  }

  // Risk insights
  if (
    riskAssessment.overallRiskLevel === "high" ||
    riskAssessment.overallRiskLevel === "critical"
  ) {
    insights.push({
      insight: `Overall risk level is ${riskAssessment.overallRiskLevel} - immediate action required`,
      impact: "high" as const,
      category: "risk" as const,
    });
  }

  // Efficiency insights
  insights.push({
    insight: `Total cost variance of ${totalVariance.toFixed(1)}% ${
      totalVariance > 5
        ? "requires immediate attention"
        : totalVariance > 2
        ? "needs monitoring"
        : "is within acceptable range"
    }`,
    impact:
      totalVariance > 5
        ? ("high" as const)
        : totalVariance > 2
        ? ("medium" as const)
        : ("low" as const),
    category: "efficiency" as const,
  });

  // Add contextual insights
  contextualInsights.forEach((insight) => {
    insights.push({
      insight,
      impact: "medium" as const,
      category: "trend" as const,
    });
  });

  // Add category insights
  categoryInsights.forEach((insight) => {
    insights.push({
      insight,
      impact: "medium" as const,
      category: "cost" as const,
    });
  });

  return insights.slice(0, 8); // Limit to top 8 insights
}

function generatePrioritizedRecommendations(params: {
  input: DashboardAdvisorInput;
  foodVariance: number;
  beverageVariance: number;
  totalVariance: number;
  trendAnalysis: any;
  riskAssessment: any;
  outletRecommendations: string[];
}): Array<{
  action: string;
  priority: "low" | "medium" | "high" | "urgent";
  estimatedImpact: string;
  timeframe: "immediate" | "short-term" | "medium-term" | "long-term";
  category:
    | "cost-reduction"
    | "process-improvement"
    | "staff-training"
    | "supplier-management"
    | "menu-optimization";
  difficultyLevel: "easy" | "moderate" | "difficult";
}> {
  const recommendations = [];
  const {
    foodVariance,
    beverageVariance,
    totalVariance,
    trendAnalysis,
    riskAssessment,
    outletRecommendations,
    input,
  } = params;

  // Critical food cost recommendations
  if (Math.abs(foodVariance) > 5) {
    recommendations.push({
      action:
        "Implement emergency food cost controls - audit suppliers, portions, and waste immediately",
      priority: "urgent" as const,
      estimatedImpact: `Potential savings: $${Math.abs(
        (input.totalFoodRevenue * foodVariance) / 100
      ).toFixed(0)}`,
      timeframe: "immediate" as const,
      category: "cost-reduction" as const,
      difficultyLevel: "moderate" as const,
    });
  }

  // High food cost recommendations
  if (Math.abs(foodVariance) > 2 && Math.abs(foodVariance) <= 5) {
    recommendations.push({
      action:
        "Review food purchasing strategy and implement portion control measures",
      priority: "high" as const,
      estimatedImpact: `Potential impact: $${Math.abs(
        ((input.totalFoodRevenue * foodVariance) / 100) * 0.7
      ).toFixed(0)}`,
      timeframe: "short-term" as const,
      category: "supplier-management" as const,
      difficultyLevel: "moderate" as const,
    });
  }

  // Beverage cost recommendations
  if (Math.abs(beverageVariance) > 2) {
    recommendations.push({
      action:
        "Optimize beverage operations - review pricing, portions, and inventory management",
      priority:
        Math.abs(beverageVariance) > 4
          ? ("urgent" as const)
          : ("high" as const),
      estimatedImpact: `Potential savings: $${Math.abs(
        ((input.totalBeverageRevenue * beverageVariance) / 100) * 0.6
      ).toFixed(0)}`,
      timeframe: "short-term" as const,
      category: "process-improvement" as const,
      difficultyLevel: "easy" as const,
    });
  }

  // Trend-based recommendations
  if (
    trendAnalysis.foodTrend === "deteriorating" ||
    trendAnalysis.beverageTrend === "deteriorating"
  ) {
    recommendations.push({
      action:
        "Conduct comprehensive operational review to address deteriorating cost trends",
      priority: "high" as const,
      estimatedImpact:
        "Long-term cost stabilization and improved profitability",
      timeframe: "medium-term" as const,
      category: "process-improvement" as const,
      difficultyLevel: "difficult" as const,
    });
  }

  // Staff training recommendations
  if (
    input.businessContext?.staffingLevel === "understaffed" ||
    totalVariance > 3
  ) {
    recommendations.push({
      action:
        "Implement staff training program focused on cost control and efficiency",
      priority: "medium" as const,
      estimatedImpact: "Improved operational efficiency and reduced waste",
      timeframe: "medium-term" as const,
      category: "staff-training" as const,
      difficultyLevel: "moderate" as const,
    });
  }

  // Menu optimization
  if (input.outlet?.type === "restaurant" && totalVariance > 2) {
    recommendations.push({
      action: "Perform menu engineering analysis to optimize high-margin items",
      priority: "medium" as const,
      estimatedImpact:
        "Increased profitability through strategic menu positioning",
      timeframe: "medium-term" as const,
      category: "menu-optimization" as const,
      difficultyLevel: "moderate" as const,
    });
  }

  // General monitoring recommendation
  recommendations.push({
    action:
      "Establish daily cost monitoring dashboard and weekly review meetings",
    priority: "low" as const,
    estimatedImpact: "Improved cost visibility and proactive management",
    timeframe: "long-term" as const,
    category: "process-improvement" as const,
    difficultyLevel: "easy" as const,
  });

  // Add outlet-specific recommendations
  outletRecommendations.forEach((rec) => {
    recommendations.push({
      action: rec,
      priority: "medium" as const,
      estimatedImpact: "Outlet-specific optimization and efficiency gains",
      timeframe: "medium-term" as const,
      category: "process-improvement" as const,
      difficultyLevel: "moderate" as const,
    });
  });

  // Sort by priority and return top recommendations
  const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
  return recommendations
    .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
    .slice(0, 8);
}

function calculateEnhancedMetrics(params: {
  foodVariance: number;
  beverageVariance: number;
  totalVariance: number;
  trendAnalysis: any;
  riskAssessment: any;
}): {
  efficiency: number;
  budgetCompliance: number;
  trendHealth: number;
  overallScore: number;
} {
  const {
    foodVariance,
    beverageVariance,
    totalVariance,
    trendAnalysis,
    riskAssessment,
  } = params;

  // Enhanced efficiency calculation
  let efficiency = Math.max(0, 100 - totalVariance * 5);
  if (
    trendAnalysis.foodTrend === "improving" &&
    trendAnalysis.beverageTrend === "improving"
  ) {
    efficiency += 10;
  } else if (
    trendAnalysis.foodTrend === "deteriorating" ||
    trendAnalysis.beverageTrend === "deteriorating"
  ) {
    efficiency -= 15;
  }
  efficiency = Math.min(100, Math.max(0, efficiency));

  // Enhanced budget compliance
  let budgetCompliance = Math.max(0, 100 - totalVariance * 7);
  if (Math.abs(foodVariance) <= 1 && Math.abs(beverageVariance) <= 1) {
    budgetCompliance += 15;
  }
  budgetCompliance = Math.min(100, Math.max(0, budgetCompliance));

  // Enhanced trend health
  let trendHealth = 75; // Base score
  if (
    trendAnalysis.foodTrend === "improving" &&
    trendAnalysis.beverageTrend === "improving"
  ) {
    trendHealth = 95;
  } else if (
    trendAnalysis.foodTrend === "stable" &&
    trendAnalysis.beverageTrend === "stable"
  ) {
    trendHealth = 85;
  } else if (
    trendAnalysis.foodTrend === "deteriorating" ||
    trendAnalysis.beverageTrend === "deteriorating"
  ) {
    trendHealth = 40;
  } else if (
    trendAnalysis.foodTrend === "volatile" ||
    trendAnalysis.beverageTrend === "volatile"
  ) {
    trendHealth = 30;
  }

  // Risk adjustment
  if (riskAssessment.overallRiskLevel === "critical") {
    trendHealth -= 20;
  } else if (riskAssessment.overallRiskLevel === "high") {
    trendHealth -= 10;
  }

  trendHealth = Math.min(100, Math.max(0, trendHealth));

  // Overall score with enhanced weighting
  const overallScore = Math.round(
    efficiency * 0.3 + budgetCompliance * 0.4 + trendHealth * 0.3
  );

  return {
    efficiency: Math.round(efficiency),
    budgetCompliance: Math.round(budgetCompliance),
    trendHealth: Math.round(trendHealth),
    overallScore,
  };
}

function generateNextSteps(params: {
  alertLevel: string;
  foodVariance: number;
  beverageVariance: number;
  riskAssessment: any;
  prioritizedRecommendations: any[];
}): string[] {
  const steps: string[] = [];
  const {
    alertLevel,
    foodVariance,
    beverageVariance,
    riskAssessment,
    prioritizedRecommendations,
  } = params;

  // Critical steps based on alert level
  if (alertLevel === "critical") {
    steps.push("Convene emergency cost control meeting");
    steps.push("Implement immediate cost containment measures");
  } else if (alertLevel === "high") {
    steps.push("Schedule urgent management review");
    steps.push("Initiate cost reduction action plan");
  }

  // Specific variance steps
  if (Math.abs(foodVariance) > 3) {
    steps.push("Audit food operations and supplier contracts");
  }
  if (Math.abs(beverageVariance) > 2) {
    steps.push("Review beverage inventory and pricing strategy");
  }

  // Risk-based steps
  if (
    riskAssessment.overallRiskLevel === "high" ||
    riskAssessment.overallRiskLevel === "critical"
  ) {
    steps.push("Execute risk mitigation strategies immediately");
  }

  // Add top recommendation as next step
  if (prioritizedRecommendations.length > 0) {
    steps.push(`Priority action: ${prioritizedRecommendations[0].action}`);
  }

  // General monitoring
  if (steps.length < 3) {
    steps.push("Continue daily cost monitoring and trend analysis");
  }

  return steps.slice(0, 5);
}

const dashboardCostAdvisorFlow = ai.defineFlow(
  {
    name: "dashboardCostAdvisorFlow",
    inputSchema: DashboardAdvisorInputSchema,
    outputSchema: DashboardAdvisorOutputSchema,
  },
  async (input) => {
    try {
      // Enhanced input validation
      if (!input.numberOfDays || input.numberOfDays <= 0) {
        throw new Error("Number of days must be a positive number");
      }
      if (!input.totalFoodRevenue || input.totalFoodRevenue < 0) {
        throw new Error("Food revenue must be a non-negative number");
      }
      if (!input.totalBeverageRevenue || input.totalBeverageRevenue < 0) {
        throw new Error("Beverage revenue must be a non-negative number");
      }
      if (
        typeof input.actualFoodCostPct !== "number" ||
        input.actualFoodCostPct < 0
      ) {
        throw new Error(
          "Actual food cost percentage must be a non-negative number"
        );
      }
      if (
        typeof input.budgetFoodCostPct !== "number" ||
        input.budgetFoodCostPct < 0
      ) {
        throw new Error(
          "Budget food cost percentage must be a non-negative number"
        );
      }
      if (
        typeof input.actualBeverageCostPct !== "number" ||
        input.actualBeverageCostPct < 0
      ) {
        throw new Error(
          "Actual beverage cost percentage must be a non-negative number"
        );
      }
      if (
        typeof input.budgetBeverageCostPct !== "number" ||
        input.budgetBeverageCostPct < 0
      ) {
        throw new Error(
          "Budget beverage cost percentage must be a non-negative number"
        );
      }

      console.log(
        "Using enhanced AI analysis with comprehensive business intelligence"
      );

      // Use the enhanced analysis system
      return await generateEnhancedAnalysis(input);
    } catch (error) {
      console.error("Dashboard cost advisor flow error:", error);
      console.error(
        "Input data that caused error:",
        JSON.stringify(input, null, 2)
      );

      // Final fallback
      throw new Error(
        `Enhanced cost analysis failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
);
