export interface Outlet {
  id: string;
  name: string;
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
