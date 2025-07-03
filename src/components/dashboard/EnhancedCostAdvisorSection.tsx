"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
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
  Zap,
  RefreshCw,
  Info,
  Activity,
  FileSpreadsheet,
  FileText,
  Download
} from 'lucide-react';
import type { DashboardAdvisorOutput } from '@/ai/flows/dashboard-cost-advisor-flow';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { showToast } from '@/lib/toast';

interface EnhancedCostAdvisorSectionProps {
  isLoading: boolean;
  insights: DashboardAdvisorOutput | null;
  error?: string | null;
  outletName?: string;
  dateRange?: string;
  onRefresh?: () => void;
  showRefreshButton?: boolean;
}

export function EnhancedCostAdvisorSection({ 
  isLoading, 
  insights, 
  error, 
  outletName = 'Current Outlet',
  dateRange = '',
  onRefresh,
  showRefreshButton = false
}: EnhancedCostAdvisorSectionProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Get alert icon based on level
  const getAlertIcon = (alertLevel: string) => {
    switch (alertLevel) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high': return <TrendingDown className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low': return <TrendingUp className="h-4 w-4 text-blue-500" />;
      default: return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  // Get alert color for badges
  const getAlertColor = (alertLevel: string) => {
    switch (alertLevel) {
      case 'critical': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  // Get priority color for recommendations
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Export to Excel function
  const exportToExcel = () => {
    if (!insights) {
      showToast.error("No data available to export.");
      return;
    }

    const ws_data = [
      ['Enhanced AI Cost Advisor Report'],
      ['Generated on:', new Date().toLocaleDateString()],
      ['Outlet:', outletName],
      ['Period:', dateRange || 'Current Period'],
      [],
      ['PERFORMANCE METRICS'],
      ['Overall Score', `${insights.performanceMetrics.overallScore}/100`],
      ['Budget Compliance', `${insights.performanceMetrics.budgetCompliance.toFixed(0)}%`],
      ['Efficiency', `${insights.performanceMetrics.efficiency}/100`],
      ['Alert Level', insights.alertLevel.toUpperCase()],
      [],
      ['SPENDING GUIDELINES'],
      ['Food Cost Guideline', insights.dailySpendingGuidelineFood],
      ['Beverage Cost Guideline', insights.dailySpendingGuidelineBeverage],
      [],
      ['COST ANALYSIS'],
      ['Food Cost Analysis', insights.foodCostAnalysis],
      ['Beverage Cost Analysis', insights.beverageCostAnalysis],
      [],
      ['TREND ANALYSIS'],
      ['Food Trend', insights.trendAnalysis.foodTrend],
      ['Beverage Trend', insights.trendAnalysis.beverageTrend],
      ['Trend Summary', insights.trendAnalysis.trendSummary],
      ['Predictive Insight', insights.trendAnalysis.predictiveInsight],
      [],
      ['RISK ASSESSMENT'],
      ['Overall Risk Level', insights.riskAssessment.overallRiskLevel.toUpperCase()],
      ['Risk Factors', ''],
      ...insights.riskAssessment.riskFactors.map(factor => ['', factor]),
      ['Mitigation Strategies', ''],
      ...insights.riskAssessment.mitigation.map(strategy => ['', strategy]),
      []
    ];

    if (insights.keyInsights?.length > 0) {
      ws_data.push(['KEY INSIGHTS']);
      insights.keyInsights.forEach(insight => {
        ws_data.push([insight.category, insight.insight, `Impact: ${insight.impact}`]);
      });
      ws_data.push([]);
    }

    if (insights.recommendations?.length > 0) {
      ws_data.push(['RECOMMENDATIONS']);
      ws_data.push(['Priority', 'Action', 'Impact', 'Timeframe', 'Difficulty']);
      insights.recommendations.slice(0, 5).forEach(rec => {
        ws_data.push([rec.priority, rec.action, rec.estimatedImpact, rec.timeframe, rec.difficultyLevel]);
      });
      ws_data.push([]);
    }

    if (insights.nextSteps?.length > 0) {
      ws_data.push(['NEXT STEPS']);
      insights.nextSteps.forEach((step, index) => {
        ws_data.push([`${index + 1}.`, step]);
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'AI Cost Advisor Report');
    
    const fileName = `AI_Cost_Advisor_Report_${outletName?.replace(/\s+/g, '_') || 'Report'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    showToast.success("Report successfully exported to Excel.");
  };

  // Export to PDF function
  const exportToPDF = () => {
    if (!insights) {
      showToast.error("No data available to export.");
      return;
    }

    const doc = new jsPDF();
    let yPos = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text('Enhanced AI Cost Advisor Report', 20, yPos);
    yPos += 10;

    // Header info
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, yPos);
    yPos += 7;
    doc.text(`Outlet: ${outletName}`, 20, yPos);
    yPos += 7;
    doc.text(`Period: ${dateRange || 'Current Period'}`, 20, yPos);
    yPos += 15;

    // Performance Metrics
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text('Performance Metrics', 20, yPos);
    yPos += 10;

    const metricsData = [
      ['Overall Score', `${insights.performanceMetrics.overallScore}/100`],
      ['Budget Compliance', `${insights.performanceMetrics.budgetCompliance.toFixed(0)}%`],
      ['Efficiency', `${insights.performanceMetrics.efficiency}/100`],
      ['Alert Level', insights.alertLevel.toUpperCase()]
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: metricsData,
      theme: 'grid',
      styles: { fontSize: 10 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Add spending guidelines
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text('Daily Spending Guidelines', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const foodText = doc.splitTextToSize(insights.dailySpendingGuidelineFood, 170);
    doc.text(foodText, 20, yPos);
    yPos += foodText.length * 5 + 5;

    const beverageText = doc.splitTextToSize(insights.dailySpendingGuidelineBeverage, 170);
    doc.text(beverageText, 20, yPos);
    yPos += beverageText.length * 5 + 15;

    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    // Risk Assessment
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text('Risk Assessment', 20, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.text(`Overall Risk Level: ${insights.riskAssessment.overallRiskLevel.toUpperCase()}`, 20, yPos);
    yPos += 10;

    if (insights.riskAssessment.riskFactors.length > 0) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text('Risk Factors:', 20, yPos);
      yPos += 7;

      doc.setFont("helvetica", "normal");
      insights.riskAssessment.riskFactors.forEach(factor => {
        const factorText = doc.splitTextToSize(`• ${factor}`, 170);
        doc.text(factorText, 25, yPos);
        yPos += factorText.length * 5 + 2;
      });
      yPos += 5;
    }

    // Recommendations
    if (insights.recommendations?.length > 0) {
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text('Priority Recommendations', 20, yPos);
      yPos += 10;

      const recData = insights.recommendations.slice(0, 5).map(rec => [
        rec.priority,
        rec.action,
        rec.estimatedImpact,
        rec.timeframe
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Priority', 'Action', 'Impact', 'Timeframe']],
        body: recData,
        theme: 'grid',
        styles: { fontSize: 9 },
        columnStyles: {
          1: { cellWidth: 80 }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Next Steps
    if (insights.nextSteps?.length > 0) {
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text('Immediate Next Steps', 20, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      insights.nextSteps.forEach((step, index) => {
        const stepText = doc.splitTextToSize(`${index + 1}. ${step}`, 170);
        doc.text(stepText, 20, yPos);
        yPos += stepText.length * 5 + 3;
      });
    }

    const fileName = `AI_Cost_Advisor_Report_${outletName?.replace(/\s+/g, '_') || 'Report'}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    showToast.success("Report successfully exported to PDF.");
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="shadow-lg bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline text-xl">
            <Brain className="h-5 w-5 text-primary animate-pulse" />
            <Skeleton className="h-6 w-64 bg-muted" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-96 bg-muted" />
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enhanced Features Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-blue-50 rounded-lg border">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <Skeleton className="h-6 w-8 mx-auto mb-2 bg-muted" />
                <Skeleton className="h-4 w-24 mx-auto mb-1 bg-muted" />
                <Skeleton className="h-3 w-32 mx-auto bg-muted" />
              </div>
            ))}
          </div>
          
          {/* Key Metrics Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20 bg-muted" />
                <Skeleton className="h-8 w-16 bg-muted" />
              </div>
            ))}
          </div>
          
          {/* Content Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-4 w-32 bg-muted" />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="shadow-lg bg-destructive/10 border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline text-xl text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Enhanced AI Analysis Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-destructive-foreground/80">{error}</p>
          {onRefresh && (
            <Button 
              variant="outline" 
              onClick={onRefresh}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry Analysis
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // No insights state
  if (!insights) {
    return (
      <Card className="shadow-lg bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline text-xl">
            <Info className="h-5 w-5 text-muted-foreground" />
            Enhanced AI Cost Advisor
          </CardTitle>
          <CardDescription>
            Advanced cost analysis will appear here once data is processed for the selected period and outlet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Enhanced AI analysis with historical trends, business intelligence, and smart recommendations will be displayed here when sufficient data is available.
          </p>
          {onRefresh && (
            <Button 
              variant="outline" 
              onClick={onRefresh}
              className="flex items-center gap-2 mt-4"
            >
              <RefreshCw className="h-4 w-4" />
              Analyze Current Data
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Main insights display
  return (
    <Card className="shadow-lg bg-card border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 font-headline text-xl text-primary">
              <Brain className="h-6 w-6" />
              Enhanced AI Cost Advisor
              <Badge variant="secondary" className="ml-2 text-xs">
                v2.0 Enhanced
              </Badge>
            </CardTitle>
            <CardDescription>
              {outletName} • {dateRange || 'Current Period'} • Comprehensive business intelligence analysis
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={exportToExcel}
              className="flex items-center gap-2"
              title="Export to Excel"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={exportToPDF}
              className="flex items-center gap-2"
              title="Export to PDF"
            >
              <FileText className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-3">
        {/* Enhanced Features Active Indicator */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-blue-50 rounded-lg border">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-700">📊</div>
            <p className="text-xs font-medium text-blue-800">Historical Trends</p>
            <p className="text-xs text-blue-600">30-day analysis active</p>
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

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {getAlertIcon(insights.alertLevel)}
              <span className="text-sm font-medium">Alert Level</span>
            </div>
            <Badge variant={getAlertColor(insights.alertLevel) as any}>
              {insights.alertLevel.toUpperCase()}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Overall Score</span>
            </div>
            <p className="text-2xl font-bold">{insights.performanceMetrics.overallScore}/100</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Budget Compliance</span>
            </div>
            <p className="text-2xl font-bold">{insights.performanceMetrics.budgetCompliance.toFixed(0)}%</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Efficiency</span>
            </div>
            <p className="text-2xl font-bold">{insights.performanceMetrics.efficiency}/100</p>
          </div>
        </div>

        <Separator />

        {/* Daily Spending Guidelines */}
        <div className="p-4 rounded-md bg-background border">
          <h3 className="font-semibold text-md mb-2 flex items-center">
            <Target className="mr-2 h-5 w-5 text-primary/80"/>
            Daily Spending Guidelines
          </h3>
          <p className="text-sm text-muted-foreground">{insights.dailySpendingGuidelineFood}</p>
          <p className="text-sm text-muted-foreground">{insights.dailySpendingGuidelineBeverage}</p>
        </div>

        {/* Cost Analysis Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 rounded-md bg-background border">
            <h4 className="font-medium text-sm mb-1 flex items-center">
              {insights.foodCostAnalysis.toLowerCase().includes("over budget") ? 
                <TrendingUp className="mr-1.5 h-4 w-4 text-destructive" /> : 
                <TrendingDown className="mr-1.5 h-4 w-4 text-green-600" />
              }
              Food Cost Analysis
            </h4>
            <p className="text-xs text-muted-foreground">{insights.foodCostAnalysis}</p>
          </div>
          <div className="p-3 rounded-md bg-background border">
            <h4 className="font-medium text-sm mb-1 flex items-center">
              {insights.beverageCostAnalysis.toLowerCase().includes("over budget") ? 
                <TrendingUp className="mr-1.5 h-4 w-4 text-destructive" /> : 
                <TrendingDown className="mr-1.5 h-4 w-4 text-green-600" />
              }
              Beverage Cost Analysis
            </h4>
            <p className="text-xs text-muted-foreground">{insights.beverageCostAnalysis}</p>
          </div>
        </div>

        {/* Trend Analysis */}
        <div className="p-4 rounded-md bg-background border">
          <h3 className="font-semibold text-md mb-2 flex items-center">
            <BarChart3 className="mr-2 h-5 w-5 text-primary/80"/>
            Historical Trend Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium">Food Trend:</span>
                <Badge variant="outline" className="text-xs">
                  {insights.trendAnalysis.foodTrend}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">Beverage Trend:</span>
                <Badge variant="outline" className="text-xs">
                  {insights.trendAnalysis.beverageTrend}
                </Badge>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                <strong>Summary:</strong> {insights.trendAnalysis.trendSummary}
              </p>
            </div>
          </div>
          <div className="p-2 bg-blue-50 rounded text-xs text-blue-700">
            <strong>Predictive Insight:</strong> {insights.trendAnalysis.predictiveInsight}
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="p-4 rounded-md bg-background border">
          <h3 className="font-semibold text-md mb-2 flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-primary/80"/>
            Risk Assessment
            <Badge 
              variant={insights.riskAssessment.overallRiskLevel === 'critical' || insights.riskAssessment.overallRiskLevel === 'high' ? 'destructive' : 'secondary'} 
              className="ml-2 text-xs"
            >
              {insights.riskAssessment.overallRiskLevel.toUpperCase()}
            </Badge>
          </h3>
          
          {insights.riskAssessment.riskFactors.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-medium mb-2">Risk Factors:</h4>
              <ul className="space-y-1">
                {insights.riskAssessment.riskFactors.map((factor, index) => (
                  <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {insights.riskAssessment.mitigation.length > 0 && (
            <div>
              <h4 className="text-xs font-medium mb-2">Mitigation Strategies:</h4>
              <ul className="space-y-1">
                {insights.riskAssessment.mitigation.map((strategy, index) => (
                  <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">•</span>
                    {strategy}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Key Insights */}
        {insights.keyInsights && insights.keyInsights.length > 0 && (
          <div className="p-4 rounded-md bg-background border">
            <h3 className="font-semibold text-md mb-2 flex items-center">
              <Info className="mr-2 h-5 w-5 text-primary/80"/>
              Key Insights
            </h3>
            <div className="space-y-2">
              {insights.keyInsights.map((insight, index) => (
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

        {/* Priority Recommendations */}
        {insights.recommendations && insights.recommendations.length > 0 && (
          <div className="p-4 rounded-md bg-background border">
            <h3 className="font-semibold text-md mb-2 flex items-center">
              <Zap className="mr-2 h-5 w-5 text-primary/80"/>
              Priority Recommendations
            </h3>
            <div className="space-y-3">
              {insights.recommendations.slice(0, 5).map((rec, index) => (
                <div key={index} className="flex items-start gap-2 p-3 border rounded">
                  <Badge 
                    className={`text-xs ${getPriorityColor(rec.priority)}`}
                  >
                    {rec.priority}
                  </Badge>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{rec.action}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>Impact: {rec.estimatedImpact}</span>
                      <span>•</span>
                      <span>Timeframe: {rec.timeframe}</span>
                      <span>•</span>
                      <span>Difficulty: {rec.difficultyLevel}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Steps */}
        {insights.nextSteps && insights.nextSteps.length > 0 && (
          <div className="p-4 rounded-md bg-green-50 border border-green-200">
            <h3 className="font-semibold text-md mb-2 flex items-center text-green-800">
              <CheckCircle className="mr-2 h-5 w-5"/>
              Immediate Next Steps
            </h3>
            <ol className="space-y-1">
              {insights.nextSteps.map((step, index) => (
                <li key={index} className="text-sm text-green-700 flex items-start gap-2">
                  <span className="font-bold text-green-600">{index + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Analysis Timestamp */}
        <div className="text-center text-xs text-muted-foreground border-t pt-4">
          Enhanced AI analysis completed • Powered by comprehensive business intelligence
        </div>
      </CardContent>
    </Card>
  );
}