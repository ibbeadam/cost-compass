"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { safeFormatDate } from "@/lib/date-utils";
import { TrendingUp, TrendingDown, Target, DollarSign, Percent, BarChart3, Calendar, Building } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn, formatNumber } from "@/lib/utils";
import type { BudgetVsActualsReport } from "@/types";

interface BudgetVsActualsReportTableProps {
  reportData: BudgetVsActualsReport & { propertyInfo?: { id: number; name: string; propertyCode: string } | null };
}

export function BudgetVsActualsReportTable({ reportData }: BudgetVsActualsReportTableProps) {
  const [isDailyBreakdownOpen, setIsDailyBreakdownOpen] = useState(false);

  // Safety checks for missing data
  if (!reportData) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <p>No report data available.</p>
      </div>
    );
  }

  // Ensure all required properties exist with default values
  const dailyBreakdown = reportData.dailyBreakdown || [];
  const dateRange = reportData.dateRange || { from: new Date(), to: new Date() };
  const outletName = reportData.outletName;

  const getPropertySuffix = () => {
    if (reportData.propertyInfo?.name) {
      return ` - ${reportData.propertyInfo.name}`;
    }
    return " - All Properties";
  };

  const getDateRangeDisplay = () => {
    return ` | ${format(dateRange.from, "MMM dd, yyyy")} - ${format(dateRange.to, "MMM dd, yyyy")}`;
  };
  
  // Food budget data with defaults
  const foodBudget = reportData.foodBudget || {
    budgetedRevenue: 0,
    budgetedCostPercentage: 0,
    budgetedCost: 0
  };
  
  // Food actual data with defaults
  const foodActual = reportData.foodActual || {
    actualRevenue: 0,
    actualCost: 0,
    actualCostPercentage: 0
  };
  
  // Food variance data with defaults
  const foodVariance = reportData.foodVariance || {
    revenueVariance: 0,
    revenueVariancePercentage: 0,
    costVariance: 0,
    costVariancePercentage: 0,
    costPercentageVariance: 0
  };
  
  // Beverage budget data with defaults
  const beverageBudget = reportData.beverageBudget || {
    budgetedRevenue: 0,
    budgetedCostPercentage: 0,
    budgetedCost: 0
  };
  
  // Beverage actual data with defaults
  const beverageActual = reportData.beverageActual || {
    actualRevenue: 0,
    actualCost: 0,
    actualCostPercentage: 0
  };
  
  // Beverage variance data with defaults
  const beverageVariance = reportData.beverageVariance || {
    revenueVariance: 0,
    revenueVariancePercentage: 0,
    costVariance: 0,
    costVariancePercentage: 0,
    costPercentageVariance: 0
  };
  
  // Combined budget data with defaults
  const combinedBudget = reportData.combinedBudget || {
    budgetedRevenue: 0,
    budgetedCost: 0,
    budgetedCostPercentage: 0
  };
  
  // Combined actual data with defaults
  const combinedActual = reportData.combinedActual || {
    actualRevenue: 0,
    actualCost: 0,
    actualCostPercentage: 0
  };
  
  // Combined variance data with defaults
  const combinedVariance = reportData.combinedVariance || {
    revenueVariance: 0,
    revenueVariancePercentage: 0,
    costVariance: 0,
    costVariancePercentage: 0,
    costPercentageVariance: 0
  };
  
  // Performance indicators with defaults
  const performanceIndicators = reportData.performanceIndicators || {
    foodRevenueAchievement: 0,
    beverageRevenueAchievement: 0,
    foodCostControl: 0,
    beverageCostControl: 0,
    overallPerformance: 0
  };

  const renderCurrency = (value: number) => {
    return `$${formatNumber(value)}`;
  };

  const renderPercentage = (value: number) => {
    return `${formatNumber(value)}%`;
  };

  const getVarianceColor = (value: number) => {
    if (value > 0) return "text-green-600 dark:text-green-500";
    if (value < 0) return "text-red-600 dark:text-red-500";
    return "text-gray-600 dark:text-gray-400";
  };

  const getVarianceIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4" />;
    if (value < 0) return <TrendingDown className="h-4 w-4" />;
    return null;
  };

  const getPerformanceColor = (value: number) => {
    if (value >= 90) return "text-green-600 dark:text-green-500";
    if (value >= 75) return "text-yellow-600 dark:text-yellow-500";
    return "text-red-600 dark:text-red-500";
  };

  const getPerformanceBadge = (value: number) => {
    if (value >= 90) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Excellent</Badge>;
    if (value >= 75) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Good</Badge>;
    return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Needs Improvement</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {dailyBreakdown.length} days analyzed
          </span>
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Performance</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{renderPercentage(performanceIndicators.overallPerformance)}</div>
            <div className="flex items-center gap-2 mt-2">
              {getPerformanceBadge(performanceIndicators.overallPerformance)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Food Revenue Achievement</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{renderPercentage(performanceIndicators.foodRevenueAchievement)}</div>
            <Progress value={performanceIndicators.foodRevenueAchievement} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Beverage Revenue Achievement</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{renderPercentage(performanceIndicators.beverageRevenueAchievement)}</div>
            <Progress value={performanceIndicators.beverageRevenueAchievement} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Control Score</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {renderPercentage((performanceIndicators.foodCostControl + performanceIndicators.beverageCostControl) / 2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Lower is better</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Budget vs. Actuals Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Budgeted Revenue</TableHead>
                <TableHead className="text-right">Actual Revenue</TableHead>
                <TableHead className="text-right">Revenue Variance</TableHead>
                <TableHead className="text-right">Budgeted Cost %</TableHead>
                <TableHead className="text-right">Actual Cost %</TableHead>
                <TableHead className="text-right">Cost % Variance</TableHead>
                <TableHead className="text-right">Budgeted Cost</TableHead>
                <TableHead className="text-right">Actual Cost</TableHead>
                <TableHead className="text-right">Cost Variance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Food Row */}
              <TableRow>
                <TableCell className="font-semibold">Food</TableCell>
                <TableCell className="text-right font-mono">{renderCurrency(foodBudget.budgetedRevenue)}</TableCell>
                <TableCell className="text-right font-mono">{renderCurrency(foodActual.actualRevenue)}</TableCell>
                <TableCell className={cn("text-right font-mono flex items-center justify-end gap-1", getVarianceColor(foodVariance.revenueVariance))}>
                  {getVarianceIcon(foodVariance.revenueVariance)}
                  {renderCurrency(foodVariance.revenueVariance)}
                </TableCell>
                <TableCell className="text-right font-mono">{renderPercentage(foodBudget.budgetedCostPercentage)}</TableCell>
                <TableCell className="text-right font-mono">{renderPercentage(foodActual.actualCostPercentage)}</TableCell>
                <TableCell className={cn("text-right font-mono flex items-center justify-end gap-1", getVarianceColor(foodVariance.costPercentageVariance))}>
                  {getVarianceIcon(foodVariance.costPercentageVariance)}
                  {renderPercentage(foodVariance.costPercentageVariance)}
                </TableCell>
                <TableCell className="text-right font-mono">{renderCurrency(foodBudget.budgetedCost)}</TableCell>
                <TableCell className="text-right font-mono">{renderCurrency(foodActual.actualCost)}</TableCell>
                <TableCell className={cn("text-right font-mono flex items-center justify-end gap-1", getVarianceColor(foodVariance.costVariance))}>
                  {getVarianceIcon(foodVariance.costVariance)}
                  {renderCurrency(foodVariance.costVariance)}
                </TableCell>
              </TableRow>

              {/* Beverage Row */}
              <TableRow>
                <TableCell className="font-semibold">Beverage</TableCell>
                <TableCell className="text-right font-mono">{renderCurrency(beverageBudget.budgetedRevenue)}</TableCell>
                <TableCell className="text-right font-mono">{renderCurrency(beverageActual.actualRevenue)}</TableCell>
                <TableCell className={cn("text-right font-mono flex items-center justify-end gap-1", getVarianceColor(beverageVariance.revenueVariance))}>
                  {getVarianceIcon(beverageVariance.revenueVariance)}
                  {renderCurrency(beverageVariance.revenueVariance)}
                </TableCell>
                <TableCell className="text-right font-mono">{renderPercentage(beverageBudget.budgetedCostPercentage)}</TableCell>
                <TableCell className="text-right font-mono">{renderPercentage(beverageActual.actualCostPercentage)}</TableCell>
                <TableCell className={cn("text-right font-mono flex items-center justify-end gap-1", getVarianceColor(beverageVariance.costPercentageVariance))}>
                  {getVarianceIcon(beverageVariance.costPercentageVariance)}
                  {renderPercentage(beverageVariance.costPercentageVariance)}
                </TableCell>
                <TableCell className="text-right font-mono">{renderCurrency(beverageBudget.budgetedCost)}</TableCell>
                <TableCell className="text-right font-mono">{renderCurrency(beverageActual.actualCost)}</TableCell>
                <TableCell className={cn("text-right font-mono flex items-center justify-end gap-1", getVarianceColor(beverageVariance.costVariance))}>
                  {getVarianceIcon(beverageVariance.costVariance)}
                  {renderCurrency(beverageVariance.costVariance)}
                </TableCell>
              </TableRow>

              {/* Combined Row */}
              <TableRow className="bg-muted/50">
                <TableCell className="font-bold">Combined F&B</TableCell>
                <TableCell className="text-right font-mono font-bold">{renderCurrency(combinedBudget.budgetedRevenue)}</TableCell>
                <TableCell className="text-right font-mono font-bold">{renderCurrency(combinedActual.actualRevenue)}</TableCell>
                <TableCell className={cn("text-right font-mono font-bold flex items-center justify-end gap-1", getVarianceColor(combinedVariance.revenueVariance))}>
                  {getVarianceIcon(combinedVariance.revenueVariance)}
                  {renderCurrency(combinedVariance.revenueVariance)}
                </TableCell>
                <TableCell className="text-right font-mono font-bold">{renderPercentage(combinedBudget.budgetedCostPercentage)}</TableCell>
                <TableCell className="text-right font-mono font-bold">{renderPercentage(combinedActual.actualCostPercentage)}</TableCell>
                <TableCell className={cn("text-right font-mono font-bold flex items-center justify-end gap-1", getVarianceColor(combinedVariance.costPercentageVariance))}>
                  {getVarianceIcon(combinedVariance.costPercentageVariance)}
                  {renderPercentage(combinedVariance.costPercentageVariance)}
                </TableCell>
                <TableCell className="text-right font-mono font-bold">{renderCurrency(combinedBudget.budgetedCost)}</TableCell>
                <TableCell className="text-right font-mono font-bold">{renderCurrency(combinedActual.actualCost)}</TableCell>
                <TableCell className={cn("text-right font-mono font-bold flex items-center justify-end gap-1", getVarianceColor(combinedVariance.costVariance))}>
                  {getVarianceIcon(combinedVariance.costVariance)}
                  {renderCurrency(combinedVariance.costVariance)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Daily Breakdown */}
      <Card>
        <CardHeader>
          <Collapsible open={isDailyBreakdownOpen} onOpenChange={setIsDailyBreakdownOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 p-0 h-auto">
                <Calendar className="h-5 w-5" />
                <CardTitle>Daily Breakdown</CardTitle>
                <span className="text-sm text-muted-foreground">({dailyBreakdown.length} days)</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Food Revenue</TableHead>
                      <TableHead className="text-right">Food Cost</TableHead>
                      <TableHead className="text-right">Food Cost %</TableHead>
                      <TableHead className="text-right">Beverage Revenue</TableHead>
                      <TableHead className="text-right">Beverage Cost</TableHead>
                      <TableHead className="text-right">Beverage Cost %</TableHead>
                      <TableHead className="text-right">Total Revenue</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyBreakdown.map((day, index) => {
                      const foodCostPct = day.foodActualRevenue > 0 ? (day.foodActualCost / day.foodActualRevenue) * 100 : 0;
                      const beverageCostPct = day.beverageActualRevenue > 0 ? (day.beverageActualCost / day.beverageActualRevenue) * 100 : 0;
                      const totalRevenue = day.foodActualRevenue + day.beverageActualRevenue;
                      const totalCost = day.foodActualCost + day.beverageActualCost;
                      
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-mono">{safeFormatDate(day.date)}</TableCell>
                          <TableCell className="text-right font-mono">{renderCurrency(day.foodActualRevenue)}</TableCell>
                          <TableCell className="text-right font-mono">{renderCurrency(day.foodActualCost)}</TableCell>
                          <TableCell className="text-right font-mono">{renderPercentage(foodCostPct)}</TableCell>
                          <TableCell className="text-right font-mono">{renderCurrency(day.beverageActualRevenue)}</TableCell>
                          <TableCell className="text-right font-mono">{renderCurrency(day.beverageActualCost)}</TableCell>
                          <TableCell className="text-right font-mono">{renderPercentage(beverageCostPct)}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">{renderCurrency(totalRevenue)}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">{renderCurrency(totalCost)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardHeader>
      </Card>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Revenue Performance</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Food Revenue Achievement:</span>
                  <span className={getPerformanceColor(performanceIndicators.foodRevenueAchievement)}>
                    {renderPercentage(performanceIndicators.foodRevenueAchievement)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Beverage Revenue Achievement:</span>
                  <span className={getPerformanceColor(performanceIndicators.beverageRevenueAchievement)}>
                    {renderPercentage(performanceIndicators.beverageRevenueAchievement)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Cost Control</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Food Cost Control:</span>
                  <span className={getPerformanceColor(100 - performanceIndicators.foodCostControl)}>
                    {renderPercentage(performanceIndicators.foodCostControl)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Beverage Cost Control:</span>
                  <span className={getPerformanceColor(100 - performanceIndicators.beverageCostControl)}>
                    {renderPercentage(performanceIndicators.beverageCostControl)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-2">Recommendations</h4>
            <div className="space-y-2 text-sm">
              {foodVariance.costPercentageVariance > 0 && (
                <p className="text-red-600 dark:text-red-400">
                  ⚠️ Food costs are {renderPercentage(foodVariance.costPercentageVariance)} above budget. Review purchasing and portion control.
                </p>
              )}
              {beverageVariance.costPercentageVariance > 0 && (
                <p className="text-red-600 dark:text-red-400">
                  ⚠️ Beverage costs are {renderPercentage(beverageVariance.costPercentageVariance)} above budget. Check inventory management and pricing.
                </p>
              )}
              {foodVariance.revenueVariance < 0 && (
                <p className="text-yellow-600 dark:text-yellow-400">
                  📊 Food revenue is {renderPercentage(Math.abs(foodVariance.revenueVariancePercentage))} below budget. Consider menu optimization and marketing.
                </p>
              )}
              {beverageVariance.revenueVariance < 0 && (
                <p className="text-yellow-600 dark:text-yellow-400">
                  📊 Beverage revenue is {renderPercentage(Math.abs(beverageVariance.revenueVariancePercentage))} below budget. Review beverage pricing and promotions.
                </p>
              )}
              {performanceIndicators.overallPerformance >= 90 && (
                <p className="text-green-600 dark:text-green-400">
                  ✅ Excellent overall performance! Continue current operational practices.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 