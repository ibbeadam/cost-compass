"use server";

import { getCurrentUser } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { RealTimeSecurityMetrics } from "@/lib/security/real-time-metrics";

/**
 * Real-Time Security Metrics Actions
 */

/**
 * Initialize real-time metrics monitoring
 */
export async function initializeRealTimeMetricsAction(): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can control real-time metrics.");
    }

    await RealTimeSecurityMetrics.initialize();

    // Log the initialization
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'REAL_TIME_METRICS_INITIALIZED',
        resource: 'security',
        details: {
          initializedBy: user.id,
          timestamp: new Date().toISOString()
        }
      }
    });

    return {
      success: true,
      message: 'Real-time security metrics initialized successfully'
    };

  } catch (error) {
    console.error("Error initializing real-time metrics:", error);
    throw new Error("Failed to initialize real-time metrics");
  }
}

/**
 * Get current real-time security metrics
 */
export async function getRealTimeMetricsAction() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can view real-time metrics.");
    }

    const metrics = RealTimeSecurityMetrics.getCurrentMetrics();
    
    if (!metrics) {
      // If metrics not available, force an update
      await RealTimeSecurityMetrics.forceUpdate();
      const freshMetrics = RealTimeSecurityMetrics.getCurrentMetrics();
      return { success: true, data: freshMetrics };
    }

    return { success: true, data: metrics };

  } catch (error) {
    console.error("Error getting real-time metrics:", error);
    throw new Error("Failed to get real-time metrics");
  }
}

/**
 * Get real-time alerts
 */
export async function getRealTimeAlertsAction(limit: number = 10) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can view real-time alerts.");
    }

    const alerts = RealTimeSecurityMetrics.getRecentAlerts(limit);
    return { success: true, data: alerts };

  } catch (error) {
    console.error("Error getting real-time alerts:", error);
    throw new Error("Failed to get real-time alerts");
  }
}

/**
 * Force metrics update
 */
export async function forceMetricsUpdateAction(): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can force metrics updates.");
    }

    await RealTimeSecurityMetrics.forceUpdate();

    // Log the forced update
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'REAL_TIME_METRICS_FORCED_UPDATE',
        resource: 'security',
        details: {
          forcedBy: user.id,
          timestamp: new Date().toISOString()
        }
      }
    });

    return {
      success: true,
      message: 'Real-time metrics updated successfully'
    };

  } catch (error) {
    console.error("Error forcing metrics update:", error);
    throw new Error("Failed to force metrics update");
  }
}

/**
 * Get metrics summary
 */
export async function getMetricsSummaryAction() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can view metrics summary.");
    }

    const summary = RealTimeSecurityMetrics.getMetricsSummary();
    return { success: true, data: summary };

  } catch (error) {
    console.error("Error getting metrics summary:", error);
    throw new Error("Failed to get metrics summary");
  }
}

/**
 * Stop real-time metrics monitoring
 */
export async function stopRealTimeMetricsAction(): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can control real-time metrics.");
    }

    RealTimeSecurityMetrics.stopRealTimeMonitoring();

    // Log the stop action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'REAL_TIME_METRICS_STOPPED',
        resource: 'security',
        details: {
          stoppedBy: user.id,
          timestamp: new Date().toISOString()
        }
      }
    });

    return {
      success: true,
      message: 'Real-time metrics monitoring stopped successfully'
    };

  } catch (error) {
    console.error("Error stopping real-time metrics:", error);
    throw new Error("Failed to stop real-time metrics");
  }
}

/**
 * Get real-time security dashboard data combining all metrics
 */
export async function getRealTimeSecurityDashboardAction() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can view real-time dashboard.");
    }

    // Get current metrics
    const metrics = RealTimeSecurityMetrics.getCurrentMetrics();
    const alerts = RealTimeSecurityMetrics.getRecentAlerts(5);
    const summary = RealTimeSecurityMetrics.getMetricsSummary();

    // Get additional real-time data from database
    const now = new Date();
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

    // Get recent security events
    const recentSecurityEvents = await prisma.securityEvent.findMany({
      where: {
        timestamp: { gte: lastHour }
      },
      orderBy: { timestamp: 'desc' },
      take: 10,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Get system performance indicators
    const activeSessionsCount = await prisma.session.count({
      where: {
        expires: { gte: now }
      }
    });

    const recentAuditLogsCount = await prisma.auditLog.count({
      where: {
        timestamp: { gte: lastHour }
      }
    });

    // Calculate response time metrics
    const resolvedThreats = await prisma.securityEvent.findMany({
      where: {
        resolved: true,
        resolvedAt: { not: null },
        timestamp: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      },
      select: {
        timestamp: true,
        resolvedAt: true
      }
    });

    let averageResolutionTime = 0;
    if (resolvedThreats.length > 0) {
      const totalTime = resolvedThreats.reduce((sum, threat) => {
        if (threat.resolvedAt) {
          return sum + (threat.resolvedAt.getTime() - threat.timestamp.getTime());
        }
        return sum;
      }, 0);
      averageResolutionTime = Math.round(totalTime / resolvedThreats.length / (1000 * 60)); // Convert to minutes
    }

    const dashboardData = {
      metrics,
      alerts,
      summary,
      realTimeStats: {
        activeSecurityEvents: recentSecurityEvents.length,
        activeSessions: activeSessionsCount,
        systemActivity: recentAuditLogsCount,
        averageResolutionTime,
        lastUpdate: now
      },
      recentEvents: recentSecurityEvents.map(event => ({
        id: event.id,
        type: event.type,
        severity: event.severity,
        description: event.description,
        timestamp: event.timestamp,
        resolved: event.resolved,
        user: event.user
      })),
      performanceIndicators: {
        metricsLatency: summary.lastUpdate ? now.getTime() - summary.lastUpdate.getTime() : 0,
        databaseConnectivity: 'healthy', // Based on successful queries
        monitoringStatus: summary.isActive ? 'active' : 'inactive',
        alertQueueSize: alerts.length
      }
    };

    return { success: true, data: dashboardData };

  } catch (error) {
    console.error("Error getting real-time security dashboard:", error);
    throw new Error("Failed to get real-time security dashboard");
  }
}

/**
 * Get security metrics history for trending
 */
export async function getSecurityMetricsHistoryAction(hours: number = 24) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can view metrics history.");
    }

    const now = new Date();
    const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);

    // Generate hourly metrics for the specified period
    const historyData = [];
    
    for (let i = 0; i < hours; i++) {
      const hourStart = new Date(startTime.getTime() + i * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

      // Get metrics for this hour
      const [threatCount, eventCount, failedLogins, securityEvents] = await Promise.all([
        prisma.securityEvent.count({
          where: {
            timestamp: { gte: hourStart, lt: hourEnd },
            resolved: false
          }
        }),
        prisma.auditLog.count({
          where: {
            timestamp: { gte: hourStart, lt: hourEnd }
          }
        }),
        prisma.auditLog.count({
          where: {
            action: 'LOGIN_FAILED',
            timestamp: { gte: hourStart, lt: hourEnd }
          }
        }),
        prisma.securityEvent.count({
          where: {
            timestamp: { gte: hourStart, lt: hourEnd },
            severity: { in: ['critical', 'high'] }
          }
        })
      ]);

      // Calculate security score for this hour
      let securityScore = 100;
      securityScore -= securityEvents * 15; // -15 per critical/high event
      securityScore -= failedLogins * 2; // -2 per failed login
      securityScore = Math.max(0, securityScore);

      historyData.push({
        timestamp: hourStart,
        threatCount,
        eventCount,
        failedLogins,
        securityEvents,
        securityScore,
        riskLevel: securityScore < 40 ? 'critical' : 
                  securityScore < 60 ? 'high' : 
                  securityScore < 80 ? 'medium' : 'low'
      });
    }

    return { success: true, data: historyData };

  } catch (error) {
    console.error("Error getting security metrics history:", error);
    throw new Error("Failed to get security metrics history");
  }
}