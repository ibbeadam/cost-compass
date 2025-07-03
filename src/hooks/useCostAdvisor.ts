"use client";

/**
 * Hook for integrating Cost Advisor AI with Dashboard Components
 * Provides easy access to cost analysis with automatic notification integration
 */

import { useState, useCallback } from 'react';
import { 
  analyzeDashboardData, 
  DashboardAdvisorInput, 
  DashboardAdvisorOutput 
} from '@/ai/flows/dashboard-cost-advisor-flow';
import { 
  runEnhancedCostAnalysis,
  generateSmartNotifications,
  type SmartNotificationConfig 
} from '@/ai/integrations/enhanced-cost-advisor-integration';
import { 
  createCostAdvisorNotificationManager,
  CostAdvisorNotificationOptions 
} from '@/ai/integrations/cost-advisor-notifications';
import { useNotifications } from '@/contexts/NotificationContext';

export interface UseCostAdvisorOptions {
  autoNotify?: boolean;
  notificationOptions?: Partial<CostAdvisorNotificationOptions>;
  smartNotificationConfig?: SmartNotificationConfig;
  onAnalysisComplete?: (output: DashboardAdvisorOutput) => void;
  onError?: (error: Error) => void;
  useEnhancedAnalysis?: boolean;
}

export interface CostAdvisorState {
  isAnalyzing: boolean;
  lastAnalysis: DashboardAdvisorOutput | null;
  error: string | null;
  analysisTimestamp: Date | null;
}

export function useCostAdvisor(options: UseCostAdvisorOptions = {}) {
  const { addNotification } = useNotifications();
  const [state, setState] = useState<CostAdvisorState>({
    isAnalyzing: false,
    lastAnalysis: null,
    error: null,
    analysisTimestamp: null,
  });

  const notificationManager = createCostAdvisorNotificationManager(
    options.notificationOptions
  );

  /**
   * Run cost analysis with automatic notification integration
   */
  const runAnalysis = useCallback(async (
    input: DashboardAdvisorInput,
    outletName: string = 'Current Outlet'
  ): Promise<DashboardAdvisorOutput | null> => {
    setState(prev => ({
      ...prev,
      isAnalyzing: true,
      error: null
    }));

    try {
      // Run the AI analysis
      const output = await analyzeDashboardData(input);
      
      // Update state with results
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        lastAnalysis: output,
        analysisTimestamp: new Date(),
        error: null
      }));

      // Trigger notifications if enabled
      if (options.autoNotify !== false) {
        // Use smart notifications if configured
        if (options.smartNotificationConfig) {
          const smartNotifications = await generateSmartNotifications(output, options.smartNotificationConfig);
          
          // Convert smart notifications to regular notifications
          smartNotifications.forEach((notification, index) => {
            setTimeout(() => {
              addNotification({
                id: `smart-${Date.now()}-${index}`,
                type: notification.type === 'alert' ? 'warning' : 
                      notification.type === 'insight' ? 'info' : 'default',
                title: notification.title,
                message: notification.message,
                action: notification.action,
                timestamp: Date.now(),
                read: false,
                priority: notification.priority,
                source: 'enhanced-cost-advisor',
                data: { analysis: output, outletName }
              });
            }, index * 1500); // Stagger notifications
          });
        } else {
          // Use legacy notification system
          await notificationManager.processAdvisorOutput(
            output, 
            outletName, 
            addNotification
          );

          // Also send a summary notification for high-level overview
          if (output.alertLevel !== 'none') {
            setTimeout(() => {
              notificationManager.generateSummaryNotification(
                output, 
                outletName, 
                addNotification
              );
            }, 10000); // Send summary after 10 seconds
          }
        }
      }

      // Call completion callback
      options.onAnalysisComplete?.(output);

      return output;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: errorMessage
      }));

      // Call error callback
      options.onError?.(error instanceof Error ? error : new Error(errorMessage));

      return null;
    }
  }, [addNotification, notificationManager, options]);

  /**
   * Run quick analysis with minimal data for dashboard widgets
   */
  const runQuickAnalysis = useCallback(async (
    basicData: {
      numberOfDays: number;
      totalFoodRevenue: number;
      budgetFoodCostPct: number;
      actualFoodCostPct: number;
      totalBeverageRevenue: number;
      budgetBeverageCostPct: number;
      actualBeverageCostPct: number;
    },
    outletName?: string
  ) => {
    return runAnalysis(basicData, outletName);
  }, [runAnalysis]);

  /**
   * Run comprehensive analysis with full data set
   */
  const runComprehensiveAnalysis = useCallback(async (
    fullData: DashboardAdvisorInput,
    outletName?: string
  ) => {
    return runAnalysis(fullData, outletName);
  }, [runAnalysis]);

  /**
   * Run enhanced analysis with real data integration
   */
  const runEnhancedAnalysisWithData = useCallback(async (
    outletId: string,
    startDate: Date,
    endDate: Date,
    currentData: {
      totalFoodRevenue: number,
      budgetFoodCostPct: number,
      actualFoodCostPct: number,
      totalBeverageRevenue: number,
      budgetBeverageCostPct: number,
      actualBeverageCostPct: number
    },
    businessContext?: {
      specialEvents?: string[],
      marketConditions?: string,
      staffingLevel?: "understaffed" | "normal" | "overstaffed"
    },
    outletName?: string
  ): Promise<DashboardAdvisorOutput | null> => {
    setState(prev => ({
      ...prev,
      isAnalyzing: true,
      error: null
    }));

    try {
      // Use the enhanced integration system
      const output = await runEnhancedCostAnalysis(
        outletId,
        startDate,
        endDate,
        currentData,
        businessContext
      );
      
      // Update state with results
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        lastAnalysis: output,
        analysisTimestamp: new Date(),
        error: null
      }));

      // Trigger smart notifications
      if (options.autoNotify !== false && options.smartNotificationConfig) {
        const smartNotifications = await generateSmartNotifications(output, options.smartNotificationConfig);
        
        smartNotifications.forEach((notification, index) => {
          setTimeout(() => {
            addNotification({
              id: `enhanced-${Date.now()}-${index}`,
              type: notification.type === 'alert' ? 'warning' : 
                    notification.type === 'insight' ? 'info' : 'default',
              title: notification.title,
              message: notification.message,
              action: notification.action,
              timestamp: Date.now(),
              read: false,
              priority: notification.priority,
              source: 'enhanced-cost-advisor',
              data: { analysis: output, outletName: outletName || 'Current Outlet' }
            });
          }, index * 2000); // Stagger notifications
        });
      }

      // Call completion callback
      options.onAnalysisComplete?.(output);

      return output;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Enhanced analysis failed';
      
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: errorMessage
      }));

      // Call error callback
      options.onError?.(error instanceof Error ? error : new Error(errorMessage));

      return null;
    }
  }, [addNotification, options]);

  /**
   * Get analysis summary for dashboard display
   */
  const getAnalysisSummary = useCallback(() => {
    if (!state.lastAnalysis) return null;

    return {
      overallScore: state.lastAnalysis.performanceMetrics.overallScore,
      alertLevel: state.lastAnalysis.alertLevel,
      budgetCompliance: state.lastAnalysis.performanceMetrics.budgetCompliance,
      efficiency: state.lastAnalysis.performanceMetrics.efficiency,
      keyInsights: state.lastAnalysis.keyInsights.slice(0, 3),
      urgentRecommendations: state.lastAnalysis.recommendations
        .filter(rec => rec.priority === 'urgent' || rec.priority === 'high')
        .slice(0, 2),
      riskLevel: state.lastAnalysis.riskAssessment.overallRiskLevel,
      analysisTimestamp: state.analysisTimestamp,
    };
  }, [state.lastAnalysis, state.analysisTimestamp]);

  /**
   * Get color coding for UI display based on analysis results
   */
  const getStatusColors = useCallback(() => {
    if (!state.lastAnalysis) return { primary: 'gray', secondary: 'gray' };

    const alertLevel = state.lastAnalysis.alertLevel;
    const overallScore = state.lastAnalysis.performanceMetrics.overallScore;

    switch (alertLevel) {
      case 'critical':
        return { primary: 'red', secondary: 'red' };
      case 'high':
        return { primary: 'orange', secondary: 'orange' };
      case 'medium':
        return { primary: 'yellow', secondary: 'yellow' };
      case 'low':
        return { primary: 'blue', secondary: 'blue' };
      default:
        return overallScore >= 80 
          ? { primary: 'green', secondary: 'green' }
          : { primary: 'gray', secondary: 'gray' };
    }
  }, [state.lastAnalysis]);

  /**
   * Clear current analysis and reset state
   */
  const clearAnalysis = useCallback(() => {
    setState({
      isAnalyzing: false,
      lastAnalysis: null,
      error: null,
      analysisTimestamp: null,
    });
  }, []);

  /**
   * Retry last analysis with same parameters
   */
  const retryAnalysis = useCallback(async () => {
    if (!state.lastAnalysis) return null;
    
    // This would require storing the last input, which we could add if needed
    // For now, return null to indicate retry is not available
    return null;
  }, [state.lastAnalysis]);

  return {
    // State
    ...state,
    
    // Analysis functions
    runAnalysis,
    runQuickAnalysis,
    runComprehensiveAnalysis,
    runEnhancedAnalysisWithData,
    
    // Utility functions
    getAnalysisSummary,
    getStatusColors,
    clearAnalysis,
    retryAnalysis,
    
    // Notification manager access
    notificationManager,
  };
}

/**
 * Utility function to create sample data for testing
 */
export function createSampleAnalysisData(): DashboardAdvisorInput {
  return {
    numberOfDays: 7,
    totalFoodRevenue: 15000,
    budgetFoodCostPct: 28,
    actualFoodCostPct: 32,
    totalBeverageRevenue: 5000,
    budgetBeverageCostPct: 20,
    actualBeverageCostPct: 18,
    
    historicalData: Array.from({ length: 14 }, (_, i) => ({
      date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      foodRevenue: 2000 + Math.random() * 500,
      foodCostPct: 28 + Math.random() * 8 - 4,
      beverageRevenue: 700 + Math.random() * 200,
      beverageCostPct: 20 + Math.random() * 6 - 3,
    })),
    
    businessContext: {
      season: 'summer',
      dayOfWeek: 'friday',
      specialEvents: ['Weekend Special Menu'],
      marketConditions: 'Rising food prices due to seasonal demand',
      staffingLevel: 'normal',
    },
    
    outlet: {
      name: 'Main Restaurant',
      type: 'restaurant',
      capacity: 80,
      location: 'city center',
    },
  };
}