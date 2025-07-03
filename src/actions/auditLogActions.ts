"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { revalidatePath } from "next/cache";
import type { AuditLog, CreateAuditLogData, AuditLogFilters, AuditLogResponse } from "@/types";

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
    if (action) where.action = action;

    // Date range filter
    if (dateRange) {
      where.timestamp = {
        gte: dateRange.from,
        lte: dateRange.to,
      };
    }

    // Search filter
    if (searchTerm) {
      where.OR = [
        ...(where.OR || []),
        { action: { contains: searchTerm, mode: "insensitive" } },
        { resource: { contains: searchTerm, mode: "insensitive" } },
        { resourceId: { contains: searchTerm, mode: "insensitive" } },
        { user: { name: { contains: searchTerm, mode: "insensitive" } } },
        { user: { email: { contains: searchTerm, mode: "insensitive" } } },
      ];
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
      log.timestamp.toISOString(),
      log.user?.name || "System",
      log.user?.email || "",
      log.action,
      log.resource,
      log.resourceId || "",
      log.propertyId || "",
      log.ipAddress || "",
      log.userAgent || "",
      JSON.stringify(log.details || {}),
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