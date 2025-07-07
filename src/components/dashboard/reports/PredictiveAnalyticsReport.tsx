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
  Sparkles,
  BrainIcon,
  LineChartIcon,
  AlertCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  Activity,
  ShieldIcon,
  Zap,
  TrendingUp,
  Brain,
  Clock,
  Star,
  AlertOctagon,
  Lightbulb,
  Settings,
  Gauge,
  PieChart,
  BarChart,
  Waves,
  Calendar
} from "lucide-react";
import type { PredictiveAnalyticsReport } from "@/actions/predictiveAnalyticsActions";

interface PredictiveAnalyticsReportProps {
  data: PredictiveAnalyticsReport;
  outletName?: string;
}

export default function PredictiveAnalyticsReport({
  data,
  outletName,
}: PredictiveAnalyticsReportProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "Improving":
      case "Increasing":
      case "Upward":
        return <TrendingUpIcon className="h-4 w-4 text-green-500" />;
      case "Declining":
      case "Decreasing":
      case "Downward":
        return <TrendingDownIcon className="h-4 w-4 text-red-500" />;
      default:
        return <MinusIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return <Badge variant="default" className="bg-green-100 text-green-800">High Confidence</Badge>;
    if (confidence >= 60) return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Medium Confidence</Badge>;
    return <Badge variant="destructive">Low Confidence</Badge>;
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

  const getStrengthBadge = (strength: string) => {
    switch (strength) {
      case "Strong":
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Strong</Badge>;
      case "Moderate":
        return <Badge variant="outline" className="border-blue-500 text-blue-700">Moderate</Badge>;
      case "Weak":
        return <Badge variant="secondary">Weak</Badge>;
      default:
        return <Badge variant="outline">{strength}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "High":
        return <Badge variant="destructive">High Priority</Badge>;
      case "Medium":
        return <Badge variant="outline" className="border-orange-500 text-orange-700">Medium Priority</Badge>;
      case "Low":
        return <Badge variant="secondary">Low Priority</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case "High":
        return <AlertCircleIcon className="h-4 w-4 text-red-500" />;
      case "Medium":
        return <AlertTriangleIcon className="h-4 w-4 text-yellow-500" />;
      case "Low":
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
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
        <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-blue-500" />
          {data.reportTitle}{getReportPropertySuffix()}{getOutletSuffix()}
        </h2>
        <p className="text-muted-foreground">
          Historical: {format(data.dateRange.from, "MMM dd, yyyy")} - {format(data.dateRange.to, "MMM dd, yyyy")} | 
          Forecast: {format(data.forecastPeriod.from, "MMM dd, yyyy")} - {format(data.forecastPeriod.to, "MMM dd, yyyy")}
        </p>
      </div>

      {/* Executive Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSignIcon className="h-4 w-4" />
              Revenue Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data.summary.forecastedRevenue)}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {getTrendIcon("Upward")}
              {formatPercentage(data.summary.revenueGrowthPrediction)} growth
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3Icon className="h-4 w-4" />
              Cost Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(data.summary.forecastedCosts)}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {getTrendIcon("Upward")}
              {formatPercentage(data.summary.costGrowthPrediction)} increase
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TargetIcon className="h-4 w-4" />
              Predicted Margin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.predictedMargin.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {getTrendIcon(data.summary.marginTrend)}
              {data.summary.marginTrend}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BrainIcon className="h-4 w-4" />
              Confidence Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.confidenceLevel.toFixed(1)}%</div>
            <Progress value={data.summary.confidenceLevel} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Key Insights & Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-blue-500" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.summary.keyInsights.length > 0 ? (
              <ul className="space-y-2">
                {data.summary.keyInsights.map((insight, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircleIcon className="h-4 w-4 text-blue-500 mt-0.5" />
                    <span className="text-sm">{insight}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-muted-foreground">No key insights available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertOctagon className="h-5 w-5 text-red-500" />
              Critical Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.summary.criticalAlerts.length > 0 ? (
              <ul className="space-y-2">
                {data.summary.criticalAlerts.map((alert, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <AlertTriangleIcon className="h-4 w-4 text-red-500 mt-0.5" />
                    <span className="text-sm text-red-700">{alert}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-green-600 flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4" />
                <span>No critical alerts</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="outlets">Outlets</TabsTrigger>
          <TabsTrigger value="trends">Market Trends</TabsTrigger>
          <TabsTrigger value="seasonality">Seasonality</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="performance">Model Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Category Forecasting Analysis</CardTitle>
              <CardDescription>Predictive analysis by category with confidence intervals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Historical Avg</TableHead>
                      <TableHead className="text-right">Forecast Avg</TableHead>
                      <TableHead>Trend</TableHead>
                      <TableHead>Seasonality</TableHead>
                      <TableHead className="text-right">Accuracy</TableHead>
                      <TableHead className="text-right">Volatility</TableHead>
                      <TableHead>Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.categoryForecasts.map((category) => {
                      const forecastAvg = category.forecast.length > 0 ? 
                        category.forecast.reduce((sum, f) => sum + f.predicted, 0) / category.forecast.length : 0;
                      
                      return (
                        <TableRow key={category.categoryId}>
                          <TableCell className="font-medium">{category.categoryName}</TableCell>
                          <TableCell>
                            <Badge variant={category.categoryType === "food" ? "default" : "secondary"}>
                              {category.categoryType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(category.historicalAverage)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(forecastAvg)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getTrendIcon(category.historicalTrend)}
                              <span className="text-sm">{category.historicalTrend}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStrengthBadge(category.seasonality.pattern)}</TableCell>
                          <TableCell className="text-right">{category.accuracy.toFixed(1)}%</TableCell>
                          <TableCell className="text-right">{category.volatility.toFixed(1)}%</TableCell>
                          <TableCell>{getConfidenceBadge(category.confidenceLevel)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Category Risk Factors and Opportunities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldIcon className="h-5 w-5 text-red-500" />
                  Category Risk Factors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.categoryForecasts.filter(cat => cat.riskFactors.length > 0).slice(0, 5).map((category) => (
                    <div key={category.categoryId} className="border-l-4 border-red-400 pl-3">
                      <div className="font-medium">{category.categoryName}</div>
                      <ul className="text-sm text-muted-foreground">
                        {category.riskFactors.map((risk, index) => (
                          <li key={index} className="flex items-center gap-1">
                            <AlertTriangleIcon className="h-3 w-3" />
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-green-500" />
                  Category Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.categoryForecasts.filter(cat => cat.opportunities.length > 0).slice(0, 5).map((category) => (
                    <div key={category.categoryId} className="border-l-4 border-green-400 pl-3">
                      <div className="font-medium">{category.categoryName}</div>
                      <ul className="text-sm text-muted-foreground">
                        {category.opportunities.map((opportunity, index) => (
                          <li key={index} className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {opportunity}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="outlets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Outlet Performance Forecasting</CardTitle>
              <CardDescription>Predicted performance metrics by outlet</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Outlet</TableHead>
                      <TableHead className="text-right">Forecasted Revenue</TableHead>
                      <TableHead className="text-right">Forecasted Costs</TableHead>
                      <TableHead className="text-right">Predicted Margin</TableHead>
                      <TableHead className="text-right">Expected Growth</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>Key Recommendations</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.outletForecasts.map((outlet) => {
                      const totalRevenue = outlet.revenueForecast.total.reduce((sum, f) => sum + f.predicted, 0);
                      const totalCosts = outlet.costForecast.total.reduce((sum, f) => sum + f.predicted, 0);
                      
                      return (
                        <TableRow key={outlet.outletId}>
                          <TableCell className="font-medium">{outlet.outletName}</TableCell>
                          <TableCell className="text-right">{formatCurrency(totalRevenue)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(totalCosts)}</TableCell>
                          <TableCell className="text-right">{outlet.forecastedMargin.toFixed(1)}%</TableCell>
                          <TableCell className="text-right">
                            <span className={outlet.expectedGrowth >= 0 ? "text-green-600" : "text-red-600"}>
                              {formatPercentage(outlet.expectedGrowth)}
                            </span>
                          </TableCell>
                          <TableCell>{getRiskBadge(outlet.riskLevel)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {outlet.recommendations.slice(0, 2).map((rec, index) => (
                                <div key={index} className="text-muted-foreground">• {rec}</div>
                              ))}
                              {outlet.recommendations.length > 2 && (
                                <div className="text-xs text-muted-foreground">
                                  +{outlet.recommendations.length - 2} more
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
                <TrendingUp className="h-5 w-5" />
                Market Trend Analysis
              </CardTitle>
              <CardDescription>External market trends affecting your business</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.marketTrends.map((trend, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        {getTrendIcon(trend.direction)}
                        {trend.trendName}
                      </h4>
                      <div className="flex gap-2">
                        {getStrengthBadge(trend.strength)}
                        <Badge variant={trend.impact === "High" ? "destructive" : trend.impact === "Medium" ? "outline" : "secondary"}>
                          {trend.impact} Impact
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{trend.description}</p>
                    <div>
                      <h5 className="font-medium text-sm mb-2">Recommended Actions:</h5>
                      <ul className="text-sm space-y-1">
                        {trend.recommendedActions.map((action, actionIndex) => (
                          <li key={actionIndex} className="flex items-center gap-2">
                            <Settings className="h-3 w-3 text-blue-500" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seasonality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Waves className="h-5 w-5" />
                Seasonality Patterns
              </CardTitle>
              <CardDescription>Recurring patterns that affect business performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.seasonalityAnalysis.map((pattern, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{pattern.type} Seasonality</h4>
                      <div className="flex items-center gap-2">
                        <Progress value={pattern.strength} className="w-20" />
                        <span className="text-sm">{pattern.strength}% strength</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{pattern.description}</p>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Period</TableHead>
                            <TableHead className="text-right">Multiplier</TableHead>
                            <TableHead className="text-right">Confidence</TableHead>
                            <TableHead>Impact</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pattern.pattern.map((item, itemIndex) => (
                            <TableRow key={itemIndex}>
                              <TableCell className="font-medium">{item.period}</TableCell>
                              <TableCell className="text-right">
                                <span className={item.multiplier > 1 ? "text-green-600" : item.multiplier < 1 ? "text-red-600" : ""}>
                                  {item.multiplier.toFixed(2)}x
                                </span>
                              </TableCell>
                              <TableCell className="text-right">{item.confidence}%</TableCell>
                              <TableCell>
                                {item.multiplier > 1.1 ? (
                                  <Badge variant="default" className="bg-green-100 text-green-800">High</Badge>
                                ) : item.multiplier < 0.9 ? (
                                  <Badge variant="destructive">Low</Badge>
                                ) : (
                                  <Badge variant="secondary">Normal</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5" />
                  Overall Risk Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">
                    {data.riskAssessment.overallRiskScore.toFixed(1)}
                  </div>
                  <Progress value={data.riskAssessment.overallRiskScore} className="mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {data.riskAssessment.overallRiskScore < 30 ? "Low Risk" : 
                     data.riskAssessment.overallRiskScore < 70 ? "Medium Risk" : "High Risk"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Factors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.riskAssessment.riskFactors.map((risk, index) => (
                    <div key={index} className="border-l-4 border-red-400 pl-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{risk.factor}</span>
                        <div className="flex items-center gap-2">
                          {getImpactIcon(risk.impact)}
                          <span className="text-sm">{risk.probability}%</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{risk.mitigation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Scenario Analysis</CardTitle>
              <CardDescription>Potential outcomes and their probabilities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Scenario</TableHead>
                      <TableHead className="text-right">Probability</TableHead>
                      <TableHead className="text-right">Revenue Impact</TableHead>
                      <TableHead className="text-right">Cost Impact</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.riskAssessment.scenarios.map((scenario, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{scenario.name}</TableCell>
                        <TableCell className="text-right">{scenario.probability}%</TableCell>
                        <TableCell className="text-right">
                          <span className={scenario.revenueImpact >= 0 ? "text-green-600" : "text-red-600"}>
                            {formatPercentage(scenario.revenueImpact)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={scenario.costImpact <= 0 ? "text-green-600" : "text-red-600"}>
                            {formatPercentage(scenario.costImpact)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{scenario.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Strategic Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Short Term (30 days)
                  </h4>
                  <ul className="space-y-2">
                    {data.recommendations.shortTerm.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircleIcon className="h-3 w-3 text-green-500 mt-0.5" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Medium Term (3 months)
                  </h4>
                  <ul className="space-y-2">
                    {data.recommendations.mediumTerm.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircleIcon className="h-3 w-3 text-blue-500 mt-0.5" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Long Term (6-12 months)
                  </h4>
                  <ul className="space-y-2">
                    {data.recommendations.longTerm.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircleIcon className="h-3 w-3 text-purple-500 mt-0.5" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actionable Insights</CardTitle>
              <CardDescription>Specific insights with clear action steps</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.actionableInsights.map((insight, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          {getPriorityBadge(insight.priority)}
                          <Badge variant="outline">{insight.category}</Badge>
                        </div>
                        <h4 className="font-medium">{insight.insight}</h4>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <span className="text-sm font-medium">Expected Impact:</span>
                        <p className="text-sm text-muted-foreground">{insight.expectedImpact}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Timeframe:</span>
                        <p className="text-sm text-muted-foreground">{insight.timeframe}</p>
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Required Actions:</span>
                      <ul className="mt-1 space-y-1">
                        {insight.requiredActions.map((action, actionIndex) => (
                          <li key={actionIndex} className="flex items-center gap-2 text-sm">
                            <Zap className="h-3 w-3 text-yellow-500" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                Model Performance Metrics
              </CardTitle>
              <CardDescription>Statistical accuracy and validation of forecasting models</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model Type</TableHead>
                      <TableHead className="text-right">Accuracy</TableHead>
                      <TableHead className="text-right">MAE</TableHead>
                      <TableHead className="text-right">RMSE</TableHead>
                      <TableHead className="text-right">Last Updated</TableHead>
                      <TableHead>Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.modelPerformance.map((model, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{model.modelType}</TableCell>
                        <TableCell className="text-right">{model.accuracy.toFixed(1)}%</TableCell>
                        <TableCell className="text-right">{model.meanAbsoluteError.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{model.rootMeanSquareError.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{format(model.lastUpdated, "MMM dd, yyyy")}</TableCell>
                        <TableCell>
                          {model.accuracy >= 80 ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">Excellent</Badge>
                          ) : model.accuracy >= 70 ? (
                            <Badge variant="outline" className="border-blue-500 text-blue-700">Good</Badge>
                          ) : model.accuracy >= 60 ? (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-700">Fair</Badge>
                          ) : (
                            <Badge variant="destructive">Poor</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Model Improvement Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Settings className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div>
                    <span className="font-medium">Data Quality Enhancement</span>
                    <p className="text-sm text-muted-foreground">Increase data collection frequency for better accuracy</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Brain className="h-4 w-4 text-purple-500 mt-0.5" />
                  <div>
                    <span className="font-medium">Advanced Algorithms</span>
                    <p className="text-sm text-muted-foreground">Consider implementing machine learning models for complex patterns</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <PieChart className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <span className="font-medium">External Factors</span>
                    <p className="text-sm text-muted-foreground">Incorporate external market data and economic indicators</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}