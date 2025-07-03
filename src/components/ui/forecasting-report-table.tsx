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
import type { ForecastingReport } from "@/types";
import { formatNumber } from "@/lib/utils";
import { 
  TrendingUp, 
  TrendingDown, 
  Target,
  AlertTriangle,
  BarChart3,
  Calendar,
  DollarSign
} from "lucide-react";

interface ForecastingReportTableProps {
  data: ForecastingReport | null;
}

export function ForecastingReportTable({ data }: ForecastingReportTableProps) {
  if (!data) {
    return (
      <p className="text-center text-muted-foreground">
        No forecasting data available for the selected period.
      </p>
    );
  }

  const renderCurrency = (value: number) => {
    return `$${formatNumber(value)}`;
  };

  const renderPercentage = (value: number) => {
    return `${formatNumber(value)}%`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600";
    if (confidence >= 60) return "text-yellow-600";
    return "text-destructive";
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Revenue & Cost Forecasting</h2>
        <p className="text-muted-foreground">
          {data.outletName && `${data.outletName} • `}
          Historical: {data.dateRange.from.toLocaleDateString()} - {data.dateRange.to.toLocaleDateString()}
        </p>
        <p className="text-muted-foreground">
          Forecast: {data.forecastPeriod.from.toLocaleDateString()} - {data.forecastPeriod.to.toLocaleDateString()}
        </p>
      </div>

      {/* Forecast Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Daily Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.revenueForecast.daily.length > 0 
                ? renderCurrency(data.revenueForecast.daily.reduce((sum, d) => sum + d.predictedRevenue, 0) / data.revenueForecast.daily.length)
                : "$0"
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Predicted daily average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Food Cost Forecast</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {renderPercentage(data.costForecast.predictedFoodCostPct)}
            </div>
            <p className="text-xs text-muted-foreground">
              Expected food cost %
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Daily Cost</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.costForecast.daily && data.costForecast.daily.length > 0 
                ? renderCurrency(data.costForecast.daily.reduce((sum, d) => sum + d.predictedTotalCost, 0) / data.costForecast.daily.length)
                : "$0"
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Predicted daily average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confidence Level</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getConfidenceColor(data.costForecast.confidenceLevel)}`}>
              {renderPercentage(data.costForecast.confidenceLevel)}
            </div>
            <Progress value={data.costForecast.confidenceLevel} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Cost Forecast Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5" />
            Cost Forecasting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Food Cost %</h4>
              <p className="text-3xl font-bold">{renderPercentage(data.costForecast.predictedFoodCostPct)}</p>
              <Badge variant={data.costForecast.predictedFoodCostPct > 35 ? "destructive" : data.costForecast.predictedFoodCostPct > 30 ? "outline" : "default"}>
                {data.costForecast.predictedFoodCostPct > 35 ? "High" : data.costForecast.predictedFoodCostPct > 30 ? "Moderate" : "Good"}
              </Badge>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Beverage Cost %</h4>
              <p className="text-3xl font-bold">{renderPercentage(data.costForecast.predictedBeverageCostPct)}</p>
              <Badge variant={data.costForecast.predictedBeverageCostPct > 25 ? "destructive" : data.costForecast.predictedBeverageCostPct > 20 ? "outline" : "default"}>
                {data.costForecast.predictedBeverageCostPct > 25 ? "High" : data.costForecast.predictedBeverageCostPct > 20 ? "Moderate" : "Good"}
              </Badge>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Cost Efficiency</h4>
              <p className="text-3xl font-bold">{renderPercentage(data.costForecast.costEfficiencyRatio || 0)}</p>
              <Badge variant={(data.costForecast.costEfficiencyRatio || 0) > 80 ? "destructive" : (data.costForecast.costEfficiencyRatio || 0) > 70 ? "outline" : "default"}>
                {(data.costForecast.costEfficiencyRatio || 0) > 80 ? "Poor" : (data.costForecast.costEfficiencyRatio || 0) > 70 ? "Moderate" : "Good"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Forecast Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daily Revenue Forecast (Next 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Predicted Revenue</TableHead>
                <TableHead className="text-right">Confidence Range</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.revenueForecast.daily.slice(0, 7).map((forecast, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {forecast.date.toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {renderCurrency(forecast.predictedRevenue)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {renderCurrency(forecast.confidenceInterval.lower)} - {renderCurrency(forecast.confidenceInterval.upper)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Monthly Revenue Forecast */}
      {data.revenueForecast.monthly.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Monthly Revenue Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Predicted Revenue</TableHead>
                  <TableHead className="text-right">Seasonal Factor</TableHead>
                  <TableHead className="text-right">Confidence Range</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.revenueForecast.monthly.map((forecast, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {forecast.month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {renderCurrency(forecast.predictedRevenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={forecast.seasonalFactor > 1.05 ? "default" : forecast.seasonalFactor < 0.95 ? "outline" : "secondary"}>
                        {(forecast.seasonalFactor * 100).toFixed(0)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {renderCurrency(forecast.confidenceInterval.lower)} - {renderCurrency(forecast.confidenceInterval.upper)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Daily Cost Forecast */}
      {data.costForecast.daily && data.costForecast.daily.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Target className="h-5 w-5" />
              Daily Cost Forecast (Next 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Food Cost</TableHead>
                  <TableHead className="text-right">Beverage Cost</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Confidence Range</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.costForecast.daily.slice(0, 7).map((forecast, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {forecast.date.toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {renderCurrency(forecast.predictedFoodCost)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {renderCurrency(forecast.predictedBeverageCost)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {renderCurrency(forecast.predictedTotalCost)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {renderCurrency(forecast.confidenceInterval.lower)} - {renderCurrency(forecast.confidenceInterval.upper)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Monthly Cost Forecast */}
      {data.costForecast.monthly && data.costForecast.monthly.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Monthly Cost Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Food Cost</TableHead>
                  <TableHead className="text-right">Beverage Cost</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Seasonal Factor</TableHead>
                  <TableHead className="text-right">Confidence Range</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.costForecast.monthly.map((forecast, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {forecast.month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {renderCurrency(forecast.predictedFoodCost)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {renderCurrency(forecast.predictedBeverageCost)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {renderCurrency(forecast.predictedTotalCost)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={forecast.seasonalFactor > 1.02 ? "default" : forecast.seasonalFactor < 0.98 ? "outline" : "secondary"}>
                        {(forecast.seasonalFactor * 100).toFixed(0)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {renderCurrency(forecast.confidenceInterval.lower)} - {renderCurrency(forecast.confidenceInterval.upper)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Business Forecast */}
      {data.businessForecast && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Business Performance Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Revenue Mix Forecast</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Food Revenue:</span>
                    <span className="font-mono font-medium">{renderPercentage(data.businessForecast.revenueMixForecast.foodRevenuePercentage)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Beverage Revenue:</span>
                    <span className="font-mono font-medium">{renderPercentage(data.businessForecast.revenueMixForecast.beverageRevenuePercentage)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Revenue Growth Rate:</span>
                    <span className={`font-mono font-medium ${data.businessForecast.revenueGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {data.businessForecast.revenueGrowthRate >= 0 ? '+' : ''}{renderPercentage(data.businessForecast.revenueGrowthRate)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">Cost Variance Forecast</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Food Cost Variance:</span>
                    <span className={`font-mono font-medium ${data.businessForecast.costVarianceForecast.foodCostVariance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {data.businessForecast.costVarianceForecast.foodCostVariance >= 0 ? '+' : ''}{renderPercentage(data.businessForecast.costVarianceForecast.foodCostVariance)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Beverage Cost Variance:</span>
                    <span className={`font-mono font-medium ${data.businessForecast.costVarianceForecast.beverageCostVariance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {data.businessForecast.costVarianceForecast.beverageCostVariance >= 0 ? '+' : ''}{renderPercentage(data.businessForecast.costVarianceForecast.beverageCostVariance)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Break-Even Revenue:</span>
                    <span className="font-mono font-medium">{renderCurrency(data.businessForecast.breakEvenRevenue)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assumptions & Risk Factors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Forecast Assumptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.assumptions.map((assumption, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2" />
                  {assumption}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Risk Factors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.riskFactors.map((risk, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2" />
                  {risk}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Strategic Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-green-600 mb-3">Immediate Actions</h4>
              <ul className="space-y-2">
                {data.recommendations.slice(0, Math.ceil(data.recommendations.length / 2)).map((recommendation, index) => (
                  <li key={index} className="text-sm flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2" />
                    {recommendation}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-600 mb-3">Long-term Strategy</h4>
              <ul className="space-y-2">
                {data.recommendations.slice(Math.ceil(data.recommendations.length / 2)).map((recommendation, index) => (
                  <li key={index} className="text-sm flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2" />
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