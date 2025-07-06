"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { RealTimeKPIDashboard } from "@/types";
import { formatNumber } from "@/lib/utils";
import { 
  DollarSign, 
  Percent, 
  Users, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Calculator,
  PieChart,
  BarChart3
} from "lucide-react";

interface RealTimeKPIDashboardProps {
  data: (RealTimeKPIDashboard & { propertyInfo?: { id: number; name: string; propertyCode: string } | null }) | null;
}

export function RealTimeKPIDashboardComponent({ data }: RealTimeKPIDashboardProps) {
  if (!data) {
    return (
      <p className="text-center text-muted-foreground">
        No KPI data available. Please check your data connection.
      </p>
    );
  }

  const renderCurrency = (value: number) => {
    return `$${formatNumber(value)}`;
  };

  const renderPercentage = (value: number) => {
    return `${formatNumber(value)}%`;
  };

  const getPropertySuffix = () => {
    if (data?.propertyInfo?.name) {
      return ` - ${data.propertyInfo.name}`;
    }
    return " - All Properties";
  };

  const getCurrentDateTime = () => {
    return ` | ${data.lastUpdated.toLocaleString()}`;
  };

  const getStatusIcon = (status: "excellent" | "good" | "warning" | "critical") => {
    switch (status) {
      case "excellent":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "good":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "critical":
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusBadgeVariant = (status: "excellent" | "good" | "warning" | "critical") => {
    switch (status) {
      case "excellent":
        return "default";
      case "good":
        return "secondary";
      case "warning":
        return "outline";
      case "critical":
        return "destructive";
    }
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getAlertIcon = (severity: "high" | "medium" | "low") => {
    switch (severity) {
      case "high":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "medium":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Revenue KPIs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Revenue Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Today's Revenue</p>
              <p className="text-2xl font-bold">
                {renderCurrency(data.currentPeriodKPIs.todayRevenue)}
              </p>
              <Progress 
                value={(data.currentPeriodKPIs.todayRevenue / data.currentPeriodKPIs.revenueTarget) * 100}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                Target: {renderCurrency(data.currentPeriodKPIs.revenueTarget)}
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">Achievement Rate</p>
              <p className="text-2xl font-bold">
                {renderPercentage(data.currentPeriodKPIs.revenueAchievement)}
              </p>
              <Badge variant={data.currentPeriodKPIs.revenueAchievement >= 100 ? "default" : "outline"}>
                {data.currentPeriodKPIs.revenueAchievement >= 100 ? "Target Met" : "Below Target"}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">Revenue Variance</p>
              <p className={`text-2xl font-bold ${data.currentPeriodKPIs.revenueVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.currentPeriodKPIs.revenueVariance >= 0 ? '+' : ''}{renderPercentage(data.currentPeriodKPIs.revenueVariance)}
              </p>
              <p className="text-xs text-muted-foreground">
                vs Budget Target
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost KPIs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Cost Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium">Food Cost %</p>
                  <Badge variant={data.currentPeriodKPIs.currentFoodCostPct <= data.currentPeriodKPIs.targetFoodCostPct ? "default" : "destructive"}>
                    {renderPercentage(data.currentPeriodKPIs.currentFoodCostPct)}
                  </Badge>
                </div>
                <Progress 
                  value={(data.currentPeriodKPIs.currentFoodCostPct / data.currentPeriodKPIs.targetFoodCostPct) * 100}
                  className="h-3"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Target: {renderPercentage(data.currentPeriodKPIs.targetFoodCostPct)}
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium">Beverage Cost %</p>
                  <Badge variant={data.currentPeriodKPIs.currentBeverageCostPct <= data.currentPeriodKPIs.targetBeverageCostPct ? "default" : "destructive"}>
                    {renderPercentage(data.currentPeriodKPIs.currentBeverageCostPct)}
                  </Badge>
                </div>
                <Progress 
                  value={(data.currentPeriodKPIs.currentBeverageCostPct / data.currentPeriodKPIs.targetBeverageCostPct) * 100}
                  className="h-3"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Target: {renderPercentage(data.currentPeriodKPIs.targetBeverageCostPct)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operational KPIs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Operational Efficiency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <Calculator className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Profit Margin</p>
              <p className="text-2xl font-bold">{renderPercentage(data.currentPeriodKPIs.profitMargin)}</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <PieChart className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Food Revenue %</p>
              <p className="text-2xl font-bold">{renderPercentage(data.currentPeriodKPIs.foodRevenuePercentage)}</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <Percent className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Cost Efficiency</p>
              <p className="text-2xl font-bold">{renderPercentage(data.currentPeriodKPIs.costEfficiencyRatio)}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className={`h-6 w-6 mr-2 ${data.currentPeriodKPIs.foodCostVariance <= 0 ? 'text-green-500' : 'text-red-500'}`} />
                <p className="text-sm font-medium">Food Cost Variance</p>
              </div>
              <p className={`text-xl font-bold ${data.currentPeriodKPIs.foodCostVariance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.currentPeriodKPIs.foodCostVariance >= 0 ? '+' : ''}{renderPercentage(data.currentPeriodKPIs.foodCostVariance)}
              </p>
              <p className="text-xs text-muted-foreground">vs Budget</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className={`h-6 w-6 mr-2 ${data.currentPeriodKPIs.beverageCostVariance <= 0 ? 'text-green-500' : 'text-red-500'}`} />
                <p className="text-sm font-medium">Beverage Cost Variance</p>
              </div>
              <p className={`text-xl font-bold ${data.currentPeriodKPIs.beverageCostVariance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.currentPeriodKPIs.beverageCostVariance >= 0 ? '+' : ''}{renderPercentage(data.currentPeriodKPIs.beverageCostVariance)}
              </p>
              <p className="text-xs text-muted-foreground">vs Budget</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trending KPIs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Trending KPIs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.trendingKPIs.map((kpi, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(kpi.status)}
                  <div>
                    <p className="font-medium">{kpi.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Target: {formatNumber(kpi.target)}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{formatNumber(kpi.value)}</span>
                    {getTrendIcon(kpi.trend)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(kpi.status)}>
                      {kpi.status}
                    </Badge>
                    <span className={`text-sm ${kpi.trend === "up" ? "text-green-600" : kpi.trend === "down" ? "text-destructive" : "text-muted-foreground"}`}>
                      {kpi.trendPercentage > 0 ? "+" : ""}{formatNumber(kpi.trendPercentage)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.alerts.map((alert, index) => (
                <Alert key={index} className={alert.severity === "high" ? "border-destructive" : alert.severity === "medium" ? "border-yellow-500" : ""}>
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.severity)}
                    <div className="flex-1">
                      <AlertDescription className="font-medium">
                        {alert.message}
                      </AlertDescription>
                      <p className="text-xs text-muted-foreground mt-1">
                        {alert.timestamp.toLocaleString()} • {alert.type.replace("_", " ")}
                      </p>
                    </div>
                    <Badge variant={alert.severity === "high" ? "destructive" : alert.severity === "medium" ? "outline" : "secondary"}>
                      {alert.severity}
                    </Badge>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}