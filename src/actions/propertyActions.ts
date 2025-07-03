"use server";

import { prisma } from "@/lib/prisma";
import type { Property, PropertyType, CreatePropertyData, UpdatePropertyData } from "@/types";
import { revalidatePath } from "next/cache";
import { auditDataChange, auditUserAction } from "@/lib/audit-middleware";

// Property data interfaces are now imported from types

/**
 * Get all properties with optional filtering
 */
export async function getPropertiesAction(
  filters?: {
    isActive?: boolean;
    propertyType?: string;
    ownerId?: number;
    searchTerm?: string;
  }
): Promise<Property[]> {
  try {
    const whereClause: any = {};
    
    if (filters?.isActive !== undefined) {
      whereClause.isActive = filters.isActive;
    }
    
    if (filters?.propertyType) {
      whereClause.propertyType = filters.propertyType;
    }
    
    if (filters?.ownerId) {
      whereClause.ownerId = filters.ownerId;
    }
    
    if (filters?.searchTerm) {
      whereClause.OR = [
        { name: { contains: filters.searchTerm, mode: 'insensitive' } },
        { propertyCode: { contains: filters.searchTerm, mode: 'insensitive' } },
        { address: { contains: filters.searchTerm, mode: 'insensitive' } },
        { city: { contains: filters.searchTerm, mode: 'insensitive' } }
      ];
    }

    const properties = await prisma.property.findMany({
      where: whereClause,
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        },
        manager: {
          select: { id: true, name: true, email: true }
        },
        outlets: {
          select: { id: true, name: true, outletCode: true, isActive: true }
        },
        _count: {
          select: {
            outlets: true,
            propertyAccess: true
          }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
      ]
    });

    return properties;
  } catch (error) {
    console.error("Error fetching properties:", error);
    throw new Error("Failed to fetch properties");
  }
}

/**
 * Get a single property by ID
 */
export async function getPropertyByIdAction(id: number): Promise<Property | null> {
  try {
    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        },
        manager: {
          select: { id: true, name: true, email: true }
        },
        outlets: {
          select: { 
            id: true, 
            name: true, 
            outletCode: true, 
            address: true,
            isActive: true 
          }
        },
        propertyAccess: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true }
            }
          }
        }
      }
    });

    return property;
  } catch (error) {
    console.error("Error fetching property:", error);
    throw new Error("Failed to fetch property");
  }
}

/**
 * Create a new property
 */
export async function createPropertyAction(data: CreatePropertyData): Promise<Property> {
  try {
    // Get current user for audit logging
    const { getCurrentUser } = await import("@/lib/server-auth");
    const currentUser = await getCurrentUser();

    // Validate property code uniqueness
    const existingProperty = await prisma.property.findUnique({
      where: { propertyCode: data.propertyCode }
    });

    if (existingProperty) {
      throw new Error("Property code already exists");
    }

    const property = await prisma.property.create({
      data: {
        name: data.name,
        propertyCode: data.propertyCode,
        propertyType: data.propertyType,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        timeZone: data.timeZone || "UTC",
        currency: data.currency || "USD",
        ownerId: data.ownerId,
        managerId: data.managerId,
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        },
        manager: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Create audit log
    if (currentUser) {
      await auditDataChange(
        currentUser.id,
        "CREATE",
        "property",
        property.id,
        undefined,
        {
          name: property.name,
          propertyCode: property.propertyCode,
          propertyType: property.propertyType,
          ownerId: property.ownerId,
          managerId: property.managerId,
        },
        property.id
      );
    }

    revalidatePath('/dashboard/properties');
    return property;
  } catch (error) {
    console.error("Error creating property:", error);
    throw new Error("Failed to create property");
  }
}

/**
 * Update an existing property
 */
export async function updatePropertyAction(id: number, data: UpdatePropertyData): Promise<Property> {
  try {
    // Get current user and existing property data for audit logging
    const { getCurrentUser } = await import("@/lib/server-auth");
    const currentUser = await getCurrentUser();

    // Get existing property data before update
    const existingProperty = await prisma.property.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        propertyCode: true,
        propertyType: true,
        ownerId: true,
        managerId: true,
        isActive: true,
      },
    });

    if (!existingProperty) {
      throw new Error("Property not found");
    }

    // Check if property code is being changed and if it's unique
    if (data.propertyCode && data.propertyCode !== existingProperty.propertyCode) {
      const duplicateProperty = await prisma.property.findFirst({
        where: { 
          propertyCode: data.propertyCode,
          NOT: { id }
        }
      });

      if (duplicateProperty) {
        throw new Error("Property code already exists");
      }
    }

    const property = await prisma.property.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        },
        manager: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Create audit log
    if (currentUser) {
      await auditDataChange(
        currentUser.id,
        "UPDATE",
        "property",
        property.id,
        {
          name: existingProperty.name,
          propertyCode: existingProperty.propertyCode,
          propertyType: existingProperty.propertyType,
          ownerId: existingProperty.ownerId,
          managerId: existingProperty.managerId,
          isActive: existingProperty.isActive,
        },
        {
          name: property.name,
          propertyCode: property.propertyCode,
          propertyType: property.propertyType,
          ownerId: property.ownerId,
          managerId: property.managerId,
          isActive: property.isActive,
        },
        property.id
      );
    }

    revalidatePath('/dashboard/properties');
    return property;
  } catch (error) {
    console.error("Error updating property:", error);
    throw new Error("Failed to update property");
  }
}

/**
 * Delete a property (soft delete)
 */
export async function deletePropertyAction(id: number): Promise<void> {
  try {
    // Get current user for audit logging
    const { getCurrentUser } = await import("@/lib/server-auth");
    const currentUser = await getCurrentUser();

    // Check if property has any associated data
    const propertyWithData = await prisma.property.findUnique({
      where: { id },
      include: {
        outlets: true,
        foodCostEntries: true,
        beverageCostEntries: true,
        dailyFinancialSummaries: true
      }
    });

    if (!propertyWithData) {
      throw new Error("Property not found");
    }

    // Check if property has outlets or financial data
    const hasData = 
      propertyWithData.outlets.length > 0 ||
      propertyWithData.foodCostEntries.length > 0 ||
      propertyWithData.beverageCostEntries.length > 0 ||
      propertyWithData.dailyFinancialSummaries.length > 0;

    if (hasData) {
      // Soft delete - just mark as inactive
      await prisma.property.update({
        where: { id },
        data: { isActive: false }
      });

      // Create audit log for soft delete
      if (currentUser) {
        await auditDataChange(
          currentUser.id,
          "DEACTIVATE",
          "property",
          id,
          { isActive: true },
          { isActive: false },
          id
        );
      }
    } else {
      // Create audit log for hard delete before actually deleting
      if (currentUser) {
        await auditDataChange(
          currentUser.id,
          "DELETE",
          "property",
          id,
          {
            name: propertyWithData.name,
            propertyCode: propertyWithData.propertyCode,
            propertyType: propertyWithData.propertyType,
          },
          undefined,
          id
        );
      }

      // Hard delete if no associated data
      await prisma.property.delete({
        where: { id }
      });
    }

    revalidatePath('/dashboard/properties');
  } catch (error) {
    console.error("Error deleting property:", error);
    throw new Error("Failed to delete property");
  }
}

/**
 * Get properties accessible by a specific user
 */
export async function getUserAccessiblePropertiesAction(userId: number): Promise<Property[]> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedProperties: {
          where: { isActive: true }
        },
        managedProperties: {
          where: { isActive: true }
        },
        propertyAccess: {
          where: {
            property: { isActive: true },
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          },
          include: {
            property: true
          }
        }
      }
    });

    if (!user) {
      return [];
    }

    const accessibleProperties: Property[] = [];
    
    // Add owned properties
    if (user.ownedProperties) {
      accessibleProperties.push(...user.ownedProperties);
    }
    
    // Add managed properties
    if (user.managedProperties) {
      accessibleProperties.push(...user.managedProperties);
    }
    
    // Add properties from PropertyAccess
    if (user.propertyAccess) {
      const accessProperties = user.propertyAccess
        .map(access => access.property)
        .filter(Boolean) as Property[];
      accessibleProperties.push(...accessProperties);
    }
    
    // Remove duplicates
    const uniqueProperties = accessibleProperties.filter(
      (property, index, self) => 
        index === self.findIndex(p => p.id === property.id)
    );
    
    return uniqueProperties;
  } catch (error) {
    console.error("Error fetching user accessible properties:", error);
    throw new Error("Failed to fetch accessible properties");
  }
}

/**
 * Transfer property ownership
 */
export async function transferPropertyOwnershipAction(
  propertyId: number, 
  newOwnerId: number,
  currentUserId: number
): Promise<Property> {
  try {
    // Verify current user has permission to transfer ownership
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { owner: true }
    });

    if (!property) {
      throw new Error("Property not found");
    }

    // Only current owner or super admin can transfer ownership
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId }
    });

    if (!currentUser) {
      throw new Error("User not found");
    }

    const canTransfer = 
      property.ownerId === currentUserId ||
      currentUser.role === 'super_admin';

    if (!canTransfer) {
      throw new Error("Insufficient permissions to transfer ownership");
    }

    // Verify new owner exists
    const newOwner = await prisma.user.findUnique({
      where: { id: newOwnerId }
    });

    if (!newOwner) {
      throw new Error("New owner not found");
    }

    // Transfer ownership
    const updatedProperty = await prisma.property.update({
      where: { id: propertyId },
      data: { ownerId: newOwnerId },
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        },
        manager: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Log ownership transfer
    await auditUserAction(
      currentUserId,
      "UPDATE",
      "property",
      propertyId.toString(),
      {
        action: "TRANSFER_OWNERSHIP",
        previousOwnerId: property.ownerId,
        newOwnerId: newOwnerId
      },
      propertyId
    );

    revalidatePath('/dashboard/properties');
    return updatedProperty;
  } catch (error) {
    console.error("Error transferring property ownership:", error);
    throw new Error("Failed to transfer property ownership");
  }
}