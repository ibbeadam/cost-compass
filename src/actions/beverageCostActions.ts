"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { format as formatDateFn } from "date-fns";
import type { BeverageCostEntry, BeverageCostDetail } from "@/types";
import { calculateAndUpdateDailyFinancialSummary } from "./dailyFinancialSummaryActions";
import { getCurrentUser } from "@/lib/server-auth";
import { normalizeDate } from "@/lib/utils";
import { auditDataChange } from "@/lib/audit-middleware";

interface BeverageCostItemInput {
  id?: number; 
  categoryId: number;
  categoryName?: string;
  cost: number;
  description?: string;
}

export async function getAllBeverageCostEntriesAction() {
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

    const entries = await prisma.beverageCostEntry.findMany({
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
    console.error("Error fetching beverage cost entries:", error);
    throw new Error("Failed to fetch beverage cost entries");
  }
}

export async function getBeverageCostEntryByIdAction(id: number) {
  try {
    console.log("Fetching beverage cost entry with ID:", id);
    
    const entry = await prisma.beverageCostEntry.findUnique({
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
      console.log("Beverage cost entry not found with ID:", id);
      throw new Error("Beverage cost entry not found");
    }
    
    console.log("Successfully fetched beverage cost entry:", entry.id);
    return entry;
  } catch (error) {
    console.error("Error fetching beverage cost entry:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to fetch beverage cost entry");
  }
}

export async function createBeverageCostEntryAction(entryData: {
  date: Date;
  outletId: number;
  totalBeverageCost: number;
  details?: BeverageCostItemInput[];
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

    const entry = await prisma.beverageCostEntry.create({
      data: {
        date: entryData.date,
        outletId: entryData.outletId,
        totalBeverageCost: entryData.totalBeverageCost,
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
      "beverage_cost_entry",
      entry.id,
      undefined,
      entry,
      propertyId || undefined
    );

    revalidatePath("/dashboard/beverage-cost-input");
    revalidatePath("/dashboard/financial-summary");
    revalidatePath("/dashboard"); // Revalidate main dashboard
    return entry;
  } catch (error) {
    console.error("Error creating beverage cost entry:", error);
    throw new Error("Failed to create beverage cost entry");
  }
}

export async function updateBeverageCostEntryAction(
  id: number,
  entryData: {
    date?: Date;
    outletId?: number;
    totalBeverageCost?: number;
    details?: BeverageCostItemInput[];
    propertyId?: number;
  }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    // Get current entry to know the date for recalculation
    const currentEntry = await prisma.beverageCostEntry.findUnique({
      where: { id: Number(id) },
    });

    if (!currentEntry) {
      throw new Error("Beverage cost entry not found");
    }

    // If details are provided, update them
    if (entryData.details) {
      // Delete existing details
      await prisma.beverageCostDetail.deleteMany({
        where: { beverageCostEntryId: Number(id) },
      });

      // Create new details
      if (entryData.details.length > 0) {
        await prisma.beverageCostDetail.createMany({
          data: entryData.details.map(detail => ({
            beverageCostEntryId: Number(id),
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
    const entry = await prisma.beverageCostEntry.update({
      where: { id: Number(id) },
      data: {
        date: entryData.date,
        outletId: entryData.outletId,
        totalBeverageCost: entryData.totalBeverageCost,
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

    // Create audit log
    await auditDataChange(
      user.id,
      "UPDATE",
      "beverage_cost_entry",
      entry.id,
      currentEntry,
      entry,
      entry.propertyId || undefined
    );

    revalidatePath("/dashboard/beverage-cost-input");
    revalidatePath("/dashboard/financial-summary");
    revalidatePath("/dashboard"); // Revalidate main dashboard
    return entry;
  } catch (error) {
    console.error("Error updating beverage cost entry:", error);
    throw new Error("Failed to update beverage cost entry");
  }
}

export async function deleteBeverageCostEntryAction(id: number) {
  try {
    console.log("Delete beverage cost action called with ID:", id, "Type:", typeof id);
    
    // Get entry date for recalculation
    const entry = await prisma.beverageCostEntry.findUnique({
      where: { id: Number(id) },
    });

    console.log("Found beverage cost entry for deletion:", entry);

    if (!entry) {
      throw new Error(`Beverage cost entry with ID ${id} not found`);
    }

    // Store the date for recalculation
    const entryDate = entry.date;
    console.log("Entry date for recalculation:", entryDate);

    // Delete associated details first (explicit deletion since cascade might not be configured)
    console.log("Deleting associated beverage cost details...");
    const deleteDetailsResult = await prisma.beverageCostDetail.deleteMany({
      where: { beverageCostEntryId: Number(id) },
    });
    console.log("Deleted beverage cost details:", deleteDetailsResult);

    // Get current user for audit logging
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    // Delete the main entry
    console.log("Deleting beverage cost entry with ID:", id);
    await prisma.beverageCostEntry.delete({
      where: { id: Number(id) },
    });

    // Create audit log
    await auditDataChange(
      user.id,
      "DELETE",
      "beverage_cost_entry",
      id.toString(),
      entry,
      undefined,
      entry.propertyId || undefined
    );

    console.log("Beverage cost entry deleted successfully, triggering recalculation...");
    
    // Trigger recalculation (but don't fail the deletion if recalculation fails)
    try {
      await calculateAndUpdateDailyFinancialSummary(entryDate);
      console.log("Recalculation completed successfully");
    } catch (recalcError) {
      console.error("Error during recalculation (non-fatal):", recalcError);
      // Continue - deletion was successful even if recalculation failed
    }

    console.log("Revalidating paths...");
    revalidatePath("/dashboard/beverage-cost-input");
    revalidatePath("/dashboard/financial-summary");
    revalidatePath("/dashboard"); // Revalidate main dashboard
    
    console.log("Delete operation completed successfully");
    return { success: true };
  } catch (error) {
    console.error("Error deleting beverage cost entry:", error);
    // Re-throw the original error instead of a generic message
    if (error instanceof Error) {
      throw new Error(`Failed to delete beverage cost entry: ${error.message}`);
    }
    throw new Error("Failed to delete beverage cost entry: Unknown error");
  }
}

export async function getBeverageCostEntriesByDateRangeAction(
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

    const entries = await prisma.beverageCostEntry.findMany({
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
    console.error("Error fetching beverage cost entries by date range:", error);
    throw new Error("Failed to fetch beverage cost entries");
  }
}

export async function getBeverageCostEntriesForDateAction(date: Date, outletId?: number, propertyId?: number) {
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

    const entries = await prisma.beverageCostEntry.findMany({
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
    console.error("Error fetching beverage cost entries for date:", error);
    throw new Error("Failed to fetch beverage cost entries");
  }
}

export async function getBeverageCostEntriesByOutletAction(outletId: number) {
  try {
    const entries = await prisma.beverageCostEntry.findMany({
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
    console.error("Error fetching beverage cost entries by outlet:", error);
    throw new Error("Failed to fetch beverage cost entries");
  }
}

// Beverage Cost Detail Actions
export async function createBeverageCostDetailAction(detailData: {
  beverageCostEntryId: number;
  categoryId: number;
  categoryName?: string;
  cost: number;
  description?: string;
}) {
  try {
    const detail = await prisma.beverageCostDetail.create({
      data: detailData,
      include: {
        category: true,
        beverageCostEntry: {
          include: {
            outlet: true,
          },
        },
      },
    });

    // Update total cost of the parent entry
    const totalCost = await prisma.beverageCostDetail.aggregate({
      where: { beverageCostEntryId: detailData.beverageCostEntryId },
      _sum: { cost: true },
    });

    await prisma.beverageCostEntry.update({
      where: { id: detailData.beverageCostEntryId },
      data: { totalBeverageCost: totalCost._sum.cost || 0 },
    });

    // Trigger recalculation
    if (detail.beverageCostEntry) {
      await calculateAndUpdateDailyFinancialSummary(detail.beverageCostEntry.date);
    }

    revalidatePath("/dashboard/beverage-cost-input");
    revalidatePath("/dashboard/financial-summary");
    revalidatePath("/dashboard"); // Revalidate main dashboard
    return detail;
  } catch (error) {
    console.error("Error creating beverage cost detail:", error);
    throw new Error("Failed to create beverage cost detail");
  }
}

export async function updateBeverageCostDetailAction(
  id: number,
  detailData: {
    categoryId?: number;
    categoryName?: string;
    cost?: number;
    description?: string;
  }
) {
  try {
    const detail = await prisma.beverageCostDetail.update({
      where: { id: Number(id) },
      data: detailData,
      include: {
        category: true,
        beverageCostEntry: {
          include: {
            outlet: true,
          },
        },
      },
    });

    // Update total cost of the parent entry
    const totalCost = await prisma.beverageCostDetail.aggregate({
      where: { beverageCostEntryId: detail.beverageCostEntryId },
      _sum: { cost: true },
    });

    await prisma.beverageCostEntry.update({
      where: { id: detail.beverageCostEntryId },
      data: { totalBeverageCost: totalCost._sum.cost || 0 },
    });

    // Trigger recalculation
    if (detail.beverageCostEntry) {
      await calculateAndUpdateDailyFinancialSummary(detail.beverageCostEntry.date);
    }

    revalidatePath("/dashboard/beverage-cost-input");
    revalidatePath("/dashboard/financial-summary");
    revalidatePath("/dashboard"); // Revalidate main dashboard
    return detail;
  } catch (error) {
    console.error("Error updating beverage cost detail:", error);
    throw new Error("Failed to update beverage cost detail");
  }
}

export async function deleteBeverageCostDetailAction(id: number) {
  try {
    // Get detail info before deletion
    const detail = await prisma.beverageCostDetail.findUnique({
      where: { id: Number(id) },
      include: {
        beverageCostEntry: true,
      },
    });

    if (!detail) {
      throw new Error("Beverage cost detail not found");
    }

    await prisma.beverageCostDetail.delete({
      where: { id: Number(id) },
    });

    // Update total cost of the parent entry
    const totalCost = await prisma.beverageCostDetail.aggregate({
      where: { beverageCostEntryId: detail.beverageCostEntryId },
      _sum: { cost: true },
    });

    await prisma.beverageCostEntry.update({
      where: { id: detail.beverageCostEntryId },
      data: { totalBeverageCost: totalCost._sum.cost || 0 },
    });

    // Trigger recalculation
    await calculateAndUpdateDailyFinancialSummary(detail.beverageCostEntry.date);

    revalidatePath("/dashboard/beverage-cost-input");
    revalidatePath("/dashboard/financial-summary");
    revalidatePath("/dashboard"); // Revalidate main dashboard
    return { success: true };
  } catch (error) {
    console.error("Error deleting beverage cost detail:", error);
    throw new Error("Failed to delete beverage cost detail");
  }
}

// Legacy function aliases for compatibility
export const saveBeverageCostEntryAction = createBeverageCostEntryAction;
export const getBeverageCostEntryWithDetailsAction = getBeverageCostEntryByIdAction;

// Category functions that redirect to the category actions
export async function getBeverageCategoriesAction() {
  try {
    const categories = await prisma.category.findMany({
      where: { type: "Beverage" },
      orderBy: { name: "asc" },
    });
    return categories;
  } catch (error) {
    console.error("Error fetching beverage categories:", error);
    throw new Error("Failed to fetch beverage categories");
  }
}

// Report functions
export async function getDetailedBeverageCostReportAction(
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
      
    const entries = await getBeverageCostEntriesByDateRangeAction(startDate, endDate, numericOutletId);
    
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
      const beverageCostDetailsByItem: { categoryName: string; description: string; cost: number }[] = [];
      
      let totalCostOfBeverage = 0;
      
      outletData.forEach(entry => {
        totalCostOfBeverage += entry.totalBeverageCost || 0;
        
        entry.details?.forEach(detail => {
          const categoryName = detail.category?.name || detail.categoryName || 'Unknown';
          const currentCost = categoryCosts.get(categoryName) || 0;
          categoryCosts.set(categoryName, currentCost + detail.cost);
          
          beverageCostDetailsByItem.push({
            categoryName,
            description: detail.description || '',
            cost: detail.cost
          });
        });
      });
      
      // For individual outlet reports, we'll use placeholder values since financial summaries
      // are not outlet-specific in the current schema. Real values will be calculated in overall summary.
      const totalBeverageRevenue = 0; // Will be calculated properly in overall summary
      const budgetBeverageCostPercentage = 0; // Will be calculated properly in overall summary
      const beverageCostPercentage = 0; // Will be calculated properly in overall summary
      const variancePercentage = 0; // Will be calculated properly in overall summary
      
      return {
        outletName: outletMap.get(outletId) || 'Unknown Outlet',
        outletId: outletId.toString(),
        dateRange: { from: startDate, to: endDate },
        categoryCosts: Array.from(categoryCosts.entries()).map(([categoryName, totalCost]) => ({
          categoryName,
          totalCost
        })),
        totalCostFromTransfers: totalCostOfBeverage, // Use actual beverage cost as transfer cost
        otherAdjustmentsBeverage: 0, // Will be calculated in overall summary
        ocBeverageTotal: 0, // Will be calculated in overall summary
        entBeverageTotal: 0, // Will be calculated in overall summary
        totalCostOfBeverage,
        totalBeverageRevenue,
        beverageCostPercentage,
        budgetBeverageCostPercentage,
        variancePercentage,
        beverageCostDetailsByItem
      };
    });
    
    // Create overall summary by aggregating all outlet reports and financial data
    const overallCategoryCosts = new Map<string, number>();
    const overallBeverageCostDetailsByItem: { categoryName: string; description: string; cost: number }[] = [];
    let overallTotalCostOfBeverage = 0;
    let overallTotalBeverageRevenue = 0;
    let overallTotalEntBeverage = 0;
    let overallTotalCoBeverage = 0;
    let overallTotalOtherBeverageAdjustment = 0;
    let overallTotalBudgetBeverageCost = 0;
    let overallTotalBudgetBeverageRevenue = 0;
    
    // Aggregate cost data from outlet reports (only cost-related data, not financial summary data)
    outletReports.forEach(report => {
      overallTotalCostOfBeverage += report.totalCostOfBeverage;
      
      report.categoryCosts.forEach(({ categoryName, totalCost }) => {
        const currentCost = overallCategoryCosts.get(categoryName) || 0;
        overallCategoryCosts.set(categoryName, currentCost + totalCost);
      });
      
      overallBeverageCostDetailsByItem.push(...report.beverageCostDetailsByItem);
    });
    
    // Get financial summary data separately (only once, not per outlet to avoid double counting)
    overallTotalBeverageRevenue = financialSummaries.reduce((sum, summary) => sum + (summary.actualBeverageRevenue || 0), 0);
    overallTotalBudgetBeverageCost = financialSummaries.reduce((sum, summary) => sum + (summary.budgetBeverageCost || 0), 0);
    overallTotalBudgetBeverageRevenue = financialSummaries.reduce((sum, summary) => sum + (summary.budgetBeverageRevenue || 0), 0);
    overallTotalEntBeverage = financialSummaries.reduce((sum, summary) => sum + (summary.entBeverage || 0), 0);
    overallTotalCoBeverage = financialSummaries.reduce((sum, summary) => sum + (summary.coBeverage || 0), 0);
    overallTotalOtherBeverageAdjustment = financialSummaries.reduce((sum, summary) => sum + (summary.otherBeverageAdjustment || 0), 0);
    
    // Calculate actual beverage cost using the same formula as financial summary module
    // actualBeverageCost = totalBeverageCost - entBeverage - coBeverage + otherBeverageAdjustment
    const actualBeverageCost = overallTotalCostOfBeverage - overallTotalEntBeverage - overallTotalCoBeverage + overallTotalOtherBeverageAdjustment;
    
    // Calculate average budgeted beverage cost percentage from financial summaries
    const validBeverageBudgetPcts = financialSummaries.filter(summary => summary.budgetBeverageCostPct != null && summary.budgetBeverageCostPct > 0);
    const overallBudgetBeverageCostPercentage = validBeverageBudgetPcts.length > 0 
      ? validBeverageBudgetPcts.reduce((sum, summary) => sum + (summary.budgetBeverageCostPct || 0), 0) / validBeverageBudgetPcts.length 
      : 0;
    const overallBeverageCostPercentage = overallTotalBeverageRevenue > 0 ? (actualBeverageCost / overallTotalBeverageRevenue) * 100 : 0;
    const overallVariancePercentage = overallBeverageCostPercentage - overallBudgetBeverageCostPercentage;
    
    console.log('Beverage Cost Report Debug:', {
      rawTotalCostOfBeverage: overallTotalCostOfBeverage,
      actualBeverageCost,
      overallTotalBeverageRevenue,
      overallTotalEntBeverage,
      overallTotalCoBeverage,
      overallTotalOtherBeverageAdjustment,
      overallTotalBudgetBeverageCost,
      overallTotalBudgetBeverageRevenue,
      outletReportsCount: outletReports.length,
      financialSummariesCount: financialSummaries.length
    });
    
    const overallSummaryReport = {
      outletName: 'All Outlets',
      outletId: 'all',
      dateRange: { from: startDate, to: endDate },
      categoryCosts: Array.from(overallCategoryCosts.entries()).map(([categoryName, totalCost]) => ({
        categoryName,
        totalCost
      })),
      totalCostFromTransfers: overallTotalCostOfBeverage, // This represents the base cost before adjustments
      otherAdjustmentsBeverage: overallTotalOtherBeverageAdjustment,
      ocBeverageTotal: overallTotalCoBeverage,
      entBeverageTotal: overallTotalEntBeverage,
      totalCostOfBeverage: actualBeverageCost,
      totalBeverageRevenue: overallTotalBeverageRevenue,
      beverageCostPercentage: overallBeverageCostPercentage,
      budgetBeverageCostPercentage: overallBudgetBeverageCostPercentage,
      variancePercentage: overallVariancePercentage,
      beverageCostDetailsByItem: overallBeverageCostDetailsByItem
    };
    
    return {
      outletReports,
      overallSummaryReport
    };
  } catch (error) {
    console.error("Error fetching detailed beverage cost report:", error);
    throw new Error("Failed to fetch detailed beverage cost report");
  }
}