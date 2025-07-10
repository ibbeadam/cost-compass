/**
 * High-Performance Permission Caching System
 * Provides Redis-based caching with intelligent invalidation for permissions and property access
 */

import { PropertyAccessService } from "@/lib/property-access";
import { getRolePermissions, getAccessLevelPermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { User, PropertyAccessLevel, UserRole } from "@/types";

// In-memory cache as fallback when Redis is not available
const memoryCache = new Map<string, { data: any; expiry: number }>();
const MEMORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache configuration
const CACHE_CONFIG = {
  USER_PERMISSIONS: {
    ttl: 15 * 60, // 15 minutes
    keyPrefix: 'perm:user:',
  },
  PROPERTY_ACCESS: {
    ttl: 10 * 60, // 10 minutes
    keyPrefix: 'access:prop:',
  },
  ROLE_PERMISSIONS: {
    ttl: 60 * 60, // 1 hour (roles change rarely)
    keyPrefix: 'perm:role:',
  },
  USER_PROPERTIES: {
    ttl: 10 * 60, // 10 minutes
    keyPrefix: 'props:user:',
  },
  PERMISSION_HIERARCHY: {
    ttl: 30 * 60, // 30 minutes
    keyPrefix: 'hierarchy:',
  }
};

/**
 * Redis-compatible cache interface
 * Adapts to different cache backends (Redis, memory, etc.)
 */
interface CacheBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  keys(pattern: string): Promise<string[]>;
  mget(keys: string[]): Promise<(string | null)[]>;
  mset(keyValues: Record<string, string>, ttl?: number): Promise<void>;
}

/**
 * Memory cache backend (fallback)
 */
class MemoryCacheBackend implements CacheBackend {
  async get(key: string): Promise<string | null> {
    const item = memoryCache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      memoryCache.delete(key);
      return null;
    }
    
    return JSON.stringify(item.data);
  }

  async set(key: string, value: string, ttl: number = MEMORY_CACHE_TTL): Promise<void> {
    memoryCache.set(key, {
      data: JSON.parse(value),
      expiry: Date.now() + ttl * 1000
    });
  }

  async del(key: string): Promise<void> {
    memoryCache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const item = memoryCache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiry) {
      memoryCache.delete(key);
      return false;
    }
    
    return true;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(memoryCache.keys()).filter(key => regex.test(key));
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    return Promise.all(keys.map(key => this.get(key)));
  }

  async mset(keyValues: Record<string, string>, ttl: number = MEMORY_CACHE_TTL): Promise<void> {
    const expiry = Date.now() + ttl * 1000;
    Object.entries(keyValues).forEach(([key, value]) => {
      memoryCache.set(key, {
        data: JSON.parse(value),
        expiry
      });
    });
  }
}

/**
 * Redis cache backend (when available)
 */
class RedisCacheBackend implements CacheBackend {
  private redis: any = null;

  constructor() {
    this.initRedis();
  }

  private async initRedis() {
    try {
      if (process.env.REDIS_URL) {
        // Dynamic import for Redis to avoid build issues when not available
        const { createClient } = await import('redis');
        this.redis = createClient({ url: process.env.REDIS_URL });
        await this.redis.connect();
        console.log('Redis cache backend initialized');
      }
    } catch (error) {
      console.warn('Redis not available, using memory cache:', error);
      this.redis = null;
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.redis) return null;
    try {
      return await this.redis.get(key);
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.redis) return;
    try {
      if (ttl) {
        await this.redis.setEx(key, ttl, value);
      } else {
        await this.redis.set(key, value);
      }
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Redis del error:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.redis) return false;
    try {
      return (await this.redis.exists(key)) === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.redis) return [];
    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      console.error('Redis keys error:', error);
      return [];
    }
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    if (!this.redis || keys.length === 0) return [];
    try {
      return await this.redis.mGet(keys);
    } catch (error) {
      console.error('Redis mget error:', error);
      return keys.map(() => null);
    }
  }

  async mset(keyValues: Record<string, string>, ttl?: number): Promise<void> {
    if (!this.redis) return;
    try {
      const pairs = Object.entries(keyValues).flat();
      await this.redis.mSet(pairs);
      
      if (ttl) {
        // Set expiration for each key
        const expirePromises = Object.keys(keyValues).map(key => 
          this.redis.expire(key, ttl)
        );
        await Promise.all(expirePromises);
      }
    } catch (error) {
      console.error('Redis mset error:', error);
    }
  }
}

/**
 * Main Permission Cache Service
 */
export class PermissionCache {
  private static backend: CacheBackend = new MemoryCacheBackend();
  private static redisBackend: RedisCacheBackend | null = null;

  // Initialize Redis backend if available
  static async initialize() {
    try {
      this.redisBackend = new RedisCacheBackend();
      // Test Redis connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (this.redisBackend) {
        this.backend = this.redisBackend;
        console.log('Permission cache using Redis backend');
      }
    } catch (error) {
      console.log('Permission cache using memory backend');
    }
  }

  /**
   * Get cached user permissions for a specific property
   */
  static async getUserPermissions(
    userId: number,
    propertyId: number = 0
  ): Promise<string[] | null> {
    const key = `${CACHE_CONFIG.USER_PERMISSIONS.keyPrefix}${userId}:${propertyId}`;
    
    try {
      const cached = await this.backend.get(key);
      if (cached) {
        const data = JSON.parse(cached);
        return data.permissions;
      }
    } catch (error) {
      console.error('Error getting cached user permissions:', error);
    }
    
    return null;
  }

  /**
   * Cache user permissions for a specific property
   */
  static async setUserPermissions(
    userId: number,
    propertyId: number = 0,
    permissions: string[]
  ): Promise<void> {
    const key = `${CACHE_CONFIG.USER_PERMISSIONS.keyPrefix}${userId}:${propertyId}`;
    
    try {
      const data = {
        permissions,
        cachedAt: new Date().toISOString(),
        userId,
        propertyId
      };
      
      await this.backend.set(
        key,
        JSON.stringify(data),
        CACHE_CONFIG.USER_PERMISSIONS.ttl
      );
    } catch (error) {
      console.error('Error caching user permissions:', error);
    }
  }

  /**
   * Get cached property access information
   */
  static async getPropertyAccess(
    userId: number,
    propertyId: number
  ): Promise<{ canAccess: boolean; accessLevel: PropertyAccessLevel | null } | null> {
    const key = `${CACHE_CONFIG.PROPERTY_ACCESS.keyPrefix}${userId}:${propertyId}`;
    
    try {
      const cached = await this.backend.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Error getting cached property access:', error);
    }
    
    return null;
  }

  /**
   * Cache property access information
   */
  static async setPropertyAccess(
    userId: number,
    propertyId: number,
    canAccess: boolean,
    accessLevel: PropertyAccessLevel | null
  ): Promise<void> {
    const key = `${CACHE_CONFIG.PROPERTY_ACCESS.keyPrefix}${userId}:${propertyId}`;
    
    try {
      const data = {
        canAccess,
        accessLevel,
        cachedAt: new Date().toISOString(),
        userId,
        propertyId
      };
      
      await this.backend.set(
        key,
        JSON.stringify(data),
        CACHE_CONFIG.PROPERTY_ACCESS.ttl
      );
    } catch (error) {
      console.error('Error caching property access:', error);
    }
  }

  /**
   * Get cached role permissions
   */
  static async getRolePermissions(role: UserRole): Promise<string[] | null> {
    const key = `${CACHE_CONFIG.ROLE_PERMISSIONS.keyPrefix}${role}`;
    
    try {
      const cached = await this.backend.get(key);
      if (cached) {
        const data = JSON.parse(cached);
        return data.permissions;
      }
    } catch (error) {
      console.error('Error getting cached role permissions:', error);
    }
    
    return null;
  }

  /**
   * Cache role permissions
   */
  static async setRolePermissions(role: UserRole, permissions: string[]): Promise<void> {
    const key = `${CACHE_CONFIG.ROLE_PERMISSIONS.keyPrefix}${role}`;
    
    try {
      const data = {
        permissions,
        cachedAt: new Date().toISOString(),
        role
      };
      
      await this.backend.set(
        key,
        JSON.stringify(data),
        CACHE_CONFIG.ROLE_PERMISSIONS.ttl
      );
    } catch (error) {
      console.error('Error caching role permissions:', error);
    }
  }

  /**
   * Get cached user accessible properties
   */
  static async getUserProperties(userId: number): Promise<number[] | null> {
    const key = `${CACHE_CONFIG.USER_PROPERTIES.keyPrefix}${userId}`;
    
    try {
      const cached = await this.backend.get(key);
      if (cached) {
        const data = JSON.parse(cached);
        return data.propertyIds;
      }
    } catch (error) {
      console.error('Error getting cached user properties:', error);
    }
    
    return null;
  }

  /**
   * Cache user accessible properties
   */
  static async setUserProperties(userId: number, propertyIds: number[]): Promise<void> {
    const key = `${CACHE_CONFIG.USER_PROPERTIES.keyPrefix}${userId}`;
    
    try {
      const data = {
        propertyIds,
        cachedAt: new Date().toISOString(),
        userId
      };
      
      await this.backend.set(
        key,
        JSON.stringify(data),
        CACHE_CONFIG.USER_PROPERTIES.ttl
      );
    } catch (error) {
      console.error('Error caching user properties:', error);
    }
  }

  /**
   * Intelligent cache invalidation
   */
  static async invalidateUserCache(userId: number): Promise<void> {
    try {
      const patterns = [
        `${CACHE_CONFIG.USER_PERMISSIONS.keyPrefix}${userId}:*`,
        `${CACHE_CONFIG.PROPERTY_ACCESS.keyPrefix}${userId}:*`,
        `${CACHE_CONFIG.USER_PROPERTIES.keyPrefix}${userId}`
      ];

      for (const pattern of patterns) {
        const keys = await this.backend.keys(pattern);
        for (const key of keys) {
          await this.backend.del(key);
        }
      }
    } catch (error) {
      console.error('Error invalidating user cache:', error);
    }
  }

  /**
   * Invalidate property-specific cache
   */
  static async invalidatePropertyCache(propertyId: number): Promise<void> {
    try {
      const patterns = [
        `${CACHE_CONFIG.USER_PERMISSIONS.keyPrefix}*:${propertyId}`,
        `${CACHE_CONFIG.PROPERTY_ACCESS.keyPrefix}*:${propertyId}`
      ];

      for (const pattern of patterns) {
        const keys = await this.backend.keys(pattern);
        for (const key of keys) {
          await this.backend.del(key);
        }
      }
    } catch (error) {
      console.error('Error invalidating property cache:', error);
    }
  }

  /**
   * Invalidate role-based cache
   */
  static async invalidateRoleCache(role?: UserRole): Promise<void> {
    try {
      const pattern = role 
        ? `${CACHE_CONFIG.ROLE_PERMISSIONS.keyPrefix}${role}`
        : `${CACHE_CONFIG.ROLE_PERMISSIONS.keyPrefix}*`;

      const keys = await this.backend.keys(pattern);
      for (const key of keys) {
        await this.backend.del(key);
      }
    } catch (error) {
      console.error('Error invalidating role cache:', error);
    }
  }

  /**
   * Clear all permission caches
   */
  static async clearAllCache(): Promise<void> {
    try {
      const patterns = Object.values(CACHE_CONFIG).map(config => `${config.keyPrefix}*`);
      
      for (const pattern of patterns) {
        const keys = await this.backend.keys(pattern);
        for (const key of keys) {
          await this.backend.del(key);
        }
      }
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    totalKeys: number;
    userPermissionKeys: number;
    propertyAccessKeys: number;
    rolePermissionKeys: number;
    userPropertyKeys: number;
  }> {
    try {
      const stats = {
        totalKeys: 0,
        userPermissionKeys: 0,
        propertyAccessKeys: 0,
        rolePermissionKeys: 0,
        userPropertyKeys: 0
      };

      const userPermKeys = await this.backend.keys(`${CACHE_CONFIG.USER_PERMISSIONS.keyPrefix}*`);
      const propAccessKeys = await this.backend.keys(`${CACHE_CONFIG.PROPERTY_ACCESS.keyPrefix}*`);
      const rolePermKeys = await this.backend.keys(`${CACHE_CONFIG.ROLE_PERMISSIONS.keyPrefix}*`);
      const userPropKeys = await this.backend.keys(`${CACHE_CONFIG.USER_PROPERTIES.keyPrefix}*`);

      stats.userPermissionKeys = userPermKeys.length;
      stats.propertyAccessKeys = propAccessKeys.length;
      stats.rolePermissionKeys = rolePermKeys.length;
      stats.userPropertyKeys = userPropKeys.length;
      stats.totalKeys = stats.userPermissionKeys + stats.propertyAccessKeys + 
                        stats.rolePermissionKeys + stats.userPropertyKeys;

      return stats;
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalKeys: 0,
        userPermissionKeys: 0,
        propertyAccessKeys: 0,
        rolePermissionKeys: 0,
        userPropertyKeys: 0
      };
    }
  }

  /**
   * Batch get user permissions for multiple properties
   */
  static async getBatchUserPermissions(
    userId: number,
    propertyIds: number[]
  ): Promise<Record<number, string[]>> {
    try {
      const keys = propertyIds.map(propId => 
        `${CACHE_CONFIG.USER_PERMISSIONS.keyPrefix}${userId}:${propId}`
      );
      
      const values = await this.backend.mget(keys);
      const result: Record<number, string[]> = {};
      
      values.forEach((value, index) => {
        if (value) {
          try {
            const data = JSON.parse(value);
            result[propertyIds[index]] = data.permissions;
          } catch (error) {
            console.error('Error parsing cached permission data:', error);
          }
        }
      });
      
      return result;
    } catch (error) {
      console.error('Error batch getting user permissions:', error);
      return {};
    }
  }

  /**
   * Batch set user permissions for multiple properties
   */
  static async setBatchUserPermissions(
    userId: number,
    permissionsByProperty: Record<number, string[]>
  ): Promise<void> {
    try {
      const keyValues: Record<string, string> = {};
      
      Object.entries(permissionsByProperty).forEach(([propertyId, permissions]) => {
        const key = `${CACHE_CONFIG.USER_PERMISSIONS.keyPrefix}${userId}:${propertyId}`;
        const data = {
          permissions,
          cachedAt: new Date().toISOString(),
          userId,
          propertyId: parseInt(propertyId)
        };
        keyValues[key] = JSON.stringify(data);
      });
      
      await this.backend.mset(keyValues, CACHE_CONFIG.USER_PERMISSIONS.ttl);
    } catch (error) {
      console.error('Error batch setting user permissions:', error);
    }
  }
}

/**
 * Cached wrapper functions for existing services
 */
export class CachedPermissionService {
  
  /**
   * Get user permissions with caching
   */
  static async getUserPropertyPermissions(
    userId: number,
    propertyId: number = 0
  ): Promise<string[]> {
    // Try cache first
    const cached = await PermissionCache.getUserPermissions(userId, propertyId);
    if (cached) {
      return cached;
    }

    // Get from database
    const permissions = await PropertyAccessService.getUserPropertyPermissionsDirect(userId, propertyId);
    
    // Cache the result
    await PermissionCache.setUserPermissions(userId, propertyId, permissions);
    
    return permissions;
  }

  /**
   * Check property access with caching
   */
  static async canAccessProperty(
    userId: number,
    propertyId: number,
    requiredLevel: PropertyAccessLevel = 'read_only'
  ): Promise<boolean> {
    // Try cache first
    const cached = await PermissionCache.getPropertyAccess(userId, propertyId);
    if (cached) {
      return cached.canAccess && 
             cached.accessLevel && 
             this.hasRequiredAccessLevel(cached.accessLevel, requiredLevel);
    }

    // Get from database
    const canAccess = await PropertyAccessService.canAccessProperty(userId, propertyId, requiredLevel);
    const accessLevel = await PropertyAccessService.getUserPropertyAccessLevel(userId, propertyId);
    
    // Cache the result
    await PermissionCache.setPropertyAccess(userId, propertyId, canAccess, accessLevel);
    
    return canAccess;
  }

  /**
   * Get user accessible properties with caching
   */
  static async getUserAccessibleProperties(userId: number): Promise<number[]> {
    // Try cache first
    const cached = await PermissionCache.getUserProperties(userId);
    if (cached) {
      return cached;
    }

    // Get from database
    const properties = await PropertyAccessService.getUserAccessibleProperties(userId);
    const propertyIds = properties.map(p => p.id);
    
    // Cache the result
    await PermissionCache.setUserProperties(userId, propertyIds);
    
    return propertyIds;
  }

  /**
   * Get role permissions with caching
   */
  static async getRolePermissions(role: UserRole): Promise<string[]> {
    // Try cache first
    const cached = await PermissionCache.getRolePermissions(role);
    if (cached) {
      return cached;
    }

    // Get from static data
    const permissions = getRolePermissions(role);
    
    // Cache the result
    await PermissionCache.setRolePermissions(role, permissions);
    
    return permissions;
  }

  private static hasRequiredAccessLevel(
    userLevel: PropertyAccessLevel,
    requiredLevel: PropertyAccessLevel
  ): boolean {
    const accessLevels: PropertyAccessLevel[] = [
      'read_only', 'data_entry', 'management', 'full_control', 'owner'
    ];
    
    const userLevelIndex = accessLevels.indexOf(userLevel);
    const requiredLevelIndex = accessLevels.indexOf(requiredLevel);
    
    return userLevelIndex >= requiredLevelIndex;
  }
}

// Initialize cache on module load
PermissionCache.initialize();