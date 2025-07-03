"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { format as formatDateFn } from "date-fns";
import type { FoodCostEntry, FoodCostDetail } from "@/types";
import { calculateAndUpdateDailyFinancialSummary } from "./dailyFinancialSummaryActions";
import { getCurrentUser } from "@/lib/server-auth";
import { normalizeDate } from "@/lib/utils";
import { auditDataChange } from "@/lib/audit-middleware";

interface FoodCostItemInput {
  id?: number; 
  categoryId: number;
  categoryName?: string;
  cost: number;
  description?: string;
}

export async function getAllFoodCostEntriesAction() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    let whereClause = {};
    
    // Super admins can see all entries
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

    const entries = await prisma.foodCostEntry.findMany({
      where: whereClause,
      include: {
        outlet: true,
        property: {
          select: {
            id: true,
            name: true,
            propertyCode: true
          }
        },
        details: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });
    return entries;
  } catch (error) {
    console.error("Error fetching food cost entries:", error);
    throw new Error("Failed to fetch food cost entries");
  }
}

export async function getFoodCostEntryByIdAction(id: number) {
  try {
    console.log("Fetching food cost entry with ID:", id);
    
    const entry = await prisma.foodCostEntry.findUnique({
      where: { id: Number(id) },
      include: {
        outlet: true,
        property: {
          select: {
            id: true,
            name: true,
            propertyCode: true
          }
        },
        details: {
          include: {
            category: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        updatedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
      },
    });
    
    if (!entry) {
      console.log("Food cost entry not found with ID:", id);
      throw new Error("Food cost entry not found");
    }
    
    console.log("Successfully fetched food cost entry:", entry.id);
    return entry;
  } catch (error) {
    console.error("Error fetching food cost entry:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to fetch food cost entry");
  }
}

export async function createFoodCostEntryAction(entryData: {
  date: Date;
  outletId: number;
  totalFoodCost: number;
  details?: FoodCostItemInput[];
  propertyId?: number;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    // Get property ID from outlet if not provided
    let propertyId = entryData.propertyId;
    if (!propertyId) {
      const outlet = await prisma.outlet.findUnique({
        where: { id: entryData.outletId },
        select: { propertyId: true }
      });
      propertyId = outlet?.propertyId;
    }

    // Validate property access for non-super admin users
    if (user.role !== "super_admin" && propertyId) {
      const userPropertyIds = user.propertyAccess?.map(access => access.propertyId) || [];
      
      if (!userPropertyIds.includes(propertyId)) {
        throw new Error("Access denied to selected property");
      }
    }

    // Verify outlet belongs to accessible property
    const outletWithProperty = await prisma.outlet.findUnique({
      where: { id: entryData.outletId },
      include: { property: true }
    });
    
    if (!outletWithProperty) {
      throw new Error("Invalid outlet selected");
    }
    
    if (user.role !== "super_admin") {
      const userPropertyIds = user.propertyAccess?.map(access => access.propertyId) || [];
      
      if (!userPropertyIds.includes(outletWithProperty.propertyId)) {
        throw new Error("Access denied to outlet's property");
      }
    }

    const entry = await prisma.foodCostEntry.create({
      data: {
        date: entryData.date,
        outletId: entryData.outletId,
        totalFoodCost: entryData.totalFoodCost,
        propertyId: propertyId,
        createdBy: user.id,
        updatedBy: user.id,
        details: entryData.details ? {
          create: entryData.details.map(detail => ({
            categoryId: detail.categoryId,
            categoryName: detail.categoryName,
            cost: detail.cost,
            description: detail.description,
            createdBy: user.id,
            updatedBy: user.id,
          })),
        } : undefined,
      },
      include: {
        outlet: true,
        details: {
          include: {
            category: true,
          },
        },
      },
    });

    // Trigger recalculation of daily financial summary
    await calculateAndUpdateDailyFinancialSummary(entryData.date, propertyId || undefined);

    // Create audit log
    await auditDataChange(
      user.id,
      "CREATE",
      "food_cost_entry",
      entry.id,
      undefined,
      entry,
      propertyId || undefined
    );

    revalidatePath("/dashboard/food-cost-input");
    revalidatePath("/dashboard/financial-summary");
    revalidatePath("/dashboard"); // Revalidate main dashboard
    return entry;
  } catch (error) {
    console.error("Error creating food cost entry:", error);
    throw new Error("Failed to create food cost entry");
  }
}

export async function updateFoodCostEntryAction(
  id: number,
  entryData: {
    date?: Date;
    outletId?: number;
    totalFoodCost?: number;
    details?: FoodCostItemInput[];
    propertyId?: number;
  }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    // Get current entry to know the date for recalculation
    const currentEntry = await prisma.foodCostEntry.findUnique({
      where: { id: Number(id) },
    });

    if (!currentEntry) {
      throw new Error("Food cost entry not found");
    }

    // If details are provided, update them
    if (entryData.details) {
      // Delete existing details
      await prisma.foodCostDetail.deleteMany({
        where: { foodCostEntryId: Number(id) },
      });

      // Create new details
      if (entryData.details.length > 0) {
        await prisma.foodCostDetail.createMany({
          data: entryData.details.map(detail => ({
            foodCostEntryId: Number(id),
            categoryId: detail.categoryId,
            categoryName: detail.categoryName,
            cost: detail.cost,
            description: detail.description,
            createdBy: user.id,
            updatedBy: user.id,
          })),
        });
      }
    }

    // Update the main entry
    const entry = await prisma.foodCostEntry.update({
      where: { id: Number(id) },
      data: {
        date: entryData.date,
        outletId: entryData.outletId,
        totalFoodCost: entryData.totalFoodCost,
        propertyId: entryData.propertyId,
        updatedBy: user.id,
      },
      include: {
        outlet: true,
        details: {
          include: {
            category: true,
          },
        },
      },
    });

    // Trigger recalculation for both old and new dates
    await calculateAndUpdateDailyFinancialSummary(currentEntry.date);
    if (entryData.date && entryData.date !== currentEntry.date) {
      await calculateAndUpdateDailyFinancialSummary(entryData.date);
    }

    revalidatePath("/dashboard/food-cost-input");
    revalidatePath("/dashboard/financial-summary");
    revalidatePath("/dashboard"); // Revalidate main dashboard
    return entry;
  } catch (error) {
    console.error("Error updating food cost entry:", error);
    throw new Error("Failed to update food cost entry");
  }
}

export async function deleteFoodCostEntryAction(id: number) {
  try {
    console.log("Delete action called with ID:", id, "Type:", typeof id);
    
    // Get entry date for recalculation
    const entry = await prisma.foodCostEntry.findUnique({
      where: { id: Number(id) },
    });

    console.log("Found entry for deletion:", entry);

    if (!entry) {
      throw new Error(`Food cost entry with ID ${id} not found`);
    }

    // Store the date for recalculation
    const entryDate = entry.date;
    console.log("Entry date for recalculation:", entryDate);

    // Delete associated details first (explicit deletion since cascade might not be configured)
    console.log("Deleting associated food cost details...");
    const deleteDetailsResult = await prisma.foodCostDetail.deleteMany({
      where: { foodCostEntryId: Number(id) },
    });
    console.log("Deleted food cost details:", deleteDetailsResult);

    // Delete the main entry
    console.log("Deleting food cost entry with ID:", id);
    await prisma.foodCostEntry.delete({
      where: { id: Number(id) },
    });

    console.log("Food cost entry deleted successfully, triggering recalculation...");
    
    // Trigger recalculation (but don't fail the deletion if recalculation fails)
    try {
      await calculateAndUpdateDailyFinancialSummary(entryDate);
      console.log("Recalculation completed successfully");
    } catch (recalcError) {
      console.error("Error during recalculation (non-fatal):", recalcError);
      // Continue - deletion was successful even if recalculation failed
    }

    console.log("Revalidating paths...");
    revalidatePath("/dashboard/food-cost-input");
    revalidatePath("/dashboard/financial-summary");
    revalidatePath("/dashboard"); // Revalidate main dashboard
    
    console.log("Delete operation completed successfully");
    return { success: true };
  } catch (error) {
    console.error("Error deleting food cost entry:", error);
    // Re-throw the original error instead of a generic message
    if (error instanceof Error) {
      throw new Error(`Failed to delete food cost entry: ${error.message}`);
    }
    throw new Error("Failed to delete food cost entry: Unknown error");
  }
}

export async function getFoodCostEntriesByDateRangeAction(
  startDate: Date,
  endDate: Date,
  outletId?: number,
  propertyId?: string
) {
  try {
    const whereClause: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (outletId) {
      whereClause.outletId = outletId;
    }

    if (propertyId && propertyId !== "all") {
      whereClause.propertyId = parseInt(propertyId);
    }

    const entries = await prisma.foodCostEntry.findMany({
      where: whereClause,
      include: {
        outlet: true,
        details: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return entries;
  } catch (error) {
    console.error("Error fetching food cost entries by date range:", error);
    throw new Error("Failed to fetch food cost entries");
  }
}

export async function getFoodCostEntriesForDateAction(date: Date, outletId?: number, propertyId?: number) {
  try {
    const normalizedDate = normalizeDate(date);
    
    const whereClause: any = {
      date: {
        gte: normalizedDate,
        lt: new Date(normalizedDate.getTime() + 24 * 60 * 60 * 1000),
      },
    };

    if (outletId) {
      whereClause.outletId = outletId;
    }

    if (propertyId) {
      whereClause.propertyId = propertyId;
    }

    const entries = await prisma.foodCostEntry.findMany({
      where: whereClause,
      include: {
        outlet: true,
        details: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return entries;
  } catch (error) {
    console.error("Error fetching food cost entries for date:", error);
    throw new Error("Failed to fetch food cost entries");
  }
}

export async function getFoodCostEntriesByOutletAction(outletId: number) {
  try {
    const entries = await prisma.foodCostEntry.findMany({
      where: { outletId: Number(outletId) },
      include: {
        outlet: true,
        details: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });
    return entries;
  } catch (error) {
    console.error("Error fetching food cost entries by outlet:", error);
    throw new Error("Failed to fetch food cost entries");
  }
}

// Food Cost Detail Actions
export async function createFoodCostDetailAction(detailData: {
  foodCostEntryId: number;
  categoryId: number;
  categoryName?: string;
  cost: number;
  description?: string;
}) {
  try {
    const detail = await prisma.foodCostDetail.create({
      data: detailData,
      include: {
        category: true,
        foodCostEntry: {
          include: {
            outlet: true,
          },
        },
      },
    });

    // Update total cost of the parent entry
    const totalCost = await prisma.foodCostDetail.aggregate({
      where: { foodCostEntryId: detailData.foodCostEntryId },
      _sum: { cost: true },
    });

    await prisma.foodCostEntry.update({
      where: { id: detailData.foodCostEntryId },
      data: { totalFoodCost: totalCost._sum.cost || 0 },
    });

    // Trigger recalculation
    if (detail.foodCostEntry) {
      await calculateAndUpdateDailyFinancialSummary(detail.foodCostEntry.date);
    }

    revalidatePath("/dashboard/food-cost-input");
    revalidatePath("/dashboard/financial-summary");
    revalidatePath("/dashboard"); // Revalidate main dashboard
    return detail;
  } catch (error) {
    console.error("Error creating food cost detail:", error);
    throw new Error("Failed to create food cost detail");
  }
}

export async function updateFoodCostDetailAction(
  id: number,
  detailData: {
    categoryId?: number;
    categoryName?: string;
    cost?: number;
    description?: string;
  }
) {
  try {
    const detail = await prisma.foodCostDetail.update({
      where: { id: Number(id) },
      data: detailData,
      include: {
        category: true,
        foodCostEntry: {
          include: {
            outlet: true,
          },
        },
      },
    });

    // Update total cost of the parent entry
    const totalCost = await prisma.foodCostDetail.aggregate({
      where: { foodCostEntryId: detail.foodCostEntryId },
      _sum: { cost: true },
    });

    await prisma.foodCostEntry.update({
      where: { id: detail.foodCostEntryId },
      data: { totalFoodCost: totalCost._sum.cost || 0 },
    });

    // Trigger recalculation
    if (detail.foodCostEntry) {
      await calculateAndUpdateDailyFinancialSummary(detail.foodCostEntry.date);
    }

    revalidatePath("/dashboard/food-cost-input");
    revalidatePath("/dashboard/financial-summary");
    revalidatePath("/dashboard"); // Revalidate main dashboard
    return detail;
  } catch (error) {
    console.error("Error updating food cost detail:", error);
    throw new Error("Failed to update food cost detail");
  }
}

export async function deleteFoodCostDetailAction(id: number) {
  try {
    // Get detail info before deletion
    const detail = await prisma.foodCostDetail.findUnique({
      where: { id: Number(id) },
      include: {
        foodCostEntry: true,
      },
    });

    if (!detail) {
      throw new Error("Food cost detail not found");
    }

    await prisma.foodCostDetail.delete({
      where: { id: Number(id) },
    });

    // Update total cost of the parent entry
    const totalCost = await prisma.foodCostDetail.aggregate({
      where: { foodCostEntryId: detail.foodCostEntryId },
      _sum: { cost: true },
    });

    await prisma.foodCostEntry.update({
      where: { id: detail.foodCostEntryId },
      data: { totalFoodCost: totalCost._sum.cost || 0 },
    });

    // Trigger recalculation
    await calculateAndUpdateDailyFinancialSummary(detail.foodCostEntry.date);

    revalidatePath("/dashboard/food-cost-input");
    revalidatePath("/dashboard/financial-summary");
    revalidatePath("/dashboard"); // Revalidate main dashboard
    return { success: true };
  } catch (error) {
    console.error("Error deleting food cost detail:", error);
    throw new Error("Failed to delete food cost detail");
  }
}

// Legacy function aliases for compatibility
export const saveFoodCostEntryAction = createFoodCostEntryAction;
export const getFoodCostEntryWithDetailsAction = getFoodCostEntryByIdAction;

// Category functions that redirect to the category actions
export async function getFoodCategoriesAction() {
  try {
    const categories = await prisma.category.findMany({
      where: { type: "Food" },
      orderBy: { name: "asc" },
    });
    return categories;
  } catch (error) {
    console.error("Error fetching food categories:", error);
    throw new Error("Failed to fetch food categories");
  }
}

// Outlet function that redirects to outlet actions
export async function getOutletsAction() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    let whereClause = {};
    
    // Super admins can see all outlets
    if (user.role !== "super_admin") {
      // Property-specific users can only see outlets from their accessible properties
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

    const outlets = await prisma.outlet.findMany({
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
      orderBy: { name: "asc" },
    });
    return outlets;
  } catch (error) {
    console.error("Error fetching outlets:", error);
    throw new Error("Failed to fetch outlets");
  }
}

// Report functions
export async function getDetailedFoodCostReportAction(
  startDate: Date,
  endDate: Date,
  outletId?: number | string
) {
  try {
    // Handle "all" or string outletId by converting to undefined
    const numericOutletId = typeof outletId === 'string' && outletId === 'all' 
      ? undefined 
      : typeof outletId === 'string' 
      ? Number(outletId) 
      : outletId;
      
    const entries = await getFoodCostEntriesByDateRangeAction(startDate, endDate, numericOutletId);
    
    // Get outlets for outlet names
    const outlets = await prisma.outlet.findMany();
    const outletMap = new Map(outlets.map(o => [o.id, o.name]));
    
    // Get financial summaries for revenue and budget data
    const financialSummaries = await prisma.dailyFinancialSummary.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
    
    // Group entries by outlet
    const outletEntries = new Map<number, typeof entries>();
    entries.forEach(entry => {
      if (!outletEntries.has(entry.outletId)) {
        outletEntries.set(entry.outletId, []);
      }
      outletEntries.get(entry.outletId)!.push(entry);
    });
    
    // Transform to expected format
    const outletReports = Array.from(outletEntries.entries()).map(([outletId, outletData]) => {
      // Calculate category costs
      const categoryCosts = new Map<string, number>();
      const foodCostDetailsByItem: { categoryName: string; description: string; cost: number; percentageOfTotalCost?: number }[] = [];
      
      let totalCostOfFood = 0;
      
      outletData.forEach(entry => {
        totalCostOfFood += entry.totalFoodCost || 0;
        
        entry.details?.forEach(detail => {
          const categoryName = detail.category?.name || detail.categoryName || 'Unknown';
          const currentCost = categoryCosts.get(categoryName) || 0;
          categoryCosts.set(categoryName, currentCost + detail.cost);
          
          foodCostDetailsByItem.push({
            categoryName,
            description: detail.description || '',
            cost: detail.cost,
            percentageOfTotalCost: 0 // Will be calculated below
          });
        });
      });
      
      // For individual outlet reports, we'll use placeholder values since financial summaries
      // are not outlet-specific in the current schema. Real values will be calculated in overall summary.
      const totalFoodRevenue = 0; // Will be calculated properly in overall summary
      const budgetFoodCostPercentage = 0; // Will be calculated properly in overall summary
      const foodCostPercentage = 0; // Will be calculated properly in overall summary
      const variancePercentage = 0; // Will be calculated properly in overall summary
      
      // Calculate percentages
      foodCostDetailsByItem.forEach(item => {
        item.percentageOfTotalCost = totalCostOfFood > 0 ? (item.cost / totalCostOfFood) * 100 : 0;
      });
      
      return {
        outletName: outletMap.get(outletId) || 'Unknown Outlet',
        outletId: outletId.toString(),
        dateRange: { from: startDate, to: endDate },
        categoryCosts: Array.from(categoryCosts.entries()).map(([categoryName, totalCost]) => ({
          categoryName,
          totalCost,
          percentageOfTotalCost: totalCostOfFood > 0 ? (totalCost / totalCostOfFood) * 100 : 0
        })),
        totalCostFromTransfers: totalCostOfFood, // Use actual food cost as transfer cost
        otherAdjustmentsFood: 0, // Will be calculated in overall summary
        ocFoodTotal: 0, // Will be calculated in overall summary
        entFoodTotal: 0, // Will be calculated in overall summary
        totalCostOfFood,
        totalFoodRevenue,
        foodCostPercentage,
        budgetFoodCostPercentage,
        variancePercentage,
        foodCostDetailsByItem
      };
    });
    
    // Create overall summary by aggregating all outlet reports and financial data
    const overallCategoryCosts = new Map<string, number>();
    const overallFoodCostDetailsByItem: { categoryName: string; description: string; cost: number; percentageOfTotalCost?: number }[] = [];
    let overallTotalCostOfFood = 0;
    let overallTotalFoodRevenue = 0;
    let overallTotalEntFood = 0;
    let overallTotalCoFood = 0;
    let overallTotalOtherFoodAdjustment = 0;
    let overallTotalBudgetFoodCost = 0;
    let overallTotalBudgetFoodRevenue = 0;
    
    // Aggregate cost data from outlet reports (only cost-related data, not financial summary data)
    outletReports.forEach(report => {
      overallTotalCostOfFood += report.totalCostOfFood;
      
      report.categoryCosts.forEach(({ categoryName, totalCost }) => {
        const currentCost = overallCategoryCosts.get(categoryName) || 0;
        overallCategoryCosts.set(categoryName, currentCost + totalCost);
      });
      
      overallFoodCostDetailsByItem.push(...report.foodCostDetailsByItem);
    });
    
    // Get financial summary data separately (only once, not per outlet to avoid double counting)
    overallTotalFoodRevenue = financialSummaries.reduce((sum, summary) => sum + (summary.actualFoodRevenue || 0), 0);
    overallTotalBudgetFoodCost = financialSummaries.reduce((sum, summary) => sum + (summary.budgetFoodCost || 0), 0);
    overallTotalBudgetFoodRevenue = financialSummaries.reduce((sum, summary) => sum + (summary.budgetFoodRevenue || 0), 0);
    overallTotalEntFood = financialSummaries.reduce((sum, summary) => sum + (summary.entFood || 0), 0);
    overallTotalCoFood = financialSummaries.reduce((sum, summary) => sum + (summary.coFood || 0), 0);
    overallTotalOtherFoodAdjustment = financialSummaries.reduce((sum, summary) => sum + (summary.otherFoodAdjustment || 0), 0);
    
    // Calculate actual food cost using the same formula as financial summary module
    // actualFoodCost = totalFoodCost - entFood - coFood + otherFoodAdjustment
    const actualFoodCost = overallTotalCostOfFood - overallTotalEntFood - overallTotalCoFood + overallTotalOtherFoodAdjustment;
    
    // Calculate average budgeted food cost percentage from financial summaries
    const validFoodBudgetPcts = financialSummaries.filter(summary => summary.budgetFoodCostPct != null && summary.budgetFoodCostPct > 0);
    const overallBudgetFoodCostPercentage = validFoodBudgetPcts.length > 0 
      ? validFoodBudgetPcts.reduce((sum, summary) => sum + (summary.budgetFoodCostPct || 0), 0) / validFoodBudgetPcts.length 
      : 0;
    const overallFoodCostPercentage = overallTotalFoodRevenue > 0 ? (actualFoodCost / overallTotalFoodRevenue) * 100 : 0;
    const overallVariancePercentage = overallFoodCostPercentage - overallBudgetFoodCostPercentage;
    
    console.log('Food Cost Report Debug:', {
      rawTotalCostOfFood: overallTotalCostOfFood,
      actualFoodCost,
      overallTotalFoodRevenue,
      overallTotalEntFood,
      overallTotalCoFood,
      overallTotalOtherFoodAdjustment,
      overallTotalBudgetFoodCost,
      overallTotalBudgetFoodRevenue,
      outletReportsCount: outletReports.length,
      financialSummariesCount: financialSummaries.length
    });
    
    // Recalculate percentages for overall summary
    overallFoodCostDetailsByItem.forEach(item => {
      item.percentageOfTotalCost = overallTotalCostOfFood > 0 ? (item.cost / overallTotalCostOfFood) * 100 : 0;
    });
    
    const overallSummaryReport = {
      outletName: 'All Outlets',
      outletId: 'all',
      dateRange: { from: startDate, to: endDate },
      categoryCosts: Array.from(overallCategoryCosts.entries()).map(([categoryName, totalCost]) => ({
        categoryName,
        totalCost,
        percentageOfTotalCost: overallTotalCostOfFood > 0 ? (totalCost / overallTotalCostOfFood) * 100 : 0
      })),
      totalCostFromTransfers: overallTotalCostOfFood, // This represents the base cost before adjustments
      otherAdjustmentsFood: overallTotalOtherFoodAdjustment,
      ocFoodTotal: overallTotalCoFood,
      entFoodTotal: overallTotalEntFood,
      totalCostOfFood: actualFoodCost,
      totalFoodRevenue: overallTotalFoodRevenue,
      foodCostPercentage: overallFoodCostPercentage,
      budgetFoodCostPercentage: overallBudgetFoodCostPercentage,
      variancePercentage: overallVariancePercentage,
      foodCostDetailsByItem: overallFoodCostDetailsByItem
    };
    
    return {
      outletReports,
      overallSummaryReport
    };
  } catch (error) {
    console.error("Error fetching detailed food cost report:", error);
    throw new Error("Failed to fetch detailed food cost report");
  }
}

export async function getCostAnalysisByCategoryReportAction(
  startDate: Date,
  endDate: Date,
  outletId?: number | string
) {
  try {
    // Handle "all" or string outletId by converting to undefined
    const numericOutletId = typeof outletId === 'string' && outletId === 'all' 
      ? undefined 
      : typeof outletId === 'string' 
      ? Number(outletId) 
      : outletId;

    // Fetch food cost details
    const foodDetails = await prisma.foodCostDetail.findMany({
      where: {
        foodCostEntry: {
          date: {
            gte: startDate,
            lte: endDate,
          },
          ...(numericOutletId && { outletId: numericOutletId }),
        },
      },
      include: {
        category: true,
        foodCostEntry: {
          include: {
            outlet: true,
          },
        },
      },
    });

    // Fetch beverage cost details
    const beverageDetails = await prisma.beverageCostDetail.findMany({
      where: {
        beverageCostEntry: {
          date: {
            gte: startDate,
            lte: endDate,
          },
          ...(numericOutletId && { outletId: numericOutletId }),
        },
      },
      include: {
        category: true,
        beverageCostEntry: {
          include: {
            outlet: true,
          },
        },
      },
    });

    // Get daily financial summaries for revenue data and adjustments
    const financialSummaries = await prisma.dailyFinancialSummary.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Calculate totals from financial summaries
    const totalFoodRevenue = financialSummaries.reduce((sum, s) => sum + (s.actualFoodRevenue || 0), 0);
    const totalBeverageRevenue = financialSummaries.reduce((sum, s) => sum + (s.actualBeverageRevenue || 0), 0);
    const totalRevenue = totalFoodRevenue + totalBeverageRevenue;

    // Calculate raw costs from cost details
    const rawFoodCost = foodDetails.reduce((sum, detail) => sum + detail.cost, 0);
    const rawBeverageCost = beverageDetails.reduce((sum, detail) => sum + detail.cost, 0);

    // Calculate adjustments from financial summaries
    const totalEntFood = financialSummaries.reduce((sum, s) => sum + (s.entFood || 0), 0);
    const totalCoFood = financialSummaries.reduce((sum, s) => sum + (s.coFood || 0), 0);
    const totalOtherFoodAdjustment = financialSummaries.reduce((sum, s) => sum + (s.otherFoodAdjustment || 0), 0);
    const totalEntBeverage = financialSummaries.reduce((sum, s) => sum + (s.entBeverage || 0), 0);
    const totalCoBeverage = financialSummaries.reduce((sum, s) => sum + (s.coBeverage || 0), 0);
    const totalOtherBeverageAdjustment = financialSummaries.reduce((sum, s) => sum + (s.otherBeverageAdjustment || 0), 0);

    // Calculate final costs after adjustments
    const totalFoodCost = rawFoodCost - (totalEntFood + totalCoFood) + totalOtherFoodAdjustment;
    const totalBeverageCost = rawBeverageCost - (totalEntBeverage + totalCoBeverage) + totalOtherBeverageAdjustment;
    const totalCost = totalFoodCost + totalBeverageCost;

    // Process food categories
    const foodCategoryMap = new Map();
    foodDetails.forEach(detail => {
      const categoryName = detail.category?.name || 'Unknown';
      const outletName = detail.foodCostEntry.outlet?.name || 'Unknown';
      
      if (!foodCategoryMap.has(categoryName)) {
        foodCategoryMap.set(categoryName, {
          categoryId: detail.categoryId.toString(),
          categoryName,
          totalCost: 0,
          outletBreakdown: new Map(),
        });
      }
      
      const category = foodCategoryMap.get(categoryName);
      category.totalCost += detail.cost;
      
      if (!category.outletBreakdown.has(outletName)) {
        category.outletBreakdown.set(outletName, 0);
      }
      category.outletBreakdown.set(outletName, category.outletBreakdown.get(outletName) + detail.cost);
    });

    // Process beverage categories
    const beverageCategoryMap = new Map();
    beverageDetails.forEach(detail => {
      const categoryName = detail.category?.name || 'Unknown';
      const outletName = detail.beverageCostEntry.outlet?.name || 'Unknown';
      
      if (!beverageCategoryMap.has(categoryName)) {
        beverageCategoryMap.set(categoryName, {
          categoryId: detail.categoryId.toString(),
          categoryName,
          totalCost: 0,
          outletBreakdown: new Map(),
        });
      }
      
      const category = beverageCategoryMap.get(categoryName);
      category.totalCost += detail.cost;
      
      if (!category.outletBreakdown.has(outletName)) {
        category.outletBreakdown.set(outletName, 0);
      }
      category.outletBreakdown.set(outletName, category.outletBreakdown.get(outletName) + detail.cost);
    });

    // Calculate number of days for averages
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Convert food categories to final format
    const foodCategories = Array.from(foodCategoryMap.values()).map(cat => ({
      categoryId: cat.categoryId,
      categoryName: cat.categoryName,
      totalCost: cat.totalCost,
      percentageOfTotalFoodCost: rawFoodCost > 0 ? (cat.totalCost / rawFoodCost) * 100 : 0,
      percentageOfTotalRevenue: totalRevenue > 0 ? (cat.totalCost / totalRevenue) * 100 : 0,
      averageDailyCost: cat.totalCost / daysDiff,
      outletBreakdown: Array.from(cat.outletBreakdown.entries()).map(([outletName, cost]) => ({
        outletName,
        cost,
        percentageOfOutletFoodCost: cat.totalCost > 0 ? (cost / cat.totalCost) * 100 : 0,
      })),
    }));

    // Convert beverage categories to final format
    const beverageCategories = Array.from(beverageCategoryMap.values()).map(cat => ({
      categoryId: cat.categoryId,
      categoryName: cat.categoryName,
      totalCost: cat.totalCost,
      percentageOfTotalBeverageCost: rawBeverageCost > 0 ? (cat.totalCost / rawBeverageCost) * 100 : 0,
      percentageOfTotalRevenue: totalRevenue > 0 ? (cat.totalCost / totalRevenue) * 100 : 0,
      averageDailyCost: cat.totalCost / daysDiff,
      outletBreakdown: Array.from(cat.outletBreakdown.entries()).map(([outletName, cost]) => ({
        outletName,
        cost,
        percentageOfOutletBeverageCost: cat.totalCost > 0 ? (cost / cat.totalCost) * 100 : 0,
      })),
    }));

    // Sort categories by cost (highest first) and get top categories
    const sortedFoodCategories = [...foodCategories].sort((a, b) => b.totalCost - a.totalCost);
    const sortedBeverageCategories = [...beverageCategories].sort((a, b) => b.totalCost - a.totalCost);

    const topFoodCategories = sortedFoodCategories.slice(0, 5).map(cat => ({
      categoryName: cat.categoryName,
      totalCost: cat.totalCost,
      percentageOfTotalFoodCost: cat.percentageOfTotalFoodCost,
    }));

    const topBeverageCategories = sortedBeverageCategories.slice(0, 5).map(cat => ({
      categoryName: cat.categoryName,
      totalCost: cat.totalCost,
      percentageOfTotalBeverageCost: cat.percentageOfTotalBeverageCost,
    }));

    // Calculate cost percentages
    const overallFoodCostPercentage = totalFoodRevenue > 0 ? (totalFoodCost / totalFoodRevenue) * 100 : 0;
    const overallBeverageCostPercentage = totalBeverageRevenue > 0 ? (totalBeverageCost / totalBeverageRevenue) * 100 : 0;
    const overallCostPercentage = totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 0;

    return {
      dateRange: {
        from: startDate,
        to: endDate,
      },
      totalFoodRevenue,
      totalBeverageRevenue,
      totalRevenue,
      rawFoodCost,
      rawBeverageCost,
      totalFoodCost,
      totalBeverageCost,
      totalCost,
      overallFoodCostPercentage,
      overallBeverageCostPercentage,
      overallCostPercentage,
      foodAdjustments: {
        oc: totalCoFood,
        entertainment: totalEntFood,
        other: totalOtherFoodAdjustment,
      },
      beverageAdjustments: {
        oc: totalCoBeverage,
        entertainment: totalEntBeverage,
        other: totalOtherBeverageAdjustment,
      },
      foodCategories: sortedFoodCategories,
      topFoodCategories,
      beverageCategories: sortedBeverageCategories,
      topBeverageCategories,
    };
  } catch (error) {
    console.error("Error fetching cost analysis by category report:", error);
    throw new Error("Failed to fetch cost analysis by category report");
  }
}