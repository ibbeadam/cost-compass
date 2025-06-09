
"use client";

import { useState, useEffect, useMemo } from "react";
import { DollarSign, TrendingUp, TrendingDown, ShoppingCart, Users, Utensils, GlassWater, Percent, BarChart2, LineChart as LucideLineChart, PieChartIcon, ListChecks } from "lucide-react";
import { subDays, format as formatDateFn } from "date-fns";
import type { DateRange } from "react-day-picker";
import { collection, getDocs } from "firebase/firestore";

import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { outlets as mockOutlets, generateDashboardData, getRandomFloat } from "@/lib/mockData";
import type { Outlet, DashboardReportData, SummaryStat, ChartDataPoint, DonutChartDataPoint, OutletPerformanceDataPoint } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Bar, BarChart, Line, LineChart as RechartsLine, Pie, PieChart as RechartsPie, PolarGrid, PolarAngleAxis, PolarRadiusAxis, RadialBar, RadialBarChart, XAxis, YAxis, CartesianGrid, Legend as RechartsLegend, ResponsiveContainer, Cell, } from "recharts";


const StatCard: React.FC<SummaryStat & { isLoading?: boolean }> = ({ title, value, percentageChange, icon: Icon, iconColor = "text-primary", isLoading }) => {
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
        {percentageChange !== undefined && (
          <p className={`text-xs ${percentageChange >= 0 ? "text-green-600" : "text-destructive"}`}>
            {percentageChange >= 0 ? "+" : ""}{percentageChange.toFixed(2)}% from last period
          </p>
        )}
      </CardContent>
    </Card>
  );
};

const overviewChartConfig = {
  foodCostPct: { label: "Food Cost %", color: "hsl(var(--chart-1))" },
  beverageCostPct: { label: "Bev Cost %", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const donutChartConfig = {
  // Minimal config for the donut chart context
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
    // Initialize dateRange on the client after hydration
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
        const fetchedOutlets = outletsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Outlet));
        
        if (fetchedOutlets.length > 0) {
          setAllOutlets([{ id: "all", name: "All Outlets" }, ...fetchedOutlets]);
        } else {
          toast({ title: "No outlets found", description: "Using sample outlet data." });
          setAllOutlets([{ id: "all", name: "All Outlets" }, ...mockOutlets]);
        }
      } catch (error) {
        console.error("Error fetching outlets:", error);
        toast({ variant: "destructive", title: "Error fetching outlets", description: (error as Error).message });
        setAllOutlets([{ id: "all", name: "All Outlets" }, ...mockOutlets]);
      }
      setIsFetchingOutlets(false);
    };
    fetchFirestoreOutlets();
  }, [toast]);

  useEffect(() => {
    const loadDashboardData = () => {
      if (isFetchingOutlets || !dateRange) return; // Wait for dateRange to be initialized
      
      setIsLoadingData(true);
      setTimeout(() => {
        const outletIdToFilter = selectedOutletId === "all" ? undefined : selectedOutletId;
        const currentAllOutlets = allOutlets.filter(o => o.id !== "all");
        const data = generateDashboardData(dateRange, outletIdToFilter, currentAllOutlets);
        setDashboardData(data);
        setIsLoadingData(false);
      }, 500);
    };

    loadDashboardData();
  }, [dateRange, selectedOutletId, allOutlets, isFetchingOutlets]);

  const summaryStats: SummaryStat[] = useMemo(() => {
    if (!dashboardData || !dashboardData.summaryStats) {
      return [
        { title: "Total Food Revenue", value: "$0", icon: Utensils, percentageChange: 0 },
        { title: "Total Beverage Revenue", value: "$0", icon: GlassWater, percentageChange: 0 },
        { title: "Avg. Food Cost %", value: "0%", icon: Percent, iconColor: "text-green-500", percentageChange: 0 },
        { title: "Avg. Beverage Cost %", value: "0%", icon: Percent, iconColor: "text-orange-500", percentageChange: 0 },
      ];
    }
    const stats = dashboardData.summaryStats;
    // Using fixed percentages for now to avoid issues during parse error debugging
    const pChangeFoodRevenue = 2.5; 
    const pChangeBevRevenue = -1.0;
    const pChangeFoodCostPct = 0.5;
    const pChangeBevCostPct = -0.2;

    return [
      { title: "Total Food Revenue", value: `$${stats.totalFoodRevenue?.toLocaleString() ?? 'N/A'}`, icon: Utensils, percentageChange: pChangeFoodRevenue },
      { title: "Total Beverage Revenue", value: `$${stats.totalBeverageRevenue?.toLocaleString() ?? 'N/A'}`, icon: GlassWater, percentageChange: pChangeBevRevenue },
      { title: "Avg. Food Cost %", value: `${stats.avgFoodCostPct?.toFixed(1) ?? 'N/A'}%`, icon: Percent, iconColor: "text-green-500", percentageChange: pChangeFoodCostPct },
      { title: "Avg. Beverage Cost %", value: `${stats.avgBeverageCostPct?.toFixed(1) ?? 'N/A'}%`, icon: Percent, iconColor: "text-orange-500", percentageChange: pChangeBevCostPct },
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
              <StatCard key={index} isLoading={true} title="" value="" />
            ))}
          </>
        ) : (
          summaryStats.map((stat, index) => (<StatCard key={index} {...stat} />))
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Overview Chart Card (Main Bar Chart) */}
        <Card className="lg:col-span-2 shadow-md bg-card">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Costs Overview (Daily %)</CardTitle>
            <CardDescription>Food & Beverage cost percentages over the selected period.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            {isLoadingData || dateRange === undefined ? <Skeleton className="h-full w-full bg-muted" /> : (
              <ChartContainer config={overviewChartConfig} className="h-full w-full">
                <BarChart data={dashboardData?.overviewChartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} stroke="hsl(var(--muted-foreground))" />
                  <YAxis unit="%" tickLine={false} axisLine={false} tickMargin={8} stroke="hsl(var(--muted-foreground))" />
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
            <CardDescription>Total costs breakdown per outlet.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] flex items-center justify-center">
            {isLoadingData || dateRange === undefined ? <Skeleton className="h-full w-full bg-muted" /> : (
              <ChartContainer config={donutChartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={dashboardData?.costDistributionChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={120}
                      innerRadius={70}
                      fill="#8884d8"
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
                      {dashboardData?.costDistributionChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={costDistributionChartColors[index % costDistributionChartColors.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
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
                  ? `Food & Beverage cost % trend for ${allOutlets.find(o => o.id === selectedOutletId)?.name || 'selected outlet'}.`
                  : "Average daily cost % trends across all outlets."}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
            {isLoadingData || dateRange === undefined ? <Skeleton className="h-full w-full bg-muted" /> : (
              <ChartContainer config={overviewChartConfig} className="h-full w-full">
                <RechartsLine data={dashboardData?.costTrendsChartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50"/>
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} stroke="hsl(var(--muted-foreground))" />
                  <YAxis unit="%" tickLine={false} axisLine={false} tickMargin={8} stroke="hsl(var(--muted-foreground))" />
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
              <CardTitle className="font-headline text-xl">Top Outlet Performance</CardTitle>
              <CardDescription>Highlights of outlet food cost percentages.</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px] overflow-y-auto">
              {isLoadingData || dateRange === undefined ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full bg-muted" />)}
                </div>
              ) : dashboardData?.outletPerformanceData && dashboardData.outletPerformanceData.length > 0 ? (
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
                <p className="text-sm text-muted-foreground text-center pt-10">No outlet performance data available.</p>
              )}
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
