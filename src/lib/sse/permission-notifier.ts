/**
 * Permission Update Notifier
 * Manages Server-Sent Events connections for real-time permission updates
 * Provides cross-device/cross-browser synchronization
 */

import type { UserRole } from "@/types";

export interface PermissionUpdateData {
  type: 'permission_updated' | 'role_updated' | 'user_updated' | 'connected' | 'heartbeat';
  message: string;
  timestamp: string;
  userId?: number;
  userRole?: string;
  affectedRole?: string;
  affectedUsers?: number[];
  permissionName?: string;
  action?: 'granted' | 'revoked';
  requiresRefresh?: boolean;
}

interface SSEConnection {
  id: string;
  userId: number;
  userRole: string;
  callback: (data: PermissionUpdateData) => void;
  lastActivity: Date;
}

/**
 * Global notification service for permission updates
 * Singleton pattern to manage all SSE connections
 */
class PermissionUpdateNotifierService {
  private connections = new Map<string, SSEConnection>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up stale connections every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 5 * 60 * 1000);
  }

  /**
   * Add a new SSE connection
   */
  addConnection(
    userId: number, 
    userRole: string, 
    callback: (data: PermissionUpdateData) => void
  ): string {
    const connectionId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.connections.set(connectionId, {
      id: connectionId,
      userId,
      userRole,
      callback,
      lastActivity: new Date()
    });

    console.log(`✅ SSE connection added: ${connectionId} (User: ${userId}, Role: ${userRole})`);
    console.log(`📊 Total active connections: ${this.connections.size}`);

    return connectionId;
  }

  /**
   * Remove an SSE connection
   */
  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.connections.delete(connectionId);
      console.log(`❌ SSE connection removed: ${connectionId} (User: ${connection.userId})`);
      console.log(`📊 Total active connections: ${this.connections.size}`);
    }
  }

  /**
   * Notify all users with a specific role about permission changes
   */
  notifyRolePermissionUpdate(
    affectedRole: string,
    permissionName: string,
    action: 'granted' | 'revoked',
    adminUserId?: number
  ): void {
    const updateData: PermissionUpdateData = {
      type: 'role_updated',
      message: `Permission ${action} for role ${affectedRole}`,
      timestamp: new Date().toISOString(),
      affectedRole,
      permissionName,
      action,
      requiresRefresh: true
    };

    let notifiedCount = 0;
    const affectedUsers: number[] = [];

    // Notify all users with the affected role
    for (const [connectionId, connection] of this.connections) {
      if (connection.userRole === affectedRole) {
        try {
          connection.callback(updateData);
          connection.lastActivity = new Date();
          notifiedCount++;
          affectedUsers.push(connection.userId);
        } catch (error) {
          console.error(`Error notifying connection ${connectionId}:`, error);
          this.connections.delete(connectionId);
        }
      }
    }

    // Also notify all admins about the change
    this.notifyAdmins({
      ...updateData,
      affectedUsers,
      message: `Admin updated permissions for role ${affectedRole}: ${permissionName} ${action}`
    }, adminUserId);

    console.log(`🔔 Notified ${notifiedCount} users with role "${affectedRole}" about permission update`);
  }

  /**
   * Notify specific users about their permission changes
   */
  notifyUserPermissionUpdate(
    userId: number,
    permissionName: string,
    action: 'granted' | 'revoked',
    adminUserId?: number
  ): void {
    const updateData: PermissionUpdateData = {
      type: 'user_updated',
      message: `Your permission has been ${action}: ${permissionName}`,
      timestamp: new Date().toISOString(),
      userId,
      permissionName,
      action,
      requiresRefresh: true
    };

    let notifiedCount = 0;

    // Notify all connections for this specific user
    for (const [connectionId, connection] of this.connections) {
      if (connection.userId === userId) {
        try {
          connection.callback(updateData);
          connection.lastActivity = new Date();
          notifiedCount++;
        } catch (error) {
          console.error(`Error notifying connection ${connectionId}:`, error);
          this.connections.delete(connectionId);
        }
      }
    }

    // Notify admins about the change
    this.notifyAdmins({
      ...updateData,
      message: `Admin updated permissions for user ${userId}: ${permissionName} ${action}`
    }, adminUserId);

    console.log(`🔔 Notified ${notifiedCount} connections for user ${userId} about permission update`);
  }

  /**
   * Notify all connected users about a general permission system update
   */
  notifyGlobalPermissionUpdate(message: string, adminUserId?: number): void {
    const updateData: PermissionUpdateData = {
      type: 'permission_updated',
      message,
      timestamp: new Date().toISOString(),
      requiresRefresh: true
    };

    let notifiedCount = 0;

    for (const [connectionId, connection] of this.connections) {
      // Don't notify the admin who triggered the update
      if (adminUserId && connection.userId === adminUserId) {
        continue;
      }

      try {
        connection.callback(updateData);
        connection.lastActivity = new Date();
        notifiedCount++;
      } catch (error) {
        console.error(`Error notifying connection ${connectionId}:`, error);
        this.connections.delete(connectionId);
      }
    }

    console.log(`🌐 Global notification sent to ${notifiedCount} users: ${message}`);
  }

  /**
   * Notify admin users about permission changes
   */
  private notifyAdmins(updateData: PermissionUpdateData, excludeUserId?: number): void {
    const adminRoles = ['super_admin', 'property_admin'];
    let notifiedAdmins = 0;

    for (const [connectionId, connection] of this.connections) {
      if (
        adminRoles.includes(connection.userRole) && 
        (!excludeUserId || connection.userId !== excludeUserId)
      ) {
        try {
          connection.callback({
            ...updateData,
            type: 'permission_updated',
            requiresRefresh: false // Admins don't need to refresh, just awareness
          });
          connection.lastActivity = new Date();
          notifiedAdmins++;
        } catch (error) {
          console.error(`Error notifying admin connection ${connectionId}:`, error);
          this.connections.delete(connectionId);
        }
      }
    }

    if (notifiedAdmins > 0) {
      console.log(`👨‍💼 Notified ${notifiedAdmins} admin users about permission change`);
    }
  }

  /**
   * Clean up stale connections that haven't been active
   */
  private cleanupStaleConnections(): void {
    const staleThreshold = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes
    let removedCount = 0;

    for (const [connectionId, connection] of this.connections) {
      if (connection.lastActivity < staleThreshold) {
        this.connections.delete(connectionId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} stale SSE connections`);
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    connectionsByRole: Record<string, number>;
    connectionsByUser: Record<number, number>;
  } {
    const stats = {
      totalConnections: this.connections.size,
      connectionsByRole: {} as Record<string, number>,
      connectionsByUser: {} as Record<number, number>
    };

    for (const connection of this.connections.values()) {
      // Count by role
      stats.connectionsByRole[connection.userRole] = 
        (stats.connectionsByRole[connection.userRole] || 0) + 1;

      // Count by user
      stats.connectionsByUser[connection.userId] = 
        (stats.connectionsByUser[connection.userId] || 0) + 1;
    }

    return stats;
  }

  /**
   * Graceful shutdown
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.connections.clear();
    console.log('🛑 Permission Update Notifier shut down');
  }
}

// Export singleton instance
export const PermissionUpdateNotifier = new PermissionUpdateNotifierService();

// Cleanup on process exit
process.on('beforeExit', () => {
  PermissionUpdateNotifier.shutdown();
});