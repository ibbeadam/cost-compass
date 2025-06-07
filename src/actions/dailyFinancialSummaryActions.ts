
"use server";

import { doc, setDoc, getDoc, serverTimestamp, Timestamp, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { revalidatePath } from "next/cache";
import type { DailyFinancialSummary, FoodCostEntry } from "@/types"; 
import { format } from "date-fns";

const collectionName = "dailyFinancialSummaries";

// Internal function to recalculate and update financial summary with actual costs
export async function recalculateAndSaveFinancialSummary(inputDate: Date): Promise<void> {
  // Normalize inputDate to UTC start of day for consistent ID generation and querying
  const normalizedDate = new Date(Date.UTC(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate()));
  const summaryId = format(normalizedDate, "yyyy-MM-dd");
  const dateTimestampForQuery = Timestamp.fromDate(normalizedDate);

  console.log(`[recalculateAndSaveFS] Recalculating for summary ID: ${summaryId} using timestamp: ${dateTimestampForQuery.toDate().toISOString()}`);

  const summaryDocRef = doc(db, collectionName, summaryId);
  const summarySnap = await getDoc(summaryDocRef);

  if (!summarySnap.exists()) {
    console.log(`[recalculateAndSaveFS] No DailyFinancialSummary found for ${summaryId}. Skipping recalculation.`);
    return;
  }

  const summaryData = summarySnap.data() as DailyFinancialSummary;

  // 1. Fetch ALL FoodCostEntries for the date
  const foodCostEntriesQuery = query(
    collection(db, "foodCostEntries"),
    where("date", "==", dateTimestampForQuery)
  );
  const foodCostEntriesSnap = await getDocs(foodCostEntriesQuery);
  let grossFoodCost = 0;
  foodCostEntriesSnap.forEach(doc => {
    const entry = doc.data() as FoodCostEntry;
    grossFoodCost += entry.total_food_cost || 0;
  });
  console.log(`[recalculateAndSaveFS] Gross Food Cost for ${summaryId} from ${foodCostEntriesSnap.size} entries: ${grossFoodCost}`);

  // 2. Perform calculations using data from DailyFinancialSummary
  const entFood = summaryData.ent_food || 0;
  const ocFood = summaryData.oc_food || 0;
  // other_food_adjustment: positive value is an *additional cost*, negative value is a *credit reducing cost*.
  // So, we add it directly. If it's a credit (-25), cost + (-25) = cost - 25. If it's an extra cost (+10), cost + 10.
  const otherFoodAdjustment = summaryData.other_food_adjustment || 0; 

  // Actual food cost = Gross purchases (from FoodCostEntries) - Entertainment Credits - Officer's Check Credits + Other Adjustments
  const actual_food_cost = grossFoodCost - entFood - ocFood + otherFoodAdjustment;
  console.log(`[recalculateAndSaveFS] Calculated Actual Food Cost: ${actual_food_cost} (Gross: ${grossFoodCost}, Ent: ${entFood}, OC: ${ocFood}, Adjust: ${otherFoodAdjustment})`);

  let actual_food_cost_pct: number | null = null;
  if (summaryData.food_revenue != null && summaryData.food_revenue > 0) {
    actual_food_cost_pct = (actual_food_cost / summaryData.food_revenue) * 100;
  } else if (summaryData.food_revenue === 0 && actual_food_cost > 0) {
    actual_food_cost_pct = null; 
  } else {
    actual_food_cost_pct = 0; 
  }
  console.log(`[recalculateAndSaveFS] Calculated Actual Food Cost %: ${actual_food_cost_pct} (Food Revenue: ${summaryData.food_revenue})`);

  let food_variance_pct: number | null = null;
  if (actual_food_cost_pct !== null && summaryData.budget_food_cost_pct != null) {
    food_variance_pct = actual_food_cost_pct - summaryData.budget_food_cost_pct;
  }
  console.log(`[recalculateAndSaveFS] Calculated Food Variance %: ${food_variance_pct} (Budget Food Cost %: ${summaryData.budget_food_cost_pct})`);

  const updatePayload: Partial<DailyFinancialSummary> = {
    actual_food_cost,
    actual_food_cost_pct,
    food_variance_pct,
    updatedAt: serverTimestamp() as Timestamp,
  };

  await setDoc(summaryDocRef, updatePayload, { merge: true });
  console.log(`[recalculateAndSaveFS] DailyFinancialSummary ${summaryId} updated with calculated costs.`);
  revalidatePath("/dashboard/financial-summary");
  revalidatePath("/dashboard");
}


export async function saveDailyFinancialSummaryAction(
  summaryData: Partial<Omit<DailyFinancialSummary, 'id' | 'createdAt' | 'updatedAt'>> & { date: Date }
): Promise<void> {
  // Normalize date to UTC start of day for ID and Firestore Timestamp
  const normalizedDate = new Date(Date.UTC(summaryData.date.getFullYear(), summaryData.date.getMonth(), summaryData.date.getDate()));
  const entryId = format(normalizedDate, "yyyy-MM-dd");
  
  if (!entryId) {
    throw new Error("Date is required to create or update an entry ID.");
  }

  try {
    const entryDocRef = doc(db, collectionName, entryId);
    const existingDocSnap = await getDoc(entryDocRef);

    const dataToSave: Partial<DailyFinancialSummary> & { date: Timestamp; updatedAt: Timestamp; createdAt?: Timestamp } = {
      ...summaryData, 
      date: Timestamp.fromDate(normalizedDate),
      updatedAt: serverTimestamp() as Timestamp,
    };

    // Remove fields that should not be directly saved from form or are calculated later
    delete (dataToSave as any).actual_food_cost;
    delete (dataToSave as any).actual_food_cost_pct;
    delete (dataToSave as any).food_variance_pct;
    delete (dataToSave as any).actual_beverage_cost;
    delete (dataToSave as any).actual_beverage_cost_pct;
    delete (dataToSave as any).beverage_variance_pct;
    
    if (existingDocSnap.exists()) {
      await setDoc(entryDocRef, dataToSave, { merge: true });
      console.log(`[saveDFSAction] Updated summary for ${entryId} with form data.`);
    } else {
      dataToSave.createdAt = serverTimestamp() as Timestamp;
      const defaults: Partial<DailyFinancialSummary> = {
        food_revenue: 0, budget_food_cost_pct: 0, ent_food: 0, oc_food: 0, other_food_adjustment: 0,
        beverage_revenue: 0, budget_beverage_cost_pct: 0, ent_beverage: 0, oc_beverage: 0, other_beverage_adjustment: 0,
        notes: '',
        actual_food_cost: null, actual_food_cost_pct: null, food_variance_pct: null,
        actual_beverage_cost: null, actual_beverage_cost_pct: null, beverage_variance_pct: null,
      };
      await setDoc(entryDocRef, { ...defaults, ...dataToSave });
      console.log(`[saveDFSAction] Created new summary for ${entryId} with form data.`);
    }

    // After saving form data, trigger recalculation based on all food cost entries for this date
    await recalculateAndSaveFinancialSummary(normalizedDate);

    revalidatePath("/dashboard/financial-summary");
    revalidatePath("/dashboard"); 
  } catch (error) {
    console.error("Error saving daily financial summary: ", error);
    throw new Error(`Failed to save daily financial summary: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getDailyFinancialSummaryAction(id: string): Promise<DailyFinancialSummary | null> {
  if (!id) {
    throw new Error("Entry ID (YYYY-MM-DD) is required to fetch data.");
  }
  try {
    const entryDocRef = doc(db, collectionName, id);
    const docSnap = await getDoc(entryDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as Omit<DailyFinancialSummary, 'id'>;
      return { 
        id: docSnap.id, 
        ...data,
        date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date as any),
        createdAt: data.createdAt && data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt as any) : undefined),
        updatedAt: data.updatedAt && data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt as any) : undefined),
      } as DailyFinancialSummary;
    } else {
      return null; 
    }
  } catch (error) {
    console.error("Error fetching daily financial summary: ", error);
    throw new Error(`Failed to fetch daily financial summary: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function deleteDailyFinancialSummaryAction(id: string): Promise<void> {
  if (!id) {
    throw new Error("Entry ID (YYYY-MM-DD) is required for deletion.");
  }
  try {
    const entryDocRef = doc(db, collectionName, id);
    await deleteDoc(entryDocRef);
    // Note: If a summary is deleted, related FoodCostEntries are NOT deleted,
    // but they won't have a summary to link to for calculations.
    // Consider if deleting a summary should also clear out its calculated values (though it's being deleted anyway).
    revalidatePath("/dashboard/financial-summary");
    revalidatePath("/dashboard");
  } catch (error) {
    console.error("Error deleting daily financial summary: ", error);
    throw new Error(`Failed to delete daily financial summary: ${error instanceof Error ? error.message : String(error)}`);
  }
}

    