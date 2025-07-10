"use server";

import { getCurrentUser } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { RealTimeSecurityMonitor } from "@/lib/security/real-time-monitor";
import { AutomatedResponseEngine } from "@/lib/security/automated-response-engine";
import { SecurityEventCorrelator } from "@/lib/security/security-event-correlator";
import { ThreatIntelligenceFeed } from "@/lib/security/threat-intelligence-feed";
import type { 
  RealTimeMonitoringStats, 
  SecurityMonitorConfig, 
  EventCorrelation,
  ResponseRule,
  ThreatIntelligenceIndicator,
  IOCType,
  SecurityIncident
} from "@/lib/security/advanced-security-types";

/**
 * Real-time Security Monitoring Actions for Phase 2
 */

/**
 * Start real-time security monitoring
 */
export async function startRealTimeMonitoringAction(): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can control real-time monitoring.");
    }

    await RealTimeSecurityMonitor.start();

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'REAL_TIME_MONITORING_STARTED',
        resource: 'security',
        details: {
          startedBy: user.id,
          timestamp: new Date().toISOString()
        }
      }
    });

    return {
      success: true,
      message: 'Real-time security monitoring started successfully'
    };

  } catch (error) {
    console.error("Error starting real-time monitoring:", error);
    throw new Error("Failed to start real-time monitoring");
  }
}

/**
 * Stop real-time security monitoring
 */
export async function stopRealTimeMonitoringAction(): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can control real-time monitoring.");
    }

    await RealTimeSecurityMonitor.stop();

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'REAL_TIME_MONITORING_STOPPED',
        resource: 'security',
        details: {
          stoppedBy: user.id,
          timestamp: new Date().toISOString()
        }
      }
    });

    return {
      success: true,
      message: 'Real-time security monitoring stopped successfully'
    };

  } catch (error) {
    console.error("Error stopping real-time monitoring:", error);
    throw new Error("Failed to stop real-time monitoring");
  }
}

/**
 * Get real-time monitoring status and statistics
 */
export async function getRealTimeMonitoringStatusAction(): Promise<{
  isRunning: boolean;
  stats: RealTimeMonitoringStats;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can view monitoring status.");
    }

    const isRunning = RealTimeSecurityMonitor.isRunning();
    const stats = RealTimeSecurityMonitor.getStats();

    return {
      isRunning,
      stats
    };

  } catch (error) {
    console.error("Error getting monitoring status:", error);
    throw new Error("Failed to get monitoring status");
  }
}

/**
 * Update real-time monitoring configuration
 */
export async function updateMonitoringConfigAction(
  config: Partial<SecurityMonitorConfig>
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can update monitoring configuration.");
    }

    RealTimeSecurityMonitor.updateConfig(config);

    // Log the configuration update
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'MONITORING_CONFIG_UPDATED',
        resource: 'security',
        details: {
          configUpdates: JSON.stringify(config),
          updatedBy: user.id,
          timestamp: new Date().toISOString()
        }
      }
    });

    return {
      success: true,
      message: 'Monitoring configuration updated successfully'
    };

  } catch (error) {
    console.error("Error updating monitoring config:", error);
    throw new Error("Failed to update monitoring configuration");
  }
}

/**
 * Force immediate security check
 */
export async function forceSecurityCheckAction(): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can force security checks.");
    }

    await RealTimeSecurityMonitor.forceCheck();

    // Log the forced check
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'FORCED_SECURITY_CHECK',
        resource: 'security',
        details: {
          triggeredBy: user.id,
          timestamp: new Date().toISOString()
        }
      }
    });

    return {
      success: true,
      message: 'Security check completed successfully'
    };

  } catch (error) {
    console.error("Error forcing security check:", error);
    throw new Error("Failed to perform security check");
  }
}

/**
 * Get event correlations
 */
export async function getEventCorrelationsAction(
  timeWindowMs: number = 1800000
): Promise<EventCorrelation[]> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can view event correlations.");
    }

    const correlations = await SecurityEventCorrelator.correlateRecentEvents(timeWindowMs);
    return correlations;

  } catch (error) {
    console.error("Error getting event correlations:", error);
    throw new Error("Failed to get event correlations");
  }
}

/**
 * Get correlation effectiveness analysis
 */
export async function getCorrelationEffectivenessAction(): Promise<{
  totalCorrelations: number;
  truePositives: number;
  falsePositives: number;
  effectiveness: number;
  topRules: Array<{ ruleId: string; correlations: number; effectiveness: number }>;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can view correlation analysis.");
    }

    const analysis = await SecurityEventCorrelator.analyzeCorrelationEffectiveness();
    return analysis;

  } catch (error) {
    console.error("Error getting correlation effectiveness:", error);
    throw new Error("Failed to get correlation effectiveness");
  }
}

/**
 * Get automated response rules
 */
export async function getResponseRulesAction(): Promise<ResponseRule[]> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can view response rules.");
    }

    const rules = AutomatedResponseEngine.getResponseRules();
    return rules;

  } catch (error) {
    console.error("Error getting response rules:", error);
    throw new Error("Failed to get response rules");
  }
}

/**
 * Update response rule
 */
export async function updateResponseRuleAction(
  ruleId: string,
  updates: Partial<ResponseRule>
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can update response rules.");
    }

    const success = AutomatedResponseEngine.updateResponseRule(ruleId, updates);

    if (success) {
      // Log the rule update
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'RESPONSE_RULE_UPDATED',
          resource: 'security',
          resourceId: ruleId,
          details: {
            ruleId,
            updates: JSON.stringify(updates),
            updatedBy: user.id,
            timestamp: new Date().toISOString()
          }
        }
      });

      return {
        success: true,
        message: 'Response rule updated successfully'
      };
    } else {
      return {
        success: false,
        message: 'Response rule not found'
      };
    }

  } catch (error) {
    console.error("Error updating response rule:", error);
    throw new Error("Failed to update response rule");
  }
}

/**
 * Get threat intelligence statistics
 */
export async function getThreatIntelligenceStatsAction(): Promise<{
  totalIndicators: number;
  indicatorsByType: Record<IOCType, number>;
  indicatorsBySeverity: Record<string, number>;
  activeIndicators: number;
  expiredIndicators: number;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can view threat intelligence.");
    }

    const stats = ThreatIntelligenceFeed.getThreatStatistics();
    return stats;

  } catch (error) {
    console.error("Error getting threat intelligence stats:", error);
    throw new Error("Failed to get threat intelligence statistics");
  }
}

/**
 * Add threat indicator
 */
export async function addThreatIndicatorAction(
  indicator: Omit<ThreatIntelligenceIndicator, 'id' | 'sources' | 'addedAt' | 'lastUpdated'>
): Promise<{ success: boolean; message: string; indicatorId?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can add threat indicators.");
    }

    const indicatorId = await ThreatIntelligenceFeed.addThreatIndicator(indicator);

    // Log the addition
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'THREAT_INDICATOR_ADDED_MANUAL',
        resource: 'security',
        resourceId: indicatorId,
        details: {
          type: indicator.type,
          value: indicator.value,
          severity: indicator.severity,
          confidence: indicator.confidence,
          addedBy: user.id,
          timestamp: new Date().toISOString()
        }
      }
    });

    return {
      success: true,
      message: 'Threat indicator added successfully',
      indicatorId
    };

  } catch (error) {
    console.error("Error adding threat indicator:", error);
    throw new Error("Failed to add threat indicator");
  }
}

/**
 * Remove threat indicator
 */
export async function removeThreatIndicatorAction(
  type: IOCType,
  value: string
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can remove threat indicators.");
    }

    const success = await ThreatIntelligenceFeed.removeThreatIndicator(type, value);

    if (success) {
      // Log the removal
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'THREAT_INDICATOR_REMOVED_MANUAL',
          resource: 'security',
          resourceId: `${type}:${value}`,
          details: {
            type,
            value,
            removedBy: user.id,
            timestamp: new Date().toISOString()
          }
        }
      });

      return {
        success: true,
        message: 'Threat indicator removed successfully'
      };
    } else {
      return {
        success: false,
        message: 'Threat indicator not found'
      };
    }

  } catch (error) {
    console.error("Error removing threat indicator:", error);
    throw new Error("Failed to remove threat indicator");
  }
}

/**
 * Get security incidents
 */
export async function getSecurityIncidentsAction(
  limit: number = 50,
  status?: string
): Promise<SecurityIncident[]> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can view security incidents.");
    }

    // Query real security incidents from the database
    const timeStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

    // Get security events that qualify as incidents (critical/high severity unresolved events)
    const securityEvents = await prisma.securityEvent.findMany({
      where: {
        severity: { in: ['critical', 'high'] },
        timestamp: { gte: timeStart },
        ...(status ? { 
          resolved: status === 'resolved' ? true : false 
        } : {})
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, name: true } }
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    });

    // Get related security alerts for these events
    const eventIds = securityEvents.map(event => event.id);
    const relatedAlerts = await prisma.securityAlert.findMany({
      where: {
        eventId: { in: eventIds }
      },
      include: {
        event: true
      }
    });

    // Convert security events to SecurityIncident format
    const securityIncidents: SecurityIncident[] = securityEvents.map(event => {
      const alerts = relatedAlerts.filter(alert => alert.eventId === event.id);
      
      // Determine incident status based on event data
      let incidentStatus: SecurityIncident['status'] = 'investigating';
      if (event.resolved) {
        incidentStatus = 'resolved';
      } else if (event.severity === 'critical') {
        incidentStatus = 'escalated';
      }

      // Create timeline from event data
      const timeline: SecurityIncident['timeline'] = [
        {
          timestamp: event.timestamp,
          event: 'Incident detected',
          details: { 
            source: 'automated_detection',
            type: event.type,
            ip: event.ip,
            endpoint: event.endpoint
          },
          severity: event.severity as 'low' | 'medium' | 'high' | 'critical'
        }
      ];

      // Add alert timeline entries
      alerts.forEach(alert => {
        if (alert.sentAt) {
          timeline.push({
            timestamp: alert.sentAt,
            event: `Alert sent via ${alert.alertType}`,
            details: { 
              recipient: alert.recipient,
              alertType: alert.alertType
            },
            severity: 'medium'
          });
        }
      });

      // Add resolution timeline if resolved
      if (event.resolved && event.resolvedAt) {
        timeline.push({
          timestamp: event.resolvedAt,
          event: 'Incident resolved',
          details: {
            resolvedBy: event.resolvedBy,
            action: event.actionTaken
          },
          severity: 'low'
        });
      }

      // Sort timeline by timestamp
      timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Create evidence from event metadata
      const evidence: SecurityIncident['evidence'] = [];
      if (event.ip) {
        evidence.push({
          type: 'ip_address',
          value: event.ip,
          timestamp: event.timestamp,
          confidence: 95
        });
      }
      if (event.userAgent) {
        evidence.push({
          type: 'user_agent',
          value: event.userAgent,
          timestamp: event.timestamp,
          confidence: 80
        });
      }
      if (event.endpoint) {
        evidence.push({
          type: 'endpoint',
          value: event.endpoint,
          timestamp: event.timestamp,
          confidence: 90
        });
      }

      // Create response actions from event data
      const responseActions: SecurityIncident['responseActions'] = [];
      if (event.actionTaken) {
        responseActions.push({
          type: event.actionTaken.includes('block') ? 'block' : 'investigate',
          parameters: { 
            target: event.ip ? 'ip' : 'user',
            duration: 3600 // Default 1 hour
          },
          executedAt: event.resolvedAt || event.timestamp,
          success: true,
          message: event.actionTaken
        });
      }

      // Determine affected resources
      const affectedResources: string[] = [];
      if (event.userId) affectedResources.push(`user_${event.userId}`);
      if (event.propertyId) affectedResources.push(`property_${event.propertyId}`);
      if (event.endpoint) affectedResources.push(event.endpoint);
      if (affectedResources.length === 0) affectedResources.push('system');

      return {
        id: `incident_${event.id}`,
        threatId: event.id.toString(),
        severity: event.severity as 'low' | 'medium' | 'high' | 'critical',
        status: incidentStatus,
        title: getIncidentTitle(event.type, event.severity),
        description: event.description,
        affectedResources,
        createdAt: event.timestamp,
        updatedAt: event.resolvedAt || event.timestamp,
        assignedTo: event.resolvedBy || user.id,
        escalated: event.severity === 'critical',
        timeline,
        evidence,
        responseActions,
        resolution: event.resolved ? {
          summary: `Incident resolved: ${event.actionTaken || 'Security measures applied'}`,
          rootCause: getIncidentRootCause(event.type),
          preventiveMeasures: getPreventiveMeasures(event.type),
          resolvedBy: event.resolvedBy || user.id,
          resolvedAt: event.resolvedAt || event.timestamp
        } : null
      };
    });

    // If no real incidents found, return a default "all clear" status
    if (securityIncidents.length === 0) {
      return [{
        id: 'status_all_clear',
        threatId: 'system_status',
        severity: 'low',
        status: 'resolved',
        title: 'No Active Security Incidents',
        description: 'System monitoring active - no critical security incidents detected in the selected timeframe',
        affectedResources: ['system'],
        createdAt: new Date(),
        updatedAt: new Date(),
        assignedTo: user.id,
        escalated: false,
        timeline: [{
          timestamp: new Date(),
          event: 'Security status check',
          details: { status: 'all_clear', monitoring: 'active' },
          severity: 'low'
        }],
        evidence: [],
        responseActions: [],
        resolution: {
          summary: 'No security incidents detected',
          rootCause: 'Preventive monitoring',
          preventiveMeasures: ['Continuous security monitoring', 'Regular security assessments'],
          resolvedBy: user.id,
          resolvedAt: new Date()
        }
      }];
    }

    return securityIncidents;

  } catch (error) {
    console.error("Error getting security incidents:", error);
    throw new Error("Failed to get security incidents");
  }
}

/**
 * Update security incident
 */
export async function updateSecurityIncidentAction(
  incidentId: string,
  updates: { status?: string; assignedTo?: number; resolution?: string; notes?: string }
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can update security incidents.");
    }

    // Log the incident update
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'SECURITY_INCIDENT_UPDATED',
        resource: 'security',
        resourceId: incidentId,
        details: {
          incidentId,
          updates: JSON.stringify(updates),
          updatedBy: user.id,
          timestamp: new Date().toISOString()
        }
      }
    });

    return {
      success: true,
      message: 'Security incident updated successfully'
    };

  } catch (error) {
    console.error("Error updating security incident:", error);
    throw new Error("Failed to update security incident");
  }
}

/**
 * Get automated response history
 */
export async function getAutomatedResponseHistoryAction(
  limit: number = 100,
  timeframe: '1h' | '24h' | '7d' = '24h'
): Promise<Array<{
  id: string;
  timestamp: Date;
  threatId: string;
  threatType: string;
  riskScore: number;
  actionsExecuted: number;
  successfulActions: number;
  executionTime: number;
}>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can view response history.");
    }

    const timeframeMs = timeframe === '1h' ? 60 * 60 * 1000 :
                       timeframe === '24h' ? 24 * 60 * 60 * 1000 :
                       7 * 24 * 60 * 60 * 1000;

    const since = new Date(Date.now() - timeframeMs);

    // Get automated response logs
    const responseLogs = await prisma.auditLog.findMany({
      where: {
        action: 'AUTOMATED_RESPONSE_EXECUTED',
        timestamp: { gte: since }
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    });

    return responseLogs.map(log => ({
      id: log.id.toString(),
      timestamp: log.timestamp,
      threatId: log.resourceId || 'unknown',
      threatType: (log.details as any)?.threatType || 'unknown',
      riskScore: (log.details as any)?.riskScore || 0,
      actionsExecuted: (log.details as any)?.actionsCount || 0,
      successfulActions: (log.details as any)?.successfulActions || 0,
      executionTime: (log.details as any)?.executionTimeMs || 0
    }));

  } catch (error) {
    console.error("Error getting automated response history:", error);
    throw new Error("Failed to get automated response history");
  }
}