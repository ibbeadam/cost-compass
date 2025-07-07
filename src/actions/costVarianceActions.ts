"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { startOfDay, endOfDay, subDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";

export interface CategoryVarianceData {
  categoryId: number;
  categoryName: string;
  categoryType: "food" | "beverage";
  
  // Budget vs Actual
  budgetedCost: number;
  actualCost: number;
  variance: number;
  variancePercentage: number;
  
  // Performance Metrics
  budgetUtilization: number; // Actual / Budget
  overBudgetAmount: number;
  underBudgetAmount: number;
  
  // Trend Analysis
  trendDirection: "Improving" | "Deteriorating" | "Stable";
  volatility: number;
  consistencyScore: number; // How consistent the variance is
  
  // Time-based breakdown
  dailyVariances: {
    date: Date;
    budgeted: number;
    actual: number;
    variance: number;
    variancePercentage: number;
  }[];
  
  // Outlet breakdown
  outletBreakdown: {
    outletId: number;
    outletName: string;
    budgeted: number;
    actual: number;
    variance: number;
    variancePercentage: number;
  }[];
}

export interface OutletVarianceData {
  outletId: number;
  outletName: string;
  
  // Overall Performance
  totalBudgeted: number;
  totalActual: number;
  totalVariance: number;
  totalVariancePercentage: number;
  
  // Food vs Beverage
  foodVariance: {
    budgeted: number;
    actual: number;
    variance: number;
    variancePercentage: number;
  };
  
  beverageVariance: {
    budgeted: number;
    actual: number;
    variance: number;
    variancePercentage: number;
  };
  
  // Performance Rating
  performanceRating: "Excellent" | "Good" | "Average" | "Poor" | "Critical";
  riskLevel: "Low" | "Medium" | "High";
  
  // Key Issues
  majorVariances: string[];
  recommendations: string[];
}

export interface TimeSeriesVariance {
  period: Date;
  periodType: "daily" | "weekly" | "monthly";
  
  // Aggregate Metrics
  totalBudgeted: number;
  totalActual: number;
  totalVariance: number;
  totalVariancePercentage: number;
  
  // Category Breakdown
  foodVariance: number;
  beverageVariance: number;
  
  // Performance Indicators
  budgetAccuracy: number; // How close actual was to budget
  varianceStability: number; // How stable the variance was
}

export interface CostVarianceAnalysisReport {
  dateRange: {
    from: Date;
    to: Date;
  };
  reportTitle: string;
  
  // Executive Summary
  summary: {
    totalBudgeted: number;
    totalActual: number;
    overallVariance: number;
    overallVariancePercentage: number;
    
    // Performance Metrics
    budgetAccuracy: number; // Overall accuracy percentage
    categoriesOverBudget: number;
    categoriesUnderBudget: number;
    outletsOverBudget: number;
    
    // Key Insights
    worstPerformingCategory: {
      name: string;
      variance: number;
      variancePercentage: number;
    };
    
    bestPerformingCategory: {
      name: string;
      variance: number;
      variancePercentage: number;
    };
    
    mostVolatileCategory: {
      name: string;
      volatility: number;
    };
    
    // Trend Analysis
    varianceTrend: "Improving" | "Deteriorating" | "Stable";
    averageDailyVariance: number;
  };
  
  // Category Analysis
  categoryVariances: CategoryVarianceData[];
  
  // Outlet Analysis
  outletVariances: OutletVarianceData[];
  
  // Time Series Analysis
  timeSeriesAnalysis: {
    daily: TimeSeriesVariance[];
    weekly: TimeSeriesVariance[];
    monthly: TimeSeriesVariance[];
  };
  
  // Variance Distribution
  varianceDistribution: {
    significantOverBudget: CategoryVarianceData[]; // >10% over
    moderateOverBudget: CategoryVarianceData[]; // 5-10% over
    withinBudget: CategoryVarianceData[]; // -5% to +5%
    underBudget: CategoryVarianceData[]; // <-5%
  };
  
  // Predictive Insights
  predictions: {
    projectedMonthEndVariance: number;
    riskFactors: string[];
    opportunities: string[];
    recommendations: string[];
  };
  
  // Property-specific data
  propertyInfo?: {
    id: number;
    name: string;
  };
}

export async function getCostVarianceAnalysisReportAction(
  startDate: Date,
  endDate: Date,
  outletId?: string,
  propertyId?: string
): Promise<CostVarianceAnalysisReport> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    const normalizedStartDate = startOfDay(startDate);
    const normalizedEndDate = endOfDay(endDate);

    // Determine property access and build where clause
    let selectedProperty = null;
    let whereClause: any = {
      date: {
        gte: normalizedStartDate,
        lte: normalizedEndDate
      }
    };

    // Property-based filtering
    if (user.role === "super_admin") {
      if (propertyId && propertyId !== "all") {
        whereClause.propertyId = parseInt(propertyId);
        selectedProperty = await prisma.property.findUnique({
          where: { id: parseInt(propertyId) },
          select: { id: true, name: true }
        });
      }
    } else {
      // Non-super admin users can only see their accessible properties
      const userPropertyIds = user.propertyAccess?.map(access => access.propertyId) || [];
      if (userPropertyIds.length === 0) {
        throw new Error("No property access found for user");
      }
      whereClause.propertyId = { in: userPropertyIds };
    }

    // Outlet filtering
    if (outletId && outletId !== "all") {
      whereClause.outlet = {
        id: parseInt(outletId)
      };
    }

    // Get daily financial summaries (budget data)
    const budgetData = await prisma.dailyFinancialSummary.findMany({
      where: whereClause,
      include: {
        property: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { date: 'asc' }
    });

    // Get actual cost data from food and beverage cost entries
    const actualFoodCosts = await prisma.foodCostEntry.findMany({
      where: {
        date: {
          gte: normalizedStartDate,
          lte: normalizedEndDate
        },
        ...(propertyId && propertyId !== "all" ? { propertyId: parseInt(propertyId) } : 
           user.role !== "super_admin" ? { propertyId: { in: user.propertyAccess?.map(access => access.propertyId) || [] } } : {}),
        ...(outletId && outletId !== "all" ? { outletId: parseInt(outletId) } : {})
      },
      include: {
        details: {
          include: {
            category: true
          }
        },
        outlet: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { date: 'asc' }
    });

    const actualBeverageCosts = await prisma.beverageCostEntry.findMany({
      where: {
        date: {
          gte: normalizedStartDate,
          lte: normalizedEndDate
        },
        ...(propertyId && propertyId !== "all" ? { propertyId: parseInt(propertyId) } : 
           user.role !== "super_admin" ? { propertyId: { in: user.propertyAccess?.map(access => access.propertyId) || [] } } : {}),
        ...(outletId && outletId !== "all" ? { outletId: parseInt(outletId) } : {})
      },
      include: {
        details: {
          include: {
            category: true
          }
        },
        outlet: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { date: 'asc' }
    });

    // Get all categories for comprehensive analysis
    const allCategories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });

    // Get all outlets for outlet analysis
    const allOutlets = await prisma.outlet.findMany({
      where: {
        ...(propertyId && propertyId !== "all" ? { propertyId: parseInt(propertyId) } : 
           user.role !== "super_admin" ? { propertyId: { in: user.propertyAccess?.map(access => access.propertyId) || [] } } : {}),
        ...(outletId && outletId !== "all" ? { id: parseInt(outletId) } : {}),
        isActive: true
      },
      select: {
        id: true,
        name: true,
        propertyId: true
      },
      orderBy: { name: 'asc' }
    });

    const daysInPeriod = Math.ceil((normalizedEndDate.getTime() - normalizedStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Process category variance analysis
    const categoryVariances: CategoryVarianceData[] = allCategories.map(category => {
      const categoryType = category.type.toLowerCase() as "food" | "beverage";
      
      // Calculate budgeted amounts from daily financial summaries
      const categoryBudget = budgetData.reduce((sum, day) => {
        if (categoryType === "food") {
          return sum + (day.budgetFoodCost || 0);
        } else {
          return sum + (day.budgetBeverageCost || 0);
        }
      }, 0);

      // Calculate actual amounts from cost entries
      let categoryActual = 0;
      const dailyActuals: { [key: string]: number } = {};
      const outletActuals: { [key: number]: number } = {};

      if (categoryType === "food") {
        actualFoodCosts.forEach(entry => {
          entry.details.forEach(detail => {
            if (detail.categoryId === category.id) {
              categoryActual += detail.cost;
              
              const dateKey = format(entry.date, 'yyyy-MM-dd');
              dailyActuals[dateKey] = (dailyActuals[dateKey] || 0) + detail.cost;
              
              outletActuals[entry.outletId] = (outletActuals[entry.outletId] || 0) + detail.cost;
            }
          });
        });
      } else {
        actualBeverageCosts.forEach(entry => {
          entry.details.forEach(detail => {
            if (detail.categoryId === category.id) {
              categoryActual += detail.cost;
              
              const dateKey = format(entry.date, 'yyyy-MM-dd');
              dailyActuals[dateKey] = (dailyActuals[dateKey] || 0) + detail.cost;
              
              outletActuals[entry.outletId] = (outletActuals[entry.outletId] || 0) + detail.cost;
            }
          });
        });
      }

      // Calculate variance metrics
      const variance = categoryActual - categoryBudget;
      const variancePercentage = categoryBudget !== 0 ? (variance / categoryBudget) * 100 : 0;
      const budgetUtilization = categoryBudget !== 0 ? (categoryActual / categoryBudget) * 100 : 0;

      // Calculate daily variances
      const dailyVariances = eachDayOfInterval({ start: normalizedStartDate, end: normalizedEndDate }).map(date => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const dayBudget = budgetData.find(b => format(b.date, 'yyyy-MM-dd') === dateKey);
        const dayActual = dailyActuals[dateKey] || 0;
        
        const dailyBudgeted = dayBudget ? (categoryType === "food" ? (dayBudget.budgetFoodCost || 0) : (dayBudget.budgetBeverageCost || 0)) : 0;
        const dailyVariance = dayActual - dailyBudgeted;
        const dailyVariancePercentage = dailyBudgeted !== 0 ? (dailyVariance / dailyBudgeted) * 100 : 0;

        return {
          date,
          budgeted: dailyBudgeted,
          actual: dayActual,
          variance: dailyVariance,
          variancePercentage: dailyVariancePercentage
        };
      });

      // Calculate volatility (standard deviation of daily variance percentages)
      const variances = dailyVariances.map(d => d.variancePercentage).filter(v => !isNaN(v) && isFinite(v));
      const avgVariance = variances.length > 0 ? variances.reduce((sum, v) => sum + v, 0) / variances.length : 0;
      const volatility = variances.length > 1 ? 
        Math.sqrt(variances.reduce((sum, v) => sum + Math.pow(v - avgVariance, 2), 0) / (variances.length - 1)) : 0;

      // Determine trend direction
      const firstHalf = dailyVariances.slice(0, Math.floor(dailyVariances.length / 2));
      const secondHalf = dailyVariances.slice(Math.floor(dailyVariances.length / 2));
      const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((sum, d) => sum + d.variancePercentage, 0) / firstHalf.length : 0;
      const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((sum, d) => sum + d.variancePercentage, 0) / secondHalf.length : 0;
      
      let trendDirection: "Improving" | "Deteriorating" | "Stable" = "Stable";
      if (Math.abs(secondHalfAvg - firstHalfAvg) > 2) {
        trendDirection = secondHalfAvg < firstHalfAvg ? "Improving" : "Deteriorating";
      }

      // Calculate outlet breakdown
      const outletBreakdown = allOutlets.map(outlet => {
        const outletActualCost = outletActuals[outlet.id] || 0;
        const outletBudget = categoryBudget / allOutlets.length; // Simplified: equal distribution
        const outletVariance = outletActualCost - outletBudget;
        const outletVariancePercentage = outletBudget !== 0 ? (outletVariance / outletBudget) * 100 : 0;

        return {
          outletId: outlet.id,
          outletName: outlet.name,
          budgeted: outletBudget,
          actual: outletActualCost,
          variance: outletVariance,
          variancePercentage: outletVariancePercentage
        };
      });

      return {
        categoryId: category.id,
        categoryName: category.name,
        categoryType,
        budgetedCost: categoryBudget,
        actualCost: categoryActual,
        variance,
        variancePercentage,
        budgetUtilization,
        overBudgetAmount: variance > 0 ? variance : 0,
        underBudgetAmount: variance < 0 ? Math.abs(variance) : 0,
        trendDirection,
        volatility,
        consistencyScore: Math.max(0, 100 - volatility), // Higher score = more consistent
        dailyVariances,
        outletBreakdown
      };
    });

    // Process outlet variance analysis
    const outletVariances: OutletVarianceData[] = allOutlets.map(outlet => {
      // Calculate total budgeted and actual for this outlet
      const outletBudgetData = budgetData.filter(b => {
        // For simplified calculation, we distribute budget equally among outlets
        return true; // In real implementation, you might have outlet-specific budgets
      });

      const outletActualFood = actualFoodCosts
        .filter(entry => entry.outletId === outlet.id)
        .reduce((sum, entry) => sum + entry.totalFoodCost, 0);

      const outletActualBeverage = actualBeverageCosts
        .filter(entry => entry.outletId === outlet.id)
        .reduce((sum, entry) => sum + entry.totalBeverageCost, 0);

      // Simplified budget allocation (equal distribution among outlets)
      const totalBudgetFood = outletBudgetData.reduce((sum, day) => sum + (day.budgetFoodCost || 0), 0);
      const totalBudgetBeverage = outletBudgetData.reduce((sum, day) => sum + (day.budgetBeverageCost || 0), 0);
      
      const outletBudgetFood = totalBudgetFood / allOutlets.length;
      const outletBudgetBeverage = totalBudgetBeverage / allOutlets.length;

      const totalBudgeted = outletBudgetFood + outletBudgetBeverage;
      const totalActual = outletActualFood + outletActualBeverage;
      const totalVariance = totalActual - totalBudgeted;
      const totalVariancePercentage = totalBudgeted !== 0 ? (totalVariance / totalBudgeted) * 100 : 0;

      const foodVariance = {
        budgeted: outletBudgetFood,
        actual: outletActualFood,
        variance: outletActualFood - outletBudgetFood,
        variancePercentage: outletBudgetFood !== 0 ? ((outletActualFood - outletBudgetFood) / outletBudgetFood) * 100 : 0
      };

      const beverageVariance = {
        budgeted: outletBudgetBeverage,
        actual: outletActualBeverage,
        variance: outletActualBeverage - outletBudgetBeverage,
        variancePercentage: outletBudgetBeverage !== 0 ? ((outletActualBeverage - outletBudgetBeverage) / outletBudgetBeverage) * 100 : 0
      };

      // Performance rating based on variance percentage
      let performanceRating: "Excellent" | "Good" | "Average" | "Poor" | "Critical";
      const absVariancePercentage = Math.abs(totalVariancePercentage);
      if (absVariancePercentage <= 2) performanceRating = "Excellent";
      else if (absVariancePercentage <= 5) performanceRating = "Good";
      else if (absVariancePercentage <= 10) performanceRating = "Average";
      else if (absVariancePercentage <= 20) performanceRating = "Poor";
      else performanceRating = "Critical";

      // Risk level assessment
      let riskLevel: "Low" | "Medium" | "High";
      if (totalVariancePercentage > 15) riskLevel = "High";
      else if (totalVariancePercentage > 8 || absVariancePercentage > 12) riskLevel = "Medium";
      else riskLevel = "Low";

      // Generate major variances and recommendations
      const majorVariances: string[] = [];
      const recommendations: string[] = [];

      if (Math.abs(foodVariance.variancePercentage) > 10) {
        majorVariances.push(`Food costs ${foodVariance.variancePercentage > 0 ? 'over' : 'under'} budget by ${Math.abs(foodVariance.variancePercentage).toFixed(1)}%`);
      }
      if (Math.abs(beverageVariance.variancePercentage) > 10) {
        majorVariances.push(`Beverage costs ${beverageVariance.variancePercentage > 0 ? 'over' : 'under'} budget by ${Math.abs(beverageVariance.variancePercentage).toFixed(1)}%`);
      }

      if (totalVariancePercentage > 10) {
        recommendations.push("Review cost control procedures and supplier contracts");
        recommendations.push("Implement daily cost monitoring and alerts");
      }
      if (foodVariance.variancePercentage > 8) {
        recommendations.push("Analyze food waste and portion control practices");
      }
      if (beverageVariance.variancePercentage > 8) {
        recommendations.push("Review beverage pricing and inventory management");
      }

      return {
        outletId: outlet.id,
        outletName: outlet.name,
        totalBudgeted,
        totalActual,
        totalVariance,
        totalVariancePercentage,
        foodVariance,
        beverageVariance,
        performanceRating,
        riskLevel,
        majorVariances,
        recommendations
      };
    });

    // Calculate time series analysis
    const dailyTimeSeries = eachDayOfInterval({ start: normalizedStartDate, end: normalizedEndDate }).map(date => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const dayBudget = budgetData.find(b => format(b.date, 'yyyy-MM-dd') === dateKey);
      
      const dayActualFood = actualFoodCosts
        .filter(entry => format(entry.date, 'yyyy-MM-dd') === dateKey)
        .reduce((sum, entry) => sum + entry.totalFoodCost, 0);
      
      const dayActualBeverage = actualBeverageCosts
        .filter(entry => format(entry.date, 'yyyy-MM-dd') === dateKey)
        .reduce((sum, entry) => sum + entry.totalBeverageCost, 0);

      const totalBudgeted = (dayBudget?.budgetFoodCost || 0) + (dayBudget?.budgetBeverageCost || 0);
      const totalActual = dayActualFood + dayActualBeverage;
      const totalVariance = totalActual - totalBudgeted;
      const totalVariancePercentage = totalBudgeted !== 0 ? (totalVariance / totalBudgeted) * 100 : 0;

      return {
        period: date,
        periodType: "daily" as const,
        totalBudgeted,
        totalActual,
        totalVariance,
        totalVariancePercentage,
        foodVariance: dayActualFood - (dayBudget?.budgetFoodCost || 0),
        beverageVariance: dayActualBeverage - (dayBudget?.budgetBeverageCost || 0),
        budgetAccuracy: totalBudgeted !== 0 ? Math.max(0, 100 - Math.abs(totalVariancePercentage)) : 100,
        varianceStability: 0 // Would need historical data to calculate properly
      };
    });

    // Calculate summary metrics
    const totalBudgeted = categoryVariances.reduce((sum, cat) => sum + cat.budgetedCost, 0);
    const totalActual = categoryVariances.reduce((sum, cat) => sum + cat.actualCost, 0);
    const overallVariance = totalActual - totalBudgeted;
    const overallVariancePercentage = totalBudgeted !== 0 ? (overallVariance / totalBudgeted) * 100 : 0;

    const categoriesOverBudget = categoryVariances.filter(cat => cat.variance > 0).length;
    const categoriesUnderBudget = categoryVariances.filter(cat => cat.variance < 0).length;
    const outletsOverBudget = outletVariances.filter(outlet => outlet.totalVariance > 0).length;

    const worstPerformingCategory = categoryVariances.reduce((worst, current) => 
      current.variancePercentage > worst.variancePercentage ? current : worst
    );

    const bestPerformingCategory = categoryVariances.reduce((best, current) => 
      Math.abs(current.variancePercentage) < Math.abs(best.variancePercentage) ? current : best
    );

    const mostVolatileCategory = categoryVariances.reduce((mostVolatile, current) => 
      current.volatility > mostVolatile.volatility ? current : mostVolatile
    );

    // Determine overall trend
    const firstHalfVariances = dailyTimeSeries.slice(0, Math.floor(dailyTimeSeries.length / 2));
    const secondHalfVariances = dailyTimeSeries.slice(Math.floor(dailyTimeSeries.length / 2));
    const firstHalfAvg = firstHalfVariances.length > 0 ? 
      firstHalfVariances.reduce((sum, d) => sum + d.totalVariancePercentage, 0) / firstHalfVariances.length : 0;
    const secondHalfAvg = secondHalfVariances.length > 0 ? 
      secondHalfVariances.reduce((sum, d) => sum + d.totalVariancePercentage, 0) / secondHalfVariances.length : 0;
    
    let varianceTrend: "Improving" | "Deteriorating" | "Stable" = "Stable";
    if (Math.abs(secondHalfAvg - firstHalfAvg) > 2) {
      varianceTrend = secondHalfAvg < firstHalfAvg ? "Improving" : "Deteriorating";
    }

    const averageDailyVariance = dailyTimeSeries.length > 0 ? 
      dailyTimeSeries.reduce((sum, d) => sum + Math.abs(d.totalVariance), 0) / dailyTimeSeries.length : 0;

    // Categorize variances by significance
    const varianceDistribution = {
      significantOverBudget: categoryVariances.filter(cat => cat.variancePercentage > 10),
      moderateOverBudget: categoryVariances.filter(cat => cat.variancePercentage > 5 && cat.variancePercentage <= 10),
      withinBudget: categoryVariances.filter(cat => cat.variancePercentage >= -5 && cat.variancePercentage <= 5),
      underBudget: categoryVariances.filter(cat => cat.variancePercentage < -5)
    };

    // Generate predictions and recommendations
    const riskFactors: string[] = [];
    const opportunities: string[] = [];
    const recommendations: string[] = [];

    if (overallVariancePercentage > 10) {
      riskFactors.push("Overall costs significantly over budget");
      recommendations.push("Implement immediate cost control measures");
    }
    if (categoriesOverBudget > categoryVariances.length * 0.6) {
      riskFactors.push("Majority of categories exceeding budget");
      recommendations.push("Review budget allocation and forecasting accuracy");
    }
    if (mostVolatileCategory.volatility > 20) {
      riskFactors.push(`High volatility in ${mostVolatileCategory.categoryName} category`);
      recommendations.push(`Stabilize ${mostVolatileCategory.categoryName} cost management`);
    }

    if (categoriesUnderBudget > 0) {
      opportunities.push("Reallocate savings from under-budget categories");
    }
    if (bestPerformingCategory.variancePercentage < -5) {
      opportunities.push(`Apply ${bestPerformingCategory.categoryName} cost management practices to other categories`);
    }

    const reportTitle = selectedProperty 
      ? `Cost Variance Analysis Report - ${selectedProperty.name}`
      : "Cost Variance Analysis Report";

    return {
      dateRange: {
        from: normalizedStartDate,
        to: normalizedEndDate
      },
      reportTitle,
      summary: {
        totalBudgeted,
        totalActual,
        overallVariance,
        overallVariancePercentage,
        budgetAccuracy: Math.max(0, 100 - Math.abs(overallVariancePercentage)),
        categoriesOverBudget,
        categoriesUnderBudget,
        outletsOverBudget,
        worstPerformingCategory: {
          name: worstPerformingCategory.categoryName,
          variance: worstPerformingCategory.variance,
          variancePercentage: worstPerformingCategory.variancePercentage
        },
        bestPerformingCategory: {
          name: bestPerformingCategory.categoryName,
          variance: bestPerformingCategory.variance,
          variancePercentage: bestPerformingCategory.variancePercentage
        },
        mostVolatileCategory: {
          name: mostVolatileCategory.categoryName,
          volatility: mostVolatileCategory.volatility
        },
        varianceTrend,
        averageDailyVariance
      },
      categoryVariances,
      outletVariances,
      timeSeriesAnalysis: {
        daily: dailyTimeSeries,
        weekly: [], // Would implement weekly grouping
        monthly: [] // Would implement monthly grouping
      },
      varianceDistribution,
      predictions: {
        projectedMonthEndVariance: overallVariance * (30 / daysInPeriod), // Simple projection
        riskFactors,
        opportunities,
        recommendations
      },
      propertyInfo: selectedProperty
    };

  } catch (error) {
    console.error("Error generating cost variance analysis report:", error);
    throw new Error("Failed to generate cost variance analysis report");
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}