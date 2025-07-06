"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { startOfDay, endOfDay, subDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";

export interface UserActivityData {
  userId: number;
  userName: string;
  userEmail: string;
  userRole: string;
  lastActive: Date;
  
  // Activity Metrics
  totalActions: number;
  actionsThisPeriod: number;
  dailyAverage: number;
  
  // Login Activity
  totalLogins: number;
  loginsThisPeriod: number;
  lastLogin: Date | null;
  uniqueLoginDays: number;
  
  // Action Breakdown
  actionBreakdown: {
    action: string;
    count: number;
    percentage: number;
  }[];
  
  // Resource Breakdown
  resourceBreakdown: {
    resource: string;
    count: number;
    percentage: number;
  }[];
  
  // Property Access (for property admins)
  propertyAccess: {
    propertyId: number;
    propertyName: string;
    actionCount: number;
  }[];
  
  // Recent Activity Sample
  recentActivity: {
    id: number;
    action: string;
    resource: string;
    resourceId: string | null;
    timestamp: Date;
    ipAddress: string | null;
  }[];
  
  // Performance Metrics
  riskScore: number; // 0-100 risk assessment
  activityTrend: "Increasing" | "Decreasing" | "Stable";
  unusualActivity: string[];
}

export interface UserActivityAuditReport {
  dateRange: {
    from: Date;
    to: Date;
  };
  reportTitle: string;
  
  // Summary Statistics
  summary: {
    totalUsers: number;
    activeUsers: number;
    totalActions: number;
    uniqueResources: number;
    avgActionsPerUser: number;
    peakActivityDay: {
      date: Date;
      actions: number;
    };
    mostActiveUser: {
      name: string;
      email: string;
      actions: number;
    };
    topAction: {
      name: string;
      count: number;
      percentage: number;
    };
  };
  
  // User Activity Data
  userData: UserActivityData[];
  
  // Temporal Analysis
  dailyActivity: {
    date: Date;
    totalActions: number;
    uniqueUsers: number;
    averageActionsPerUser: number;
  }[];
  
  // Action Analytics
  actionAnalytics: {
    totalActions: {
      action: string;
      count: number;
      percentage: number;
      uniqueUsers: number;
    }[];
    
    resourceActivity: {
      resource: string;
      count: number;
      percentage: number;
      uniqueUsers: number;
      topUsers: string[];
    }[];
    
    securityEvents: {
      type: string;
      count: number;
      severity: "High" | "Medium" | "Low";
      description: string;
    }[];
  };
  
  // Geographic Analysis
  locationAnalysis: {
    ipAddress: string;
    location: string; // City, Country
    users: string[];
    actionCount: number;
    lastActive: Date;
    riskLevel: "High" | "Medium" | "Low";
  }[];
  
  // Login Analytics
  loginAnalytics: {
    totalLogins: number;
    uniqueLoginUsers: number;
    averageSessionDuration: number;
    peakLoginHour: number;
    loginFailures: number;
    
    deviceTypes: {
      type: string;
      count: number;
      percentage: number;
    }[];
    
    browsers: {
      browser: string;
      count: number;
      percentage: number;
    }[];
  };
  
  // Risk Assessment
  riskAssessment: {
    overallRiskScore: number;
    highRiskUsers: string[];
    suspiciousActivities: {
      userId: number;
      userName: string;
      activity: string;
      timestamp: Date;
      riskLevel: "High" | "Medium" | "Low";
    }[];
    recommendations: string[];
  };
  
  // Property-Specific Analysis (if applicable)
  propertyAnalysis?: {
    propertyId: number;
    propertyName: string;
    userCount: number;
    actionCount: number;
    topUsers: string[];
    mostCommonActions: string[];
  }[];
  
  propertyInfo?: {
    id: number;
    name: string;
  };
}

export async function getUserActivityAuditReportAction(
  startDate: Date,
  endDate: Date,
  propertyId?: string
): Promise<UserActivityAuditReport> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    // Check permissions - only admins can view audit reports
    if (user.role !== "super_admin" && user.role !== "property_admin") {
      throw new Error("Insufficient permissions to view user activity reports");
    }

    const normalizedStartDate = startOfDay(startDate);
    const normalizedEndDate = endOfDay(endDate);

    // Determine property access
    let selectedProperty = null;
    let whereClause: any = {
      timestamp: {
        gte: normalizedStartDate,
        lte: normalizedEndDate
      }
    };

    // Property-based filtering
    if (user.role === "super_admin") {
      if (propertyId && propertyId !== "all") {
        whereClause.propertyId = parseInt(propertyId);
        selectedProperty = await prisma.property.findUnique({
          where: { id: parseInt(propertyId) },
          select: { id: true, name: true }
        });
      }
    } else {
      // Property admins can only see their accessible properties
      const userPropertyIds = user.propertyAccess?.map(access => access.propertyId) || [];
      if (userPropertyIds.length === 0) {
        throw new Error("No property access found for user");
      }
      whereClause.OR = [
        { propertyId: { in: userPropertyIds } },
        { propertyId: null } // Include system-level logs
      ];
    }

    // Get all audit logs for the period
    const auditLogs = await prisma.auditLog.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            propertyAccess: {
              include: {
                property: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    // Get all users who had activity
    const userIds = Array.from(new Set(auditLogs.map(log => log.userId).filter((id): id is number => id !== null)));
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      include: {
        propertyAccess: {
          include: {
            property: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    const daysInPeriod = Math.ceil((normalizedEndDate.getTime() - normalizedStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Process user activity data
    const userData: UserActivityData[] = users.map(user => {
      const userLogs = auditLogs.filter(log => log.userId === user.id);
      const loginLogs = userLogs.filter(log => log.action === "LOGIN");
      
      // Calculate activity metrics
      const totalActions = userLogs.length;
      const dailyAverage = totalActions / daysInPeriod;
      
      // Login metrics
      const totalLogins = loginLogs.length;
      const lastLogin = loginLogs.length > 0 ? loginLogs[0].timestamp : null;
      const uniqueLoginDays = new Set(loginLogs.map(log => format(log.timestamp, 'yyyy-MM-dd'))).size;
      
      // Action breakdown
      const actionCounts = userLogs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const actionBreakdown = Object.entries(actionCounts)
        .map(([action, count]) => ({
          action,
          count: count as number,
          percentage: ((count as number) / totalActions) * 100
        }))
        .sort((a, b) => b.count - a.count);

      // Resource breakdown
      const resourceCounts = userLogs.reduce((acc, log) => {
        acc[log.resource] = (acc[log.resource] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const resourceBreakdown = Object.entries(resourceCounts)
        .map(([resource, count]) => ({
          resource,
          count: count as number,
          percentage: ((count as number) / totalActions) * 100
        }))
        .sort((a, b) => b.count - a.count);

      // Property access analysis
      const propertyLogCounts = userLogs.reduce((acc, log) => {
        if (log.propertyId) {
          acc[log.propertyId] = (acc[log.propertyId] || 0) + 1;
        }
        return acc;
      }, {} as Record<number, number>);

      const propertyAccess = user.propertyAccess.map(access => ({
        propertyId: access.propertyId,
        propertyName: access.property.name,
        actionCount: propertyLogCounts[access.propertyId] || 0
      }));

      // Recent activity sample
      const recentActivity = userLogs.slice(0, 10).map(log => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        timestamp: log.timestamp,
        ipAddress: log.ipAddress
      }));

      // Risk assessment
      let riskScore = 0;
      const unusualActivity: string[] = [];

      // Check for unusual patterns
      if (totalActions > dailyAverage * 10) {
        riskScore += 20;
        unusualActivity.push("Unusually high activity volume");
      }

      // Check for multiple IP addresses
      const uniqueIPs = new Set(userLogs.map(log => log.ipAddress).filter(Boolean));
      if (uniqueIPs.size > 3) {
        riskScore += 15;
        unusualActivity.push(`Multiple IP addresses (${uniqueIPs.size})`);
      }

      // Check for failed logins (if tracked)
      const failedLogins = userLogs.filter(log => log.action === "LOGIN_FAILED");
      if (failedLogins.length > 5) {
        riskScore += 25;
        unusualActivity.push(`Multiple failed logins (${failedLogins.length})`);
      }

      // Check for admin actions
      const adminActions = userLogs.filter(log => 
        log.action.includes("DELETE") || 
        log.action.includes("ADMIN") || 
        log.resource === "user" ||
        log.resource === "property"
      );
      if (adminActions.length > 0 && user.role !== "super_admin") {
        riskScore += 30;
        unusualActivity.push(`Administrative actions by non-admin user`);
      }

      // Activity trend calculation
      const firstHalf = userLogs.filter(log => log.timestamp >= normalizedStartDate && 
        log.timestamp <= new Date(normalizedStartDate.getTime() + (daysInPeriod / 2) * 24 * 60 * 60 * 1000));
      const secondHalf = userLogs.filter(log => log.timestamp > new Date(normalizedStartDate.getTime() + (daysInPeriod / 2) * 24 * 60 * 60 * 1000));
      
      let activityTrend: "Increasing" | "Decreasing" | "Stable" = "Stable";
      if (secondHalf.length > firstHalf.length * 1.2) {
        activityTrend = "Increasing";
      } else if (secondHalf.length < firstHalf.length * 0.8) {
        activityTrend = "Decreasing";
      }

      return {
        userId: user.id,
        userName: user.name || "Unknown",
        userEmail: user.email,
        userRole: user.role,
        lastActive: userLogs.length > 0 ? userLogs[0].timestamp : new Date(),
        totalActions,
        actionsThisPeriod: totalActions,
        dailyAverage,
        totalLogins,
        loginsThisPeriod: totalLogins,
        lastLogin,
        uniqueLoginDays,
        actionBreakdown,
        resourceBreakdown,
        propertyAccess,
        recentActivity,
        riskScore: Math.min(riskScore, 100),
        activityTrend,
        unusualActivity
      };
    });

    // Calculate daily activity
    const allDays = eachDayOfInterval({ start: normalizedStartDate, end: normalizedEndDate });
    const dailyActivity = allDays.map(date => {
      const dayLogs = auditLogs.filter(log => 
        format(log.timestamp, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
      const uniqueUsers = new Set(dayLogs.map(log => log.userId)).size;
      
      return {
        date,
        totalActions: dayLogs.length,
        uniqueUsers,
        averageActionsPerUser: uniqueUsers > 0 ? dayLogs.length / uniqueUsers : 0
      };
    });

    // Peak activity day
    const peakActivityDay = dailyActivity.reduce((peak, day) => 
      day.totalActions > peak.actions ? { date: day.date, actions: day.totalActions } : peak, 
      { date: normalizedStartDate, actions: 0 }
    );

    // Most active user
    const mostActiveUser = userData.reduce((most, current) => 
      current.totalActions > most.actions ? 
        { name: current.userName, email: current.userEmail, actions: current.totalActions } : 
        most, 
      { name: "", email: "", actions: 0 }
    );

    // Action analytics
    const allActionCounts = auditLogs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalActionsCount = auditLogs.length;
    const actionAnalytics = {
      totalActions: Object.entries(allActionCounts)
        .map(([action, count]) => {
          const uniqueUsers = new Set(auditLogs.filter(log => log.action === action).map(log => log.userId)).size;
          return {
            action,
            count: count as number,
            percentage: ((count as number) / totalActionsCount) * 100,
            uniqueUsers
          };
        })
        .sort((a, b) => b.count - a.count),

      resourceActivity: Object.entries(auditLogs.reduce((acc, log) => {
        acc[log.resource] = (acc[log.resource] || 0) + 1;
        return acc;
      }, {} as Record<string, number>))
        .map(([resource, count]) => {
          const resourceLogs = auditLogs.filter(log => log.resource === resource);
          const uniqueUsers = new Set(resourceLogs.map(log => log.userId)).size;
          const topUsers = Object.entries(resourceLogs.reduce((acc, log) => {
            if (log.user) {
              acc[log.user.name || log.user.email] = (acc[log.user.name || log.user.email] || 0) + 1;
            }
            return acc;
          }, {} as Record<string, number>))
            .sort(([,a], [,b]) => (b as number) - (a as number))
            .slice(0, 3)
            .map(([name]) => name);

          return {
            resource,
            count: count as number,
            percentage: ((count as number) / totalActionsCount) * 100,
            uniqueUsers,
            topUsers
          };
        })
        .sort((a, b) => b.count - a.count),

      securityEvents: [] // Would be populated based on specific security event patterns
    };

    // Top action
    const topAction = actionAnalytics.totalActions[0] || { action: "", count: 0, percentage: 0 };

    // Login analytics
    const loginLogs = auditLogs.filter(log => log.action === "LOGIN");
    const loginAnalytics = {
      totalLogins: loginLogs.length,
      uniqueLoginUsers: new Set(loginLogs.map(log => log.userId)).size,
      averageSessionDuration: 0, // Would need session tracking
      peakLoginHour: 0, // Would analyze login time patterns
      loginFailures: auditLogs.filter(log => log.action === "LOGIN_FAILED").length,
      deviceTypes: [],
      browsers: []
    };

    // Risk assessment
    const highRiskUsers = userData.filter(user => user.riskScore > 50).map(user => user.userName);
    const suspiciousActivities = userData
      .filter(user => user.unusualActivity.length > 0)
      .flatMap(user => user.unusualActivity.map(activity => ({
        userId: user.userId,
        userName: user.userName,
        activity,
        timestamp: user.lastActive,
        riskLevel: user.riskScore > 70 ? "High" as const : user.riskScore > 40 ? "Medium" as const : "Low" as const
      })));

    const recommendations = [];
    if (highRiskUsers.length > 0) {
      recommendations.push(`Review activity for ${highRiskUsers.length} high-risk users: ${highRiskUsers.slice(0, 3).join(", ")}`);
    }
    if (suspiciousActivities.length > 0) {
      recommendations.push(`Investigate ${suspiciousActivities.length} suspicious activity patterns`);
    }
    if (loginAnalytics.loginFailures > 10) {
      recommendations.push("High number of login failures detected - consider implementing additional security measures");
    }

    const reportTitle = selectedProperty 
      ? `User Activity & Audit Report - ${selectedProperty.name}`
      : "User Activity & Audit Report";

    return {
      dateRange: {
        from: normalizedStartDate,
        to: normalizedEndDate
      },
      reportTitle,
      summary: {
        totalUsers: userData.length,
        activeUsers: userData.filter(user => user.totalActions > 0).length,
        totalActions: totalActionsCount,
        uniqueResources: new Set(auditLogs.map(log => log.resource)).size,
        avgActionsPerUser: userData.length > 0 ? totalActionsCount / userData.length : 0,
        peakActivityDay: {
          date: peakActivityDay.date,
          actions: peakActivityDay.actions
        },
        mostActiveUser,
        topAction: {
          name: topAction.action,
          count: topAction.count,
          percentage: topAction.percentage
        }
      },
      userData,
      dailyActivity,
      actionAnalytics,
      locationAnalysis: [], // Would need IP geolocation
      loginAnalytics,
      riskAssessment: {
        overallRiskScore: userData.length > 0 ? userData.reduce((sum, user) => sum + user.riskScore, 0) / userData.length : 0,
        highRiskUsers,
        suspiciousActivities,
        recommendations
      },
      propertyInfo: selectedProperty
    };

  } catch (error) {
    console.error("Error generating user activity audit report:", error);
    throw new Error("Failed to generate user activity audit report");
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}