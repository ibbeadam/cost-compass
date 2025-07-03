"use client";

import { useEffect, useCallback } from 'react';
import { useCostAdvisor } from './useCostAdvisor';
import type { DateRange } from 'react-day-picker';

interface UseAutomaticCostAnalysisProps {
  selectedOutletId: string;
  dateRange: DateRange | undefined;
  dashboardData: any;
  onAnalysisComplete?: (insights: any) => void;
  onAnalysisError?: (error: string) => void;
  autoTrigger?: boolean;
}

export function useAutomaticCostAnalysis({
  selectedOutletId,
  dateRange,
  dashboardData,
  onAnalysisComplete,
  onAnalysisError,
  autoTrigger = true
}: UseAutomaticCostAnalysisProps) {
  
  const {
    isAnalyzing,
    lastAnalysis,
    error,
    runQuickAnalysis,
    runEnhancedAnalysisWithData,
    clearAnalysis
  } = useCostAdvisor({
    autoNotify: true,
    smartNotificationConfig: {
      enableAlerts: true,
      enableInsights: true,
      enableRecommendations: true,
      minAlertLevel: 'low',
      maxNotificationsPerSession: 6
    },
    onAnalysisComplete: onAnalysisComplete,
    onError: (err) => onAnalysisError?.(err.message)
  });

  // Function to trigger analysis based on current data
  const triggerAnalysis = useCallback(async () => {
    if (!dashboardData?.summaryStats || !dateRange?.from || !dateRange?.to) {
      return;
    }

    const { summaryStats } = dashboardData;
    
    // Check if we have sufficient data for analysis
    if (summaryStats.totalFoodRevenue <= 0 && summaryStats.totalBeverageRevenue <= 0) {
      onAnalysisError?.("Insufficient revenue data for cost analysis");
      return;
    }

    try {
      // For single outlet, use enhanced analysis with real data integration
      if (selectedOutletId && selectedOutletId !== "all") {
        await runEnhancedAnalysisWithData(
          selectedOutletId,
          dateRange.from,
          dateRange.to,
          {
            totalFoodRevenue: summaryStats.totalFoodRevenue,
            budgetFoodCostPct: 28, // Default budget - this could be made configurable
            actualFoodCostPct: summaryStats.avgFoodCostPct,
            totalBeverageRevenue: summaryStats.totalBeverageRevenue,
            budgetBeverageCostPct: 20, // Default budget - this could be made configurable
            actualBeverageCostPct: summaryStats.avgBeverageCostPct,
          },
          {
            // Add dynamic business context
            specialEvents: [],
            marketConditions: "Normal market conditions",
            staffingLevel: "normal"
          },
          // Use outlet name from the data if available
          `Outlet Analysis`
        );
      } else {
        // For "all outlets" view, use basic analysis
        const numberOfDays = Math.ceil(
          (dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;

        const enhancedInput = {
          numberOfDays,
          totalFoodRevenue: summaryStats.totalFoodRevenue,
          budgetFoodCostPct: 28, // Default budget
          actualFoodCostPct: summaryStats.avgFoodCostPct,
          totalBeverageRevenue: summaryStats.totalBeverageRevenue,
          budgetBeverageCostPct: 20, // Default budget
          actualBeverageCostPct: summaryStats.avgBeverageCostPct,
          
          // Add comprehensive context for multi-outlet analysis
          businessContext: {
            season: getCurrentSeason(),
            dayOfWeek: getCurrentDayOfWeek(),
            specialEvents: [],
            marketConditions: "Normal market conditions",
            staffingLevel: "normal"
          },
          
          // Add sample historical data for demonstration
          historicalData: generateSampleHistoricalData(numberOfDays, summaryStats),
          
          outlet: {
            name: "All Outlets Combined",
            type: "restaurant" as const,
            capacity: undefined,
            location: "Multiple locations"
          }
        };

        await runQuickAnalysis(enhancedInput, "All Outlets");
      }
    } catch (error) {
      console.error("Automatic cost analysis failed:", error);
      onAnalysisError?.(error instanceof Error ? error.message : "Analysis failed");
    }
  }, [
    selectedOutletId, 
    dateRange, 
    dashboardData, 
    runQuickAnalysis, 
    runEnhancedAnalysisWithData,
    onAnalysisError
  ]);

  // Auto-trigger analysis when dependencies change
  useEffect(() => {
    if (autoTrigger && dashboardData) {
      const timer = setTimeout(() => {
        triggerAnalysis();
      }, 1000); // Small delay to ensure dashboard data is fully loaded
      
      return () => clearTimeout(timer);
    }
  }, [autoTrigger, triggerAnalysis, dashboardData]);

  return {
    isAnalyzing,
    lastAnalysis,
    error,
    triggerAnalysis,
    clearAnalysis
  };
}

// Helper function to get current season
function getCurrentSeason(): "spring" | "summer" | "fall" | "winter" {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "fall";
  return "winter";
}

// Helper function to get current day of week
function getCurrentDayOfWeek(): "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday" {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[new Date().getDay()] as any;
}

// Helper function to generate sample historical data for all outlets view
function generateSampleHistoricalData(numberOfDays: number, summaryStats: any) {
  const data = [];
  const baseDate = new Date();
  
  for (let i = Math.min(numberOfDays, 14); i >= 0; i--) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - i);
    
    // Generate realistic variations around current stats
    const foodVariation = (Math.random() - 0.5) * 4; // ±2%
    const beverageVariation = (Math.random() - 0.5) * 3; // ±1.5%
    
    data.push({
      date: date.toISOString().split('T')[0],
      foodRevenue: summaryStats.totalFoodRevenue / numberOfDays + (Math.random() - 0.5) * 200,
      foodCostPct: Math.max(0, summaryStats.avgFoodCostPct + foodVariation),
      beverageRevenue: summaryStats.totalBeverageRevenue / numberOfDays + (Math.random() - 0.5) * 100,
      beverageCostPct: Math.max(0, summaryStats.avgBeverageCostPct + beverageVariation),
    });
  }
  
  return data;
}