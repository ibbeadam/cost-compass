"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/types";

/**
 * Check if the current user has the required role
 */
export async function checkUserRole(requiredRole: UserRole): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return false;
    }

    // Direct database query to avoid circular dependency
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    });

    if (!user) {
      return false;
    }

    return user.role === requiredRole;
  } catch (error) {
    console.error("Error checking user role:", error);
    return false;
  }
}

/**
 * Check if the current user is a super admin
 */
export async function checkSuperAdminAccess(): Promise<boolean> {
  return checkUserRole("super_admin");
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return null;
    }

    return await prisma.user.findUnique({
      where: { email: session.user.email },
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
        }
      }
    });
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

/**
 * Throw an error if the user doesn't have the required role
 */
export async function requireRole(requiredRole: UserRole, errorMessage?: string) {
  const hasAccess = await checkUserRole(requiredRole);
  if (!hasAccess) {
    throw new Error(errorMessage || `Access denied. Required role: ${requiredRole}`);
  }
}

/**
 * Throw an error if the user is not a super admin
 */
export async function requireSuperAdmin(errorMessage?: string) {
  await requireRole("super_admin", errorMessage || "Access denied. Super admin privileges required.");
}