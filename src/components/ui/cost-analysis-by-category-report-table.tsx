"use client";

import React, { useState } from "react";
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
import { 
  DollarSign, 
  Percent, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  ChevronDown, 
  ChevronRight, 
  Calendar,
  Building2,
  PieChart,
  Activity,
  AlertTriangle
} from "lucide-react";
import type { CostAnalysisByCategoryReport } from "@/types";
import { cn, formatNumber } from "@/lib/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface CostAnalysisByCategoryReportTableProps {
  data: CostAnalysisByCategoryReport | null;
  outletId?: string;
  outletName?: string;
  isLoading?: boolean;
}

const StatCard = ({
  title,
  value,
  isCurrency = false,
  isPercentage = false,
  trendValue = null,
  subtitle = "",
}: { 
  title: string; 
  value: number; 
  isCurrency?: boolean; 
  isPercentage?: boolean; 
  trendValue?: number | null;
  subtitle?: string;
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
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
};

const CategoryProgressBar = ({ 
  value, 
  maxValue, 
  label, 
  color = "bg-blue-500" 
}: { 
  value: number; 
  maxValue: number; 
  label: string; 
  color?: string; 
}) => {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{formatNumber(percentage)}%</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
};

export function CostAnalysisByCategoryReportTable({ data, outletId, outletName, isLoading }: CostAnalysisByCategoryReportTableProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showOutletBreakdown, setShowOutletBreakdown] = useState(true);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4 animate-spin" />
        <p className="text-muted-foreground">Loading cost analysis data...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4 animate-pulse" />
        <p className="text-muted-foreground">No cost analysis data available for the selected period.</p>
      </div>
    );
  }

  // Safety check for required properties
  if (!data.dateRange || !data.dateRange.from || !data.dateRange.to) {
    return (
      <div className="text-center py-12">
        <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4 animate-pulse" />
        <p className="text-muted-foreground">Report data is incomplete. Please try generating the report again.</p>
        <p className="text-xs text-muted-foreground mt-2">Debug: dateRange is missing or invalid</p>
      </div>
    );
  }

  // Safety check for other required arrays
  if (!data.foodCategories || !data.beverageCategories || !data.topFoodCategories || !data.topBeverageCategories) {
    return (
      <div className="text-center py-12">
        <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4 animate-pulse" />
        <p className="text-muted-foreground">Report data is incomplete. Please try generating the report again.</p>
        <p className="text-xs text-muted-foreground mt-2">Debug: category arrays are missing</p>
      </div>
    );
  }

  const renderCurrency = (value: number | null | undefined) => {
    if (value == null) return "-";
    return `$${formatNumber(value)}`;
  };

  const renderPercentage = (value: number | null | undefined) => {
    if (value == null) return "-";
    return `${formatNumber(value)}%`;
  };

  const isOutletSpecific = outletId && outletId !== "all" && outletName;

  const toggleCategoryExpansion = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const daysInRange = Math.ceil((data.dateRange.to.getTime() - data.dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-3xl font-bold text-foreground">
            Cost Analysis by Category Report
            {isOutletSpecific && (
              <span className="block text-xl font-normal text-muted-foreground mt-1">
                for {outletName}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-1 text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium">Live Data</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{format(data.dateRange.from, "MMM dd, yyyy")} - {format(data.dateRange.to, "MMM dd, yyyy")}</span>
          </div>
          <div className="flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            <span>{daysInRange} days</span>
          </div>
          <div className="flex items-center gap-1">
            <Activity className="h-4 w-4" />
            <span>Generated at {format(new Date(), "HH:mm:ss")}</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Food Revenue" 
          value={data.totalFoodRevenue} 
          isCurrency 
          subtitle={`${daysInRange} days`}
        />
        <StatCard 
          title="Total Beverage Revenue" 
          value={data.totalBeverageRevenue} 
          isCurrency 
          subtitle={`${daysInRange} days`}
        />
        <StatCard 
          title="Total Revenue" 
          value={data.totalRevenue} 
          isCurrency 
          subtitle={`${daysInRange} days`}
        />
        <StatCard 
          title="Total Cost" 
          value={data.totalCost} 
          isCurrency 
          subtitle={`${daysInRange} days`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard 
          title="Food Cost %" 
          value={data.overallFoodCostPercentage} 
          isPercentage 
          trendValue={data.overallFoodCostPercentage}
          subtitle="vs Budget"
        />
        <StatCard 
          title="Beverage Cost %" 
          value={data.overallBeverageCostPercentage} 
          isPercentage 
          trendValue={data.overallBeverageCostPercentage}
          subtitle="vs Budget"
        />
        <StatCard 
          title="Overall Cost %" 
          value={data.overallCostPercentage} 
          isPercentage 
          trendValue={data.overallCostPercentage}
          subtitle="vs Budget"
        />
      </div>

      {/* Cost Adjustments Breakdown */}
      {data.foodAdjustments && data.beverageAdjustments && (
        <Card className="w-full shadow-lg border-amber-200">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-200">
            <CardTitle className="text-lg font-semibold text-amber-800 flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Cost Adjustments Applied
            </CardTitle>
            <p className="text-sm text-amber-700 mt-1">
              Net costs shown after applying OC, Entertainment, and other adjustments (matching dashboard calculations). Other adjustments can be positive (increases cost) or negative (decreases cost).
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-orange-800 border-b border-orange-200 pb-2">Food Cost Adjustments</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Raw Food Cost:</span>
                    <span className="font-mono">${formatNumber(data.rawFoodCost || 0)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>- OC Deduction:</span>
                    <span className="font-mono">-${formatNumber(data.foodAdjustments.oc)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>- Entertainment:</span>
                    <span className="font-mono">-${formatNumber(data.foodAdjustments.entertainment)}</span>
                  </div>
                  <div className={`flex justify-between ${data.foodAdjustments.other >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    <span>{data.foodAdjustments.other >= 0 ? '+ Other Adjustments:' : '- Other Adjustments:'}</span>
                    <span className="font-mono">{data.foodAdjustments.other >= 0 ? '+' : ''}${formatNumber(Math.abs(data.foodAdjustments.other))}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold">
                    <span>Net Food Cost:</span>
                    <span className="font-mono text-green-600">${formatNumber(data.totalFoodCost)}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-blue-800 border-b border-blue-200 pb-2">Beverage Cost Adjustments</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Raw Beverage Cost:</span>
                    <span className="font-mono">${formatNumber(data.rawBeverageCost || 0)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>- OC Deduction:</span>
                    <span className="font-mono">-${formatNumber(data.beverageAdjustments.oc)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>- Entertainment:</span>
                    <span className="font-mono">-${formatNumber(data.beverageAdjustments.entertainment)}</span>
                  </div>
                  <div className={`flex justify-between ${data.beverageAdjustments.other >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    <span>{data.beverageAdjustments.other >= 0 ? '+ Other Adjustments:' : '- Other Adjustments:'}</span>
                    <span className="font-mono">{data.beverageAdjustments.other >= 0 ? '+' : ''}${formatNumber(Math.abs(data.beverageAdjustments.other))}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold">
                    <span>Net Beverage Cost:</span>
                    <span className="font-mono text-green-600">${formatNumber(data.totalBeverageCost)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Distribution Visualization */}
      <Card className="w-full shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
          <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
            <PieChart className="mr-2 h-5 w-5" />
            Cost Distribution Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-orange-800">Food Cost Distribution</h4>
              {data.topFoodCategories.slice(0, 5).map((category, index) => (
                <CategoryProgressBar
                  key={index}
                  value={category.totalCost}
                  maxValue={data.totalFoodCost}
                  label={category.categoryName}
                  color="bg-orange-500"
                />
              ))}
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-blue-800">Beverage Cost Distribution</h4>
              {data.topBeverageCategories.slice(0, 5).map((category, index) => (
                <CategoryProgressBar
                  key={index}
                  value={category.totalCost}
                  maxValue={data.totalBeverageCost}
                  label={category.categoryName}
                  color="bg-blue-500"
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Categories Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b">
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Top Food Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">% of Food Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topFoodCategories.map((category, index) => (
                  <TableRow key={index} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                        {category.categoryName}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{renderCurrency(category.totalCost)}</TableCell>
                    <TableCell className="text-right font-mono">{renderPercentage(category.percentageOfTotalFoodCost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Top Beverage Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">% of Beverage Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topBeverageCategories.map((category, index) => (
                  <TableRow key={index} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                        {category.categoryName}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{renderCurrency(category.totalCost)}</TableCell>
                    <TableCell className="text-right font-mono">{renderPercentage(category.percentageOfTotalBeverageCost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Food Categories Analysis */}
      <Card className="w-full shadow-lg">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b">
          <CardTitle className="text-lg font-semibold text-gray-800">Food Categories Analysis</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead></TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="text-right">% of Food Cost</TableHead>
                <TableHead className="text-right">% of Total Revenue</TableHead>
                <TableHead className="text-right">Avg Daily Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.foodCategories.map((category, index) => (
                <React.Fragment key={index}>
                  <TableRow className="hover:bg-muted/30">
                    <TableCell className="w-8">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleCategoryExpansion(category.categoryId)}
                        className="h-6 w-6 p-0"
                      >
                        {expandedCategories.has(category.categoryId) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{category.categoryName}</TableCell>
                    <TableCell className="text-right font-mono">{renderCurrency(category.totalCost)}</TableCell>
                    <TableCell className="text-right font-mono">{renderPercentage(category.percentageOfTotalFoodCost)}</TableCell>
                    <TableCell className="text-right font-mono">{renderPercentage(category.percentageOfTotalRevenue)}</TableCell>
                    <TableCell className="text-right font-mono">{renderCurrency(category.averageDailyCost)}</TableCell>
                  </TableRow>
                  {expandedCategories.has(category.categoryId) && category.outletBreakdown.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0">
                        <div className="bg-muted/20 p-4">
                          <h5 className="font-semibold mb-3 text-orange-800">Outlet Breakdown</h5>
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/30">
                                <TableHead>Outlet</TableHead>
                                <TableHead className="text-right">Cost</TableHead>
                                <TableHead className="text-right">% of Outlet Food Cost</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {category.outletBreakdown.map((outlet, outletIndex) => (
                                <TableRow key={outletIndex} className="hover:bg-muted/20">
                                  <TableCell className="font-medium">{outlet.outletName}</TableCell>
                                  <TableCell className="text-right font-mono">{renderCurrency(outlet.cost)}</TableCell>
                                  <TableCell className="text-right font-mono">{renderPercentage(outlet.percentageOfOutletFoodCost)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Beverage Categories Analysis */}
      <Card className="w-full shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="text-lg font-semibold text-gray-800">Beverage Categories Analysis</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead></TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="text-right">% of Beverage Cost</TableHead>
                <TableHead className="text-right">% of Total Revenue</TableHead>
                <TableHead className="text-right">Avg Daily Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.beverageCategories.map((category, index) => (
                <React.Fragment key={index}>
                  <TableRow className="hover:bg-muted/30">
                    <TableCell className="w-8">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleCategoryExpansion(category.categoryId)}
                        className="h-6 w-6 p-0"
                      >
                        {expandedCategories.has(category.categoryId) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{category.categoryName}</TableCell>
                    <TableCell className="text-right font-mono">{renderCurrency(category.totalCost)}</TableCell>
                    <TableCell className="text-right font-mono">{renderPercentage(category.percentageOfTotalBeverageCost)}</TableCell>
                    <TableCell className="text-right font-mono">{renderPercentage(category.percentageOfTotalRevenue)}</TableCell>
                    <TableCell className="text-right font-mono">{renderCurrency(category.averageDailyCost)}</TableCell>
                  </TableRow>
                  {expandedCategories.has(category.categoryId) && category.outletBreakdown.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0">
                        <div className="bg-muted/20 p-4">
                          <h5 className="font-semibold mb-3 text-blue-800">Outlet Breakdown</h5>
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/30">
                                <TableHead>Outlet</TableHead>
                                <TableHead className="text-right">Cost</TableHead>
                                <TableHead className="text-right">% of Outlet Beverage Cost</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {category.outletBreakdown.map((outlet, outletIndex) => (
                                <TableRow key={outletIndex} className="hover:bg-muted/20">
                                  <TableCell className="font-medium">{outlet.outletName}</TableCell>
                                  <TableCell className="text-right font-mono">{renderCurrency(outlet.cost)}</TableCell>
                                  <TableCell className="text-right font-mono">{renderPercentage(outlet.percentageOfOutletBeverageCost)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Key Insights - Separated by Food and Beverage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Food Insights */}
        <Card className="w-full shadow-lg">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b">
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              Food Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-orange-800">Food Performance Overview</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Total food revenue: <strong>{renderCurrency(data.totalFoodRevenue)}</strong> over {daysInRange} days</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Food cost percentage: <strong>{renderPercentage(data.overallFoodCostPercentage)}</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span>Food categories analyzed: <strong>{data.foodCategories.length}</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>Average daily food cost: <strong>{renderCurrency(data.totalFoodCost / daysInRange)}</strong></span>
                </li>
              </ul>
              
              <h4 className="font-semibold text-orange-800 mt-6">Top Food Performers</h4>
              <ul className="space-y-2 text-sm">
                {data.topFoodCategories.slice(0, 3).map((category, index) => (
                  <li key={index} className="flex items-center justify-between gap-2 p-2 bg-orange-50 rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs bg-orange-100">
                        #{index + 1}
                      </Badge>
                      <span><strong>{category.categoryName}</strong></span>
                    </div>
                    <span className="text-orange-700 font-medium">{renderPercentage(category.percentageOfTotalFoodCost)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-xs text-orange-800">
                  <strong>Insight:</strong> {data.topFoodCategories[0]?.categoryName} is your highest food cost category, 
                  representing {renderPercentage(data.topFoodCategories[0]?.percentageOfTotalFoodCost)} of total food costs.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Beverage Insights */}
        <Card className="w-full shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              Beverage Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-blue-800">Beverage Performance Overview</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Total beverage revenue: <strong>{renderCurrency(data.totalBeverageRevenue)}</strong> over {daysInRange} days</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <span>Beverage cost percentage: <strong>{renderPercentage(data.overallBeverageCostPercentage)}</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                  <span>Beverage categories analyzed: <strong>{data.beverageCategories.length}</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-sky-500 rounded-full"></div>
                  <span>Average daily beverage cost: <strong>{renderCurrency(data.totalBeverageCost / daysInRange)}</strong></span>
                </li>
              </ul>
              
              <h4 className="font-semibold text-blue-800 mt-6">Top Beverage Performers</h4>
              <ul className="space-y-2 text-sm">
                {data.topBeverageCategories.slice(0, 3).map((category, index) => (
                  <li key={index} className="flex items-center justify-between gap-2 p-2 bg-blue-50 rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs bg-blue-100">
                        #{index + 1}
                      </Badge>
                      <span><strong>{category.categoryName}</strong></span>
                    </div>
                    <span className="text-blue-700 font-medium">{renderPercentage(category.percentageOfTotalBeverageCost)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-800">
                  <strong>Insight:</strong> {data.topBeverageCategories[0]?.categoryName} is your highest beverage cost category, 
                  representing {renderPercentage(data.topBeverageCategories[0]?.percentageOfTotalBeverageCost)} of total beverage costs.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Summary */}
      <Card className="w-full shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
          <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Overall Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-700">{renderCurrency(data.totalRevenue)}</div>
              <div className="text-sm text-green-600">Total Revenue</div>
              <div className="text-xs text-green-500 mt-1">{daysInRange} days period</div>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="text-2xl font-bold text-amber-700">{renderPercentage(data.overallCostPercentage)}</div>
              <div className="text-sm text-amber-600">Overall Cost %</div>
              <div className="text-xs text-amber-500 mt-1">Combined F&B</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-700">{data.foodCategories.length + data.beverageCategories.length}</div>
              <div className="text-sm text-purple-600">Categories Analyzed</div>
              <div className="text-xs text-purple-500 mt-1">{data.foodCategories.length} Food + {data.beverageCategories.length} Beverage</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 