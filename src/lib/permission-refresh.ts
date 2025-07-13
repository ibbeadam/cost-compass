/**
 * Permission Refresh Utilities
 * Functions to ensure permissions are properly loaded and cached
 */

import { prisma } from "@/lib/prisma";
import { PropertyAccessService } from "@/lib/property-access";
import type { UserRole } from "@/types";

/**
 * Ensure super admin has all required permissions in the database
 */
export async function ensureSuperAdminPermissions(): Promise<void> {
  try {
    // Get required permissions for role management
    const requiredPermissionNames = [
      'system.admin.full_access',
      'system.roles.read', 
      'system.roles.update',
      'users.roles.manage'
    ];

    // Get the permission IDs
    const permissions = await prisma.permission.findMany({
      where: {
        name: { in: requiredPermissionNames }
      }
    });

    // Ensure super_admin role has all these permissions
    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: {
          role_permissionId: {
            role: 'super_admin',
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          role: 'super_admin',
          permissionId: permission.id
        }
      });
    }

    console.log('✅ Super admin permissions ensured');
  } catch (error) {
    console.error('❌ Error ensuring super admin permissions:', error);
  }
}

/**
 * Refresh permissions for a specific user
 */
export async function refreshUserPermissions(userId: number): Promise<string[]> {
  try {
    // Clear any cached permissions for this user
    // This would integrate with your cache invalidation service
    
    // Get fresh permissions from database
    const permissions = await PropertyAccessService.getUserPropertyPermissionsDirect(userId, 0);
    
    console.log(`✅ Refreshed permissions for user ${userId}:`, permissions);
    return permissions;
  } catch (error) {
    console.error(`❌ Error refreshing permissions for user ${userId}:`, error);
    return [];
  }
}

/**
 * Verify user has required permissions for role management
 */
export async function verifyRoleManagementPermissions(userId: number): Promise<{
  hasAccess: boolean;
  userPermissions: string[];
  requiredPermissions: string[];
  missingPermissions: string[];
}> {
  try {
    const userPermissions = await refreshUserPermissions(userId);
    const requiredPermissions = ['system.roles.read', 'users.roles.manage', 'system.admin.full_access'];
    
    const hasAccess = requiredPermissions.some(perm => userPermissions.includes(perm));
    const missingPermissions = requiredPermissions.filter(perm => !userPermissions.includes(perm));
    
    return {
      hasAccess,
      userPermissions,
      requiredPermissions,
      missingPermissions
    };
  } catch (error) {
    console.error('Error verifying role management permissions:', error);
    return {
      hasAccess: false,
      userPermissions: [],
      requiredPermissions: ['system.roles.read', 'users.roles.manage', 'system.admin.full_access'],
      missingPermissions: ['system.roles.read', 'users.roles.manage', 'system.admin.full_access']
    };
  }
}