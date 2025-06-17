"use server";

import { collection, addDoc, doc, writeBatch, serverTimestamp, getDocs, query, where, Timestamp, deleteDoc, getDoc, runTransaction, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { revalidatePath } from "next/cache";
import type { FoodCostEntry, FoodCostDetail, Category, Outlet, DailyFinancialSummary, DetailedFoodCostReport, DetailedFoodCostReportResponse } from "@/types";
import { format as formatDateFn, isValid } from "date-fns";
// Import the recalculate function from dailyFinancialSummaryActions
import { recalculateAndSaveFinancialSummary } from "./dailyFinancialSummaryActions";


const FOOD_COST_ENTRIES_COLLECTION = "foodCostEntries";
const FOOD_COST_DETAILS_COLLECTION = "foodCostDetails";
const CATEGORIES_COLLECTION = "categories";
const DAILY_FINANCIAL_SUMMARIES_COLLECTION = "dailyFinancialSummaries";

interface FoodCostItemInput {
  id?: string; 
  categoryId: string;
  cost: number;
  description?: string;
}

export async function saveFoodCostEntryAction(
  date: Date,
  outletId: string,
  items: FoodCostItemInput[],
  existingEntryId?: string | null 
): Promise<{ foodCostEntryId: string }> {
  if (!date || !outletId || items.length === 0) {
    throw new Error("Date, Outlet ID, and at least one item are required.");
  }
  if (!isValid(date)) {
      throw new Error("Invalid date provided for food cost entry.");
  }

  const totalFoodCost = items.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
  const normalizedDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const entryDateTimestamp = Timestamp.fromDate(normalizedDate);


  try {
    let foodCostEntryId = existingEntryId;

    await runTransaction(db!, async (transaction) => {
      if (existingEntryId) {
        const entryRef = doc(db!, FOOD_COST_ENTRIES_COLLECTION, existingEntryId);
        transaction.update(entryRef, {
          total_food_cost: totalFoodCost,
          outlet_id: outletId, // Ensure outlet_id is also updatable if changed for an existing date/entry ID
          date: entryDateTimestamp, // Ensure date is also updatable
          updatedAt: serverTimestamp(),
        });

        const detailsQuery = query(collection(db!, FOOD_COST_DETAILS_COLLECTION), where("food_cost_entry_id", "==", existingEntryId));
        const oldDetailsSnapshot = await getDocs(detailsQuery); 
        oldDetailsSnapshot.forEach(detailDoc => transaction.delete(detailDoc.ref));

      } else {
        const newEntryRef = doc(collection(db!, FOOD_COST_ENTRIES_COLLECTION));
        transaction.set(newEntryRef, {
          date: entryDateTimestamp,
          outlet_id: outletId,
          total_food_cost: totalFoodCost,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        foodCostEntryId = newEntryRef.id;
      }

      if (!foodCostEntryId) {
        throw new Error("Failed to obtain foodCostEntryId during transaction.");
      }

      for (const item of items) {
        const detailRef = doc(collection(db!, FOOD_COST_DETAILS_COLLECTION));
        transaction.set(detailRef, {
          food_cost_entry_id: foodCostEntryId,
          category_id: item.categoryId,
          cost: Number(item.cost) || 0,
          description: item.description || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    });
    
    if (!foodCostEntryId) {
        throw new Error("Transaction completed but foodCostEntryId is still not set.");
    }

    // After food cost entry is saved, trigger recalculation of the associated DailyFinancialSummary
    await recalculateAndSaveFinancialSummary(normalizedDate);


    revalidatePath("/dashboard/food-cost-input");
    revalidatePath("/dashboard/financial-summary"); 
    revalidatePath("/dashboard");

    return { foodCostEntryId };

  } catch (error) {
    console.error("Error saving food cost entry:", error);
    throw new Error(`Failed to save food cost entry: ${error instanceof Error ? error.message : String(error)}`);
  }
}


export async function getFoodCostEntryWithDetailsAction(
  date: Date,
  outletId: string
): Promise<(FoodCostEntry & { details: FoodCostDetail[] }) | null> {
  const normalizedDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const entryDateTimestamp = Timestamp.fromDate(normalizedDate);

  const q = query(
    collection(db!, FOOD_COST_ENTRIES_COLLECTION),
    where("outlet_id", "==", outletId),
    where("date", "==", entryDateTimestamp) // Query for exact match on normalized date
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }

  const entryDoc = snapshot.docs[0]; // Assuming only one entry per outlet per day
  const entryData = entryDoc.data() as Omit<FoodCostEntry, "id">;
  const foodCostEntryId = entryDoc.id;

  const detailsQuery = query(collection(db!, FOOD_COST_DETAILS_COLLECTION), where("food_cost_entry_id", "==", foodCostEntryId));
  const detailsSnapshot = await getDocs(detailsQuery);
  
  const categoriesSnapshot = await getDocs(collection(db!, CATEGORIES_COLLECTION));
  const categoriesMap = new Map<string, string>();
  categoriesSnapshot.forEach(doc => categoriesMap.set(doc.id, doc.data().name));

  const details: FoodCostDetail[] = detailsSnapshot.docs.map(doc => {
    const detailData = doc.data() as Omit<FoodCostDetail, "id" | "categoryName">;
    return {
      id: doc.id,
      ...detailData,
      categoryName: categoriesMap.get(detailData.category_id) || detailData.category_id, 
      createdAt: detailData.createdAt instanceof Timestamp ? detailData.createdAt.toDate() : new Date(detailData.createdAt as any),
      updatedAt: detailData.updatedAt instanceof Timestamp ? detailData.updatedAt.toDate() : new Date(detailData.updatedAt as any),
    } as FoodCostDetail;
  });

  return {
    id: foodCostEntryId,
    ...entryData,
    date: entryData.date instanceof Timestamp ? entryData.date.toDate() : new Date(entryData.date as any),
    createdAt: entryData.createdAt instanceof Timestamp ? entryData.createdAt.toDate() : new Date(entryData.createdAt as any),
    updatedAt: entryData.updatedAt instanceof Timestamp ? entryData.updatedAt.toDate() : new Date(entryData.updatedAt as any),
    details,
  };
}

export async function deleteFoodCostEntryAction(foodCostEntryId: string): Promise<void> {
  if (!foodCostEntryId) {
    throw new Error("Food Cost Entry ID is required for deletion.");
  }
  let entryDate: Date | null = null;

  try {
    const entryRef = doc(db!, FOOD_COST_ENTRIES_COLLECTION, foodCostEntryId);
    const entrySnap = await getDoc(entryRef);
    if (entrySnap.exists()) {
        const entryData = entrySnap.data();
        if (entryData && entryData.date instanceof Timestamp) {
            entryDate = entryData.date.toDate();
        }
    }

    const batch = writeBatch(db!);
    batch.delete(entryRef);

    const detailsQuery = query(collection(db!, FOOD_COST_DETAILS_COLLECTION), where("food_cost_entry_id", "==", foodCostEntryId));
    const detailsSnapshot = await getDocs(detailsQuery);
    detailsSnapshot.forEach(detailDoc => batch.delete(detailDoc.ref));

    await batch.commit();

    if (entryDate) {
        // After food cost entry is deleted, trigger recalculation of the associated DailyFinancialSummary
        // This will effectively use a grossFoodCost that is lower (or zero if it was the only entry).
        await recalculateAndSaveFinancialSummary(entryDate);
    }

    revalidatePath("/dashboard/food-cost-input");
    revalidatePath("/dashboard/financial-summary"); 
    revalidatePath("/dashboard");

  } catch (error) {
    console.error("Error deleting food cost entry: ", error);
    throw new Error(`Failed to delete food cost entry: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getFoodCategoriesAction(): Promise<Category[]> {
    try {
        const q = query(collection(db!, CATEGORIES_COLLECTION), where("type", "==", "Food"), orderBy("name", "asc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Category, 'id' | 'createdAt' | 'updatedAt'>),
            createdAt: docSnap.data().createdAt instanceof Timestamp ? docSnap.data().createdAt.toDate() : docSnap.data().createdAt,
            updatedAt: docSnap.data().updatedAt instanceof Timestamp ? docSnap.data().updatedAt.toDate() : docSnap.data().updatedAt,
        } as Category));
    } catch (error) {
        console.error("Error fetching food categories:", error);
        throw new Error("Could not load food categories.");
    }
}

export async function getOutletsAction(): Promise<Outlet[]> {
    try {
        if (!db) {
            console.error("Firestore 'db' instance is not available in getOutletsAction.");
            throw new Error("Database connection is not available. Could not load outlets.");
        }
        const outletsCollectionRef = collection(db!, "outlets");
        const q = query(outletsCollectionRef, orderBy("name", "asc"));
        const snapshot = await getDocs(q);
        
        const outletsData = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                name: data.name, 
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
                isActive: data.isActive ?? true, 
                address: data.address ?? '',
                phoneNumber: data.phoneNumber ?? '',
                email: data.email ?? '',
                type: data.type ?? 'Restaurant', 
                currency: data.currency ?? 'USD', 
                timezone: data.timezone ?? 'UTC', 
                defaultBudgetFoodCostPct: data.defaultBudgetFoodCostPct ?? 0,
                defaultBudgetBeverageCostPct: data.defaultBudgetBeverageCostPct ?? 0,
                targetOccupancy: data.targetOccupancy ?? 0,
            } as Outlet;
        });
        return outletsData;
    } catch (error: any) {
        console.error("Detailed error in getOutletsAction:", error);
        throw new Error(`Could not load outlets. Details: ${error.message}`);
    }
}

// New action to get all food cost entries and their details for a specific date
export async function getFoodCostEntriesForDateAction(
  targetDate: Date
): Promise<(FoodCostEntry & { details: FoodCostDetail[]; outletName?: string })[]> {
  if (!isValid(targetDate)) {
    throw new Error("Invalid date provided.");
  }
  const normalizedDate = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()));
  const dateTimestampForQuery = Timestamp.fromDate(normalizedDate);

  const entriesWithDetails: (FoodCostEntry & { details: FoodCostDetail[]; outletName?: string })[] = [];

  try {
    // Fetch all outlets to map outlet_id to name
    const outlets = await getOutletsAction();
    const outletMap = new Map(outlets.map(o => [o.id, o.name]));

    // Fetch all food cost entries for the given date
    const entriesQuery = query(
      collection(db!, FOOD_COST_ENTRIES_COLLECTION),
      where("date", "==", dateTimestampForQuery)
    );
    const entriesSnapshot = await getDocs(entriesQuery);

    if (entriesSnapshot.empty) {
      return [];
    }

    // Fetch all categories once for mapping category_id to name
    const categories = await getFoodCategoriesAction();
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    for (const entryDoc of entriesSnapshot.docs) {
      const entryData = entryDoc.data() as Omit<FoodCostEntry, "id">;
      const foodCostEntryId = entryDoc.id;

      // Fetch details for this specific entry
      const detailsQuery = query(
        collection(db!, FOOD_COST_DETAILS_COLLECTION),
        where("food_cost_entry_id", "==", foodCostEntryId)
      );
      const detailsSnapshot = await getDocs(detailsQuery);
      const details: FoodCostDetail[] = detailsSnapshot.docs.map(doc => {
        const detailData = doc.data() as Omit<FoodCostDetail, "id" | "categoryName">;
        return {
          id: doc.id,
          ...detailData,
          categoryName: categoryMap.get(detailData.category_id) || detailData.category_id,
          createdAt: detailData.createdAt instanceof Timestamp ? detailData.createdAt.toDate() : new Date(detailData.createdAt as any),
          updatedAt: detailData.updatedAt instanceof Timestamp ? detailData.updatedAt.toDate() : new Date(detailData.updatedAt as any),
        } as FoodCostDetail;
      });

      entriesWithDetails.push({
        id: foodCostEntryId,
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
    console.error("Error fetching food cost entries for date:", error);
    throw new Error(`Failed to fetch food cost entries and details: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getFlashFoodCostReportAction(
  startDate: Date,
  endDate: Date,
  outletId: string
): Promise<DailyFinancialSummary[]> {
  try {
    if (!db) {
      throw new Error("Firestore 'db' instance is not available.");
    }

    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    let q = query(
      collection(db, "dailyFinancialSummaries"),
      where("date", ">=", startTimestamp),
      where("date", "<=", endTimestamp),
      orderBy("date", "asc")
    );

    if (outletId && outletId !== "all") {
      q = query(q, where("outlet_id", "==", outletId));
    }

    const querySnapshot = await getDocs(q);
    const summaries: DailyFinancialSummary[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      summaries.push({
        id: doc.id,
        date: data.date instanceof Timestamp ? data.date.toDate() : data.date,
        outlet_id: data.outlet_id,
        food_revenue: data.food_revenue || 0,
        beverage_revenue: data.beverage_revenue || 0,
        gross_food_cost: data.gross_food_cost || 0,
        gross_beverage_cost: data.gross_beverage_cost || 0,
        net_food_cost: data.net_food_cost || 0,
        net_beverage_cost: data.net_beverage_cost || 0,
        total_adjusted_food_cost: data.total_adjusted_food_cost || 0,
        total_adjusted_beverage_cost: data.total_adjusted_beverage_cost || 0,
        total_covers: data.total_covers || 0,
        average_check: data.average_check || 0,
        budget_food_cost_pct: data.budget_food_cost_pct || 0,
        budget_beverage_cost_pct: data.budget_beverage_cost_pct || 0,
        ent_food: data.ent_food || 0,
        oc_food: data.oc_food || 0,
        other_food_adjustment: data.other_food_adjustment || 0,
        entertainment_beverage_cost: data.entertainment_beverage_cost || 0,
        officer_check_comp_beverage: data.officer_check_comp_beverage || 0,
        other_beverage_adjustments: data.other_beverage_adjustments || 0,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
      });
    });
    return summaries;
  } catch (error: any) {
    console.error("Error fetching flash food cost report:", error);
    throw new Error(`Could not load flash food cost report. Details: ${error.message}`);
  }
}

export async function getDetailedFoodCostReportAction(
  startDate: Date,
  endDate: Date,
  outletId: string
): Promise<DetailedFoodCostReportResponse> {
  try {
    if (!db) {
      throw new Error("Firestore 'db' instance is not available.");
    }

    const normalizedStartDate = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()));
    const normalizedEndDate = new Date(Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999));

    const startTimestamp = Timestamp.fromDate(normalizedStartDate);
    const endTimestamp = Timestamp.fromDate(normalizedEndDate);

    const generateSingleReport = async (currentOutletId: string, currentOutletName: string): Promise<DetailedFoodCostReport> => {
      let foodCostEntriesQuery = query(
        collection(db!, FOOD_COST_ENTRIES_COLLECTION),
        where("date", ">=", startTimestamp),
        where("date", "<=", endTimestamp),
        where("outlet_id", "==", currentOutletId)
      );
      const foodCostEntriesSnapshot = await getDocs(foodCostEntriesQuery);
      const foodCostEntryIds = foodCostEntriesSnapshot.docs.map(doc => doc.id);

      const categoryCostsMap = new Map<string, number>();
      const individualFoodCostDetails: { categoryName: string; description: string; cost: number }[] = [];
      let totalCostFromTransfers = 0;

      if (foodCostEntryIds.length > 0) {
        const chunkSize = 10;
        for (let i = 0; i < foodCostEntryIds.length; i += chunkSize) {
          const chunk = foodCostEntryIds.slice(i, i + chunkSize);
          const foodCostDetailsQuery = query(
            collection(db!, FOOD_COST_DETAILS_COLLECTION),
            where("food_cost_entry_id", "in", chunk)
          );
          const foodCostDetailsSnapshot = await getDocs(foodCostDetailsQuery);
          
          const categoriesSnapshot = await getDocs(collection(db!, CATEGORIES_COLLECTION));
          const categoriesMap = new Map<string, string>();
          categoriesSnapshot.forEach(doc => categoriesMap.set(doc.id, doc.data().name));

          foodCostDetailsSnapshot.forEach(doc => {
            const detail = doc.data() as FoodCostDetail;
            const categoryName = categoriesMap.get(detail.category_id) || "Unknown Category";
            const cost = detail.cost || 0;
            categoryCostsMap.set(categoryName, (categoryCostsMap.get(categoryName) || 0) + cost);
            totalCostFromTransfers += cost;
            individualFoodCostDetails.push({
              categoryName,
              description: detail.description || '-',
              cost,
            });
          });
        }
      }

      const categoryCosts = Array.from(categoryCostsMap.entries()).map(([categoryName, totalCost]) => ({
        categoryName,
        totalCost,
        percentageOfTotalCost: totalCostFromTransfers > 0 ? (totalCost / totalCostFromTransfers) * 100 : 0,
      }));

      // PART 2: Summary total figures from Daily Financial Summary
      let summaryQuery = query(
        collection(db!, DAILY_FINANCIAL_SUMMARIES_COLLECTION),
        where("date", ">=", startTimestamp),
        where("date", "<=", endTimestamp),
        // Removed where("outlet_id", "==", currentOutletId) as DailyFinancialSummary is a hotel-level summary
        orderBy("date", "asc")
      );
      const summarySnapshot = await getDocs(summaryQuery);
      if (summarySnapshot.empty) {
        console.error(`[generateSingleReport - ${currentOutletName}] No DailyFinancialSummary documents found for date range ${startTimestamp.toDate().toISOString()} to ${endTimestamp.toDate().toISOString()}.`);
      }

      let totalFoodRevenue = 0;
      let totalEntertainmentFoodCost = 0;
      let totalOcFoodCost = 0;
      let totalOtherFoodAdjustments = 0;
      let totalBudgetFoodCostPct = 0;
      let budgetFoodCostPctCount = 0;

      summarySnapshot.forEach(doc => {
        const data = doc.data() as DailyFinancialSummary;
        totalFoodRevenue += data.food_revenue || 0;
        totalEntertainmentFoodCost += data.ent_food || 0;
        totalOcFoodCost += data.oc_food || 0;
        totalOtherFoodAdjustments += data.other_food_adjustment || 0;
        if (data.budget_food_cost_pct != null) {
          totalBudgetFoodCostPct += data.budget_food_cost_pct;
          budgetFoodCostPctCount++;
        }
      });

      const budgetFoodCostPercentage = budgetFoodCostPctCount > 0 ? totalBudgetFoodCostPct / budgetFoodCostPctCount : 0;

      const totalCostOfFood = totalCostFromTransfers - totalOcFoodCost - totalEntertainmentFoodCost + totalOtherFoodAdjustments;

      const foodCostPercentage = totalFoodRevenue > 0 ? (totalCostOfFood / totalFoodRevenue) * 100 : 0;

      const variancePercentage = foodCostPercentage - budgetFoodCostPercentage;

      return {
        outletName: currentOutletName,
        outletId: currentOutletId,
        dateRange: { from: startDate, to: endDate },
        categoryCosts,
        totalCostFromTransfers,
        otherAdjustmentsFood: totalOtherFoodAdjustments,
        ocFoodTotal: totalOcFoodCost,
        entFoodTotal: totalEntertainmentFoodCost,
        totalCostOfFood,
        totalFoodRevenue,
        foodCostPercentage,
        budgetFoodCostPercentage,
        variancePercentage,
        foodCostDetailsByItem: individualFoodCostDetails,
      };
    };

    const outletReports: DetailedFoodCostReport[] = [];
    let overallSummaryReport: DetailedFoodCostReport;

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

      let totalOverallFoodRevenue = 0;
      let totalOverallEntertainmentFoodCost = 0;
      let totalOverallOcFoodCost = 0;
      let totalOverallOtherFoodAdjustments = 0;
      let totalOverallBudgetFoodCostPct = 0;
      let overallBudgetFoodCostPctCount = 0;

      overallSummarySnapshot.forEach(doc => {
        const data = doc.data() as DailyFinancialSummary;
        totalOverallFoodRevenue += data.food_revenue || 0;
        totalOverallEntertainmentFoodCost += data.ent_food || 0;
        totalOverallOcFoodCost += data.oc_food || 0;
        totalOverallOtherFoodAdjustments += data.other_food_adjustment || 0;
        if (data.budget_food_cost_pct != null) {
          totalOverallBudgetFoodCostPct += data.budget_food_cost_pct;
          overallBudgetFoodCostPctCount++;
        }
      });

      // Total Cost from Transfers for overall summary should still be sum of outlet-specific transfers
      let totalOverallCostFromTransfers = 0;
      outletReports.forEach(report => {
        totalOverallCostFromTransfers += report.totalCostFromTransfers;
      });

      // Create a map to aggregate category costs across all outlets for detailed items
      const overallCategoryCostsMap = new Map<string, number>();
      const overallFoodCostDetailsByItem: { categoryName: string; description: string; cost: number }[] = [];

      outletReports.forEach(report => {
        report.foodCostDetailsByItem.forEach(item => {
          const existingCost = overallCategoryCostsMap.get(item.categoryName) || 0;
          overallCategoryCostsMap.set(item.categoryName, existingCost + item.cost);
          overallFoodCostDetailsByItem.push({
            categoryName: item.categoryName,
            description: item.description,
            cost: item.cost
          });
        });
      });

      // Calculate average budget food cost percentage for overall summary
      const overallBudgetFoodCostPercentage = overallBudgetFoodCostPctCount > 0 
        ? totalOverallBudgetFoodCostPct / overallBudgetFoodCostPctCount 
        : 0;

      // Calculate Total Cost of Food for overall summary (using the newly fetched totals)
      const overallTotalCostOfFood = totalOverallCostFromTransfers - 
        totalOverallOcFoodCost - 
        totalOverallEntertainmentFoodCost + 
        totalOverallOtherFoodAdjustments;

      // Calculate Food Cost Percentage for overall summary
      const overallFoodCostPercentage = totalOverallFoodRevenue > 0 
        ? (overallTotalCostOfFood / totalOverallFoodRevenue) * 100 
        : 0;

      // Calculate Variance Percentage for overall summary
      const overallVariancePercentage = overallFoodCostPercentage - overallBudgetFoodCostPercentage;

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
        otherAdjustmentsFood: totalOverallOtherFoodAdjustments,
        ocFoodTotal: totalOverallOcFoodCost,
        entFoodTotal: totalOverallEntertainmentFoodCost,
        totalCostOfFood: overallTotalCostOfFood,
        totalFoodRevenue: totalOverallFoodRevenue,
        foodCostPercentage: overallFoodCostPercentage,
        budgetFoodCostPercentage: overallBudgetFoodCostPercentage,
        variancePercentage: overallVariancePercentage,
        foodCostDetailsByItem: overallFoodCostDetailsByItem,
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
    console.error("Error fetching detailed food cost report:", error);
    throw new Error(`Could not load detailed food cost report. Details: ${error.message}`);
  }
}
    

    