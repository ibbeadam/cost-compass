
"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart as LucideBarChart, LineChart as LucideLineChart, TrendingUp, AlertCircle } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  LineChart as RechartsLineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Bar,
  Line,
} from "recharts";
import type { DailyCostData, HistoricalDataPoint } from "@/types";
import { ChartConfig, ChartContainer, ChartTooltipContent, ChartLegendContent } from "@/components/ui/chart";


interface CostChartToggleProps {
  dailyData: DailyCostData[]; 
  historicalData: HistoricalDataPoint[];
  selectedOutletName?: string;
}

const chartConfig = {
  foodCostPct: {
    label: "Food Cost %",
    color: "hsl(var(--chart-1))", // Blue
    icon: () => <TrendingUp className="h-4 w-4 text-[hsl(var(--chart-1))]" />,
  },
  beverageCostPct: {
    label: "Beverage Cost %",
    color: "hsl(var(--chart-2))", // Orange
    icon: () => <TrendingUp className="h-4 w-4 text-[hsl(var(--chart-2))]" />,
  },
} satisfies ChartConfig;


export function CostChartToggle({ dailyData, historicalData, selectedOutletName }: CostChartToggleProps) {
  const [activeChart, setActiveChart] = useState<"bar" | "line">("bar");

  const barChartData = dailyData.map(item => ({
    name: item.outletName.split(' - ')[0], 
    foodCostPct: item.foodCostPct,
    beverageCostPct: item.beverageCostPct,
  }));

  const lineChartData = historicalData;

   const NoDataContent = () => (
     <Card className="shadow-lg bg-card w-full">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <AlertCircle className="mr-2 h-5 w-5 text-muted-foreground" />
            Chart Data Unavailable
          </CardTitle>
          <CardDescription>
            There is no data to display for the current selection.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <p className="text-muted-foreground">Please select a valid date and outlet.</p>
        </CardContent>
      </Card>
   );

  if ((activeChart === "bar" && (!barChartData || barChartData.length === 0)) || 
      (activeChart === "line" && (!lineChartData || lineChartData.length === 0))) {
    return <NoDataContent />;
  }


  return (
    <Card className="shadow-lg bg-card w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="font-headline text-xl">
              {activeChart === "bar" ? "Daily Cost Percentages by Outlet" : `Monthly Cost Trend: ${selectedOutletName || 'Selected Outlet'}`}
            </CardTitle>
            <CardDescription>
              {activeChart === "bar" ? "Comparison of food and beverage cost percentages across outlets for the selected date." : "Trend of food and beverage cost percentages over the past month for the selected outlet."}
            </CardDescription>
          </div>
          <Tabs value={activeChart} onValueChange={(value) => setActiveChart(value as "bar" | "line")} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-2 sm:w-auto">
              <TabsTrigger value="bar" className="flex items-center gap-2">
                <LucideBarChart className="h-4 w-4" /> Bar
              </TabsTrigger>
              <TabsTrigger value="line" className="flex items-center gap-2">
                <LucideLineChart className="h-4 w-4" /> Line
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          {activeChart === "bar" && barChartData.length > 0 && (
            <RechartsBarChart data={barChartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} stroke="hsl(var(--muted-foreground))" />
              <YAxis unit="%" tickLine={false} axisLine={false} tickMargin={8} stroke="hsl(var(--muted-foreground))" />
              <ChartTooltipContent indicator="dashed" nameKey="name" />
              <ChartLegendContent />
              <Bar dataKey="foodCostPct" fill="var(--color-foodCostPct)" radius={4} />
              <Bar dataKey="beverageCostPct" fill="var(--color-beverageCostPct)" radius={4} />
            </RechartsBarChart>
          )}
          {activeChart === "line" && lineChartData.length > 0 && (
             <RechartsLineChart data={lineChartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 
                tickLine={false} axisLine={false} tickMargin={8} 
                stroke="hsl(var(--muted-foreground))" 
              />
              <YAxis unit="%" tickLine={false} axisLine={false} tickMargin={8} stroke="hsl(var(--muted-foreground))" />
              <ChartTooltipContent indicator="dot" />
              <ChartLegendContent />
              <Line type="monotone" dataKey="foodCostPct" stroke="var(--color-foodCostPct)" strokeWidth={2} dot={{r: 4, fill: "var(--color-foodCostPct)"}} activeDot={{r:6}} />
              <Line type="monotone" dataKey="beverageCostPct" stroke="var(--color-beverageCostPct)" strokeWidth={2} dot={{r: 4, fill: "var(--color-beverageCostPct)"}} activeDot={{r:6}} />
            </RechartsLineChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
