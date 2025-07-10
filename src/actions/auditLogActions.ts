"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { revalidatePath } from "next/cache";
import type { AuditLog, CreateAuditLogData, AuditLogFilters, AuditLogResponse } from "@/types";
import { formatChanges, formatValue, formatFieldName } from "@/lib/audit-formatting";
import { format } from "date-fns";

/**
 * Create a new audit log entry
 */
export async function createAuditLogAction(data: CreateAuditLogData): Promise<AuditLog> {
  try {
    const auditLog = await prisma.auditLog.create({
      data: {
        userId: data.userId,
        propertyId: data.propertyId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        details: data.details,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return auditLog;
  } catch (error) {
    console.error("Error creating audit log:", error);
    throw new Error("Failed to create audit log entry");
  }
}

/**
 * Get audit logs with filtering and pagination
 */
export async function getAuditLogsAction(filters: AuditLogFilters = {}): Promise<AuditLogResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Authentication required");
    }

    // Check permissions - only super_admin and property_admin can view audit logs
    if (currentUser.role !== "super_admin" && currentUser.role !== "property_admin") {
      throw new Error("Insufficient permissions to view audit logs");
    }

    const {
      userId,
      propertyId,
      resource,
      action,
      includeActions,
      excludeActions,
      dateRange,
      searchTerm,
      page = 1,
      limit = 25,
    } = filters;

    // Build where clause
    const where: any = {};

    // Property-based filtering for property_admin users
    if (currentUser.role === "property_admin") {
      // Property admins can only see logs for properties they have access to
      const userPropertyIds = currentUser.propertyAccess?.map(pa => pa.propertyId) || [];
      where.OR = [
        { propertyId: { in: userPropertyIds } },
        { propertyId: null }, // Include system-level logs
      ];
    }

    // Apply additional filters
    if (userId) where.userId = userId;
    if (propertyId) where.propertyId = propertyId;
    if (resource) where.resource = resource;
    
    // Handle action filtering - specific action, include actions, or exclude actions
    if (action && excludeActions && excludeActions.length > 0) {
      // If both are specified, include the action but exclude the excluded actions
      where.action = {
        AND: [
          { equals: action },
          { notIn: excludeActions }
        ]
      };
    } else if (action) {
      where.action = action;
    } else if (includeActions && includeActions.length > 0) {
      // Include only specific actions
      where.action = { in: includeActions };
    } else if (excludeActions && excludeActions.length > 0) {
      where.action = { notIn: excludeActions };
    }

    // Date range filter
    if (dateRange && (dateRange.from || dateRange.to)) {
      const timestampFilter: any = {};
      if (dateRange.from) {
        timestampFilter.gte = dateRange.from;
      }
      if (dateRange.to) {
        // Set to end of day for inclusive filtering
        const endOfDay = new Date(dateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        timestampFilter.lte = endOfDay;
      }
      where.timestamp = timestampFilter;
    }

    // Search filter
    if (searchTerm) {
      const searchConditions = [
        { action: { contains: searchTerm } },
        { resource: { contains: searchTerm } },
        { resourceId: { contains: searchTerm } },
        { ipAddress: { contains: searchTerm } },
        { user: { 
          OR: [
            { name: { contains: searchTerm } },
            { email: { contains: searchTerm } }
          ]
        } },
      ];

      if (where.OR) {
        // If we already have OR conditions (property-based filtering), combine them properly
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions }
        ];
        delete where.OR;
      } else {
        // If no existing OR conditions, just add search conditions
        where.OR = searchConditions;
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get total count
    const total = await prisma.auditLog.count({ where });

    // Get audit logs
    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      logs,
      total,
      page,
      limit,
      totalPages,
    };
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    throw new Error("Failed to fetch audit logs");
  }
}

/**
 * Get recent activity for dashboard widget
 */
export async function getRecentActivityAction(limit: number = 10): Promise<AuditLog[]> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Authentication required");
    }

    // Build where clause based on user role
    const where: any = {};

    // Property-based filtering for non-super_admin users
    if (currentUser.role !== "super_admin") {
      const userPropertyIds = currentUser.propertyAccess?.map(pa => pa.propertyId) || [];
      where.OR = [
        { propertyId: { in: userPropertyIds } },
        { propertyId: null }, // Include system-level logs
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
      take: limit,
    });

    return logs;
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    throw new Error("Failed to fetch recent activity");
  }
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStatsAction(): Promise<{
  totalLogs: number;
  todayLogs: number;
  uniqueUsers: number;
  topActions: Array<{ action: string; count: number }>;
  topResources: Array<{ resource: string; count: number }>;
}> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Authentication required");
    }

    // Check permissions
    if (currentUser.role !== "super_admin" && currentUser.role !== "property_admin") {
      throw new Error("Insufficient permissions to view audit log statistics");
    }

    // Build where clause based on user role
    const where: any = {};

    if (currentUser.role === "property_admin") {
      const userPropertyIds = currentUser.propertyAccess?.map(pa => pa.propertyId) || [];
      where.OR = [
        { propertyId: { in: userPropertyIds } },
        { propertyId: null },
      ];
    }

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get statistics
    const [totalLogs, todayLogs, uniqueUsersResult, topActionsResult, topResourcesResult] = await Promise.all([
      // Total logs count
      prisma.auditLog.count({ where }),

      // Today's logs count
      prisma.auditLog.count({
        where: {
          ...where,
          timestamp: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),

      // Unique users count
      prisma.auditLog.findMany({
        where,
        select: { userId: true },
        distinct: ["userId"],
      }),

      // Top actions
      prisma.auditLog.groupBy({
        by: ["action"],
        where,
        _count: {
          action: true,
        },
        orderBy: {
          _count: {
            action: "desc",
          },
        },
        take: 5,
      }),

      // Top resources
      prisma.auditLog.groupBy({
        by: ["resource"],
        where,
        _count: {
          resource: true,
        },
        orderBy: {
          _count: {
            resource: "desc",
          },
        },
        take: 5,
      }),
    ]);

    return {
      totalLogs,
      todayLogs,
      uniqueUsers: uniqueUsersResult.length,
      topActions: topActionsResult.map(item => ({
        action: item.action,
        count: item._count.action,
      })),
      topResources: topResourcesResult.map(item => ({
        resource: item.resource,
        count: item._count.resource,
      })),
    };
  } catch (error) {
    console.error("Error fetching audit log statistics:", error);
    throw new Error("Failed to fetch audit log statistics");
  }
}

/**
 * Format audit log details for human-readable export
 */
function formatDetailsForExport(details: any): string {
  if (!details || typeof details !== "object") {
    return details ? String(details) : "";
  }

  const sections: string[] = [];

  // Handle different types of audit details
  if (details.changes && typeof details.changes === "object") {
    const formattedChanges = formatChanges(details.changes);
    sections.push(`Changes (${formattedChanges.length}):`);
    
    formattedChanges.forEach(change => {
      if (change.type === 'simple') {
        const fromVal = formatValue(change.from, change.field);
        const toVal = formatValue(change.to, change.field);
        sections.push(`  • ${change.displayName}: ${fromVal} → ${toVal}`);
      } else if (change.type === 'array') {
        sections.push(`  • ${change.displayName}: ${change.summary}`);
        if (change.details) {
          sections.push(`    ${change.details}`);
        }
      } else if (change.type === 'object') {
        sections.push(`  • ${change.displayName}: ${change.summary}`);
        if (change.details) {
          sections.push(`    ${change.details}`);
        }
      }
    });
  }

  // Handle create operations
  if (details.created || (details.after && !details.before)) {
    const data = details.created || details.after;
    sections.push("Created Data:");
    Object.entries(data).forEach(([key, value]: [string, any]) => {
      sections.push(`  • ${formatFieldName(key)}: ${formatValue(value, key)}`);
    });
  }

  // Handle delete operations
  if (details.deleted || (details.before && !details.after)) {
    const data = details.deleted || details.before;
    sections.push("Deleted Data:");
    Object.entries(data).forEach(([key, value]: [string, any]) => {
      sections.push(`  • ${formatFieldName(key)}: ${formatValue(value, key)}`);
    });
  }

  // Handle bulk operations
  if (details.bulkOperation) {
    sections.push("Bulk Operation:");
    sections.push(`  • Total Items: ${details.totalItems || 0}`);
    sections.push(`  • Successful: ${details.successCount || 0}`);
    sections.push(`  • Failed: ${details.failureCount || 0}`);
    if (details.totalItems) {
      const successRate = Math.round((details.successCount / details.totalItems) * 100);
      sections.push(`  • Success Rate: ${successRate}%`);
    }
  }

  // Handle report exports
  if (details.reportType) {
    sections.push("Report Export:");
    sections.push(`  • Type: ${details.reportType}`);
    if (details.filters) {
      sections.push(`  • Filters Applied: Yes`);
    }
    if (details.exportedAt) {
      sections.push(`  • Exported At: ${formatValue(details.exportedAt)}`);
    }
  }

  // Handle other structured data
  if (sections.length === 0 && typeof details === "object") {
    sections.push("Additional Information:");
    Object.entries(details).forEach(([key, value]: [string, any]) => {
      if (!['changes', 'created', 'deleted', 'before', 'after', 'bulkOperation'].includes(key)) {
        sections.push(`  • ${formatFieldName(key)}: ${formatValue(value, key)}`);
      }
    });
  }

  return sections.length > 0 ? sections.join('\n') : "No additional details";
}

/**
 * Export audit logs as CSV
 */
export async function exportAuditLogsAction(filters: AuditLogFilters = {}): Promise<string> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Authentication required");
    }

    // Check permissions - only super_admin can export
    if (currentUser.role !== "super_admin") {
      throw new Error("Only super administrators can export audit logs");
    }

    // Get all logs matching the filters (no pagination for export)
    const { logs } = await getAuditLogsAction({ ...filters, page: 1, limit: 10000 });

    // Create CSV header
    const csvHeader = [
      "Timestamp",
      "User",
      "User Email",
      "Action",
      "Resource",
      "Resource ID",
      "Property ID",
      "IP Address",
      "User Agent",
      "Details",
    ].join(",");

    // Create CSV rows
    const csvRows = logs.map(log => [
      format(log.timestamp, "yyyy-MM-dd HH:mm:ss"),
      log.user?.name || "System",
      log.user?.email || "",
      log.action,
      log.resource,
      log.resourceId || "",
      log.propertyId || "",
      log.ipAddress || "",
      log.userAgent || "",
      formatDetailsForExport(log.details),
    ].map(field => `"${field.toString().replace(/"/g, '""')}"`).join(","));

    // Create audit log for this export
    await createAuditLogAction({
      userId: currentUser.id,
      action: "EXPORT",
      resource: "audit_log",
      details: { filters, exportCount: logs.length },
    });

    return [csvHeader, ...csvRows].join("\n");
  } catch (error) {
    console.error("Error exporting audit logs:", error);
    throw new Error("Failed to export audit logs");
  }
}

/**
 * Delete old audit logs (retention policy)
 */
export async function cleanupOldAuditLogsAction(retentionDays: number = 365): Promise<{ deletedCount: number }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Authentication required");
    }

    // Check permissions - only super_admin can cleanup
    if (currentUser.role !== "super_admin") {
      throw new Error("Only super administrators can cleanup audit logs");
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    // Create audit log for this cleanup
    await createAuditLogAction({
      userId: currentUser.id,
      action: "DELETE",
      resource: "audit_log",
      details: { retentionDays, deletedCount: result.count, cutoffDate },
    });

    revalidatePath("/dashboard/activity-log");

    return { deletedCount: result.count };
  } catch (error) {
    console.error("Error cleaning up audit logs:", error);
    throw new Error("Failed to cleanup old audit logs");
  }
}

/**
 * Get general audit log statistics (excluding login/logout activities)
 */
export async function getGeneralAuditLogStatsAction(): Promise<{
  totalLogs: number;
  todayLogs: number;
  uniqueUsers: number;
  topActions: Array<{ action: string; count: number }>;
  topResources: Array<{ resource: string; count: number }>;
}> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Authentication required");
    }

    // Check permissions
    if (currentUser.role !== "super_admin" && currentUser.role !== "property_admin") {
      throw new Error("Insufficient permissions to view audit log statistics");
    }

    // Build where clause based on user role, excluding login/logout activities
    const where: any = {
      action: {
        notIn: ["LOGIN", "LOGOUT"] // Exclude authentication activities
      }
    };

    if (currentUser.role === "property_admin") {
      const userPropertyIds = currentUser.propertyAccess?.map(pa => pa.propertyId) || [];
      where.OR = [
        { propertyId: { in: userPropertyIds } },
        { propertyId: null },
      ];
    }

    // Get total logs (excluding login/logout)
    const totalLogs = await prisma.auditLog.count({
      where,
    });

    // Get today's logs
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayLogs = await prisma.auditLog.count({
      where: {
        ...where,
        timestamp: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    // Get unique users
    const uniqueUsersResult = await prisma.auditLog.findMany({
      where,
      select: {
        userId: true,
      },
      distinct: ["userId"],
    });

    const uniqueUsers = uniqueUsersResult.filter(u => u.userId !== null).length;

    // Get top actions
    const topActionsResult = await prisma.auditLog.groupBy({
      by: ["action"],
      where,
      _count: {
        action: true,
      },
      orderBy: {
        _count: {
          action: "desc",
        },
      },
      take: 5,
    });

    const topActions = topActionsResult.map(item => ({
      action: item.action,
      count: item._count.action,
    }));

    // Get top resources
    const topResourcesResult = await prisma.auditLog.groupBy({
      by: ["resource"],
      where,
      _count: {
        resource: true,
      },
      orderBy: {
        _count: {
          resource: "desc",
        },
      },
      take: 5,
    });

    const topResources = topResourcesResult.map(item => ({
      resource: item.resource,
      count: item._count.resource,
    }));

    return {
      totalLogs,
      todayLogs,
      uniqueUsers,
      topActions,
      topResources,
    };
  } catch (error) {
    console.error("Error fetching general audit log statistics:", error);
    throw new Error("Failed to fetch general audit log statistics");
  }
}

/**
 * Get user activity (login/logout) statistics
 */
export async function getUserActivityStatsAction(): Promise<{
  totalLoginSessions: number;
  todayLogins: number;
  uniqueUsers: number;
  avgSessionDuration: string;
  recentLogins: Array<{ 
    userId: number; 
    userEmail: string; 
    userName: string; 
    loginTime: Date; 
    ipAddress?: string; 
  }>;
}> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Authentication required");
    }

    // Check permissions
    if (currentUser.role !== "super_admin" && currentUser.role !== "property_admin") {
      throw new Error("Insufficient permissions to view user activity statistics");
    }

    // Build where clause for user authentication activities
    const authWhere: any = {
      resource: "user",
      action: { in: ["LOGIN", "LOGOUT"] },
    };

    if (currentUser.role === "property_admin") {
      const userPropertyIds = currentUser.propertyAccess?.map(pa => pa.propertyId) || [];
      authWhere.OR = [
        { propertyId: { in: userPropertyIds } },
        { propertyId: null },
      ];
    }

    // Get total login sessions (LOGIN actions)
    const totalLoginSessions = await prisma.auditLog.count({
      where: {
        ...authWhere,
        action: "LOGIN",
      },
    });

    // Get today's logins
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayLogins = await prisma.auditLog.count({
      where: {
        ...authWhere,
        action: "LOGIN",
        timestamp: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    // Get unique users with login activity
    const uniqueUsersResult = await prisma.auditLog.findMany({
      where: {
        ...authWhere,
        action: "LOGIN",
      },
      select: {
        userId: true,
      },
      distinct: ["userId"],
    });

    const uniqueUsers = uniqueUsersResult.length;

    // Get recent logins for display
    const recentLoginLogs = await prisma.auditLog.findMany({
      where: {
        ...authWhere,
        action: "LOGIN",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
      take: 10,
    });

    const recentLogins = recentLoginLogs.map(log => ({
      userId: log.userId || 0,
      userEmail: log.user?.email || "Unknown",
      userName: log.user?.name || "Unknown User",
      loginTime: log.timestamp,
      ipAddress: log.ipAddress,
    }));

    // Calculate average session duration (placeholder calculation)
    // In a real implementation, you'd match LOGIN/LOGOUT pairs
    const avgSessionDuration = "2h 15m"; // Placeholder

    return {
      totalLoginSessions,
      todayLogins,
      uniqueUsers,
      avgSessionDuration,
      recentLogins,
    };
  } catch (error) {
    console.error("Error fetching user activity statistics:", error);
    throw new Error("Failed to fetch user activity statistics");
  }
}