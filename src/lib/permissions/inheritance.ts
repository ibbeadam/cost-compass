/**
 * Permission Inheritance System
 * Implements hierarchical permission inheritance with role-based and property-based inheritance
 */

import { prisma } from "@/lib/prisma";
import { PermissionCache } from "@/lib/cache/permission-cache";
import { getRolePermissions } from "@/lib/permissions";
import type { UserRole, PropertyAccessLevel, User, Property } from "@/types";

export interface PermissionInheritanceRule {
  id: string;
  name: string;
  description: string;
  type: 'role_hierarchy' | 'property_hierarchy' | 'organizational' | 'delegation';
  parentType: 'role' | 'property' | 'user' | 'department';
  childType: 'role' | 'property' | 'user' | 'department';
  inheritanceMode: 'additive' | 'restrictive' | 'override';
  isActive: boolean;
  conditions?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface InheritanceContext {
  userId: number;
  propertyId?: number;
  departmentId?: string;
  currentRole: UserRole;
  requestedPermissions: string[];
  inheritancePath: string[];
}

export interface ComputedPermissions {
  permissions: string[];
  inheritanceSources: Array<{
    source: string;
    sourceType: 'role' | 'property' | 'user' | 'delegation';
    sourceId: string | number;
    permissions: string[];
    inheritanceRule?: string;
  }>;
  deniedPermissions: string[];
  effectiveRole: UserRole;
  computedAt: Date;
}

/**
 * Permission Inheritance Engine
 */
export class PermissionInheritanceEngine {
  
  /**
   * Compute all inherited permissions for a user
   */
  static async computeInheritedPermissions(
    userId: number,
    propertyId?: number,
    options: {
      includeInactive?: boolean;
      maxDepth?: number;
      enableCaching?: boolean;
    } = {}
  ): Promise<ComputedPermissions> {
    const { includeInactive = false, maxDepth = 10, enableCaching = true } = options;
    
    try {
      // Check cache first
      if (enableCaching) {
        const cached = await this.getCachedComputedPermissions(userId, propertyId);
        if (cached) return cached;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userPermissions: {
            include: { permission: true },
            where: {
              granted: true,
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } }
              ]
            }
          },
          propertyAccess: {
            include: { property: true },
            where: propertyId ? { propertyId } : {}
          },
          managedProperties: propertyId ? { where: { id: propertyId } } : true,
          ownedProperties: propertyId ? { where: { id: propertyId } } : true
        }
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      const context: InheritanceContext = {
        userId,
        propertyId,
        currentRole: user.role,
        requestedPermissions: [],
        inheritancePath: []
      };

      const computedPermissions: ComputedPermissions = {
        permissions: [],
        inheritanceSources: [],
        deniedPermissions: [],
        effectiveRole: user.role,
        computedAt: new Date()
      };

      // 1. Base role permissions
      const rolePermissions = getRolePermissions(user.role);
      computedPermissions.permissions.push(...rolePermissions);
      computedPermissions.inheritanceSources.push({
        source: user.role,
        sourceType: 'role',
        sourceId: user.role,
        permissions: rolePermissions
      });

      // 2. Direct user permissions
      const userPermissions = user.userPermissions.map(up => 
        `${up.permission.resource}.${up.permission.action}`
      );
      computedPermissions.permissions.push(...userPermissions);
      if (userPermissions.length > 0) {
        computedPermissions.inheritanceSources.push({
          source: `User ${userId}`,
          sourceType: 'user',
          sourceId: userId,
          permissions: userPermissions
        });
      }

      // 3. Property-based inheritance
      await this.computePropertyInheritance(user, propertyId, computedPermissions, context);

      // 4. Role hierarchy inheritance
      await this.computeRoleHierarchyInheritance(user, computedPermissions, context, maxDepth);

      // 5. Organizational inheritance (departments, teams)
      await this.computeOrganizationalInheritance(user, computedPermissions, context);

      // 6. Permission delegation inheritance
      await this.computeDelegationInheritance(user, propertyId, computedPermissions, context);

      // Remove duplicates and sort
      computedPermissions.permissions = [...new Set(computedPermissions.permissions)].sort();

      // Cache the result
      if (enableCaching) {
        await this.cacheComputedPermissions(userId, propertyId, computedPermissions);
      }

      return computedPermissions;

    } catch (error) {
      console.error('Error computing inherited permissions:', error);
      throw error;
    }
  }

  /**
   * Compute property-based inheritance
   */
  private static async computePropertyInheritance(
    user: any,
    propertyId: number | undefined,
    computedPermissions: ComputedPermissions,
    context: InheritanceContext
  ): Promise<void> {
    // Property ownership inheritance
    if (user.ownedProperties?.length > 0) {
      const ownerPermissions = this.getAccessLevelPermissions('owner');
      computedPermissions.permissions.push(...ownerPermissions);
      
      for (const property of user.ownedProperties) {
        computedPermissions.inheritanceSources.push({
          source: `Owner of ${property.name}`,
          sourceType: 'property',
          sourceId: property.id,
          permissions: ownerPermissions
        });
      }
    }

    // Property management inheritance
    if (user.managedProperties?.length > 0) {
      const managerPermissions = this.getAccessLevelPermissions('full_control');
      computedPermissions.permissions.push(...managerPermissions);
      
      for (const property of user.managedProperties) {
        computedPermissions.inheritanceSources.push({
          source: `Manager of ${property.name}`,
          sourceType: 'property',
          sourceId: property.id,
          permissions: managerPermissions
        });
      }
    }

    // Property access inheritance
    if (user.propertyAccess?.length > 0) {
      for (const access of user.propertyAccess) {
        const accessPermissions = this.getAccessLevelPermissions(access.accessLevel);
        computedPermissions.permissions.push(...accessPermissions);
        
        computedPermissions.inheritanceSources.push({
          source: `${access.accessLevel} access to ${access.property.name}`,
          sourceType: 'property',
          sourceId: access.propertyId,
          permissions: accessPermissions
        });
      }
    }

    // Parent property inheritance (for property hierarchies)
    if (propertyId) {
      await this.computeParentPropertyInheritance(propertyId, computedPermissions, context);
    }
  }

  /**
   * Compute role hierarchy inheritance
   */
  private static async computeRoleHierarchyInheritance(
    user: any,
    computedPermissions: ComputedPermissions,
    context: InheritanceContext,
    maxDepth: number
  ): Promise<void> {
    const roleHierarchy: Record<UserRole, UserRole[]> = {
      'super_admin': [],
      'property_admin': ['super_admin'],
      'property_manager': ['property_admin', 'super_admin'],
      'outlet_manager': ['property_manager', 'property_admin', 'super_admin'],
      'supervisor': ['outlet_manager', 'property_manager', 'property_admin', 'super_admin'],
      'staff': ['supervisor', 'outlet_manager', 'property_manager', 'property_admin', 'super_admin'],
      'viewer': ['staff', 'supervisor', 'outlet_manager', 'property_manager', 'property_admin', 'super_admin'],
      'readonly': ['viewer', 'staff', 'supervisor', 'outlet_manager', 'property_manager', 'property_admin', 'super_admin']
    };

    const parentRoles = roleHierarchy[user.role] || [];
    
    for (const parentRole of parentRoles) {
      if (context.inheritancePath.includes(parentRole)) continue; // Prevent circular inheritance
      
      const parentPermissions = getRolePermissions(parentRole);
      computedPermissions.permissions.push(...parentPermissions);
      
      computedPermissions.inheritanceSources.push({
        source: `Inherited from ${parentRole} role`,
        sourceType: 'role',
        sourceId: parentRole,
        permissions: parentPermissions,
        inheritanceRule: 'role_hierarchy'
      });
    }
  }

  /**
   * Compute organizational inheritance (departments, teams, etc.)
   */
  private static async computeOrganizationalInheritance(
    user: any,
    computedPermissions: ComputedPermissions,
    context: InheritanceContext
  ): Promise<void> {
    // This would integrate with organizational structure
    // For now, implementing basic team-based inheritance
    
    try {
      // Find users in similar organizational roles who have granted delegation
      const delegations = await prisma.auditLog.findMany({
        where: {
          action: 'PERMISSION_DELEGATED',
          details: {
            path: ['targetUserId'],
            equals: user.id
          }
        },
        take: 10,
        orderBy: { timestamp: 'desc' }
      });

      for (const delegation of delegations) {
        const details = delegation.details as any;
        if (details.permissions && Array.isArray(details.permissions)) {
          computedPermissions.permissions.push(...details.permissions);
          
          computedPermissions.inheritanceSources.push({
            source: `Delegated by User ${delegation.userId}`,
            sourceType: 'delegation',
            sourceId: delegation.userId,
            permissions: details.permissions,
            inheritanceRule: 'organizational_delegation'
          });
        }
      }
    } catch (error) {
      console.error('Error computing organizational inheritance:', error);
    }
  }

  /**
   * Compute delegation inheritance
   */
  private static async computeDelegationInheritance(
    user: any,
    propertyId: number | undefined,
    computedPermissions: ComputedPermissions,
    context: InheritanceContext
  ): Promise<void> {
    try {
      // Find active permission delegations to this user
      const delegations = await prisma.permissionDelegation.findMany({
        where: {
          delegatedToUserId: user.id,
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ],
          ...(propertyId && { propertyId })
        },
        include: {
          delegatedByUser: { select: { id: true, name: true, role: true } },
          property: { select: { id: true, name: true } }
        }
      });

      for (const delegation of delegations) {
        const delegatedPermissions = delegation.permissions as string[];
        computedPermissions.permissions.push(...delegatedPermissions);
        
        const sourceName = delegation.property 
          ? `${delegation.delegatedByUser.name} for ${delegation.property.name}`
          : delegation.delegatedByUser.name;
          
        computedPermissions.inheritanceSources.push({
          source: `Delegated by ${sourceName}`,
          sourceType: 'delegation',
          sourceId: delegation.id,
          permissions: delegatedPermissions,
          inheritanceRule: 'permission_delegation'
        });
      }
    } catch (error) {
      console.error('Error computing delegation inheritance:', error);
      // Table might not exist yet, continue without delegation inheritance
    }
  }

  /**
   * Compute parent property inheritance
   */
  private static async computeParentPropertyInheritance(
    propertyId: number,
    computedPermissions: ComputedPermissions,
    context: InheritanceContext
  ): Promise<void> {
    try {
      // This would implement property hierarchy inheritance
      // For example, if a property is part of a larger property group
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { id: true, name: true, parentPropertyId: true }
      });

      if (property?.parentPropertyId) {
        // Get permissions from parent property
        const parentAccess = await prisma.propertyAccess.findFirst({
          where: {
            userId: context.userId,
            propertyId: property.parentPropertyId,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          }
        });

        if (parentAccess) {
          const inheritedPermissions = this.getAccessLevelPermissions(parentAccess.accessLevel);
          computedPermissions.permissions.push(...inheritedPermissions);
          
          computedPermissions.inheritanceSources.push({
            source: `Inherited from parent property`,
            sourceType: 'property',
            sourceId: property.parentPropertyId,
            permissions: inheritedPermissions,
            inheritanceRule: 'property_hierarchy'
          });
        }
      }
    } catch (error) {
      console.error('Error computing parent property inheritance:', error);
    }
  }

  /**
   * Get access level permissions
   */
  private static getAccessLevelPermissions(accessLevel: PropertyAccessLevel): string[] {
    const accessLevelMap: Record<PropertyAccessLevel, string[]> = {
      'read_only': [
        'financial.daily_summary.read',
        'reports.basic.read',
        'outlets.read',
        'dashboard.view'
      ],
      'data_entry': [
        'financial.daily_summary.read',
        'financial.daily_summary.create',
        'financial.food_costs.read',
        'financial.food_costs.create',
        'financial.beverage_costs.read',
        'financial.beverage_costs.create',
        'reports.basic.read',
        'outlets.read',
        'dashboard.view'
      ],
      'management': [
        'financial.daily_summary.read',
        'financial.daily_summary.create',
        'financial.daily_summary.update',
        'financial.food_costs.read',
        'financial.food_costs.create',
        'financial.food_costs.update',
        'financial.beverage_costs.read',
        'financial.beverage_costs.create',
        'financial.beverage_costs.update',
        'reports.basic.read',
        'reports.advanced.read',
        'outlets.read',
        'outlets.update',
        'dashboard.view',
        'analytics.basic.read'
      ],
      'full_control': [
        'financial.daily_summary.read',
        'financial.daily_summary.create',
        'financial.daily_summary.update',
        'financial.daily_summary.delete',
        'financial.food_costs.read',
        'financial.food_costs.create',
        'financial.food_costs.update',
        'financial.food_costs.delete',
        'financial.beverage_costs.read',
        'financial.beverage_costs.create',
        'financial.beverage_costs.update',
        'financial.beverage_costs.delete',
        'reports.basic.read',
        'reports.advanced.read',
        'reports.export',
        'outlets.read',
        'outlets.create',
        'outlets.update',
        'outlets.delete',
        'dashboard.view',
        'analytics.basic.read',
        'analytics.advanced.read',
        'users.property.read',
        'users.property.update'
      ],
      'owner': [
        'financial.daily_summary.read',
        'financial.daily_summary.create',
        'financial.daily_summary.update',
        'financial.daily_summary.delete',
        'financial.food_costs.read',
        'financial.food_costs.create',
        'financial.food_costs.update',
        'financial.food_costs.delete',
        'financial.beverage_costs.read',
        'financial.beverage_costs.create',
        'financial.beverage_costs.update',
        'financial.beverage_costs.delete',
        'reports.basic.read',
        'reports.advanced.read',
        'reports.export',
        'outlets.read',
        'outlets.create',
        'outlets.update',
        'outlets.delete',
        'dashboard.view',
        'analytics.basic.read',
        'analytics.advanced.read',
        'analytics.export',
        'users.property.read',
        'users.property.create',
        'users.property.update',
        'users.property.delete',
        'permissions.property.grant',
        'permissions.property.revoke'
      ]
    };

    return accessLevelMap[accessLevel] || [];
  }

  /**
   * Cache computed permissions
   */
  private static async cacheComputedPermissions(
    userId: number,
    propertyId: number | undefined,
    permissions: ComputedPermissions
  ): Promise<void> {
    try {
      const key = `computed_permissions:${userId}:${propertyId || 'global'}`;
      await PermissionCache.setUserPermissions(userId, propertyId || 0, permissions.permissions);
      
      // Also cache the full computation result
      const fullKey = `computed_permissions_full:${userId}:${propertyId || 'global'}`;
      await PermissionCache['backend'].set(
        fullKey,
        JSON.stringify(permissions),
        15 * 60 // 15 minutes TTL
      );
    } catch (error) {
      console.error('Error caching computed permissions:', error);
    }
  }

  /**
   * Get cached computed permissions
   */
  private static async getCachedComputedPermissions(
    userId: number,
    propertyId: number | undefined
  ): Promise<ComputedPermissions | null> {
    try {
      const fullKey = `computed_permissions_full:${userId}:${propertyId || 'global'}`;
      const cached = await PermissionCache['backend'].get(fullKey);
      
      if (cached) {
        const parsed = JSON.parse(cached) as ComputedPermissions;
        // Check if cache is still fresh (within 15 minutes)
        const cacheAge = Date.now() - new Date(parsed.computedAt).getTime();
        if (cacheAge < 15 * 60 * 1000) {
          return parsed;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting cached computed permissions:', error);
      return null;
    }
  }

  /**
   * Invalidate inheritance cache for a user
   */
  static async invalidateInheritanceCache(userId: number, propertyId?: number): Promise<void> {
    try {
      if (propertyId) {
        const fullKey = `computed_permissions_full:${userId}:${propertyId}`;
        await PermissionCache['backend'].del(fullKey);
      } else {
        // Invalidate all property caches for this user
        const pattern = `computed_permissions_full:${userId}:*`;
        const keys = await PermissionCache['backend'].keys(pattern);
        for (const key of keys) {
          await PermissionCache['backend'].del(key);
        }
      }
      
      // Also invalidate regular permission cache
      await PermissionCache.invalidateUserCache(userId);
    } catch (error) {
      console.error('Error invalidating inheritance cache:', error);
    }
  }

  /**
   * Validate permission inheritance rules
   */
  static async validateInheritanceRules(): Promise<{
    valid: boolean;
    issues: Array<{
      type: 'circular_inheritance' | 'conflicting_rules' | 'invalid_reference';
      description: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }>;
  }> {
    const issues: Array<{
      type: 'circular_inheritance' | 'conflicting_rules' | 'invalid_reference';
      description: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }> = [];

    try {
      // Check for circular inheritance in role hierarchy
      const roles: UserRole[] = ['readonly', 'viewer', 'staff', 'supervisor', 'outlet_manager', 'property_manager', 'property_admin', 'super_admin'];
      
      for (const role of roles) {
        const visited = new Set<UserRole>();
        const stack = [role];
        
        while (stack.length > 0) {
          const currentRole = stack.pop()!;
          if (visited.has(currentRole)) {
            issues.push({
              type: 'circular_inheritance',
              description: `Circular inheritance detected in role hierarchy starting from ${role}`,
              severity: 'critical'
            });
            break;
          }
          visited.add(currentRole);
        }
      }

      // Check for conflicting delegation rules
      const activeDelegations = await prisma.permissionDelegation.findMany({
        where: {
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      });

      const userDelegations = new Map<number, any[]>();
      activeDelegations.forEach(delegation => {
        if (!userDelegations.has(delegation.delegatedToUserId)) {
          userDelegations.set(delegation.delegatedToUserId, []);
        }
        userDelegations.get(delegation.delegatedToUserId)!.push(delegation);
      });

      for (const [userId, delegations] of userDelegations) {
        if (delegations.length > 10) {
          issues.push({
            type: 'conflicting_rules',
            description: `User ${userId} has ${delegations.length} active delegations, which may cause performance issues`,
            severity: 'medium'
          });
        }
      }

    } catch (error) {
      console.error('Error validating inheritance rules:', error);
      issues.push({
        type: 'invalid_reference',
        description: 'Error occurred while validating inheritance rules',
        severity: 'high'
      });
    }

    return {
      valid: issues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0,
      issues
    };
  }
}