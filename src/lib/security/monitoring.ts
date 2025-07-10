/**
 * Security Monitoring and Alerting System
 * Real-time monitoring of security events and automated response
 */

import { prisma } from "@/lib/prisma";
import type { User } from "@/types";

// Security event types
export type SecurityEventType =
  | 'RATE_LIMIT_EXCEEDED'
  | 'DDOS_ATTACK_DETECTED'
  | 'SUSPICIOUS_LOGIN'
  | 'MULTIPLE_FAILED_LOGINS'
  | 'UNAUTHORIZED_ACCESS_ATTEMPT'
  | 'SUSPICIOUS_USER_AGENT'
  | 'GEOGRAPHIC_ANOMALY'
  | 'PAYLOAD_ANOMALY'
  | 'AUTOMATED_BEHAVIOR'
  | 'IP_REPUTATION_DECLINE'
  | 'BRUTE_FORCE_ATTACK'
  | 'SQL_INJECTION_ATTEMPT'
  | 'XSS_ATTEMPT'
  | 'DIRECTORY_TRAVERSAL'
  | 'PRIVILEGE_ESCALATION';

export interface SecurityEvent {
  id?: string;
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: 'rate_limiter' | 'ddos_protection' | 'auth_system' | 'middleware' | 'manual';
  ip: string;
  userAgent?: string;
  userId?: number;
  endpoint?: string;
  description: string;
  metadata: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: number;
  actionTaken?: string;
}

export interface SecurityAlert {
  id?: string;
  eventId: string;
  alertType: 'email' | 'webhook' | 'dashboard' | 'sms';
  recipient: string;
  sent: boolean;
  sentAt?: Date;
  error?: string;
}

/**
 * Security Event Monitor
 */
export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private eventBuffer: SecurityEvent[] = [];
  private alertThresholds = new Map<SecurityEventType, {
    count: number;
    timeWindow: number; // minutes
    severity: SecurityEvent['severity'];
  }>();

  static getInstance(): SecurityMonitor {
    if (!this.instance) {
      this.instance = new SecurityMonitor();
    }
    return this.instance;
  }

  constructor() {
    this.setupDefaultThresholds();
    this.startPeriodicTasks();
  }

  /**
   * Setup default alert thresholds
   */
  private setupDefaultThresholds(): void {
    this.alertThresholds.set('RATE_LIMIT_EXCEEDED', {
      count: 10,
      timeWindow: 5,
      severity: 'medium'
    });

    this.alertThresholds.set('DDOS_ATTACK_DETECTED', {
      count: 1,
      timeWindow: 1,
      severity: 'critical'
    });

    this.alertThresholds.set('MULTIPLE_FAILED_LOGINS', {
      count: 5,
      timeWindow: 15,
      severity: 'high'
    });

    this.alertThresholds.set('UNAUTHORIZED_ACCESS_ATTEMPT', {
      count: 3,
      timeWindow: 10,
      severity: 'high'
    });

    this.alertThresholds.set('BRUTE_FORCE_ATTACK', {
      count: 1,
      timeWindow: 1,
      severity: 'critical'
    });

    this.alertThresholds.set('SQL_INJECTION_ATTEMPT', {
      count: 1,
      timeWindow: 1,
      severity: 'critical'
    });
  }

  /**
   * Record a security event
   */
  async recordEvent(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved'>): Promise<string> {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date(),
      resolved: false
    };

    // Add to buffer for immediate processing
    this.eventBuffer.push(securityEvent);

    try {
      // Store in database
      const stored = await prisma.securityEvent.create({
        data: {
          type: securityEvent.type,
          severity: securityEvent.severity,
          source: securityEvent.source,
          ip: securityEvent.ip,
          userAgent: securityEvent.userAgent,
          userId: securityEvent.userId,
          endpoint: securityEvent.endpoint,
          description: securityEvent.description,
          metadata: securityEvent.metadata,
          resolved: false
        }
      });

      securityEvent.id = stored.id.toString();

      // Check if this triggers an alert
      await this.checkAlertThresholds(securityEvent);

      return stored.id.toString();

    } catch (error) {
      console.error('Failed to store security event:', error);
      return `buffer_${Date.now()}`;
    }
  }

  /**
   * Check if event triggers alert thresholds
   */
  private async checkAlertThresholds(event: SecurityEvent): Promise<void> {
    const threshold = this.alertThresholds.get(event.type);
    if (!threshold) return;

    // Count similar events in the time window
    const timeWindow = new Date(Date.now() - threshold.timeWindow * 60 * 1000);
    
    try {
      const recentEvents = await prisma.securityEvent.count({
        where: {
          type: event.type,
          ip: event.ip,
          timestamp: {
            gte: timeWindow
          }
        }
      });

      if (recentEvents >= threshold.count) {
        await this.triggerAlert(event, threshold, recentEvents);
      }

    } catch (error) {
      console.error('Failed to check alert thresholds:', error);
    }
  }

  /**
   * Trigger security alert
   */
  private async triggerAlert(
    event: SecurityEvent, 
    threshold: any, 
    eventCount: number
  ): Promise<void> {
    const alertMessage = `Security Alert: ${event.type} detected from IP ${event.ip}. ` +
                        `${eventCount} events in ${threshold.timeWindow} minutes. ` +
                        `Severity: ${event.severity.toUpperCase()}`;

    console.warn('🚨 SECURITY ALERT:', alertMessage);

    // Store alert in database
    try {
      if (event.id) {
        await prisma.securityAlert.create({
          data: {
            eventId: event.id,
            alertType: 'dashboard',
            recipient: 'security_team',
            sent: true,
            sentAt: new Date()
          }
        });
      }

      // Send notifications (implement based on your notification system)
      await this.sendNotifications(event, alertMessage);

      // Take automated action if configured
      await this.takeAutomatedAction(event, eventCount);

    } catch (error) {
      console.error('Failed to process security alert:', error);
    }
  }

  /**
   * Send security notifications
   */
  private async sendNotifications(event: SecurityEvent, message: string): Promise<void> {
    // Dashboard notification (real-time)
    if (typeof window !== 'undefined' && (window as any).securityNotifications) {
      (window as any).securityNotifications.push({
        type: 'security',
        severity: event.severity,
        message,
        timestamp: new Date()
      });
    }

    // Email notification for high/critical events
    if (event.severity === 'high' || event.severity === 'critical') {
      // Implement email notification
      console.log('📧 Email notification would be sent:', message);
    }

    // Webhook notification for critical events
    if (event.severity === 'critical') {
      // Implement webhook notification
      console.log('🔗 Webhook notification would be sent:', message);
    }
  }

  /**
   * Take automated security actions
   */
  private async takeAutomatedAction(event: SecurityEvent, eventCount: number): Promise<void> {
    switch (event.type) {
      case 'DDOS_ATTACK_DETECTED':
      case 'BRUTE_FORCE_ATTACK':
        // Temporarily block IP
        await this.blockIP(event.ip, 60); // Block for 1 hour
        break;

      case 'MULTIPLE_FAILED_LOGINS':
        if (eventCount >= 10) {
          // Block IP for failed login attempts
          await this.blockIP(event.ip, 30); // Block for 30 minutes
        }
        break;

      case 'SQL_INJECTION_ATTEMPT':
      case 'XSS_ATTEMPT':
        // Immediately block malicious IPs
        await this.blockIP(event.ip, 1440); // Block for 24 hours
        break;

      case 'RATE_LIMIT_EXCEEDED':
        if (eventCount >= 20) {
          // Temporary rate limit increase
          await this.temporaryRateLimitIncrease(event.ip, 10); // Stricter limits for 10 minutes
        }
        break;

      default:
        // No automated action for this event type
        break;
    }
  }

  /**
   * Block an IP address
   */
  private async blockIP(ip: string, durationMinutes: number): Promise<void> {
    try {
      const blockUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
      
      await prisma.blockedIP.upsert({
        where: { ip },
        update: {
          blockUntil,
          reason: 'Automated security block',
          updatedAt: new Date()
        },
        create: {
          ip,
          blockUntil,
          reason: 'Automated security block',
          blockedBy: 'security_system'
        }
      });

      console.log(`🚫 IP ${ip} blocked until ${blockUntil.toISOString()}`);

    } catch (error) {
      console.error('Failed to block IP:', error);
    }
  }

  /**
   * Apply temporary stricter rate limits
   */
  private async temporaryRateLimitIncrease(ip: string, durationMinutes: number): Promise<void> {
    // This would integrate with the rate limiting system
    console.log(`⚡ Applying stricter rate limits to IP ${ip} for ${durationMinutes} minutes`);
  }

  /**
   * Get security dashboard data
   */
  async getSecurityDashboard(timeRange: 'hour' | 'day' | 'week' = 'day'): Promise<{
    totalEvents: number;
    eventsByType: Record<SecurityEventType, number>;
    eventsBySeverity: Record<string, number>;
    topIPs: Array<{ ip: string; count: number; severity: string }>;
    recentAlerts: Array<{ type: string; severity: string; timestamp: Date; ip: string }>;
    activeBlocks: Array<{ ip: string; blockUntil: Date; reason: string }>;
  }> {
    const timeRanges = {
      hour: new Date(Date.now() - 60 * 60 * 1000),
      day: new Date(Date.now() - 24 * 60 * 60 * 1000),
      week: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    };

    const since = timeRanges[timeRange];

    try {
      // Get events from database
      const events = await prisma.securityEvent.findMany({
        where: {
          timestamp: { gte: since }
        },
        orderBy: { timestamp: 'desc' }
      });

      // Get active IP blocks
      const activeBlocks = await prisma.blockedIP.findMany({
        where: {
          blockUntil: { gt: new Date() }
        }
      });

      // Process data
      const eventsByType: Record<string, number> = {};
      const eventsBySeverity: Record<string, number> = {};
      const ipCounts: Record<string, { count: number; severity: string }> = {};

      events.forEach(event => {
        eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
        eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
        
        if (!ipCounts[event.ip]) {
          ipCounts[event.ip] = { count: 0, severity: event.severity };
        }
        ipCounts[event.ip].count++;
        
        // Keep the highest severity
        if (this.getSeverityWeight(event.severity) > this.getSeverityWeight(ipCounts[event.ip].severity)) {
          ipCounts[event.ip].severity = event.severity;
        }
      });

      const topIPs = Object.entries(ipCounts)
        .map(([ip, data]) => ({ ip, count: data.count, severity: data.severity }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const recentAlerts = events
        .filter(e => e.severity === 'high' || e.severity === 'critical')
        .slice(0, 20)
        .map(e => ({
          type: e.type,
          severity: e.severity,
          timestamp: e.timestamp,
          ip: e.ip
        }));

      return {
        totalEvents: events.length,
        eventsByType: eventsByType as Record<SecurityEventType, number>,
        eventsBySeverity,
        topIPs,
        recentAlerts,
        activeBlocks: activeBlocks.map(block => ({
          ip: block.ip,
          blockUntil: block.blockUntil,
          reason: block.reason || 'Unknown'
        }))
      };

    } catch (error) {
      console.error('Failed to get security dashboard data:', error);
      return {
        totalEvents: 0,
        eventsByType: {} as Record<SecurityEventType, number>,
        eventsBySeverity: {},
        topIPs: [],
        recentAlerts: [],
        activeBlocks: []
      };
    }
  }

  /**
   * Get severity weight for comparison
   */
  private getSeverityWeight(severity: string): number {
    const weights = { low: 1, medium: 2, high: 3, critical: 4 };
    return weights[severity as keyof typeof weights] || 0;
  }

  /**
   * Start periodic maintenance tasks
   */
  private startPeriodicTasks(): void {
    // Clean up old events every hour
    setInterval(async () => {
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        await prisma.securityEvent.deleteMany({
          where: {
            timestamp: { lt: thirtyDaysAgo },
            resolved: true
          }
        });

        // Clean up expired IP blocks
        await prisma.blockedIP.deleteMany({
          where: {
            blockUntil: { lt: new Date() }
          }
        });

      } catch (error) {
        console.error('Failed to clean up old security data:', error);
      }
    }, 60 * 60 * 1000); // Every hour

    // Process event buffer every 30 seconds
    setInterval(() => {
      if (this.eventBuffer.length > 100) {
        this.eventBuffer = this.eventBuffer.slice(-50); // Keep only last 50 events
      }
    }, 30 * 1000);
  }

  /**
   * Resolve a security event
   */
  async resolveEvent(eventId: string, resolvedBy: number, action?: string): Promise<void> {
    try {
      await prisma.securityEvent.update({
        where: { id: parseInt(eventId) },
        data: {
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy,
          actionTaken: action
        }
      });

    } catch (error) {
      console.error('Failed to resolve security event:', error);
    }
  }

  /**
   * Manually block/unblock IP
   */
  async manuallyBlockIP(ip: string, durationMinutes: number, reason: string, blockedBy: number): Promise<void> {
    const blockUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
    
    await prisma.blockedIP.upsert({
      where: { ip },
      update: {
        blockUntil,
        reason,
        blockedBy: blockedBy.toString(),
        updatedAt: new Date()
      },
      create: {
        ip,
        blockUntil,
        reason,
        blockedBy: blockedBy.toString()
      }
    });
  }

  async unblockIP(ip: string): Promise<void> {
    await prisma.blockedIP.delete({
      where: { ip }
    });
  }
}

// Export singleton instance
export const securityMonitor = SecurityMonitor.getInstance();

// Convenience functions for recording common events
export const SecurityEvents = {
  rateLimitExceeded: (ip: string, endpoint: string, userAgent?: string) =>
    securityMonitor.recordEvent({
      type: 'RATE_LIMIT_EXCEEDED',
      severity: 'medium',
      source: 'rate_limiter',
      ip,
      userAgent,
      endpoint,
      description: `Rate limit exceeded for endpoint ${endpoint}`,
      metadata: { endpoint, userAgent }
    }),

  ddosDetected: (ip: string, reason: string, confidence: number) =>
    securityMonitor.recordEvent({
      type: 'DDOS_ATTACK_DETECTED',
      severity: 'critical',
      source: 'ddos_protection',
      ip,
      description: `DDoS attack detected: ${reason}`,
      metadata: { reason, confidence }
    }),

  suspiciousLogin: (ip: string, userId: number, reason: string) =>
    securityMonitor.recordEvent({
      type: 'SUSPICIOUS_LOGIN',
      severity: 'high',
      source: 'auth_system',
      ip,
      userId,
      description: `Suspicious login attempt: ${reason}`,
      metadata: { reason }
    }),

  maliciousRequest: (ip: string, endpoint: string, attackType: string, payload?: string) =>
    securityMonitor.recordEvent({
      type: attackType.includes('sql') ? 'SQL_INJECTION_ATTEMPT' : 
            attackType.includes('xss') ? 'XSS_ATTEMPT' : 
            'PAYLOAD_ANOMALY',
      severity: 'critical',
      source: 'middleware',
      ip,
      endpoint,
      description: `${attackType} attempt detected on ${endpoint}`,
      metadata: { attackType, payload: payload?.substring(0, 500) }
    })
};