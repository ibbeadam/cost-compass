/**
 * Property Data Isolation Utilities
 * Ensures users can only access data from properties they have permission to access
 */

import { PropertyAccessService } from "@/lib/property-access";
import { prisma } from "@/lib/prisma";
import type { User, PropertyAccessLevel } from "@/types";

export interface DataFilterOptions {
  userId: number;
  propertyIds?: number[];
  requiredLevel?: PropertyAccessLevel;
  allowCrossProperty?: boolean;
}

export interface QueryFilter {
  where: any;
  include?: any;
}

/**
 * Get accessible property IDs for a user with caching
 */
const propertyAccessCache = new Map<string, { properties: number[], expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getAccessiblePropertyIds(
  userId: number, 
  requiredLevel: PropertyAccessLevel = 'read_only'
): Promise<number[]> {
  const cacheKey = `${userId}:${requiredLevel}`;
  const cached = propertyAccessCache.get(cacheKey);
  
  if (cached && cached.expiry > Date.now()) {
    return cached.properties;
  }
  
  try {
    const properties = await PropertyAccessService.getUserAccessibleProperties(userId);
    const propertyIds = properties.map(p => p.id);
    
    // Cache the result
    propertyAccessCache.set(cacheKey, {
      properties: propertyIds,
      expiry: Date.now() + CACHE_TTL
    });
    
    return propertyIds;
  } catch (error) {
    console.error('Error fetching accessible properties:', error);
    return [];
  }
}

/**
 * Create property filter for database queries
 */
export async function createPropertyFilter(
  userId: number,
  options: {
    requiredLevel?: PropertyAccessLevel;
    specificPropertyId?: number;
    allowSuperAdminBypass?: boolean;
  } = {}
): Promise<{ propertyId?: any; property?: any; outlet?: any }> {
  // Check if user is super admin
  if (options.allowSuperAdminBypass) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    
    if (user?.role === 'super_admin') {
      return {}; // No filter for super admin
    }
  }
  
  // If specific property is requested, validate access
  if (options.specificPropertyId) {
    const hasAccess = await PropertyAccessService.canAccessProperty(
      userId, 
      options.specificPropertyId, 
      options.requiredLevel || 'read_only'
    );
    
    if (!hasAccess) {
      return { propertyId: -1 }; // Return filter that matches nothing
    }
    
    return { propertyId: options.specificPropertyId };
  }
  
  // Get all accessible properties
  const accessiblePropertyIds = await getAccessiblePropertyIds(
    userId, 
    options.requiredLevel || 'read_only'
  );
  
  if (accessiblePropertyIds.length === 0) {
    return { propertyId: -1 }; // Return filter that matches nothing
  }
  
  return {
    propertyId: { in: accessiblePropertyIds }
  };
}

/**
 * Enhanced query filters for different resource types
 */
export class PropertyDataFilter {
  
  /**
   * Filter for direct property queries
   */
  static async properties(userId: number, requiredLevel?: PropertyAccessLevel) {
    return await createPropertyFilter(userId, { 
      requiredLevel, 
      allowSuperAdminBypass: true 
    });
  }
  
  /**
   * Filter for outlet queries (outlets belong to properties)
   */
  static async outlets(userId: number, propertyId?: number, requiredLevel?: PropertyAccessLevel) {
    const filter = await createPropertyFilter(userId, { 
      specificPropertyId: propertyId,
      requiredLevel, 
      allowSuperAdminBypass: true 
    });
    
    if (filter.propertyId === -1) {
      return { propertyId: -1 };
    }
    
    return filter.propertyId ? { propertyId: filter.propertyId } : {};
  }
  
  /**
   * Filter for financial data queries (food cost, beverage cost, etc.)
   */
  static async financialData(userId: number, propertyId?: number, requiredLevel?: PropertyAccessLevel) {
    const accessiblePropertyIds = await getAccessiblePropertyIds(userId, requiredLevel || 'read_only');
    
    if (accessiblePropertyIds.length === 0) {
      return { 
        outlet: { propertyId: -1 } // Filter through outlet relationship
      };
    }
    
    if (propertyId) {
      if (!accessiblePropertyIds.includes(propertyId)) {
        return { outlet: { propertyId: -1 } };
      }
      return { outlet: { propertyId } };
    }
    
    return {
      outlet: {
        propertyId: { in: accessiblePropertyIds }
      }
    };
  }
  
  /**
   * Filter for daily financial summaries
   */
  static async dailyFinancialSummaries(userId: number, propertyId?: number, requiredLevel?: PropertyAccessLevel) {
    return await this.financialData(userId, propertyId, requiredLevel);
  }
  
  /**
   * Filter for audit logs
   */
  static async auditLogs(userId: number, propertyId?: number, requiredLevel?: PropertyAccessLevel) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    
    // Super admin can see all audit logs
    if (user?.role === 'super_admin') {
      return propertyId ? { propertyId } : {};
    }
    
    // Property admin and property owners can see their property logs
    const accessiblePropertyIds = await getAccessiblePropertyIds(userId, requiredLevel || 'read_only');
    
    if (accessiblePropertyIds.length === 0) {
      return { propertyId: -1 };
    }
    
    const filter: any = {
      OR: [
        { userId }, // User's own actions
        { propertyId: { in: accessiblePropertyIds } } // Actions in accessible properties
      ]
    };
    
    if (propertyId) {
      if (!accessiblePropertyIds.includes(propertyId)) {
        return { propertyId: -1 };
      }
      filter.propertyId = propertyId;
    }
    
    return filter;
  }
  
  /**
   * Filter for user queries (who can see which users)
   */
  static async users(userId: number, propertyId?: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    
    // Super admin can see all users
    if (user?.role === 'super_admin') {
      return {};
    }
    
    // Property managers can see users with access to their managed properties
    const manageableProperties = await PropertyAccessService.getUserManageableProperties(userId);
    const manageablePropertyIds = manageableProperties.map(p => p.id);
    
    if (manageablePropertyIds.length === 0) {
      return { id: userId }; // Can only see self
    }
    
    return {
      OR: [
        { id: userId }, // Self
        { 
          propertyAccess: {
            some: {
              propertyId: { in: manageablePropertyIds }
            }
          }
        },
        {
          ownedProperties: {
            some: {
              id: { in: manageablePropertyIds }
            }
          }
        },
        {
          managedProperties: {
            some: {
              id: { in: manageablePropertyIds }
            }
          }
        }
      ]
    };
  }
  
  /**
   * Filter for categories (categories can be property-specific or global)
   */
  static async categories(userId: number, propertyId?: number) {
    const accessiblePropertyIds = await getAccessiblePropertyIds(userId, 'read_only');
    
    if (accessiblePropertyIds.length === 0) {
      return { 
        OR: [
          { propertyId: null }, // Global categories
          { propertyId: -1 } // No property-specific categories
        ]
      };
    }
    
    const filter: any = {
      OR: [
        { propertyId: null }, // Global categories
        { propertyId: { in: accessiblePropertyIds } } // Property-specific categories
      ]
    };
    
    if (propertyId) {
      if (!accessiblePropertyIds.includes(propertyId)) {
        return { propertyId: null }; // Only global categories
      }
      filter.OR = [
        { propertyId: null },
        { propertyId }
      ];
    }
    
    return filter;
  }
}

/**
 * Validate property ownership for data modification
 */
export async function validatePropertyOwnership(
  userId: number,
  resourceType: string,
  resourceId: any,
  requiredLevel: PropertyAccessLevel = 'data_entry'
): Promise<{ allowed: boolean; propertyId?: number; error?: string }> {
  try {
    let propertyId: number | null = null;
    
    // Determine property ID based on resource type
    switch (resourceType) {
      case 'property':
        propertyId = resourceId;
        break;
        
      case 'outlet':
        const outlet = await prisma.outlet.findUnique({
          where: { id: resourceId },
          select: { propertyId: true }
        });
        propertyId = outlet?.propertyId || null;
        break;
        
      case 'food_cost_entry':
        const foodCost = await prisma.foodCostEntry.findUnique({
          where: { id: resourceId },
          include: { outlet: { select: { propertyId: true } } }
        });
        propertyId = foodCost?.outlet?.propertyId || null;
        break;
        
      case 'beverage_cost_entry':
        const beverageCost = await prisma.beverageCostEntry.findUnique({
          where: { id: resourceId },
          include: { outlet: { select: { propertyId: true } } }
        });
        propertyId = beverageCost?.outlet?.propertyId || null;
        break;
        
      case 'daily_financial_summary':
        const summary = await prisma.dailyFinancialSummary.findUnique({
          where: { id: resourceId },
          include: { outlet: { select: { propertyId: true } } }
        });
        propertyId = summary?.outlet?.propertyId || null;
        break;
        
      default:
        return { allowed: false, error: `Unknown resource type: ${resourceType}` };
    }
    
    if (!propertyId) {
      return { allowed: false, error: 'Could not determine property for resource' };
    }
    
    const hasAccess = await PropertyAccessService.canAccessProperty(
      userId, 
      propertyId, 
      requiredLevel
    );
    
    return { 
      allowed: hasAccess, 
      propertyId,
      error: hasAccess ? undefined : 'Insufficient property access level'
    };
    
  } catch (error) {
    console.error('Error validating property ownership:', error);
    return { allowed: false, error: 'Database error during validation' };
  }
}

/**
 * Create a secure query wrapper that automatically applies property filters
 */
export function createSecureQuery<T>(
  userId: number,
  options: {
    requiredLevel?: PropertyAccessLevel;
    allowSuperAdminBypass?: boolean;
  } = {}
) {
  return {
    async findMany(model: any, query: any = {}): Promise<T[]> {
      const filter = await createPropertyFilter(userId, options);
      
      return await model.findMany({
        ...query,
        where: {
          ...query.where,
          ...filter
        }
      });
    },
    
    async findUnique(model: any, query: any): Promise<T | null> {
      const filter = await createPropertyFilter(userId, options);
      
      return await model.findUnique({
        ...query,
        where: {
          ...query.where,
          ...filter
        }
      });
    },
    
    async count(model: any, query: any = {}): Promise<number> {
      const filter = await createPropertyFilter(userId, options);
      
      return await model.count({
        ...query,
        where: {
          ...query.where,
          ...filter
        }
      });
    }
  };
}

/**
 * Clear property access cache for a user (call after permission changes)
 */
export function clearPropertyAccessCache(userId?: number) {
  if (userId) {
    // Clear cache for specific user
    for (const [key] of propertyAccessCache) {
      if (key.startsWith(`${userId}:`)) {
        propertyAccessCache.delete(key);
      }
    }
  } else {
    // Clear all cache
    propertyAccessCache.clear();
  }
}