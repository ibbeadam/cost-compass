/**
 * usePermissions Hook
 * Provides permission checking functionality for React components
 */

"use client";

import { useSession } from "next-auth/react";
import { useMemo } from "react";
import type { UserRole, PropertyAccessLevel } from "@/types";
import { PermissionService, PropertyPermissionService } from "@/lib/permission-utils";

/**
 * Hook for checking user permissions and access control
 */
export function usePermissions() {
  const { data: session, status } = useSession();
  
  const user = useMemo(() => {
    if (!session?.user) return null;
    
    return {
      id: parseInt(session.user.id),
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      department: session.user.department,
      phoneNumber: session.user.phoneNumber,
      isActive: true, // Assume active if logged in
      permissions: session.user.permissions || [],
      lastLoginAt: session.user.lastLoginAt ? new Date(session.user.lastLoginAt) : undefined,
      twoFactorEnabled: session.user.twoFactorEnabled || false,
      createdAt: new Date(), // Placeholder
      updatedAt: new Date(), // Placeholder
      accessibleProperties: session.user.accessibleProperties || [],
    };
  }, [session]);

  const isLoading = status === "loading";

  // Basic permission checks
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return PermissionService.hasPermission(user, permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false;
    return PermissionService.hasAnyPermission(user, permissions);
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user) return false;
    return PermissionService.hasAllPermissions(user, permissions);
  };

  // Role checks
  const hasRole = (role: UserRole): boolean => {
    if (!user) return false;
    return PermissionService.hasRole(user, role);
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    return PermissionService.hasAnyRole(user, roles);
  };

  // Admin checks
  const isAdmin = (): boolean => {
    if (!user) return false;
    return PermissionService.isAdmin(user);
  };

  const isSuperAdmin = (): boolean => {
    if (!user) return false;
    return PermissionService.isSuperAdmin(user);
  };

  const isPropertyOwner = (): boolean => {
    if (!user) return false;
    return PermissionService.isPropertyOwner(user);
  };

  // Property access checks
  const canAccessProperty = (propertyId: number, requiredLevel: PropertyAccessLevel = 'read_only'): boolean => {
    if (!user) return false;
    
    // Super admin can access all properties
    if (isSuperAdmin()) return true;
    
    // Check if user has access to this property
    const propertyAccess = user.accessibleProperties?.find(p => p.id === propertyId);
    if (!propertyAccess) return false;
    
    // Check access level hierarchy
    const accessLevels: PropertyAccessLevel[] = [
      'read_only', 'data_entry', 'management', 'full_control', 'owner'
    ];
    
    const userLevelIndex = accessLevels.indexOf(propertyAccess.accessLevel);
    const requiredLevelIndex = accessLevels.indexOf(requiredLevel);
    
    return userLevelIndex >= requiredLevelIndex;
  };

  const getAccessibleProperties = () => {
    if (!user) return [];
    return user.accessibleProperties || [];
  };

  const getPropertyAccessLevel = (propertyId: number): PropertyAccessLevel | null => {
    if (!user) return null;
    
    const propertyAccess = user.accessibleProperties?.find(p => p.id === propertyId);
    return propertyAccess?.accessLevel || null;
  };

  // Capability checks
  const canManageUsers = (): boolean => {
    if (!user) return false;
    return PermissionService.canManageUsers(user);
  };

  const canManageProperties = (): boolean => {
    if (!user) return false;
    return PermissionService.canManageProperties(user);
  };

  const canViewFinancialData = (): boolean => {
    if (!user) return false;
    return PermissionService.canViewFinancialData(user);
  };

  const canEditFinancialData = (): boolean => {
    if (!user) return false;
    return PermissionService.canEditFinancialData(user);
  };

  const canViewReports = (): boolean => {
    if (!user) return false;
    return PermissionService.canViewReports(user);
  };

  const canExportReports = (): boolean => {
    if (!user) return false;
    return PermissionService.canExportReports(user);
  };

  const canViewCrossPropertyReports = (): boolean => {
    if (!user) return false;
    return PropertyPermissionService.canViewCrossPropertyReports(user);
  };

  // Property-specific capability checks
  const canManagePropertyUsers = (propertyId: number): boolean => {
    if (!user) return false;
    return canManageUsers() && canAccessProperty(propertyId, 'management');
  };

  const canEditPropertyFinancialData = (propertyId: number): boolean => {
    if (!user) return false;
    return canEditFinancialData() && canAccessProperty(propertyId, 'data_entry');
  };

  const canViewPropertyReports = (propertyId: number): boolean => {
    if (!user) return false;
    return canViewReports() && canAccessProperty(propertyId, 'read_only');
  };

  // Utility functions
  const getUserAccessHierarchy = (): number => {
    if (!user) return 0;
    return PermissionService.getUserAccessHierarchy(user);
  };

  const hasHigherAccessThan = (otherUser: { role: UserRole }): boolean => {
    if (!user) return false;
    return PermissionService.hasHigherAccess(user, otherUser as any);
  };

  const filterPropertiesByAccess = <T extends { id: number }>(
    properties: T[],
    requiredLevel: PropertyAccessLevel = 'read_only'
  ): T[] => {
    if (!user) return [];
    if (isSuperAdmin()) return properties;
    
    return properties.filter(property => canAccessProperty(property.id, requiredLevel));
  };

  return {
    // State
    user,
    isLoading,
    isAuthenticated: !!user,
    
    // Basic permission checks
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // Role checks
    hasRole,
    hasAnyRole,
    isAdmin,
    isSuperAdmin,
    isPropertyOwner,
    
    // Property access
    canAccessProperty,
    getAccessibleProperties,
    getPropertyAccessLevel,
    
    // Capability checks
    canManageUsers,
    canManageProperties,
    canViewFinancialData,
    canEditFinancialData,
    canViewReports,
    canExportReports,
    canViewCrossPropertyReports,
    
    // Property-specific capabilities
    canManagePropertyUsers,
    canEditPropertyFinancialData,
    canViewPropertyReports,
    
    // Utilities
    getUserAccessHierarchy,
    hasHigherAccessThan,
    filterPropertiesByAccess,
    
    // Direct access to user data
    permissions: user?.permissions || [],
    role: user?.role,
    accessibleProperties: user?.accessibleProperties || [],
  };
}

/**
 * Specialized hook for property context
 */
export function usePropertyPermissions(propertyId: number | undefined) {
  const permissions = usePermissions();
  
  const canAccess = (requiredLevel: PropertyAccessLevel = 'read_only'): boolean => {
    if (!propertyId) return false;
    return permissions.canAccessProperty(propertyId, requiredLevel);
  };

  const getAccessLevel = (): PropertyAccessLevel | null => {
    if (!propertyId) return null;
    return permissions.getPropertyAccessLevel(propertyId);
  };

  const canManageUsers = (): boolean => {
    if (!propertyId) return false;
    return permissions.canManagePropertyUsers(propertyId);
  };

  const canEditFinancialData = (): boolean => {
    if (!propertyId) return false;
    return permissions.canEditPropertyFinancialData(propertyId);
  };

  const canViewReports = (): boolean => {
    if (!propertyId) return false;
    return permissions.canViewPropertyReports(propertyId);
  };

  return {
    ...permissions,
    propertyId,
    canAccess,
    getAccessLevel,
    canManageUsers,
    canEditFinancialData,
    canViewReports,
  };
}

/**
 * Hook for getting user's accessible properties with filtering
 */
export function useAccessibleProperties(requiredLevel: PropertyAccessLevel = 'read_only') {
  const { getAccessibleProperties, filterPropertiesByAccess, isLoading, isSuperAdmin } = usePermissions();
  
  const properties = useMemo(() => {
    const allProperties = getAccessibleProperties();
    return filterPropertiesByAccess(allProperties, requiredLevel);
  }, [getAccessibleProperties, filterPropertiesByAccess, requiredLevel]);

  const isMultiPropertyMode = useMemo(() => {
    // Super admin always sees multi-property mode if there are multiple properties in system
    if (isSuperAdmin()) {
      return properties.length > 1;
    }
    
    // Regular users are in multi-property mode if they have access to more than one property
    return properties.length > 1;
  }, [properties.length, isSuperAdmin]);

  return {
    properties,
    isLoading,
    count: properties.length,
    hasAnyProperties: properties.length > 0,
    isMultiPropertyMode,
  };
}