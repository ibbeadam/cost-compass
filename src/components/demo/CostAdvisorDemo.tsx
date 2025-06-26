"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCostAdvisor, createSampleAnalysisData } from '@/hooks/useCostAdvisor';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  DollarSign,
  Target,
  BarChart3,
  Zap
} from 'lucide-react';

export function CostAdvisorDemo() {
  const [selectedScenario, setSelectedScenario] = useState<string>('normal');
  
  const {
    isAnalyzing,
    lastAnalysis,
    error,
    runQuickAnalysis,
    runEnhancedAnalysisWithData,
    getAnalysisSummary,
    getStatusColors,
    clearAnalysis
  } = useCostAdvisor({
    autoNotify: true,
    notificationOptions: {
      enableAlerts: true,
      enableInsights: true,
      enableRecommendations: true,
      minAlertLevel: 'low',
      maxNotificationsPerSession: 6
    },
    smartNotificationConfig: {
      enableAlerts: true,
      enableInsights: true,
      enableRecommendations: true,
      minAlertLevel: 'low',
      maxNotificationsPerSession: 8
    },
    useEnhancedAnalysis: true
  });

  const scenarios = {
    normal: {
      name: 'Normal Operations',
      description: 'Typical day with costs within budget',
      data: {
        numberOfDays: 1,
        totalFoodRevenue: 2500,
        budgetFoodCostPct: 28,
        actualFoodCostPct: 27,
        totalBeverageRevenue: 800,
        budgetBeverageCostPct: 20,
        actualBeverageCostPct: 19,
      },
      expectedAlert: 'none',
      color: 'green'
    },
    warning: {
      name: 'Budget Overrun',
      description: 'Costs slightly over budget, needs monitoring',
      data: {
        numberOfDays: 1,
        totalFoodRevenue: 2500,
        budgetFoodCostPct: 28,
        actualFoodCostPct: 32,
        totalBeverageRevenue: 800,
        budgetBeverageCostPct: 20,
        actualBeverageCostPct: 24,
      },
      expectedAlert: 'medium',
      color: 'yellow'
    },
    critical: {
      name: 'Critical Situation',
      description: 'Severe cost overruns requiring immediate action',
      data: {
        numberOfDays: 1,
        totalFoodRevenue: 2500,
        budgetFoodCostPct: 28,
        actualFoodCostPct: 38,
        totalBeverageRevenue: 800,
        budgetBeverageCostPct: 20,
        actualBeverageCostPct: 30,
      },
      expectedAlert: 'critical',
      color: 'red'
    },
    excellent: {
      name: 'Excellent Performance',
      description: 'Costs well under budget, excellent efficiency',
      data: {
        numberOfDays: 1,
        totalFoodRevenue: 2500,
        budgetFoodCostPct: 28,
        actualFoodCostPct: 24,
        totalBeverageRevenue: 800,
        budgetBeverageCostPct: 20,
        actualBeverageCostPct: 16,
      },
      expectedAlert: 'none',
      color: 'green'
    }
  };

  const handleRunAnalysis = async () => {
    const scenario = scenarios[selectedScenario as keyof typeof scenarios];
    
    // Create enhanced input with full context
    const enhancedInput = {
      ...scenario.data,
      historicalData: Array.from({ length: 14 }, (_, i) => ({
        date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        foodRevenue: scenario.data.totalFoodRevenue + Math.random() * 200 - 100,
        foodCostPct: scenario.data.actualFoodCostPct + Math.random() * 4 - 2,
        beverageRevenue: scenario.data.totalBeverageRevenue + Math.random() * 100 - 50,
        beverageCostPct: scenario.data.actualBeverageCostPct + Math.random() * 3 - 1.5,
      })),
      businessContext: {
        season: 'summer' as const,
        dayOfWeek: 'friday' as const,
        specialEvents: selectedScenario === 'normal' ? [] : ['Special Event'],
        marketConditions: selectedScenario === 'critical' ? 'Supply chain disruptions affecting costs' : 'Normal market conditions',
        staffingLevel: selectedScenario === 'warning' ? 'understaffed' as const : 'normal' as const,
      },
      categoryBreakdown: {
        food: [
          { category: 'Proteins', costPct: scenario.data.actualFoodCostPct + 5, revenue: scenario.data.totalFoodRevenue * 0.4 },
          { category: 'Vegetables', costPct: scenario.data.actualFoodCostPct - 3, revenue: scenario.data.totalFoodRevenue * 0.3 },
          { category: 'Grains', costPct: scenario.data.actualFoodCostPct - 5, revenue: scenario.data.totalFoodRevenue * 0.3 },
        ],
        beverage: [
          { category: 'Alcoholic', costPct: scenario.data.actualBeverageCostPct + 2, revenue: scenario.data.totalBeverageRevenue * 0.6 },
          { category: 'Non-Alcoholic', costPct: scenario.data.actualBeverageCostPct - 3, revenue: scenario.data.totalBeverageRevenue * 0.4 },
        ]
      },
      outlet: {
        name: 'Demo Restaurant',
        type: 'restaurant' as const,
        capacity: 120,
        location: 'downtown'
      }
    };
    
    await runQuickAnalysis(enhancedInput, 'Demo Restaurant');
  };

  const analysisSummary = getAnalysisSummary();
  const statusColors = getStatusColors();

  const getAlertIcon = (alertLevel: string) => {
    switch (alertLevel) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high': return <TrendingDown className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low': return <TrendingUp className="h-4 w-4 text-blue-500" />;
      default: return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getAlertColor = (alertLevel: string) => {
    switch (alertLevel) {
      case 'critical': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <Card className="shadow-lg bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-xl">
          <Brain className="h-5 w-5" />
          Enhanced Cost Advisor Demo
          <Badge variant="secondary" className="ml-2 text-xs">
            v2.0 Enhanced
          </Badge>
        </CardTitle>
        <CardDescription>
          Experience the full-featured AI cost analysis with historical trends, business intelligence, and smart notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scenario Selection */}
        <div className="space-y-3">
          <h4 className="font-medium">Select Analysis Scenario:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(scenarios).map(([key, scenario]) => (
              <Button
                key={key}
                variant={selectedScenario === key ? "default" : "outline"}
                size="sm"
                className="h-auto p-3 flex flex-col items-start space-y-1"
                onClick={() => setSelectedScenario(key)}
              >
                <span className="font-medium text-xs">{scenario.name}</span>
                <span className="text-xs text-muted-foreground leading-tight">
                  {scenario.description}
                </span>
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Analysis Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Enhanced AI Cost Analysis</p>
              <p className="text-xs text-muted-foreground">
                Advanced analysis with historical trends, business context, and smart notifications
              </p>
            </div>
            <div className="flex gap-2">
              {lastAnalysis && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAnalysis}
                  disabled={isAnalyzing}
                >
                  Clear
                </Button>
              )}
              <Button
                onClick={handleRunAnalysis}
                disabled={isAnalyzing}
                className="flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Run Enhanced Analysis
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-blue-50 rounded-lg border">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-700">📈</div>
              <p className="text-xs font-medium text-blue-800">Historical Trends</p>
              <p className="text-xs text-blue-600">30-day lookback analysis</p>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-700">🎯</div>
              <p className="text-xs font-medium text-blue-800">Business Context</p>
              <p className="text-xs text-blue-600">Season, events, staffing</p>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-700">🚨</div>
              <p className="text-xs font-medium text-blue-800">Smart Alerts</p>
              <p className="text-xs text-blue-600">Priority-based notifications</p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        {/* Analysis Results */}
        {analysisSummary && (
          <div className="space-y-4">
            <Separator />
            <h4 className="font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analysis Results
            </h4>
            
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {getAlertIcon(analysisSummary.alertLevel)}
                  <span className="text-sm font-medium">Alert Level</span>
                </div>
                <Badge variant={getAlertColor(analysisSummary.alertLevel)}>
                  {analysisSummary.alertLevel.toUpperCase()}
                </Badge>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Overall Score</span>
                </div>
                <p className="text-2xl font-bold">{analysisSummary.overallScore}/100</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Budget Compliance</span>
                </div>
                <p className="text-2xl font-bold">{analysisSummary.budgetCompliance.toFixed(0)}%</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Efficiency</span>
                </div>
                <p className="text-2xl font-bold">{analysisSummary.efficiency}/100</p>
              </div>
            </div>

            {/* Key Insights */}
            {analysisSummary.keyInsights.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-medium text-sm">Key Insights:</h5>
                <div className="space-y-2">
                  {analysisSummary.keyInsights.map((insight, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-muted/30 rounded">
                      <Badge variant="outline" className="text-xs">
                        {insight.category}
                      </Badge>
                      <p className="text-sm flex-1">{insight.insight}</p>
                      <Badge 
                        variant={insight.impact === 'high' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {insight.impact}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Urgent Recommendations */}
            {analysisSummary.urgentRecommendations.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-medium text-sm">Priority Recommendations:</h5>
                <div className="space-y-2">
                  {analysisSummary.urgentRecommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 border rounded">
                      <Badge 
                        variant={rec.priority === 'urgent' ? 'destructive' : 'default'}
                        className="text-xs"
                      >
                        {rec.priority}
                      </Badge>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{rec.action}</p>
                        <p className="text-xs text-muted-foreground">
                          Impact: {rec.estimatedImpact} | Timeframe: {rec.timeframe}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Features Info */}
        <div className="mt-6 space-y-3">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h5 className="text-sm font-medium text-green-800 mb-2">🚀 Enhanced Features Active:</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-green-700">
              <div>• Historical trend analysis (14-day sample)</div>
              <div>• Business context awareness</div>
              <div>• Category-level cost breakdown</div>
              <div>• Outlet-specific recommendations</div>
              <div>• Advanced risk assessment</div>
              <div>• Smart notification triggers</div>
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>💡 Tip:</strong> After running the enhanced analysis, check the notification bell in the header to see the intelligent notifications generated based on comprehensive AI insights, including priority-based alerts and contextual recommendations.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}