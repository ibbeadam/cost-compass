
"use client";

import type { DashboardAdvisorOutput } from "@/ai/flows/dashboard-cost-advisor-flow";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Lightbulb, ListChecks, Target, TrendingDown, TrendingUp, Info } from "lucide-react";

interface AIInsightsCardProps {
  isLoading: boolean;
  insights: DashboardAdvisorOutput | null;
  error?: string | null;
}

export function AIInsightsCard({ isLoading, insights, error }: AIInsightsCardProps) {
  if (isLoading) {
    return (
      <Card className="shadow-md bg-card">
        <CardHeader>
          <CardTitle className="font-headline text-lg flex items-center">
            <Lightbulb className="mr-2 h-5 w-5 text-primary animate-pulse" />
            <Skeleton className="h-6 w-48 bg-muted" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-full bg-muted" />
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Skeleton className="h-5 w-1/3 mb-2 bg-muted" />
            <Skeleton className="h-4 w-full mb-1 bg-muted" />
            <Skeleton className="h-4 w-full bg-muted" />
          </div>
          <div>
            <Skeleton className="h-5 w-1/4 mb-2 bg-muted" />
            <Skeleton className="h-4 w-3/4 mb-1 bg-muted" />
            <Skeleton className="h-4 w-3/4 bg-muted" />
          </div>
          <div>
            <Skeleton className="h-5 w-1/3 mb-2 bg-muted" />
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full mb-1 bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-md bg-destructive/10 border-destructive">
        <CardHeader>
          <CardTitle className="font-headline text-lg flex items-center text-destructive">
            <AlertTriangle className="mr-2 h-5 w-5" />
            AI Analysis Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive-foreground/80">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
       <Card className="shadow-md bg-card">
        <CardHeader>
          <CardTitle className="font-headline text-lg flex items-center">
            <Info className="mr-2 h-5 w-5 text-muted-foreground" />
            AI Insights
          </CardTitle>
           <CardDescription>No insights available for the current selection.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">AI analysis will appear here once data is processed for a valid period.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg bg-card border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="font-headline text-xl flex items-center text-primary">
          <Lightbulb className="mr-2 h-6 w-6" />
          AI-Powered Cost Advisor
        </CardTitle>
        <CardDescription>
          Insights and recommendations based on your financial data for the selected period.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-3">
        
        <div className="p-4 rounded-md bg-background border">
          <h3 className="font-semibold text-md mb-2 flex items-center"><Target className="mr-2 h-5 w-5 text-primary/80"/>Daily Spending Guidelines</h3>
          <p className="text-sm text-muted-foreground">{insights.dailySpendingGuidelineFood}</p>
          <p className="text-sm text-muted-foreground">{insights.dailySpendingGuidelineBeverage}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-md bg-background border">
                <h4 className="font-medium text-sm mb-1 flex items-center">
                    {insights.foodCostAnalysis.toLowerCase().includes("over budget") ? <TrendingUp className="mr-1.5 h-4 w-4 text-destructive" /> : <TrendingDown className="mr-1.5 h-4 w-4 text-green-600" />}
                    Food Cost Analysis
                </h4>
                <p className="text-xs text-muted-foreground">{insights.foodCostAnalysis}</p>
            </div>
            <div className="p-3 rounded-md bg-background border">
                 <h4 className="font-medium text-sm mb-1 flex items-center">
                    {insights.beverageCostAnalysis.toLowerCase().includes("over budget") ? <TrendingUp className="mr-1.5 h-4 w-4 text-destructive" /> : <TrendingDown className="mr-1.5 h-4 w-4 text-green-600" />}
                    Beverage Cost Analysis
                </h4>
                <p className="text-xs text-muted-foreground">{insights.beverageCostAnalysis}</p>
            </div>
        </div>
        
        {insights.keyInsights && insights.keyInsights.length > 0 && (
          <div className="p-4 rounded-md bg-background border">
            <h3 className="font-semibold text-md mb-2 flex items-center"><Info className="mr-2 h-5 w-5 text-primary/80"/>Key Insights</h3>
            <ul className="list-disc list-inside space-y-1 pl-2">
              {insights.keyInsights.map((insight, index) => (
                <li key={index} className="text-sm text-muted-foreground">{insight}</li>
              ))}
            </ul>
          </div>
        )}

        {insights.recommendations && insights.recommendations.length > 0 && (
          <div className="p-4 rounded-md bg-background border">
            <h3 className="font-semibold text-md mb-2 flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary/80"/>Recommendations</h3>
            <ul className="list-disc list-inside space-y-1 pl-2">
              {insights.recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-muted-foreground">{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
