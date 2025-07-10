"use server";

import { getCurrentUser } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { SecurityAnalyticsValidator } from "@/lib/security/analytics-validator";

/**
 * Security Analytics Validation Actions
 */

/**
 * Run comprehensive security analytics validation
 */
export async function runSecurityAnalyticsValidationAction() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can run security validation.");
    }

    const report = await SecurityAnalyticsValidator.validateSecurityAnalytics();

    // Log the validation run
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'SECURITY_ANALYTICS_VALIDATION_RUN',
        resource: 'security',
        details: {
          overallStatus: report.overallStatus,
          totalTests: report.totalTests,
          passedTests: report.passedTests,
          failedTests: report.failedTests,
          warningTests: report.warningTests,
          executionTime: report.executionTime,
          runBy: user.id,
          timestamp: new Date().toISOString()
        }
      }
    });

    return { success: true, data: report };

  } catch (error) {
    console.error("Error running security analytics validation:", error);
    throw new Error("Failed to run security analytics validation");
  }
}

/**
 * Get validation history
 */
export async function getValidationHistoryAction(limit: number = 10) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can view validation history.");
    }

    const validationRuns = await prisma.auditLog.findMany({
      where: {
        action: 'SECURITY_ANALYTICS_VALIDATION_RUN',
        resource: 'security'
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    const history = validationRuns.map(run => ({
      id: run.id,
      timestamp: run.timestamp,
      runBy: run.user,
      overallStatus: run.details?.overallStatus || 'unknown',
      totalTests: run.details?.totalTests || 0,
      passedTests: run.details?.passedTests || 0,
      failedTests: run.details?.failedTests || 0,
      warningTests: run.details?.warningTests || 0,
      executionTime: run.details?.executionTime || 0
    }));

    return { success: true, data: history };

  } catch (error) {
    console.error("Error getting validation history:", error);
    throw new Error("Failed to get validation history");
  }
}

/**
 * Get security analytics health score
 */
export async function getSecurityAnalyticsHealthScoreAction() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can view analytics health score.");
    }

    // Get the most recent validation report
    const lastValidation = await prisma.auditLog.findFirst({
      where: {
        action: 'SECURITY_ANALYTICS_VALIDATION_RUN',
        resource: 'security'
      },
      orderBy: { timestamp: 'desc' }
    });

    let healthScore = 0;
    let status = 'unknown';
    let lastValidationTime = null;

    if (lastValidation?.details) {
      const details = lastValidation.details as any;
      const totalTests = details.totalTests || 0;
      const passedTests = details.passedTests || 0;
      const warningTests = details.warningTests || 0;
      
      if (totalTests > 0) {
        // Calculate health score (0-100)
        healthScore = Math.round((passedTests / totalTests) * 100);
        
        // Reduce score for warnings
        if (warningTests > 0) {
          healthScore -= Math.round((warningTests / totalTests) * 20);
        }
        
        healthScore = Math.max(0, healthScore);
      }
      
      status = details.overallStatus || 'unknown';
      lastValidationTime = lastValidation.timestamp;
    }

    // Get current system metrics for real-time health assessment
    const now = new Date();
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      activeThreats,
      recentEvents,
      failedLogins,
      systemErrors
    ] = await Promise.all([
      prisma.securityEvent.count({
        where: { resolved: false, severity: { in: ['critical', 'high'] } }
      }),
      prisma.securityEvent.count({
        where: { timestamp: { gte: lastHour } }
      }),
      prisma.auditLog.count({
        where: { action: 'LOGIN_FAILED', timestamp: { gte: last24Hours } }
      }),
      prisma.auditLog.count({
        where: { 
          action: { contains: 'ERROR' },
          timestamp: { gte: last24Hours }
        }
      })
    ]);

    // Adjust health score based on current conditions
    let realTimeAdjustment = 0;
    if (activeThreats > 5) realTimeAdjustment -= 20;
    else if (activeThreats > 0) realTimeAdjustment -= 10;
    
    if (failedLogins > 50) realTimeAdjustment -= 15;
    else if (failedLogins > 20) realTimeAdjustment -= 5;
    
    if (systemErrors > 10) realTimeAdjustment -= 10;
    
    const adjustedHealthScore = Math.max(0, Math.min(100, healthScore + realTimeAdjustment));

    // Determine overall system health status
    let systemHealthStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    if (adjustedHealthScore >= 90) systemHealthStatus = 'excellent';
    else if (adjustedHealthScore >= 75) systemHealthStatus = 'good';
    else if (adjustedHealthScore >= 60) systemHealthStatus = 'fair';
    else if (adjustedHealthScore >= 40) systemHealthStatus = 'poor';
    else systemHealthStatus = 'critical';

    const healthData = {
      healthScore: adjustedHealthScore,
      systemHealthStatus,
      lastValidation: {
        status,
        timestamp: lastValidationTime,
        baseScore: healthScore
      },
      currentConditions: {
        activeThreats,
        recentEvents,
        failedLogins,
        systemErrors,
        realTimeAdjustment
      },
      recommendations: generateHealthRecommendations(adjustedHealthScore, {
        activeThreats,
        failedLogins,
        systemErrors
      })
    };

    return { success: true, data: healthData };

  } catch (error) {
    console.error("Error getting security analytics health score:", error);
    throw new Error("Failed to get security analytics health score");
  }
}

/**
 * Generate health recommendations based on score and conditions
 */
function generateHealthRecommendations(
  healthScore: number, 
  conditions: { activeThreats: number; failedLogins: number; systemErrors: number }
): string[] {
  const recommendations: string[] = [];

  if (healthScore < 60) {
    recommendations.push("Run comprehensive security analytics validation immediately");
    recommendations.push("Review system configuration and data integrity");
  }

  if (conditions.activeThreats > 5) {
    recommendations.push("Address critical security threats immediately");
    recommendations.push("Review threat detection and response procedures");
  } else if (conditions.activeThreats > 0) {
    recommendations.push("Review and resolve active security threats");
  }

  if (conditions.failedLogins > 50) {
    recommendations.push("Investigate high volume of failed login attempts");
    recommendations.push("Consider implementing additional authentication controls");
  } else if (conditions.failedLogins > 20) {
    recommendations.push("Monitor failed login patterns for potential attacks");
  }

  if (conditions.systemErrors > 10) {
    recommendations.push("Investigate system errors affecting security monitoring");
    recommendations.push("Review application logs and system health");
  }

  if (healthScore >= 90) {
    recommendations.push("Maintain current security monitoring practices");
    recommendations.push("Continue regular validation and monitoring");
  } else if (healthScore >= 75) {
    recommendations.push("Good security posture - minor improvements recommended");
    recommendations.push("Schedule regular validation checks");
  } else if (healthScore >= 60) {
    recommendations.push("Security analytics functioning but needs attention");
    recommendations.push("Review validation failures and warnings");
  }

  // Always include these general recommendations
  recommendations.push("Perform regular security analytics validation");
  recommendations.push("Monitor real-time security metrics");

  return recommendations.slice(0, 6); // Limit to 6 recommendations
}

/**
 * Schedule automated validation
 */
export async function scheduleAutomatedValidationAction(
  schedule: 'daily' | 'weekly' | 'monthly'
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can schedule validation.");
    }

    // Log the scheduling
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'SECURITY_VALIDATION_SCHEDULED',
        resource: 'security',
        details: {
          schedule,
          scheduledBy: user.id,
          timestamp: new Date().toISOString()
        }
      }
    });

    return {
      success: true,
      message: `Automated security validation scheduled to run ${schedule}`
    };

  } catch (error) {
    console.error("Error scheduling automated validation:", error);
    throw new Error("Failed to schedule automated validation");
  }
}

/**
 * Get security analytics summary dashboard
 */
export async function getSecurityAnalyticsSummaryAction() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Access denied. Only super administrators can view analytics summary.");
    }

    const [
      healthScore,
      validationHistory,
      currentMetrics
    ] = await Promise.all([
      getSecurityAnalyticsHealthScoreAction(),
      getValidationHistoryAction(5),
      getCurrentSystemMetrics()
    ]);

    const summary = {
      healthScore: healthScore.data,
      recentValidations: validationHistory.data,
      systemMetrics: currentMetrics,
      lastUpdate: new Date()
    };

    return { success: true, data: summary };

  } catch (error) {
    console.error("Error getting security analytics summary:", error);
    throw new Error("Failed to get security analytics summary");
  }
}

/**
 * Get current system metrics for summary
 */
async function getCurrentSystemMetrics() {
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers,
    totalEvents,
    recentEvents,
    totalAlerts,
    recentAlerts
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: { lastLoginAt: { gte: last24Hours } }
    }),
    prisma.securityEvent.count(),
    prisma.securityEvent.count({
      where: { timestamp: { gte: last24Hours } }
    }),
    prisma.securityAlert.count(),
    prisma.securityAlert.count({
      where: { sentAt: { gte: last24Hours } }
    })
  ]);

  return {
    users: { total: totalUsers, active: activeUsers },
    events: { total: totalEvents, recent: recentEvents },
    alerts: { total: totalAlerts, recent: recentAlerts },
    timestamp: now
  };
}