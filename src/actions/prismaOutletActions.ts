"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getAllOutletsAction() {
  try {
    const outlets = await prisma.outlet.findMany({
      include: {
        property: {
          select: {
            id: true,
            name: true,
            propertyCode: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
    return outlets;
  } catch (error) {
    console.error("Error fetching outlets:", error);
    throw new Error("Failed to fetch outlets");
  }
}

export async function getOutletsByPropertyAccessAction(userEmail: string) {
  try {
    console.log(`Fetching outlets for user: ${userEmail}`);
    
    // Get user with property access - make the query more defensive
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        ownedProperties: {
          where: { isActive: true }
        },
        managedProperties: {
          where: { isActive: true }
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
              select: {
                id: true,
                name: true,
                propertyCode: true,
                isActive: true,
              }
            },
          },
        },
      },
    });

    if (!user) {
      console.error(`User not found: ${userEmail}`);
      throw new Error("User not found");
    }

    console.log(`Found user: ${user.email}, role: ${user.role}`);

    // Super admins can see all outlets
    if (user.role === "super_admin") {
      console.log("User is super admin, returning all outlets");
      return getAllOutletsAction();
    }

    // Collect accessible property IDs
    const accessiblePropertyIds = new Set<number>();

    // Add owned properties
    if (user.ownedProperties && user.ownedProperties.length > 0) {
      user.ownedProperties.forEach(p => {
        console.log(`Adding owned property: ${p.id} - ${p.name}`);
        accessiblePropertyIds.add(p.id);
      });
    }

    // Add managed properties
    if (user.managedProperties && user.managedProperties.length > 0) {
      user.managedProperties.forEach(p => {
        console.log(`Adding managed property: ${p.id} - ${p.name}`);
        accessiblePropertyIds.add(p.id);
      });
    }

    // Add properties from property access
    if (user.propertyAccess && user.propertyAccess.length > 0) {
      user.propertyAccess.forEach(pa => {
        if (pa.property && pa.property.isActive) {
          console.log(`Adding accessible property: ${pa.propertyId} - ${pa.property.name}`);
          accessiblePropertyIds.add(pa.propertyId);
        }
      });
    }

    console.log(`Total accessible properties: ${accessiblePropertyIds.size}`);

    if (accessiblePropertyIds.size === 0) {
      console.log("User has no property access, returning empty array");
      return []; // User has no property access
    }

    // Fetch outlets for accessible properties
    const outlets = await prisma.outlet.findMany({
      where: {
        propertyId: { in: Array.from(accessiblePropertyIds) },
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            propertyCode: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    console.log(`Found ${outlets.length} outlets for user`);
    return outlets;
  } catch (error) {
    console.error("Error fetching outlets by property access:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
    });
    
    // For debugging, let's fallback to simple approach or all outlets
    console.log("Falling back to simpler approach");
    try {
      // Try simple property access check
      const propertyAccessCount = await prisma.propertyAccess.count({
        where: { 
          user: { email: userEmail }
        }
      });
      
      if (propertyAccessCount === 0) {
        console.log(`No property access configured for ${userEmail}, returning empty array`);
        return [];
      }
      
      // If property access exists, try a simpler query
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        select: { id: true, role: true }
      });
      
      if (!user) {
        return [];
      }
      
      if (user.role === "super_admin") {
        return getAllOutletsAction();
      }
      
      const propertyAccess = await prisma.propertyAccess.findMany({
        where: { userId: user.id },
        select: { propertyId: true }
      });
      
      const propertyIds = propertyAccess.map(pa => pa.propertyId);
      
      if (propertyIds.length === 0) {
        return [];
      }
      
      return await prisma.outlet.findMany({
        where: {
          propertyId: { in: propertyIds },
        },
        include: {
          property: {
            select: {
              id: true,
              name: true,
              propertyCode: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });
      
    } catch (fallbackError) {
      console.error("Simple fallback also failed:", fallbackError);
      // Last resort - return empty array instead of failing
      console.log("Returning empty array as final fallback");
      return [];
    }
  }
}

export async function getOutletByIdAction(id: number) {
  try {
    const outlet = await prisma.outlet.findUnique({
      where: { id: Number(id) },
      include: {
        foodCostEntries: true,
        beverageCostEntries: true,
      },
    });
    return outlet;
  } catch (error) {
    console.error("Error fetching outlet:", error);
    throw new Error("Failed to fetch outlet");
  }
}

export async function createOutletAction(outletData: {
  name: string;
  outletCode: string;
  propertyId?: number;
  address?: string;
}) {
  try {
    console.log("Creating outlet with data:", outletData);
    
    // Validate required fields
    if (!outletData.name || !outletData.outletCode) {
      throw new Error("Name and outlet code are required");
    }

    // PropertyId is required in the schema
    if (!outletData.propertyId) {
      throw new Error("Property ID is required");
    }

    // Check if outlet code already exists
    const existingOutlet = await prisma.outlet.findFirst({
      where: { outletCode: outletData.outletCode },
    });

    if (existingOutlet) {
      throw new Error(`Outlet code "${outletData.outletCode}" already exists`);
    }

    // Verify the property exists
    const property = await prisma.property.findUnique({
      where: { id: outletData.propertyId },
    });

    if (!property) {
      throw new Error(`Property with ID ${outletData.propertyId} does not exist`);
    }

    const outlet = await prisma.outlet.create({
      data: {
        name: outletData.name,
        outletCode: outletData.outletCode,
        propertyId: outletData.propertyId,
        address: outletData.address || null,
        isActive: true,
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            propertyCode: true,
          },
        },
      },
    });

    console.log("Successfully created outlet:", outlet);
    revalidatePath("/dashboard/outlets");
    return outlet;
  } catch (error) {
    console.error("Error creating outlet:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      meta: error.meta,
    });
    
    // Provide more specific error messages
    if (error.code === "P2002") {
      throw new Error("Outlet code must be unique");
    } else if (error.code === "P2003") {
      throw new Error("Invalid property reference");
    } else if (error.message.includes("already exists")) {
      throw error; // Re-throw our custom message
    } else {
      throw new Error(`Failed to create outlet: ${error.message}`);
    }
  }
}

export async function updateOutletAction(
  id: number,
  outletData: {
    name?: string;
    outletCode?: string;
    propertyId?: number;
    address?: string;
    isActive?: boolean;
  }
) {
  try {
    const outlet = await prisma.outlet.update({
      where: { id: Number(id) },
      data: outletData,
    });

    revalidatePath("/dashboard/outlets");
    return outlet;
  } catch (error) {
    console.error("Error updating outlet:", error);
    throw new Error("Failed to update outlet");
  }
}

export async function deleteOutletAction(id: number) {
  try {
    await prisma.outlet.delete({
      where: { id: Number(id) },
    });

    revalidatePath("/dashboard/outlets");
    return { success: true };
  } catch (error) {
    console.error("Error deleting outlet:", error);
    throw new Error("Failed to delete outlet");
  }
}

export async function getAllPropertiesAction() {
  try {
    const properties = await prisma.property.findMany({
      where: { isActive: true },
      orderBy: {
        name: "asc",
      },
    });
    return properties;
  } catch (error) {
    console.error("Error fetching properties:", error);
    throw new Error("Failed to fetch properties");
  }
}