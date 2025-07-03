/**
 * Permission Checking Utilities
 * Helper functions for checking permissions and access control
 */

import type { User, UserRole, PropertyAccessLevel } from "@/types";
import { ROLE_PERMISSIONS, ACCESS_LEVEL_PERMISSIONS } from "@/lib/permissions";
import { PropertyAccessService } from "@/lib/property-access";

/**
 * Basic Permission Service for role-based checks
 */
export class PermissionService {
  
  /**
   * Get all permissions for a user based on their role
   */
  static getUserPermissions(user: User): string[] {
    if (!user || !user.role) return [];
    
    // Get base permissions from role
    const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
    
    // Get user-specific permissions (if any)
    const userPermissions = user.permissions || [];
    
    // Combine and deduplicate
    return [...new Set([...rolePermissions, ...userPermissions])];
  }

  /**
   * Check if user has a specific permission
   */
  static hasPermission(user: User, permission: string): boolean {
    if (!user) return false;
    
    const userPermissions = this.getUserPermissions(user);
    return userPermissions.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  static hasAnyPermission(user: User, permissions: string[]): boolean {
    if (!user || !permissions.length) return false;
    
    const userPermissions = this.getUserPermissions(user);
    return permissions.some(permission => userPermissions.includes(permission));
  }

  /**
   * Check if user has all of the specified permissions
   */
  static hasAllPermissions(user: User, permissions: string[]): boolean {
    if (!user || !permissions.length) return false;
    
    const userPermissions = this.getUserPermissions(user);
    return permissions.every(permission => userPermissions.includes(permission));
  }

  /**
   * Check if user has a specific role
   */
  static hasRole(user: User, role: UserRole): boolean {
    return user?.role === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  static hasAnyRole(user: User, roles: UserRole[]): boolean {
    if (!user || !roles.length) return false;
    return roles.includes(user.role);
  }

  /**
   * Check if user is admin (any admin level)
   */
  static isAdmin(user: User): boolean {
    return this.hasAnyRole(user, ['super_admin', 'property_admin']);
  }

  /**
   * Check if user is super admin
   */
  static isSuperAdmin(user: User): boolean {
    return this.hasRole(user, 'super_admin');
  }

  /**
   * Check if user is property owner
   */
  static isPropertyOwner(user: User): boolean {
    return this.hasRole(user, 'property_owner');
  }

  /**
   * Check if user can manage other users
   */
  static canManageUsers(user: User): boolean {
    return this.hasAnyPermission(user, [
      'users.create',
      'users.update',
      'users.delete',
      'users.roles.manage'
    ]);
  }

  /**
   * Check if user can manage properties
   */
  static canManageProperties(user: User): boolean {
    return this.hasAnyPermission(user, [
      'properties.create',
      'properties.update',
      'properties.delete',
      'properties.access.manage'
    ]);
  }

  /**
   * Check if user can view financial data
   */
  static canViewFinancialData(user: User): boolean {
    return this.hasAnyPermission(user, [
      'financial.food_costs.read',
      'financial.beverage_costs.read',
      'financial.daily_summary.read'
    ]);
  }

  /**
   * Check if user can create/edit financial data
   */
  static canEditFinancialData(user: User): boolean {
    return this.hasAnyPermission(user, [
      'financial.food_costs.create',
      'financial.food_costs.update',
      'financial.beverage_costs.create',
      'financial.beverage_costs.update',
      'financial.daily_summary.create',
      'financial.daily_summary.update'
    ]);
  }

  /**
   * Check if user can view reports
   */
  static canViewReports(user: User): boolean {
    return this.hasAnyPermission(user, [
      'reports.basic.read',
      'reports.detailed.read',
      'reports.financial.read'
    ]);
  }

  /**
   * Check if user can export reports
   */
  static canExportReports(user: User): boolean {
    return this.hasPermission(user, 'reports.export');
  }

  /**
   * Get user's access level hierarchy
   */
  static getUserAccessHierarchy(user: User): number {
    const hierarchy: Record<UserRole, number> = {
      'super_admin': 7,
      'property_owner': 6,
      'property_admin': 5,
      'regional_manager': 4,
      'property_manager': 3,
      'supervisor': 2,
      'user': 1,
      'readonly': 0
    };
    
    return hierarchy[user?.role] || 0;
  }

  /**
   * Check if user has higher access level than another user
   */
  static hasHigherAccess(user1: User, user2: User): boolean {
    return this.getUserAccessHierarchy(user1) > this.getUserAccessHierarchy(user2);
  }
}

/**
 * Property-aware Permission Service
 * Extends basic permission checking with property-specific access control
 */
export class PropertyPermissionService extends PermissionService {
  
  /**
   * Check if user has permission within a specific property context
   */
  static async hasPropertyPermission(
    user: User, 
    propertyId: number, 
    permission: string
  ): Promise<boolean> {
    if (!user) return false;
    
    // Super admin has all permissions
    if (this.isSuperAdmin(user)) return true;
    
    // Check basic role permissions first
    if (this.hasPermission(user, permission)) {
      // Verify property access
      return await PropertyAccessService.canAccessProperty(user.id, propertyId, 'read_only');
    }
    
    // Check property-specific permissions
    return await PropertyAccessService.hasPropertyPermission(user.id, propertyId, permission);
  }

  /**
   * Check if user can access property data
   */
  static async canAccessProperty(
    user: User, 
    propertyId: number, 
    requiredLevel: PropertyAccessLevel = 'read_only'
  ): Promise<boolean> {
    if (!user) return false;
    
    // Super admin can access all properties
    if (this.isSuperAdmin(user)) return true;
    
    return await PropertyAccessService.canAccessProperty(user.id, propertyId, requiredLevel);
  }

  /**
   * Get all properties a user can access
   */
  static async getUserAccessibleProperties(user: User) {
    if (!user) return [];
    
    return await PropertyAccessService.getUserAccessibleProperties(user.id);
  }

  /**
   * Check if user can manage users within a property
   */
  static async canManagePropertyUsers(user: User, propertyId: number): Promise<boolean> {
    if (!user) return false;
    
    // Check if user has user management permissions and property access
    const hasUserPermissions = this.canManageUsers(user);
    const hasPropertyAccess = await PropertyAccessService.canManagePropertyUsers(user.id, propertyId);
    
    return hasUserPermissions && hasPropertyAccess;
  }

  /**
   * Check if user can view cross-property reports
   */
  static canViewCrossPropertyReports(user: User): boolean {
    return this.hasAnyPermission(user, [
      'reports.cross_property.read',
      'dashboard.cross_property.view'
    ]);
  }

  /**
   * Filter properties based on user's access level
   */
  static async filterAccessibleProperties(
    user: User, 
    properties: { id: number }[],
    requiredLevel: PropertyAccessLevel = 'read_only'
  ): Promise<{ id: number }[]> {
    if (!user) return [];
    
    // Super admin can access all properties
    if (this.isSuperAdmin(user)) return properties;
    
    const accessibleProperties = [];
    for (const property of properties) {
      const canAccess = await this.canAccessProperty(user, property.id, requiredLevel);
      if (canAccess) {
        accessibleProperties.push(property);
      }
    }
    
    return accessibleProperties;
  }
}

/**
 * Route Permission Mapper
 * Maps routes to required permissions
 */
export const ROUTE_PERMISSIONS: Record<string, {
  permissions?: string[];
  roles?: UserRole[];
  propertyRequired?: boolean;
  accessLevel?: PropertyAccessLevel;
}> = {
  // User Management Routes
  "/dashboard/users": {
    permissions: ["users.read"],
    propertyRequired: false
  },
  "/dashboard/users/create": {
    permissions: ["users.create"],
    propertyRequired: false
  },
  "/dashboard/users/edit": {
    permissions: ["users.update"],
    propertyRequired: false
  },
  
  // Property Management Routes
  "/dashboard/properties": {
    permissions: ["properties.read"],
    propertyRequired: false
  },
  "/dashboard/properties/create": {
    permissions: ["properties.create"],
    propertyRequired: false
  },
  
  // Financial Data Routes
  "/dashboard/food-cost-input": {
    permissions: ["financial.food_costs.create", "financial.food_costs.read"],
    propertyRequired: true,
    accessLevel: "data_entry"
  },
  "/dashboard/beverage-cost-input": {
    permissions: ["financial.beverage_costs.create", "financial.beverage_costs.read"],
    propertyRequired: true,
    accessLevel: "data_entry"
  },
  "/dashboard/financial-summary": {
    permissions: ["financial.daily_summary.create", "financial.daily_summary.read"],
    propertyRequired: true,
    accessLevel: "data_entry"
  },
  
  // Reporting Routes
  "/dashboard/reports": {
    permissions: ["reports.basic.read"],
    propertyRequired: true,
    accessLevel: "read_only"
  },
  "/dashboard/reports/detailed": {
    permissions: ["reports.detailed.read"],
    propertyRequired: true,
    accessLevel: "read_only"
  },
  
  // Settings Routes
  "/dashboard/settings": {
    roles: ["super_admin", "property_admin"],
    propertyRequired: false
  },
  
  // Outlet Management Routes
  "/dashboard/outlets": {
    permissions: ["outlets.read"],
    propertyRequired: true,
    accessLevel: "read_only"
  }
};

/**
 * Check if user can access a specific route
 */
export async function canAccessRoute(
  user: User, 
  route: string, 
  propertyId?: number
): Promise<boolean> {
  if (!user) return false;
  
  const routeConfig = ROUTE_PERMISSIONS[route];
  if (!routeConfig) return true; // Allow access to unmapped routes for now
  
  // Check role requirements
  if (routeConfig.roles && !PermissionService.hasAnyRole(user, routeConfig.roles)) {
    return false;
  }
  
  // Check permission requirements
  if (routeConfig.permissions && !PermissionService.hasAnyPermission(user, routeConfig.permissions)) {
    return false;
  }
  
  // Check property access if required
  if (routeConfig.propertyRequired && propertyId) {
    const accessLevel = routeConfig.accessLevel || 'read_only';
    return await PropertyPermissionService.canAccessProperty(user, propertyId, accessLevel);
  }
  
  return true;
}