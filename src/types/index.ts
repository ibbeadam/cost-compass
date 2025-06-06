
import type { Timestamp } from "firebase/firestore";

export interface Outlet {
  id: string;
  name: string;
  createdAt?: Timestamp | Date; // For Firestore serverTimestamp, or Date after fetching
  updatedAt?: Timestamp | Date;
  isActive?: boolean;
  address?: string | { street?: string; city?: string; state?: string; zipCode?: string; country?: string };
  phoneNumber?: string;
  email?: string;
  type?: string; // e.g., "Restaurant", "Cafe", "Main Kitchen"
  currency?: string; // e.g., "USD"
  timezone?: string; // e.g., "America/New_York"
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

// This TransferItem type might be used for the drill-down,
// but distinct from TransferInItem for daily hotel entries.
export interface TransferItem {
  id: string;
  itemId: string;
  itemName: string;
  category: 'Food' | 'Beverage';
  quantity: number;
  unitCost: number;
  totalCost: number;
}

// The old DailyCostData, may be deprecated or repurposed later.
export interface DailyCostData {
  id: string;
  date: string; // YYYY-MM-DD
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
  date: string; // YYYY-MM-DD
  foodCostPct: number;
  beverageCostPct: number;
}

// For the AI flow input
export interface CostFluctuationInput {
  outlet: string;
  date: string;
  foodCostPercentage: number;
  beverageCostPercentage: number;
  historicalFoodCostPercentages: number[];
  historicalBeverageCostPercentages: number[];
}

// For the AI flow output
export interface CostFluctuationOutput {
  isAnomalous: boolean;
  explanation: string;
}

// New Types for Hotel-Wide Daily Financial Entries

export interface TransferInItem {
  id: string; // Unique ID for this line item (e.g., generated client-side or Firestore auto-ID)
  toOutletId: string; // Refers to Outlet.id
  toOutletName: string; // Denormalized for easier display
  description: string; // e.g., "TRANSFER IN - MAIN KITCHEN FROM STORE & COMM KIT"
  amount: number;
  category: 'Food' | 'Beverage'; // To distinguish if it's a food or beverage cost
}

export interface DirectPurchaseItem {
  id: string; // Unique ID
  purchaseCategory: string; // e.g., "Dairy", "Dry Goods", "Frozenfood", "Meat", "Fruits & Veg"
  description?: string; // Optional more specific description
  amount: number;
  costCategory: 'Food' | 'Beverage'; // To assign this purchase to food or beverage cost
}

export interface CostAdjustmentItem {
  id:string; // Unique ID
  description: string; // e.g., "BUTCHERY FREEZER VARIENCE", "Food Transfer to Canteen", "F&B Allowance"
  amount: number; // Can be positive (cost) or negative (credit/reduction)
  type: 'OtherCost' | 'TransferOut' | 'CreditAdjustment'; // To categorize the adjustment
  costCategory: 'Food' | 'Beverage'; // To assign this adjustment to food or beverage cost
}

export interface CostDetailCategory {
  transferIns: TransferInItem[];
  directPurchases: DirectPurchaseItem[];
  otherAdjustments: CostAdjustmentItem[];
  transfersOut: CostAdjustmentItem[];
  creditAdjustments: CostAdjustmentItem[];
}

export interface DailyHotelEntry {
  id: string; // Document ID, should be YYYY-MM-DD format
  date: Timestamp | Date; // Firestore Timestamp for the specific day or JS Date for client
  
  // Overall hotel figures
  hotelNetSales?: number; // Total hotel net sales for the day (as per your report: "NET SALES")
  
  // Food related summary fields
  hotelNetFoodSales?: number;
  budgetHotelFoodCostPct?: number; // e.g., 30 for 30%
  entFood?: number; // Entertainment Food
  ocFood?: number; // Officer's Check Food / Other Complimentary Food
  otherFoodCredit?: number; // Other food related credits/adjustments

  // Beverage related summary fields
  hotelNetBeverageSales?: number;
  budgetHotelBeverageCostPct?: number; // e.g., 25 for 25%
  entBeverage?: number; // Entertainment Beverage
  ocBeverage?: number; // Officer's Check Beverage / Other Complimentary Beverage
  otherBeverageCredit?: number; // Other beverage related credits/adjustments

  // Detailed cost breakdown (can be managed by more granular modules)
  foodCostDetails?: CostDetailCategory;
  beverageCostDetails?: CostDetailCategory;

  // Optional fields
  notes?: string; // Any specific notes for this day's entry
  userId?: string; // ID of user who made/last updated the entry
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;

  // Calculated fields (can be stored after calculation or calculated on read)
  calculatedNetFoodCost?: number;
  calculatedActualFoodCostPct?: number;
  calculatedFoodCostVariancePct?: number; // (Actual % - Budget %)
  calculatedNetBeverageCost?: number;
  calculatedActualBeverageCostPct?: number;
  calculatedBeverageCostVariancePct?: number; // (Actual % - Budget %)
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  type: 'Food' | 'Beverage';
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}
