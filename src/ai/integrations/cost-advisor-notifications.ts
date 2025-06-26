"use client";

/**
 * Integration between Cost Advisor AI flow and Notification System
 * Automatically generates and triggers notifications based on cost analysis
 */

import { DashboardAdvisorOutput } from '@/ai/flows/dashboard-cost-advisor-flow';
import { 
  createCostAlert, 
  createBusinessInsight, 
  createReminder, 
  createSystemNotification 
} from '@/contexts/NotificationContext';

export interface CostAdvisorNotificationOptions {
  enableAlerts: boolean;
  enableInsights: boolean;
  enableRecommendations: boolean;
  minAlertLevel: 'low' | 'medium' | 'high' | 'critical';
  maxNotificationsPerSession: number;
}

export class CostAdvisorNotificationManager {
  private notificationQueue: any[] = [];
  private sessionNotificationCount = 0;

  constructor(private options: CostAdvisorNotificationOptions) {}

  /**
   * Process cost advisor output and generate appropriate notifications
   */
  async processAdvisorOutput(
    output: DashboardAdvisorOutput,
    outletName: string,
    addNotification: (notification: any) => void
  ): Promise<void> {
    this.notificationQueue = [];
    this.sessionNotificationCount = 0;

    try {
      // 1. Generate alert level notifications
      if (this.shouldTriggerAlert(output.alertLevel)) {
        await this.generateAlertNotifications(output, outletName);
      }

      // 2. Generate insight notifications
      if (this.options.enableInsights) {
        await this.generateInsightNotifications(output, outletName);
      }

      // 3. Generate recommendation notifications
      if (this.options.enableRecommendations) {
        await this.generateRecommendationNotifications(output, outletName);
      }

      // 4. Generate risk assessment notifications
      await this.generateRiskNotifications(output, outletName);

      // 5. Send notifications in order of priority
      await this.sendNotifications(addNotification);

    } catch (error) {
      console.error('Error processing cost advisor notifications:', error);
      
      // Send fallback notification
      addNotification(createSystemNotification(
        'Cost Analysis Notification Error',
        'There was an issue generating cost analysis notifications. Please review your dashboard manually.',
        'warning'
      ));
    }
  }

  private shouldTriggerAlert(alertLevel: string): boolean {
    if (!this.options.enableAlerts) return false;
    
    const alertLevels = ['low', 'medium', 'high', 'critical'];
    const currentLevel = alertLevels.indexOf(alertLevel);
    const minLevel = alertLevels.indexOf(this.options.minAlertLevel);
    
    return currentLevel >= minLevel;
  }

  private async generateAlertNotifications(
    output: DashboardAdvisorOutput, 
    outletName: string
  ): Promise<void> {
    switch (output.alertLevel) {
      case 'critical':
        this.queueNotification(createCostAlert(
          '🚨 Critical Cost Alert',
          `Immediate attention required at ${outletName}. Critical cost variances detected that could severely impact profitability.`,
          { 
            alertLevel: 'critical',
            outlet: outletName,
            overallScore: output.performanceMetrics.overallScore,
            riskLevel: output.riskAssessment.overallRiskLevel
          }
        ), 1); // Highest priority
        break;

      case 'high':
        this.queueNotification(createCostAlert(
          '⚠️ High Priority Cost Alert',
          `Significant cost issues detected at ${outletName}. Review required within 24 hours.`,
          { 
            alertLevel: 'high',
            outlet: outletName,
            budgetCompliance: output.performanceMetrics.budgetCompliance
          }
        ), 2);
        break;

      case 'medium':
        this.queueNotification(createBusinessInsight(
          '📊 Cost Performance Notice',
          `Notable cost variances at ${outletName}. Consider reviewing operations this week.`,
          { 
            alertLevel: 'medium',
            outlet: outletName,
            efficiency: output.performanceMetrics.efficiency
          }
        ), 3);
        break;

      case 'low':
        this.queueNotification(createBusinessInsight(
          '📈 Cost Monitoring Update',
          `Minor cost variances detected at ${outletName}. Monitor trends closely.`,
          { 
            alertLevel: 'low',
            outlet: outletName,
            trendHealth: output.performanceMetrics.trendHealth
          }
        ), 4);
        break;
    }
  }

  private async generateInsightNotifications(
    output: DashboardAdvisorOutput, 
    outletName: string
  ): Promise<void> {
    // Send notifications for high-impact insights only
    const highImpactInsights = output.keyInsights.filter(insight => 
      insight.impact === 'high'
    );

    highImpactInsights.slice(0, 2).forEach((insight, index) => {
      this.queueNotification(createBusinessInsight(
        `💡 Key Insight: ${insight.category.toUpperCase()}`,
        `${insight.insight} at ${outletName}`,
        { 
          category: insight.category,
          impact: insight.impact,
          outlet: outletName
        }
      ), 5 + index);
    });
  }

  private async generateRecommendationNotifications(
    output: DashboardAdvisorOutput, 
    outletName: string
  ): Promise<void> {
    // Send notifications for urgent and high priority recommendations
    const urgentRecommendations = output.recommendations.filter(rec => 
      rec.priority === 'urgent' || rec.priority === 'high'
    );

    urgentRecommendations.slice(0, 2).forEach((recommendation, index) => {
      const title = recommendation.priority === 'urgent' 
        ? `🔥 Urgent Action Required`
        : `⚡ High Priority Recommendation`;
      
      this.queueNotification(createReminder(
        title,
        `${recommendation.action} at ${outletName}. Estimated impact: ${recommendation.estimatedImpact}`,
        '/dashboard/reports', // Link to reports page
        {
          priority: recommendation.priority,
          category: recommendation.category,
          timeframe: recommendation.timeframe,
          outlet: outletName
        }
      ), recommendation.priority === 'urgent' ? 2 : 6 + index);
    });
  }

  private async generateRiskNotifications(
    output: DashboardAdvisorOutput, 
    outletName: string
  ): Promise<void> {
    if (output.riskAssessment.overallRiskLevel === 'critical' || 
        output.riskAssessment.overallRiskLevel === 'high') {
      
      const riskFactors = output.riskAssessment.riskFactors.slice(0, 3).join(', ');
      
      this.queueNotification(createCostAlert(
        `⚠️ Risk Assessment: ${output.riskAssessment.overallRiskLevel.toUpperCase()}`,
        `Risk factors identified at ${outletName}: ${riskFactors}. Immediate review recommended.`,
        {
          riskLevel: output.riskAssessment.overallRiskLevel,
          riskFactors: output.riskAssessment.riskFactors,
          outlet: outletName
        }
      ), output.riskAssessment.overallRiskLevel === 'critical' ? 1 : 3);
    }
  }

  private queueNotification(notification: any, priority: number): void {
    if (this.sessionNotificationCount >= this.options.maxNotificationsPerSession) {
      return;
    }

    this.notificationQueue.push({
      notification,
      priority
    });
  }

  private async sendNotifications(addNotification: (notification: any) => void): Promise<void> {
    // Sort by priority (lower number = higher priority)
    this.notificationQueue.sort((a, b) => a.priority - b.priority);

    // Send notifications with delays to avoid overwhelming the user
    for (let i = 0; i < Math.min(this.notificationQueue.length, this.options.maxNotificationsPerSession); i++) {
      const { notification } = this.notificationQueue[i];
      
      if (i === 0) {
        // Send first notification immediately
        addNotification(notification);
      } else {
        // Delay subsequent notifications by 2-5 seconds
        setTimeout(() => {
          addNotification(notification);
        }, (i + 1) * 2000 + Math.random() * 3000);
      }
      
      this.sessionNotificationCount++;
    }
  }

  /**
   * Generate a summary notification with key metrics
   */
  async generateSummaryNotification(
    output: DashboardAdvisorOutput,
    outletName: string,
    addNotification: (notification: any) => void
  ): Promise<void> {
    const summary = `Performance Score: ${output.performanceMetrics.overallScore}/100 | ` +
                   `Budget Compliance: ${output.performanceMetrics.budgetCompliance.toFixed(0)}% | ` +
                   `Alert Level: ${output.alertLevel.toUpperCase()}`;

    addNotification(createBusinessInsight(
      `📊 Cost Analysis Summary - ${outletName}`,
      summary,
      {
        outlet: outletName,
        performanceMetrics: output.performanceMetrics,
        alertLevel: output.alertLevel
      }
    ));
  }
}

/**
 * Utility function to create a notification manager with default settings
 */
export function createCostAdvisorNotificationManager(
  customOptions?: Partial<CostAdvisorNotificationOptions>
): CostAdvisorNotificationManager {
  const defaultOptions: CostAdvisorNotificationOptions = {
    enableAlerts: true,
    enableInsights: true,
    enableRecommendations: true,
    minAlertLevel: 'medium',
    maxNotificationsPerSession: 5
  };

  return new CostAdvisorNotificationManager({
    ...defaultOptions,
    ...customOptions
  });
}

/**
 * Hook to integrate cost advisor with notification system
 */
export function useCostAdvisorNotifications(
  options?: Partial<CostAdvisorNotificationOptions>
) {
  const manager = createCostAdvisorNotificationManager(options);

  const processAnalysis = async (
    output: DashboardAdvisorOutput,
    outletName: string,
    addNotification: (notification: any) => void
  ) => {
    await manager.processAdvisorOutput(output, outletName, addNotification);
  };

  const sendSummary = async (
    output: DashboardAdvisorOutput,
    outletName: string,
    addNotification: (notification: any) => void
  ) => {
    await manager.generateSummaryNotification(output, outletName, addNotification);
  };

  return {
    processAnalysis,
    sendSummary,
    manager
  };
}