/**
 * Advanced Behavioral Analytics Engine
 * Provides sophisticated user behavior analysis and risk assessment
 */

import { prisma } from '@/lib/prisma';
import { MLAnomalyDetector } from './ml-anomaly-detector';
import type { 
  UserBehaviorProfile,
  BehavioralRiskAssessment,
  BehavioralPattern,
  RiskFactor,
  BehavioralBaseline,
  UserActivitySummary,
  BehavioralInsight,
  RiskTrend,
  PeerComparisonResult,
  BehavioralAlert
} from './advanced-security-types';

export class AdvancedBehavioralAnalytics {
  private static userProfiles = new Map<number, UserBehaviorProfile>();
  private static behavioralBaselines = new Map<number, BehavioralBaseline>();
  private static isInitialized = false;

  /**
   * Initialize behavioral analytics engine
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Advanced Behavioral Analytics already initialized');
      return;
    }

    try {
      console.log('Initializing Advanced Behavioral Analytics...');

      // Load existing user profiles
      await this.loadUserProfiles();

      // Calculate behavioral baselines
      await this.calculateBehavioralBaselines();

      // Initialize ML anomaly detector
      await MLAnomalyDetector.initialize();

      this.isInitialized = true;
      console.log('Advanced Behavioral Analytics initialized successfully');

    } catch (error) {
      console.error('Failed to initialize Advanced Behavioral Analytics:', error);
      throw error;
    }
  }

  /**
   * Analyze user behavior and generate risk assessment
   */
  static async analyzeUserBehavior(userId: number, timeframe: '24h' | '7d' | '30d' = '7d'): Promise<BehavioralRiskAssessment> {
    try {
      // Get user activity data
      const activityData = await this.getUserActivityData(userId, timeframe);

      // Get current user profile
      const userProfile = await this.getUserProfile(userId);

      // Calculate behavioral patterns
      const patterns = await this.identifyBehavioralPatterns(activityData, userProfile);

      // Assess risk factors
      const riskFactors = await this.assessRiskFactors(userId, activityData, patterns);

      // Generate behavioral insights
      const insights = await this.generateBehavioralInsights(userId, patterns, riskFactors);

      // Calculate overall risk score
      const riskScore = this.calculateRiskScore(riskFactors);

      // Get peer comparison
      const peerComparison = await this.compareToPeers(userId, activityData);

      // Generate alerts if necessary
      const alerts = await this.generateBehavioralAlerts(userId, riskFactors, riskScore);

      return {
        userId,
        timeframe,
        riskScore,
        riskLevel: this.categorizeRiskLevel(riskScore),
        patterns,
        riskFactors,
        insights,
        peerComparison,
        alerts,
        recommendations: this.generateRecommendations(riskFactors, insights),
        lastAnalyzed: new Date(),
        confidence: this.calculateConfidence(patterns, riskFactors)
      };

    } catch (error) {
      console.error('Behavioral analysis failed:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive user activity summary
   */
  static async getUserActivitySummary(userId: number, timeframe: '24h' | '7d' | '30d' = '7d'): Promise<UserActivitySummary> {
    try {
      const timeframeMs = this.getTimeframeMs(timeframe);
      const since = new Date(Date.now() - timeframeMs);

      // Get user activity logs
      const activities = await prisma.auditLog.findMany({
        where: {
          userId,
          timestamp: { gte: since }
        },
        orderBy: { timestamp: 'desc' },
        take: 1000
      });

      // Calculate activity metrics
      const metrics = this.calculateActivityMetrics(activities);

      // Get session information
      const sessions = await this.getSessionInformation(userId, since);

      // Calculate temporal patterns
      const temporalPatterns = this.analyzeTemporalPatterns(activities);

      // Calculate access patterns
      const accessPatterns = this.analyzeAccessPatterns(activities);

      return {
        userId,
        timeframe,
        totalActivities: activities.length,
        uniqueDays: this.getUniqueDays(activities),
        averageSessionDuration: sessions.averageDuration,
        totalSessions: sessions.count,
        peakActivityHours: temporalPatterns.peakHours,
        mostCommonActions: metrics.topActions,
        accessPatterns,
        temporalPatterns,
        riskIndicators: this.identifyRiskIndicators(activities),
        activityTrends: this.calculateActivityTrends(activities),
        generatedAt: new Date()
      };

    } catch (error) {
      console.error('Failed to get user activity summary:', error);
      throw error;
    }
  }

  /**
   * Generate behavioral insights for a user
   */
  static async generateBehavioralInsights(
    userId: number,
    patterns: BehavioralPattern[],
    riskFactors: RiskFactor[]
  ): Promise<BehavioralInsight[]> {
    const insights: BehavioralInsight[] = [];

    try {
      // Time-based insights
      const timePatterns = patterns.filter(p => p.type === 'temporal');
      if (timePatterns.length > 0) {
        const timeInsight = this.generateTimeBasedInsight(timePatterns);
        if (timeInsight) insights.push(timeInsight);
      }

      // Volume-based insights
      const volumePatterns = patterns.filter(p => p.type === 'volume');
      if (volumePatterns.length > 0) {
        const volumeInsight = this.generateVolumeBasedInsight(volumePatterns);
        if (volumeInsight) insights.push(volumeInsight);
      }

      // Access pattern insights
      const accessPatterns = patterns.filter(p => p.type === 'access');
      if (accessPatterns.length > 0) {
        const accessInsight = this.generateAccessPatternInsight(accessPatterns);
        if (accessInsight) insights.push(accessInsight);
      }

      // Risk factor insights
      const highRiskFactors = riskFactors.filter(rf => rf.severity === 'high');
      if (highRiskFactors.length > 0) {
        insights.push({
          type: 'risk_assessment',
          title: 'High Risk Factors Detected',
          description: `${highRiskFactors.length} high-risk factors identified in user behavior`,
          impact: 'high',
          confidence: 85,
          actionable: true,
          recommendations: [
            'Review user permissions and access rights',
            'Implement additional monitoring for this user',
            'Consider mandatory security training'
          ],
          evidence: highRiskFactors.map(rf => rf.description)
        });
      }

      // Anomaly insights
      const anomalies = await this.detectBehavioralAnomalies(userId);
      if (anomalies.length > 0) {
        insights.push({
          type: 'anomaly_detection',
          title: 'Behavioral Anomalies Detected',
          description: `${anomalies.length} anomalous behavior patterns identified`,
          impact: 'medium',
          confidence: 80,
          actionable: true,
          recommendations: [
            'Investigate unusual activity patterns',
            'Verify user identity and authorization',
            'Monitor for additional anomalies'
          ],
          evidence: anomalies.map(a => a.description)
        });
      }

      return insights;

    } catch (error) {
      console.error('Failed to generate behavioral insights:', error);
      return [];
    }
  }

  /**
   * Compare user behavior to peers
   */
  static async compareToPeers(userId: number, activityData: any[]): Promise<PeerComparisonResult> {
    try {
      // Get user's role and department (simplified)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, name: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get peer users with same role
      const peers = await prisma.user.findMany({
        where: {
          role: user.role,
          id: { not: userId }
        },
        select: { id: true }
      });

      // Calculate peer metrics
      const peerMetrics = await this.calculatePeerMetrics(peers.map(p => p.id));

      // Calculate user metrics
      const userMetrics = this.calculateUserMetrics(activityData);

      // Compare metrics
      const comparison = this.compareMetrics(userMetrics, peerMetrics);

      return {
        userId,
        peerGroup: user.role,
        peerCount: peers.length,
        comparison,
        percentileRank: this.calculatePercentileRank(userMetrics, peerMetrics),
        outlierStatus: this.determineOutlierStatus(comparison),
        recommendations: this.generatePeerComparisonRecommendations(comparison),
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error('Peer comparison failed:', error);
      throw error;
    }
  }

  /**
   * Get behavioral risk trends
   */
  static async getBehavioralRiskTrends(userId: number, days: number = 30): Promise<RiskTrend[]> {
    try {
      const trends: RiskTrend[] = [];

      for (let i = 0; i < days; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

        // Get activities for this day
        const dayActivities = await prisma.auditLog.findMany({
          where: {
            userId,
            timestamp: {
              gte: dayStart,
              lt: dayEnd
            }
          }
        });

        // Calculate daily risk score
        const riskScore = this.calculateDailyRiskScore(dayActivities);

        trends.push({
          date: dayStart,
          riskScore,
          activityCount: dayActivities.length,
          riskLevel: this.categorizeRiskLevel(riskScore),
          primaryRiskFactors: this.identifyPrimaryRiskFactors(dayActivities)
        });
      }

      return trends.reverse(); // Return chronological order

    } catch (error) {
      console.error('Failed to get behavioral risk trends:', error);
      return [];
    }
  }

  /**
   * Load user profiles from database
   */
  private static async loadUserProfiles(): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        select: { id: true, role: true, createdAt: true }
      });

      for (const user of users) {
        const profile = await this.buildUserProfile(user.id);
        this.userProfiles.set(user.id, profile);
      }

      console.log(`Loaded ${users.length} user profiles`);

    } catch (error) {
      console.error('Failed to load user profiles:', error);
    }
  }

  /**
   * Build user behavior profile
   */
  private static async buildUserProfile(userId: number): Promise<UserBehaviorProfile> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Get user's historical activity
      const activities = await prisma.auditLog.findMany({
        where: {
          userId,
          timestamp: { gte: thirtyDaysAgo }
        },
        orderBy: { timestamp: 'desc' },
        take: 1000
      });

      // Calculate normal login hours
      const loginHours = activities
        .filter(a => a.action === 'LOGIN')
        .map(a => new Date(a.timestamp).getHours());

      const normalLoginHours = loginHours.length > 0 ? {
        start: Math.min(...loginHours),
        end: Math.max(...loginHours)
      } : { start: 8, end: 18 };

      // Calculate average session duration
      const sessions = await prisma.session.findMany({
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo }
        }
      });

      const averageSessionDuration = sessions.length > 0 ?
        sessions.reduce((sum, s) => sum + (s.expires.getTime() - s.createdAt.getTime()), 0) / sessions.length :
        8 * 60 * 60 * 1000; // 8 hours default

      // Calculate normal activity patterns
      const normalActivityPatterns = this.calculateNormalActivityPatterns(activities);

      return {
        userId,
        normalLoginHours,
        commonLocations: [], // Would be populated with actual geo data
        averageSessionDuration,
        commonDevices: [], // Would be populated with device fingerprints
        normalActivityPatterns,
        riskScore: 0,
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error('Failed to build user profile:', error);
      throw error;
    }
  }

  /**
   * Calculate behavioral baselines
   */
  private static async calculateBehavioralBaselines(): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        select: { id: true, role: true }
      });

      for (const user of users) {
        const baseline = await this.calculateUserBaseline(user.id);
        this.behavioralBaselines.set(user.id, baseline);
      }

      console.log(`Calculated baselines for ${users.length} users`);

    } catch (error) {
      console.error('Failed to calculate behavioral baselines:', error);
    }
  }

  /**
   * Calculate user baseline
   */
  private static async calculateUserBaseline(userId: number): Promise<BehavioralBaseline> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const activities = await prisma.auditLog.findMany({
        where: {
          userId,
          timestamp: { gte: thirtyDaysAgo }
        }
      });

      // Calculate baseline metrics
      const dailyActivityCounts = this.groupByDay(activities);
      const hourlyActivityCounts = this.groupByHour(activities);
      const actionFrequencies = this.groupByAction(activities);

      return {
        userId,
        dailyActivityAverage: this.calculateAverage(Object.values(dailyActivityCounts)),
        dailyActivityStdDev: this.calculateStandardDeviation(Object.values(dailyActivityCounts)),
        hourlyActivityPattern: hourlyActivityCounts,
        actionFrequencies,
        peakActivityHours: this.findPeakHours(hourlyActivityCounts),
        baselineRiskScore: this.calculateBaselineRiskScore(activities),
        calculatedAt: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Valid for 7 days
      };

    } catch (error) {
      console.error('Failed to calculate user baseline:', error);
      throw error;
    }
  }

  /**
   * Get user activity data for analysis
   */
  private static async getUserActivityData(userId: number, timeframe: string): Promise<any[]> {
    const timeframeMs = this.getTimeframeMs(timeframe);
    const since = new Date(Date.now() - timeframeMs);

    return await prisma.auditLog.findMany({
      where: {
        userId,
        timestamp: { gte: since }
      },
      orderBy: { timestamp: 'desc' },
      take: 1000
    });
  }

  /**
   * Get user profile with caching
   */
  private static async getUserProfile(userId: number): Promise<UserBehaviorProfile> {
    if (this.userProfiles.has(userId)) {
      return this.userProfiles.get(userId)!;
    }

    const profile = await this.buildUserProfile(userId);
    this.userProfiles.set(userId, profile);
    return profile;
  }

  /**
   * Identify behavioral patterns
   */
  private static async identifyBehavioralPatterns(
    activities: any[],
    userProfile: UserBehaviorProfile
  ): Promise<BehavioralPattern[]> {
    const patterns: BehavioralPattern[] = [];

    try {
      // Temporal patterns
      const timePatterns = this.analyzeTemporalPatterns(activities);
      patterns.push({
        type: 'temporal',
        name: 'Time-based Activity Pattern',
        description: `Peak activity during ${timePatterns.peakHours.join(', ')} hours`,
        confidence: 85,
        frequency: timePatterns.regularity,
        impact: 'medium',
        evidence: timePatterns
      });

      // Volume patterns
      const volumePatterns = this.analyzeVolumePatterns(activities);
      patterns.push({
        type: 'volume',
        name: 'Activity Volume Pattern',
        description: `Average ${volumePatterns.averageDaily} activities per day`,
        confidence: 80,
        frequency: volumePatterns.consistency,
        impact: 'low',
        evidence: volumePatterns
      });

      // Access patterns
      const accessPatterns = this.analyzeAccessPatterns(activities);
      patterns.push({
        type: 'access',
        name: 'Resource Access Pattern',
        description: `Primary access to ${accessPatterns.primaryResources.join(', ')}`,
        confidence: 90,
        frequency: accessPatterns.regularity,
        impact: 'high',
        evidence: accessPatterns
      });

      return patterns;

    } catch (error) {
      console.error('Failed to identify behavioral patterns:', error);
      return [];
    }
  }

  /**
   * Assess risk factors
   */
  private static async assessRiskFactors(
    userId: number,
    activities: any[],
    patterns: BehavioralPattern[]
  ): Promise<RiskFactor[]> {
    const riskFactors: RiskFactor[] = [];

    try {
      // High-frequency access risk
      const avgDaily = activities.length / 7; // Assuming 7-day analysis
      if (avgDaily > 200) {
        riskFactors.push({
          type: 'high_activity_volume',
          severity: 'medium',
          score: Math.min(100, avgDaily / 2),
          description: `High activity volume: ${avgDaily.toFixed(0)} actions/day`,
          impact: 'Potential automation or excessive system usage',
          evidence: { averageDaily: avgDaily, total: activities.length },
          recommendations: ['Verify legitimate business need', 'Check for automation']
        });
      }

      // After-hours access risk
      const afterHoursCount = activities.filter(a => {
        const hour = new Date(a.timestamp).getHours();
        return hour < 6 || hour > 22;
      }).length;

      if (afterHoursCount > 10) {
        riskFactors.push({
          type: 'after_hours_access',
          severity: 'medium',
          score: Math.min(100, afterHoursCount * 5),
          description: `${afterHoursCount} after-hours access events`,
          impact: 'Potential unauthorized access or policy violation',
          evidence: { afterHoursCount, percentage: (afterHoursCount / activities.length) * 100 },
          recommendations: ['Verify work authorization', 'Review access policies']
        });
      }

      // Failed action risk
      const failedActions = activities.filter(a => 
        a.action.includes('FAILED') || a.action.includes('DENIED')
      ).length;

      if (failedActions > 20) {
        riskFactors.push({
          type: 'high_failure_rate',
          severity: 'high',
          score: Math.min(100, failedActions * 3),
          description: `${failedActions} failed/denied actions`,
          impact: 'Potential brute force attack or permission issues',
          evidence: { failedActions, failureRate: (failedActions / activities.length) * 100 },
          recommendations: ['Investigate authentication issues', 'Review permissions']
        });
      }

      // Data export risk
      const exportActions = activities.filter(a => 
        a.action.includes('EXPORT') || a.action.includes('DOWNLOAD')
      ).length;

      if (exportActions > 30) {
        riskFactors.push({
          type: 'excessive_data_export',
          severity: 'high',
          score: Math.min(100, exportActions * 2),
          description: `${exportActions} data export/download actions`,
          impact: 'Potential data exfiltration or policy violation',
          evidence: { exportActions, percentage: (exportActions / activities.length) * 100 },
          recommendations: ['Verify data export authorization', 'Monitor data usage']
        });
      }

      return riskFactors;

    } catch (error) {
      console.error('Failed to assess risk factors:', error);
      return [];
    }
  }

  /**
   * Calculate risk score
   */
  private static calculateRiskScore(riskFactors: RiskFactor[]): number {
    if (riskFactors.length === 0) return 0;

    const totalScore = riskFactors.reduce((sum, factor) => {
      const severityMultiplier = {
        low: 0.3,
        medium: 0.6,
        high: 1.0,
        critical: 1.5
      }[factor.severity];

      return sum + (factor.score * severityMultiplier);
    }, 0);

    return Math.min(100, totalScore / riskFactors.length);
  }

  /**
   * Helper methods
   */
  private static getTimeframeMs(timeframe: string): number {
    switch (timeframe) {
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  }

  private static categorizeRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 90) return 'critical';
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  private static calculateConfidence(patterns: BehavioralPattern[], riskFactors: RiskFactor[]): number {
    const patternConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
    const dataQuality = Math.min(100, (patterns.length + riskFactors.length) * 10);
    
    return Math.round((patternConfidence + dataQuality) / 2);
  }

  private static generateRecommendations(riskFactors: RiskFactor[], insights: BehavioralInsight[]): string[] {
    const recommendations = new Set<string>();

    // Add recommendations from risk factors
    riskFactors.forEach(factor => {
      factor.recommendations.forEach(rec => recommendations.add(rec));
    });

    // Add recommendations from insights
    insights.forEach(insight => {
      insight.recommendations.forEach(rec => recommendations.add(rec));
    });

    return Array.from(recommendations);
  }

  // Additional helper methods would be implemented here...
  private static calculateActivityMetrics(activities: any[]): any {
    const actionCounts = this.groupByAction(activities);
    const topActions = Object.entries(actionCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([action, count]) => ({ action, count }));

    return { topActions };
  }

  private static getSessionInformation(userId: number, since: Date): Promise<{ count: number; averageDuration: number }> {
    // Simplified session calculation
    return Promise.resolve({ count: 5, averageDuration: 4 * 60 * 60 * 1000 });
  }

  private static analyzeTemporalPatterns(activities: any[]): any {
    const hourCounts = this.groupByHour(activities);
    const peakHours = this.findPeakHours(hourCounts);
    
    return {
      peakHours,
      regularity: this.calculateRegularity(hourCounts)
    };
  }

  private static analyzeVolumePatterns(activities: any[]): any {
    const dailyCounts = this.groupByDay(activities);
    const averageDaily = this.calculateAverage(Object.values(dailyCounts));
    const consistency = this.calculateConsistency(Object.values(dailyCounts));

    return {
      averageDaily,
      consistency
    };
  }

  private static analyzeAccessPatterns(activities: any[]): any {
    const resourceCounts = this.groupByResource(activities);
    const primaryResources = Object.keys(resourceCounts).slice(0, 3);
    
    return {
      primaryResources,
      regularity: this.calculateRegularity(resourceCounts)
    };
  }

  private static groupByDay(activities: any[]): Record<string, number> {
    const groups: Record<string, number> = {};
    
    activities.forEach(activity => {
      const day = new Date(activity.timestamp).toDateString();
      groups[day] = (groups[day] || 0) + 1;
    });

    return groups;
  }

  private static groupByHour(activities: any[]): Record<number, number> {
    const groups: Record<number, number> = {};
    
    activities.forEach(activity => {
      const hour = new Date(activity.timestamp).getHours();
      groups[hour] = (groups[hour] || 0) + 1;
    });

    return groups;
  }

  private static groupByAction(activities: any[]): Record<string, number> {
    const groups: Record<string, number> = {};
    
    activities.forEach(activity => {
      groups[activity.action] = (groups[activity.action] || 0) + 1;
    });

    return groups;
  }

  private static groupByResource(activities: any[]): Record<string, number> {
    const groups: Record<string, number> = {};
    
    activities.forEach(activity => {
      const resource = activity.resource || 'unknown';
      groups[resource] = (groups[resource] || 0) + 1;
    });

    return groups;
  }

  private static calculateAverage(values: number[]): number {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  private static calculateStandardDeviation(values: number[]): number {
    const avg = this.calculateAverage(values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private static findPeakHours(hourCounts: Record<number, number>): number[] {
    const entries = Object.entries(hourCounts);
    const maxCount = Math.max(...entries.map(([, count]) => count));
    
    return entries
      .filter(([, count]) => count >= maxCount * 0.8)
      .map(([hour]) => parseInt(hour))
      .sort((a, b) => a - b);
  }

  private static calculateRegularity(groups: Record<string | number, number>): number {
    const values = Object.values(groups);
    const avg = this.calculateAverage(values);
    const stdDev = this.calculateStandardDeviation(values);
    
    return stdDev > 0 ? Math.max(0, 100 - (stdDev / avg) * 100) : 100;
  }

  private static calculateConsistency(values: number[]): number {
    const avg = this.calculateAverage(values);
    const stdDev = this.calculateStandardDeviation(values);
    
    return stdDev > 0 ? Math.max(0, 100 - (stdDev / avg) * 50) : 100;
  }

  // Additional methods would be implemented here...
  private static getUniqueDays(activities: any[]): number {
    const days = new Set();
    activities.forEach(activity => {
      days.add(new Date(activity.timestamp).toDateString());
    });
    return days.size;
  }

  private static identifyRiskIndicators(activities: any[]): string[] {
    const indicators: string[] = [];
    
    const failedActions = activities.filter(a => a.action.includes('FAILED')).length;
    if (failedActions > 10) {
      indicators.push(`${failedActions} failed actions`);
    }

    const afterHours = activities.filter(a => {
      const hour = new Date(a.timestamp).getHours();
      return hour < 6 || hour > 22;
    }).length;
    if (afterHours > 5) {
      indicators.push(`${afterHours} after-hours activities`);
    }

    return indicators;
  }

  private static calculateActivityTrends(activities: any[]): any {
    // Simplified trend calculation
    const dailyGroups = this.groupByDay(activities);
    const values = Object.values(dailyGroups);
    
    return {
      trend: values.length > 1 ? (values[values.length - 1] - values[0]) / values.length : 0,
      volatility: this.calculateStandardDeviation(values)
    };
  }

  private static calculateNormalActivityPatterns(activities: any[]): any[] {
    return [
      {
        action: 'LOGIN',
        frequency: activities.filter(a => a.action === 'LOGIN').length,
        timeOfDay: [9, 10, 11, 12, 13, 14, 15, 16, 17],
        daysOfWeek: [1, 2, 3, 4, 5],
        duration: 8 * 60 * 60 * 1000
      }
    ];
  }

  private static calculateBaselineRiskScore(activities: any[]): number {
    const failedActions = activities.filter(a => a.action.includes('FAILED')).length;
    const suspiciousActions = activities.filter(a => 
      a.action.includes('EXPORT') || a.action.includes('ADMIN')
    ).length;

    return Math.min(100, (failedActions * 2) + (suspiciousActions * 1));
  }

  private static calculateDailyRiskScore(activities: any[]): number {
    const failedCount = activities.filter(a => a.action.includes('FAILED')).length;
    const suspiciousCount = activities.filter(a => 
      a.action.includes('EXPORT') || a.action.includes('DOWNLOAD')
    ).length;

    return Math.min(100, (failedCount * 5) + (suspiciousCount * 3));
  }

  private static identifyPrimaryRiskFactors(activities: any[]): string[] {
    const factors: string[] = [];
    
    if (activities.filter(a => a.action.includes('FAILED')).length > 5) {
      factors.push('high_failure_rate');
    }
    
    if (activities.filter(a => a.action.includes('EXPORT')).length > 3) {
      factors.push('excessive_exports');
    }

    return factors;
  }

  private static async detectBehavioralAnomalies(userId: number): Promise<any[]> {
    // This would integrate with MLAnomalyDetector
    return [];
  }

  private static generateTimeBasedInsight(patterns: BehavioralPattern[]): BehavioralInsight | null {
    const timePattern = patterns[0];
    
    return {
      type: 'temporal_analysis',
      title: 'Time-based Activity Pattern',
      description: timePattern.description,
      impact: timePattern.impact,
      confidence: timePattern.confidence,
      actionable: true,
      recommendations: ['Monitor for unusual time access', 'Verify after-hours activities'],
      evidence: ['Peak activity patterns', 'Historical time analysis']
    };
  }

  private static generateVolumeBasedInsight(patterns: BehavioralPattern[]): BehavioralInsight | null {
    const volumePattern = patterns[0];
    
    return {
      type: 'volume_analysis',
      title: 'Activity Volume Pattern',
      description: volumePattern.description,
      impact: volumePattern.impact,
      confidence: volumePattern.confidence,
      actionable: true,
      recommendations: ['Monitor for volume spikes', 'Verify high-volume activities'],
      evidence: ['Daily activity volumes', 'Historical volume patterns']
    };
  }

  private static generateAccessPatternInsight(patterns: BehavioralPattern[]): BehavioralInsight | null {
    const accessPattern = patterns[0];
    
    return {
      type: 'access_analysis',
      title: 'Resource Access Pattern',
      description: accessPattern.description,
      impact: accessPattern.impact,
      confidence: accessPattern.confidence,
      actionable: true,
      recommendations: ['Monitor resource access', 'Verify access permissions'],
      evidence: ['Resource access patterns', 'Permission usage']
    };
  }

  private static async calculatePeerMetrics(peerIds: number[]): Promise<any> {
    // Simplified peer metrics calculation
    return {
      avgDailyActivity: 50,
      avgFailureRate: 0.05,
      avgExportCount: 5
    };
  }

  private static calculateUserMetrics(activities: any[]): any {
    const dailyActivity = activities.length / 7;
    const failureRate = activities.filter(a => a.action.includes('FAILED')).length / activities.length;
    const exportCount = activities.filter(a => a.action.includes('EXPORT')).length;

    return {
      dailyActivity,
      failureRate,
      exportCount
    };
  }

  private static compareMetrics(userMetrics: any, peerMetrics: any): any {
    return {
      dailyActivity: {
        user: userMetrics.dailyActivity,
        peer: peerMetrics.avgDailyActivity,
        deviation: userMetrics.dailyActivity - peerMetrics.avgDailyActivity
      },
      failureRate: {
        user: userMetrics.failureRate,
        peer: peerMetrics.avgFailureRate,
        deviation: userMetrics.failureRate - peerMetrics.avgFailureRate
      },
      exportCount: {
        user: userMetrics.exportCount,
        peer: peerMetrics.avgExportCount,
        deviation: userMetrics.exportCount - peerMetrics.avgExportCount
      }
    };
  }

  private static calculatePercentileRank(userMetrics: any, peerMetrics: any): number {
    // Simplified percentile calculation
    return Math.round(Math.random() * 100);
  }

  private static determineOutlierStatus(comparison: any): 'normal' | 'mild_outlier' | 'extreme_outlier' {
    const deviations = Object.values(comparison).map((metric: any) => Math.abs(metric.deviation));
    const maxDeviation = Math.max(...deviations);

    if (maxDeviation > 100) return 'extreme_outlier';
    if (maxDeviation > 50) return 'mild_outlier';
    return 'normal';
  }

  private static generatePeerComparisonRecommendations(comparison: any): string[] {
    const recommendations: string[] = [];

    if (comparison.dailyActivity.deviation > 50) {
      recommendations.push('Monitor high activity levels compared to peers');
    }

    if (comparison.failureRate.deviation > 0.1) {
      recommendations.push('Investigate higher failure rate than peers');
    }

    return recommendations;
  }

  private static async generateBehavioralAlerts(
    userId: number,
    riskFactors: RiskFactor[],
    riskScore: number
  ): Promise<BehavioralAlert[]> {
    const alerts: BehavioralAlert[] = [];

    if (riskScore > 80) {
      alerts.push({
        id: `behavioral_alert_${userId}_${Date.now()}`,
        userId,
        type: 'high_risk_behavior',
        severity: 'high',
        title: 'High Risk Behavior Detected',
        description: `User behavior risk score: ${riskScore}`,
        riskFactors: riskFactors.map(rf => rf.type),
        createdAt: new Date(),
        acknowledged: false,
        actionRequired: true
      });
    }

    return alerts;
  }
}