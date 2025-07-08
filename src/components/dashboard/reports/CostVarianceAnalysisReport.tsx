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
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUpIcon, 
  TrendingDownIcon,
  MinusIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  TargetIcon,
  DollarSignIcon,
  BarChart3Icon,
  CalendarIcon,
  BuildingIcon,
  PieChartIcon,
  AlertCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  StoreIcon,
  LineChartIcon,
  ShieldAlertIcon,
  LightbulbIcon,
  ClipboardListIcon
} from "lucide-react";
import type { CostVarianceAnalysisReport } from "@/actions/costVarianceActions";
import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/currency";

interface CostVarianceAnalysisReportProps {
  data: CostVarianceAnalysisReport;
  outletName?: string;
}

export default function CostVarianceAnalysisReport({
  data,
  outletName,
}: CostVarianceAnalysisReportProps) {
  const formatCurrencyValue = (amount: number) => {
    // Use default currency for cost variance analysis
    return formatCurrency(amount, DEFAULT_CURRENCY);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  const getVarianceBadge = (variancePercentage: number) => {
    if (variancePercentage > 10) return <Badge variant="destructive">High Over</Badge>;
    if (variancePercentage > 5) return <Badge variant="outline" className="border-orange-500 text-orange-700">Moderate Over</Badge>;
    if (variancePercentage > -5) return <Badge variant="default" className="bg-green-100 text-green-800">Within Budget</Badge>;
    return <Badge variant="secondary">Under Budget</Badge>;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "Improving":
        return <TrendingDownIcon className="h-4 w-4 text-green-500" />;
      case "Deteriorating":
        return <TrendingUpIcon className="h-4 w-4 text-red-500" />;
      default:
        return <MinusIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPerformanceBadge = (rating: string) => {
    switch (rating) {
      case "Excellent":
        return <Badge variant="default" className="bg-green-100 text-green-800">Excellent</Badge>;
      case "Good":
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Good</Badge>;
      case "Average":
        return <Badge variant="outline">Average</Badge>;
      case "Poor":
        return <Badge variant="outline" className="border-orange-500 text-orange-700">Poor</Badge>;
      case "Critical":
        return <Badge variant="destructive">Critical</Badge>;
      default:
        return <Badge variant="outline">{rating}</Badge>;
    }
  };

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case "Low":
        return <Badge variant="default" className="bg-green-100 text-green-800">Low Risk</Badge>;
      case "Medium":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Medium Risk</Badge>;
      case "High":
        return <Badge variant="destructive">High Risk</Badge>;
      default:
        return <Badge variant="outline">{riskLevel}</Badge>;
    }
  };

  const getReportPropertySuffix = () => {
    if (data.propertyInfo?.name) {
      return ` - ${data.propertyInfo.name}`;
    }
    return "";
  };

  const getOutletSuffix = () => {
    if (outletName) {
      return ` - ${outletName}`;
    }
    return "";
  };

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">
          {data.reportTitle}{getReportPropertySuffix()}{getOutletSuffix()}
        </h2>
        <p className="text-muted-foreground">
          {format(data.dateRange.from, "MMM dd, yyyy")} -{" "}
          {format(data.dateRange.to, "MMM dd, yyyy")}
        </p>
      </div>

      {/* Executive Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSignIcon className="h-4 w-4" />
              Overall Variance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrencyValue(data.summary.overallVariance)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(data.summary.overallVariancePercentage)} vs budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TargetIcon className="h-4 w-4" />
              Budget Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.budgetAccuracy.toFixed(1)}%</div>
            <Progress value={data.summary.budgetAccuracy} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3Icon className="h-4 w-4" />
              Categories Over Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {data.summary.categoriesOverBudget}
            </div>
            <p className="text-xs text-muted-foreground">
              out of {data.categoryVariances.length} categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <LineChartIcon className="h-4 w-4" />
              Variance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getTrendIcon(data.summary.varianceTrend)}
              <span className="text-lg font-semibold">{data.summary.varianceTrend}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Avg daily: {formatCurrencyValue(data.summary.averageDailyVariance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="h-5 w-5 text-red-500" />
              Worst Performing Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-lg">{data.summary.worstPerformingCategory.name}</div>
            <div className="text-red-600 font-medium">
              {formatCurrencyValue(data.summary.worstPerformingCategory.variance)}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatPercentage(data.summary.worstPerformingCategory.variancePercentage)} over budget
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              Best Performing Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-lg">{data.summary.bestPerformingCategory.name}</div>
            <div className="text-green-600 font-medium">
              {formatCurrencyValue(data.summary.bestPerformingCategory.variance)}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatPercentage(data.summary.bestPerformingCategory.variancePercentage)} vs budget
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3Icon className="h-5 w-5 text-orange-500" />
              Most Volatile Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-lg">{data.summary.mostVolatileCategory.name}</div>
            <div className="text-orange-600 font-medium">
              {data.summary.mostVolatileCategory.volatility.toFixed(1)}% volatility
            </div>
            <div className="text-sm text-muted-foreground">
              High variance fluctuation
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="outlets">Outlets</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Category Variance Analysis</CardTitle>
              <CardDescription>Detailed breakdown of variance by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Budgeted</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead className="text-right">Variance %</TableHead>
                      <TableHead className="text-right">Utilization</TableHead>
                      <TableHead>Trend</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.categoryVariances.map((category) => (
                      <TableRow key={category.categoryId}>
                        <TableCell className="font-medium">{category.categoryName}</TableCell>
                        <TableCell>
                          <Badge variant={category.categoryType === "food" ? "default" : "secondary"}>
                            {category.categoryType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrencyValue(category.budgetedCost)}</TableCell>
                        <TableCell className="text-right">{formatCurrencyValue(category.actualCost)}</TableCell>
                        <TableCell className="text-right">
                          <span className={category.variance >= 0 ? "text-red-600" : "text-green-600"}>
                            {formatCurrencyValue(category.variance)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={category.variancePercentage >= 0 ? "text-red-600" : "text-green-600"}>
                            {formatPercentage(category.variancePercentage)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{category.budgetUtilization.toFixed(1)}%</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getTrendIcon(category.trendDirection)}
                            <span className="text-sm">{category.trendDirection}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getVarianceBadge(category.variancePercentage)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outlets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Outlet Performance Analysis</CardTitle>
              <CardDescription>Variance analysis by outlet</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Outlet</TableHead>
                      <TableHead className="text-right">Total Budgeted</TableHead>
                      <TableHead className="text-right">Total Actual</TableHead>
                      <TableHead className="text-right">Total Variance</TableHead>
                      <TableHead className="text-right">Variance %</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>Major Issues</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.outletVariances.map((outlet) => (
                      <TableRow key={outlet.outletId}>
                        <TableCell className="font-medium">{outlet.outletName}</TableCell>
                        <TableCell className="text-right">{formatCurrencyValue(outlet.totalBudgeted)}</TableCell>
                        <TableCell className="text-right">{formatCurrencyValue(outlet.totalActual)}</TableCell>
                        <TableCell className="text-right">
                          <span className={outlet.totalVariance >= 0 ? "text-red-600" : "text-green-600"}>
                            {formatCurrencyValue(outlet.totalVariance)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={outlet.totalVariancePercentage >= 0 ? "text-red-600" : "text-green-600"}>
                            {formatPercentage(outlet.totalVariancePercentage)}
                          </span>
                        </TableCell>
                        <TableCell>{getPerformanceBadge(outlet.performanceRating)}</TableCell>
                        <TableCell>{getRiskBadge(outlet.riskLevel)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {outlet.majorVariances.slice(0, 2).map((issue, index) => (
                              <div key={index} className="text-muted-foreground">• {issue}</div>
                            ))}
                            {outlet.majorVariances.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{outlet.majorVariances.length - 2} more
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Food vs Beverage Breakdown for Outlets */}
          <Card>
            <CardHeader>
              <CardTitle>Food vs Beverage Variance by Outlet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Outlet</TableHead>
                      <TableHead className="text-right">Food Variance</TableHead>
                      <TableHead className="text-right">Food %</TableHead>
                      <TableHead className="text-right">Beverage Variance</TableHead>
                      <TableHead className="text-right">Beverage %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.outletVariances.map((outlet) => (
                      <TableRow key={outlet.outletId}>
                        <TableCell className="font-medium">{outlet.outletName}</TableCell>
                        <TableCell className="text-right">
                          <span className={outlet.foodVariance.variance >= 0 ? "text-red-600" : "text-green-600"}>
                            {formatCurrencyValue(outlet.foodVariance.variance)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={outlet.foodVariance.variancePercentage >= 0 ? "text-red-600" : "text-green-600"}>
                            {formatPercentage(outlet.foodVariance.variancePercentage)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={outlet.beverageVariance.variance >= 0 ? "text-red-600" : "text-green-600"}>
                            {formatCurrencyValue(outlet.beverageVariance.variance)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={outlet.beverageVariance.variancePercentage >= 0 ? "text-red-600" : "text-green-600"}>
                            {formatPercentage(outlet.beverageVariance.variancePercentage)}
                          </span>
                        </TableCell>
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
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Daily Variance Trends
              </CardTitle>
              <CardDescription>Daily variance patterns over the reporting period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Budgeted</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead className="text-right">Variance %</TableHead>
                      <TableHead className="text-right">Accuracy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.timeSeriesAnalysis.daily.slice(0, 10).map((day, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {format(day.period, "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrencyValue(day.totalBudgeted)}</TableCell>
                        <TableCell className="text-right">{formatCurrencyValue(day.totalActual)}</TableCell>
                        <TableCell className="text-right">
                          <span className={day.totalVariance >= 0 ? "text-red-600" : "text-green-600"}>
                            {formatCurrencyValue(day.totalVariance)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={day.totalVariancePercentage >= 0 ? "text-red-600" : "text-green-600"}>
                            {formatPercentage(day.totalVariancePercentage)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{day.budgetAccuracy.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {data.timeSeriesAnalysis.daily.length > 10 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Showing first 10 days. Total: {data.timeSeriesAnalysis.daily.length} days
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircleIcon className="h-5 w-5 text-red-500" />
                  Significant Over Budget
                </CardTitle>
                <CardDescription>Categories &gt;10% over budget</CardDescription>
              </CardHeader>
              <CardContent>
                {data.varianceDistribution.significantOverBudget.length > 0 ? (
                  <div className="space-y-2">
                    {data.varianceDistribution.significantOverBudget.map((category) => (
                      <div key={category.categoryId} className="flex items-center justify-between">
                        <span className="font-medium">{category.categoryName}</span>
                        <span className="text-red-600 font-semibold">
                          {formatPercentage(category.variancePercentage)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-green-600 flex items-center gap-2">
                    <CheckCircleIcon className="h-4 w-4" />
                    <span>No categories significantly over budget</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  Within Budget
                </CardTitle>
                <CardDescription>Categories within ±5% of budget</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.varianceDistribution.withinBudget.slice(0, 5).map((category) => (
                    <div key={category.categoryId} className="flex items-center justify-between">
                      <span className="font-medium">{category.categoryName}</span>
                      <span className="text-green-600 font-semibold">
                        {formatPercentage(category.variancePercentage)}
                      </span>
                    </div>
                  ))}
                  {data.varianceDistribution.withinBudget.length > 5 && (
                    <div className="text-sm text-muted-foreground">
                      +{data.varianceDistribution.withinBudget.length - 5} more categories
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowDownIcon className="h-5 w-5 text-blue-500" />
                  Under Budget
                </CardTitle>
                <CardDescription>Categories &gt;5% under budget</CardDescription>
              </CardHeader>
              <CardContent>
                {data.varianceDistribution.underBudget.length > 0 ? (
                  <div className="space-y-2">
                    {data.varianceDistribution.underBudget.map((category) => (
                      <div key={category.categoryId} className="flex items-center justify-between">
                        <span className="font-medium">{category.categoryName}</span>
                        <span className="text-blue-600 font-semibold">
                          {formatPercentage(category.variancePercentage)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    No categories significantly under budget
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangleIcon className="h-5 w-5 text-orange-500" />
                  Moderate Over Budget
                </CardTitle>
                <CardDescription>Categories 5-10% over budget</CardDescription>
              </CardHeader>
              <CardContent>
                {data.varianceDistribution.moderateOverBudget.length > 0 ? (
                  <div className="space-y-2">
                    {data.varianceDistribution.moderateOverBudget.map((category) => (
                      <div key={category.categoryId} className="flex items-center justify-between">
                        <span className="font-medium">{category.categoryName}</span>
                        <span className="text-orange-600 font-semibold">
                          {formatPercentage(category.variancePercentage)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-green-600 flex items-center gap-2">
                    <CheckCircleIcon className="h-4 w-4" />
                    <span>No categories moderately over budget</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlertIcon className="h-5 w-5 text-red-500" />
                  Risk Factors
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.predictions.riskFactors.length > 0 ? (
                  <ul className="space-y-2">
                    {data.predictions.riskFactors.map((risk, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertTriangleIcon className="h-4 w-4 text-red-500 mt-0.5" />
                        <span className="text-sm">{risk}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-green-600 flex items-center gap-2">
                    <CheckCircleIcon className="h-4 w-4" />
                    <span>No significant risk factors identified</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LightbulbIcon className="h-5 w-5 text-blue-500" />
                  Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.predictions.opportunities.length > 0 ? (
                  <ul className="space-y-2">
                    {data.predictions.opportunities.map((opportunity, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <LightbulbIcon className="h-4 w-4 text-blue-500 mt-0.5" />
                        <span className="text-sm">{opportunity}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-muted-foreground">
                    No specific opportunities identified
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Category Performance Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.categoryVariances.slice(0, 6).map((category) => (
                  <div key={category.categoryId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{category.categoryName}</h4>
                      {getVarianceBadge(category.variancePercentage)}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Variance:</span>
                        <span className={category.variance >= 0 ? "text-red-600" : "text-green-600"}>
                          {formatCurrencyValue(category.variance)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Volatility:</span>
                        <span>{category.volatility.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Consistency:</span>
                        <span>{category.consistencyScore.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Trend:</span>
                        <div className="flex items-center gap-1">
                          {getTrendIcon(category.trendDirection)}
                          <span className="text-xs">{category.trendDirection}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3Icon className="h-5 w-5" />
                  Projected Month-End Variance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">
                    {formatCurrencyValue(data.predictions.projectedMonthEndVariance)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Based on current trends
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TargetIcon className="h-5 w-5" />
                  Budget Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Current Accuracy:</span>
                    <span className="font-semibold">{data.summary.budgetAccuracy.toFixed(1)}%</span>
                  </div>
                  <Progress value={data.summary.budgetAccuracy} />
                  <div className="flex justify-between text-sm">
                    <span>Categories on track:</span>
                    <span>{data.categoryVariances.length - data.summary.categoriesOverBudget}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Categories over budget:</span>
                    <span className="text-red-600">{data.summary.categoriesOverBudget}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardListIcon className="h-5 w-5" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.predictions.recommendations.length > 0 ? (
                <ul className="space-y-3">
                  {data.predictions.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircleIcon className="h-4 w-4 text-blue-500 mt-0.5" />
                      <span>{recommendation}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-muted-foreground">
                  No specific recommendations at this time
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}