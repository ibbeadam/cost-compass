"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import type { UserRole, CreateUserData, UpdateUserData } from "@/types";
import { PermissionService } from "@/lib/permission-utils";
import { validatePassword, hashPassword } from "@/lib/auth-enhanced";
import { auditUserAction, auditDataChange } from "@/lib/audit-middleware";

export async function getAllUsersAction(filters?: {
  isActive?: boolean;
  role?: UserRole;
  searchTerm?: string;
  propertyId?: number;
}) {
  try {
    // Check if user has super admin access
    const { requireSuperAdmin } = await import("@/lib/server-auth");
    await requireSuperAdmin("Only super administrators can view users");
    // Build where clause for filtering
    const whereClause: any = {};
    
    if (filters?.isActive !== undefined) {
      whereClause.isActive = filters.isActive;
    }
    
    if (filters?.role) {
      whereClause.role = filters.role;
    }
    
    if (filters?.searchTerm) {
      whereClause.OR = [
        { name: { contains: filters.searchTerm, mode: 'insensitive' } },
        { email: { contains: filters.searchTerm, mode: 'insensitive' } },
        { department: { contains: filters.searchTerm, mode: 'insensitive' } }
      ];
    }

    // TODO: Add property-specific filtering when schema is updated
    /*
    if (filters?.propertyId) {
      whereClause.OR = [
        { ownedProperties: { some: { id: filters.propertyId } } },
        { managedProperties: { some: { id: filters.propertyId } } },
        { propertyAccess: { some: { propertyId: filters.propertyId } } }
      ];
    }
    */

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        phoneNumber: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Include lock/security fields
        loginAttempts: true,
        lockedUntil: true,
        passwordChangedAt: true,
        // Include property relations
        ownedProperties: {
          select: { id: true, name: true, propertyCode: true }
        },
        managedProperties: {
          select: { id: true, name: true, propertyCode: true }
        },
        propertyAccess: {
          include: {
            property: {
              select: { id: true, name: true, propertyCode: true }
            }
          }
        },
        userPermissions: {
          include: {
            permission: {
              select: { name: true, description: true }
            }
          }
        },
        lastLoginAt: true,
        twoFactorEnabled: true,
      },
      orderBy: [
        { isActive: 'desc' },
        { createdAt: "desc" }
      ],
    });
    
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error("Failed to fetch users");
  }
}

export async function getUserByIdAction(id: number | string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
    });
    return user;
  } catch (error) {
    console.error("Error fetching user:", error);
    throw new Error("Failed to fetch user");
  }
}

export async function getUserByEmailAction(email: string) {
  try {
    await prisma.$connect();
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        ownedProperties: {
          where: { isActive: true },
          select: { id: true, name: true, propertyCode: true }
        },
        managedProperties: {
          where: { isActive: true },
          select: { id: true, name: true, propertyCode: true }
        },
        propertyAccess: {
          where: {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          },
          include: {
            property: {
              select: { id: true, name: true, propertyCode: true, isActive: true }
            }
          }
        },
        userPermissions: {
          include: {
            permission: {
              select: { name: true, description: true }
            }
          }
        }
      }
    });
    return user;
  } catch (error) {
    console.error("Error fetching user by email:", error);
    console.error("Database URL:", process.env.DATABASE_URL);
    throw new Error(`Failed to fetch user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    await prisma.$disconnect();
  }
}

export async function createUserAction(userData: CreateUserData) {
  try {
    // Check if user has super admin access
    const { requireSuperAdmin, getCurrentUser } = await import("@/lib/server-auth");
    await requireSuperAdmin("Only super administrators can create users");
    const currentUser = await getCurrentUser();
    // Validate required fields
    if (!userData.email) {
      throw new Error("Email is required");
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Validate password if provided
    let hashedPassword = null;
    if (userData.password) {
      const passwordValidation = validatePassword(userData.password);
      if (!passwordValidation.isValid) {
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }
      hashedPassword = await hashPassword(userData.password);
    }

    // Prepare user data for creation
    const createData: any = {
      email: userData.email,
      name: userData.name,
      password: hashedPassword,
      role: userData.role || "user",
      department: userData.department,
      phoneNumber: userData.phoneNumber,
      // Note: Permissions are now handled via UserPermission relation
      // permissions: userData.permissions ? JSON.stringify(userData.permissions) : null,
    };

    // TODO: Add enhanced fields when schema is updated
    /*
    createData.passwordChangedAt = hashedPassword ? new Date() : null;
    createData.twoFactorEnabled = false;
    createData.loginAttempts = 0;
    */

    const user = await prisma.user.create({
      data: createData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        phoneNumber: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        propertyAccess: {
          include: {
            property: {
              select: { id: true, name: true, propertyCode: true }
            }
          }
        },
        userPermissions: {
          include: {
            permission: {
              select: { name: true, description: true }
            }
          }
        },
      }
    });

    // Handle property access creation
    if (userData.propertyAccess && userData.propertyAccess.length > 0) {
      for (const access of userData.propertyAccess) {
        await prisma.propertyAccess.create({
          data: {
            userId: user.id,
            propertyId: access.propertyId,
            accessLevel: access.accessLevel,
            grantedBy: 1, // TODO: Pass current user ID as parameter
            grantedAt: new Date()
          }
        });
      }
    }

    // Create audit log
    if (currentUser) {
      await auditDataChange(
        currentUser.id,
        "CREATE",
        "user",
        user.id,
        undefined,
        {
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
          isActive: user.isActive,
        }
      );
    }

    revalidatePath("/dashboard/users");
    
    return user;
  } catch (error) {
    console.error("Error creating user:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to create user");
  }
}

export async function updateUserAction(
  id: number | string,
  userData: UpdateUserData
) {
  try {
    // Check if user has super admin access
    const { requireSuperAdmin, getCurrentUser } = await import("@/lib/server-auth");
    await requireSuperAdmin("Only super administrators can update users");
    const currentUser = await getCurrentUser();
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: Number(id) }
    });

    if (!existingUser) {
      throw new Error("User not found");
    }

    // Prepare update data
    const updateData: any = {
      name: userData.name,
      role: userData.role,
      isActive: userData.isActive,
      department: userData.department,
      phoneNumber: userData.phoneNumber,
      profileImage: userData.profileImage,
      updatedAt: new Date(),
    };

    // Note: Permissions are now handled via UserPermission relation
    // if (userData.permissions !== undefined) {
    //   updateData.permissions = userData.permissions ? JSON.stringify(userData.permissions) : null;
    // }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        phoneNumber: true,
        profileImage: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        propertyAccess: {
          include: {
            property: {
              select: { id: true, name: true, propertyCode: true }
            }
          }
        },
        userPermissions: {
          include: {
            permission: {
              select: { name: true, description: true }
            }
          }
        },
      }
    });

    // Handle property access updates
    if (userData.propertyAccess !== undefined) {
      // Remove existing property access
      await prisma.propertyAccess.deleteMany({
        where: { userId: user.id }
      });

      // Add new property access
      if (userData.propertyAccess && userData.propertyAccess.length > 0) {
        for (const access of userData.propertyAccess) {
          await prisma.propertyAccess.create({
            data: {
              userId: user.id,
              propertyId: access.propertyId,
              accessLevel: access.accessLevel,
              grantedBy: 1, // TODO: Pass current user ID as parameter
              grantedAt: new Date()
            }
          });
        }
      }
    }

    // Create audit log
    if (currentUser) {
      await auditDataChange(
        currentUser.id,
        "UPDATE",
        "user",
        user.id,
        {
          name: existingUser.name,
          role: existingUser.role,
          isActive: existingUser.isActive,
          department: existingUser.department,
          phoneNumber: existingUser.phoneNumber,
        },
        {
          name: user.name,
          role: user.role,
          isActive: user.isActive,
          department: user.department,
          phoneNumber: user.phoneNumber,
        }
      );
    }

    revalidatePath("/dashboard/users");
    return user;
  } catch (error) {
    console.error("Error updating user:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to update user");
  }
}

export async function deleteUserAction(id: number | string) {
  try {
    // Check if user has super admin access
    const { requireSuperAdmin, getCurrentUser } = await import("@/lib/server-auth");
    await requireSuperAdmin("Only super administrators can delete users");
    const currentUser = await getCurrentUser();

    // Get user data before deletion for audit log
    const userToDelete = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        isActive: true,
      },
    });

    if (!userToDelete) {
      throw new Error("User not found");
    }

    await prisma.user.delete({
      where: { id: Number(id) },
    });

    // Create audit log
    if (currentUser) {
      await auditDataChange(
        currentUser.id,
        "DELETE",
        "user",
        id.toString(),
        userToDelete,
        undefined
      );
    }

    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    throw new Error("Failed to delete user");
  }
}

export async function updateUserLastLoginAction(id: number) {
  try {
    // TODO: Update when schema is enhanced
    /*
    await prisma.user.update({
      where: { id: Number(id) },
      data: { 
        lastLoginAt: new Date(),
        loginAttempts: 0, // Reset failed attempts on successful login
        lockedUntil: null // Clear any account lock
      }
    });
    */
    
    // Note: lastLoginAt field doesn't exist in current schema
    console.log(`Last login tracking not implemented for user ${id}`);
  } catch (error) {
    console.error("Error updating last login:", error);
  }
}

/**
 * Reset user password
 */
export async function resetUserPasswordAction(
  id: number | string,
  newPassword: string,
  resetBy: number | string
): Promise<void> {
  try {
    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user password
    await prisma.user.update({
      where: { id: Number(id) },
      data: {
        password: hashedPassword,
        // TODO: Add these fields when schema is updated
        /*
        passwordChangedAt: new Date(),
        loginAttempts: 0,
        lockedUntil: null
        */
      }
    });

    // Create audit log
    await auditUserAction(
      Number(resetBy),
      "RESET_PASSWORD",
      "user",
      id.toString(),
      { targetUserId: Number(id) }
    );

    console.log(`Password reset for user ${id} by user ${resetBy}`);
    revalidatePath("/dashboard/users");
  } catch (error) {
    console.error("Error resetting user password:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to reset password");
  }
}

/**
 * Lock/unlock user account
 */
export async function toggleUserLockAction(
  id: number | string,
  locked: boolean,
  toggledBy: number | string
): Promise<void> {
  try {
    const { getCurrentUser } = await import("@/lib/server-auth");
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== "super_admin") {
      throw new Error("Only super administrators can lock/unlock user accounts");
    }

    // Get user data before update for audit log
    const userToUpdate = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        email: true,
        name: true,
        loginAttempts: true,
        lockedUntil: true,
        isActive: true,
      },
    });

    if (!userToUpdate) {
      throw new Error("User not found");
    }

    // Prevent locking super admins
    const targetUser = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: { role: true },
    });

    if (targetUser?.role === "super_admin" && locked) {
      throw new Error("Cannot lock super administrator accounts");
    }

    // Update user lock status
    await prisma.user.update({
      where: { id: Number(id) },
      data: {
        lockedUntil: locked ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null, // Lock for 24 hours
        loginAttempts: locked ? 999 : 0, // Set high number for locked accounts, reset for unlocked
        updatedAt: new Date(),
      }
    });

    // Create audit log
    await auditUserAction(
      Number(toggledBy),
      locked ? "DEACTIVATE" : "ACTIVATE",
      "user",
      id.toString(),
      { 
        targetUserId: Number(id), 
        action: locked ? "locked" : "unlocked",
        targetUserEmail: userToUpdate.email,
        lockDuration: locked ? "24 hours" : null,
        previousLoginAttempts: userToUpdate.loginAttempts,
        previousLockedUntil: userToUpdate.lockedUntil,
      }
    );

    console.log(`User ${id} (${userToUpdate.email}) ${locked ? 'locked' : 'unlocked'} by user ${toggledBy}`);
    revalidatePath("/dashboard/users");
  } catch (error) {
    console.error("Error toggling user lock:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to toggle user lock status");
  }
}

/**
 * Check if user is currently locked
 */
export async function isUserLockedAction(id: number | string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: {
        lockedUntil: true,
        loginAttempts: true,
      },
    });

    if (!user) {
      return false;
    }

    // Check if user is locked until a future date
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return true;
    }

    // Check if user has too many login attempts (fallback)
    if (user.loginAttempts && user.loginAttempts >= 5) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error checking user lock status:", error);
    return false;
  }
}

/**
 * Get user lock information
 */
export async function getUserLockInfoAction(id: number | string): Promise<{
  isLocked: boolean;
  lockedUntil: Date | null;
  loginAttempts: number;
  lockReason: string | null;
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: {
        lockedUntil: true,
        loginAttempts: true,
      },
    });

    if (!user) {
      return {
        isLocked: false,
        lockedUntil: null,
        loginAttempts: 0,
        lockReason: null,
      };
    }

    const now = new Date();
    const isLockedByTime = user.lockedUntil && user.lockedUntil > now;
    const isLockedByAttempts = user.loginAttempts >= 5;
    const isLocked = isLockedByTime || isLockedByAttempts;

    let lockReason = null;
    if (isLockedByTime && user.loginAttempts >= 999) {
      lockReason = "Manually locked by administrator";
    } else if (isLockedByTime) {
      lockReason = "Locked due to failed login attempts";
    } else if (isLockedByAttempts) {
      lockReason = "Too many failed login attempts";
    }

    return {
      isLocked,
      lockedUntil: user.lockedUntil,
      loginAttempts: user.loginAttempts,
      lockReason,
    };
  } catch (error) {
    console.error("Error getting user lock info:", error);
    return {
      isLocked: false,
      lockedUntil: null,
      loginAttempts: 0,
      lockReason: "Error checking lock status",
    };
  }
}

/**
 * Get users by role
 */
export async function getUsersByRoleAction(role: UserRole) {
  try {
    const users = await prisma.user.findMany({
      where: { 
        role: role,
        isActive: true 
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true
      },
      orderBy: { name: 'asc' }
    });

    return users;
  } catch (error) {
    console.error("Error fetching users by role:", error);
    throw new Error("Failed to fetch users by role");
  }
}

/**
 * Get user statistics
 */
export async function getUserStatsAction() {
  try {
    // TODO: Enhance with property-specific stats when schema is updated
    const [
      totalUsers,
      activeUsers,
      usersByRole
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.groupBy({
        by: ['role'],
        _count: true,
        where: { isActive: true }
      })
    ]);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      usersByRole: usersByRole.reduce((acc: any, item) => {
        acc[item.role] = item._count;
        return acc;
      }, {})
    };
  } catch (error) {
    console.error("Error fetching user stats:", error);
    throw new Error("Failed to fetch user statistics");
  }
}