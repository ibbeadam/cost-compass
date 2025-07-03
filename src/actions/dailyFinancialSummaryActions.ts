"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import type { DailyFinancialSummary } from "@/types";
import { normalizeDate } from "@/lib/utils";
import { getCurrentUser } from "@/lib/server-auth";
import { auditDataChange } from "@/lib/audit-middleware";

export async function getAllDailyFinancialSummariesAction() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    let whereClause = {};
    
    // Super admins can see all summaries
    if (user.role !== "super_admin") {
      // Property-specific users can only see their properties' data
      const userPropertyIds = user.propertyAccess?.map(access => access.propertyId) || [];
      
      if (userPropertyIds.length === 0) {
        return []; // No access to any properties
      }
      
      whereClause = {
        propertyId: {
          in: userPropertyIds
        }
      };
    }

    const summaries = await prisma.dailyFinancialSummary.findMany({
      where: whereClause,
      include: {
        property: {
          select: {
            id: true,
            name: true,
            propertyCode: true
          }
        }
      },
      orderBy: {
        date: "desc",
      },
    });
    return summaries;
  } catch (error) {
    console.error("Error fetching daily financial summaries:", error);
    throw new Error("Failed to fetch daily financial summaries");
  }
}

export async function getDailyFinancialSummaryByIdAction(id: number) {
  try {
    const summary = await prisma.dailyFinancialSummary.findUnique({
      where: { id: Number(id) },
    });
    return summary;
  } catch (error) {
    console.error("Error fetching daily financial summary:", error);
    throw new Error("Failed to fetch daily financial summary");
  }
}

export async function createDailyFinancialSummaryAction(summaryData: {
  date: Date;
  actualFoodRevenue: number;
  budgetFoodRevenue: number;
  budgetFoodCost: number;
  budgetFoodCostPct: number;
  entFood: number;
  coFood: number;
  otherFoodAdjustment: number;
  actualBeverageRevenue: number;
  budgetBeverageRevenue: number;
  budgetBeverageCost: number;
  budgetBeverageCostPct: number;
  entBeverage: number;
  coBeverage: number;
  otherBeverageAdjustment: number;
  note?: string;
  propertyId?: number;
}) {
  try {
    // Normalize date to YYYY-MM-DD format (date only, no time)
    const normalizedDate = normalizeDate(summaryData.date);

    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    // Handle property selection based on user role
    let propertyId = summaryData.propertyId;
    
    if (user.role === "super_admin") {
      // Super admins must provide a propertyId
      if (!propertyId) {
        throw new Error("Property selection is required for super admin users");
      }
    } else {
      // Property-specific users can only create for their accessible properties
      const userPropertyIds = user.propertyAccess?.map(access => access.propertyId) || [];
      
      if (userPropertyIds.length === 0) {
        throw new Error("No property access found for user");
      }
      
      if (propertyId && !userPropertyIds.includes(propertyId)) {
        throw new Error("Access denied to selected property");
      }
      
      // If no propertyId provided, use user's first accessible property
      if (!propertyId) {
        propertyId = userPropertyIds[0];
      }
    }

    // Verify property exists and is active
    const property = await prisma.property.findFirst({
      where: { 
        id: propertyId,
        isActive: true 
      }
    });
    
    if (!property) {
      throw new Error("Invalid or inactive property selected");
    }

    // Check if record exists for audit purposes
    const existingSummary = await prisma.dailyFinancialSummary.findUnique({
      where: {
        date_propertyId: {
          date: normalizedDate,
          propertyId: propertyId,
        }
      },
    });

    // Use upsert to handle duplicate dates gracefully (now including propertyId)
    const summary = await prisma.dailyFinancialSummary.upsert({
      where: {
        date_propertyId: {
          date: normalizedDate,
          propertyId: propertyId,
        }
      },
      update: {
        actualFoodRevenue: summaryData.actualFoodRevenue,
        budgetFoodRevenue: summaryData.budgetFoodRevenue,
        budgetFoodCost: summaryData.budgetFoodCost,
        budgetFoodCostPct: summaryData.budgetFoodCostPct,
        entFood: summaryData.entFood,
        coFood: summaryData.coFood,
        otherFoodAdjustment: summaryData.otherFoodAdjustment,
        actualBeverageRevenue: summaryData.actualBeverageRevenue,
        budgetBeverageRevenue: summaryData.budgetBeverageRevenue,
        budgetBeverageCost: summaryData.budgetBeverageCost,
        budgetBeverageCostPct: summaryData.budgetBeverageCostPct,
        entBeverage: summaryData.entBeverage,
        coBeverage: summaryData.coBeverage,
        otherBeverageAdjustment: summaryData.otherBeverageAdjustment,
        note: summaryData.note,
      },
      create: {
        ...summaryData,
        date: normalizedDate,
        propertyId: propertyId,
      },
    });

    // Create audit log - distinguish between create and update
    const isUpdate = existingSummary !== null;
    await auditDataChange(
      user.id,
      isUpdate ? "UPDATE" : "CREATE",
      "daily_financial_summary",
      summary.id.toString(),
      isUpdate ? existingSummary : undefined,
      summary,
      propertyId || undefined
    );

    // Trigger automatic cost calculation after creating/updating
    await calculateAndUpdateDailyFinancialSummary(normalizedDate, propertyId || undefined);

    revalidatePath("/dashboard/financial-summary");
    return summary;
  } catch (error) {
    console.error("Error creating daily financial summary:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to create daily financial summary");
  }
}

export async function updateDailyFinancialSummaryAction(
  id: number,
  summaryData: {
    date?: Date;
    actualFoodRevenue?: number;
    budgetFoodRevenue?: number;
    budgetFoodCost?: number;
    budgetFoodCostPct?: number;
    entFood?: number;
    coFood?: number;
    otherFoodAdjustment?: number;
    actualBeverageRevenue?: number;
    budgetBeverageRevenue?: number;
    budgetBeverageCost?: number;
    budgetBeverageCostPct?: number;
    entBeverage?: number;
    coBeverage?: number;
    otherBeverageAdjustment?: number;
    note?: string;
    propertyId?: number;
  }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    // Get current entry to know the date for recalculation and for audit
    const currentSummary = await prisma.dailyFinancialSummary.findUnique({
      where: { id: Number(id) },
    });

    if (!currentSummary) {
      throw new Error("Daily financial summary not found");
    }

    // Normalize the date if provided
    const processedData = { ...summaryData };
    if (processedData.date) {
      processedData.date = normalizeDate(processedData.date);
    }

    const summary = await prisma.dailyFinancialSummary.update({
      where: { id: Number(id) },
      data: processedData,
    });

    // Create audit log
    await auditDataChange(
      user.id,
      "UPDATE",
      "daily_financial_summary",
      summary.id.toString(),
      currentSummary,
      summary,
      summary.propertyId || undefined
    );

    // Trigger recalculation for both old and new dates
    await calculateAndUpdateDailyFinancialSummary(currentSummary.date, currentSummary.propertyId);
    if (processedData.date && processedData.date !== currentSummary.date) {
      await calculateAndUpdateDailyFinancialSummary(processedData.date, currentSummary.propertyId);
    }

    revalidatePath("/dashboard/financial-summary");
    return summary;
  } catch (error) {
    console.error("Error updating daily financial summary:", error);
    throw new Error("Failed to update daily financial summary");
  }
}

export async function deleteDailyFinancialSummaryAction(id: number) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    // Get the summary for audit logging
    const summaryToDelete = await prisma.dailyFinancialSummary.findUnique({
      where: { id: Number(id) }
    });

    if (!summaryToDelete) {
      throw new Error("Daily financial summary not found");
    }

    await prisma.dailyFinancialSummary.delete({
      where: { id: Number(id) },
    });

    // Create audit log
    await auditDataChange(
      user.id,
      "DELETE",
      "daily_financial_summary",
      id.toString(),
      summaryToDelete,
      undefined,
      summaryToDelete.propertyId || undefined
    );

    revalidatePath("/dashboard/financial-summary");
    return { success: true };
  } catch (error) {
    console.error("Error deleting daily financial summary:", error);
    throw new Error("Failed to delete daily financial summary");
  }
}

export async function getDailyFinancialSummariesByDateRangeAction(
  startDate: Date,
  endDate: Date,
  outletId?: string,
  propertyId?: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    let whereClause: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };
    
    // Handle property-specific filtering
    if (propertyId && propertyId !== "all") {
      whereClause.propertyId = parseInt(propertyId);
    } else if (user.role !== "super_admin") {
      // Property-specific users can only see their properties' data
      const userPropertyIds = user.propertyAccess?.map(access => access.propertyId) || [];
      
      if (userPropertyIds.length === 0) {
        return [];
      }
      
      whereClause.propertyId = {
        in: userPropertyIds
      };
    }

    // Handle outlet-specific filtering
    if (outletId && outletId !== "all") {
      // For outlet filtering, we need to get all summaries for the property that contains this outlet
      // and then filter by outlet on the frontend since daily summaries are property-level, not outlet-level
      // This parameter is mainly for consistency with other actions
    }

    const summaries = await prisma.dailyFinancialSummary.findMany({
      where: whereClause,
      include: {
        property: {
          select: {
            id: true,
            name: true,
            propertyCode: true
          }
        }
      },
      orderBy: {
        date: "desc",
      },
    });

    return summaries;
  } catch (error) {
    console.error("Error fetching daily financial summaries by date range:", error);
    throw new Error("Failed to fetch daily financial summaries");
  }
}

export async function getPaginatedDailyFinancialSummariesAction(
  limitValue?: number,
  lastVisibleDocId?: number,
  fetchAll: boolean = false
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    let whereClause = {};
    
    // Super admins can see all summaries
    if (user.role !== "super_admin") {
      // Property-specific users can only see their properties' data
      const userPropertyIds = user.propertyAccess?.map(access => access.propertyId) || [];
      
      if (userPropertyIds.length === 0) {
        return {
          summaries: [],
          lastVisibleDocId: null,
          hasMore: false,
          totalCount: 0
        };
      }
      
      whereClause = {
        propertyId: {
          in: userPropertyIds
        }
      };
    }

    const totalCount = await prisma.dailyFinancialSummary.count({ where: whereClause });
    
    let summaries;
    
    if (fetchAll || !limitValue) {
      summaries = await prisma.dailyFinancialSummary.findMany({
        where: whereClause,
        include: {
          property: {
            select: {
              id: true,
              name: true,
              propertyCode: true
            }
          }
        },
        orderBy: {
          date: "desc",
        },
      });
    } else {
      const skip = lastVisibleDocId ? 1 : 0;
      summaries = await prisma.dailyFinancialSummary.findMany({
        where: whereClause,
        take: limitValue,
        skip,
        ...(lastVisibleDocId && {
          cursor: {
            id: lastVisibleDocId,
          },
        }),
        include: {
          property: {
            select: {
              id: true,
              name: true,
              propertyCode: true
            }
          }
        },
        orderBy: {
          date: "desc",
        },
      });
    }

    const hasMore = !fetchAll && limitValue ? summaries.length === limitValue : false;
    const lastVisibleDocIdResult = summaries.length > 0 ? summaries[summaries.length - 1].id : null;

    return {
      summaries,
      lastVisibleDocId: lastVisibleDocIdResult,
      hasMore,
      totalCount
    };
  } catch (error) {
    console.error("Error getting paginated daily financial summaries:", error);
    throw new Error("Failed to get daily financial summaries");
  }
}

// Function to calculate actual costs and percentages based on food/beverage cost entries
export async function calculateAndUpdateDailyFinancialSummary(date: Date, propertyId?: number): Promise<void> {
  const normalizedDate = normalizeDate(date);

  try {
    // Get existing summary - if propertyId provided, find specific one, otherwise find first
    let summary;
    if (propertyId) {
      summary = await prisma.dailyFinancialSummary.findUnique({
        where: { 
          date_propertyId: {
            date: normalizedDate,
            propertyId: propertyId,
          }
        },
      });
    } else {
      summary = await prisma.dailyFinancialSummary.findFirst({
        where: { date: normalizedDate },
      });
    }

    if (!summary) {
      console.log(`No DailyFinancialSummary found for ${format(normalizedDate, "yyyy-MM-dd")}`);
      return;
    }

    // Calculate totals from food cost entries (property-aware)
    // Handle both exact propertyId match and null propertyId for backward compatibility
    const foodCostEntries = await prisma.foodCostEntry.findMany({
      where: {
        date: {
          gte: normalizedDate,
          lt: new Date(normalizedDate.getTime() + 24 * 60 * 60 * 1000), // Next day
        },
        OR: [
          { propertyId: summary.propertyId },
          // Fallback for entries without propertyId (legacy data)
          ...(summary.propertyId ? [{ propertyId: null }] : [])
        ],
      },
    });

    const totalFoodCost = foodCostEntries.reduce((sum, entry) => sum + entry.totalFoodCost, 0);

    // Calculate totals from beverage cost entries (property-aware)
    const beverageCostEntries = await prisma.beverageCostEntry.findMany({
      where: {
        date: {
          gte: normalizedDate,
          lt: new Date(normalizedDate.getTime() + 24 * 60 * 60 * 1000), // Next day
        },
        OR: [
          { propertyId: summary.propertyId },
          // Fallback for entries without propertyId (legacy data)
          ...(summary.propertyId ? [{ propertyId: null }] : [])
        ],
      },
    });

    const totalBeverageCost = beverageCostEntries.reduce((sum, entry) => sum + entry.totalBeverageCost, 0);

    // Debug logging
    console.log(`Calculation for ${format(normalizedDate, "yyyy-MM-dd")} (Property ID: ${summary.propertyId}):`);
    console.log(`  Found ${foodCostEntries.length} food cost entries, total: $${totalFoodCost}`);
    console.log(`  Found ${beverageCostEntries.length} beverage cost entries, total: $${totalBeverageCost}`);
    console.log(`  Adjustments - Food: ent(-${summary.entFood}) + co(-${summary.coFood}) + other(+${summary.otherFoodAdjustment})`);
    console.log(`  Adjustments - Beverage: ent(-${summary.entBeverage}) + co(-${summary.coBeverage}) + other(+${summary.otherBeverageAdjustment})`);

    // Calculate actual costs with proper adjustment logic
    // entFood and coFood are always subtracted (entertainment and complimentary costs reduce actual cost)
    // otherAdjustment: if positive = add to cost, if negative = subtract from cost
    const actualFoodCost = totalFoodCost - summary.entFood - summary.coFood + summary.otherFoodAdjustment;
    const actualBeverageCost = totalBeverageCost - summary.entBeverage - summary.coBeverage + summary.otherBeverageAdjustment;

    // Calculate percentages
    const actualFoodCostPct = summary.actualFoodRevenue > 0 ? (actualFoodCost / summary.actualFoodRevenue) * 100 : 0;
    const actualBeverageCostPct = summary.actualBeverageRevenue > 0 ? (actualBeverageCost / summary.actualBeverageRevenue) * 100 : 0;

    // Calculate variances
    const foodVariancePct = actualFoodCostPct - summary.budgetFoodCostPct;
    const beverageVariancePct = actualBeverageCostPct - summary.budgetBeverageCostPct;

    // Update the summary with calculated values
    await prisma.dailyFinancialSummary.update({
      where: { 
        date_propertyId: {
          date: normalizedDate,
          propertyId: summary.propertyId,
        }
      },
      data: {
        actualFoodCost,
        actualFoodCostPct,
        foodVariancePct,
        actualBeverageCost,
        actualBeverageCostPct,
        beverageVariancePct,
      },
    });

    console.log(`Updated calculated fields for ${format(normalizedDate, "yyyy-MM-dd")}`);

    revalidatePath("/dashboard/financial-summary");
    revalidatePath("/dashboard");
  } catch (error) {
    console.error("Error calculating financial summary:", error);
    throw new Error("Failed to calculate financial summary");
  }
}

// Alias for backward compatibility  
export const saveDailyFinancialSummaryAction = createDailyFinancialSummaryAction;