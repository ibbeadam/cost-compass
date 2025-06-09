
"use server";

import { doc, setDoc, getDoc, serverTimestamp, Timestamp, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { revalidatePath } from "next/cache";
import type { DailyFinancialSummary, FoodCostEntry, BeverageCostEntry } from "@/types"; 
import { format } from "date-fns";

const collectionName = "dailyFinancialSummaries";
const foodCostEntriesCollectionName = "foodCostEntries";
const beverageCostEntriesCollectionName = "beverageCostEntries";

export async function recalculateAndSaveFinancialSummary(inputDate: Date): Promise<void> {
  const normalizedDate = new Date(Date.UTC(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate()));
  const summaryId = format(normalizedDate, "yyyy-MM-dd");
  const dateTimestampForQuery = Timestamp.fromDate(normalizedDate);

  console.log(`[recalculateAndSaveFS] Recalculating for summary ID: ${summaryId} using timestamp: ${dateTimestampForQuery.toDate().toISOString()}`);

  const summaryDocRef = doc(db, collectionName, summaryId);
  const summarySnap = await getDoc(summaryDocRef);

  if (!summarySnap.exists()) {
    console.log(`[recalculateAndSaveFS] No DailyFinancialSummary found for ${summaryId}. Updating calculated fields to null/0 where appropriate.`);
    // If the summary was deleted (e.g., date changed), we might still want to ensure
    // that any dependent calculations reflect this absence, though typically this function
    // is called *after* a summary save.
    // For now, if it doesn't exist, we can't update it.
    // If a summary was *moved*, the old one is deleted, and this would be called for the old date.
    // It will correctly find no summary and do nothing, which is fine.
    // The call for the *new* date will then operate on the newly created/moved summary.
    return;
  }

  const summaryData = summarySnap.data() as DailyFinancialSummary;

  const foodCostEntriesQuery = query(
    collection(db, foodCostEntriesCollectionName),
    where("date", "==", dateTimestampForQuery)
  );
  const foodCostEntriesSnap = await getDocs(foodCostEntriesQuery);
  let grossFoodCost = 0;
  foodCostEntriesSnap.forEach(doc => {
    const entry = doc.data() as FoodCostEntry;
    grossFoodCost += entry.total_food_cost || 0;
  });

  const entFood = summaryData.ent_food || 0;
  const ocFood = summaryData.oc_food || 0;
  const otherFoodAdjustment = summaryData.other_food_adjustment || 0; 
  const actual_food_cost = grossFoodCost - entFood - ocFood + otherFoodAdjustment;
  let actual_food_cost_pct: number | null = null;
  if (summaryData.food_revenue != null && summaryData.food_revenue > 0) {
    actual_food_cost_pct = (actual_food_cost / summaryData.food_revenue) * 100;
  } else if (summaryData.food_revenue === 0 && actual_food_cost > 0) {
    actual_food_cost_pct = null; 
  } else {
    actual_food_cost_pct = 0; 
  }
  let food_variance_pct: number | null = null;
  if (actual_food_cost_pct !== null && summaryData.budget_food_cost_pct != null) {
    food_variance_pct = actual_food_cost_pct - summaryData.budget_food_cost_pct;
  }

  const beverageCostEntriesQuery = query(
    collection(db, beverageCostEntriesCollectionName),
    where("date", "==", dateTimestampForQuery)
  );
  const beverageCostEntriesSnap = await getDocs(beverageCostEntriesQuery);
  let grossBeverageCost = 0;
  beverageCostEntriesSnap.forEach(doc => {
    const entry = doc.data() as BeverageCostEntry;
    grossBeverageCost += entry.total_beverage_cost || 0;
  });
  
  const entBeverage = summaryData.ent_beverage || 0;
  const ocBeverage = summaryData.oc_beverage || 0;
  const otherBeverageAdjustment = summaryData.other_beverage_adjustment || 0;
  const actual_beverage_cost = grossBeverageCost - entBeverage - ocBeverage + otherBeverageAdjustment;
  let actual_beverage_cost_pct: number | null = null;
  if (summaryData.beverage_revenue != null && summaryData.beverage_revenue > 0) {
    actual_beverage_cost_pct = (actual_beverage_cost / summaryData.beverage_revenue) * 100;
  } else if (summaryData.beverage_revenue === 0 && actual_beverage_cost > 0) {
     actual_beverage_cost_pct = null;
  } else {
    actual_beverage_cost_pct = 0;
  }
  let beverage_variance_pct: number | null = null;
  if (actual_beverage_cost_pct !== null && summaryData.budget_beverage_cost_pct != null) {
    beverage_variance_pct = actual_beverage_cost_pct - summaryData.budget_beverage_cost_pct;
  }

  const updatePayload: Partial<DailyFinancialSummary> = {
    actual_food_cost,
    actual_food_cost_pct,
    food_variance_pct,
    actual_beverage_cost,
    actual_beverage_cost_pct,
    beverage_variance_pct,
    updatedAt: serverTimestamp() as Timestamp,
  };

  await setDoc(summaryDocRef, updatePayload, { merge: true });
  console.log(`[recalculateAndSaveFS] DailyFinancialSummary ${summaryId} updated with calculated costs.`);
  revalidatePath("/dashboard/financial-summary");
  revalidatePath("/dashboard");
}


export async function saveDailyFinancialSummaryAction(
  summaryData: Partial<Omit<DailyFinancialSummary, 'id' | 'createdAt' | 'updatedAt'>> & { date: Date },
  originalIdIfEditing?: string // YYYY-MM-DD string of the document being edited, if applicable
): Promise<void> {
  const newNormalizedDate = new Date(Date.UTC(summaryData.date.getFullYear(), summaryData.date.getMonth(), summaryData.date.getDate()));
  const newEntryId = format(newNormalizedDate, "yyyy-MM-dd");
  
  if (!newEntryId) { // Should not happen if date is valid
    throw new Error("Date is required to create or update an entry ID.");
  }

  try {
    // Prepare the data to be saved, excluding calculated fields initially
    const dataToSave: Partial<DailyFinancialSummary> & { date: Timestamp; updatedAt: Timestamp; createdAt?: Timestamp } = {
      ...summaryData, 
      date: Timestamp.fromDate(newNormalizedDate),
      updatedAt: serverTimestamp() as Timestamp,
    };
    // These fields will be set by recalculateAndSaveFinancialSummary
    delete (dataToSave as any).actual_food_cost;
    delete (dataToSave as any).actual_food_cost_pct;
    delete (dataToSave as any).food_variance_pct;
    delete (dataToSave as any).actual_beverage_cost;
    delete (dataToSave as any).actual_beverage_cost_pct;
    delete (dataToSave as any).beverage_variance_pct;

    const defaultsForNewEntry: Partial<DailyFinancialSummary> = {
        food_revenue: 0, budget_food_cost_pct: 0, ent_food: 0, oc_food: 0, other_food_adjustment: 0,
        beverage_revenue: 0, budget_beverage_cost_pct: 0, ent_beverage: 0, oc_beverage: 0, other_beverage_adjustment: 0,
        notes: '',
        actual_food_cost: null, actual_food_cost_pct: null, food_variance_pct: null,
        actual_beverage_cost: null, actual_beverage_cost_pct: null, beverage_variance_pct: null,
    };
    
    if (originalIdIfEditing && originalIdIfEditing !== newEntryId) {
      // Date has changed during an edit. Delete the old document.
      const oldDocRef = doc(db, collectionName, originalIdIfEditing);
      await deleteDoc(oldDocRef);
      console.log(`[saveDFSAction] Deleted old summary ${originalIdIfEditing} as date changed to ${newEntryId}.`);

      // Create the new document with the new ID (new date)
      dataToSave.createdAt = serverTimestamp() as Timestamp; // Treat as new creation
      await setDoc(doc(db, collectionName, newEntryId), { ...defaultsForNewEntry, ...dataToSave });
      console.log(`[saveDFSAction] Created new summary ${newEntryId} after date change.`);
      
      // Recalculate for both old and new dates
      const [year, month, day] = originalIdIfEditing.split('-').map(Number);
      const oldDateForRecalc = new Date(Date.UTC(year, month - 1, day));
      await recalculateAndSaveFinancialSummary(oldDateForRecalc); // For the old date (will find no summary, that's fine)
      await recalculateAndSaveFinancialSummary(newNormalizedDate); // For the new date

    } else {
      // This is either a brand new entry, or an edit where the date did NOT change.
      const entryDocRef = doc(db, collectionName, newEntryId);
      const existingDocSnap = await getDoc(entryDocRef);

      if (existingDocSnap.exists()) {
        // Editing an existing entry (date hasn't changed), or creating a new entry for a date that coincidentally already has one.
        await setDoc(entryDocRef, dataToSave, { merge: true });
        console.log(`[saveDFSAction] Updated/merged summary for ${newEntryId}.`);
      } else {
        // Creating a truly new entry for a date that doesn't have one yet.
        dataToSave.createdAt = serverTimestamp() as Timestamp;
        await setDoc(entryDocRef, { ...defaultsForNewEntry, ...dataToSave });
        console.log(`[saveDFSAction] Created new summary for ${newEntryId}.`);
      }
      await recalculateAndSaveFinancialSummary(newNormalizedDate);
    }
    // Revalidation is handled by recalculateAndSaveFinancialSummary.

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
    const entrySnap = await getDoc(entryDocRef);
    let entryDate: Date | null = null;
    if (entrySnap.exists()) {
        const entryData = entrySnap.data();
        if (entryData?.date instanceof Timestamp) {
            entryDate = entryData.date.toDate();
        } else if (entryData?.date) {
            entryDate = new Date(entryData.date as any);
        }
    }

    await deleteDoc(entryDocRef);
    
    // After deleting, recalculate for that date to ensure costs are updated (likely to zero for this specific summary)
    // This might be redundant if the summary is the only source for its own values,
    // but important if other calculations depend on its presence.
    if (entryDate) {
        await recalculateAndSaveFinancialSummary(entryDate);
    }

    revalidatePath("/dashboard/financial-summary");
    revalidatePath("/dashboard");
  } catch (error) {
    console.error("Error deleting daily financial summary: ", error);
    throw new Error(`Failed to delete daily financial summary: ${error instanceof Error ? error.message : String(error)}`);
  }
}

    