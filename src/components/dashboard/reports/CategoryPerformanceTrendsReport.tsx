"use client";

import React from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  TrendingUpIcon, 
  TrendingDownIcon,
  MinusIcon,
  BarChart3,
  PieChart,
  Activity,
  AlertTriangle,
  CheckCircle,
  Target,
  Zap,
  Calendar,
  DollarSign,
  Percent
} from "lucide-react";
import type { CategoryPerformanceTrendsReport } from "@/actions/categoryTrendsActions";
import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/currency";

interface CategoryPerformanceTrendsReportProps {
  data: CategoryPerformanceTrendsReport;
  outletName?: string;
}

export default function CategoryPerformanceTrendsReport({
  data,
  outletName,
}: CategoryPerformanceTrendsReportProps) {
  const formatCurrencyValue = (amount: number) => {
    // Use default currency for category performance trends
    return formatCurrency(amount, DEFAULT_CURRENCY);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(2)}%`;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "Increasing":
        return <TrendingUpIcon className="h-4 w-4 text-red-500" />;
      case "Decreasing":
        return <TrendingDownIcon className="h-4 w-4 text-green-500" />;
      default:
        return <MinusIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTrendBadge = (trend: string, isPositive?: boolean) => {
    if (trend === "Increasing") {
      return <Badge variant={isPositive ? "default" : "destructive"} className="flex items-center gap-1">
        <TrendingUpIcon className="h-3 w-3" />
        Increasing
      </Badge>;
    } else if (trend === "Decreasing") {
      return <Badge variant={isPositive ? "destructive" : "default"} className="flex items-center gap-1">
        <TrendingDownIcon className="h-3 w-3" />
        Decreasing
      </Badge>;
    } else {
      return <Badge variant="secondary" className="flex items-center gap-1">
        <MinusIcon className="h-3 w-3" />
        Stable
      </Badge>;
    }
  };

  const getVolatilityBadge = (volatility: number) => {
    if (volatility > 100) return <Badge variant="destructive">High</Badge>;
    if (volatility > 50) return <Badge variant="outline">Medium</Badge>;
    return <Badge variant="default">Low</Badge>;
  };

  const getRankBadge = (rank: number, total: number) => {
    if (rank === 1) return <Badge variant="default" className="bg-yellow-500 text-white">🥇 #1</Badge>;
    if (rank === 2) return <Badge variant="secondary" className="bg-gray-400 text-white">🥈 #2</Badge>;
    if (rank === 3) return <Badge variant="outline" className="bg-amber-600 text-white">🥉 #3</Badge>;
    if (rank <= total * 0.25) return <Badge variant="default">#{rank}</Badge>;
    if (rank <= total * 0.75) return <Badge variant="secondary">#{rank}</Badge>;
    return <Badge variant="outline">#{rank}</Badge>;
  };

  const getSeasonalPattern = (pattern: any) => {
    if (!pattern.hasPattern) {
      return <Badge variant="secondary">No Pattern</Badge>;
    }
    return (
      <div className="flex flex-col gap-1">
        <Badge variant="default">{pattern.patternType} Pattern</Badge>
        {pattern.peakDays.length > 0 && (
          <span className="text-xs text-green-600">Peak: {pattern.peakDays.join(", ")}</span>
        )}
        {pattern.lowDays.length > 0 && (
          <span className="text-xs text-red-600">Low: {pattern.lowDays.join(", ")}</span>
        )}
      </div>
    );
  };

  const getReportPropertySuffix = () => {
    if (data.propertyInfo?.name) {
      return ` - ${data.propertyInfo.name}`;
    }
    return "";
  };

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">
          {data.reportTitle}{getReportPropertySuffix()}
        </h2>
        <p className="text-muted-foreground">
          {format(data.dateRange.from, "MMM dd, yyyy")} -{" "}
          {format(data.dateRange.to, "MMM dd, yyyy")}
          {outletName && ` • ${outletName}`}
        </p>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Total Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalCategories}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.foodCategories} Food • {data.summary.beverageCategories} Beverage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyValue(data.summary.totalCost)}</div>
            <p className="text-xs text-muted-foreground">
              Daily Avg: {formatCurrencyValue(data.summary.averageDailyCost)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Top Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold truncate">{data.summary.mostExpensiveCategory.name}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrencyValue(data.summary.mostExpensiveCategory.cost)} • {data.summary.mostExpensiveCategory.type}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Fastest Growing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold truncate">{data.summary.fastestGrowingCategory.name}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(data.summary.fastestGrowingCategory.growth)} growth • {data.summary.fastestGrowingCategory.type}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Food vs Beverage Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Food vs Beverage Analysis
          </CardTitle>
          <CardDescription>Cost distribution and growth comparison</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold">Cost Distribution</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Food Costs</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatCurrencyValue(data.foodVsBeverage.foodTotal)}</span>
                    <Badge variant="outline">{formatPercentage(data.foodVsBeverage.foodPercentage)}</Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Beverage Costs</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatCurrencyValue(data.foodVsBeverage.beverageTotal)}</span>
                    <Badge variant="outline">{formatPercentage(data.foodVsBeverage.beveragePercentage)}</Badge>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold">Growth Trends</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Food Growth</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatPercentage(data.foodVsBeverage.foodGrowth)}</span>
                    {getTrendIcon(data.foodVsBeverage.foodGrowth > 5 ? "Increasing" : data.foodVsBeverage.foodGrowth < -5 ? "Decreasing" : "Stable")}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Beverage Growth</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatPercentage(data.foodVsBeverage.beverageGrowth)}</span>
                    {getTrendIcon(data.foodVsBeverage.beverageGrowth > 5 ? "Increasing" : data.foodVsBeverage.beverageGrowth < -5 ? "Decreasing" : "Stable")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Period Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Period Comparison
          </CardTitle>
          <CardDescription>Current period vs previous period analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Previous Period</div>
              <div className="text-xl font-bold">{formatCurrencyValue(data.periodComparison.previousPeriod.totalCost)}</div>
              <div className="text-xs text-muted-foreground">
                {data.periodComparison.previousPeriod.categoryCount} categories
              </div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Current Period</div>
              <div className="text-xl font-bold">{formatCurrencyValue(data.periodComparison.currentPeriod.totalCost)}</div>
              <div className="text-xs text-muted-foreground">
                {data.periodComparison.currentPeriod.categoryCount} categories
              </div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Growth</div>
              <div className="text-xl font-bold flex items-center justify-center gap-2">
                {formatPercentage(data.periodComparison.growth.totalCostGrowth)}
                {getTrendIcon(data.periodComparison.growth.totalCostGrowth > 5 ? "Increasing" : data.periodComparison.growth.totalCostGrowth < -5 ? "Decreasing" : "Stable")}
              </div>
              <div className="text-xs">
                {getTrendBadge(data.periodComparison.growth.trend, false)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="food" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="food">Food Categories</TabsTrigger>
          <TabsTrigger value="beverage">Beverage Categories</TabsTrigger>
          <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
          <TabsTrigger value="outlets">Outlet Breakdown</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="food" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Food Category Performance</CardTitle>
              <CardDescription>Detailed analysis of food category trends and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead className="text-right">Daily Avg</TableHead>
                      <TableHead className="text-right">% of Total</TableHead>
                      <TableHead className="text-right">Trend</TableHead>
                      <TableHead className="text-right">Growth %</TableHead>
                      <TableHead className="text-right">Volatility</TableHead>
                      <TableHead>Rank</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.foodCategories.map((category) => (
                      <TableRow key={category.categoryId}>
                        <TableCell>
                          <div className="font-medium">{category.categoryName}</div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrencyValue(category.totalCost)}</TableCell>
                        <TableCell className="text-right">{formatCurrencyValue(category.averageDailyCost)}</TableCell>
                        <TableCell className="text-right">{formatPercentage(category.percentageOfTotalCost)}</TableCell>
                        <TableCell className="text-right">{getTrendBadge(category.trendDirection, false)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {formatPercentage(category.trendPercentage)}
                            {getTrendIcon(category.trendDirection)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{getVolatilityBadge(category.volatility)}</TableCell>
                        <TableCell>{getRankBadge(category.rankByCost, data.summary.totalCategories)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="beverage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Beverage Category Performance</CardTitle>
              <CardDescription>Detailed analysis of beverage category trends and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead className="text-right">Daily Avg</TableHead>
                      <TableHead className="text-right">% of Total</TableHead>
                      <TableHead className="text-right">Trend</TableHead>
                      <TableHead className="text-right">Growth %</TableHead>
                      <TableHead className="text-right">Volatility</TableHead>
                      <TableHead>Rank</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.beverageCategories.map((category) => (
                      <TableRow key={category.categoryId}>
                        <TableCell>
                          <div className="font-medium">{category.categoryName}</div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrencyValue(category.totalCost)}</TableCell>
                        <TableCell className="text-right">{formatCurrencyValue(category.averageDailyCost)}</TableCell>
                        <TableCell className="text-right">{formatPercentage(category.percentageOfTotalCost)}</TableCell>
                        <TableCell className="text-right">{getTrendBadge(category.trendDirection, false)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {formatPercentage(category.trendPercentage)}
                            {getTrendIcon(category.trendDirection)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{getVolatilityBadge(category.volatility)}</TableCell>
                        <TableCell>{getRankBadge(category.rankByCost, data.summary.totalCategories)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trend Analysis</CardTitle>
              <CardDescription>Detailed trend patterns and seasonal analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Highest Cost Day</TableHead>
                      <TableHead className="text-right">Lowest Cost Day</TableHead>
                      <TableHead className="text-right">Volatility</TableHead>
                      <TableHead>Seasonal Pattern</TableHead>
                      <TableHead>Growth Rank</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...data.foodCategories, ...data.beverageCategories]
                      .sort((a, b) => Math.abs(b.trendPercentage) - Math.abs(a.trendPercentage))
                      .map((category) => (
                      <TableRow key={category.categoryId}>
                        <TableCell>
                          <div className="font-medium">{category.categoryName}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={category.categoryType === "Food" ? "default" : "secondary"}>
                            {category.categoryType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <div className="font-medium">{formatCurrencyValue(category.highestCostDay.cost)}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(category.highestCostDay.date, "MMM dd")}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <div className="font-medium">{formatCurrencyValue(category.lowestCostDay.cost)}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(category.lowestCostDay.date, "MMM dd")}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <div className="font-medium">{category.volatility.toFixed(2)}</div>
                            {getVolatilityBadge(category.volatility)}
                          </div>
                        </TableCell>
                        <TableCell>{getSeasonalPattern(category.seasonalPattern)}</TableCell>
                        <TableCell>{getRankBadge(category.rankByGrowth, data.summary.totalCategories)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outlets" className="space-y-4">
          {[...data.foodCategories, ...data.beverageCategories]
            .filter(category => category.outletBreakdown.length > 0)
            .slice(0, 5) // Show top 5 categories by cost
            .sort((a, b) => b.totalCost - a.totalCost)
            .map((category) => (
            <Card key={category.categoryId}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{category.categoryName} - Outlet Breakdown</span>
                  <Badge variant={category.categoryType === "Food" ? "default" : "secondary"}>
                    {category.categoryType}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Cost distribution across outlets for {category.categoryName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Outlet</TableHead>
                        <TableHead className="text-right">Total Cost</TableHead>
                        <TableHead className="text-right">% of Category</TableHead>
                        <TableHead>Trend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {category.outletBreakdown.map((outlet) => (
                        <TableRow key={outlet.outletId}>
                          <TableCell>
                            <div className="font-medium">{outlet.outletName}</div>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrencyValue(outlet.totalCost)}</TableCell>
                          <TableCell className="text-right">{formatPercentage(outlet.percentage)}</TableCell>
                          <TableCell>{getTrendBadge(outlet.trend, false)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUpIcon className="h-5 w-5 text-red-500" />
                  Trending Up
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.insights.trendingUp.length > 0 ? data.insights.trendingUp.map((category, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span>{category}</span>
                    </li>
                  )) : (
                    <li className="text-muted-foreground">No categories trending up</li>
                  )}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDownIcon className="h-5 w-5 text-green-500" />
                  Trending Down
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.insights.trendingDown.length > 0 ? data.insights.trendingDown.map((category, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{category}</span>
                    </li>
                  )) : (
                    <li className="text-muted-foreground">No categories trending down</li>
                  )}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  Most Stable
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.insights.mostStable.length > 0 ? data.insights.mostStable.map((category, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <MinusIcon className="h-4 w-4 text-blue-500" />
                      <span>{category}</span>
                    </li>
                  )) : (
                    <li className="text-muted-foreground">No stable categories identified</li>
                  )}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-500" />
                  Key Findings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.insights.keyFindings.map((finding, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-purple-500 mt-0.5" />
                      <span className="text-sm">{finding}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {data.insights.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Target className="h-4 w-4 text-green-500 mt-0.5" />
                    <span className="text-sm">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}