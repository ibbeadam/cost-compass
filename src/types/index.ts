import type { Timestamp } from "firebase/firestore";

export interface Outlet {
  id: string;
  name: string;
  createdAt?: Timestamp | Date; 
  updatedAt?: Timestamp | Date;
  isActive?: boolean;
  address?: string | { street?: string; city?: string; state?: string; zipCode?: string; country?: string };
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
  category: 'Food' | 'Beverage';
  unit: string;
  cost_per_unit: number;
}

export interface TransferItem {
  id: string;
  itemId: string;
  itemName: string;
  category: 'Food' | 'Beverage';
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
  category: 'Food' | 'Beverage'; 
}

export interface DirectPurchaseItem {
  id: string; 
  purchaseCategory: string; 
  description?: string; 
  amount: number;
  costCategory: 'Food' | 'Beverage'; 
}

export interface CostAdjustmentItem {
  id:string; 
  description: string; 
  amount: number; 
  type: 'OtherCost' | 'TransferOut' | 'CreditAdjustment'; 
  costCategory: 'Food' | 'Beverage'; 
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
  type: 'Food' | 'Beverage';
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

// --- NEW TYPES BASED ON USER'S DETAILED SPECIFICATION ---

export interface DailyFinancialSummary {
  id: string; // Document ID, format YYYY-MM-DD
  date: Timestamp | Date; // Firestore Timestamp or JS Date
  
  food_revenue?: number;
  budget_food_cost_pct?: number; // e.g., 30 for 30%
  ent_food?: number; // Entertainment Food cost
  oc_food?: number; // Officer's Check Food / Complimentary Food cost
  other_food_adjustment?: number; // Other food related adjustments (e.g., spoilage, staff meals if treated as cost)

  beverage_revenue?: number;
  budget_beverage_cost_pct?: number; // e.g., 25 for 25%
  ent_beverage?: number; // Entertainment Beverage cost
  oc_beverage?: number; // Officer's Check Beverage / Complimentary Beverage cost
  other_beverage_adjustment?: number; // Other beverage related adjustments

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

export interface DashboardReportData {
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
}

// Type for Managed User (placeholder)
export interface ManagedUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role?: 'admin' | 'user'; // Simplified roles for now
  disabled?: boolean;
  creationTime?: string; // Or Date
  lastSignInTime?: string; // Or Date
}

export interface User {
  id: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'manager' | 'user';
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
  role: 'admin' | 'manager' | 'user';
  department?: string;
  phoneNumber?: string;
  permissions?: string[];
}

export interface UpdateUserData {
  displayName?: string;
  role?: 'admin' | 'manager' | 'user';
  isActive?: boolean;
  department?: string;
  phoneNumber?: string;
  permissions?: string[];
}
