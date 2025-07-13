/**
 * Session Refresh Utilities
 * Helpers for refreshing user session data when permissions change
 */

import { prisma } from "@/lib/prisma";
import { PermissionService } from "@/lib/permission-utils";
import type { UserRole } from "@/types";

/**
 * Get latest user permissions from database
 * Used to refresh session data when permissions are updated
 */
export async function getLatestUserPermissions(userId: number): Promise<string[]> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const mockUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      department: user.department,
      phoneNumber: user.phoneNumber,
      isActive: user.isActive,
      permissions: user.permissions ? JSON.parse(JSON.stringify(user.permissions)) : [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return await PermissionService.getUserPermissions(mockUser);
  } catch (error) {
    console.error('Error getting latest user permissions:', error);
    return [];
  }
}

/**
 * Get user data for session refresh
 */
export async function getUserForSessionRefresh(userId: number) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return null;
    }

    const permissions = await getLatestUserPermissions(userId);

    return {
      id: user.id.toString(),
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      department: user.department,
      phoneNumber: user.phoneNumber,
      profileImage: user.profileImage,
      lastLoginAt: user.lastLoginAt?.toISOString(),
      twoFactorEnabled: user.twoFactorEnabled || false,
      passwordExpired: false,
      accessibleProperties: [], // TODO: Load from database when schema is updated
      permissions,
    };
  } catch (error) {
    console.error('Error getting user for session refresh:', error);
    return null;
  }
}

/**
 * Trigger session refresh for a user
 * Call this after updating user permissions
 */
export async function triggerSessionRefresh(userId: number) {
  // In a real-world scenario, you might:
  // 1. Invalidate the user's current session
  // 2. Send a message to the client to refresh
  // 3. Use WebSockets to notify the client
  // 4. Set a flag for the client to check
  
  console.log(`Session refresh triggered for user ${userId}`);
  
  // For now, we'll just log it
  // The client will get updated permissions on next session check
}

/**
 * Trigger session refresh for all users with a specific role
 * Call this after updating role permissions
 */
export async function triggerSessionRefreshForRole(role: string) {
  try {
    const users = await prisma.user.findMany({
      where: { role },
      select: { id: true }
    });

    console.log(`Session refresh triggered for ${users.length} users with role: ${role}`);
    
    // Store the refresh timestamp in a way that clients can check
    // For now, we'll use a simple approach - in production you might use Redis, WebSockets, etc.
    await storePermissionUpdateTimestamp(role);
    
    // In a production system, you would:
    // 1. Invalidate all sessions for users with this role
    // 2. Send push notifications to refresh sessions
    // 3. Use WebSockets or SSE to notify connected clients
    // 4. Use Redis pub/sub to notify all app instances
    
    console.log(`Permission update stored for role: ${role}`);
  } catch (error) {
    console.error('Error triggering session refresh for role:', error);
  }
}

/**
 * Store permission update timestamp for a role
 * This allows clients to check if their permissions need refreshing
 */
async function storePermissionUpdateTimestamp(role: string) {
  try {
    // For now, we'll store this in the database
    // In production, you might use Redis or another cache
    await prisma.$executeRaw`
      INSERT INTO permission_updates (role, updated_at) 
      VALUES (${role}, NOW()) 
      ON CONFLICT (role) 
      DO UPDATE SET updated_at = NOW()
    `;
  } catch (error) {
    // Table might not exist yet - this is a simple fallback approach
    console.log('Permission update timestamp storage not available, using memory approach');
    
    // Store in memory as fallback (this won't work across multiple server instances)
    if (!global.permissionUpdates) {
      global.permissionUpdates = new Map();
    }
    global.permissionUpdates.set(role, new Date());
  }
}

/**
 * Check if permissions have been updated for a role since a given timestamp
 */
export async function checkPermissionUpdates(role: string, since: Date): Promise<boolean> {
  try {
    const result = await prisma.$queryRaw`
      SELECT updated_at FROM permission_updates 
      WHERE role = ${role} AND updated_at > ${since}
      LIMIT 1
    `;
    
    return Array.isArray(result) && result.length > 0;
  } catch (error) {
    // Fallback to memory approach
    if (global.permissionUpdates) {
      const lastUpdate = global.permissionUpdates.get(role);
      return lastUpdate && lastUpdate > since;
    }
    return false;
  }
}