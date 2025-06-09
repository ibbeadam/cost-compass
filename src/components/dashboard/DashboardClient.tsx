
"use client";

import { useState, useEffect, useMemo } from "react";
import { DollarSign, TrendingUp, TrendingDown, ShoppingCart, Users, Utensils, GlassWater, Percent, BarChart2, LineChart as LucideLineChart, PieChartIcon, ListChecks } from "lucide-react";
import { subDays, format as formatDateFn, eachDayOfInterval, differenceInDays, isValid as isValidDate } from "date-fns";
import type { DateRange } from "react-day-picker";
import { collection, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";

import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import type { Outlet, DashboardReportData, SummaryStat, ChartDataPoint, DonutChartDataPoint, OutletPerformanceDataPoint, DailyFinancialSummary, FoodCostEntry, BeverageCostEntry } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Bar, BarChart, Line, LineChart as RechartsLine, Pie, PieChart as RechartsPie, ResponsiveContainer, Cell, CartesianGrid, XAxis, YAxis, Legend as RechartsLegend } from "recharts";


const StatCard: React.FC<SummaryStat & { isLoading?: boolean }> = ({ title, value, icon: Icon, iconColor = "text-primary", isLoading }) => {
  if (isLoading) {
    return (
      <Card className="shadow-md bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground"><Skeleton className="h-5 w-24 bg-muted" /></CardTitle>
          <Skeleton className="h-6 w-6 rounded-sm bg-muted" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-1 bg-muted" />
          <Skeleton className="h-4 w-20 bg-muted" />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="shadow-md bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-headline">{value}</div>
        {/* Percentage change removed for simplicity with real data for now */}
      </CardContent>
    </Card>
  );
};

const overviewChartConfig = {
  foodCostPct: { label: "Food Cost %", color: "hsl(var(--chart-1))" },
  beverageCostPct: { label: "Bev Cost %", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const donutChartConfig = {
  // Minimal config for the donut chart context, colors will be applied directly
} satisfies ChartConfig;

const costDistributionChartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];


export default function DashboardClient() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [allOutlets, setAllOutlets] = useState<Outlet[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<string | undefined>("all"); 

  const [dashboardData, setDashboardData] = useState<DashboardReportData | null>(null);
  const [isFetchingOutlets, setIsFetchingOutlets] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const { toast } = useToast();

  useEffect(() => {
    setDateRange({
      from: subDays(new Date(), 29),
      to: new Date(),
    });
  }, []);

  useEffect(() => {
    const fetchFirestoreOutlets = async () => {
      setIsFetchingOutlets(true);
      try {
        const outletsCol = collection(db, 'outlets');
        const outletsSnapshot = await getDocs(outletsCol);
        const fetchedOutletsFromDB = outletsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Outlet));
        
        setAllOutlets([{ id: "all", name: "All Outlets" }, ...fetchedOutletsFromDB]);
      } catch (error) {
        console.error("Error fetching outlets:", error);
        toast({ variant: "destructive", title: "Error fetching outlets", description: (error as Error).message });
        setAllOutlets([{ id: "all", name: "All Outlets" }]); // Fallback
      }
      setIsFetchingOutlets(false);
    };
    fetchFirestoreOutlets();
  }, [toast]);

  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to || !allOutlets.length || isFetchingOutlets) {
      if(!isFetchingOutlets && (!dateRange?.from || !dateRange?.to)){ // only set loading to false if outlets are fetched and date range is not set
         setIsLoadingData(false);
         setDashboardData(null); // Clear data if date range is invalid
      }
      return;
    }
    
    setIsLoadingData(true);

    async function fetchDataForDashboard() {
      try {
        const from = Timestamp.fromDate(dateRange.from!);
        const to = Timestamp.fromDate(dateRange.to!);

        const summariesQuery = query(
          collection(db, "dailyFinancialSummaries"),
          where("date", ">=", from),
          where("date", "<=", to),
          orderBy("date", "asc")
        );
        const summariesSnapshot = await getDocs(summariesQuery);
        const dailySummaries: DailyFinancialSummary[] = summariesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: (data.date as Timestamp).toDate(),
            createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined,
            updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : undefined,
          } as DailyFinancialSummary;
        });
        
        const summariesMap = new Map<string, DailyFinancialSummary>();
        dailySummaries.forEach(s => summariesMap.set(formatDateFn(s.date, 'yyyy-MM-dd'), s));

        const foodCostQuery = query(
          collection(db, "foodCostEntries"),
          where("date", ">=", from),
          where("date", "<=", to)
        );
        const foodCostSnapshot = await getDocs(foodCostQuery);
        const foodCostEntries: FoodCostEntry[] = foodCostSnapshot.docs.map(doc => {
           const data = doc.data();
           return {
            id: doc.id,
            ...data,
            date: (data.date as Timestamp).toDate(),
          } as FoodCostEntry;
        });

        const beverageCostQuery = query(
          collection(db, "beverageCostEntries"),
          where("date", ">=", from),
          where("date", "<=", to)
        );
        const beverageCostSnapshot = await getDocs(beverageCostQuery);
        const beverageCostEntries: BeverageCostEntry[] = beverageCostSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: (data.date as Timestamp).toDate(),
          } as BeverageCostEntry;
        });

        const daysInInterval = eachDayOfInterval({ start: dateRange.from!, end: dateRange.to! });

        let totalHotelFoodRevenue = 0;
        let totalHotelBeverageRevenue = 0;
        let totalHotelActualFoodCost = 0;
        let totalHotelActualBeverageCost = 0;

        dailySummaries.forEach(summary => {
            totalHotelFoodRevenue += summary.food_revenue || 0;
            totalHotelBeverageRevenue += summary.beverage_revenue || 0;
            totalHotelActualFoodCost += summary.actual_food_cost || 0;
            totalHotelActualBeverageCost += summary.actual_beverage_cost || 0;
        });
        
        let avgFoodCostPctVal = totalHotelFoodRevenue > 0 ? (totalHotelActualFoodCost / totalHotelFoodRevenue) * 100 : 0;
        let avgBeverageCostPctVal = totalHotelBeverageRevenue > 0 ? (totalHotelActualBeverageCost / totalHotelBeverageRevenue) * 100 : 0;

        if (selectedOutletId && selectedOutletId !== "all") {
            let outletTotalFoodCost = 0;
            let outletTotalFoodRevenueSumForPct = 0;
            foodCostEntries.filter(fce => fce.outlet_id === selectedOutletId).forEach(fce => {
                outletTotalFoodCost += fce.total_food_cost;
                const daySummary = summariesMap.get(formatDateFn(fce.date, 'yyyy-MM-dd'));
                if (daySummary) outletTotalFoodRevenueSumForPct += daySummary.food_revenue || 0;
            });
            avgFoodCostPctVal = outletTotalFoodRevenueSumForPct > 0 ? (outletTotalFoodCost / outletTotalFoodRevenueSumForPct) * 100 : 0;
            
            let outletTotalBeverageCost = 0;
            let outletTotalBeverageRevenueSumForPct = 0;
             beverageCostEntries.filter(bce => bce.outlet_id === selectedOutletId).forEach(bce => {
                outletTotalBeverageCost += bce.total_beverage_cost;
                const daySummary = summariesMap.get(formatDateFn(bce.date, 'yyyy-MM-dd'));
                if (daySummary) outletTotalBeverageRevenueSumForPct += daySummary.beverage_revenue || 0;
            });
            avgBeverageCostPctVal = outletTotalBeverageRevenueSumForPct > 0 ? (outletTotalBeverageCost / outletTotalBeverageRevenueSumForPct) * 100 : 0;
        }


        const summaryStatsData = {
            totalFoodRevenue: parseFloat(totalHotelFoodRevenue.toFixed(2)),
            totalBeverageRevenue: parseFloat(totalHotelBeverageRevenue.toFixed(2)),
            avgFoodCostPct: parseFloat(avgFoodCostPctVal.toFixed(1)),
            avgBeverageCostPct: parseFloat(avgBeverageCostPctVal.toFixed(1)),
        };

        const overviewChartDataResult: ChartDataPoint[] = daysInInterval.map(day => {
            const dayStr = formatDateFn(day, 'yyyy-MM-dd');
            const summary = summariesMap.get(dayStr);
            const foodRev = summary?.food_revenue || 0;
            const bevRev = summary?.beverage_revenue || 0;
            const actualFoodCost = summary?.actual_food_cost || 0;
            const actualBevCost = summary?.actual_beverage_cost || 0;
            return {
                date: formatDateFn(day, 'MMM dd'),
                foodCostPct: foodRev > 0 ? parseFloat(((actualFoodCost / foodRev) * 100).toFixed(1)) : 0,
                beverageCostPct: bevRev > 0 ? parseFloat(((actualBevCost / bevRev) * 100).toFixed(1)) : 0,
            };
        });

        let costTrendsChartDataResult: ChartDataPoint[];
        if (selectedOutletId && selectedOutletId !== "all") {
            costTrendsChartDataResult = daysInInterval.map(day => {
                const dayStr = formatDateFn(day, 'yyyy-MM-dd');
                const summary = summariesMap.get(dayStr);
                const foodRev = summary?.food_revenue || 0;
                const bevRev = summary?.beverage_revenue || 0;
                const outletDayFoodCost = foodCostEntries
                    .filter(fce => fce.outlet_id === selectedOutletId && formatDateFn(fce.date, 'yyyy-MM-dd') === dayStr)
                    .reduce((sum, fce) => sum + fce.total_food_cost, 0);
                const outletDayBeverageCost = beverageCostEntries
                    .filter(bce => bce.outlet_id === selectedOutletId && formatDateFn(bce.date, 'yyyy-MM-dd') === dayStr)
                    .reduce((sum, bce) => sum + bce.total_beverage_cost, 0);
                return {
                    date: formatDateFn(day, 'MMM dd'),
                    foodCostPct: foodRev > 0 ? parseFloat(((outletDayFoodCost / foodRev) * 100).toFixed(1)) : 0,
                    beverageCostPct: bevRev > 0 ? parseFloat(((outletDayBeverageCost / bevRev) * 100).toFixed(1)) : 0,
                };
            });
        } else {
            costTrendsChartDataResult = overviewChartDataResult;
        }

        const costByOutletMap: Record<string, { totalCost: number, name: string }> = {};
        const outletDetailsMap = new Map(allOutlets.map(o => [o.id, o.name]));
        foodCostEntries.forEach(fce => {
            const outletName = outletDetailsMap.get(fce.outlet_id) || fce.outlet_id;
            if (!costByOutletMap[fce.outlet_id]) costByOutletMap[fce.outlet_id] = { totalCost: 0, name: outletName.split(' - ')[0] };
            costByOutletMap[fce.outlet_id].totalCost += fce.total_food_cost;
        });
        beverageCostEntries.forEach(bce => {
            const outletName = outletDetailsMap.get(bce.outlet_id) || bce.outlet_id;
            if (!costByOutletMap[bce.outlet_id]) costByOutletMap[bce.outlet_id] = { totalCost: 0, name: outletName.split(' - ')[0] };
            costByOutletMap[bce.outlet_id].totalCost += bce.total_beverage_cost;
        });
        const costDistributionChartDataResult: DonutChartDataPoint[] = Object.values(costByOutletMap)
            .map((data, index) => ({
                name: data.name,
                value: parseFloat(data.totalCost.toFixed(2)),
                fill: costDistributionChartColors[index % costDistributionChartColors.length],
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        const outletPerformanceList: OutletPerformanceDataPoint[] = [];
        allOutlets.filter(o => o.id !== "all").forEach(outlet => {
            let totalOutletFoodCost = 0;
            let totalHotelFoodRevenueOnOutletDays = 0;
            let daysWithFoodCost = 0;
            daysInInterval.forEach(day => {
                const dayStr = formatDateFn(day, 'yyyy-MM-dd');
                const dailyFoodCostForOutlet = foodCostEntries
                    .filter(fce => fce.outlet_id === outlet.id && formatDateFn(fce.date, 'yyyy-MM-dd') === dayStr)
                    .reduce((sum, fce) => sum + fce.total_food_cost, 0);
                if (dailyFoodCostForOutlet > 0) {
                    totalOutletFoodCost += dailyFoodCostForOutlet;
                    const summary = summariesMap.get(dayStr);
                    if (summary && summary.food_revenue) totalHotelFoodRevenueOnOutletDays += summary.food_revenue;
                    daysWithFoodCost++;
                }
            });
            const avgDailyFoodCostPct = totalHotelFoodRevenueOnOutletDays > 0 ? parseFloat(((totalOutletFoodCost / totalHotelFoodRevenueOnOutletDays) * 100).toFixed(1)) : 0;
            if (daysWithFoodCost > 0) {
                outletPerformanceList.push({
                    id: outlet.id,
                    outletName: outlet.name.split(' - ')[0],
                    metricName: "Avg Food Cost %",
                    value: `${avgDailyFoodCostPct}%`,
                    metricValue: avgDailyFoodCostPct,
                    trend: Math.random() > 0.5 ? 'up' : 'down',
                });
            }
        });
        const outletPerformanceDataResult = outletPerformanceList
            .sort((a,b) => b.metricValue - a.metricValue)
            .slice(0,3);

        setDashboardData({
          summaryStats: summaryStatsData,
          overviewChartData: overviewChartDataResult,
          costTrendsChartData: costTrendsChartDataResult,
          costDistributionChartData: costDistributionChartDataResult,
          outletPerformanceData: outletPerformanceDataResult,
        });

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        toast({ variant: "destructive", title: "Error loading dashboard", description: (err as Error).message });
        setDashboardData(null);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchDataForDashboard();

  }, [dateRange, selectedOutletId, allOutlets, isFetchingOutlets, toast]);


  const summaryStatsList: SummaryStat[] = useMemo(() => {
    if (!dashboardData || !dashboardData.summaryStats) {
      return [
        { title: "Total Food Revenue", value: "$0", icon: Utensils },
        { title: "Total Beverage Revenue", value: "$0", icon: GlassWater },
        { title: "Avg. Food Cost %", value: "0%", icon: Percent, iconColor: "text-green-500" },
        { title: "Avg. Beverage Cost %", value: "0%", icon: Percent, iconColor: "text-orange-500" },
      ];
    }
    const stats = dashboardData.summaryStats;
    return [
      { title: "Total Food Revenue", value: `$${stats.totalFoodRevenue?.toLocaleString() ?? 'N/A'}`, icon: Utensils },
      { title: "Total Beverage Revenue", value: `$${stats.totalBeverageRevenue?.toLocaleString() ?? 'N/A'}`, icon: GlassWater },
      { title: "Avg. Food Cost %", value: `${stats.avgFoodCostPct?.toFixed(1) ?? 'N/A'}%`, icon: Percent, iconColor: "text-green-500" },
      { title: "Avg. Beverage Cost %", value: `${stats.avgBeverageCostPct?.toFixed(1) ?? 'N/A'}%`, icon: Percent, iconColor: "text-orange-500" },
    ];
  }, [dashboardData]);


  return (
    <div className="flex flex-col flex-grow w-full space-y-6">
      {/* Filters Row */}
      <Card className="shadow-sm bg-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <label htmlFor="date-range-picker" className="block text-sm font-medium text-foreground mb-1">Select Date Range</label>
              {dateRange === undefined ? (
                 <Skeleton className="h-10 w-full sm:w-[300px] bg-muted" />
              ) : (
                <DateRangePicker date={dateRange} setDate={setDateRange} />
              )}
            </div>
            <div>
              <label htmlFor="outlet-select-dashboard" className="block text-sm font-medium text-foreground mb-1">Select Outlet</label>
              {isFetchingOutlets ? (
                <Skeleton className="h-10 w-full bg-muted" />
              ) : (
                <Select value={selectedOutletId} onValueChange={setSelectedOutletId}>
                  <SelectTrigger id="outlet-select-dashboard" className="w-full text-base md:text-sm">
                    <SelectValue placeholder="Select an outlet" />
                  </SelectTrigger>
                  <SelectContent>
                    {allOutlets.map((outlet) => (
                      <SelectItem key={outlet.id} value={outlet.id}>
                        {outlet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoadingData || dateRange === undefined ? (
          <>
            {[...Array(4)].map((_, index) => (
              <StatCard key={index} isLoading={true} title="" value="" icon={DollarSign} />
            ))}
          </>
        ) : (
          summaryStatsList.map((stat, index) => (<StatCard key={index} {...stat} />))
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Overview Chart Card (Main Bar Chart) */}
        <Card className="lg:col-span-2 shadow-md bg-card">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Costs Overview (Daily Hotel %)</CardTitle>
            <CardDescription>Hotel Food & Beverage cost percentages over the selected period.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            {isLoadingData || dateRange === undefined || !dashboardData?.overviewChartData ? <Skeleton className="h-full w-full bg-muted" /> : (
              <ChartContainer config={overviewChartConfig} className="h-full w-full">
                <BarChart data={dashboardData.overviewChartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} stroke="hsl(var(--muted-foreground))" />
                  <YAxis unit="%" tickLine={false} axisLine={false} tickMargin={8} stroke="hsl(var(--muted-foreground))" domain={[0, 'dataMax + 5']} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dashed" />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="foodCostPct" fill="var(--color-foodCostPct)" radius={4} name="Food Cost %" />
                  <Bar dataKey="beverageCostPct" fill="var(--color-beverageCostPct)" radius={4} name="Bev Cost %" />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Cost Distribution by Outlet (Donut Chart) */}
         <Card className="shadow-md bg-card">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Cost Distribution by Outlet</CardTitle>
            <CardDescription>Total costs breakdown per outlet (Top 5).</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] flex items-center justify-center">
            {isLoadingData || dateRange === undefined || !dashboardData?.costDistributionChartData ? <Skeleton className="h-full w-full bg-muted" /> : (
              <ChartContainer config={donutChartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={dashboardData.costDistributionChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={120}
                      innerRadius={70}
                      dataKey="value"
                      nameKey="name"
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                          const x = cx + (radius + 20) * Math.cos(-midAngle * (Math.PI / 180));
                          const y = cy + (radius + 20) * Math.sin(-midAngle * (Math.PI / 180));
                          return (
                            <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs">
                              {`${name} ${(percent * 100).toFixed(0)}%`}
                            </text>
                          );
                      }}
                    >
                      {dashboardData.costDistributionChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                    <RechartsLegend wrapperStyle={{fontSize: "0.8rem"}}/>
                  </RechartsPie>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
          {/* Cost Trends (Line Chart) */}
          <Card className="shadow-md bg-card">
            <CardHeader>
              <CardTitle className="font-headline text-xl">Cost Trends</CardTitle>
              <CardDescription>
                {selectedOutletId && selectedOutletId !== 'all' 
                  ? `Food & Bev cost % trend for ${allOutlets.find(o => o.id === selectedOutletId)?.name || 'selected outlet'} (vs Hotel Revenue).`
                  : "Average daily hotel cost % trends."}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
            {isLoadingData || dateRange === undefined || !dashboardData?.costTrendsChartData ? <Skeleton className="h-full w-full bg-muted" /> : (
              <ChartContainer config={overviewChartConfig} className="h-full w-full">
                <RechartsLine data={dashboardData.costTrendsChartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50"/>
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} stroke="hsl(var(--muted-foreground))" />
                  <YAxis unit="%" tickLine={false} axisLine={false} tickMargin={8} stroke="hsl(var(--muted-foreground))" domain={[0, 'dataMax + 5']} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot"/>}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line type="monotone" dataKey="foodCostPct" stroke="var(--color-foodCostPct)" strokeWidth={2} dot={{r:3}} activeDot={{r:5}} name="Food Cost %"/>
                  <Line type="monotone" dataKey="beverageCostPct" stroke="var(--color-beverageCostPct)" strokeWidth={2} dot={{r:3}} activeDot={{r:5}} name="Bev Cost %"/>
                </RechartsLine>
              </ChartContainer>
            )}
            </CardContent>
          </Card>

          {/* Outlet Performance */}
          <Card className="shadow-md bg-card">
            <CardHeader>
              <CardTitle className="font-headline text-xl">Top Outlet Performance (Food Cost %)</CardTitle>
              <CardDescription>Outlets with highest average Food Cost % (vs Hotel Revenue).</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px] overflow-y-auto">
              {isLoadingData || dateRange === undefined || !dashboardData?.outletPerformanceData ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full bg-muted" />)}
                </div>
              ) : dashboardData.outletPerformanceData && dashboardData.outletPerformanceData.length > 0 ? (
                <ul className="space-y-3">
                  {dashboardData.outletPerformanceData.map((item) => (
                    <li key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-md hover:bg-muted/60 transition-colors">
                      <div className="flex items-center space-x-3">
                        <ListChecks className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium text-sm text-foreground">{item.outletName}</p>
                          <p className="text-xs text-muted-foreground">{item.metricName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm text-foreground">{item.value}</p>
                        {item.trend && (
                           <p className={`text-xs ${item.trend === 'up' ? 'text-destructive' : 'text-green-600'}`}>
                            {item.trend === 'up' ? <TrendingUp className="inline h-3 w-3 mr-0.5"/> : <TrendingDown className="inline h-3 w-3 mr-0.5"/>}
                            {item.trend === 'up' ? 'Higher' : 'Lower'}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground text-center pt-10">No outlet performance data available for the selected period.</p>
              )}
            </CardContent>
          </Card>
      </div>
    </div>
  );
}

    