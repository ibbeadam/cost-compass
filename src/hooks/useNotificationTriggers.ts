"use client";

import { useEffect, useCallback } from 'react';
import { useNotifications, createCostAlert, createReminder, createBusinessInsight, createSystemNotification } from '@/contexts/NotificationContext';

interface CostData {
  totalCost: number;
  categoryBreakdown: Record<string, number>;
  date: Date;
  outlet: string;
}

interface BudgetThresholds {
  daily: number;
  weekly: number;
  monthly: number;
  categoryLimits: Record<string, number>;
}

export function useNotificationTriggers() {
  const { addNotification, preferences } = useNotifications();

  // Cost Alert Triggers
  const checkCostThresholds = useCallback((costData: CostData, thresholds: BudgetThresholds) => {
    if (!preferences.costThresholds) return;

    // Daily cost threshold
    if (costData.totalCost > thresholds.daily) {
      addNotification(createCostAlert(
        'Daily Budget Exceeded',
        `Today's costs ($${costData.totalCost.toFixed(2)}) have exceeded your daily budget of $${thresholds.daily.toFixed(2)} at ${costData.outlet}.`,
        { 
          costAmount: costData.totalCost, 
          threshold: thresholds.daily,
          outlet: costData.outlet,
          date: costData.date 
        }
      ));
    }

    // Category-specific alerts
    Object.entries(costData.categoryBreakdown).forEach(([category, cost]) => {
      const limit = thresholds.categoryLimits[category];
      if (limit && cost > limit) {
        addNotification(createCostAlert(
          `${category} Budget Alert`,
          `${category} costs ($${cost.toFixed(2)}) have exceeded the limit of $${limit.toFixed(2)} at ${costData.outlet}.`,
          { 
            category, 
            costAmount: cost, 
            threshold: limit,
            outlet: costData.outlet 
          }
        ));
      }
    });
  }, [addNotification, preferences.costThresholds]);

  // Cost trend analysis
  const checkCostTrends = useCallback((historicalData: CostData[], currentData: CostData) => {
    if (!preferences.businessInsights || historicalData.length < 7) return;

    const recentAverage = historicalData.slice(-7).reduce((sum, data) => sum + data.totalCost, 0) / 7;
    const increasePercentage = ((currentData.totalCost - recentAverage) / recentAverage) * 100;

    if (increasePercentage > 20) {
      addNotification(createBusinessInsight(
        'Unusual Cost Increase Detected',
        `Today's costs are ${increasePercentage.toFixed(1)}% higher than your 7-day average. This may require attention.`,
        { 
          currentCost: currentData.totalCost,
          averageCost: recentAverage,
          increasePercentage,
          outlet: currentData.outlet
        }
      ));
    }
  }, [addNotification, preferences.businessInsights]);

  // Missing data reminders
  const checkMissingEntries = useCallback((lastEntryDate: Date) => {
    if (!preferences.alerts) return;

    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - lastEntryDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff >= 1) {
      addNotification(createReminder(
        'Missing Daily Entry',
        `You haven't entered cost data for ${daysDiff} day${daysDiff > 1 ? 's' : ''}. Keep your records up to date!`,
        '/dashboard/food-cost-input'
      ));
    }
  }, [addNotification, preferences.alerts]);

  // Profit margin warnings
  const checkProfitMargins = useCallback((revenue: number, costs: number, outlet: string) => {
    if (!preferences.businessInsights) return;

    const margin = ((revenue - costs) / revenue) * 100;
    
    if (margin < 15) { // Assuming 15% is minimum acceptable margin
      addNotification(createCostAlert(
        'Low Profit Margin Alert',
        `Profit margin at ${outlet} has dropped to ${margin.toFixed(1)}%. Consider reviewing costs or pricing.`,
        { 
          margin,
          revenue,
          costs,
          outlet,
          type: 'margin-warning'
        }
      ));
    }
  }, [addNotification, preferences.businessInsights]);

  // Weekly/Monthly summary notifications
  const sendPeriodicSummary = useCallback((period: 'weekly' | 'monthly', summary: any) => {
    if (!preferences.dailyReports) return;

    const title = period === 'weekly' ? 'Weekly Cost Summary' : 'Monthly Cost Summary';
    const message = `Your ${period} cost report is ready. Total spent: $${summary.totalCost.toFixed(2)} across ${summary.outlets} outlets.`;

    addNotification(createBusinessInsight(
      title,
      message,
      { 
        period,
        totalCost: summary.totalCost,
        outlets: summary.outlets,
        avgDaily: summary.avgDaily
      }
    ));
  }, [addNotification, preferences.dailyReports]);

  // System notifications
  const sendSystemNotification = useCallback((type: 'backup' | 'update' | 'maintenance', details?: any) => {
    if (!preferences.systemUpdates) return;

    switch (type) {
      case 'backup':
        addNotification(createSystemNotification(
          'Backup Reminder',
          'It\'s been a while since your last backup. Consider backing up your data to keep it safe.',
          'info'
        ));
        break;
      case 'update':
        addNotification(createSystemNotification(
          'System Update Available',
          'A new version of Cost Compass is available with improved features and bug fixes.',
          'info'
        ));
        break;
      case 'maintenance':
        addNotification(createSystemNotification(
          'Scheduled Maintenance',
          `System maintenance is scheduled for ${details?.date}. Data may be temporarily unavailable.`,
          'warning'
        ));
        break;
    }
  }, [addNotification, preferences.systemUpdates]);

  // Welcome notification for new users
  const sendWelcomeNotification = useCallback(() => {
    addNotification(createSystemNotification(
      'Welcome to Cost Compass!',
      'Start by entering your daily food and beverage costs to track your business expenses effectively.',
      'success'
    ));
  }, [addNotification]);

  return {
    checkCostThresholds,
    checkCostTrends,
    checkMissingEntries,
    checkProfitMargins,
    sendPeriodicSummary,
    sendSystemNotification,
    sendWelcomeNotification,
  };
}

// Hook for automatic periodic checks
export function useAutomaticNotifications() {
  const triggers = useNotificationTriggers();

  useEffect(() => {
    // Check for missing entries daily
    const checkMissingEntriesDaily = () => {
      const lastEntry = localStorage.getItem('lastCostEntry');
      if (lastEntry) {
        triggers.checkMissingEntries(new Date(lastEntry));
      }
    };

    // Set up daily check at 6 PM
    const now = new Date();
    const sixPM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0);
    const msUntilSixPM = sixPM.getTime() - now.getTime();
    
    if (msUntilSixPM > 0) {
      const timeout = setTimeout(() => {
        checkMissingEntriesDaily();
        // Then set up daily interval
        setInterval(checkMissingEntriesDaily, 24 * 60 * 60 * 1000);
      }, msUntilSixPM);

      return () => clearTimeout(timeout);
    } else {
      // If it's already past 6 PM today, set up for tomorrow
      const interval = setInterval(checkMissingEntriesDaily, 24 * 60 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [triggers]);

  useEffect(() => {
    // Weekly backup reminder (every Sunday at 9 AM)
    const checkBackupReminder = () => {
      const lastBackup = localStorage.getItem('lastBackup');
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      if (!lastBackup || new Date(lastBackup) < oneWeekAgo) {
        triggers.sendSystemNotification('backup');
      }
    };

    const now = new Date();
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7);
    nextSunday.setHours(9, 0, 0, 0);
    
    const msUntilNextSunday = nextSunday.getTime() - now.getTime();
    
    const timeout = setTimeout(() => {
      checkBackupReminder();
      setInterval(checkBackupReminder, 7 * 24 * 60 * 60 * 1000);
    }, msUntilNextSunday);

    return () => clearTimeout(timeout);
  }, [triggers]);

  return triggers;
}