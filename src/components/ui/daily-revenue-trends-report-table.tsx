"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { safeFormatDate } from "@/lib/date-utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Calendar,
  BarChart3,
  Target,
  Activity,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn, formatNumber } from "@/lib/utils";
import type { DailyRevenueTrendsReport } from "@/types";

interface DailyRevenueTrendsReportTableProps {
  reportData: DailyRevenueTrendsReport & { propertyInfo?: { id: number; name: string; propertyCode: string } | null };
}

export function DailyRevenueTrendsReportTable({
  reportData,
}: DailyRevenueTrendsReportTableProps) {
  const [isDailyTrendsOpen, setIsDailyTrendsOpen] = useState(false);
  const [isWeeklyTrendsOpen, setIsWeeklyTrendsOpen] = useState(false);

  // Safety checks for missing data
  if (!reportData) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <p>No report data available.</p>
      </div>
    );
  }
  
  // Additional safety checks for critical data structures
  try {

  // Ensure all required properties exist with default values
  const summary = reportData.summary || {
    totalFoodRevenue: 0,
    totalBeverageRevenue: 0,
    totalRevenue: 0,
    averageDailyFoodRevenue: 0,
    averageDailyBeverageRevenue: 0,
    averageDailyTotalRevenue: 0,
    totalDays: 0,
    highestRevenueDay: {
      date: new Date(),
      foodRevenue: 0,
      beverageRevenue: 0,
      totalRevenue: 0,
    },
    lowestRevenueDay: {
      date: new Date(),
      foodRevenue: 0,
      beverageRevenue: 0,
      totalRevenue: 0,
    },
  };
  
  // Ensure dates are properly initialized
  if (summary.highestRevenueDay && !summary.highestRevenueDay.date) {
    summary.highestRevenueDay.date = new Date();
  }
  if (summary.lowestRevenueDay && !summary.lowestRevenueDay.date) {
    summary.lowestRevenueDay.date = new Date();
  }

  const dailyTrends = reportData.dailyTrends || [];
  const weeklyTrends = reportData.weeklyTrends || [];
  
  // Helper function to safely get week property with fallbacks
  const getWeekValue = (week: any, primaryKey: string, fallbackKey?: string, defaultValue: number = 0) => {
    if (week[primaryKey] !== undefined && week[primaryKey] !== null) {
      return week[primaryKey];
    }
    if (fallbackKey && week[fallbackKey] !== undefined && week[fallbackKey] !== null) {
      return week[fallbackKey];
    }
    return defaultValue;
  };
  
  // Helper function to calculate average daily values with validation
  const getAverageDailyValue = (week: any, totalKey: string, fallbackTotalKey?: string) => {
    const total = getWeekValue(week, totalKey, fallbackTotalKey, 0);
    const days = getWeekValue(week, 'daysInWeek', undefined, 1);
    return days > 0 ? total / days : 0;
  };
  
  // Validate and fix weekly trends data
  const validatedWeeklyTrends = weeklyTrends.map((week, index) => {
    const foodRevenue = getWeekValue(week, 'foodRevenue', 'totalFoodRevenue', 0);
    const beverageRevenue = getWeekValue(week, 'beverageRevenue', 'totalBeverageRevenue', 0);
    const totalRevenue = getWeekValue(week, 'totalRevenue', undefined, 0);
    const daysInWeek = getWeekValue(week, 'daysInWeek', undefined, 1);
    
    // Validate that total revenue matches food + beverage (with tolerance for rounding)
    const calculatedTotal = foodRevenue + beverageRevenue;
    const actualTotal = totalRevenue || calculatedTotal;
    
    // Log inconsistencies for debugging
    if (Math.abs(actualTotal - calculatedTotal) > 0.01 && calculatedTotal > 0) {
      console.warn(`Week ${index + 1}: Total revenue (${actualTotal}) doesn't match food (${foodRevenue}) + beverage (${beverageRevenue}) = ${calculatedTotal}`);
    }
    
    return {
      ...week,
      foodRevenue,
      beverageRevenue,
      totalRevenue: actualTotal,
      daysInWeek: Math.max(1, daysInWeek), // Ensure at least 1 day
      averageDailyFoodRevenue: getWeekValue(week, 'averageDailyFoodRevenue') || (daysInWeek > 0 ? foodRevenue / daysInWeek : 0),
      averageDailyBeverageRevenue: getWeekValue(week, 'averageDailyBeverageRevenue') || (daysInWeek > 0 ? beverageRevenue / daysInWeek : 0),
      averageDailyRevenue: getWeekValue(week, 'averageDailyRevenue', 'averageDailyTotalRevenue') || (daysInWeek > 0 ? actualTotal / daysInWeek : 0),
    };
  });
  const performanceMetrics = reportData.performanceMetrics || {
    foodRevenueGrowth: 0,
    beverageRevenueGrowth: 0,
    totalRevenueGrowth: 0,
    foodRevenueVolatility: 0,
    beverageRevenueVolatility: 0,
    totalRevenueVolatility: 0,
    bestPerformingDay: "N/A",
    worstPerformingDay: "N/A",
    revenueConsistency: 0,
  };

  const trendAnalysis = reportData.trendAnalysis || {
    overallTrend: "stable" as const,
    foodTrend: "stable" as const,
    beverageTrend: "stable" as const,
    trendStrength: 0,
    seasonalityDetected: false,
    peakDays: [],
    slowDays: [],
  };

  const dateRange = reportData.dateRange || {
    from: new Date(),
    to: new Date(),
  };
  
  // Use centralized date formatting utility
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

  const renderCurrency = (value: number) => {
    return `$${formatNumber(value)}`;
  };

  const renderPercentage = (value: number) => {
    return `${formatNumber(value)}%`;
  };

  const getTrendIcon = (trend: "increasing" | "decreasing" | "stable") => {
    switch (trend) {
      case "increasing":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "decreasing":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case "stable":
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: "increasing" | "decreasing" | "stable") => {
    switch (trend) {
      case "increasing":
        return "text-green-600 dark:text-green-500";
      case "decreasing":
        return "text-red-600 dark:text-red-500";
      case "stable":
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getTrendBadge = (trend: "increasing" | "decreasing" | "stable") => {
    switch (trend) {
      case "increasing":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Increasing
          </Badge>
        );
      case "decreasing":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            Decreasing
          </Badge>
        );
      case "stable":
        return (
          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
            Stable
          </Badge>
        );
    }
  };

  const getChangeColor = (value: number) => {
    if (value > 0) return "text-green-600 dark:text-green-500";
    if (value < 0) return "text-red-600 dark:text-red-500";
    return "text-gray-600 dark:text-gray-400";
  };

  const getChangeIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4" />;
    if (value < 0) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {renderCurrency(summary.totalRevenue)}
            </div>
            <div className="flex items-center gap-2 mt-2">
              {getTrendBadge(trendAnalysis.overallTrend)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Daily Revenue
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {renderCurrency(summary.averageDailyTotalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per day average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Revenue Growth
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {renderPercentage(performanceMetrics.totalRevenueGrowth)}
            </div>
            <div className="flex items-center gap-1 mt-2">
              {getTrendIcon(trendAnalysis.overallTrend)}
              <span
                className={cn(
                  "text-sm",
                  getTrendColor(trendAnalysis.overallTrend)
                )}
              >
                {trendAnalysis.trendStrength.toFixed(1)}% strength
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Revenue Consistency
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {renderPercentage(performanceMetrics.revenueConsistency)}
            </div>
            <Progress
              value={performanceMetrics.revenueConsistency}
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Trend Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUpIcon className="h-5 w-5" />
              Trend Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Overall Trend</h4>
                <div className="flex items-center gap-2">
                  {getTrendIcon(trendAnalysis.overallTrend)}
                  <span
                    className={cn(
                      "font-medium",
                      getTrendColor(trendAnalysis.overallTrend)
                    )}
                  >
                    {trendAnalysis.overallTrend.charAt(0).toUpperCase() +
                      trendAnalysis.overallTrend.slice(1)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Strength: {trendAnalysis.trendStrength.toFixed(1)}%
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Seasonality</h4>
                <div className="flex items-center gap-2">
                  {trendAnalysis.seasonalityDetected ? (
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      Detected
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                      Not Detected
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Peak Days</h4>
              <div className="flex flex-wrap gap-1">
                {trendAnalysis.peakDays.length > 0 ? (
                  trendAnalysis.peakDays.map((day, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-200"
                    >
                      {day}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    No peak days identified
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Slow Days</h4>
              <div className="flex flex-wrap gap-1">
                {trendAnalysis.slowDays.length > 0 ? (
                  trendAnalysis.slowDays.map((day, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="bg-red-50 text-red-700 border-red-200"
                    >
                      {day}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    No slow days identified
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Food Revenue Growth</span>
                <div className="flex items-center gap-1">
                  {getTrendIcon(trendAnalysis.foodTrend)}
                  <span
                    className={cn(
                      "text-sm font-medium",
                      getTrendColor(trendAnalysis.foodTrend)
                    )}
                  >
                    {renderPercentage(performanceMetrics.foodRevenueGrowth)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm">Beverage Revenue Growth</span>
                <div className="flex items-center gap-1">
                  {getTrendIcon(trendAnalysis.beverageTrend)}
                  <span
                    className={cn(
                      "text-sm font-medium",
                      getTrendColor(trendAnalysis.beverageTrend)
                    )}
                  >
                    {renderPercentage(performanceMetrics.beverageRevenueGrowth)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm">Revenue Volatility</span>
                <span className="text-sm font-medium">
                  {renderCurrency(performanceMetrics.totalRevenueVolatility)}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Best Performing Day</span>
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200"
                >
                  {performanceMetrics.bestPerformingDay}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm">Worst Performing Day</span>
                <Badge
                  variant="outline"
                  className="bg-red-50 text-red-700 border-red-200"
                >
                  {performanceMetrics.worstPerformingDay}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Revenue Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-semibold">Food Revenue</h4>
              <div className="text-2xl font-bold">
                {renderCurrency(summary.totalFoodRevenue)}
              </div>
              <div className="text-sm text-muted-foreground">
                Avg: {renderCurrency(summary.averageDailyFoodRevenue)} per day
              </div>
              <div className="flex items-center gap-1">
                {getTrendIcon(trendAnalysis.foodTrend)}
                <span
                  className={cn(
                    "text-sm",
                    getTrendColor(trendAnalysis.foodTrend)
                  )}
                >
                  {renderPercentage(performanceMetrics.foodRevenueGrowth)}{" "}
                  growth
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Beverage Revenue</h4>
              <div className="text-2xl font-bold">
                {renderCurrency(summary.totalBeverageRevenue)}
              </div>
              <div className="text-sm text-muted-foreground">
                Avg: {renderCurrency(summary.averageDailyBeverageRevenue)} per
                day
              </div>
              <div className="flex items-center gap-1">
                {getTrendIcon(trendAnalysis.beverageTrend)}
                <span
                  className={cn(
                    "text-sm",
                    getTrendColor(trendAnalysis.beverageTrend)
                  )}
                >
                  {renderPercentage(performanceMetrics.beverageRevenueGrowth)}{" "}
                  growth
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Peak Performance</h4>
              <div className="text-lg font-bold">
                {renderCurrency(summary.highestRevenueDay.totalRevenue)}
              </div>
              <div className="text-sm text-muted-foreground">
                {safeFormatDate(summary.highestRevenueDay.date)}
              </div>
              <div className="text-xs text-muted-foreground">
                Food: {renderCurrency(summary.highestRevenueDay.foodRevenue)} |
                Bev: {renderCurrency(summary.highestRevenueDay.beverageRevenue)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Trends Table */}
      <Card>
        <CardHeader>
          <Collapsible
            open={isDailyTrendsOpen}
            onOpenChange={setIsDailyTrendsOpen}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 p-0 h-auto"
              >
                <Calendar className="h-5 w-5" />
                <CardTitle>Daily Trends</CardTitle>
                <span className="text-sm text-muted-foreground">
                  ({dailyTrends.length} days)
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Food Revenue</TableHead>
                      <TableHead className="text-right">
                        Beverage Revenue
                      </TableHead>
                      <TableHead className="text-right">
                        Total Revenue
                      </TableHead>
                      <TableHead className="text-right">Food Change</TableHead>
                      <TableHead className="text-right">
                        Beverage Change
                      </TableHead>
                      <TableHead className="text-right">Total Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyTrends.map((day, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">
                          {safeFormatDate(day.date)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {renderCurrency(day.foodRevenue)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {renderCurrency(day.beverageRevenue)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {renderCurrency(day.totalRevenue)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-mono",
                            getChangeColor(
                              (day.foodRevenueChangePercentage ?? 0) as number
                            )
                          )}
                        >
                          {day.foodRevenueChangePercentage != null ? (
                            <div className="flex items-center justify-end gap-1">
                              {getChangeIcon(
                                day.foodRevenueChangePercentage as number
                              )}
                              <span>
                                {renderPercentage(
                                  day.foodRevenueChangePercentage as number
                                )}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-mono",
                            getChangeColor(
                              (day.beverageRevenueChangePercentage ??
                                0) as number
                            )
                          )}
                        >
                          {day.beverageRevenueChangePercentage != null ? (
                            <div className="flex items-center justify-end gap-1">
                              {getChangeIcon(
                                day.beverageRevenueChangePercentage as number
                              )}
                              <span>
                                {renderPercentage(
                                  day.beverageRevenueChangePercentage as number
                                )}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-mono",
                            getChangeColor(
                              (day.totalRevenueChangePercentage ?? 0) as number
                            )
                          )}
                        >
                          {day.totalRevenueChangePercentage != null ? (
                            <div className="flex items-center justify-end gap-1">
                              {getChangeIcon(
                                day.totalRevenueChangePercentage as number
                              )}
                              <span>
                                {renderPercentage(
                                  day.totalRevenueChangePercentage as number
                                )}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardHeader>
      </Card>

      {/* Weekly Trends Table */}
      <Card>
        <CardHeader>
          <Collapsible
            open={isWeeklyTrendsOpen}
            onOpenChange={setIsWeeklyTrendsOpen}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 p-0 h-auto"
              >
                <Calendar className="h-5 w-5" />
                <CardTitle>Weekly Trends</CardTitle>
                <span className="text-sm text-muted-foreground">
                  ({validatedWeeklyTrends.length} weeks)
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Week</TableHead>
                      <TableHead className="text-right">Food Revenue</TableHead>
                      <TableHead className="text-right">
                        Beverage Revenue
                      </TableHead>
                      <TableHead className="text-right">
                        Total Revenue
                      </TableHead>
                      <TableHead className="text-right">
                        Avg Daily Food
                      </TableHead>
                      <TableHead className="text-right">
                        Avg Daily Beverage
                      </TableHead>
                      <TableHead className="text-right">
                        Avg Daily Total
                      </TableHead>
                      <TableHead className="text-right">Days</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validatedWeeklyTrends.map((week, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">
                          {safeFormatDate(week.weekStartDate || week.weekStart, "MMM dd")} -{" "}
                          {safeFormatDate(week.weekEndDate || week.weekEnd, "MMM dd")}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {renderCurrency(week.foodRevenue)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {renderCurrency(week.beverageRevenue)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {renderCurrency(week.totalRevenue)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {renderCurrency(week.averageDailyFoodRevenue)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {renderCurrency(week.averageDailyBeverageRevenue)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {renderCurrency(week.averageDailyRevenue)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {week.daysInWeek}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Weekly Trends Summary for Validation */}
              {validatedWeeklyTrends.length > 0 && (
                <div className="mt-4 p-4 bg-muted/20 rounded-lg border">
                  <h4 className="font-semibold mb-2 text-sm">Weekly Trends Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground">Total Weeks:</span>
                      <div className="font-mono font-semibold">{validatedWeeklyTrends.length}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Avg Food/Week:</span>
                      <div className="font-mono font-semibold">
                        {renderCurrency(validatedWeeklyTrends.reduce((sum, w) => sum + w.foodRevenue, 0) / validatedWeeklyTrends.length)}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Avg Beverage/Week:</span>
                      <div className="font-mono font-semibold">
                        {renderCurrency(validatedWeeklyTrends.reduce((sum, w) => sum + w.beverageRevenue, 0) / validatedWeeklyTrends.length)}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Avg Total/Week:</span>
                      <div className="font-mono font-semibold">
                        {renderCurrency(validatedWeeklyTrends.reduce((sum, w) => sum + w.totalRevenue, 0) / validatedWeeklyTrends.length)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Calculation Verification */}
                  <div className="mt-3 pt-3 border-t">
                    <h5 className="font-medium mb-2 text-xs">Calculation Verification</h5>
                    <div className="space-y-1 text-xs">
                      {validatedWeeklyTrends.slice(0, 3).map((week, index) => {
                        const calculatedTotal = week.foodRevenue + week.beverageRevenue;
                        const isCorrect = Math.abs(week.totalRevenue - calculatedTotal) < 0.01;
                        const avgDailyCheck = week.daysInWeek > 0 ? week.totalRevenue / week.daysInWeek : 0;
                        const avgDailyCorrect = Math.abs(week.averageDailyRevenue - avgDailyCheck) < 0.01;
                        
                        return (
                          <div key={index} className={cn("flex flex-col gap-1", isCorrect && avgDailyCorrect ? "text-green-600" : "text-orange-600")}>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" 
                                    style={{backgroundColor: isCorrect ? '#10b981' : '#f59e0b'}} />
                              <span className="font-mono">
                                Week {index + 1}: {renderCurrency(week.foodRevenue)} + {renderCurrency(week.beverageRevenue)} = {renderCurrency(calculatedTotal)}
                                {!isCorrect && ` (Reported: ${renderCurrency(week.totalRevenue)})`}
                              </span>
                            </div>
                            {!avgDailyCorrect && (
                              <div className="ml-4 text-xs text-orange-500">
                                Daily avg: {renderCurrency(week.averageDailyRevenue)} (Expected: {renderCurrency(avgDailyCheck)})
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {validatedWeeklyTrends.length > 3 && (
                        <div className="text-muted-foreground">... and {validatedWeeklyTrends.length - 3} more weeks</div>
                      )}
                      
                      {/* Overall validation status */}
                      <div className="mt-2 pt-2 border-t">
                        {(() => {
                          const incorrectWeeks = validatedWeeklyTrends.filter(week => {
                            const calculatedTotal = week.foodRevenue + week.beverageRevenue;
                            return Math.abs(week.totalRevenue - calculatedTotal) > 0.01;
                          }).length;
                          
                          return incorrectWeeks === 0 ? (
                            <div className="text-green-600 font-medium">✅ All calculations verified correctly</div>
                          ) : (
                            <div className="text-orange-600 font-medium">⚠️ {incorrectWeeks} week(s) have calculation discrepancies</div>
                          );
                        })()
                        }
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardHeader>
      </Card>
    </div>
  );
  } catch (error) {
    console.error('Error rendering Daily Revenue Trends Report:', error);
    return (
      <div className="text-center py-10 text-destructive">
        <p>Error displaying report: {error instanceof Error ? error.message : 'Unknown error'}</p>
        <p className="text-sm text-muted-foreground mt-2">Please check the data format and try again.</p>
      </div>
    );
  }
}
