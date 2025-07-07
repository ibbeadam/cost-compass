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
  Target,
  AlertTriangle,
  CheckCircle,
  Trophy,
  Building2
} from "lucide-react";
import type { OutletEfficiencyProfitabilityReport } from "@/actions/outletEfficiencyActions";

interface OutletEfficiencyProfitabilityReportProps {
  data: OutletEfficiencyProfitabilityReport;
  outletName?: string;
}

export default function OutletEfficiencyProfitabilityReport({
  data,
  outletName,
}: OutletEfficiencyProfitabilityReportProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(2)}%`;
  };

  const formatRatio = (ratio: number) => {
    return `${ratio.toFixed(2)}x`;
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 2) return <ArrowUpIcon className="h-4 w-4 text-red-500" />;
    if (variance < -2) return <ArrowDownIcon className="h-4 w-4 text-green-500" />;
    return <MinusIcon className="h-4 w-4 text-gray-400" />;
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 5) return <TrendingUpIcon className="h-4 w-4 text-green-500" />;
    if (growth < -5) return <TrendingDownIcon className="h-4 w-4 text-red-500" />;
    return <MinusIcon className="h-4 w-4 text-gray-400" />;
  };

  const getPerformanceBadge = (rating: string) => {
    switch (rating) {
      case "Excellent":
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">Excellent</Badge>;
      case "Good":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300">Good</Badge>;
      case "Fair":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Fair</Badge>;
      case "Poor":
        return <Badge variant="destructive">Poor</Badge>;
      default:
        return <Badge variant="outline">{rating}</Badge>;
    }
  };

  const getEfficiencyTrendIcon = (trend: string) => {
    switch (trend) {
      case "Improving":
        return <TrendingUpIcon className="h-4 w-4 text-green-500" />;
      case "Declining":
        return <TrendingDownIcon className="h-4 w-4 text-red-500" />;
      default:
        return <MinusIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getRankBadge = (rank: number, total: number) => {
    if (rank === 1) return <Badge variant="default" className="bg-gold text-white">🥇 #{rank}</Badge>;
    if (rank === 2) return <Badge variant="secondary" className="bg-silver text-white">🥈 #{rank}</Badge>;
    if (rank === 3) return <Badge variant="outline" className="bg-bronze text-white">🥉 #{rank}</Badge>;
    if (rank <= total * 0.25) return <Badge variant="default">#{rank}</Badge>;
    if (rank <= total * 0.75) return <Badge variant="secondary">#{rank}</Badge>;
    return <Badge variant="destructive">#{rank}</Badge>;
  };

  const getReportPropertySuffix = () => {
    if (data.propertyInfo?.name) {
      return ` - ${data.propertyInfo.name}`;
    }
    if (data.outletData.length === 1) {
      return ` - ${data.outletData[0].outletName}`;
    }
    return "";
  };

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Total Outlets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalOutlets}</div>
            <p className="text-xs text-muted-foreground">{data.summary.activeOutlets} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.summary.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {formatCurrency(data.summary.totalRevenue / data.summary.totalOutlets)}/outlet
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Profit Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(data.summary.avgProfitMargin)}</div>
            <p className="text-xs text-muted-foreground">
              Net Profit: {formatCurrency(data.summary.totalProfit)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Top Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold truncate">{data.summary.topPerformingOutlet.name}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(data.summary.topPerformingOutlet.value)} profit margin
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Comparative Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Key Performance Comparisons</CardTitle>
          <CardDescription>Best vs worst performing outlets across key metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.comparisons.map((comparison, index) => (
              <div key={index} className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3">{comparison.metric}</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Best:
                    </span>
                    <div className="text-right">
                      <div className="font-medium">{comparison.bestOutlet.name}</div>
                      <div className="text-sm text-green-600">{comparison.bestOutlet.formattedValue}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Worst:
                    </span>
                    <div className="text-right">
                      <div className="font-medium">{comparison.worstOutlet.name}</div>
                      <div className="text-sm text-red-600">{comparison.worstOutlet.formattedValue}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      Average:
                    </span>
                    <div className="text-sm font-medium">{comparison.formattedAverage}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Property Analysis (if multiple properties) */}
      {data.propertyAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle>Property-Level Summary</CardTitle>
            <CardDescription>Performance summary by property</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead className="text-right">Outlets</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                    <TableHead className="text-right">Avg Profit Margin</TableHead>
                    <TableHead>Top Outlet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.propertyAnalysis.map((property, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{property.propertyName}</div>
                          <div className="text-sm text-muted-foreground">{property.propertyCode}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{property.outletCount}</TableCell>
                      <TableCell className="text-right">{formatCurrency(property.totalRevenue)}</TableCell>
                      <TableCell className="text-right">{formatPercentage(property.avgProfitMargin)}</TableCell>
                      <TableCell>{property.topOutlet}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Ranking</TabsTrigger>
          <TabsTrigger value="profit">Profit Ranking</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Outlet Performance Overview</CardTitle>
              <CardDescription>Comprehensive efficiency and profitability metrics for all outlets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Outlet</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Profit Margin</TableHead>
                      <TableHead className="text-right">Efficiency</TableHead>
                      <TableHead className="text-right">Growth</TableHead>
                      <TableHead>Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.outletData.map((outlet) => (
                      <TableRow key={outlet.outletId}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{outlet.outletName}</div>
                            <div className="text-sm text-muted-foreground">{outlet.outletCode}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm">{outlet.propertyName}</div>
                            <div className="text-xs text-muted-foreground">{outlet.propertyCode}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(outlet.totalRevenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(outlet.totalCost)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {formatPercentage(outlet.profitMargin)}
                            {getGrowthIcon(outlet.profitGrowth)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {formatRatio(outlet.revenueToCostRatio)}
                            {getEfficiencyTrendIcon(outlet.efficiencyTrend)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {formatPercentage(outlet.revenueGrowth)}
                            {getGrowthIcon(outlet.revenueGrowth)}
                          </div>
                        </TableCell>
                        <TableCell>{getPerformanceBadge(outlet.performanceRating)}</TableCell>
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
              <CardDescription>Outlets ranked by total revenue generation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Outlet</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead className="text-right">Total Revenue</TableHead>
                      <TableHead className="text-right">Daily Average</TableHead>
                      <TableHead className="text-right">Food Revenue</TableHead>
                      <TableHead className="text-right">Beverage Revenue</TableHead>
                      <TableHead className="text-right">Growth</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rankings.byRevenue.map((outlet, index) => (
                      <TableRow key={outlet.outletId}>
                        <TableCell>{getRankBadge(index + 1, data.outletData.length)}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{outlet.outletName}</div>
                            <div className="text-sm text-muted-foreground">{outlet.outletCode}</div>
                          </div>
                        </TableCell>
                        <TableCell>{outlet.propertyName}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(outlet.totalRevenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(outlet.avgDailyRevenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(outlet.totalFoodRevenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(outlet.totalBeverageRevenue)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {formatPercentage(outlet.revenueGrowth)}
                            {getGrowthIcon(outlet.revenueGrowth)}
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
              <CardTitle>Profitability Ranking</CardTitle>
              <CardDescription>Outlets ranked by profit margin and profitability metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Outlet</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead className="text-right">Profit Margin</TableHead>
                      <TableHead className="text-right">Net Profit</TableHead>
                      <TableHead className="text-right">Daily Profit</TableHead>
                      <TableHead className="text-right">Cost %</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead>Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rankings.byProfit.map((outlet, index) => (
                      <TableRow key={outlet.outletId}>
                        <TableCell>{getRankBadge(index + 1, data.outletData.length)}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{outlet.outletName}</div>
                            <div className="text-sm text-muted-foreground">{outlet.outletCode}</div>
                          </div>
                        </TableCell>
                        <TableCell>{outlet.propertyName}</TableCell>
                        <TableCell className="text-right font-medium">{formatPercentage(outlet.profitMargin)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(outlet.netProfit)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(outlet.dailyProfitability)}</TableCell>
                        <TableCell className="text-right">{formatPercentage(outlet.totalCostPercentage)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {formatPercentage((outlet.foodVariance + outlet.beverageVariance) / 2)}
                            {getVarianceIcon((outlet.foodVariance + outlet.beverageVariance) / 2)}
                          </div>
                        </TableCell>
                        <TableCell>{getPerformanceBadge(outlet.performanceRating)}</TableCell>
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
              <CardTitle>Efficiency Analysis</CardTitle>
              <CardDescription>Revenue-to-cost efficiency and operational effectiveness</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Outlet</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead className="text-right">Efficiency Ratio</TableHead>
                      <TableHead className="text-right">Food Cost %</TableHead>
                      <TableHead className="text-right">Beverage Cost %</TableHead>
                      <TableHead className="text-right">Total Cost %</TableHead>
                      <TableHead>Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rankings.byEfficiency.map((outlet, index) => (
                      <TableRow key={outlet.outletId}>
                        <TableCell>{getRankBadge(index + 1, data.outletData.length)}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{outlet.outletName}</div>
                            <div className="text-sm text-muted-foreground">{outlet.outletCode}</div>
                          </div>
                        </TableCell>
                        <TableCell>{outlet.propertyName}</TableCell>
                        <TableCell className="text-right font-medium">{formatRatio(outlet.revenueToCostRatio)}</TableCell>
                        <TableCell className="text-right">{formatPercentage(outlet.foodCostPercentage)}</TableCell>
                        <TableCell className="text-right">{formatPercentage(outlet.beverageCostPercentage)}</TableCell>
                        <TableCell className="text-right">{formatPercentage(outlet.totalCostPercentage)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getEfficiencyTrendIcon(outlet.efficiencyTrend)}
                            <span className="text-sm">{outlet.efficiencyTrend}</span>
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

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.insights.topPerformers.map((performer, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{performer}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Under Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.insights.underPerformers.map((performer, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span>{performer}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Key Findings</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {data.insights.keyFindings.map((finding, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Target className="h-4 w-4 text-blue-500 mt-0.5" />
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {data.insights.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>{recommendation}</span>
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