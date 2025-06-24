"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { YearOverYearReport } from "@/types";
import { formatNumber } from "@/lib/utils";
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  DollarSign,
  Percent,
  BarChart3,
  Activity
} from "lucide-react";

interface YearOverYearReportTableProps {
  data: YearOverYearReport | null;
}

export function YearOverYearReportTable({ data }: YearOverYearReportTableProps) {
  if (!data) {
    return (
      <p className="text-center text-muted-foreground">
        No year-over-year data available for comparison.
      </p>
    );
  }

  const renderCurrency = (value: number) => {
    return `$${formatNumber(value)}`;
  };

  const renderPercentage = (value: number, showSign = true) => {
    const sign = showSign && value > 0 ? "+" : "";
    return `${sign}${formatNumber(value)}%`;
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (growth < 0) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Activity className="h-4 w-4 text-muted-foreground" />;
  };

  const getGrowthBadgeVariant = (growth: number) => {
    if (growth > 10) return "default";
    if (growth > 0) return "secondary";
    if (growth > -10) return "outline";
    return "destructive";
  };

  const getPerformanceBadgeVariant = (performance: "outperforming" | "underperforming" | "on_track") => {
    switch (performance) {
      case "outperforming":
        return "default";
      case "on_track":
        return "secondary";
      case "underperforming":
        return "destructive";
    }
  };

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Year-over-Year Performance Report</h2>
        <p className="text-muted-foreground">
          {data.currentYearData.year} vs {data.previousYearData.year} Comparison
        </p>
      </div>

      {/* High-Level Metrics Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue Growth</CardTitle>
            {getGrowthIcon(data.growthMetrics.revenueGrowth)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {renderPercentage(data.growthMetrics.revenueGrowth)}
            </div>
            <div className="text-xs text-muted-foreground">
              {renderCurrency(data.currentYearData.totalRevenue)} vs {renderCurrency(data.previousYearData.totalRevenue)}
            </div>
            <Badge variant={getGrowthBadgeVariant(data.growthMetrics.revenueGrowth)} className="mt-2">
              {data.growthMetrics.revenueGrowth > 0 ? "Growing" : data.growthMetrics.revenueGrowth < 0 ? "Declining" : "Stable"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Growth</CardTitle>
            {getGrowthIcon(data.growthMetrics.profitGrowth)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {renderPercentage(data.growthMetrics.profitGrowth)}
            </div>
            <div className="text-xs text-muted-foreground">
              {renderCurrency(data.currentYearData.netProfit)} vs {renderCurrency(data.previousYearData.netProfit)}
            </div>
            <Badge variant={getGrowthBadgeVariant(data.growthMetrics.profitGrowth)} className="mt-2">
              {data.growthMetrics.profitGrowth > 0 ? "Improving" : data.growthMetrics.profitGrowth < 0 ? "Declining" : "Stable"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margin Improvement</CardTitle>
            {getGrowthIcon(data.growthMetrics.marginImprovement)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {renderPercentage(data.growthMetrics.marginImprovement)}
            </div>
            <div className="text-xs text-muted-foreground">
              Operational efficiency change
            </div>
            <Badge variant={getGrowthBadgeVariant(data.growthMetrics.marginImprovement)} className="mt-2">
              {data.growthMetrics.marginImprovement > 0 ? "Optimizing" : data.growthMetrics.marginImprovement < 0 ? "Declining" : "Stable"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Year Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Detailed Financial Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">{data.previousYearData.year}</TableHead>
                <TableHead className="text-right">{data.currentYearData.year}</TableHead>
                <TableHead className="text-right">Growth</TableHead>
                <TableHead className="text-right">Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Total Revenue</TableCell>
                <TableCell className="text-right font-mono">
                  {renderCurrency(data.previousYearData.totalRevenue)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {renderCurrency(data.currentYearData.totalRevenue)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {renderPercentage(data.growthMetrics.revenueGrowth)}
                </TableCell>
                <TableCell className="text-right">
                  {renderCurrency(data.currentYearData.totalRevenue - data.previousYearData.totalRevenue)}
                </TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell className="font-medium">Food Revenue</TableCell>
                <TableCell className="text-right font-mono">
                  {renderCurrency(data.previousYearData.totalFoodRevenue)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {renderCurrency(data.currentYearData.totalFoodRevenue)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {renderPercentage(data.growthMetrics.foodRevenueGrowth)}
                </TableCell>
                <TableCell className="text-right">
                  {renderCurrency(data.currentYearData.totalFoodRevenue - data.previousYearData.totalFoodRevenue)}
                </TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell className="font-medium">Beverage Revenue</TableCell>
                <TableCell className="text-right font-mono">
                  {renderCurrency(data.previousYearData.totalBeverageRevenue)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {renderCurrency(data.currentYearData.totalBeverageRevenue)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {renderPercentage(data.growthMetrics.beverageRevenueGrowth)}
                </TableCell>
                <TableCell className="text-right">
                  {renderCurrency(data.currentYearData.totalBeverageRevenue - data.previousYearData.totalBeverageRevenue)}
                </TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell className="font-medium">Total Costs</TableCell>
                <TableCell className="text-right font-mono">
                  {renderCurrency(data.previousYearData.totalCosts)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {renderCurrency(data.currentYearData.totalCosts)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {renderPercentage(data.growthMetrics.costGrowth)}
                </TableCell>
                <TableCell className="text-right">
                  {renderCurrency(data.currentYearData.totalCosts - data.previousYearData.totalCosts)}
                </TableCell>
              </TableRow>
              
              <TableRow className="border-t-2 font-bold">
                <TableCell>Net Profit</TableCell>
                <TableCell className="text-right font-mono">
                  {renderCurrency(data.previousYearData.netProfit)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {renderCurrency(data.currentYearData.netProfit)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {renderPercentage(data.growthMetrics.profitGrowth)}
                </TableCell>
                <TableCell className="text-right">
                  {renderCurrency(data.currentYearData.netProfit - data.previousYearData.netProfit)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Monthly Performance Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Monthly Performance Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">{data.previousYearData.year}</TableHead>
                <TableHead className="text-right">{data.currentYearData.year}</TableHead>
                <TableHead className="text-right">Growth %</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead className="text-right">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.monthlyComparison.map((month) => (
                <TableRow key={month.month}>
                  <TableCell className="font-medium">{monthNames[month.month - 1]}</TableCell>
                  <TableCell className="text-right font-mono">
                    {renderCurrency(month.previousYearRevenue)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {renderCurrency(month.currentYearRevenue)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {renderPercentage(month.growth)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPerformanceBadgeVariant(month.performance)}>
                      {month.performance.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Progress 
                      value={Math.min(Math.max((month.growth + 50) / 100 * 100, 0), 100)} 
                      className="w-16"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Insights and Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Key Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-green-600 mb-3">Strongest Performing Months</h4>
              <ul className="space-y-2">
                {data.insights.strongestMonths.map((month, index) => (
                  <li key={index} className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    {month}
                  </li>
                ))}
              </ul>
              
              <h4 className="font-medium text-blue-600 mb-3 mt-6">Seasonal Trends</h4>
              <ul className="space-y-2">
                {data.insights.seasonalTrends.map((trend, index) => (
                  <li key={index} className="text-sm flex items-center gap-2">
                    <Activity className="h-3 w-3 text-blue-500" />
                    {trend}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-yellow-600 mb-3">Areas for Improvement</h4>
              <ul className="space-y-2">
                {data.insights.weakestMonths.map((month, index) => (
                  <li key={index} className="text-sm flex items-center gap-2">
                    <TrendingDown className="h-3 w-3 text-yellow-500" />
                    {month}
                  </li>
                ))}
              </ul>
              
              <h4 className="font-medium text-purple-600 mb-3 mt-6">Strategic Recommendations</h4>
              <ul className="space-y-2">
                {data.insights.recommendations.map((recommendation, index) => (
                  <li key={index} className="text-sm flex items-center gap-2">
                    <DollarSign className="h-3 w-3 text-purple-500" />
                    {recommendation}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}