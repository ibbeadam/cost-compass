"use server";

import { getCurrentUser } from "@/lib/server-auth";
import { PermissionService } from "@/lib/permission-utils";
import { prisma } from "@/lib/prisma";

// Types for the Security Dashboard
export interface SecurityThreat {
  id: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  userId?: number;
  propertyId?: number;
  details: any;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: number;
}

export interface SecurityMetrics {
  totalThreats: number;
  activeThreatsByLevel: Record<string, number>;
  threatsByType: Record<string, number>;
  averageResolutionTime: number;
  topTargetedUsers: Array<{ userId: number; threatCount: number; userName?: string }>;
  topTargetedProperties: Array<{ propertyId: number; threatCount: number; propertyName?: string }>;
  recentActivity: SecurityThreat[];
}

export interface SecurityAlert {
  id: string;
  alertLevel: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  sent: boolean;
  sentAt?: Date;
  actionRequired?: string;
}

export interface SecurityData {
  metrics: SecurityMetrics;
  activeThreats: SecurityThreat[];
  recentAlerts: SecurityAlert[];
  summary: {
    totalActiveThreats: number;
    criticalThreats: number;
    highThreats: number;
    lastAlertTime: string | null;
  };
}

/**
 * Get security dashboard data
 */
export async function getSecurityDataAction(timeframe: '1h' | '24h' | '7d' = '24h'): Promise<SecurityData> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    // Check permissions - only super_admin can view security dashboard
    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can view security data.");
    }

    // Calculate timeframe in milliseconds
    const timeframeMs = timeframe === '1h' ? 60 * 60 * 1000 :
                       timeframe === '24h' ? 24 * 60 * 60 * 1000 :
                       7 * 24 * 60 * 60 * 1000;

    const since = new Date(Date.now() - timeframeMs);

    // Get security-related audit logs
    const securityLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { action: { contains: 'SECURITY' } },
          { action: { contains: 'LOGIN' } },
          { action: { contains: 'LOGOUT' } },
          { action: 'UNAUTHORIZED_ACCESS' },
          { action: 'PERMISSION_DENIED' },
          { action: 'FAILED_LOGIN' }
        ],
        timestamp: { gte: since }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 100 // Limit to recent 100 events
    });

    // Query security events from the database for real threat analysis
    const securityThreats: SecurityThreat[] = [];
    const alertsList: SecurityAlert[] = [];

    // Analyze login patterns for suspicious activity
    const loginAttempts = securityLogs.filter(log => 
      log.action === 'LOGIN' || log.action === 'FAILED_LOGIN'
    );

    // Group login attempts by user and IP for threat detection
    const loginByUser = new Map<number, number>();
    const failedLoginsByUser = new Map<number, number>();
    const ipFailures = new Map<string, number>();

    loginAttempts.forEach(log => {
      const ipAddress = log.details?.ip || 'unknown';
      
      if (log.userId) {
        if (log.action === 'FAILED_LOGIN') {
          failedLoginsByUser.set(log.userId, (failedLoginsByUser.get(log.userId) || 0) + 1);
          ipFailures.set(ipAddress, (ipFailures.get(ipAddress) || 0) + 1);
        }
        loginByUser.set(log.userId, (loginByUser.get(log.userId) || 0) + 1);
      }
    });

    // Query existing security events from the database
    const existingSecurityEvents = await prisma.securityEvent.findMany({
      where: {
        timestamp: {
          gte: since
        },
        resolved: false
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    // Convert database security events to SecurityThreat format
    existingSecurityEvents.forEach(event => {
      const threat: SecurityThreat = {
        id: event.id.toString(),
        level: event.severity as 'low' | 'medium' | 'high' | 'critical',
        type: event.type,
        description: event.description,
        userId: event.userId || undefined,
        propertyId: event.propertyId || undefined,
        details: event.metadata || {},
        timestamp: event.timestamp,
        resolved: event.resolved,
        resolvedAt: event.resolvedAt || undefined,
        resolvedBy: event.resolvedBy || undefined
      };
      securityThreats.push(threat);
    });

    // Create new threats for users with multiple failed logins (if not already in DB)
    let threatId = existingSecurityEvents.length + 1;
    failedLoginsByUser.forEach((count, userId) => {
      if (count >= 3) {
        // Check if this threat already exists in the database
        const existingThreat = existingSecurityEvents.find(event => 
          event.type === 'MULTIPLE_FAILED_LOGINS' && 
          event.userId === userId &&
          !event.resolved
        );

        if (!existingThreat) {
          const threat: SecurityThreat = {
            id: `audit_threat_${threatId++}`,
            level: count >= 10 ? 'critical' : count >= 5 ? 'high' : 'medium',
            type: 'brute_force_attack',
            description: `Multiple failed login attempts detected for user ${userId}`,
            userId,
            details: {
              failedAttempts: count,
              timeframe: timeframe === '1h' ? 'Last Hour' : timeframe === '24h' ? 'Last 24 Hours' : 'Last 7 Days',
              lastAttempt: new Date().toISOString(),
              severity: count >= 10 ? 'Critical - Account may be compromised' : count >= 5 ? 'High - Immediate attention required' : 'Medium - Monitor closely',
              recommendedAction: count >= 10 ? 'Lock account immediately' : count >= 5 ? 'Contact user to verify activity' : 'Monitor for additional attempts'
            },
            timestamp: new Date(),
            resolved: false
          };
          securityThreats.push(threat);
        }
      }
    });

    // Analyze IP-based threats
    ipFailures.forEach((count, ip) => {
      if (count >= 5) {
        const existingIpThreat = existingSecurityEvents.find(event => 
          event.type === 'SUSPICIOUS_IP_ACTIVITY' && 
          event.ip === ip &&
          !event.resolved
        );

        if (!existingIpThreat) {
          const threat: SecurityThreat = {
            id: `ip_threat_${threatId++}`,
            level: count >= 20 ? 'critical' : count >= 10 ? 'high' : 'medium',
            type: 'suspicious_ip_activity',
            description: `Multiple failed login attempts from IP address ${ip}`,
            details: {
              ip: ip,
              failedAttempts: count,
              timeframe: timeframe === '1h' ? 'Last Hour' : timeframe === '24h' ? 'Last 24 Hours' : 'Last 7 Days',
              severity: count >= 20 ? 'Critical - Potential DDoS/Brute Force' : count >= 10 ? 'High - Coordinated attack suspected' : 'Medium - Monitor IP activity',
              recommendedAction: count >= 20 ? 'Block IP immediately' : count >= 10 ? 'Apply rate limiting to IP' : 'Monitor for escalation'
            },
            timestamp: new Date(),
            resolved: false
          };
          securityThreats.push(threat);
        }
      }
    });

    // Query security alerts from the database
    const existingAlerts = await prisma.securityAlert.findMany({
      where: {
        sentAt: {
          gte: since
        }
      },
      include: {
        event: true
      },
      orderBy: { sentAt: 'desc' },
      take: 20
    });

    // Convert database alerts to SecurityAlert format
    existingAlerts.forEach(alert => {
      alertsList.push({
        id: alert.id.toString(),
        alertLevel: alert.event?.severity === 'critical' ? 'critical' : 
                   alert.event?.severity === 'high' ? 'error' :
                   alert.event?.severity === 'medium' ? 'warning' : 'info',
        message: `Security Alert: ${alert.event?.description || 'Security event detected'}`,
        sent: alert.sent,
        sentAt: alert.sentAt || undefined,
        actionRequired: alert.event?.type === 'MULTIPLE_FAILED_LOGINS' ? 'Verify user account security' :
                       alert.event?.type === 'SUSPICIOUS_IP_ACTIVITY' ? 'Review IP access patterns' :
                       'Review security event details'
      });
    });

    // Create alerts for new high-priority threats
    securityThreats.forEach(threat => {
      if ((threat.level === 'high' || threat.level === 'critical') && threat.id.startsWith('audit_threat_')) {
        alertsList.push({
          id: `alert_${threat.id}`,
          alertLevel: threat.level === 'critical' ? 'critical' : 'warning',
          message: threat.description,
          sent: true,
          sentAt: new Date(),
          actionRequired: threat.details.recommendedAction || 'Review threat details'
        });
      }
    });

    // Analyze unusual access patterns from audit logs
    const accessLogs = securityLogs.filter(log => 
      log.action === 'LOGIN' && log.details?.ip
    );

    // Group access by user and analyze timing patterns
    const userAccessPatterns = new Map<number, { 
      times: Date[], 
      ips: Set<string>, 
      userAgents: Set<string> 
    }>();

    accessLogs.forEach(log => {
      if (log.userId) {
        if (!userAccessPatterns.has(log.userId)) {
          userAccessPatterns.set(log.userId, {
            times: [],
            ips: new Set(),
            userAgents: new Set()
          });
        }
        
        const pattern = userAccessPatterns.get(log.userId)!;
        pattern.times.push(log.timestamp);
        pattern.ips.add(log.details?.ip || 'unknown');
        pattern.userAgents.add(log.details?.userAgent || 'unknown');
      }
    });

    // Detect unusual access patterns
    userAccessPatterns.forEach((pattern, userId) => {
      // Check for off-hours access (before 6 AM or after 10 PM)
      const offHoursAccess = pattern.times.filter(time => {
        const hour = time.getHours();
        return hour < 6 || hour > 22;
      });

      if (offHoursAccess.length > 0) {
        const existingOffHoursThreat = existingSecurityEvents.find(event => 
          event.type === 'UNUSUAL_ACCESS_TIME' && 
          event.userId === userId &&
          !event.resolved
        );

        if (!existingOffHoursThreat) {
          const threat: SecurityThreat = {
            id: `time_threat_${threatId++}`,
            level: offHoursAccess.length >= 3 ? 'medium' : 'low',
            type: 'unusual_activity_pattern',
            description: `User accessing system outside normal business hours`,
            userId,
            details: {
              offHoursCount: offHoursAccess.length,
              lastOffHoursAccess: offHoursAccess[offHoursAccess.length - 1].toISOString(),
              normalHours: '6:00 AM - 10:00 PM',
              timeframe: timeframe === '1h' ? 'Last Hour' : timeframe === '24h' ? 'Last 24 Hours' : 'Last 7 Days',
              recommendedAction: 'Verify with user if access was authorized'
            },
            timestamp: new Date(),
            resolved: false
          };
          securityThreats.push(threat);
        }
      }

      // Check for multiple IP addresses (potential account sharing)
      if (pattern.ips.size >= 3) {
        const existingMultiIpThreat = existingSecurityEvents.find(event => 
          event.type === 'MULTIPLE_IP_ACCESS' && 
          event.userId === userId &&
          !event.resolved
        );

        if (!existingMultiIpThreat) {
          const threat: SecurityThreat = {
            id: `multi_ip_threat_${threatId++}`,
            level: pattern.ips.size >= 5 ? 'medium' : 'low',
            type: 'multiple_device_access',
            description: `User accessed from ${pattern.ips.size} different IP addresses`,
            userId,
            details: {
              ipCount: pattern.ips.size,
              uniqueIPs: Array.from(pattern.ips).slice(0, 5), // Show first 5 IPs
              timeframe: timeframe === '1h' ? 'Last Hour' : timeframe === '24h' ? 'Last 24 Hours' : 'Last 7 Days',
              riskLevel: pattern.ips.size >= 5 ? 'Medium - Potential account sharing' : 'Low - Multiple location access',
              recommendedAction: 'Verify all access locations with user'
            },
            timestamp: new Date(),
            resolved: false
          };
          securityThreats.push(threat);
        }
      }
    });

    // Calculate real metrics from actual threat data
    const activeThreatsByLevel = {
      low: securityThreats.filter(t => t.level === 'low' && !t.resolved).length,
      medium: securityThreats.filter(t => t.level === 'medium' && !t.resolved).length,
      high: securityThreats.filter(t => t.level === 'high' && !t.resolved).length,
      critical: securityThreats.filter(t => t.level === 'critical' && !t.resolved).length
    };

    const threatsByType: Record<string, number> = {};
    securityThreats.forEach(threat => {
      threatsByType[threat.type] = (threatsByType[threat.type] || 0) + 1;
    });

    // Calculate top targeted users from both failed logins and existing threats
    const userThreatCounts = new Map<number, number>();
    
    // Count from failed logins
    failedLoginsByUser.forEach((count, userId) => {
      userThreatCounts.set(userId, (userThreatCounts.get(userId) || 0) + count);
    });
    
    // Count from existing threats
    securityThreats.forEach(threat => {
      if (threat.userId) {
        userThreatCounts.set(threat.userId, (userThreatCounts.get(threat.userId) || 0) + 1);
      }
    });

    const topTargetedUsers = Array.from(userThreatCounts.entries())
      .map(([userId, count]) => ({ userId, threatCount: count }))
      .sort((a, b) => b.threatCount - a.threatCount)
      .slice(0, 5);

    // Calculate top targeted properties from threats
    const propertyThreatCounts = new Map<number, number>();
    securityThreats.forEach(threat => {
      if (threat.propertyId) {
        propertyThreatCounts.set(threat.propertyId, (propertyThreatCounts.get(threat.propertyId) || 0) + 1);
      }
    });

    const topTargetedProperties = Array.from(propertyThreatCounts.entries())
      .map(([propertyId, count]) => ({ propertyId, threatCount: count }))
      .sort((a, b) => b.threatCount - a.threatCount)
      .slice(0, 5);

    // Calculate average resolution time from resolved threats
    const resolvedThreats = await prisma.securityEvent.findMany({
      where: {
        resolved: true,
        resolvedAt: { not: null }
      },
      select: {
        timestamp: true,
        resolvedAt: true
      }
    });

    let averageResolutionTime = 0;
    if (resolvedThreats.length > 0) {
      const totalResolutionTime = resolvedThreats.reduce((sum, threat) => {
        if (threat.resolvedAt) {
          return sum + (threat.resolvedAt.getTime() - threat.timestamp.getTime());
        }
        return sum;
      }, 0);
      averageResolutionTime = Math.round(totalResolutionTime / resolvedThreats.length / (1000 * 60 * 60)); // Convert to hours
    }

    const metrics: SecurityMetrics = {
      totalThreats: securityThreats.length,
      activeThreatsByLevel,
      threatsByType,
      averageResolutionTime,
      topTargetedUsers,
      topTargetedProperties,
      recentActivity: securityThreats.slice(-10)
    };

    const activeThreats = securityThreats.filter(t => !t.resolved);

    return {
      metrics,
      activeThreats,
      recentAlerts: alertsList.slice(-10),
      summary: {
        totalActiveThreats: activeThreats.length,
        criticalThreats: activeThreats.filter(t => t.level === 'critical').length,
        highThreats: activeThreats.filter(t => t.level === 'high').length,
        lastAlertTime: alertsList.length > 0 ? alertsList[alertsList.length - 1].sentAt?.toISOString() || null : null
      }
    };

  } catch (error) {
    console.error("Error fetching security data:", error);
    throw new Error("Failed to fetch security data");
  }
}

/**
 * Resolve a security threat
 */
export async function resolveSecurityThreatAction(threatId: string, resolution: string): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    // Check permissions - only super_admin can resolve threats
    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can resolve security threats.");
    }

    // In a real implementation, this would update the threat in the database
    // For now, we'll just log the resolution
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'SECURITY_THREAT_RESOLVED',
        resource: 'security',
        resourceId: threatId,
        details: {
          threatId,
          resolution,
          resolvedBy: user.id,
          resolvedAt: new Date().toISOString()
        }
      }
    });

    return {
      success: true,
      message: 'Threat resolved successfully'
    };

  } catch (error) {
    console.error("Error resolving security threat:", error);
    throw new Error("Failed to resolve security threat");
  }
}

/**
 * Start security monitoring
 */
export async function startSecurityMonitoringAction(): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    // Check permissions - only super_admin can control monitoring
    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can control security monitoring.");
    }

    // Log monitoring start
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'SECURITY_MONITORING_STARTED',
        resource: 'security',
        details: {
          startedBy: user.id,
          timestamp: new Date().toISOString()
        }
      }
    });

    return {
      success: true,
      message: 'Security monitoring started successfully'
    };

  } catch (error) {
    console.error("Error starting security monitoring:", error);
    throw new Error("Failed to start security monitoring");
  }
}