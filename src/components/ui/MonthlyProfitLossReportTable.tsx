"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DollarSign, Percent, TrendingUp, TrendingDown } from "lucide-react";
import type { MonthlyProfitLossReport } from "@/types";
import { cn, formatNumber } from "@/lib/utils";

interface MonthlyProfitLossReportTableProps {
  data: MonthlyProfitLossReport | null;
}

const StatCard = ({
  title,
  value,
  isCurrency = false,
  isPercentage = false,
  trendValue = null,
}: { 
  title: string; 
  value: number; 
  isCurrency?: boolean; 
  isPercentage?: boolean; 
  trendValue?: number | null; 
}) => {
  const formattedValue = isCurrency
    ? `$${formatNumber(value)}`
    : isPercentage
    ? `${formatNumber(value)}%`
    : formatNumber(value);

  const trendIcon = trendValue !== null ? (
    trendValue > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500 ml-1" />
    ) : trendValue < 0 ? (
      <TrendingDown className="h-4 w-4 text-destructive ml-1" />
    ) : null
  ) : null;

  return (
    <Card className="shadow-sm transition-all duration-300 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {isCurrency && <DollarSign className="h-4 w-4 text-muted-foreground" />}
        {isPercentage && <Percent className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold flex items-center", {
          "text-green-600": isPercentage && trendValue !== null && trendValue < 0,
          "text-destructive": isPercentage && trendValue !== null && trendValue > 0
        })}>
          {formattedValue}
          {trendIcon}
        </div>
      </CardContent>
    </Card>
  );
};

export function MonthlyProfitLossReportTable({ data }: MonthlyProfitLossReportTableProps) {
  if (!data) {
    return <p className="text-center text-muted-foreground">No monthly profit/loss data available for the selected period.</p>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground text-center">Monthly Profit/Loss Report for {data.monthYear}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Food Revenue" value={data.totalFoodRevenue} isCurrency />
        <StatCard title="Total Beverage Revenue" value={data.totalBeverageRevenue} isCurrency />
        <StatCard title="Total Revenue" value={data.totalRevenue} isCurrency />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Actual Food Cost" value={data.totalActualFoodCost} isCurrency />
        <StatCard title="Total Actual Beverage Cost" value={data.totalActualBeverageCost} isCurrency />
        <StatCard title="Total Actual Cost" value={data.totalActualCost} isCurrency />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Gross Profit" value={data.grossProfit} isCurrency trendValue={data.grossProfit} />
        <StatCard title="Food Cost %" value={data.foodCostPercentage} isPercentage trendValue={data.foodCostPercentage - data.averageBudgetFoodCostPct} />
        <StatCard title="Beverage Cost %" value={data.beverageCostPercentage} isPercentage trendValue={data.beverageCostPercentage - data.averageBudgetBeverageCostPct} />
        <StatCard title="Overall Cost %" value={data.overallCostPercentage} isPercentage trendValue={data.overallCostPercentage - ((data.averageBudgetFoodCostPct + data.averageBudgetBeverageCostPct) / 2)} />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Avg. Budget Food Cost %" value={data.averageBudgetFoodCostPct} isPercentage />
        <StatCard title="Avg. Budget Beverage Cost %" value={data.averageBudgetBeverageCostPct} isPercentage />
      </div>

    </div>
  );
} 