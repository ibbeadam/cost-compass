"use server";

import { collection, addDoc, doc, writeBatch, serverTimestamp, getDocs, query, where, Timestamp, deleteDoc, getDoc, runTransaction, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { revalidatePath } from "next/cache";
import type { BeverageCostEntry, BeverageCostDetail, Category, Outlet, DailyFinancialSummary, DetailedBeverageCostReport, DetailedBeverageCostReportResponse } from "@/types";
import { isValid } from "date-fns";
import { recalculateAndSaveFinancialSummary } from "./dailyFinancialSummaryActions";
import { getOutletsAction } from "./foodCostActions"; // Re-use getOutletsAction

const BEVERAGE_COST_ENTRIES_COLLECTION = "beverageCostEntries";
const BEVERAGE_COST_DETAILS_COLLECTION = "beverageCostDetails";
const CATEGORIES_COLLECTION = "categories"; 
const DAILY_FINANCIAL_SUMMARIES_COLLECTION = "dailyFinancialSummaries";

interface BeverageCostItemInput {
  id?: string; 
  categoryId: string;
  cost: number;
  description?: string;
}

export async function saveBeverageCostEntryAction(
  date: Date,
  outletId: string,
  items: BeverageCostItemInput[],
  existingEntryId?: string | null 
): Promise<{ beverageCostEntryId: string }> {
  if (!date || !outletId || items.length === 0) {
    throw new Error("Date, Outlet ID, and at least one item are required.");
  }
  if (!isValid(date)) {
      throw new Error("Invalid date provided for beverage cost entry.");
  }

  const totalBeverageCost = items.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
  const normalizedDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const entryDateTimestamp = Timestamp.fromDate(normalizedDate);

  try {
    let beverageCostEntryId = existingEntryId;

    await runTransaction(db!, async (transaction) => {
      if (existingEntryId) {
        const entryRef = doc(db!, BEVERAGE_COST_ENTRIES_COLLECTION, existingEntryId);
        transaction.update(entryRef, {
          total_beverage_cost: totalBeverageCost,
          outlet_id: outletId,
          date: entryDateTimestamp,
          updatedAt: serverTimestamp(),
        });

        const detailsQuery = query(collection(db!, BEVERAGE_COST_DETAILS_COLLECTION), where("beverage_cost_entry_id", "==", existingEntryId));
        const oldDetailsSnapshot = await getDocs(detailsQuery); 
        oldDetailsSnapshot.forEach(detailDoc => transaction.delete(detailDoc.ref));

      } else {
        const newEntryRef = doc(collection(db!, BEVERAGE_COST_ENTRIES_COLLECTION));
        transaction.set(newEntryRef, {
          date: entryDateTimestamp,
          outlet_id: outletId,
          total_beverage_cost: totalBeverageCost,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        beverageCostEntryId = newEntryRef.id;
      }

      if (!beverageCostEntryId) {
        throw new Error("Failed to obtain beverageCostEntryId during transaction.");
      }

      for (const item of items) {
        const detailRef = doc(collection(db!, BEVERAGE_COST_DETAILS_COLLECTION));
        transaction.set(detailRef, {
          beverage_cost_entry_id: beverageCostEntryId,
          category_id: item.categoryId,
          cost: Number(item.cost) || 0,
          description: item.description || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    });
    
    if (!beverageCostEntryId) {
        throw new Error("Transaction completed but beverageCostEntryId is still not set.");
    }

    await recalculateAndSaveFinancialSummary(normalizedDate);

    revalidatePath("/dashboard/beverage-cost-input");
    revalidatePath("/dashboard/financial-summary"); 
    revalidatePath("/dashboard");

    return { beverageCostEntryId };

  } catch (error) {
    console.error("Error saving beverage cost entry:", error);
    throw new Error(`Failed to save beverage cost entry: ${error instanceof Error ? error.message : String(error)}`);
  }
}


export async function getBeverageCostEntryWithDetailsAction(
  date: Date,
  outletId: string
): Promise<(BeverageCostEntry & { details: BeverageCostDetail[] }) | null> {
  const normalizedDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const entryDateTimestamp = Timestamp.fromDate(normalizedDate);

  const q = query(
    collection(db!, BEVERAGE_COST_ENTRIES_COLLECTION),
    where("outlet_id", "==", outletId),
    where("date", "==", entryDateTimestamp)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }

  const entryDoc = snapshot.docs[0];
  const entryData = entryDoc.data() as Omit<BeverageCostEntry, "id">;
  const beverageCostEntryId = entryDoc.id;

  const detailsQuery = query(collection(db!, BEVERAGE_COST_DETAILS_COLLECTION), where("beverage_cost_entry_id", "==", beverageCostEntryId));
  const detailsSnapshot = await getDocs(detailsQuery);
  
  const categoriesSnapshot = await getDocs(query(collection(db!, CATEGORIES_COLLECTION), where("type", "==", "Beverage")));
  const categoriesMap = new Map<string, string>();
  categoriesSnapshot.forEach(doc => categoriesMap.set(doc.id, doc.data().name));

  const details: BeverageCostDetail[] = detailsSnapshot.docs.map(doc => {
    const detailData = doc.data() as Omit<BeverageCostDetail, "id" | "categoryName">;
    return {
      id: doc.id,
      ...detailData,
      categoryName: categoriesMap.get(detailData.category_id) || detailData.category_id, 
      createdAt: detailData.createdAt instanceof Timestamp ? detailData.createdAt.toDate() : new Date(detailData.createdAt as any),
      updatedAt: detailData.updatedAt instanceof Timestamp ? detailData.updatedAt.toDate() : new Date(detailData.updatedAt as any),
    } as BeverageCostDetail;
  });

  return {
    id: beverageCostEntryId,
    ...entryData,
    date: entryData.date instanceof Timestamp ? entryData.date.toDate() : new Date(entryData.date as any),
    createdAt: entryData.createdAt instanceof Timestamp ? entryData.createdAt.toDate() : new Date(entryData.createdAt as any),
    updatedAt: entryData.updatedAt instanceof Timestamp ? entryData.updatedAt.toDate() : new Date(entryData.updatedAt as any),
    details,
  };
}

export async function deleteBeverageCostEntryAction(beverageCostEntryId: string): Promise<void> {
  if (!beverageCostEntryId) {
    throw new Error("Beverage Cost Entry ID is required for deletion.");
  }
  let entryDate: Date | null = null;

  try {
    const entryRef = doc(db!, BEVERAGE_COST_ENTRIES_COLLECTION, beverageCostEntryId);
    const entrySnap = await getDoc(entryRef);
    if (entrySnap.exists()) {
        const entryData = entrySnap.data();
        if (entryData && entryData.date instanceof Timestamp) {
            entryDate = entryData.date.toDate();
        }
    }

    const batch = writeBatch(db!);
    batch.delete(entryRef);

    const detailsQuery = query(collection(db!, BEVERAGE_COST_DETAILS_COLLECTION), where("beverage_cost_entry_id", "==", beverageCostEntryId));
    const detailsSnapshot = await getDocs(detailsQuery);
    detailsSnapshot.forEach(detailDoc => batch.delete(detailDoc.ref));

    await batch.commit();

    if (entryDate) {
        await recalculateAndSaveFinancialSummary(entryDate);
    }

    revalidatePath("/dashboard/beverage-cost-input");
    revalidatePath("/dashboard/financial-summary");
    revalidatePath("/dashboard");
  } catch (error) {
    console.error("Error deleting beverage cost entry: ", error);
    throw new Error(`Failed to delete beverage cost entry: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getBeverageCategoriesAction(): Promise<Category[]> {
  try {
    const categoriesSnapshot = await getDocs(query(collection(db!, CATEGORIES_COLLECTION), where("type", "==", "Beverage")));
    return categoriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt as any),
      updatedAt: doc.data().updatedAt instanceof Timestamp ? doc.data().updatedAt.toDate() : new Date(doc.data().updatedAt as any),
    })) as Category[];
  } catch (error) {
    console.error("Error fetching beverage categories:", error);
    throw new Error(`Failed to fetch beverage categories: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getBeverageCostEntriesForDateAction(
  targetDate: Date
): Promise<(BeverageCostEntry & { details: BeverageCostDetail[]; outletName?: string })[]> {
  if (!isValid(targetDate)) {
    throw new Error("Invalid date provided.");
  }
  const normalizedDate = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()));
  const dateTimestampForQuery = Timestamp.fromDate(normalizedDate);

  const entriesWithDetails: (BeverageCostEntry & { details: BeverageCostDetail[]; outletName?: string })[] = [];

  try {
    const outlets = await getOutletsAction(); // Reusing from foodCostActions
    const outletMap = new Map(outlets.map(o => [o.id, o.name]));

    const entriesQuery = query(
      collection(db!, BEVERAGE_COST_ENTRIES_COLLECTION),
      where("date", "==", dateTimestampForQuery)
    );
    const entriesSnapshot = await getDocs(entriesQuery);

    if (entriesSnapshot.empty) {
      return [];
    }

    const categories = await getBeverageCategoriesAction();
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    for (const entryDoc of entriesSnapshot.docs) {
      const entryData = entryDoc.data() as Omit<BeverageCostEntry, "id">;
      const beverageCostEntryId = entryDoc.id;

      const detailsQuery = query(
        collection(db!, BEVERAGE_COST_DETAILS_COLLECTION),
        where("beverage_cost_entry_id", "==", beverageCostEntryId)
      );
      const detailsSnapshot = await getDocs(detailsQuery);
      const details: BeverageCostDetail[] = detailsSnapshot.docs.map(doc => {
        const detailData = doc.data() as Omit<BeverageCostDetail, "id" | "categoryName">;
        return {
          id: doc.id,
          ...detailData,
          categoryName: categoryMap.get(detailData.category_id) || detailData.category_id,
          createdAt: detailData.createdAt instanceof Timestamp ? detailData.createdAt.toDate() : new Date(detailData.createdAt as any),
          updatedAt: detailData.updatedAt instanceof Timestamp ? detailData.updatedAt.toDate() : new Date(detailData.updatedAt as any),
        } as BeverageCostDetail;
      });

      entriesWithDetails.push({
        id: beverageCostEntryId,
        ...entryData,
        date: entryData.date instanceof Timestamp ? entryData.date.toDate() : new Date(entryData.date as any),
        createdAt: entryData.createdAt instanceof Timestamp ? entryData.createdAt.toDate() : new Date(entryData.createdAt as any),
        updatedAt: entryData.updatedAt instanceof Timestamp ? entryData.updatedAt.toDate() : new Date(entryData.updatedAt as any),
        outletName: outletMap.get(entryData.outlet_id) || entryData.outlet_id,
        details,
      });
    }
    return entriesWithDetails;
  } catch (error) {
    console.error("Error fetching beverage cost entries for date:", error);
    throw new Error(`Failed to fetch beverage cost entries and details: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getDetailedBeverageCostReportAction(
  startDate: Date,
  endDate: Date,
  outletId: string
): Promise<DetailedBeverageCostReportResponse> {
  try {
    const startTimestamp = Timestamp.fromDate(new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())));
    const endTimestamp = Timestamp.fromDate(new Date(Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())));

    const generateSingleReport = async (currentOutletId: string, currentOutletName: string): Promise<DetailedBeverageCostReport> => {
      // PART 1: Get beverage cost entries and details for the outlet
      const beverageCostEntriesQuery = query(
        collection(db!, BEVERAGE_COST_ENTRIES_COLLECTION),
        where("outlet_id", "==", currentOutletId),
        where("date", ">=", startTimestamp),
        where("date", "<=", endTimestamp),
        orderBy("date", "asc")
      );
      const beverageCostEntriesSnapshot = await getDocs(beverageCostEntriesQuery);

      const categoryCostsMap = new Map<string, number>();
      let totalCostFromTransfers = 0;
      const individualBeverageCostDetails: { categoryName: string; description: string; cost: number }[] = [];

      // Pre-fetch beverage categories to avoid repeated queries
      const categoriesSnapshot = await getDocs(query(collection(db!, CATEGORIES_COLLECTION), where("type", "==", "Beverage")));
      const categoryMap = new Map<string, string>();
      categoriesSnapshot.forEach(doc => categoryMap.set(doc.id, doc.data().name));

      for (const entryDoc of beverageCostEntriesSnapshot.docs) {
        const entryData = entryDoc.data() as BeverageCostEntry;
        totalCostFromTransfers += entryData.total_beverage_cost || 0;

        const detailsQuery = query(
          collection(db!, BEVERAGE_COST_DETAILS_COLLECTION),
          where("beverage_cost_entry_id", "==", entryDoc.id)
        );
        const detailsSnapshot = await getDocs(detailsQuery);

        for (const detailDoc of detailsSnapshot.docs) {
          const detail = detailDoc.data() as BeverageCostDetail;
          const cost = detail.cost || 0;
          
          // Get category name from the pre-fetched categories
          const categoryName = categoryMap.get(detail.category_id) || detail.category_id;

          const existingCost = categoryCostsMap.get(categoryName) || 0;
          categoryCostsMap.set(categoryName, existingCost + cost);
          individualBeverageCostDetails.push({
            categoryName,
            description: detail.description || '-',
            cost,
          });
        }
      }

      const categoryCosts = Array.from(categoryCostsMap.entries()).map(([categoryName, totalCost]) => ({
        categoryName,
        totalCost,
      }));

      // PART 2: Summary total figures from Daily Financial Summary
      let summaryQuery = query(
        collection(db!, DAILY_FINANCIAL_SUMMARIES_COLLECTION),
        where("date", ">=", startTimestamp),
        where("date", "<=", endTimestamp),
        orderBy("date", "asc")
      );
      const summarySnapshot = await getDocs(summaryQuery);

      let totalBeverageRevenue = 0;
      let totalEntertainmentBeverageCost = 0;
      let totalOcBeverageCost = 0;
      let totalOtherBeverageAdjustments = 0;
      let totalBudgetBeverageCostPct = 0;
      let budgetBeverageCostPctCount = 0;

      summarySnapshot.forEach(doc => {
        const data = doc.data() as DailyFinancialSummary;
        totalBeverageRevenue += data.beverage_revenue || 0;
        totalEntertainmentBeverageCost += data.entertainment_beverage_cost || 0;
        totalOcBeverageCost += data.officer_check_comp_beverage || 0;
        totalOtherBeverageAdjustments += data.other_beverage_adjustments || 0;
        if (data.budget_beverage_cost_pct != null) {
          totalBudgetBeverageCostPct += data.budget_beverage_cost_pct;
          budgetBeverageCostPctCount++;
        }
      });

      const budgetBeverageCostPercentage = budgetBeverageCostPctCount > 0 ? totalBudgetBeverageCostPct / budgetBeverageCostPctCount : 0;

      const totalCostOfBeverage = totalCostFromTransfers - totalOcBeverageCost - totalEntertainmentBeverageCost + totalOtherBeverageAdjustments;

      const beverageCostPercentage = totalBeverageRevenue > 0 ? (totalCostOfBeverage / totalBeverageRevenue) * 100 : 0;

      const variancePercentage = beverageCostPercentage - budgetBeverageCostPercentage;

      return {
        outletName: currentOutletName,
        outletId: currentOutletId,
        dateRange: { from: startDate, to: endDate },
        categoryCosts,
        totalCostFromTransfers,
        otherAdjustmentsBeverage: totalOtherBeverageAdjustments,
        ocBeverageTotal: totalOcBeverageCost,
        entBeverageTotal: totalEntertainmentBeverageCost,
        totalCostOfBeverage,
        totalBeverageRevenue,
        beverageCostPercentage,
        budgetBeverageCostPercentage,
        variancePercentage,
        beverageCostDetailsByItem: individualBeverageCostDetails || [],
      };
    };

    const outletReports: DetailedBeverageCostReport[] = [];
    let overallSummaryReport: DetailedBeverageCostReport;

    if (outletId === "all") {
      const allOutlets = await getOutletsAction();
      for (const outlet of allOutlets) {
        const report = await generateSingleReport(outlet.id, outlet.name);
        outletReports.push(report);
      }

      // For overall summary, fetch DailyFinancialSummary once for the entire date range (hotel level)
      let overallSummaryQuery = query(
        collection(db!, DAILY_FINANCIAL_SUMMARIES_COLLECTION),
        where("date", ">=", startTimestamp),
        where("date", "<=", endTimestamp),
        orderBy("date", "asc")
      );
      const overallSummarySnapshot = await getDocs(overallSummaryQuery);

      let totalOverallBeverageRevenue = 0;
      let totalOverallEntertainmentBeverageCost = 0;
      let totalOverallOcBeverageCost = 0;
      let totalOverallOtherBeverageAdjustments = 0;
      let totalOverallBudgetBeverageCostPct = 0;
      let overallBudgetBeverageCostPctCount = 0;

      overallSummarySnapshot.forEach(doc => {
        const data = doc.data() as DailyFinancialSummary;
        totalOverallBeverageRevenue += data.beverage_revenue || 0;
        totalOverallEntertainmentBeverageCost += data.entertainment_beverage_cost || 0;
        totalOverallOcBeverageCost += data.officer_check_comp_beverage || 0;
        totalOverallOtherBeverageAdjustments += data.other_beverage_adjustments || 0;
        if (data.budget_beverage_cost_pct != null) {
          totalOverallBudgetBeverageCostPct += data.budget_beverage_cost_pct;
          overallBudgetBeverageCostPctCount++;
        }
      });

      // Total Cost from Transfers for overall summary should still be sum of outlet-specific transfers
      let totalOverallCostFromTransfers = 0;
      outletReports.forEach(report => {
        totalOverallCostFromTransfers += report.totalCostFromTransfers;
      });

      // Create a map to aggregate category costs across all outlets for detailed items
      const overallCategoryCostsMap = new Map<string, number>();
      const overallBeverageCostDetailsByItem: { categoryName: string; description: string; cost: number }[] = [];

      outletReports.forEach(report => {
        if (report.beverageCostDetailsByItem && report.beverageCostDetailsByItem.length > 0) {
          report.beverageCostDetailsByItem.forEach(item => {
            const existingCost = overallCategoryCostsMap.get(item.categoryName) || 0;
            overallCategoryCostsMap.set(item.categoryName, existingCost + item.cost);
            overallBeverageCostDetailsByItem.push({
              categoryName: item.categoryName,
              description: item.description,
              cost: item.cost
            });
          });
        }
      });

      // Calculate average budget beverage cost percentage for overall summary
      const overallBudgetBeverageCostPercentage = overallBudgetBeverageCostPctCount > 0 
        ? totalOverallBudgetBeverageCostPct / overallBudgetBeverageCostPctCount 
        : 0;

      // Calculate Total Cost of Beverage for overall summary (using the newly fetched totals)
      const overallTotalCostOfBeverage = totalOverallCostFromTransfers - 
        totalOverallOcBeverageCost - 
        totalOverallEntertainmentBeverageCost + 
        totalOverallOtherBeverageAdjustments;

      // Calculate Beverage Cost Percentage for overall summary
      const overallBeverageCostPercentage = totalOverallBeverageRevenue > 0 
        ? (overallTotalCostOfBeverage / totalOverallBeverageRevenue) * 100 
        : 0;

      // Calculate Variance Percentage for overall summary
      const overallVariancePercentage = overallBeverageCostPercentage - overallBudgetBeverageCostPercentage;

      // Convert the category costs map to an array
      const overallCategoryCosts = Array.from(overallCategoryCostsMap.entries()).map(([categoryName, totalCost]) => ({
        categoryName,
        totalCost,
      }));

      overallSummaryReport = {
        outletName: "All Outlets",
        outletId: "all",
        dateRange: { from: startDate, to: endDate },
        categoryCosts: overallCategoryCosts,
        totalCostFromTransfers: totalOverallCostFromTransfers,
        otherAdjustmentsBeverage: totalOverallOtherBeverageAdjustments,
        ocBeverageTotal: totalOverallOcBeverageCost,
        entBeverageTotal: totalOverallEntertainmentBeverageCost,
        totalCostOfBeverage: overallTotalCostOfBeverage,
        totalBeverageRevenue: totalOverallBeverageRevenue,
        beverageCostPercentage: overallBeverageCostPercentage,
        budgetBeverageCostPercentage: overallBudgetBeverageCostPercentage,
        variancePercentage: overallVariancePercentage,
        beverageCostDetailsByItem: overallBeverageCostDetailsByItem || [],
      };

    } else {
      const outletDoc = await getDoc(doc(db!, "outlets", outletId));
      if (outletDoc.exists()) {
        const outletName = outletDoc.data().name;
        const report = await generateSingleReport(outletId, outletName);
        outletReports.push(report);
        overallSummaryReport = report;
      } else {
        throw new Error("Selected outlet not found.");
      }
    }

    return { outletReports, overallSummaryReport };

  } catch (error: any) {
    console.error("Error fetching detailed beverage cost report:", error);
    throw new Error(`Could not load detailed beverage cost report. Details: ${error.message}`);
  }
}
