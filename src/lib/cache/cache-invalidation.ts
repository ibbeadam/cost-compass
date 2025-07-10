/**
 * Intelligent Cache Invalidation System
 * Automatically invalidates permission caches when relevant data changes
 */

import { PermissionCache } from "./permission-cache";
import { prisma } from "@/lib/prisma";
import { PropertyAccessService } from "@/lib/property-access";

export type CacheInvalidationEvent = 
  | 'user_role_changed'
  | 'user_permissions_changed'
  | 'property_access_granted'
  | 'property_access_revoked'
  | 'property_created'
  | 'property_deleted'
  | 'user_created'
  | 'user_deleted'
  | 'role_permissions_updated'
  | 'system_permissions_updated';

export interface CacheInvalidationContext {
  userId?: number;
  propertyId?: number;
  role?: string;
  affectedUsers?: number[];
  affectedProperties?: number[];
  reason: string;
}

/**
 * Cache Invalidation Service
 */
export class CacheInvalidationService {
  
  /**
   * Handle cache invalidation based on event type
   */
  static async invalidate(
    event: CacheInvalidationEvent,
    context: CacheInvalidationContext
  ): Promise<void> {
    try {
      console.log(`Cache invalidation triggered: ${event}`, context);

      switch (event) {
        case 'user_role_changed':
          await this.handleUserRoleChanged(context);
          break;
          
        case 'user_permissions_changed':
          await this.handleUserPermissionsChanged(context);
          break;
          
        case 'property_access_granted':
        case 'property_access_revoked':
          await this.handlePropertyAccessChanged(context);
          break;
          
        case 'property_created':
        case 'property_deleted':
          await this.handlePropertyChanged(context);
          break;
          
        case 'user_created':
        case 'user_deleted':
          await this.handleUserChanged(context);
          break;
          
        case 'role_permissions_updated':
          await this.handleRolePermissionsUpdated(context);
          break;
          
        case 'system_permissions_updated':
          await this.handleSystemPermissionsUpdated(context);
          break;
          
        default:
          console.warn(`Unknown cache invalidation event: ${event}`);
      }

      // Log the invalidation for monitoring
      await this.logInvalidation(event, context);
      
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * Handle user role change
   */
  private static async handleUserRoleChanged(context: CacheInvalidationContext): Promise<void> {
    if (!context.userId) return;

    // Invalidate all user-specific caches
    await PermissionCache.invalidateUserCache(context.userId);
    
    // Also invalidate role-based cache if specific role is mentioned
    if (context.role) {
      await PermissionCache.invalidateRoleCache(context.role as any);
    }
  }

  /**
   * Handle user permissions change
   */
  private static async handleUserPermissionsChanged(context: CacheInvalidationContext): Promise<void> {
    if (!context.userId) return;

    // Invalidate all user-specific caches
    await PermissionCache.invalidateUserCache(context.userId);
  }

  /**
   * Handle property access change
   */
  private static async handlePropertyAccessChanged(context: CacheInvalidationContext): Promise<void> {
    // Invalidate property-specific cache
    if (context.propertyId) {
      await PermissionCache.invalidatePropertyCache(context.propertyId);
    }

    // Invalidate user-specific cache
    if (context.userId) {
      await PermissionCache.invalidateUserCache(context.userId);
    }

    // Invalidate for multiple users if specified
    if (context.affectedUsers) {
      for (const userId of context.affectedUsers) {
        await PermissionCache.invalidateUserCache(userId);
      }
    }
  }

  /**
   * Handle property creation/deletion
   */
  private static async handlePropertyChanged(context: CacheInvalidationContext): Promise<void> {
    // Clear property-related caches
    if (context.propertyId) {
      await PermissionCache.invalidatePropertyCache(context.propertyId);
    }

    // For property creation, we might need to refresh all user property lists
    // since super admins now have access to the new property
    if (context.affectedUsers) {
      for (const userId of context.affectedUsers) {
        await PermissionCache.invalidateUserCache(userId);
      }
    }
  }

  /**
   * Handle user creation/deletion
   */
  private static async handleUserChanged(context: CacheInvalidationContext): Promise<void> {
    if (context.userId) {
      await PermissionCache.invalidateUserCache(context.userId);
    }
  }

  /**
   * Handle role permissions update
   */
  private static async handleRolePermissionsUpdated(context: CacheInvalidationContext): Promise<void> {
    // Invalidate role-specific cache
    if (context.role) {
      await PermissionCache.invalidateRoleCache(context.role as any);
    }

    // Find all users with this role and invalidate their caches
    if (context.role) {
      const usersWithRole = await prisma.user.findMany({
        where: { role: context.role as any },
        select: { id: true }
      });

      for (const user of usersWithRole) {
        await PermissionCache.invalidateUserCache(user.id);
      }
    }
  }

  /**
   * Handle system-wide permissions update
   */
  private static async handleSystemPermissionsUpdated(context: CacheInvalidationContext): Promise<void> {
    // Clear all caches
    await PermissionCache.clearAllCache();
  }

  /**
   * Log cache invalidation for monitoring
   */
  private static async logInvalidation(
    event: CacheInvalidationEvent,
    context: CacheInvalidationContext
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: context.userId || 0,
          propertyId: context.propertyId,
          action: 'CACHE_INVALIDATION',
          resource: 'cache',
          resourceId: event,
          details: {
            event,
            context,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      console.error('Error logging cache invalidation:', error);
    }
  }

  /**
   * Smart invalidation based on data change detection
   */
  static async smartInvalidate(
    resourceType: 'user' | 'property' | 'property_access' | 'permission',
    resourceId: string | number,
    changeType: 'create' | 'update' | 'delete',
    changes?: Record<string, any>
  ): Promise<void> {
    try {
      switch (resourceType) {
        case 'user':
          if (changes?.role) {
            await this.invalidate('user_role_changed', {
              userId: Number(resourceId),
              role: changes.role,
              reason: 'Role updated'
            });
          }
          if (changes?.permissions) {
            await this.invalidate('user_permissions_changed', {
              userId: Number(resourceId),
              reason: 'Permissions updated'
            });
          }
          break;

        case 'property':
          if (changeType === 'create') {
            // Get all super admins who now have access to this property
            const superAdmins = await prisma.user.findMany({
              where: { role: 'super_admin' },
              select: { id: true }
            });

            await this.invalidate('property_created', {
              propertyId: Number(resourceId),
              affectedUsers: superAdmins.map(u => u.id),
              reason: 'Property created'
            });
          } else if (changeType === 'delete') {
            await this.invalidate('property_deleted', {
              propertyId: Number(resourceId),
              reason: 'Property deleted'
            });
          }
          break;

        case 'property_access':
          const accessData = changes || {};
          await this.invalidate(
            changeType === 'delete' ? 'property_access_revoked' : 'property_access_granted',
            {
              userId: accessData.userId,
              propertyId: accessData.propertyId,
              reason: `Property access ${changeType}d`
            }
          );
          break;

        case 'permission':
          // This would be for system-wide permission changes
          await this.invalidate('system_permissions_updated', {
            reason: 'System permissions updated'
          });
          break;
      }
    } catch (error) {
      console.error('Smart invalidation error:', error);
    }
  }

  /**
   * Preemptive cache warming for critical paths
   */
  static async warmCache(userId: number, propertyIds?: number[]): Promise<void> {
    try {
      // Get user's accessible properties if not provided
      if (!propertyIds) {
        const properties = await PropertyAccessService.getUserAccessibleProperties(userId);
        propertyIds = properties.map(p => p.id);
      }

      // Warm up user permissions for each property
      const warmupPromises = propertyIds.map(async (propertyId) => {
        // This will cache the permissions
        await PropertyAccessService.getUserPropertyPermissions(userId, propertyId);
        
        // This will cache the property access
        await PropertyAccessService.canAccessProperty(userId, propertyId, 'read_only');
      });

      await Promise.all(warmupPromises);

      console.log(`Cache warmed for user ${userId} across ${propertyIds.length} properties`);
    } catch (error) {
      console.error('Cache warming error:', error);
    }
  }

  /**
   * Get cache health metrics
   */
  static async getCacheHealth(): Promise<{
    stats: any;
    health: 'healthy' | 'degraded' | 'critical';
    recommendations: string[];
  }> {
    try {
      const stats = await PermissionCache.getCacheStats();
      const recommendations: string[] = [];
      
      let health: 'healthy' | 'degraded' | 'critical' = 'healthy';

      // Analyze cache health
      if (stats.totalKeys === 0) {
        health = 'critical';
        recommendations.push('Cache is empty - consider warming critical paths');
      } else if (stats.totalKeys < 100) {
        health = 'degraded';
        recommendations.push('Cache hit ratio may be low - consider longer TTL values');
      }

      if (stats.userPermissionKeys > 10000) {
        recommendations.push('Consider implementing LRU eviction or reducing TTL');
      }

      return {
        stats,
        health,
        recommendations
      };
    } catch (error) {
      console.error('Error getting cache health:', error);
      return {
        stats: {},
        health: 'critical',
        recommendations: ['Cache system error - check connectivity']
      };
    }
  }
}

/**
 * Database hooks for automatic cache invalidation
 */
export class DatabaseCacheHooks {
  
  /**
   * Hook for user updates
   */
  static async onUserUpdate(
    userId: number,
    oldData: any,
    newData: any
  ): Promise<void> {
    const changes: Record<string, any> = {};
    
    // Detect role changes
    if (oldData.role !== newData.role) {
      changes.role = newData.role;
    }
    
    // Detect permission-related changes
    if (oldData.isActive !== newData.isActive) {
      changes.isActive = newData.isActive;
    }

    if (Object.keys(changes).length > 0) {
      await CacheInvalidationService.smartInvalidate('user', userId, 'update', changes);
    }
  }

  /**
   * Hook for property access updates
   */
  static async onPropertyAccessUpdate(
    accessData: {
      userId: number;
      propertyId: number;
      accessLevel?: string;
    },
    changeType: 'create' | 'update' | 'delete'
  ): Promise<void> {
    await CacheInvalidationService.smartInvalidate('property_access', '', changeType, accessData);
  }

  /**
   * Hook for property updates
   */
  static async onPropertyUpdate(
    propertyId: number,
    changeType: 'create' | 'update' | 'delete'
  ): Promise<void> {
    await CacheInvalidationService.smartInvalidate('property', propertyId, changeType);
  }
}

/**
 * Middleware to automatically invalidate cache on relevant API calls
 */
export function withCacheInvalidation(
  handler: Function,
  invalidationConfig: {
    events: CacheInvalidationEvent[];
    extractContext?: (request: any, response: any) => CacheInvalidationContext;
  }
) {
  return async (request: any, ...args: any[]) => {
    const response = await handler(request, ...args);
    
    // Only invalidate on successful operations
    if (response.status < 400) {
      try {
        for (const event of invalidationConfig.events) {
          const context = invalidationConfig.extractContext
            ? invalidationConfig.extractContext(request, response)
            : { reason: 'API operation' };
            
          await CacheInvalidationService.invalidate(event, context);
        }
      } catch (error) {
        console.error('Cache invalidation middleware error:', error);
        // Don't fail the request due to cache issues
      }
    }
    
    return response;
  };
}