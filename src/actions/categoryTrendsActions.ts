"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { startOfDay, endOfDay, subDays, format, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export interface CategoryTrendData {
  categoryId: number;
  categoryName: string;
  categoryType: "Food" | "Beverage";
  
  // Overall Performance
  totalCost: number;
  averageDailyCost: number;
  percentageOfTotalCost: number;
  
  // Trend Analysis
  trendDirection: "Increasing" | "Decreasing" | "Stable";
  trendPercentage: number; // Percentage change over the period
  volatility: number; // Standard deviation of daily costs
  
  // Time Series Data
  dailyData: {
    date: Date;
    cost: number;
    percentage: number;
  }[];
  
  weeklyData: {
    weekStart: Date;
    weekEnd: Date;
    totalCost: number;
    averageDailyCost: number;
    percentage: number;
  }[];
  
  monthlyData: {
    monthStart: Date;
    monthEnd: Date;
    totalCost: number;
    averageDailyCost: number;
    percentage: number;
  }[];
  
  // Performance Metrics
  highestCostDay: {
    date: Date;
    cost: number;
  };
  lowestCostDay: {
    date: Date;
    cost: number;
  };
  
  // Outlet breakdown
  outletBreakdown: {
    outletId: number;
    outletName: string;
    totalCost: number;
    percentage: number;
    trend: "Increasing" | "Decreasing" | "Stable";
  }[];
  
  // Seasonal patterns
  seasonalPattern: {
    hasPattern: boolean;
    patternType: "Weekly" | "Monthly" | "None";
    peakDays: string[];
    lowDays: string[];
  };
  
  // Rankings
  rankByCost: number;
  rankByGrowth: number;
  rankByVolatility: number;
}

export interface CategoryComparisonData {
  currentPeriod: {
    totalCost: number;
    averageDailyCost: number;
    categoryCount: number;
  };
  previousPeriod: {
    totalCost: number;
    averageDailyCost: number;
    categoryCount: number;
  };
  growth: {
    totalCostGrowth: number;
    averageGrowth: number;
    trend: "Improving" | "Declining" | "Stable";
  };
}

export interface CategoryPerformanceTrendsReport {
  dateRange: {
    from: Date;
    to: Date;
  };
  reportTitle: string;
  
  // Summary Statistics
  summary: {
    totalCategories: number;
    foodCategories: number;
    beverageCategories: number;
    totalCost: number;
    averageDailyCost: number;
    mostExpensiveCategory: {
      name: string;
      cost: number;
      type: "Food" | "Beverage";
    };
    fastestGrowingCategory: {
      name: string;
      growth: number;
      type: "Food" | "Beverage";
    };
    mostVolatileCategory: {
      name: string;
      volatility: number;
      type: "Food" | "Beverage";
    };
  };
  
  // Category Data
  foodCategories: CategoryTrendData[];
  beverageCategories: CategoryTrendData[];
  
  // Comparative Analysis
  foodVsBeverage: {
    foodTotal: number;
    beverageTotal: number;
    foodPercentage: number;
    beveragePercentage: number;
    foodGrowth: number;
    beverageGrowth: number;
  };
  
  // Period Comparisons
  periodComparison: CategoryComparisonData;
  
  // Trend Insights
  insights: {
    trendingUp: string[];
    trendingDown: string[];
    mostStable: string[];
    recommendations: string[];
    keyFindings: string[];
  };
  
  // Overall Trends
  overallTrends: {
    totalCostTrend: "Increasing" | "Decreasing" | "Stable";
    avgCostTrend: "Increasing" | "Decreasing" | "Stable";
    categoryMix: {
      date: Date;
      foodPercentage: number;
      beveragePercentage: number;
    }[];
  };
  
  propertyInfo?: {
    id: number;
    name: string;
  };
}

export async function getCategoryPerformanceTrendsReportAction(
  startDate: Date,
  endDate: Date,
  outletId?: string,
  propertyId?: string
): Promise<CategoryPerformanceTrendsReport> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    const normalizedStartDate = startOfDay(startDate);
    const normalizedEndDate = endOfDay(endDate);

    // Determine access permissions
    let selectedProperty = null;
    let whereClause: any = {};

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

    // Add outlet filter if specified
    if (outletId && outletId !== "all") {
      whereClause.outletId = parseInt(outletId);
    }

    // Add date range filter
    whereClause.date = {
      gte: normalizedStartDate,
      lte: normalizedEndDate
    };

    // Fetch all categories
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });

    // Fetch food cost entries with details
    const foodCostEntries = await prisma.foodCostEntry.findMany({
      where: whereClause,
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

    // Fetch beverage cost entries with details
    const beverageCostEntries = await prisma.beverageCostEntry.findMany({
      where: whereClause,
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

    // Calculate total costs for percentage calculations
    const totalFoodCost = foodCostEntries.reduce((sum, entry) => 
      sum + entry.details.reduce((detailSum, detail) => detailSum + detail.cost, 0), 0
    );
    
    const totalBeverageCost = beverageCostEntries.reduce((sum, entry) => 
      sum + entry.details.reduce((detailSum, detail) => detailSum + detail.cost, 0), 0
    );
    
    const totalCost = totalFoodCost + totalBeverageCost;
    const daysInPeriod = Math.ceil((normalizedEndDate.getTime() - normalizedStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Process food categories
    const foodCategories: CategoryTrendData[] = [];
    const foodCategoriesMap = new Map();

    // Aggregate food category data
    foodCostEntries.forEach(entry => {
      entry.details.forEach(detail => {
        if (detail.category.type === "Food") {
          const categoryId = detail.categoryId;
          if (!foodCategoriesMap.has(categoryId)) {
            foodCategoriesMap.set(categoryId, {
              categoryId: detail.categoryId,
              categoryName: detail.category.name,
              categoryType: "Food" as const,
              costs: [],
              outletCosts: new Map()
            });
          }
          
          const categoryData = foodCategoriesMap.get(categoryId);
          categoryData.costs.push({
            date: entry.date,
            cost: detail.cost,
            outletId: entry.outlet.id,
            outletName: entry.outlet.name
          });

          // Track by outlet
          const outletKey = entry.outlet.id;
          if (!categoryData.outletCosts.has(outletKey)) {
            categoryData.outletCosts.set(outletKey, {
              outletId: entry.outlet.id,
              outletName: entry.outlet.name,
              costs: []
            });
          }
          categoryData.outletCosts.get(outletKey).costs.push({
            date: entry.date,
            cost: detail.cost
          });
        }
      });
    });

    // Process beverage categories
    const beverageCategories: CategoryTrendData[] = [];
    const beverageCategoriesMap = new Map();

    beverageCostEntries.forEach(entry => {
      entry.details.forEach(detail => {
        if (detail.category.type === "Beverage") {
          const categoryId = detail.categoryId;
          if (!beverageCategoriesMap.has(categoryId)) {
            beverageCategoriesMap.set(categoryId, {
              categoryId: detail.categoryId,
              categoryName: detail.category.name,
              categoryType: "Beverage" as const,
              costs: [],
              outletCosts: new Map()
            });
          }
          
          const categoryData = beverageCategoriesMap.get(categoryId);
          categoryData.costs.push({
            date: entry.date,
            cost: detail.cost,
            outletId: entry.outlet.id,
            outletName: entry.outlet.name
          });

          // Track by outlet
          const outletKey = entry.outlet.id;
          if (!categoryData.outletCosts.has(outletKey)) {
            categoryData.outletCosts.set(outletKey, {
              outletId: entry.outlet.id,
              outletName: entry.outlet.name,
              costs: []
            });
          }
          categoryData.outletCosts.get(outletKey).costs.push({
            date: entry.date,
            cost: detail.cost
          });
        }
      });
    });

    // Helper function to analyze category trends
    const analyzeCategoryTrend = (categoryData: any, totalRelevantCost: number): CategoryTrendData => {
      const costs = categoryData.costs;
      const totalCategoryCost = costs.reduce((sum: number, c: any) => sum + c.cost, 0);
      const averageDailyCost = totalCategoryCost / daysInPeriod;
      const percentageOfTotalCost = totalRelevantCost > 0 ? (totalCategoryCost / totalRelevantCost) * 100 : 0;

      // Generate daily data
      const dailyAggregates = new Map();
      costs.forEach((cost: any) => {
        const dateKey = format(cost.date, 'yyyy-MM-dd');
        if (!dailyAggregates.has(dateKey)) {
          dailyAggregates.set(dateKey, { date: cost.date, cost: 0 });
        }
        dailyAggregates.get(dateKey).cost += cost.cost;
      });

      const dailyData = Array.from(dailyAggregates.values()).map(day => ({
        date: day.date,
        cost: day.cost,
        percentage: totalRelevantCost > 0 ? (day.cost / totalRelevantCost) * 100 : 0
      })).sort((a, b) => a.date.getTime() - b.date.getTime());

      // Calculate trend
      const firstHalf = dailyData.slice(0, Math.floor(dailyData.length / 2));
      const secondHalf = dailyData.slice(Math.floor(dailyData.length / 2));
      
      const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((sum, d) => sum + d.cost, 0) / firstHalf.length : 0;
      const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((sum, d) => sum + d.cost, 0) / secondHalf.length : 0;
      
      let trendDirection: "Increasing" | "Decreasing" | "Stable" = "Stable";
      let trendPercentage = 0;
      
      if (firstHalfAvg > 0) {
        trendPercentage = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
        if (trendPercentage > 5) trendDirection = "Increasing";
        else if (trendPercentage < -5) trendDirection = "Decreasing";
      }

      // Calculate volatility (standard deviation)
      const dailyCosts = dailyData.map(d => d.cost);
      const mean = dailyCosts.reduce((sum, cost) => sum + cost, 0) / dailyCosts.length;
      const variance = dailyCosts.reduce((sum, cost) => sum + Math.pow(cost - mean, 2), 0) / dailyCosts.length;
      const volatility = Math.sqrt(variance);

      // Find highest and lowest cost days
      const sortedDays = [...dailyData].sort((a, b) => b.cost - a.cost);
      const highestCostDay = sortedDays[0] || { date: normalizedStartDate, cost: 0 };
      const lowestCostDay = sortedDays[sortedDays.length - 1] || { date: normalizedStartDate, cost: 0 };

      // Generate weekly data
      const weeks = eachWeekOfInterval({ start: normalizedStartDate, end: normalizedEndDate });
      const weeklyData = weeks.map(weekStart => {
        const weekEnd = endOfWeek(weekStart);
        const weekCosts = dailyData.filter(d => d.date >= weekStart && d.date <= weekEnd);
        const weekTotal = weekCosts.reduce((sum, d) => sum + d.cost, 0);
        const weekAvg = weekCosts.length > 0 ? weekTotal / weekCosts.length : 0;
        
        return {
          weekStart,
          weekEnd,
          totalCost: weekTotal,
          averageDailyCost: weekAvg,
          percentage: totalRelevantCost > 0 ? (weekTotal / totalRelevantCost) * 100 : 0
        };
      });

      // Generate monthly data (if period spans multiple months)
      const months = eachMonthOfInterval({ start: normalizedStartDate, end: normalizedEndDate });
      const monthlyData = months.map(monthStart => {
        const monthEnd = endOfMonth(monthStart);
        const monthCosts = dailyData.filter(d => d.date >= monthStart && d.date <= monthEnd);
        const monthTotal = monthCosts.reduce((sum, d) => sum + d.cost, 0);
        const monthAvg = monthCosts.length > 0 ? monthTotal / monthCosts.length : 0;
        
        return {
          monthStart,
          monthEnd,
          totalCost: monthTotal,
          averageDailyCost: monthAvg,
          percentage: totalRelevantCost > 0 ? (monthTotal / totalRelevantCost) * 100 : 0
        };
      });

      // Analyze outlet breakdown
      const outletBreakdown = Array.from(categoryData.outletCosts.values()).map((outlet: any) => {
        const outletTotal = outlet.costs.reduce((sum: number, c: any) => sum + c.cost, 0);
        const outletPercentage = totalCategoryCost > 0 ? (outletTotal / totalCategoryCost) * 100 : 0;
        
        // Calculate outlet trend
        const outletFirstHalf = outlet.costs.slice(0, Math.floor(outlet.costs.length / 2));
        const outletSecondHalf = outlet.costs.slice(Math.floor(outlet.costs.length / 2));
        const outletFirstAvg = outletFirstHalf.length > 0 ? outletFirstHalf.reduce((sum: number, c: any) => sum + c.cost, 0) / outletFirstHalf.length : 0;
        const outletSecondAvg = outletSecondHalf.length > 0 ? outletSecondHalf.reduce((sum: number, c: any) => sum + c.cost, 0) / outletSecondHalf.length : 0;
        
        let outletTrend: "Increasing" | "Decreasing" | "Stable" = "Stable";
        if (outletFirstAvg > 0) {
          const outletTrendPct = ((outletSecondAvg - outletFirstAvg) / outletFirstAvg) * 100;
          if (outletTrendPct > 5) outletTrend = "Increasing";
          else if (outletTrendPct < -5) outletTrend = "Decreasing";
        }
        
        return {
          outletId: outlet.outletId,
          outletName: outlet.outletName,
          totalCost: outletTotal,
          percentage: outletPercentage,
          trend: outletTrend
        };
      }).sort((a, b) => b.totalCost - a.totalCost);

      // Analyze seasonal patterns
      const dayOfWeekCosts = new Map();
      dailyData.forEach(d => {
        const dayOfWeek = format(d.date, 'EEEE');
        if (!dayOfWeekCosts.has(dayOfWeek)) {
          dayOfWeekCosts.set(dayOfWeek, []);
        }
        dayOfWeekCosts.get(dayOfWeek).push(d.cost);
      });

      const dayAverages = Array.from(dayOfWeekCosts.entries()).map(([day, costs]) => ({
        day,
        average: costs.reduce((sum: number, cost: number) => sum + cost, 0) / costs.length
      }));

      const maxDayAvg = Math.max(...dayAverages.map(d => d.average));
      const minDayAvg = Math.min(...dayAverages.map(d => d.average));
      const avgRange = maxDayAvg - minDayAvg;
      const avgMean = dayAverages.reduce((sum, d) => sum + d.average, 0) / dayAverages.length;

      const hasWeeklyPattern = avgRange > (avgMean * 0.2); // 20% variation indicates pattern
      const peakDays = dayAverages.filter(d => d.average > avgMean + (avgRange * 0.3)).map(d => d.day);
      const lowDays = dayAverages.filter(d => d.average < avgMean - (avgRange * 0.3)).map(d => d.day);

      return {
        categoryId: categoryData.categoryId,
        categoryName: categoryData.categoryName,
        categoryType: categoryData.categoryType,
        totalCost: totalCategoryCost,
        averageDailyCost,
        percentageOfTotalCost,
        trendDirection,
        trendPercentage,
        volatility,
        dailyData,
        weeklyData,
        monthlyData,
        highestCostDay,
        lowestCostDay,
        outletBreakdown,
        seasonalPattern: {
          hasPattern: hasWeeklyPattern,
          patternType: hasWeeklyPattern ? "Weekly" : "None",
          peakDays,
          lowDays
        },
        rankByCost: 0, // Will be set after all categories are processed
        rankByGrowth: 0,
        rankByVolatility: 0
      };
    };

    // Process all food categories
    foodCategoriesMap.forEach((categoryData, categoryId) => {
      const trendData = analyzeCategoryTrend(categoryData, totalFoodCost);
      foodCategories.push(trendData);
    });

    // Process all beverage categories
    beverageCategoriesMap.forEach((categoryData, categoryId) => {
      const trendData = analyzeCategoryTrend(categoryData, totalBeverageCost);
      beverageCategories.push(trendData);
    });

    // Calculate rankings
    const allCategories = [...foodCategories, ...beverageCategories];
    
    // Rank by cost
    const costRanked = [...allCategories].sort((a, b) => b.totalCost - a.totalCost);
    allCategories.forEach(category => {
      category.rankByCost = costRanked.findIndex(c => c.categoryId === category.categoryId) + 1;
    });

    // Rank by growth
    const growthRanked = [...allCategories].sort((a, b) => b.trendPercentage - a.trendPercentage);
    allCategories.forEach(category => {
      category.rankByGrowth = growthRanked.findIndex(c => c.categoryId === category.categoryId) + 1;
    });

    // Rank by volatility
    const volatilityRanked = [...allCategories].sort((a, b) => b.volatility - a.volatility);
    allCategories.forEach(category => {
      category.rankByVolatility = volatilityRanked.findIndex(c => c.categoryId === category.categoryId) + 1;
    });

    // Calculate summary statistics
    const mostExpensiveCategory = costRanked[0] || { categoryName: "N/A", totalCost: 0, categoryType: "Food" as const };
    const fastestGrowingCategory = growthRanked[0] || { categoryName: "N/A", trendPercentage: 0, categoryType: "Food" as const };
    const mostVolatileCategory = volatilityRanked[0] || { categoryName: "N/A", volatility: 0, categoryType: "Food" as const };

    // Food vs Beverage comparison
    const foodGrowth = foodCategories.length > 0 ? foodCategories.reduce((sum, c) => sum + c.trendPercentage, 0) / foodCategories.length : 0;
    const beverageGrowth = beverageCategories.length > 0 ? beverageCategories.reduce((sum, c) => sum + c.trendPercentage, 0) / beverageCategories.length : 0;

    const foodVsBeverage = {
      foodTotal: totalFoodCost,
      beverageTotal: totalBeverageCost,
      foodPercentage: totalCost > 0 ? (totalFoodCost / totalCost) * 100 : 0,
      beveragePercentage: totalCost > 0 ? (totalBeverageCost / totalCost) * 100 : 0,
      foodGrowth,
      beverageGrowth
    };

    // Period comparison (current vs previous period)
    const periodLength = normalizedEndDate.getTime() - normalizedStartDate.getTime();
    const previousStartDate = new Date(normalizedStartDate.getTime() - periodLength);
    const previousEndDate = new Date(normalizedStartDate.getTime() - 1);

    const previousWhereClause = { ...whereClause };
    previousWhereClause.date = {
      gte: previousStartDate,
      lte: previousEndDate
    };

    const previousFoodEntries = await prisma.foodCostEntry.findMany({
      where: previousWhereClause,
      include: { details: true }
    });

    const previousBeverageEntries = await prisma.beverageCostEntry.findMany({
      where: previousWhereClause,
      include: { details: true }
    });

    const previousTotalCost = previousFoodEntries.reduce((sum, entry) => 
      sum + entry.details.reduce((detailSum, detail) => detailSum + detail.cost, 0), 0
    ) + previousBeverageEntries.reduce((sum, entry) => 
      sum + entry.details.reduce((detailSum, detail) => detailSum + detail.cost, 0), 0
    );

    const previousCategoriesCount = new Set([
      ...previousFoodEntries.flatMap(e => e.details.map(d => d.categoryId)),
      ...previousBeverageEntries.flatMap(e => e.details.map(d => d.categoryId))
    ]).size;

    const periodComparison: CategoryComparisonData = {
      currentPeriod: {
        totalCost,
        averageDailyCost: totalCost / daysInPeriod,
        categoryCount: allCategories.length
      },
      previousPeriod: {
        totalCost: previousTotalCost,
        averageDailyCost: previousTotalCost / daysInPeriod,
        categoryCount: previousCategoriesCount
      },
      growth: {
        totalCostGrowth: previousTotalCost > 0 ? ((totalCost - previousTotalCost) / previousTotalCost) * 100 : 0,
        averageGrowth: allCategories.reduce((sum, c) => sum + c.trendPercentage, 0) / Math.max(allCategories.length, 1),
        trend: "Stable"
      }
    };

    // Set trend based on growth
    if (periodComparison.growth.totalCostGrowth > 5) {
      periodComparison.growth.trend = "Declining"; // Higher costs = declining performance
    } else if (periodComparison.growth.totalCostGrowth < -5) {
      periodComparison.growth.trend = "Improving"; // Lower costs = improving performance
    }

    // Generate insights
    const trendingUp = allCategories.filter(c => c.trendDirection === "Increasing").map(c => c.categoryName);
    const trendingDown = allCategories.filter(c => c.trendDirection === "Decreasing").map(c => c.categoryName);
    const mostStable = allCategories.filter(c => c.trendDirection === "Stable").sort((a, b) => a.volatility - b.volatility).slice(0, 3).map(c => c.categoryName);

    const recommendations: string[] = [];
    const keyFindings: string[] = [];

    if (trendingUp.length > 0) {
      recommendations.push(`Monitor increasing costs in: ${trendingUp.slice(0, 3).join(", ")}. Consider supplier negotiations or portion control.`);
    }
    if (mostVolatileCategory.volatility > 100) {
      recommendations.push(`${mostVolatileCategory.categoryName} shows high cost volatility. Implement better inventory management.`);
    }
    if (foodVsBeverage.foodGrowth > 10) {
      recommendations.push("Food costs are growing rapidly. Review food procurement and preparation processes.");
    }
    if (foodVsBeverage.beverageGrowth > 10) {
      recommendations.push("Beverage costs are growing rapidly. Review beverage procurement and portion sizes.");
    }

    keyFindings.push(`${mostExpensiveCategory.categoryName} is the highest cost category at ${formatCurrency(mostExpensiveCategory.totalCost)}`);
    keyFindings.push(`${fastestGrowingCategory.categoryName} shows fastest growth at ${fastestGrowingCategory.trendPercentage.toFixed(1)}%`);
    keyFindings.push(`${trendingUp.length} categories trending up, ${trendingDown.length} trending down, ${mostStable.length} stable`);
    if (foodVsBeverage.foodPercentage > 70) {
      keyFindings.push(`Food dominates cost structure at ${foodVsBeverage.foodPercentage.toFixed(1)}% of total costs`);
    }

    // Overall trends
    const overallTrends = {
      totalCostTrend: periodComparison.growth.totalCostGrowth > 5 ? "Increasing" as const : 
                     periodComparison.growth.totalCostGrowth < -5 ? "Decreasing" as const : "Stable" as const,
      avgCostTrend: periodComparison.growth.averageGrowth > 5 ? "Increasing" as const :
                   periodComparison.growth.averageGrowth < -5 ? "Decreasing" as const : "Stable" as const,
      categoryMix: [] // Would be populated with daily food/beverage mix if needed
    };

    const reportTitle = selectedProperty 
      ? `Category Performance Trends - ${selectedProperty.name}`
      : allCategories.length === 1 
        ? `Category Analysis - ${allCategories[0].categoryName}`
        : "Category Performance Trends Report";

    return {
      dateRange: {
        from: normalizedStartDate,
        to: normalizedEndDate
      },
      reportTitle,
      summary: {
        totalCategories: allCategories.length,
        foodCategories: foodCategories.length,
        beverageCategories: beverageCategories.length,
        totalCost,
        averageDailyCost: totalCost / daysInPeriod,
        mostExpensiveCategory: {
          name: mostExpensiveCategory.categoryName,
          cost: mostExpensiveCategory.totalCost,
          type: mostExpensiveCategory.categoryType
        },
        fastestGrowingCategory: {
          name: fastestGrowingCategory.categoryName,
          growth: fastestGrowingCategory.trendPercentage,
          type: fastestGrowingCategory.categoryType
        },
        mostVolatileCategory: {
          name: mostVolatileCategory.categoryName,
          volatility: mostVolatileCategory.volatility,
          type: mostVolatileCategory.categoryType
        }
      },
      foodCategories,
      beverageCategories,
      foodVsBeverage,
      periodComparison,
      insights: {
        trendingUp,
        trendingDown,
        mostStable,
        recommendations,
        keyFindings
      },
      overallTrends,
      propertyInfo: selectedProperty
    };

  } catch (error) {
    console.error("Error generating category performance trends report:", error);
    throw new Error("Failed to generate category performance trends report");
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}