"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/server-auth";
import { auditDataChange } from "@/lib/audit-middleware";

export async function getAllOutletsAction() {
  try {
    const outlets = await prisma.outlet.findMany({
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

export async function getOutletByIdAction(id: string) {
  try {
    const outlet = await prisma.outlet.findUnique({
      where: { id },
      include: {
        dailyFinancialSummaries: true,
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

export async function addOutletAction(name: string): Promise<any> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Outlet name cannot be empty.");
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    const outlet = await prisma.outlet.create({
      data: {
        name: trimmedName,
        isActive: true,
      },
    });

    // Create audit log
    await auditDataChange(
      user.id,
      "CREATE",
      "outlet",
      outlet.id,
      undefined,
      outlet
    );

    revalidatePath("/dashboard/outlets");
    revalidatePath("/dashboard");
    return outlet;
  } catch (error) {
    console.error("Error adding outlet:", error);
    throw new Error(`Failed to add outlet: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function createOutletAction(outletData: {
  name: string;
  address?: any;
  phoneNumber?: string;
  email?: string;
  type?: string;
  currency?: string;
  timezone?: string;
  defaultBudgetFoodCostPct?: number;
  defaultBudgetBeverageCostPct?: number;
  targetOccupancy?: number;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    const outlet = await prisma.outlet.create({
      data: outletData,
    });

    // Create audit log
    await auditDataChange(
      user.id,
      "CREATE",
      "outlet",
      outlet.id,
      undefined,
      outlet
    );

    revalidatePath("/dashboard/outlets");
    return outlet;
  } catch (error) {
    console.error("Error creating outlet:", error);
    throw new Error("Failed to create outlet");
  }
}

export async function updateOutletAction(
  id: string,
  outletData: {
    name?: string;
    isActive?: boolean;
    address?: any;
    phoneNumber?: string;
    email?: string;
    type?: string;
    currency?: string;
    timezone?: string;
    defaultBudgetFoodCostPct?: number;
    defaultBudgetBeverageCostPct?: number;
    targetOccupancy?: number;
  }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    // Get current outlet for audit logging
    const currentOutlet = await prisma.outlet.findUnique({
      where: { id }
    });

    if (!currentOutlet) {
      throw new Error("Outlet not found");
    }

    const outlet = await prisma.outlet.update({
      where: { id },
      data: {
        ...outletData,
        updatedAt: new Date(),
      },
    });

    // Create audit log
    await auditDataChange(
      user.id,
      "UPDATE",
      "outlet",
      id,
      currentOutlet,
      outlet
    );

    revalidatePath("/dashboard/outlets");
    return outlet;
  } catch (error) {
    console.error("Error updating outlet:", error);
    throw new Error("Failed to update outlet");
  }
}

export async function deleteOutletAction(id: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    // Get current outlet for audit logging
    const outletToDelete = await prisma.outlet.findUnique({
      where: { id }
    });

    if (!outletToDelete) {
      throw new Error("Outlet not found");
    }

    await prisma.outlet.delete({
      where: { id },
    });

    // Create audit log
    await auditDataChange(
      user.id,
      "DELETE",
      "outlet",
      id,
      outletToDelete,
      undefined
    );

    revalidatePath("/dashboard/outlets");
    return { success: true };
  } catch (error) {
    console.error("Error deleting outlet:", error);
    throw new Error("Failed to delete outlet");
  }
}

// Alias for backward compatibility
export const getOutletsAction = getAllOutletsAction;

export async function getPaginatedOutletsAction(
  limitValue?: number,
  lastVisibleDocId?: string,
  fetchAll: boolean = false
) {
  try {
    const totalCount = await prisma.outlet.count();
    
    let outlets;
    
    if (fetchAll || !limitValue) {
      outlets = await prisma.outlet.findMany({
        orderBy: {
          name: "asc",
        },
      });
    } else {
      const skip = lastVisibleDocId ? 1 : 0;
      outlets = await prisma.outlet.findMany({
        take: limitValue,
        skip,
        ...(lastVisibleDocId && {
          cursor: {
            id: lastVisibleDocId,
          },
        }),
        orderBy: {
          name: "asc",
        },
      });
    }

    const hasMore = !fetchAll && limitValue ? outlets.length === limitValue : false;
    const lastVisibleDocIdResult = outlets.length > 0 ? outlets[outlets.length - 1].id : null;

    return {
      outlets,
      lastVisibleDocId: lastVisibleDocIdResult,
      hasMore,
      totalCount
    };
  } catch (error) {
    console.error("Error getting paginated outlets:", error);
    throw new Error("Failed to get outlets");
  }
}