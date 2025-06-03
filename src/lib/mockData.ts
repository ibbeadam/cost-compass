import { DailyCostData, HistoricalDataPoint, Outlet, TransferItem } from '@/types';
import { format, subDays } from 'date-fns';

export const outlets: Outlet[] = [
  { id: '1', name: 'Outlet A - Downtown' },
  { id: '2', name: 'Outlet B - Suburbia' },
  { id: '3', name: 'Outlet C - Beachfront' },
  { id: '4', name: 'Outlet D - Airport' },
  { id: '5', name: 'Outlet E - Mall Kiosk' },
  { id: '6', name: 'Outlet F - Central Park' },
];

const foodItems: Omit<TransferItem, 'id' | 'quantity' | 'totalCost'>[] = [
  { itemName: 'Angus Beef Patty', category: 'Food', unitCost: 2.5, itemId: 'F1' },
  { itemName: 'Brioche Buns', category: 'Food', unitCost: 0.5, itemId: 'F2' },
  { itemName: 'Cheddar Cheese Slices', category: 'Food', unitCost: 0.3, itemId: 'F3' },
  { itemName: 'Lettuce Head', category: 'Food', unitCost: 1.0, itemId: 'F4' },
  { itemName: 'Tomato', category: 'Food', unitCost: 0.2, itemId: 'F5' },
  { itemName: 'Frozen Fries', category: 'Food', unitCost: 1.5, itemId: 'F6' },
];

const beverageItems: Omit<TransferItem, 'id' | 'quantity' | 'totalCost'>[] = [
  { itemName: 'Cola Syrup', category: 'Beverage', unitCost: 5.0, itemId: 'B1' },
  { itemName: 'Orange Juice Concentrate', category: 'Beverage', unitCost: 4.0, itemId: 'B2' },
  { itemName: 'Coffee Beans (kg)', category: 'Beverage', unitCost: 15.0, itemId: 'B3' },
  { itemName: 'Milk (liter)', category: 'Beverage', unitCost: 1.2, itemId: 'B4' },
];

const getRandomFloat = (min: number, max: number, decimals: number = 2) => {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
};

const getRandomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const generateDailyCosts = (date: Date, outlet: Outlet): DailyCostData => {
  const foodRevenue = getRandomFloat(500, 2000);
  let foodCost = foodRevenue * getRandomFloat(0.25, 0.45); // Food cost % between 25-45%
  const beverageRevenue = getRandomFloat(300, 1500);
  let beverageCost = beverageRevenue * getRandomFloat(0.20, 0.40); // Beverage cost % between 20-40%

  // Simulate occasional anomalies for specific outlets/dates for testing AI
  const dateString = format(date, 'yyyy-MM-dd');
  if (outlet.id === '2' && Math.random() < 0.3) { // Outlet B has higher chance of food cost anomaly
     foodCost = foodRevenue * getRandomFloat(0.50, 0.65);
  }
  if (outlet.id === '4' && Math.random() < 0.3) { // Outlet D has higher chance of beverage cost anomaly
     beverageCost = beverageRevenue * getRandomFloat(0.45, 0.60);
  }


  return {
    id: `${outlet.id}-${dateString}`,
    date: dateString,
    outletId: outlet.id,
    outletName: outlet.name,
    foodRevenue: parseFloat(foodRevenue.toFixed(2)),
    foodCost: parseFloat(foodCost.toFixed(2)),
    foodCostPct: parseFloat(((foodCost / foodRevenue) * 100).toFixed(2)),
    beverageRevenue: parseFloat(beverageRevenue.toFixed(2)),
    beverageCost: parseFloat(beverageCost.toFixed(2)),
    beverageCostPct: parseFloat(((beverageCost / beverageRevenue) * 100).toFixed(2)),
  };
};

export const generateTransferItems = (date: Date, outletId: string): TransferItem[] => {
  const items: TransferItem[] = [];
  const numFoodItems = getRandomInt(2, foodItems.length);
  const numBeverageItems = getRandomInt(1, beverageItems.length);
  const dateString = format(date, 'yyyyMMdd');

  for (let i = 0; i < numFoodItems; i++) {
    const foodItemBase = foodItems[i % foodItems.length];
    const quantity = getRandomFloat(5, 20);
    items.push({
      ...foodItemBase,
      id: `T-${outletId}-${dateString}-F${i}`,
      quantity,
      totalCost: parseFloat((quantity * foodItemBase.unitCost).toFixed(2)),
    });
  }

  for (let i = 0; i < numBeverageItems; i++) {
    const bevItemBase = beverageItems[i % beverageItems.length];
    const quantity = getRandomFloat(2, 10);
    items.push({
      ...bevItemBase,
      id: `T-${outletId}-${dateString}-B${i}`,
      quantity,
      totalCost: parseFloat((quantity * bevItemBase.unitCost).toFixed(2)),
    });
  }
  return items;
};

export const generateHistoricalData = (outletId: string, endDate: Date, days: number = 30): HistoricalDataPoint[] => {
  const data: HistoricalDataPoint[] = [];
  const outlet = outlets.find(o => o.id === outletId) || outlets[0]; 
  for (let i = 0; i < days; i++) {
    const date = subDays(endDate, i);
    const dailyData = generateDailyCosts(date, outlet); 
    data.push({
      date: format(date, 'yyyy-MM-dd'),
      foodCostPct: dailyData.foodCostPct,
      beverageCostPct: dailyData.beverageCostPct,
    });
  }
  return data.reverse(); 
};

export const getHistoricalPercentagesForOutlet = (outletId: string, endDate: Date, days: number = 30): { food: number[], beverage: number[] } => {
  const food: number[] = [];
  const beverage: number[] = [];
  const outlet = outlets.find(o => o.id === outletId) || outlets[0];

  for (let i = 0; i < days; i++) {
    const date = subDays(endDate, i);
    const dailyData = generateDailyCosts(date, outlet);
    food.push(dailyData.foodCostPct);
    beverage.push(dailyData.beverageCostPct);
  }
  return { food: food.reverse(), beverage: beverage.reverse() };
};
