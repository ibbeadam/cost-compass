/**
 * Real-time Security Monitoring System
 * Detects suspicious activities, security violations, and provides real-time alerts
 */

import { prisma } from "@/lib/prisma";
import { SessionManager } from "@/lib/session/enhanced-session-manager";
import { PermissionCache } from "@/lib/cache/permission-cache";

export interface SecurityThreat {
  id: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  type: SecurityThreatType;
  description: string;
  userId?: number;
  propertyId?: number;
  details: any;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: number;
}

export type SecurityThreatType = 
  | 'brute_force_attack'
  | 'suspicious_login'
  | 'permission_escalation'
  | 'data_breach_attempt'
  | 'unusual_activity_pattern'
  | 'multiple_device_access'
  | 'privilege_abuse'
  | 'unauthorized_api_access'
  | 'session_hijacking'
  | 'cache_poisoning'
  | 'rate_limit_violation'
  | 'cross_property_access'
  | 'admin_action_anomaly';

export interface SecurityMetrics {
  totalThreats: number;
  activeThreatsByLevel: Record<string, number>;
  threatsByType: Record<SecurityThreatType, number>;
  averageResolutionTime: number;
  topTargetedUsers: Array<{ userId: number; threatCount: number; userName?: string }>;
  topTargetedProperties: Array<{ propertyId: number; threatCount: number; propertyName?: string }>;
  recentActivity: SecurityThreat[];
}

export interface SecurityAlert {
  id: string;
  threatId: string;
  alertLevel: 'info' | 'warning' | 'error' | 'critical';
  recipients: number[]; // User IDs to notify
  channels: Array<'email' | 'push' | 'sms' | 'dashboard'>;
  sent: boolean;
  sentAt?: Date;
  message: string;
  actionRequired?: string;
}

/**
 * Security Monitoring Service
 */
export class SecurityMonitor {
  private static readonly THREAT_THRESHOLDS = {
    LOGIN_ATTEMPTS: 5,
    API_RATE_LIMIT: 100,
    CROSS_PROPERTY_ATTEMPTS: 3,
    PERMISSION_CHECKS_PER_MINUTE: 50,
    CONCURRENT_SESSIONS: 10,
    FAILED_PERMISSIONS_PER_HOUR: 20
  };

  private static readonly MONITORING_INTERVALS = {
    REAL_TIME: 30 * 1000, // 30 seconds
    SHORT_TERM: 5 * 60 * 1000, // 5 minutes
    MEDIUM_TERM: 30 * 60 * 1000, // 30 minutes
    LONG_TERM: 24 * 60 * 60 * 1000 // 24 hours
  };

  // In-memory threat tracking
  private static activeThreats = new Map<string, SecurityThreat>();
  private static alertHistory = new Map<string, SecurityAlert>();

  /**
   * Start real-time security monitoring
   */
  static startMonitoring(): void {
    console.log('🔒 Security monitoring started');
    
    // Real-time monitoring
    setInterval(async () => {
      await this.performRealTimeChecks();
    }, this.MONITORING_INTERVALS.REAL_TIME);

    // Short-term pattern analysis
    setInterval(async () => {
      await this.performShortTermAnalysis();
    }, this.MONITORING_INTERVALS.SHORT_TERM);

    // Medium-term trend analysis
    setInterval(async () => {
      await this.performMediumTermAnalysis();
    }, this.MONITORING_INTERVALS.MEDIUM_TERM);

    // Daily security reports
    setInterval(async () => {
      await this.generateDailySecurityReport();
    }, this.MONITORING_INTERVALS.LONG_TERM);
  }

  /**
   * Real-time security checks (every 30 seconds)
   */
  private static async performRealTimeChecks(): Promise<void> {
    try {
      await Promise.all([
        this.checkBruteForceAttacks(),
        this.checkSuspiciousLogins(),
        this.checkUnauthorizedApiAccess(),
        this.checkSessionAnomalies()
      ]);
    } catch (error) {
      console.error('Real-time security check error:', error);
    }
  }

  /**
   * Short-term pattern analysis (every 5 minutes)
   */
  private static async performShortTermAnalysis(): Promise<void> {
    try {
      await Promise.all([
        this.checkPermissionEscalation(),
        this.checkUnusualActivityPatterns(),
        this.checkCrossPropertyAccess(),
        this.checkRateLimitViolations()
      ]);
    } catch (error) {
      console.error('Short-term security analysis error:', error);
    }
  }

  /**
   * Medium-term trend analysis (every 30 minutes)
   */
  private static async performMediumTermAnalysis(): Promise<void> {
    try {
      await Promise.all([
        this.checkPrivilegeAbuse(),
        this.checkDataBreachAttempts(),
        this.checkAdminActionAnomalies(),
        this.analyzeThreatTrends()
      ]);
    } catch (error) {
      console.error('Medium-term security analysis error:', error);
    }
  }

  /**
   * Check for brute force attacks
   */
  private static async checkBruteForceAttacks(): Promise<void> {
    const since = new Date(Date.now() - 15 * 60 * 1000); // Last 15 minutes

    const failedLogins = await prisma.auditLog.groupBy({
      by: ['details'],
      where: {
        action: 'LOGIN_FAILED',
        timestamp: { gte: since }
      },
      _count: { id: true },
      having: {
        id: { _count: { gte: this.THREAT_THRESHOLDS.LOGIN_ATTEMPTS } }
      }
    });

    for (const loginGroup of failedLogins) {
      const details = loginGroup.details as any;
      const ip = details?.ip || 'unknown';
      
      await this.createThreat({
        level: 'high',
        type: 'brute_force_attack',
        description: `Brute force attack detected from IP: ${ip}`,
        details: {
          ip,
          attemptCount: loginGroup._count.id,
          timeWindow: '15 minutes'
        }
      });
    }
  }

  /**
   * Check for suspicious login patterns
   */
  private static async checkSuspiciousLogins(): Promise<void> {
    const since = new Date(Date.now() - 60 * 60 * 1000); // Last hour

    // Check for logins from multiple countries/IPs for same user
    const suspiciousLogins = await prisma.auditLog.findMany({
      where: {
        action: 'LOGIN_SUCCESS',
        timestamp: { gte: since }
      },
      select: {
        userId: true,
        details: true,
        timestamp: true
      }
    });

    const userLoginMap = new Map<number, Array<{ ip: string; timestamp: Date }>>();
    
    suspiciousLogins.forEach(login => {
      const details = login.details as any;
      const ip = details?.deviceInfo?.ip || 'unknown';
      
      if (!userLoginMap.has(login.userId)) {
        userLoginMap.set(login.userId, []);
      }
      
      userLoginMap.get(login.userId)!.push({
        ip,
        timestamp: login.timestamp
      });
    });

    for (const [userId, logins] of userLoginMap) {
      const uniqueIPs = new Set(logins.map(l => l.ip));
      
      if (uniqueIPs.size >= 3) { // 3+ different IPs in an hour
        await this.createThreat({
          level: 'medium',
          type: 'suspicious_login',
          description: `User logged in from ${uniqueIPs.size} different IPs within an hour`,
          userId,
          details: {
            ipAddresses: Array.from(uniqueIPs),
            loginCount: logins.length,
            timeWindow: '1 hour'
          }
        });
      }
    }
  }

  /**
   * Check for permission escalation attempts
   */
  private static async checkPermissionEscalation(): Promise<void> {
    const since = new Date(Date.now() - 5 * 60 * 1000); // Last 5 minutes

    const escalationAttempts = await prisma.auditLog.findMany({
      where: {
        action: { in: ['PERMISSION_ACCESS_DENIED', 'ROLE_ACCESS_DENIED'] },
        timestamp: { gte: since }
      },
      select: {
        userId: true,
        details: true
      }
    });

    const userAttempts = new Map<number, number>();
    
    escalationAttempts.forEach(attempt => {
      const count = userAttempts.get(attempt.userId) || 0;
      userAttempts.set(attempt.userId, count + 1);
    });

    for (const [userId, attemptCount] of userAttempts) {
      if (attemptCount >= this.THREAT_THRESHOLDS.FAILED_PERMISSIONS_PER_HOUR / 12) { // Scaled for 5 minutes
        await this.createThreat({
          level: 'high',
          type: 'permission_escalation',
          description: `User attempting to access restricted resources repeatedly`,
          userId,
          details: {
            attemptCount,
            timeWindow: '5 minutes'
          }
        });
      }
    }
  }

  /**
   * Check for unauthorized API access
   */
  private static async checkUnauthorizedApiAccess(): Promise<void> {
    const since = new Date(Date.now() - 30 * 1000); // Last 30 seconds

    const unauthorizedAccess = await prisma.auditLog.findMany({
      where: {
        action: { contains: 'DENIED' },
        resource: 'api_request',
        timestamp: { gte: since }
      },
      select: {
        userId: true,
        details: true
      }
    });

    if (unauthorizedAccess.length > 10) { // More than 10 denied API requests in 30 seconds
      await this.createThreat({
        level: 'medium',
        type: 'unauthorized_api_access',
        description: `High volume of unauthorized API access attempts`,
        details: {
          attemptCount: unauthorizedAccess.length,
          timeWindow: '30 seconds',
          affectedUsers: [...new Set(unauthorizedAccess.map(a => a.userId))]
        }
      });
    }
  }

  /**
   * Check for session anomalies
   */
  private static async checkSessionAnomalies(): Promise<void> {
    const stats = await SessionManager.getSessionStats('1h');
    
    if (stats.suspiciousActivity > 5) {
      await this.createThreat({
        level: 'medium',
        type: 'session_hijacking',
        description: `Multiple suspicious session activities detected`,
        details: {
          suspiciousCount: stats.suspiciousActivity,
          totalSessions: stats.totalSessions,
          timeWindow: '1 hour'
        }
      });
    }
  }

  /**
   * Check for cross-property access violations
   */
  private static async checkCrossPropertyAccess(): Promise<void> {
    const since = new Date(Date.now() - 5 * 60 * 1000); // Last 5 minutes

    const accessDenied = await prisma.auditLog.findMany({
      where: {
        action: 'PROPERTY_ACCESS_DENIED',
        timestamp: { gte: since }
      },
      select: {
        userId: true,
        propertyId: true
      }
    });

    const userPropertyAttempts = new Map<number, Set<number>>();
    
    accessDenied.forEach(attempt => {
      if (!userPropertyAttempts.has(attempt.userId)) {
        userPropertyAttempts.set(attempt.userId, new Set());
      }
      if (attempt.propertyId) {
        userPropertyAttempts.get(attempt.userId)!.add(attempt.propertyId);
      }
    });

    for (const [userId, properties] of userPropertyAttempts) {
      if (properties.size >= this.THREAT_THRESHOLDS.CROSS_PROPERTY_ATTEMPTS) {
        await this.createThreat({
          level: 'high',
          type: 'cross_property_access',
          description: `User attempting to access multiple unauthorized properties`,
          userId,
          details: {
            attemptedProperties: Array.from(properties),
            propertyCount: properties.size,
            timeWindow: '5 minutes'
          }
        });
      }
    }
  }

  /**
   * Check for rate limit violations
   */
  private static async checkRateLimitViolations(): Promise<void> {
    const since = new Date(Date.now() - 5 * 60 * 1000); // Last 5 minutes

    const rateLimitViolations = await prisma.auditLog.findMany({
      where: {
        action: 'RATE_LIMIT_EXCEEDED',
        timestamp: { gte: since }
      },
      select: {
        userId: true,
        details: true
      }
    });

    const userViolations = new Map<number, number>();
    
    rateLimitViolations.forEach(violation => {
      const count = userViolations.get(violation.userId) || 0;
      userViolations.set(violation.userId, count + 1);
    });

    for (const [userId, violationCount] of userViolations) {
      if (violationCount >= 3) { // 3+ rate limit violations in 5 minutes
        await this.createThreat({
          level: 'medium',
          type: 'rate_limit_violation',
          description: `User repeatedly exceeding rate limits`,
          userId,
          details: {
            violationCount,
            timeWindow: '5 minutes'
          }
        });
      }
    }
  }

  /**
   * Check for privilege abuse
   */
  private static async checkPrivilegeAbuse(): Promise<void> {
    const since = new Date(Date.now() - 30 * 60 * 1000); // Last 30 minutes

    // Check for admins performing unusual actions
    const adminActions = await prisma.auditLog.findMany({
      where: {
        timestamp: { gte: since },
        user: {
          role: { in: ['super_admin', 'property_admin'] }
        }
      },
      include: {
        user: { select: { role: true, name: true } }
      }
    });

    // Analyze admin behavior patterns
    const adminActivityMap = new Map<number, Array<{ action: string; timestamp: Date }>>();
    
    adminActions.forEach(action => {
      if (!adminActivityMap.has(action.userId)) {
        adminActivityMap.set(action.userId, []);
      }
      adminActivityMap.get(action.userId)!.push({
        action: action.action,
        timestamp: action.timestamp
      });
    });

    for (const [userId, activities] of adminActivityMap) {
      // Check for unusual bulk operations
      const bulkOperations = activities.filter(a => 
        a.action.includes('DELETE') || 
        a.action.includes('CREATE') ||
        a.action.includes('UPDATE')
      );

      if (bulkOperations.length > 20) { // More than 20 modifications in 30 minutes
        await this.createThreat({
          level: 'high',
          type: 'privilege_abuse',
          description: `Administrator performing unusual bulk operations`,
          userId,
          details: {
            operationCount: bulkOperations.length,
            operationTypes: [...new Set(bulkOperations.map(o => o.action))],
            timeWindow: '30 minutes'
          }
        });
      }
    }
  }

  /**
   * Check for data breach attempts
   */
  private static async checkDataBreachAttempts(): Promise<void> {
    const since = new Date(Date.now() - 30 * 60 * 1000); // Last 30 minutes

    // Look for patterns indicating data extraction attempts
    const dataAccess = await prisma.auditLog.findMany({
      where: {
        action: { in: ['VIEW_DATA', 'EXPORT_DATA', 'DOWNLOAD_DATA'] },
        timestamp: { gte: since }
      },
      select: {
        userId: true,
        details: true
      }
    });

    const userDataAccess = new Map<number, number>();
    
    dataAccess.forEach(access => {
      const count = userDataAccess.get(access.userId) || 0;
      userDataAccess.set(access.userId, count + 1);
    });

    for (const [userId, accessCount] of userDataAccess) {
      if (accessCount > 100) { // More than 100 data access operations in 30 minutes
        await this.createThreat({
          level: 'critical',
          type: 'data_breach_attempt',
          description: `User performing excessive data access operations`,
          userId,
          details: {
            accessCount,
            timeWindow: '30 minutes'
          }
        });
      }
    }
  }

  /**
   * Check for admin action anomalies
   */
  private static async checkAdminActionAnomalies(): Promise<void> {
    const since = new Date(Date.now() - 30 * 60 * 1000); // Last 30 minutes
    const baseline = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

    // Get current admin activity
    const currentActivity = await prisma.auditLog.count({
      where: {
        timestamp: { gte: since },
        user: { role: { in: ['super_admin', 'property_admin'] } }
      }
    });

    // Get baseline admin activity (average per 30-min period over last 7 days)
    const baselineActivity = await prisma.auditLog.count({
      where: {
        timestamp: { gte: baseline, lt: since },
        user: { role: { in: ['super_admin', 'property_admin'] } }
      }
    });

    const baselineAverage = baselineActivity / (7 * 24 * 2); // 30-min periods in 7 days
    
    if (currentActivity > baselineAverage * 3) { // 3x higher than baseline
      await this.createThreat({
        level: 'medium',
        type: 'admin_action_anomaly',
        description: `Unusually high admin activity detected`,
        details: {
          currentActivity,
          baselineAverage: Math.round(baselineAverage),
          multiplier: Math.round(currentActivity / baselineAverage),
          timeWindow: '30 minutes'
        }
      });
    }
  }

  /**
   * Analyze threat trends
   */
  private static async analyzeThreatTrends(): Promise<void> {
    const activeThreatsArray = Array.from(this.activeThreats.values());
    
    // Check for escalating threat patterns
    const criticalThreats = activeThreatsArray.filter(t => t.level === 'critical');
    const highThreats = activeThreatsArray.filter(t => t.level === 'high');
    
    if (criticalThreats.length > 0 || highThreats.length > 5) {
      await this.sendSecurityAlert({
        alertLevel: 'critical',
        recipients: await this.getSecurityTeam(),
        channels: ['email', 'push', 'dashboard'],
        message: `Security alert: ${criticalThreats.length} critical and ${highThreats.length} high-level threats detected`,
        actionRequired: 'Immediate security review required'
      });
    }
  }

  /**
   * Generate daily security report
   */
  private static async generateDailySecurityReport(): Promise<void> {
    const metrics = await this.getSecurityMetrics('24h');
    
    // Log daily security summary
    await prisma.auditLog.create({
      data: {
        userId: 0, // System user
        action: 'DAILY_SECURITY_REPORT',
        resource: 'security',
        resourceId: new Date().toISOString().split('T')[0],
        details: metrics
      }
    });

    // Send summary to security team if there are concerns
    if (metrics.totalThreats > 10 || metrics.activeThreatsByLevel.critical > 0) {
      await this.sendSecurityAlert({
        alertLevel: 'warning',
        recipients: await this.getSecurityTeam(),
        channels: ['email', 'dashboard'],
        message: `Daily security report: ${metrics.totalThreats} threats detected`,
        actionRequired: 'Review daily security metrics'
      });
    }
  }

  /**
   * Create a new security threat
   */
  private static async createThreat(threat: Omit<SecurityThreat, 'id' | 'timestamp' | 'resolved'>): Promise<SecurityThreat> {
    const newThreat: SecurityThreat = {
      ...threat,
      id: `threat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false
    };

    // Store in memory for quick access
    this.activeThreats.set(newThreat.id, newThreat);

    // Persist to database
    await prisma.auditLog.create({
      data: {
        userId: threat.userId || 0,
        propertyId: threat.propertyId,
        action: 'SECURITY_THREAT_DETECTED',
        resource: 'security',
        resourceId: newThreat.id,
        details: newThreat
      }
    });

    // Send alerts for high/critical threats
    if (threat.level === 'high' || threat.level === 'critical') {
      await this.sendThreatAlert(newThreat);
    }

    console.log(`🚨 Security threat detected: ${threat.type} - ${threat.level}`);
    
    return newThreat;
  }

  /**
   * Send threat-specific alert
   */
  private static async sendThreatAlert(threat: SecurityThreat): Promise<void> {
    const alertLevel = threat.level === 'critical' ? 'critical' : 'error';
    const recipients = await this.getSecurityTeam();

    await this.sendSecurityAlert({
      alertLevel,
      recipients,
      channels: threat.level === 'critical' ? ['email', 'push', 'sms'] : ['email', 'push'],
      message: `Security threat: ${threat.description}`,
      actionRequired: threat.level === 'critical' ? 'IMMEDIATE ACTION REQUIRED' : 'Investigation needed'
    });
  }

  /**
   * Send security alert
   */
  private static async sendSecurityAlert(alert: Omit<SecurityAlert, 'id' | 'threatId' | 'sent' | 'sentAt'>): Promise<void> {
    const securityAlert: SecurityAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      threatId: '', // Can be linked to specific threat
      sent: false
    };

    try {
      // Here you would integrate with your notification system
      // For now, we'll log the alert
      console.log(`🔔 Security Alert [${alert.alertLevel.toUpperCase()}]: ${alert.message}`);
      
      // Store alert history
      this.alertHistory.set(securityAlert.id, { ...securityAlert, sent: true, sentAt: new Date() });

      // Log to database
      await prisma.auditLog.create({
        data: {
          userId: 0,
          action: 'SECURITY_ALERT_SENT',
          resource: 'alert',
          resourceId: securityAlert.id,
          details: securityAlert
        }
      });

    } catch (error) {
      console.error('Error sending security alert:', error);
    }
  }

  /**
   * Get security team member IDs
   */
  private static async getSecurityTeam(): Promise<number[]> {
    const securityTeam = await prisma.user.findMany({
      where: {
        role: { in: ['super_admin'] },
        isActive: true
      },
      select: { id: true }
    });

    return securityTeam.map(user => user.id);
  }

  /**
   * Get security metrics
   */
  static async getSecurityMetrics(timeframe: '1h' | '24h' | '7d' = '24h'): Promise<SecurityMetrics> {
    const timeframeMs = timeframe === '1h' ? 60 * 60 * 1000 :
                       timeframe === '24h' ? 24 * 60 * 60 * 1000 :
                       7 * 24 * 60 * 60 * 1000;

    const since = new Date(Date.now() - timeframeMs);

    // Get threat data from audit logs
    const threats = await prisma.auditLog.findMany({
      where: {
        action: 'SECURITY_THREAT_DETECTED',
        timestamp: { gte: since }
      },
      select: {
        details: true,
        timestamp: true,
        userId: true,
        propertyId: true
      }
    });

    const threatDetails = threats.map(t => t.details as SecurityThreat);
    
    const metrics: SecurityMetrics = {
      totalThreats: threatDetails.length,
      activeThreatsByLevel: {
        low: threatDetails.filter(t => t.level === 'low').length,
        medium: threatDetails.filter(t => t.level === 'medium').length,
        high: threatDetails.filter(t => t.level === 'high').length,
        critical: threatDetails.filter(t => t.level === 'critical').length
      },
      threatsByType: {} as Record<SecurityThreatType, number>,
      averageResolutionTime: 0, // Would calculate from resolved threats
      topTargetedUsers: [],
      topTargetedProperties: [],
      recentActivity: threatDetails.slice(-10)
    };

    // Count threats by type
    threatDetails.forEach(threat => {
      metrics.threatsByType[threat.type] = (metrics.threatsByType[threat.type] || 0) + 1;
    });

    // Calculate top targeted users
    const userThreatCounts = new Map<number, number>();
    threats.forEach(threat => {
      if (threat.userId) {
        userThreatCounts.set(threat.userId, (userThreatCounts.get(threat.userId) || 0) + 1);
      }
    });

    metrics.topTargetedUsers = Array.from(userThreatCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, threatCount]) => ({ userId, threatCount }));

    // Calculate top targeted properties
    const propertyThreatCounts = new Map<number, number>();
    threats.forEach(threat => {
      if (threat.propertyId) {
        propertyThreatCounts.set(threat.propertyId, (propertyThreatCounts.get(threat.propertyId) || 0) + 1);
      }
    });

    metrics.topTargetedProperties = Array.from(propertyThreatCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([propertyId, threatCount]) => ({ propertyId, threatCount }));

    return metrics;
  }

  /**
   * Resolve a security threat
   */
  static async resolveThreat(threatId: string, resolvedBy: number, resolution: string): Promise<boolean> {
    try {
      const threat = this.activeThreats.get(threatId);
      if (!threat) return false;

      // Update threat
      threat.resolved = true;
      threat.resolvedAt = new Date();
      threat.resolvedBy = resolvedBy;

      // Log resolution
      await prisma.auditLog.create({
        data: {
          userId: resolvedBy,
          action: 'SECURITY_THREAT_RESOLVED',
          resource: 'security',
          resourceId: threatId,
          details: {
            threatId,
            resolution,
            resolvedAt: threat.resolvedAt
          }
        }
      });

      // Remove from active threats
      this.activeThreats.delete(threatId);

      return true;
    } catch (error) {
      console.error('Error resolving threat:', error);
      return false;
    }
  }

  /**
   * Get active threats
   */
  static getActiveThreats(): SecurityThreat[] {
    return Array.from(this.activeThreats.values());
  }

  /**
   * Get alert history
   */
  static getAlertHistory(): SecurityAlert[] {
    return Array.from(this.alertHistory.values());
  }
}