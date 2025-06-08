
import type { DailyCostData, HistoricalDataPoint, Outlet, TransferItem, DashboardReportData, ChartDataPoint, DonutChartDataPoint, OutletPerformanceDataPoint } from '@/types';
import { format, subDays, addDays, eachDayOfInterval, differenceInDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';

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
  let foodCost = foodRevenue * getRandomFloat(0.25, 0.45); 
  const beverageRevenue = getRandomFloat(300, 1500);
  let beverageCost = beverageRevenue * getRandomFloat(0.20, 0.40); 

  const dateString = format(date, 'yyyy-MM-dd');
  if (outlet.id === '2' && Math.random() < 0.3) { 
     foodCost = foodRevenue * getRandomFloat(0.50, 0.65);
  }
  if (outlet.id === '4' && Math.random() < 0.3) { 
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


// --- New Mock Data Generation for Dashboard ---
export const generateDashboardData = (
  dateRange: DateRange | undefined,
  selectedOutletId: string | undefined,
  allOutlets: Outlet[]
): DashboardReportData => {
  const today = new Date();
  const fromDate = dateRange?.from || subDays(today, 30);
  const toDate = dateRange?.to || today;
  
  const daysInInterval = eachDayOfInterval({ start: fromDate, end: toDate });
  const numDays = differenceInDays(toDate, fromDate) + 1;

  let dailyRecords: DailyCostData[] = [];
  daysInInterval.forEach(day => {
    if (selectedOutletId) {
      const outlet = allOutlets.find(o => o.id === selectedOutletId);
      if (outlet) {
        dailyRecords.push(generateDailyCosts(day, outlet));
      }
    } else {
      allOutlets.forEach(outlet => {
        dailyRecords.push(generateDailyCosts(day, outlet));
      });
    }
  });

  // Summary Stats
  const totalFoodRevenue = dailyRecords.reduce((sum, r) => sum + r.foodRevenue, 0);
  const totalFoodCost = dailyRecords.reduce((sum, r) => sum + r.foodCost, 0);
  const totalBeverageRevenue = dailyRecords.reduce((sum, r) => sum + r.beverageRevenue, 0);
  const totalBeverageCost = dailyRecords.reduce((sum, r) => sum + r.beverageCost, 0);
  
  const avgFoodCostPct = totalFoodRevenue > 0 ? (totalFoodCost / totalFoodRevenue) * 100 : 0;
  const avgBeverageCostPct = totalBeverageRevenue > 0 ? (totalBeverageCost / totalBeverageRevenue) * 100 : 0;

  // Overview Chart Data (Daily Cost % for selected outlet or all)
  let overviewChartData: ChartDataPoint[] = [];
  if (selectedOutletId) {
    overviewChartData = daysInInterval.map(day => {
      const record = dailyRecords.find(r => r.date === format(day, 'yyyy-MM-dd') && r.outletId === selectedOutletId);
      return {
        date: format(day, 'MMM dd'),
        foodCostPct: record?.foodCostPct || 0,
        beverageCostPct: record?.beverageCostPct || 0,
      };
    });
  } else { // Aggregate for all outlets per day
    overviewChartData = daysInInterval.map(day => {
      const recordsForDay = dailyRecords.filter(r => r.date === format(day, 'yyyy-MM-dd'));
      const dayFoodRevenue = recordsForDay.reduce((sum, r) => sum + r.foodRevenue, 0);
      const dayFoodCost = recordsForDay.reduce((sum, r) => sum + r.foodCost, 0);
      const dayBevRevenue = recordsForDay.reduce((sum, r) => sum + r.beverageRevenue, 0);
      const dayBevCost = recordsForDay.reduce((sum, r) => sum + r.beverageCost, 0);
      return {
        date: format(day, 'MMM dd'),
        foodCostPct: dayFoodRevenue > 0 ? (dayFoodCost / dayFoodRevenue) * 100 : 0,
        beverageCostPct: dayBevRevenue > 0 ? (dayBevCost / dayBevRevenue) * 100 : 0,
      };
    });
  }


  // Cost Trends Chart Data (Line chart for a single selected outlet's historical performance)
  let costTrendsChartData: ChartDataPoint[] = [];
  if (selectedOutletId) {
    costTrendsChartData = daysInInterval.map(day => {
      const record = dailyRecords.find(r => r.date === format(day, 'yyyy-MM-dd') && r.outletId === selectedOutletId);
      return {
        date: format(day, 'MMM dd'),
        foodCostPct: record?.foodCostPct || 0,
        beverageCostPct: record?.beverageCostPct || 0,
      };
    });
  }


  // Cost Distribution Chart Data (Donut chart - by outlet)
  const costByOutlet: Record<string, number> = {};
  dailyRecords.forEach(r => {
    costByOutlet[r.outletName] = (costByOutlet[r.outletName] || 0) + r.foodCost + r.beverageCost;
  });
  const costDistributionChartData: DonutChartDataPoint[] = Object.entries(costByOutlet)
    .map(([name, value], index) => ({
      name: name.split(' - ')[0], // Shorten name
      value: parseFloat(value.toFixed(2)),
      fill: `hsl(var(--chart-${(index % 5) + 1}))`,
    }))
    .sort((a,b) => b.value - a.value)
    .slice(0,5); // Top 5

  // Outlet Performance Data
  const outletPerformanceData: OutletPerformanceDataPoint[] = allOutlets.map(outlet => {
    const outletRecords = dailyRecords.filter(r => r.outletId === outlet.id);
    const outletFoodRevenue = outletRecords.reduce((sum, r) => sum + r.foodRevenue, 0);
    const outletFoodCost = outletRecords.reduce((sum, r) => sum + r.foodCost, 0);
    const outletFoodCostPct = outletFoodRevenue > 0 ? (outletFoodCost / outletFoodRevenue) * 100 : 0;
    return {
      id: outlet.id,
      outletName: outlet.name.split(' - ')[0], // Shorten name
      metricName: "Food Cost %",
      value: `${outletFoodCostPct.toFixed(1)}%`,
      metricValue: outletFoodCostPct, 
    };
  }).sort((a,b) => b.metricValue - a.metricValue).slice(0,3).map(d => ({...d, trend: Math.random() > 0.5 ? 'up' : 'down'}));


  return {
    summaryStats: {
      totalFoodRevenue: parseFloat(totalFoodRevenue.toFixed(2)),
      totalBeverageRevenue: parseFloat(totalBeverageRevenue.toFixed(2)),
      avgFoodCostPct: parseFloat(avgFoodCostPct.toFixed(2)),
      avgBeverageCostPct: parseFloat(avgBeverageCostPct.toFixed(2)),
      totalOrders: getRandomInt(numDays * 50, numDays * 200),
      totalCustomers: getRandomInt(numDays * 100, numDays * 500),
    },
    overviewChartData,
    costTrendsChartData: costTrendsChartData.length > 0 ? costTrendsChartData : overviewChartData, // Fallback for line chart if no single outlet
    costDistributionChartData,
    outletPerformanceData,
  };
};
