"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { UserRole } from "@/types";
import { PermissionCategory, PermissionAction } from "@/lib/permissions";

export interface RolePermissionData {
  id: number;
  role: UserRole;
  permissionId: number;
  permission: {
    id: number;
    name: string;
    description: string | null;
    category: PermissionCategory;
    resource: string;
    action: PermissionAction;
  };
}

export interface RoleWithPermissions {
  role: UserRole;
  permissions: Array<{
    id: number;
    name: string;
    description: string | null;
    category: PermissionCategory;
    resource: string;
    action: PermissionAction;
    assigned: boolean;
  }>;
}

/**
 * Get all roles with their assigned permissions
 */
export async function getRolesWithPermissions(): Promise<{
  success: boolean;
  data?: RoleWithPermissions[];
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "super_admin") {
      return { success: false, error: "Access denied. Super admin privileges required." };
    }

    // Get all permissions
    const allPermissions = await prisma.permission.findMany({
      orderBy: [
        { category: "asc" },
        { resource: "asc" },
        { action: "asc" }
      ]
    });

    // Get all role permissions
    const rolePermissions = await prisma.rolePermission.findMany({
      include: {
        permission: true
      }
    });

    // Get all available roles
    const allRoles: UserRole[] = [
      'super_admin',
      'property_owner', 
      'property_admin',
      'regional_manager',
      'property_manager',
      'supervisor',
      'user',
      'readonly'
    ];

    // Build role data with permission assignments
    const rolesWithPermissions: RoleWithPermissions[] = allRoles.map(role => {
      const rolePerms = rolePermissions.filter(rp => rp.role === role);
      
      return {
        role,
        permissions: allPermissions.map(permission => ({
          id: permission.id,
          name: permission.name,
          description: permission.description,
          category: permission.category,
          resource: permission.resource,
          action: permission.action,
          assigned: rolePerms.some(rp => rp.permissionId === permission.id)
        }))
      };
    });

    return { success: true, data: rolesWithPermissions };
  } catch (error) {
    console.error("Error fetching roles with permissions:", error);
    return { 
      success: false, 
      error: "Failed to fetch roles and permissions. Please try again." 
    };
  }
}

/**
 * Assign permission to role
 */
export async function assignPermissionToRole(
  role: UserRole,
  permissionId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "super_admin") {
      return { success: false, error: "Access denied. Super admin privileges required." };
    }

    // Check if permission exists
    const permission = await prisma.permission.findUnique({
      where: { id: permissionId }
    });

    if (!permission) {
      return { success: false, error: "Permission not found." };
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.rolePermission.findFirst({
      where: {
        role,
        permissionId
      }
    });

    if (existingAssignment) {
      return { success: false, error: "Permission already assigned to this role." };
    }

    // Create the assignment
    await prisma.rolePermission.create({
      data: {
        role,
        permissionId
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: parseInt(session.user.id),
        action: "PERMISSION_ASSIGNED_TO_ROLE",
        resource: "role_permission",
        resourceId: `${role}:${permissionId}`,
        details: {
          role,
          permissionId,
          permissionName: permission.name,
          assignedAt: new Date().toISOString()
        }
      }
    });

    revalidatePath("/dashboard/roles-permissions");
    return { success: true };
  } catch (error) {
    console.error("Error assigning permission to role:", error);
    return { 
      success: false, 
      error: "Failed to assign permission to role. Please try again." 
    };
  }
}

/**
 * Remove permission from role
 */
export async function removePermissionFromRole(
  role: UserRole,
  permissionId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "super_admin") {
      return { success: false, error: "Access denied. Super admin privileges required." };
    }

    // Check if permission exists
    const permission = await prisma.permission.findUnique({
      where: { id: permissionId }
    });

    if (!permission) {
      return { success: false, error: "Permission not found." };
    }

    // Find and delete the assignment
    const assignment = await prisma.rolePermission.findFirst({
      where: {
        role,
        permissionId
      }
    });

    if (!assignment) {
      return { success: false, error: "Permission is not assigned to this role." };
    }

    await prisma.rolePermission.delete({
      where: { id: assignment.id }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: parseInt(session.user.id),
        action: "PERMISSION_REMOVED_FROM_ROLE",
        resource: "role_permission",
        resourceId: `${role}:${permissionId}`,
        details: {
          role,
          permissionId,
          permissionName: permission.name,
          removedAt: new Date().toISOString()
        }
      }
    });

    revalidatePath("/dashboard/roles-permissions");
    return { success: true };
  } catch (error) {
    console.error("Error removing permission from role:", error);
    return { 
      success: false, 
      error: "Failed to remove permission from role. Please try again." 
    };
  }
}

/**
 * Bulk assign permissions to role
 */
export async function bulkAssignPermissionsToRole(
  role: UserRole,
  permissionIds: number[]
): Promise<{ success: boolean; assigned: number; skipped: number; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "super_admin") {
      return { success: false, assigned: 0, skipped: 0, error: "Access denied. Super admin privileges required." };
    }

    let assigned = 0;
    let skipped = 0;

    // Get existing assignments for this role
    const existingAssignments = await prisma.rolePermission.findMany({
      where: {
        role,
        permissionId: { in: permissionIds }
      }
    });

    const existingPermissionIds = existingAssignments.map(a => a.permissionId);

    // Filter out already assigned permissions
    const newPermissionIds = permissionIds.filter(id => !existingPermissionIds.includes(id));
    skipped = existingPermissionIds.length;

    if (newPermissionIds.length > 0) {
      // Create new assignments
      await prisma.rolePermission.createMany({
        data: newPermissionIds.map(permissionId => ({
          role,
          permissionId
        }))
      });
      assigned = newPermissionIds.length;

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: parseInt(session.user.id),
          action: "BULK_PERMISSIONS_ASSIGNED_TO_ROLE",
          resource: "role_permission",
          resourceId: role,
          details: {
            role,
            permissionIds: newPermissionIds,
            assignedCount: assigned,
            skippedCount: skipped,
            assignedAt: new Date().toISOString()
          }
        }
      });
    }

    revalidatePath("/dashboard/roles-permissions");
    return { success: true, assigned, skipped };
  } catch (error) {
    console.error("Error bulk assigning permissions to role:", error);
    return { 
      success: false, 
      assigned: 0, 
      skipped: 0,
      error: "Failed to assign permissions to role. Please try again." 
    };
  }
}

/**
 * Bulk remove permissions from role
 */
export async function bulkRemovePermissionsFromRole(
  role: UserRole,
  permissionIds: number[]
): Promise<{ success: boolean; removed: number; notFound: number; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "super_admin") {
      return { success: false, removed: 0, notFound: 0, error: "Access denied. Super admin privileges required." };
    }

    // Find existing assignments
    const existingAssignments = await prisma.rolePermission.findMany({
      where: {
        role,
        permissionId: { in: permissionIds }
      }
    });

    const foundPermissionIds = existingAssignments.map(a => a.permissionId);
    const notFound = permissionIds.length - foundPermissionIds.length;

    if (foundPermissionIds.length > 0) {
      // Delete the assignments
      await prisma.rolePermission.deleteMany({
        where: {
          role,
          permissionId: { in: foundPermissionIds }
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: parseInt(session.user.id),
          action: "BULK_PERMISSIONS_REMOVED_FROM_ROLE",
          resource: "role_permission",
          resourceId: role,
          details: {
            role,
            permissionIds: foundPermissionIds,
            removedCount: foundPermissionIds.length,
            notFoundCount: notFound,
            removedAt: new Date().toISOString()
          }
        }
      });
    }

    revalidatePath("/dashboard/roles-permissions");
    return { success: true, removed: foundPermissionIds.length, notFound };
  } catch (error) {
    console.error("Error bulk removing permissions from role:", error);
    return { 
      success: false, 
      removed: 0, 
      notFound: 0,
      error: "Failed to remove permissions from role. Please try again." 
    };
  }
}

/**
 * Copy permissions from one role to another
 */
export async function copyRolePermissions(
  sourceRole: UserRole,
  targetRole: UserRole,
  overwrite: boolean = false
): Promise<{ success: boolean; copied: number; skipped: number; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "super_admin") {
      return { success: false, copied: 0, skipped: 0, error: "Access denied. Super admin privileges required." };
    }

    if (sourceRole === targetRole) {
      return { success: false, copied: 0, skipped: 0, error: "Source and target roles cannot be the same." };
    }

    // Get source role permissions
    const sourcePermissions = await prisma.rolePermission.findMany({
      where: { role: sourceRole }
    });

    if (sourcePermissions.length === 0) {
      return { success: false, copied: 0, skipped: 0, error: "Source role has no permissions to copy." };
    }

    const sourcePermissionIds = sourcePermissions.map(p => p.permissionId);

    if (overwrite) {
      // Delete all existing permissions for target role
      await prisma.rolePermission.deleteMany({
        where: { role: targetRole }
      });

      // Create new permissions
      await prisma.rolePermission.createMany({
        data: sourcePermissionIds.map(permissionId => ({
          role: targetRole,
          permissionId
        }))
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: parseInt(session.user.id),
          action: "ROLE_PERMISSIONS_COPIED_WITH_OVERWRITE",
          resource: "role_permission",
          resourceId: `${sourceRole}->${targetRole}`,
          details: {
            sourceRole,
            targetRole,
            permissionIds: sourcePermissionIds,
            copiedCount: sourcePermissionIds.length,
            overwrite: true,
            copiedAt: new Date().toISOString()
          }
        }
      });

      revalidatePath("/dashboard/roles-permissions");
      return { success: true, copied: sourcePermissionIds.length, skipped: 0 };
    } else {
      // Get existing target role permissions
      const existingTargetPermissions = await prisma.rolePermission.findMany({
        where: {
          role: targetRole,
          permissionId: { in: sourcePermissionIds }
        }
      });

      const existingPermissionIds = existingTargetPermissions.map(p => p.permissionId);
      const newPermissionIds = sourcePermissionIds.filter(id => !existingPermissionIds.includes(id));

      if (newPermissionIds.length > 0) {
        await prisma.rolePermission.createMany({
          data: newPermissionIds.map(permissionId => ({
            role: targetRole,
            permissionId
          }))
        });
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: parseInt(session.user.id),
          action: "ROLE_PERMISSIONS_COPIED",
          resource: "role_permission",
          resourceId: `${sourceRole}->${targetRole}`,
          details: {
            sourceRole,
            targetRole,
            permissionIds: newPermissionIds,
            copiedCount: newPermissionIds.length,
            skippedCount: existingPermissionIds.length,
            overwrite: false,
            copiedAt: new Date().toISOString()
          }
        }
      });

      revalidatePath("/dashboard/roles-permissions");
      return { success: true, copied: newPermissionIds.length, skipped: existingPermissionIds.length };
    }
  } catch (error) {
    console.error("Error copying role permissions:", error);
    return { 
      success: false, 
      copied: 0, 
      skipped: 0,
      error: "Failed to copy role permissions. Please try again." 
    };
  }
}

/**
 * Get role permission statistics
 */
export async function getRolePermissionStats(): Promise<{
  success: boolean;
  data?: {
    totalRoles: number;
    totalPermissions: number;
    totalAssignments: number;
    roleStats: Array<{
      role: UserRole;
      permissionCount: number;
      percentage: number;
    }>;
    categoryStats: Array<{
      category: PermissionCategory;
      totalPermissions: number;
      assignedPermissions: number;
      coverage: number;
    }>;
  };
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "super_admin") {
      return { success: false, error: "Access denied. Super admin privileges required." };
    }

    // Get total counts
    const totalPermissions = await prisma.permission.count();
    const totalAssignments = await prisma.rolePermission.count();
    
    const allRoles: UserRole[] = [
      'super_admin', 'property_owner', 'property_admin', 'regional_manager',
      'property_manager', 'supervisor', 'user', 'readonly'
    ];
    const totalRoles = allRoles.length;

    // Get role stats
    const roleAssignments = await prisma.rolePermission.groupBy({
      by: ['role'],
      _count: { permissionId: true }
    });

    const roleStats = allRoles.map(role => {
      const assignments = roleAssignments.find(ra => ra.role === role);
      const permissionCount = assignments?._count.permissionId || 0;
      const percentage = totalPermissions > 0 ? Math.round((permissionCount / totalPermissions) * 100) : 0;
      
      return {
        role,
        permissionCount,
        percentage
      };
    });

    // Get category stats
    const categoryPermissions = await prisma.permission.groupBy({
      by: ['category'],
      _count: { id: true }
    });

    const categoryAssignments = await prisma.$queryRaw<Array<{
      category: PermissionCategory;
      assigned_count: bigint;
    }>>`
      SELECT p.category, COUNT(DISTINCT rp.id) as assigned_count
      FROM permissions p
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id
      GROUP BY p.category
    `;

    const categoryStats = categoryPermissions.map(cp => {
      const assignments = categoryAssignments.find(ca => ca.category === cp.category);
      const assignedPermissions = Number(assignments?.assigned_count || 0);
      const coverage = cp._count.id > 0 ? Math.round((assignedPermissions / cp._count.id) * 100) : 0;
      
      return {
        category: cp.category,
        totalPermissions: cp._count.id,
        assignedPermissions,
        coverage
      };
    });

    return {
      success: true,
      data: {
        totalRoles,
        totalPermissions,
        totalAssignments,
        roleStats,
        categoryStats
      }
    };
  } catch (error) {
    console.error("Error fetching role permission stats:", error);
    return {
      success: false,
      error: "Failed to fetch role permission statistics. Please try again."
    };
  }
}