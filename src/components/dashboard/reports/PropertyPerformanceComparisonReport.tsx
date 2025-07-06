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
import { ArrowUpIcon, ArrowDownIcon, TrendingUpIcon, TrendingDownIcon } from "lucide-react";
import type { PropertyPerformanceComparisonReport } from "@/actions/propertyPerformanceActions";

interface PropertyPerformanceComparisonReportProps {
  data: PropertyPerformanceComparisonReport;
  outletName?: string;
}

export default function PropertyPerformanceComparisonReport({
  data,
  outletName,
}: PropertyPerformanceComparisonReportProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(2)}%`;
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <ArrowUpIcon className="h-4 w-4 text-red-500" />;
    if (variance < 0) return <ArrowDownIcon className="h-4 w-4 text-green-500" />;
    return null;
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUpIcon className="h-4 w-4 text-green-500" />;
    if (growth < 0) return <TrendingDownIcon className="h-4 w-4 text-red-500" />;
    return null;
  };

  const getPerformanceBadge = (value: number, type: "profit" | "cost" | "efficiency") => {
    let variant: "default" | "secondary" | "destructive" | "outline" = "default";
    let label = "";

    if (type === "profit") {
      if (value >= 15) { variant = "default"; label = "Excellent"; }
      else if (value >= 10) { variant = "secondary"; label = "Good"; }
      else if (value >= 5) { variant = "outline"; label = "Fair"; }
      else { variant = "destructive"; label = "Poor"; }
    } else if (type === "cost") {
      if (value <= 25) { variant = "default"; label = "Excellent"; }
      else if (value <= 30) { variant = "secondary"; label = "Good"; }
      else if (value <= 35) { variant = "outline"; label = "Fair"; }
      else { variant = "destructive"; label = "Poor"; }
    } else if (type === "efficiency") {
      if (value >= 4) { variant = "default"; label = "Excellent"; }
      else if (value >= 3) { variant = "secondary"; label = "Good"; }
      else if (value >= 2) { variant = "outline"; label = "Fair"; }
      else { variant = "destructive"; label = "Poor"; }
    }

    return <Badge variant={variant}>{label}</Badge>;
  };

  const getReportPropertySuffix = () => {
    if (data.propertyInfo?.name) {
      return ` - ${data.propertyInfo.name}`;
    }
    if (data.propertyData.length === 1) {
      return ` - ${data.propertyData[0].propertyName}`;
    }
    return " - All Properties";
  };

  return (
    <div className="space-y-6">
      {/* Overall Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overallSummary.totalProperties}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.overallSummary.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">Across {data.overallSummary.totalOutlets} outlets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Profit Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(data.overallSummary.avgProfitMargin)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Best Performer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{data.overallSummary.bestPerformingProperty.name}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(data.overallSummary.bestPerformingProperty.value)} profit margin
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Property Performance Table and Rankings */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Ranking</TabsTrigger>
          <TabsTrigger value="profit">Profit Ranking</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency Ranking</TabsTrigger>
          <TabsTrigger value="cost">Cost Control</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Property Performance Overview</CardTitle>
              <CardDescription>
                Comprehensive performance metrics for all properties
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Outlets</TableHead>
                      <TableHead className="text-right">Total Revenue</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead className="text-right">Profit Margin</TableHead>
                      <TableHead className="text-right">Cost %</TableHead>
                      <TableHead className="text-right">Efficiency</TableHead>
                      <TableHead>Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.propertyData.map((property) => (
                      <TableRow key={property.propertyId}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{property.propertyName}</div>
                            <div className="text-sm text-muted-foreground">{property.propertyCode}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{property.propertyType}</Badge>
                        </TableCell>
                        <TableCell>{property.outletCount}</TableCell>
                        <TableCell className="text-right">{formatCurrency(property.totalRevenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(property.totalCost)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {formatPercentage(property.profitMargin)}
                            {getGrowthIcon(property.profitGrowth)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatPercentage(property.avgTotalCostPct)}</TableCell>
                        <TableCell className="text-right">{property.efficiency.toFixed(2)}x</TableCell>
                        <TableCell>{getPerformanceBadge(property.profitMargin, "profit")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Ranking</CardTitle>
              <CardDescription>Properties ranked by total revenue generation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead className="text-right">Total Revenue</TableHead>
                      <TableHead className="text-right">Food Revenue</TableHead>
                      <TableHead className="text-right">Beverage Revenue</TableHead>
                      <TableHead className="text-right">Revenue/Outlet</TableHead>
                      <TableHead className="text-right">Growth</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rankings.byRevenue.map((property, index) => (
                      <TableRow key={property.propertyId}>
                        <TableCell>
                          <Badge variant={index < 3 ? "default" : "secondary"}>#{index + 1}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{property.propertyName}</div>
                            <div className="text-sm text-muted-foreground">{property.propertyCode}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(property.totalRevenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(property.totalFoodRevenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(property.totalBeverageRevenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(property.revenuePerOutlet)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {formatPercentage(property.revenueGrowth)}
                            {getGrowthIcon(property.revenueGrowth)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profit Margin Ranking</CardTitle>
              <CardDescription>Properties ranked by profit margin performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead className="text-right">Profit Margin</TableHead>
                      <TableHead className="text-right">Total Profit</TableHead>
                      <TableHead className="text-right">Food Cost %</TableHead>
                      <TableHead className="text-right">Beverage Cost %</TableHead>
                      <TableHead className="text-right">Profit Growth</TableHead>
                      <TableHead>Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rankings.byProfitMargin.map((property, index) => (
                      <TableRow key={property.propertyId}>
                        <TableCell>
                          <Badge variant={index < 3 ? "default" : "secondary"}>#{index + 1}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{property.propertyName}</div>
                            <div className="text-sm text-muted-foreground">{property.propertyCode}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatPercentage(property.profitMargin)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(property.totalRevenue - property.totalCost)}</TableCell>
                        <TableCell className="text-right">{formatPercentage(property.avgFoodCostPct)}</TableCell>
                        <TableCell className="text-right">{formatPercentage(property.avgBeverageCostPct)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {formatPercentage(property.profitGrowth)}
                            {getGrowthIcon(property.profitGrowth)}
                          </div>
                        </TableCell>
                        <TableCell>{getPerformanceBadge(property.profitMargin, "profit")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="efficiency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Efficiency Ranking</CardTitle>
              <CardDescription>Properties ranked by revenue-to-cost efficiency ratio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead className="text-right">Efficiency Ratio</TableHead>
                      <TableHead className="text-right">Revenue/Outlet</TableHead>
                      <TableHead className="text-right">Cost/Outlet</TableHead>
                      <TableHead className="text-right">Daily Revenue</TableHead>
                      <TableHead className="text-right">Daily Cost</TableHead>
                      <TableHead>Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rankings.byEfficiency.map((property, index) => (
                      <TableRow key={property.propertyId}>
                        <TableCell>
                          <Badge variant={index < 3 ? "default" : "secondary"}>#{index + 1}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{property.propertyName}</div>
                            <div className="text-sm text-muted-foreground">{property.propertyCode}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{property.efficiency.toFixed(2)}x</TableCell>
                        <TableCell className="text-right">{formatCurrency(property.revenuePerOutlet)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(property.costPerOutlet)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(property.avgDailyRevenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(property.avgDailyCost)}</TableCell>
                        <TableCell>{getPerformanceBadge(property.efficiency, "efficiency")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cost" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Control Ranking</CardTitle>
              <CardDescription>Properties ranked by cost control effectiveness (lower is better)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead className="text-right">Total Cost %</TableHead>
                      <TableHead className="text-right">Food Variance</TableHead>
                      <TableHead className="text-right">Beverage Variance</TableHead>
                      <TableHead className="text-right">Budget vs Actual</TableHead>
                      <TableHead className="text-right">Cost Growth</TableHead>
                      <TableHead>Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rankings.byCostControl.map((property, index) => (
                      <TableRow key={property.propertyId}>
                        <TableCell>
                          <Badge variant={index < 3 ? "default" : "secondary"}>#{index + 1}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{property.propertyName}</div>
                            <div className="text-sm text-muted-foreground">{property.propertyCode}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatPercentage(property.avgTotalCostPct)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {formatPercentage(property.foodVariancePct)}
                            {getVarianceIcon(property.foodVariancePct)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {formatPercentage(property.beverageVariancePct)}
                            {getVarianceIcon(property.beverageVariancePct)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPercentage((property.budgetFoodCostPct + property.budgetBeverageCostPct) / 2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {formatPercentage(property.costGrowth)}
                            {getGrowthIcon(property.costGrowth)}
                          </div>
                        </TableCell>
                        <TableCell>{getPerformanceBadge(property.avgTotalCostPct, "cost")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}