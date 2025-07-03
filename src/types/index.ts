// Updated types to match new Prisma schema with auto-increment IDs and snake_case fields

// Enhanced User Role System for Multi-Property Management
export type UserRole = 
  | "super_admin"       // Platform-wide access across all properties
  | "property_owner"    // Owner of one or more properties
  | "property_admin"    // Admin access to specific properties
  | "regional_manager"  // Manager across multiple properties in a region
  | "property_manager"  // Manager of a specific property
  | "supervisor"        // Supervisor level access within properties
  | "user"              // Basic user access
  | "readonly";         // Read-only access

export interface User {
  id: number; // Auto-increment integer
  name?: string | null;
  email: string;
  department?: string | null;
  phoneNumber?: string | null; // Maps to phone_number in DB
  role: UserRole;
  password?: string | null;
  isActive: boolean; // Maps to is_active in DB
  profileImage?: string | null; // Profile image URL or path
  
  // Enhanced Security Fields
  passwordChangedAt?: Date | null;
  lastLoginAt?: Date | null;
  loginAttempts?: number;
  lockedUntil?: Date | null;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string | null;
  
  // Property Relations
  ownedProperties?: Property[];
  managedProperties?: Property[];
  propertyAccess?: PropertyAccess[];
  
  createdAt: Date; // Maps to created_at in DB
  updatedAt: Date; // Maps to updated_at in DB
  permissions?: string[]; // Array of permission strings
}

// Property Type Definitions for Multi-Property Support
export type PropertyType = 
  | "restaurant"
  | "hotel"
  | "cafe"
  | "bar"
  | "catering"
  | "franchise"
  | "chain"
  | "other";

export type PropertyAccessLevel = 
  | "read_only"
  | "data_entry"
  | "management"
  | "full_control"
  | "owner";

export interface Property {
  id: number;
  name: string;
  propertyCode: string;
  propertyType: PropertyType;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  timeZone?: string | null;
  currency: string;
  isActive: boolean;
  
  // Property Ownership and Management
  ownerId?: number | null;
  managerId?: number | null;
  owner?: User | null;
  manager?: User | null;
  
  // Relations
  outlets?: Outlet[];
  propertyAccess?: PropertyAccess[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface PropertyAccess {
  id: number;
  userId: number;
  propertyId: number;
  accessLevel: PropertyAccessLevel;
  grantedAt: Date;
  grantedBy: number;
  expiresAt?: Date | null;
  
  // Relations
  user?: User;
  property?: Property;
  grantedByUser?: User;
}

export interface Outlet {
  id: number; // Auto-increment integer
  name: string;
  outletCode: string; // Maps to outlet_code in DB
  propertyId: number; // Maps to property_id in DB
  address?: string | null;
  isActive: boolean;
  createdAt: Date; // Maps to created_at in DB
  updatedAt: Date; // Maps to updated_at in DB
  
  // Relations
  property?: Property;
}

export interface Category {
  id: number; // Auto-increment integer
  name: string;
  description?: string | null;
  type: "Food" | "Beverage";
  createdAt: Date; // Maps to created_at in DB
  updatedAt: Date; // Maps to updated_at in DB
}

export interface FoodCostEntry {
  id: number; // Auto-increment integer
  date: Date;
  propertyId?: number | null; // Maps to property_id in DB
  outletId: number; // Maps to outlet_id in DB
  totalFoodCost: number; // Maps to total_food_cost in DB
  createdAt: Date; // Maps to created_at in DB
  updatedAt: Date; // Maps to updated_at in DB
  details?: FoodCostDetail[];
  outlet?: Outlet;
  property?: Property;
}

export interface FoodCostDetail {
  id: number; // Auto-increment integer
  foodCostEntryId: number; // Maps to food_cost_entry_id in DB
  categoryId: number; // Maps to category_id in DB
  categoryName?: string | null; // Maps to category_name in DB
  cost: number;
  description?: string | null;
  createdAt: Date; // Maps to created_at in DB
  updatedAt: Date; // Maps to updated_at in DB
  category?: Category;
  foodCostEntry?: FoodCostEntry;
}

export interface BeverageCostEntry {
  id: number; // Auto-increment integer
  date: Date;
  propertyId?: number | null; // Maps to property_id in DB
  outletId: number; // Maps to outlet_id in DB
  totalBeverageCost: number; // Maps to total_beverage_cost in DB
  createdAt: Date; // Maps to created_at in DB
  updatedAt: Date; // Maps to updated_at in DB
  details?: BeverageCostDetail[];
  outlet?: Outlet;
  property?: Property;
}

export interface BeverageCostDetail {
  id: number; // Auto-increment integer
  beverageCostEntryId: number; // Maps to beverage_cost_entry_id in DB
  categoryId: number; // Maps to category_id in DB
  categoryName?: string | null; // Maps to category_name in DB
  cost: number;
  description?: string | null;
  createdAt: Date; // Maps to created_at in DB
  updatedAt: Date; // Maps to updated_at in DB
  category?: Category;
  beverageCostEntry?: BeverageCostEntry;
}

export interface DailyFinancialSummary {
  id: number; // Auto-increment integer
  date: Date;
  propertyId?: number | null; // Maps to property_id in DB
  actualFoodRevenue: number; // Maps to actual_food_revenue in DB (user input)
  budgetFoodRevenue: number; // Maps to budget_food_revenue in DB (user input)
  actualFoodCost?: number | null; // Maps to actual_food_cost in DB (calculated)
  budgetFoodCost: number; // Maps to budget_food_cost in DB (user input)
  actualFoodCostPct?: number | null; // Maps to actual_food_cost_pct in DB (calculated)
  budgetFoodCostPct: number; // Maps to budget_food_cost_pct in DB (user input)
  foodVariancePct?: number | null; // Maps to food_variance_pct in DB (calculated)
  entFood: number; // Maps to ent_food in DB (user input)
  coFood: number; // Maps to co_food in DB (user input)
  otherFoodAdjustment: number; // Maps to other_food_adjustment in DB (user input, can be positive or negative)
  actualBeverageRevenue: number; // Maps to actual_beverage_revenue in DB (user input)
  budgetBeverageRevenue: number; // Maps to budget_beverage_revenue in DB (user input)
  actualBeverageCost?: number | null; // Maps to actual_beverage_cost in DB (calculated)
  budgetBeverageCost: number; // Maps to budget_beverage_cost in DB (user input)
  actualBeverageCostPct?: number | null; // Maps to actual_beverage_cost_pct in DB (calculated)
  budgetBeverageCostPct: number; // Maps to budget_beverage_cost_pct in DB (user input)
  beverageVariancePct?: number | null; // Maps to beverage_variance_pct in DB (calculated)
  entBeverage: number; // Maps to ent_beverage in DB (user input)
  coBeverage: number; // Maps to co_beverage in DB (user input)
  otherBeverageAdjustment: number; // Maps to other_beverage_adjustment in DB (user input, can be positive or negative)
  note?: string | null;
  createdAt: Date; // Maps to created_at in DB
  updatedAt: Date; // Maps to updated_at in DB
  
  // Relations
  property?: Property;
}

// Enhanced types for user management
export interface CreateUserData {
  email: string;
  name?: string;
  password?: string;
  role: UserRole;
  department?: string;
  phoneNumber?: string;
  permissions?: string[];
  propertyAccess?: {
    propertyId: number;
    accessLevel: PropertyAccessLevel;
  }[];
}

export interface UpdateUserData {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
  department?: string;
  phoneNumber?: string;
  profileImage?: string | null;
  permissions?: string[];
  propertyAccess?: {
    propertyId: number;
    accessLevel: PropertyAccessLevel;
  }[];
}

// Dashboard and Report Types (keeping existing structure for now)
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

export interface DashboardReportData {
  outletMetrics: any;
  outletBeverageMetrics: any;
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
  dailySummaries?: any[];
}

// Legacy interfaces for existing reports (will need updating later)
export interface DetailedFoodCostReport {
  outletName: string;
  outletId: string;
  dateRange: { from: Date; to: Date };
  categoryCosts: {
    categoryName: string;
    totalCost: number;
    percentageOfTotalCost?: number;
  }[];
  totalCostFromTransfers: number;
  otherAdjustmentsFood: number;
  ocFoodTotal: number;
  entFoodTotal: number;
  totalCostOfFood: number;
  totalFoodRevenue: number;
  foodCostPercentage: number;
  budgetFoodCostPercentage: number;
  variancePercentage: number;
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
  totalCostFromTransfers: number;
  otherAdjustmentsBeverage: number;
  ocBeverageTotal: number;
  entBeverageTotal: number;
  totalCostOfBeverage: number;
  totalBeverageRevenue: number;
  beverageCostPercentage: number;
  budgetBeverageCostPercentage: number;
  variancePercentage: number;
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

export interface CostAnalysisByCategoryReport {
  dateRange: {
    from: Date;
    to: Date;
  };
  totalFoodRevenue: number;
  totalBeverageRevenue: number;
  totalRevenue: number;
  rawFoodCost: number;
  rawBeverageCost: number;
  totalFoodCost: number;
  totalBeverageCost: number;
  totalCost: number;
  overallFoodCostPercentage: number;
  overallBeverageCostPercentage: number;
  overallCostPercentage: number;
  foodAdjustments: {
    oc: number;
    entertainment: number;
    other: number;
  };
  beverageAdjustments: {
    oc: number;
    entertainment: number;
    other: number;
  };
  foodCategories: CategoryAnalysis[];
  topFoodCategories: TopCategoryData[];
  beverageCategories: CategoryAnalysis[];
  topBeverageCategories: TopCategoryData[];
}

export interface CategoryAnalysis {
  categoryId: string;
  categoryName: string;
  totalCost: number;
  percentageOfTotalFoodCost?: number;
  percentageOfTotalBeverageCost?: number;
  percentageOfTotalRevenue: number;
  averageDailyCost: number;
  outletBreakdown: OutletBreakdown[];
}

export interface TopCategoryData {
  categoryName: string;
  totalCost: number;
  percentageOfTotalFoodCost?: number;
  percentageOfTotalBeverageCost?: number;
}

export interface OutletBreakdown {
  outletName: string;
  cost: number;
  percentageOfOutletFoodCost?: number;
  percentageOfOutletBeverageCost?: number;
}

export interface BudgetVsActualsReport {
  dateRange: {
    from: Date;
    to: Date;
  };
  outletId?: string;
  outletName?: string;
  
  // Food Budget Data
  foodBudget: {
    budgetedRevenue: number;
    budgetedCostPercentage: number;
    budgetedCost: number;
  };
  
  // Food Actual Data
  foodActual: {
    actualRevenue: number;
    actualCost: number;
    actualCostPercentage: number;
  };
  
  // Food Variance Data
  foodVariance: {
    revenueVariance: number;
    revenueVariancePercentage: number;
    costVariance: number;
    costVariancePercentage: number;
    costPercentageVariance: number;
  };
  
  // Beverage Budget Data
  beverageBudget: {
    budgetedRevenue: number;
    budgetedCostPercentage: number;
    budgetedCost: number;
  };
  
  // Beverage Actual Data
  beverageActual: {
    actualRevenue: number;
    actualCost: number;
    actualCostPercentage: number;
  };
  
  // Beverage Variance Data
  beverageVariance: {
    revenueVariance: number;
    revenueVariancePercentage: number;
    costVariance: number;
    costVariancePercentage: number;
    costPercentageVariance: number;
  };
  
  // Combined Budget Data
  combinedBudget: {
    budgetedRevenue: number;
    budgetedCost: number;
    budgetedCostPercentage: number;
  };
  
  // Combined Actual Data
  combinedActual: {
    actualRevenue: number;
    actualCost: number;
    actualCostPercentage: number;
  };
  
  // Combined Variance Data
  combinedVariance: {
    revenueVariance: number;
    revenueVariancePercentage: number;
    costVariance: number;
    costVariancePercentage: number;
    costPercentageVariance: number;
  };
  
  // Daily Breakdown
  dailyBreakdown: Array<{
    date: Date;
    foodBudgetedRevenue: number;
    foodActualRevenue: number;
    foodBudgetedCost: number;
    foodActualCost: number;
    beverageBudgetedRevenue: number;
    beverageActualRevenue: number;
    beverageBudgetedCost: number;
    beverageActualCost: number;
  }>;
  
  // Performance Indicators
  performanceIndicators: {
    foodRevenueAchievement: number;
    beverageRevenueAchievement: number;
    foodCostControl: number;
    beverageCostControl: number;
    overallPerformance: number;
  };
}

export interface DailyRevenueTrendsReport {
  dateRange: {
    from: Date;
    to: Date;
  };
  outletName?: string;
  
  // Summary data
  summary: {
    totalFoodRevenue: number;
    totalBeverageRevenue: number;
    totalRevenue: number;
    totalCosts: number;
    totalNetProfit: number;
    averageDailyRevenue: number;
    averageDailyCosts: number;
    averageDailyProfit: number;
    averageDailyFoodRevenue: number;
    averageDailyBeverageRevenue: number;
    averageDailyTotalRevenue: number;
    totalDays: number;
    revenueGrowthTrend: number;
    profitMargin: number;
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
  
  // Daily breakdown
  dailyTrends: Array<{
    date: Date;
    totalRevenue: number;
    foodRevenue: number;
    beverageRevenue: number;
    totalCosts: number;
    foodCosts: number;
    beverageCosts: number;
    netProfit: number;
    totalCovers: number;
    averageCheck: number;
  }>;
  
  // Weekly trends
  weeklyTrends: Array<{
    weekStartDate: Date;
    weekEndDate: Date;
    totalRevenue: number;
    foodRevenue: number;
    beverageRevenue: number;
    totalCosts: number;
    netProfit: number;
    averageDailyRevenue: number;
    daysInWeek: number;
  }>;
  
  // Performance metrics
  performanceMetrics: {
    foodRevenueGrowth: number;
    beverageRevenueGrowth: number;
    totalRevenueGrowth: number;
    foodRevenueVolatility: number;
    beverageRevenueVolatility: number;
    totalRevenueVolatility: number;
    bestPerformingDay: string;
    worstPerformingDay: string;
    revenueConsistency: number;
  };
  
  // Trend analysis
  trendAnalysis: {
    overallTrend: "increasing" | "decreasing" | "stable";
    foodTrend: "increasing" | "decreasing" | "stable";
    beverageTrend: "increasing" | "decreasing" | "stable";
    trendStrength: number;
    seasonalityDetected: boolean;
    peakDays: string[];
    slowDays: string[];
  };
  
  // Insights section
  insights: {
    bestPerformingDays: Array<{
      date: Date;
      totalRevenue: number;
      foodRevenue: number;
      beverageRevenue: number;
      totalCosts: number;
      foodCosts: number;
      beverageCosts: number;
      netProfit: number;
      totalCovers: number;
      averageCheck: number;
    }>;
    worstPerformingDays: Array<{
      date: Date;
      totalRevenue: number;
      foodRevenue: number;
      beverageRevenue: number;
      totalCosts: number;
      foodCosts: number;
      beverageCosts: number;
      netProfit: number;
      totalCovers: number;
      averageCheck: number;
    }>;
    weekdayAverage: number;
    weekendAverage: number;
    recommendations: string[];
  };
}

// Property Management Types
export interface CreatePropertyData {
  name: string;
  propertyCode: string;
  propertyType: PropertyType;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  timeZone?: string;
  currency?: string;
  ownerId?: number;
  managerId?: number;
}

export interface UpdatePropertyData {
  name?: string;
  propertyCode?: string;
  propertyType?: PropertyType;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  timeZone?: string;
  currency?: string;
  ownerId?: number;
  managerId?: number;
  isActive?: boolean;
}

// Activity Log / Audit Log Types
export interface AuditLog {
  id: number;
  userId?: number | null;
  propertyId?: number | null;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string | null;
  details?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  timestamp: Date;
  user?: User | null;
}

export interface CreateAuditLogData {
  userId?: number;
  propertyId?: number;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilters {
  userId?: number;
  propertyId?: number;
  resource?: string;
  action?: string;
  dateRange?: { from?: Date; to?: Date };
  searchTerm?: string;
  page?: number;
  limit?: number;
}

// Audit Log Action Types
export type AuditAction = 
  | "CREATE"
  | "UPDATE" 
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "RESET_PASSWORD"
  | "CHANGE_PASSWORD"
  | "GRANT_ACCESS"
  | "REVOKE_ACCESS"
  | "ACTIVATE"
  | "DEACTIVATE"
  | "EXPORT"
  | "IMPORT"
  | "VIEW"
  | "DOWNLOAD";

// Audit Log Resource Types
export type AuditResource = 
  | "user"
  | "property"
  | "outlet"
  | "category"
  | "food_cost_entry"
  | "beverage_cost_entry"
  | "daily_financial_summary"
  | "property_access"
  | "user_permission"
  | "settings"
  | "report"
  | "dashboard";

export interface AuditLogResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}