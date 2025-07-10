/**
 * Advanced Threat Detection Engine
 * Implements sophisticated threat detection algorithms and behavioral analytics
 */

import { prisma } from "@/lib/prisma";
import type { 
  SecurityEvent, 
  UserBehaviorProfile, 
  ThreatIntelligence, 
  AdvancedThreatType,
  SecuritySeverity,
  ThreatIndicator,
  MitigationAction,
  SecurityMetrics
} from "./advanced-security-types";

export class AdvancedThreatDetector {
  private static userProfiles = new Map<number, UserBehaviorProfile>();
  private static threatIntelligence = new Map<string, ThreatIntelligence>();
  private static securityEvents: SecurityEvent[] = [];

  /**
   * Analyze security event for potential threats
   */
  static async analyzeSecurityEvent(event: SecurityEvent): Promise<ThreatIntelligence[]> {
    const threats: ThreatIntelligence[] = [];

    // 1. Brute Force Attack Detection
    const bruteForceThreats = await this.detectBruteForceAttacks(event);
    threats.push(...bruteForceThreats);

    // 2. Unusual Access Pattern Detection
    const accessPatternThreats = await this.detectUnusualAccessPatterns(event);
    threats.push(...accessPatternThreats);

    // 3. Financial Data Exfiltration Detection
    const exfiltrationThreats = await this.detectDataExfiltration(event);
    threats.push(...exfiltrationThreats);

    // 4. Property Access Violation Detection
    const propertyViolationThreats = await this.detectPropertyAccessViolations(event);
    threats.push(...propertyViolationThreats);

    // 5. Privilege Escalation Detection
    const privilegeEscalationThreats = await this.detectPrivilegeEscalation(event);
    threats.push(...privilegeEscalationThreats);

    // 6. Session Anomaly Detection
    const sessionAnomalies = await this.detectSessionAnomalies(event);
    threats.push(...sessionAnomalies);

    // Store detected threats
    threats.forEach(threat => {
      this.threatIntelligence.set(threat.threatId, threat);
    });

    return threats;
  }

  /**
   * Detect sophisticated brute force attacks
   */
  private static async detectBruteForceAttacks(event: SecurityEvent): Promise<ThreatIntelligence[]> {
    if (event.eventType !== 'login_failure') return [];

    const timeWindow = 15 * 60 * 1000; // 15 minutes
    const now = new Date();
    const windowStart = new Date(now.getTime() - timeWindow);

    try {
      // Get recent failed login attempts
      const recentFailures = await prisma.auditLog.findMany({
        where: {
          action: 'FAILED_LOGIN',
          timestamp: { gte: windowStart },
          OR: [
            { userId: event.userId },
            { ipAddress: event.ipAddress }
          ]
        },
        orderBy: { timestamp: 'desc' }
      });

      const threats: ThreatIntelligence[] = [];

      // Advanced brute force patterns
      const patterns = [
        { threshold: 10, severity: 'critical' as SecuritySeverity, description: 'Rapid brute force attack' },
        { threshold: 5, severity: 'high' as SecuritySeverity, description: 'Persistent brute force attempt' },
        { threshold: 3, severity: 'medium' as SecuritySeverity, description: 'Potential brute force pattern' }
      ];

      for (const pattern of patterns) {
        if (recentFailures.length >= pattern.threshold) {
          const threatId = `brute_force_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          const threat: ThreatIntelligence = {
            threatId,
            threatType: 'brute_force_advanced',
            riskScore: this.calculateRiskScore(pattern.severity, recentFailures.length),
            confidence: Math.min(95, recentFailures.length * 10),
            indicators: [
              {
                type: 'ip',
                value: event.ipAddress || 'unknown',
                confidence: 90,
                firstSeen: new Date(recentFailures[recentFailures.length - 1].timestamp),
                lastSeen: new Date(recentFailures[0].timestamp),
                occurrences: recentFailures.length
              }
            ],
            mitigation: this.generateMitigationActions(pattern.severity, 'brute_force_advanced'),
            timeline: recentFailures.map(failure => ({
              timestamp: failure.timestamp,
              event: 'Failed login attempt',
              details: failure.details,
              severity: 'medium' as SecuritySeverity
            })),
            affectedResources: [
              `user_${event.userId}`,
              `ip_${event.ipAddress}`
            ],
            status: 'active',
            createdAt: now,
            updatedAt: now
          };

          threats.push(threat);
          break; // Only create one threat per pattern type
        }
      }

      return threats;
    } catch (error) {
      console.error('Error detecting brute force attacks:', error);
      return [];
    }
  }

  /**
   * Detect unusual access patterns using behavioral analytics
   */
  private static async detectUnusualAccessPatterns(event: SecurityEvent): Promise<ThreatIntelligence[]> {
    if (!event.userId || event.eventType !== 'login_success') return [];

    try {
      const userProfile = await this.getUserBehaviorProfile(event.userId);
      const threats: ThreatIntelligence[] = [];

      // Check for unusual time-based access
      const currentHour = new Date().getHours();
      const isOutsideNormalHours = currentHour < userProfile.normalLoginHours.start || 
                                   currentHour > userProfile.normalLoginHours.end;

      if (isOutsideNormalHours) {
        const threatId = `unusual_time_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const threat: ThreatIntelligence = {
          threatId,
          threatType: 'unusual_activity',
          riskScore: this.calculateTimeBasedRiskScore(currentHour, userProfile.normalLoginHours),
          confidence: 75,
          indicators: [
            {
              type: 'behavior',
              value: `access_at_${currentHour}:00`,
              confidence: 80,
              firstSeen: new Date(),
              lastSeen: new Date(),
              occurrences: 1
            }
          ],
          mitigation: [
            {
              action: 'monitor',
              automated: true,
              executed: false,
              details: { reason: 'Unusual time access pattern' }
            },
            {
              action: 'alert',
              automated: true,
              executed: false,
              details: { 
                message: `User ${event.userId} accessed system at ${currentHour}:00, outside normal hours ${userProfile.normalLoginHours.start}:00-${userProfile.normalLoginHours.end}:00`
              }
            }
          ],
          timeline: [{
            timestamp: new Date(),
            event: 'Unusual time access detected',
            details: { 
              accessTime: currentHour,
              normalRange: userProfile.normalLoginHours,
              userId: event.userId
            },
            severity: 'medium'
          }],
          affectedResources: [`user_${event.userId}`],
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        threats.push(threat);
      }

      // Check for unusual location access
      if (event.location && userProfile.commonLocations.length > 0) {
        const isUnusualLocation = !userProfile.commonLocations.some(loc => 
          loc.country === event.location?.country && 
          loc.city === event.location?.city
        );

        if (isUnusualLocation) {
          const threatId = `unusual_location_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          const threat: ThreatIntelligence = {
            threatId,
            threatType: 'unusual_activity',
            riskScore: 60,
            confidence: 70,
            indicators: [
              {
                type: 'behavior',
                value: `location_${event.location.country}_${event.location.city}`,
                confidence: 75,
                firstSeen: new Date(),
                lastSeen: new Date(),
                occurrences: 1
              }
            ],
            mitigation: [
              {
                action: 'require_mfa',
                automated: true,
                executed: false,
                details: { reason: 'Unusual location access' }
              }
            ],
            timeline: [{
              timestamp: new Date(),
              event: 'Unusual location access detected',
              details: { 
                location: event.location,
                userId: event.userId
              },
              severity: 'medium'
            }],
            affectedResources: [`user_${event.userId}`],
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          threats.push(threat);
        }
      }

      return threats;
    } catch (error) {
      console.error('Error detecting unusual access patterns:', error);
      return [];
    }
  }

  /**
   * Detect potential data exfiltration attempts
   */
  private static async detectDataExfiltration(event: SecurityEvent): Promise<ThreatIntelligence[]> {
    if (event.eventType !== 'data_export' && event.eventType !== 'file_download') return [];

    try {
      const timeWindow = 60 * 60 * 1000; // 1 hour
      const now = new Date();
      const windowStart = new Date(now.getTime() - timeWindow);

      // Get recent export/download activities
      const recentExports = await prisma.auditLog.findMany({
        where: {
          userId: event.userId,
          action: { in: ['EXPORT', 'DOWNLOAD'] },
          timestamp: { gte: windowStart }
        },
        orderBy: { timestamp: 'desc' }
      });

      const threats: ThreatIntelligence[] = [];

      // Check for excessive data exports
      if (recentExports.length >= 10) {
        const threatId = `data_exfiltration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const threat: ThreatIntelligence = {
          threatId,
          threatType: 'financial_data_exfiltration',
          riskScore: Math.min(100, recentExports.length * 5),
          confidence: 85,
          indicators: [
            {
              type: 'behavior',
              value: `excessive_exports_${recentExports.length}`,
              confidence: 90,
              firstSeen: new Date(recentExports[recentExports.length - 1].timestamp),
              lastSeen: new Date(recentExports[0].timestamp),
              occurrences: recentExports.length
            }
          ],
          mitigation: [
            {
              action: 'restrict_access',
              automated: true,
              executed: false,
              details: { reason: 'Excessive data export activity' }
            },
            {
              action: 'alert',
              automated: true,
              executed: false,
              details: { 
                message: `User ${event.userId} performed ${recentExports.length} data exports in the last hour`
              }
            }
          ],
          timeline: recentExports.map(exp => ({
            timestamp: exp.timestamp,
            event: 'Data export activity',
            details: exp.details,
            severity: 'medium' as SecuritySeverity
          })),
          affectedResources: [`user_${event.userId}`],
          status: 'active',
          createdAt: now,
          updatedAt: now
        };

        threats.push(threat);
      }

      return threats;
    } catch (error) {
      console.error('Error detecting data exfiltration:', error);
      return [];
    }
  }

  /**
   * Detect property access violations
   */
  private static async detectPropertyAccessViolations(event: SecurityEvent): Promise<ThreatIntelligence[]> {
    if (!event.userId || !event.propertyId || event.eventType !== 'property_access') return [];

    try {
      // Get user's property access permissions
      const userPropertyAccess = await prisma.propertyAccess.findMany({
        where: { userId: event.userId },
        include: { property: true }
      });

      const accessiblePropertyIds = userPropertyAccess.map(access => access.propertyId);
      const threats: ThreatIntelligence[] = [];

      // Check if user is trying to access unauthorized property
      if (!accessiblePropertyIds.includes(event.propertyId)) {
        const threatId = `property_violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const threat: ThreatIntelligence = {
          threatId,
          threatType: 'property_access_violation',
          riskScore: 80,
          confidence: 95,
          indicators: [
            {
              type: 'behavior',
              value: `unauthorized_property_${event.propertyId}`,
              confidence: 95,
              firstSeen: new Date(),
              lastSeen: new Date(),
              occurrences: 1
            }
          ],
          mitigation: [
            {
              action: 'block_ip',
              automated: true,
              executed: false,
              details: { reason: 'Unauthorized property access attempt' }
            },
            {
              action: 'alert',
              automated: true,
              executed: false,
              details: { 
                message: `User ${event.userId} attempted to access unauthorized property ${event.propertyId}`
              }
            }
          ],
          timeline: [{
            timestamp: new Date(),
            event: 'Unauthorized property access attempt',
            details: { 
              userId: event.userId,
              propertyId: event.propertyId,
              accessibleProperties: accessiblePropertyIds
            },
            severity: 'high'
          }],
          affectedResources: [`user_${event.userId}`, `property_${event.propertyId}`],
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        threats.push(threat);
      }

      return threats;
    } catch (error) {
      console.error('Error detecting property access violations:', error);
      return [];
    }
  }

  /**
   * Detect privilege escalation attempts
   */
  private static async detectPrivilegeEscalation(event: SecurityEvent): Promise<ThreatIntelligence[]> {
    if (event.eventType !== 'permission_change') return [];

    try {
      const threats: ThreatIntelligence[] = [];

      // Check for suspicious permission changes
      const permissionDetails = event.details;
      if (permissionDetails?.newPermissions && permissionDetails?.oldPermissions) {
        const newPerms = permissionDetails.newPermissions as string[];
        const oldPerms = permissionDetails.oldPermissions as string[];
        
        const addedPermissions = newPerms.filter(p => !oldPerms.includes(p));
        const criticalPermissions = [
          'system.admin.full_access',
          'users.permissions.manage',
          'properties.ownership.transfer'
        ];

        const criticalPermissionsAdded = addedPermissions.filter(p => 
          criticalPermissions.includes(p)
        );

        if (criticalPermissionsAdded.length > 0) {
          const threatId = `privilege_escalation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          const threat: ThreatIntelligence = {
            threatId,
            threatType: 'privilege_escalation',
            riskScore: 90,
            confidence: 85,
            indicators: [
              {
                type: 'behavior',
                value: `critical_permissions_added`,
                confidence: 90,
                firstSeen: new Date(),
                lastSeen: new Date(),
                occurrences: 1
              }
            ],
            mitigation: [
              {
                action: 'alert',
                automated: true,
                executed: false,
                details: { 
                  message: `Critical permissions added to user ${event.userId}: ${criticalPermissionsAdded.join(', ')}`
                }
              },
              {
                action: 'monitor',
                automated: true,
                executed: false,
                details: { reason: 'Privilege escalation detected' }
              }
            ],
            timeline: [{
              timestamp: new Date(),
              event: 'Privilege escalation detected',
              details: { 
                userId: event.userId,
                addedPermissions: criticalPermissionsAdded
              },
              severity: 'high'
            }],
            affectedResources: [`user_${event.userId}`],
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          threats.push(threat);
        }
      }

      return threats;
    } catch (error) {
      console.error('Error detecting privilege escalation:', error);
      return [];
    }
  }

  /**
   * Detect session anomalies
   */
  private static async detectSessionAnomalies(event: SecurityEvent): Promise<ThreatIntelligence[]> {
    if (!event.userId || !event.sessionId) return [];

    try {
      const threats: ThreatIntelligence[] = [];

      // Check for multiple concurrent sessions
      const activeSessions = await prisma.session.findMany({
        where: {
          userId: event.userId,
          expires: { gt: new Date() }
        }
      });

      if (activeSessions.length > 3) {
        const threatId = `session_anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const threat: ThreatIntelligence = {
          threatId,
          threatType: 'session_hijacking',
          riskScore: 65,
          confidence: 70,
          indicators: [
            {
              type: 'behavior',
              value: `multiple_sessions_${activeSessions.length}`,
              confidence: 75,
              firstSeen: new Date(),
              lastSeen: new Date(),
              occurrences: activeSessions.length
            }
          ],
          mitigation: [
            {
              action: 'monitor',
              automated: true,
              executed: false,
              details: { reason: 'Multiple concurrent sessions detected' }
            }
          ],
          timeline: [{
            timestamp: new Date(),
            event: 'Multiple concurrent sessions detected',
            details: { 
              userId: event.userId,
              sessionCount: activeSessions.length
            },
            severity: 'medium'
          }],
          affectedResources: [`user_${event.userId}`],
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        threats.push(threat);
      }

      return threats;
    } catch (error) {
      console.error('Error detecting session anomalies:', error);
      return [];
    }
  }

  /**
   * Get or create user behavior profile
   */
  private static async getUserBehaviorProfile(userId: number): Promise<UserBehaviorProfile> {
    if (this.userProfiles.has(userId)) {
      return this.userProfiles.get(userId)!;
    }

    try {
      // Analyze user's historical behavior
      const userLogs = await prisma.auditLog.findMany({
        where: {
          userId,
          action: 'LOGIN',
          timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        },
        orderBy: { timestamp: 'desc' },
        take: 100
      });

      const loginHours = userLogs.map(log => new Date(log.timestamp).getHours());
      const normalStart = Math.min(...loginHours) || 8;
      const normalEnd = Math.max(...loginHours) || 18;

      const profile: UserBehaviorProfile = {
        userId,
        normalLoginHours: { start: normalStart, end: normalEnd },
        commonLocations: [], // Would be populated with actual location data
        averageSessionDuration: 8 * 60 * 60 * 1000, // 8 hours default
        commonDevices: [], // Would be populated with device fingerprints
        normalActivityPatterns: [],
        riskScore: 0,
        lastUpdated: new Date()
      };

      this.userProfiles.set(userId, profile);
      return profile;
    } catch (error) {
      console.error('Error creating user behavior profile:', error);
      // Return default profile
      return {
        userId,
        normalLoginHours: { start: 8, end: 18 },
        commonLocations: [],
        averageSessionDuration: 8 * 60 * 60 * 1000,
        commonDevices: [],
        normalActivityPatterns: [],
        riskScore: 0,
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Calculate risk score based on severity and frequency
   */
  private static calculateRiskScore(severity: SecuritySeverity, frequency: number): number {
    const baseScores = {
      info: 10,
      low: 25,
      medium: 50,
      high: 75,
      critical: 90
    };

    const base = baseScores[severity];
    const frequencyMultiplier = Math.min(2, 1 + (frequency - 1) * 0.1);
    
    return Math.min(100, Math.round(base * frequencyMultiplier));
  }

  /**
   * Calculate time-based risk score
   */
  private static calculateTimeBasedRiskScore(currentHour: number, normalHours: { start: number; end: number }): number {
    const distanceFromNormal = Math.min(
      Math.abs(currentHour - normalHours.start),
      Math.abs(currentHour - normalHours.end)
    );
    
    return Math.min(100, 30 + (distanceFromNormal * 5));
  }

  /**
   * Generate mitigation actions based on threat type and severity
   */
  private static generateMitigationActions(severity: SecuritySeverity, threatType: AdvancedThreatType): MitigationAction[] {
    const actions: MitigationAction[] = [];

    switch (severity) {
      case 'critical':
        actions.push(
          {
            action: 'block_ip',
            automated: true,
            executed: false,
            details: { reason: `Critical ${threatType} detected` }
          },
          {
            action: 'lock_account',
            automated: true,
            executed: false,
            details: { reason: `Critical ${threatType} detected` }
          },
          {
            action: 'alert',
            automated: true,
            executed: false,
            details: { priority: 'immediate', escalate: true }
          }
        );
        break;

      case 'high':
        actions.push(
          {
            action: 'require_mfa',
            automated: true,
            executed: false,
            details: { reason: `High risk ${threatType} detected` }
          },
          {
            action: 'alert',
            automated: true,
            executed: false,
            details: { priority: 'high' }
          },
          {
            action: 'monitor',
            automated: true,
            executed: false,
            details: { duration: '24h' }
          }
        );
        break;

      case 'medium':
        actions.push(
          {
            action: 'monitor',
            automated: true,
            executed: false,
            details: { duration: '1h' }
          },
          {
            action: 'alert',
            automated: true,
            executed: false,
            details: { priority: 'medium' }
          }
        );
        break;

      default:
        actions.push(
          {
            action: 'monitor',
            automated: true,
            executed: false,
            details: { duration: '30m' }
          }
        );
        break;
    }

    return actions;
  }

  /**
   * Get current security metrics
   */
  static async getSecurityMetrics(timeframe: '1h' | '24h' | '7d' = '24h'): Promise<SecurityMetrics> {
    const timeframeMs = timeframe === '1h' ? 60 * 60 * 1000 :
                       timeframe === '24h' ? 24 * 60 * 60 * 1000 :
                       7 * 24 * 60 * 60 * 1000;

    const since = new Date(Date.now() - timeframeMs);

    try {
      const threats = Array.from(this.threatIntelligence.values())
        .filter(threat => threat.createdAt >= since);

      const threatsByType = {} as Record<AdvancedThreatType, number>;
      const severityDistribution = {} as Record<SecuritySeverity, number>;

      threats.forEach(threat => {
        threatsByType[threat.threatType] = (threatsByType[threat.threatType] || 0) + 1;
        
        const severity = threat.riskScore >= 90 ? 'critical' :
                        threat.riskScore >= 75 ? 'high' :
                        threat.riskScore >= 50 ? 'medium' :
                        threat.riskScore >= 25 ? 'low' : 'info';
        
        severityDistribution[severity] = (severityDistribution[severity] || 0) + 1;
      });

      return {
        totalEvents: threats.length,
        threatsByType,
        severityDistribution,
        topAttackedProperties: [], // Would be calculated from actual data
        topAttackedUsers: [], // Would be calculated from actual data
        averageResponseTime: 0, // Would be calculated from resolution times
        falsePositiveRate: 0, // Would be calculated from historical data
        blockingEfficiency: 0, // Would be calculated from successful blocks
        complianceScore: 85, // Would be calculated based on security posture
        riskTrends: [] // Would be calculated from historical risk scores
      };
    } catch (error) {
      console.error('Error calculating security metrics:', error);
      return {
        totalEvents: 0,
        threatsByType: {} as Record<AdvancedThreatType, number>,
        severityDistribution: {} as Record<SecuritySeverity, number>,
        topAttackedProperties: [],
        topAttackedUsers: [],
        averageResponseTime: 0,
        falsePositiveRate: 0,
        blockingEfficiency: 0,
        complianceScore: 0,
        riskTrends: []
      };
    }
  }

  /**
   * Get active threat intelligence
   */
  static getActiveThreatIntelligence(): ThreatIntelligence[] {
    return Array.from(this.threatIntelligence.values())
      .filter(threat => threat.status === 'active');
  }

  /**
   * Resolve a threat
   */
  static async resolveThreat(threatId: string, resolution: string, resolvedBy: number): Promise<boolean> {
    const threat = this.threatIntelligence.get(threatId);
    if (!threat) return false;

    threat.status = 'resolved';
    threat.resolvedAt = new Date();
    threat.timeline.push({
      timestamp: new Date(),
      event: 'Threat resolved',
      details: { resolution, resolvedBy },
      severity: 'info'
    });

    this.threatIntelligence.set(threatId, threat);
    return true;
  }
}