"use server";

import { headers } from "next/headers";
import { createAuditLogAction } from "@/actions/auditLogActions";
import type { AuditAction, AuditResource, CreateAuditLogData } from "@/types";

interface AuditParams {
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string | number;
  userId?: number;
  propertyId?: number;
  details?: any;
}

/**
 * Log an activity with automatic IP address and user agent capture
 */
export async function logActivity(params: AuditParams): Promise<void> {
  try {
    // Get request headers
    const headersList = await headers();
    const ipAddress = getClientIpAddress(headersList);
    const userAgent = headersList.get("user-agent") || undefined;

    // Create audit log data
    const auditData: CreateAuditLogData = {
      userId: params.userId,
      propertyId: params.propertyId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId?.toString(),
      details: params.details,
      ipAddress,
      userAgent,
    };

    // Create the audit log entry
    await createAuditLogAction(auditData);
  } catch (error) {
    // Log the error but don't throw to avoid breaking the main operation
    console.error("Failed to create audit log:", error);
  }
}

/**
 * Helper function to extract client IP address from headers
 */
function getClientIpAddress(headersList: Headers): string | undefined {
  // Check various headers in order of preference
  const possibleHeaders = [
    "x-forwarded-for",
    "x-real-ip",
    "cf-connecting-ip", // Cloudflare
    "x-client-ip",
    "x-forwarded",
    "forwarded-for",
    "forwarded",
  ];

  for (const header of possibleHeaders) {
    const value = headersList.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, get the first one
      const ip = value.split(",")[0].trim();
      if (ip && ip !== "unknown") {
        return ip;
      }
    }
  }

  return undefined;
}

/**
 * Utility function to create audit logs for user actions
 */
export async function auditUserAction(
  userId: number,
  action: AuditAction,
  resource: AuditResource,
  resourceId?: string | number,
  details?: any,
  propertyId?: number
): Promise<void> {
  await logActivity({
    userId,
    action,
    resource,
    resourceId,
    details,
    propertyId,
  });
}

/**
 * Utility function to create audit logs for system actions
 */
export async function auditSystemAction(
  action: AuditAction,
  resource: AuditResource,
  resourceId?: string | number,
  details?: any,
  propertyId?: number
): Promise<void> {
  await logActivity({
    action,
    resource,
    resourceId,
    details,
    propertyId,
  });
}

/**
 * Utility function to create audit logs for authentication events
 */
export async function auditAuthAction(
  userId: number,
  action: "LOGIN" | "LOGOUT" | "RESET_PASSWORD" | "CHANGE_PASSWORD",
  details?: any
): Promise<void> {
  await logActivity({
    userId,
    action,
    resource: "user",
    resourceId: userId,
    details,
  });
}

/**
 * Utility function to create audit logs for property access changes
 */
export async function auditPropertyAccess(
  userId: number,
  action: "GRANT_ACCESS" | "REVOKE_ACCESS",
  propertyId: number,
  targetUserId: number,
  details?: any
): Promise<void> {
  await logActivity({
    userId,
    action,
    resource: "property_access",
    resourceId: `${targetUserId}-${propertyId}`,
    propertyId,
    details: {
      ...details,
      targetUserId,
      propertyId,
    },
  });
}

/**
 * Utility function to create audit logs for data operations with before/after values
 */
export async function auditDataChange(
  userId: number,
  action: "CREATE" | "UPDATE" | "DELETE",
  resource: AuditResource,
  resourceId: string | number,
  beforeData?: any,
  afterData?: any,
  propertyId?: number
): Promise<void> {
  const details: any = {};

  if (action === "CREATE" && afterData) {
    details.created = afterData;
  } else if (action === "UPDATE" && beforeData && afterData) {
    details.before = beforeData;
    details.after = afterData;
    details.changes = getChangedFields(beforeData, afterData);
  } else if (action === "DELETE" && beforeData) {
    details.deleted = beforeData;
  }

  await logActivity({
    userId,
    action,
    resource,
    resourceId,
    details,
    propertyId,
  });
}

/**
 * Helper function to identify changed fields between before and after data
 */
function getChangedFields(before: any, after: any): Record<string, { from: any; to: any }> {
  const changes: Record<string, { from: any; to: any }> = {};

  if (!before || !after) return changes;

  // Compare all fields in the after object
  for (const key in after) {
    if (after.hasOwnProperty(key) && before.hasOwnProperty(key)) {
      const beforeValue = before[key];
      const afterValue = after[key];

      // Skip comparison for certain fields
      if (key === "updatedAt" || key === "updated_at") continue;

      // Handle different types of comparisons
      if (beforeValue !== afterValue) {
        // Handle Date objects
        if (beforeValue instanceof Date && afterValue instanceof Date) {
          if (beforeValue.getTime() !== afterValue.getTime()) {
            changes[key] = { from: beforeValue, to: afterValue };
          }
        } else {
          changes[key] = { from: beforeValue, to: afterValue };
        }
      }
    }
  }

  return changes;
}

/**
 * Utility function to sanitize sensitive data from audit logs
 */
export async function sanitizeAuditData(data: any): Promise<any> {
  if (!data || typeof data !== "object") return data;

  const sensitiveFields = ["password", "token", "secret", "key", "apiKey", "accessToken"];
  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = "[REDACTED]";
    }
  }

  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = await sanitizeAuditData(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Utility function to create audit logs for bulk operations
 */
export async function auditBulkOperation(
  userId: number,
  action: AuditAction,
  resource: AuditResource,
  operationDetails: {
    totalItems: number;
    successCount: number;
    failureCount: number;
    items?: any[];
  },
  propertyId?: number
): Promise<void> {
  await logActivity({
    userId,
    action,
    resource,
    details: {
      bulkOperation: true,
      ...operationDetails,
    },
    propertyId,
  });
}

/**
 * Utility function to create audit logs for report exports
 */
export async function auditReportExport(
  userId: number,
  reportType: string,
  filters: any,
  propertyId?: number
): Promise<void> {
  await logActivity({
    userId,
    action: "EXPORT",
    resource: "report",
    resourceId: reportType,
    details: {
      reportType,
      filters: await sanitizeAuditData(filters),
      exportedAt: new Date(),
    },
    propertyId,
  });
}