import type { Timestamp } from "firebase/firestore";

export interface Outlet {
  id: string;
  name: string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  isActive?: boolean;
  address?:
    | string
    | {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
      };
  phoneNumber?: string;
  email?: string;
  type?: string;
  currency?: string;
  timezone?: string;
  defaultBudgetFoodCostPct?: number;
  defaultBudgetBeverageCostPct?: number;
  targetOccupancy?: number;
}

export interface Item {
  id: string;
  name: string;
  category: "Food" | "Beverage";
  unit: string;
  cost_per_unit: number;
}

export interface TransferItem {
  id: string;
  itemId: string;
  itemName: string;
  category: "Food" | "Beverage";
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface DailyCostData {
  id: string;
  date: string;
  outletId: string;
  outletName: string;
  foodRevenue: number;
  foodCost: number;
  foodCostPct: number;
  beverageRevenue: number;
  beverageCost: number;
  beverageCostPct: number;
  isAnomalous?: boolean;
  anomalyExplanation?: string;
}

export interface HistoricalDataPoint {
  date: string;
  foodCostPct: number;
  beverageCostPct: number;
}

export interface CostFluctuationInput {
  outlet: string;
  date: string;
  foodCostPercentage: number;
  beverageCostPercentage: number;
  historicalFoodCostPercentages: number[];
  historicalBeverageCostPercentages: number[];
}

export interface CostFluctuationOutput {
  isAnomalous: boolean;
  explanation: string;
}

// CostDetailCategory for the existing comprehensive DailyHotelEntry
export interface TransferInItem {
  id: string;
  toOutletId: string;
  toOutletName: string;
  description: string;
  amount: number;
  category: "Food" | "Beverage";
}

export interface DirectPurchaseItem {
  id: string;
  purchaseCategory: string;
  description?: string;
  amount: number;
  costCategory: "Food" | "Beverage";
}

export interface CostAdjustmentItem {
  id: string;
  description: string;
  amount: number;
  type: "OtherCost" | "TransferOut" | "CreditAdjustment";
  costCategory: "Food" | "Beverage";
}

export interface CostDetailCategory {
  transferIns: TransferInItem[];
  directPurchases: DirectPurchaseItem[];
  otherAdjustments: CostAdjustmentItem[];
  transfersOut: CostAdjustmentItem[];
  creditAdjustments: CostAdjustmentItem[];
}

// Existing comprehensive DailyHotelEntry type (may be refactored/deprecated later)
export interface DailyHotelEntry {
  id: string;
  date: Timestamp | Date;
  hotelNetSales?: number;
  hotelNetFoodSales?: number;
  budgetHotelFoodCostPct?: number;
  entFood?: number;
  ocFood?: number;
  otherFoodCredit?: number;
  hotelNetBeverageSales?: number;
  budgetHotelBeverageCostPct?: number;
  entBeverage?: number;
  ocBeverage?: number;
  otherBeverageCredit?: number;
  foodCostDetails?: CostDetailCategory;
  beverageCostDetails?: CostDetailCategory;
  notes?: string;
  userId?: string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  calculatedNetFoodCost?: number;
  calculatedActualFoodCostPct?: number;
  calculatedFoodCostVariancePct?: number;
  calculatedNetBeverageCost?: number;
  calculatedActualBeverageCostPct?: number;
  calculatedBeverageCostVariancePct?: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  type: "Food" | "Beverage";
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

// --- NEW TYPES BASED ON USER'S DETAILED SPECIFICATION ---

export interface DailyFinancialSummary {
  id: string; // Document ID, format YYYY-MM-DD
  date: Timestamp | Date; // Firestore Timestamp or JS Date
  outlet_id: string;

  // Renamed revenue fields
  actual_food_revenue: number; // Renamed from 'food_revenue' - Actual food revenue for the day
  actual_beverage_revenue: number; // Renamed from 'beverage_revenue' - Actual beverage revenue for the day

  // New budget fields
  budget_food_revenue: number; // Budgeted food revenue for the day
  budget_beverage_revenue: number; // Budgeted beverage revenue for the day
  budget_food_cost: number; // Budgeted food cost for the day
  budget_beverage_cost: number; // Budgeted beverage cost for the day

  gross_food_cost: number; // Sum of all FoodCostEntry.total_food_cost for the day
  gross_beverage_cost: number; // Sum of all BeverageCostEntry.total_beverage_cost for the day
  net_food_cost: number; // gross_food_cost - ent_food - oc_food - other_food_adjustment
  net_beverage_cost: number; // gross_beverage_cost - entertainment_beverage_cost - officer_check_comp_beverage - other_beverage_adjustments
  total_adjusted_food_cost: number; // Adjusted for transfers, credits etc.
  total_adjusted_beverage_cost: number; // Adjusted for transfers, credits etc.
  total_covers: number; // Total number of customers/guests served
  average_check: number; // actual_food_revenue / total_covers

  budget_food_cost_pct: number; // Budgeted food cost percentage
  budget_beverage_cost_pct: number; // Budgeted beverage cost percentage

  ent_food: number; // Entertainment Food cost (changed from 'entertainment_food_cost')
  oc_food: number; // Officer's Check Food / Complimentary Food cost (changed from 'officer_check_comp_food')
  other_food_adjustment: number; // Other food related adjustments (e.g., spoilage, staff meals if treated as cost) (changed from 'other_food_adjustments')

  entertainment_beverage_cost: number; // Entertainment Beverage cost
  officer_check_comp_beverage: number; // Officer's Check Beverage / Complimentary Beverage cost
  other_beverage_adjustments: number; // Other beverage related adjustments

  // Calculated fields (will be populated later or calculated on the fly)
  actual_food_cost?: number | null;
  actual_food_cost_pct?: number | null;
  food_variance_pct?: number | null;

  actual_beverage_cost?: number | null;
  actual_beverage_cost_pct?: number | null;
  beverage_variance_pct?: number | null;

  notes?: string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface FoodCostEntry {
  id: string; // Firestore auto-ID
  date: Timestamp | Date;
  outlet_id: string;
  total_food_cost: number;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface FoodCostDetail {
  id: string; // Firestore auto-ID
  food_cost_entry_id: string; // FK to FoodCostEntries collection (document ID)
  category_id: string;
  categoryName?: string; // Denormalized for display convenience
  cost: number;
  description?: string; // Optional: e.g., "Purchase from Sysco" or "Meat - Beef Tenderloin"
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface BeverageCostEntry {
  id: string; // Firestore auto-ID
  date: Timestamp | Date;
  outlet_id: string;
  total_beverage_cost: number;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface BeverageCostDetail {
  id: string; // Firestore auto-ID
  beverage_cost_entry_id: string; // FK to BeverageCostEntries collection (document ID)
  category_id: string;
  categoryName?: string; // Denormalized for display convenience
  cost: number;
  description?: string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

// Types for the new Dashboard
export interface SummaryStat {
  title: string;
  value: string;
  percentageChange?: number;
  icon: React.ElementType;
  iconColor?: string;
}

export interface ChartDataPoint {
  date: string; // e.g., "MMM dd"
  foodCostPct: number;
  beverageCostPct: number;
  outletName?: string; // Optional for multi-outlet views
}

export interface DonutChartDataPoint {
  name: string;
  value: number;
  fill: string;
}

export interface OutletPerformanceDataPoint {
  id: string;
  outletName: string;
  metricName: string;
  value: string | number;
  metricValue: number; // raw value for sorting
  trend?: "up" | "down" | "neutral";
}

export interface TopCategoryDataPoint {
  name: string;
  value: number; // Total cost
}

export interface DetailedFoodCostReport {
  outletName: string;
  outletId: string;
  dateRange: { from: Date; to: Date };
  categoryCosts: {
    categoryName: string;
    totalCost: number;
    percentageOfTotalCost?: number;
  }[];
  totalCostFromTransfers: number; // Total cost from food cost entries
  otherAdjustmentsFood: number; // Other food adjustments from daily summary
  ocFoodTotal: number; // Officer check food from daily summary
  entFoodTotal: number; // Entertainment food from daily summary
  totalCostOfFood: number; // Calculated as: totalCostFromTransfers - ocFoodTotal - entFoodTotal + otherAdjustmentsFood
  totalFoodRevenue: number; // Total food revenue from daily summary
  foodCostPercentage: number; // Calculated as: (totalCostOfFood / totalFoodRevenue) * 100
  budgetFoodCostPercentage: number; // Average budget food cost percentage from daily summary
  variancePercentage: number; // Calculated as: foodCostPercentage - budgetFoodCostPercentage
  foodCostDetailsByItem: {
    categoryName: string;
    description: string;
    cost: number;
    percentageOfTotalCost?: number;
  }[];
}

export interface DetailedFoodCostReportResponse {
  outletReports: DetailedFoodCostReport[];
  overallSummaryReport: DetailedFoodCostReport;
}

export interface DetailedBeverageCostReport {
  outletName: string;
  outletId: string;
  dateRange: { from: Date; to: Date };
  categoryCosts: { categoryName: string; totalCost: number }[];
  totalCostFromTransfers: number; // Total cost from beverage cost entries
  otherAdjustmentsBeverage: number; // Other beverage adjustments from daily summary
  ocBeverageTotal: number; // Officer check beverage from daily summary
  entBeverageTotal: number; // Entertainment beverage from daily summary
  totalCostOfBeverage: number; // Calculated as: totalCostFromTransfers - ocBeverageTotal - entBeverageTotal + otherAdjustmentsBeverage
  totalBeverageRevenue: number; // Total beverage revenue from daily summary
  beverageCostPercentage: number; // Calculated as: (totalCostOfBeverage / totalBeverageRevenue) * 100
  budgetBeverageCostPercentage: number; // Average budget beverage cost percentage from daily summary
  variancePercentage: number; // Calculated as: beverageCostPercentage - budgetBeverageCostPercentage
  beverageCostDetailsByItem: {
    categoryName: string;
    description: string;
    cost: number;
  }[];
}

export interface DetailedBeverageCostReportResponse {
  outletReports: DetailedBeverageCostReport[];
  overallSummaryReport: DetailedBeverageCostReport;
}

export interface MonthlyProfitLossReport {
  monthYear: string; // e.g., "June 2024" or "Jan 01, 2024 - Jan 31, 2024"
  totalFoodRevenue: number;
  totalBeverageRevenue: number;
  totalRevenue: number;
  totalActualFoodCost: number;
  totalActualBeverageCost: number;
  totalActualCost: number;
  grossProfit: number;
  foodCostPercentage: number;
  beverageCostPercentage: number;
  overallCostPercentage: number;
  averageBudgetFoodCostPct: number;
  averageBudgetBeverageCostPct: number;

  // New fields for detailed P&L statement
  incomeItems: PLStatementItem[];
  salesReturnsAllowances: number; // A negative value
  totalIncome: number; // Sum of incomeItems.amount
  totalRevenuePL: number; // totalIncome - salesReturnsAllowances

  expenseItems: PLStatementItem[];
  totalExpenses: number; // Sum of expenseItems.amount

  netIncomeBeforeTaxes: number;
  taxRate: number; // e.g., 0.0953 for 9.53%
  incomeTaxExpense: number;
  netIncome: number;
}

export interface PLStatementItem {
  referenceId: string;
  description: string;
  amount: number;
}

export interface CostAnalysisByCategoryReport {
  dateRange: { from: Date; to: Date };
  totalFoodRevenue: number;
  totalBeverageRevenue: number;
  totalRevenue: number;

  // Food categories analysis
  foodCategories: {
    categoryName: string;
    categoryId: string;
    totalCost: number;
    percentageOfTotalFoodCost: number;
    percentageOfTotalRevenue: number;
    averageDailyCost: number;
    outletBreakdown: {
      outletName: string;
      outletId: string;
      cost: number;
      percentageOfOutletFoodCost: number;
    }[];
  }[];

  // Beverage categories analysis
  beverageCategories: {
    categoryName: string;
    categoryId: string;
    totalCost: number;
    percentageOfTotalBeverageCost: number;
    percentageOfTotalRevenue: number;
    averageDailyCost: number;
    outletBreakdown: {
      outletName: string;
      outletId: string;
      cost: number;
      percentageOfOutletBeverageCost: number;
    }[];
  }[];

  // Summary statistics
  totalFoodCost: number;
  totalBeverageCost: number;
  totalCost: number;
  overallFoodCostPercentage: number;
  overallBeverageCostPercentage: number;
  overallCostPercentage: number;

  // Top performing categories
  topFoodCategories: {
    categoryName: string;
    totalCost: number;
    percentageOfTotalFoodCost: number;
  }[];

  topBeverageCategories: {
    categoryName: string;
    totalCost: number;
    percentageOfTotalBeverageCost: number;
  }[];
}

export interface BudgetVsActualsReport {
  dateRange: { from: Date; to: Date };
  outletId?: string;
  outletName?: string;

  // Food Budget vs Actuals
  foodBudget: {
    budgetedRevenue: number;
    budgetedCostPercentage: number;
    budgetedCost: number;
  };
  foodActual: {
    actualRevenue: number;
    actualCost: number;
    actualCostPercentage: number;
  };
  foodVariance: {
    revenueVariance: number;
    revenueVariancePercentage: number;
    costVariance: number;
    costVariancePercentage: number;
    costPercentageVariance: number;
  };

  // Beverage Budget vs Actuals
  beverageBudget: {
    budgetedRevenue: number;
    budgetedCostPercentage: number;
    budgetedCost: number;
  };
  beverageActual: {
    actualRevenue: number;
    actualCost: number;
    actualCostPercentage: number;
  };
  beverageVariance: {
    revenueVariance: number;
    revenueVariancePercentage: number;
    costVariance: number;
    costVariancePercentage: number;
    costPercentageVariance: number;
  };

  // Combined F&B Summary
  combinedBudget: {
    budgetedRevenue: number;
    budgetedCost: number;
    budgetedCostPercentage: number;
  };
  combinedActual: {
    actualRevenue: number;
    actualCost: number;
    actualCostPercentage: number;
  };
  combinedVariance: {
    revenueVariance: number;
    revenueVariancePercentage: number;
    costVariance: number;
    costVariancePercentage: number;
    costPercentageVariance: number;
  };

  // Daily breakdown for trend analysis
  dailyBreakdown: {
    date: Date;
    foodBudgetedRevenue: number;
    foodActualRevenue: number;
    foodBudgetedCost: number;
    foodActualCost: number;
    beverageBudgetedRevenue: number;
    beverageActualRevenue: number;
    beverageBudgetedCost: number;
    beverageActualCost: number;
  }[];

  // Performance indicators
  performanceIndicators: {
    foodRevenueAchievement: number; // Percentage of budget achieved
    beverageRevenueAchievement: number;
    foodCostControl: number; // Lower is better (actual vs budget percentage)
    beverageCostControl: number;
    overallPerformance: number; // Combined performance score
  };
}

export interface DailyRevenueTrendsReport {
  dateRange: { from: Date; to: Date };
  outletId?: string;
  outletName?: string;

  // Summary statistics
  summary: {
    totalFoodRevenue: number;
    totalBeverageRevenue: number;
    totalRevenue: number;
    averageDailyFoodRevenue: number;
    averageDailyBeverageRevenue: number;
    averageDailyTotalRevenue: number;
    totalDays: number;
    highestRevenueDay: {
      date: Date;
      foodRevenue: number;
      beverageRevenue: number;
      totalRevenue: number;
    };
    lowestRevenueDay: {
      date: Date;
      foodRevenue: number;
      beverageRevenue: number;
      totalRevenue: number;
    };
  };

  // Daily trends data
  dailyTrends: {
    date: Date;
    foodRevenue: number;
    beverageRevenue: number;
    totalRevenue: number;
    foodRevenueChange: number; // Change from previous day
    beverageRevenueChange: number;
    totalRevenueChange: number;
    foodRevenueChangePercentage: number | null;
    beverageRevenueChangePercentage: number | null;
    totalRevenueChangePercentage: number | null;
  }[];

  // Weekly aggregation
  weeklyTrends: {
    weekStart: Date;
    weekEnd: Date;
    weekNumber: number;
    totalFoodRevenue: number;
    totalBeverageRevenue: number;
    totalRevenue: number;
    averageDailyFoodRevenue: number;
    averageDailyBeverageRevenue: number;
    averageDailyTotalRevenue: number;
    daysInWeek: number;
  }[];

  // Performance metrics
  performanceMetrics: {
    foodRevenueGrowth: number; // Overall growth rate
    beverageRevenueGrowth: number;
    totalRevenueGrowth: number;
    foodRevenueVolatility: number; // Standard deviation
    beverageRevenueVolatility: number;
    totalRevenueVolatility: number;
    bestPerformingDay: string; // Day of week
    worstPerformingDay: string;
    revenueConsistency: number; // How consistent revenue is (0-100)
  };

  // Trend analysis
  trendAnalysis: {
    overallTrend: "increasing" | "decreasing" | "stable";
    foodTrend: "increasing" | "decreasing" | "stable";
    beverageTrend: "increasing" | "decreasing" | "stable";
    trendStrength: number; // 0-100, how strong the trend is
    seasonalityDetected: boolean;
    peakDays: string[]; // Days with consistently higher revenue
    slowDays: string[]; // Days with consistently lower revenue
  };
}

export interface DashboardReportData {
  outletMetrics: any;
  outletBeverageMetrics: any; // Added for beverage metrics support
  summaryStats: {
    totalFoodRevenue: number;
    totalBeverageRevenue: number;
    avgFoodCostPct: number;
    avgBeverageCostPct: number;
    totalOrders: number;
    totalCustomers: number;
  };
  overviewChartData: ChartDataPoint[];
  costTrendsChartData: ChartDataPoint[];
  costDistributionChartData: DonutChartDataPoint[];
  outletPerformanceData: OutletPerformanceDataPoint[];
  topFoodCategories?: TopCategoryDataPoint[];
  topBeverageCategories?: TopCategoryDataPoint[];
  costAnalysisByCategoryReport?: CostAnalysisByCategoryReport;
  budgetVsActualsReport?: BudgetVsActualsReport;
  dailyRevenueTrendsReport?: DailyRevenueTrendsReport;
  dailySummaries?: any[]; // For stat card trend charts
}

// Type for Managed User (placeholder)
export interface ManagedUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role?: "admin" | "user"; // Simplified roles for now
  disabled?: boolean;
  creationTime?: string; // Or Date
  lastSignInTime?: string; // Or Date
}

export interface User {
  id: string;
  email: string;
  displayName?: string;
  role: "admin" | "manager" | "user";
  isActive: boolean;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  lastLoginAt?: Date | Timestamp;
  permissions?: string[];
  department?: string;
  phoneNumber?: string;
}

export interface CreateUserData {
  email: string;
  displayName?: string;
  role: "admin" | "manager" | "user";
  department?: string;
  phoneNumber?: string;
  permissions?: string[];
}

export interface UpdateUserData {
  displayName?: string;
  role?: "admin" | "manager" | "user";
  isActive?: boolean;
  department?: string;
  phoneNumber?: string;
  permissions?: string[];
}

// NEW FINANCIAL REPORTS TYPES

// Strategic Analysis Reports
export interface YearOverYearReport {
  currentYearData: {
    year: number;
    totalRevenue: number;
    totalFoodRevenue: number;
    totalBeverageRevenue: number;
    totalCosts: number;
    netProfit: number;
    avgMonthlyRevenue: number;
  };
  
  previousYearData: {
    year: number;
    totalRevenue: number;
    totalFoodRevenue: number;
    totalBeverageRevenue: number;
    totalCosts: number;
    netProfit: number;
    avgMonthlyRevenue: number;
  };
  
  growthMetrics: {
    revenueGrowth: number;
    foodRevenueGrowth: number;
    beverageRevenueGrowth: number;
    costGrowth: number;
    profitGrowth: number;
    marginImprovement: number;
  };
  
  monthlyComparison: {
    month: number;
    currentYearRevenue: number;
    previousYearRevenue: number;
    growth: number;
    performance: "outperforming" | "underperforming" | "on_track";
  }[];
  
  insights: {
    strongestMonths: string[];
    weakestMonths: string[];
    seasonalTrends: string[];
    recommendations: string[];
  };
}

// KPI Dashboard Types
export interface RealTimeKPIDashboard {
  outletId?: string;
  outletName?: string;
  lastUpdated: Date;
  
  currentPeriodKPIs: {
    // Revenue KPIs
    todayRevenue: number;
    revenueTarget: number;
    revenueAchievement: number;
    
    // Cost KPIs
    currentFoodCostPct: number;
    currentBeverageCostPct: number;
    targetFoodCostPct: number;
    targetBeverageCostPct: number;
    
    // Operational KPIs
    customersServed: number;
    averageCheck: number;
    tableUtilization: number;
    
    // Efficiency KPIs
    salesPerHour: number;
    salesPerEmployee: number;
    orderAccuracy: number;
  };
  
  trendingKPIs: {
    name: string;
    value: number;
    target: number;
    trend: "up" | "down" | "stable";
    trendPercentage: number;
    status: "excellent" | "good" | "warning" | "critical";
  }[];
  
  alerts: {
    type: "cost_variance" | "revenue_shortfall" | "efficiency_issue";
    message: string;
    severity: "high" | "medium" | "low";
    timestamp: Date;
  }[];
}

// Advanced Analytics Types
export interface ForecastingReport {
  dateRange: { from: Date; to: Date };
  forecastPeriod: { from: Date; to: Date };
  outletId?: string;
  outletName?: string;
  
  revenueForecast: {
    daily: {
      date: Date;
      predictedRevenue: number;
      confidenceInterval: { lower: number; upper: number };
      actualRevenue?: number;
    }[];
    
    monthly: {
      month: Date;
      predictedRevenue: number;
      confidenceInterval: { lower: number; upper: number };
      seasonalFactor: number;
    }[];
  };
  
  costForecast: {
    predictedFoodCostPct: number;
    predictedBeverageCostPct: number;
    predictedLaborCostPct: number;
    confidenceLevel: number;
  };
  
  demandForecast: {
    predictedCustomers: number;
    predictedAverageCheck: number;
    peakHours: string[];
    slowHours: string[];
  };
  
  assumptions: string[];
  riskFactors: string[];
  recommendations: string[];
}

