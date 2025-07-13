/**
 * Client-Side Permission Utilities
 * Permission checking utilities that work in browser environment
 * Uses permissions from user session instead of database queries
 */

import type { User, UserRole, PropertyAccessLevel } from "@/types";
import { ROLE_PERMISSIONS } from "@/lib/permissions";

/**
 * Client-side Permission Service
 * Uses session data and cached permissions for client-side permission checking
 */
export class ClientPermissionService {

  /**
   * Check if user's permissions might be outdated
   * Returns true if permissions should be refreshed
   */
  static shouldRefreshPermissions(user: User): boolean {
    // Check if user has specific permissions in session
    // If they only have fallback permissions, they might need a refresh
    const userPermissions = user.permissions || [];
    
    // If user has no permissions but has a role, they might need a refresh
    if (userPermissions.length === 0 && user.role) {
      return true;
    }
    
    // In a production system, you might check:
    // - Last session update timestamp
    // - Permission cache expiry
    // - Server-side permission change flags
    
    return false;
  }
  
  /**
   * Get all permissions for a user (client-side)
   * Uses permissions from user session data
   */
  static getUserPermissions(user: User): string[] {
    if (!user || !user.role) return [];
    
    // Get user-specific permissions from session
    const userPermissions = user.permissions || [];
    
    // If user has permissions in session, use those
    // Otherwise fall back to role-based permissions
    if (userPermissions.length > 0) {
      return userPermissions;
    }
    
    // Fallback to hardcoded role permissions
    const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
    return [...new Set([...rolePermissions, ...userPermissions])];
  }

  /**
   * Check if user has a specific permission (client-side)
   */
  static hasPermission(user: User, permission: string): boolean {
    if (!user) return false;
    
    const userPermissions = this.getUserPermissions(user);
    return userPermissions.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions (client-side)
   */
  static hasAnyPermission(user: User, permissions: string[]): boolean {
    if (!user || !permissions.length) return false;
    
    const userPermissions = this.getUserPermissions(user);
    return permissions.some(permission => userPermissions.includes(permission));
  }

  /**
   * Check if user has all of the specified permissions (client-side)
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

  /**
   * Check if user can view cross-property reports
   */
  static canViewCrossPropertyReports(user: User): boolean {
    return this.hasAnyPermission(user, [
      'reports.cross_property.read',
      'dashboard.cross_property.view'
    ]);
  }
}