"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { PermissionService } from "@/lib/permissions/permission-utils";
import type { PropertyAccess, PropertyAccessLevel } from "@/types";
import { revalidatePath } from "next/cache";

/**
 * Grant property access to a user
 */
export async function grantPropertyAccessAction(
  userId: number,
  propertyId: number,
  accessLevel: PropertyAccessLevel,
  grantedBy: number,
  expiresAt?: Date
): Promise<PropertyAccess> {
  try {
    // Verify the granter has permission to grant access
    const granter = await prisma.user.findUnique({
      where: { id: grantedBy },
      include: {
        ownedProperties: { where: { id: propertyId } },
        managedProperties: { where: { id: propertyId } },
        propertyAccess: { 
          where: { 
            propertyId,
            accessLevel: { in: ['owner', 'full_control', 'management'] }
          }
        }
      }
    });

    if (!granter) {
      throw new Error("Granter not found");
    }

    // Check if granter has sufficient permissions
    const canGrant = 
      granter.role === 'super_admin' ||
      granter.ownedProperties.length > 0 ||
      granter.managedProperties.length > 0 ||
      granter.propertyAccess.length > 0;

    if (!canGrant) {
      throw new Error("Insufficient permissions to grant access");
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      throw new Error("Target user not found");
    }

    // Verify property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      throw new Error("Property not found");
    }

    // Create or update property access
    const propertyAccess = await prisma.propertyAccess.upsert({
      where: {
        userId_propertyId: { userId, propertyId }
      },
      update: {
        accessLevel,
        grantedBy,
        expiresAt,
        grantedAt: new Date()
      },
      create: {
        userId,
        propertyId,
        accessLevel,
        grantedBy,
        expiresAt,
        grantedAt: new Date()
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true }
        },
        property: {
          select: { id: true, name: true, propertyCode: true }
        },
        grantedByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Log the access grant
    await prisma.auditLog.create({
      data: {
        userId: grantedBy,
        propertyId,
        action: 'GRANT_PROPERTY_ACCESS',
        resource: 'property_access',
        resourceId: `${userId}-${propertyId}`,
        details: { 
          targetUserId: userId, 
          accessLevel,
          expiresAt 
        }
      }
    });

    revalidatePath('/dashboard/properties');
    revalidatePath('/dashboard/users');
    return propertyAccess;
  } catch (error) {
    console.error("Error granting property access:", error);
    throw new Error("Failed to grant property access");
  }
}

/**
 * Revoke property access from a user
 */
export async function revokePropertyAccessAction(
  userId: number,
  propertyId: number,
  revokedBy: number
): Promise<void> {
  try {
    // Verify the revoker has permission to revoke access
    const revoker = await prisma.user.findUnique({
      where: { id: revokedBy },
      include: {
        ownedProperties: { where: { id: propertyId } },
        managedProperties: { where: { id: propertyId } },
        propertyAccess: { 
          where: { 
            propertyId,
            accessLevel: { in: ['owner', 'full_control', 'management'] }
          }
        }
      }
    });

    if (!revoker) {
      throw new Error("Revoker not found");
    }

    // Check if revoker has sufficient permissions
    const canRevoke = 
      revoker.role === 'super_admin' ||
      revoker.ownedProperties.length > 0 ||
      revoker.managedProperties.length > 0 ||
      revoker.propertyAccess.length > 0;

    if (!canRevoke) {
      throw new Error("Insufficient permissions to revoke access");
    }

    // Check if access record exists
    const existingAccess = await prisma.propertyAccess.findUnique({
      where: {
        userId_propertyId: { userId, propertyId }
      }
    });

    if (!existingAccess) {
      throw new Error("Property access not found");
    }

    // Delete the access record
    await prisma.propertyAccess.delete({
      where: {
        userId_propertyId: { userId, propertyId }
      }
    });

    // Log the access revocation
    await prisma.auditLog.create({
      data: {
        userId: revokedBy,
        propertyId,
        action: 'REVOKE_PROPERTY_ACCESS',
        resource: 'property_access',
        resourceId: `${userId}-${propertyId}`,
        details: { 
          targetUserId: userId,
          previousAccessLevel: existingAccess.accessLevel
        }
      }
    });

    revalidatePath('/dashboard/properties');
    revalidatePath('/dashboard/users');
  } catch (error) {
    console.error("Error revoking property access:", error);
    throw new Error("Failed to revoke property access");
  }
}

/**
 * Update property access level for a user
 */
export async function updatePropertyAccessAction(
  userId: number,
  propertyId: number,
  newAccessLevel: PropertyAccessLevel,
  updatedBy: number
): Promise<PropertyAccess> {
  try {
    // Verify the updater has permission to update access
    const updater = await prisma.user.findUnique({
      where: { id: updatedBy },
      include: {
        ownedProperties: { where: { id: propertyId } },
        managedProperties: { where: { id: propertyId } },
        propertyAccess: { 
          where: { 
            propertyId,
            accessLevel: { in: ['owner', 'full_control', 'management'] }
          }
        }
      }
    });

    if (!updater) {
      throw new Error("Updater not found");
    }

    // Check if updater has sufficient permissions
    const canUpdate = 
      updater.role === 'super_admin' ||
      updater.ownedProperties.length > 0 ||
      updater.managedProperties.length > 0 ||
      updater.propertyAccess.length > 0;

    if (!canUpdate) {
      throw new Error("Insufficient permissions to update access");
    }

    // Check if access record exists
    const existingAccess = await prisma.propertyAccess.findUnique({
      where: {
        userId_propertyId: { userId, propertyId }
      }
    });

    if (!existingAccess) {
      throw new Error("Property access not found");
    }

    // Update the access level
    const updatedAccess = await prisma.propertyAccess.update({
      where: {
        userId_propertyId: { userId, propertyId }
      },
      data: {
        accessLevel: newAccessLevel,
        grantedAt: new Date(), // Reset granted date
        grantedBy: updatedBy
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true }
        },
        property: {
          select: { id: true, name: true, propertyCode: true }
        },
        grantedByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Log the access update
    await prisma.auditLog.create({
      data: {
        userId: updatedBy,
        propertyId,
        action: 'UPDATE_PROPERTY_ACCESS',
        resource: 'property_access',
        resourceId: `${userId}-${propertyId}`,
        details: { 
          targetUserId: userId,
          previousAccessLevel: existingAccess.accessLevel,
          newAccessLevel
        }
      }
    });

    revalidatePath('/dashboard/properties');
    revalidatePath('/dashboard/users');
    return updatedAccess;
  } catch (error) {
    console.error("Error updating property access:", error);
    throw new Error("Failed to update property access");
  }
}

/**
 * Get all property access records for a specific property
 */
export async function getPropertyAccessListAction(propertyId: number): Promise<PropertyAccess[]> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Authentication required");
    }

    // Check if user has permission to view property access for this property
    const hasPermission = await PermissionService.hasPermission(
      currentUser.id,
      "properties.access.read"
    );
    
    if (!hasPermission) {
      throw new Error("Insufficient permissions to view property access list");
    }

    const propertyAccessList = await prisma.propertyAccess.findMany({
      where: { 
        propertyId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, isActive: true }
        },
        grantedByUser: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: [
        { accessLevel: 'desc' },
        { grantedAt: 'desc' }
      ]
    });

    return propertyAccessList;
  } catch (error) {
    console.error("Error fetching property access list:", error);
    throw new Error("Failed to fetch property access list");
  }
}

/**
 * Get all property access records for a specific user
 */
export async function getUserPropertyAccessListAction(userId: number): Promise<PropertyAccess[]> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Authentication required");
    }

    // Users can only view their own access, or admins can view any user's access
    if (currentUser.id !== userId) {
      const hasPermission = await PermissionService.hasPermission(
        currentUser.id,
        "users.property_access.read"
      );
      
      if (!hasPermission) {
        throw new Error("Insufficient permissions to view user property access");
      }
    }

    const userPropertyAccessList = await prisma.propertyAccess.findMany({
      where: { 
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        property: {
          select: { 
            id: true, 
            name: true, 
            propertyCode: true, 
            propertyType: true,
            isActive: true 
          }
        },
        grantedByUser: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: [
        { accessLevel: 'desc' },
        { grantedAt: 'desc' }
      ]
    });

    return userPropertyAccessList;
  } catch (error) {
    console.error("Error fetching user property access list:", error);
    throw new Error("Failed to fetch user property access list");
  }
}

/**
 * Bulk grant property access to multiple users
 */
export async function bulkGrantPropertyAccessAction(
  propertyId: number,
  userAccessList: Array<{
    userId: number;
    accessLevel: PropertyAccessLevel;
    expiresAt?: Date;
  }>,
  grantedBy: number
): Promise<PropertyAccess[]> {
  try {
    const results: PropertyAccess[] = [];

    for (const userAccess of userAccessList) {
      const propertyAccess = await grantPropertyAccessAction(
        userAccess.userId,
        propertyId,
        userAccess.accessLevel,
        grantedBy,
        userAccess.expiresAt
      );
      results.push(propertyAccess);
    }

    return results;
  } catch (error) {
    console.error("Error bulk granting property access:", error);
    throw new Error("Failed to bulk grant property access");
  }
}

/**
 * Clean up expired property access records
 */
export async function cleanupExpiredPropertyAccessAction(): Promise<number> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Authentication required");
    }

    // Only super admins or system operations can cleanup expired access
    const hasPermission = await PermissionService.hasPermission(
      currentUser.id,
      "system.cleanup.execute"
    );
    
    if (!hasPermission && currentUser.role !== "super_admin") {
      throw new Error("Insufficient permissions to cleanup expired property access");
    }

    const result = await prisma.propertyAccess.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    console.log(`Cleaned up ${result.count} expired property access records`);
    return result.count;
  } catch (error) {
    console.error("Error cleaning up expired property access:", error);
    throw new Error("Failed to clean up expired property access");
  }
}