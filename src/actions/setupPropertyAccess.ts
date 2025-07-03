"use server";

import { prisma } from "@/lib/prisma";

/**
 * Helper function to assign a user to a property
 * This creates the necessary PropertyAccess record
 */
export async function assignUserToPropertyAction(
  userEmail: string,
  propertyId: number,
  accessLevel: "read_only" | "data_entry" | "management" | "full_control" | "owner" = "management"
) {
  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      throw new Error(`User with email ${userEmail} not found`);
    }

    // Find the property
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new Error(`Property with ID ${propertyId} not found`);
    }

    // Check if access already exists
    const existingAccess = await prisma.propertyAccess.findFirst({
      where: {
        userId: user.id,
        propertyId: propertyId,
      },
    });

    if (existingAccess) {
      // Update existing access
      const updatedAccess = await prisma.propertyAccess.update({
        where: { id: existingAccess.id },
        data: {
          accessLevel,
          grantedAt: new Date(),
        },
      });
      
      console.log(`Updated property access for ${userEmail} to property ${property.name}`);
      return updatedAccess;
    } else {
      // Create new access
      const newAccess = await prisma.propertyAccess.create({
        data: {
          userId: user.id,
          propertyId: propertyId,
          accessLevel,
          grantedAt: new Date(),
          grantedBy: user.id, // Self-assigned for now, in practice this would be the admin
        },
      });
      
      console.log(`Created property access for ${userEmail} to property ${property.name}`);
      return newAccess;
    }
  } catch (error) {
    console.error("Error assigning user to property:", error);
    throw new Error(`Failed to assign user to property: ${error.message}`);
  }
}

/**
 * Helper function to list all users and their property access
 */
export async function listUserPropertyAccessAction() {
  try {
    const users = await prisma.user.findMany({
      include: {
        ownedProperties: {
          select: { id: true, name: true, propertyCode: true },
        },
        managedProperties: {
          select: { id: true, name: true, propertyCode: true },
        },
        propertyAccess: {
          include: {
            property: {
              select: { id: true, name: true, propertyCode: true },
            },
          },
        },
      },
      orderBy: { email: "asc" },
    });

    return users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      ownedProperties: user.ownedProperties || [],
      managedProperties: user.managedProperties || [],
      propertyAccess: user.propertyAccess?.map(pa => ({
        propertyId: pa.propertyId,
        accessLevel: pa.accessLevel,
        property: pa.property,
      })) || [],
    }));
  } catch (error) {
    console.error("Error listing user property access:", error);
    throw new Error(`Failed to list user property access: ${error.message}`);
  }
}

/**
 * Simplified outlet fetching that works even without complex property setup
 */
export async function getOutletsForUserSimpleAction(userEmail: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Super admins see everything
    if (user.role === "super_admin") {
      return prisma.outlet.findMany({
        include: {
          property: {
            select: { id: true, name: true, propertyCode: true },
          },
        },
        orderBy: { name: "asc" },
      });
    }

    // For now, if no property access is set up, return empty array
    // This prevents errors while you set up property access
    const propertyAccess = await prisma.propertyAccess.findMany({
      where: { userId: user.id },
    });

    if (propertyAccess.length === 0) {
      console.log(`User ${userEmail} has no property access configured`);
      return [];
    }

    const propertyIds = propertyAccess.map(pa => pa.propertyId);
    
    return prisma.outlet.findMany({
      where: {
        OR: [
          { propertyId: { in: propertyIds } },
          { propertyId: null }, // Include unassigned outlets
        ],
      },
      include: {
        property: {
          select: { id: true, name: true, propertyCode: true },
        },
      },
      orderBy: { name: "asc" },
    });
  } catch (error) {
    console.error("Error in getOutletsForUserSimpleAction:", error);
    throw error;
  }
}