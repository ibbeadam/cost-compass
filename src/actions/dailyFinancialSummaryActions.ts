"use server";

import { doc, setDoc, getDoc, serverTimestamp, Timestamp, deleteDoc, collection, query, where, getDocs, limit as firestoreLimit, orderBy, startAfter, DocumentSnapshot, writeBatch } from "firebase/firestore";
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

  const summaryDocRef = doc(db!, collectionName, summaryId);
  const summarySnap = await getDoc(summaryDocRef);

  let summaryData: DailyFinancialSummary;
  if (!summarySnap.exists()) {
    console.log(`[recalculateAndSaveFS] No DailyFinancialSummary found for ${summaryId}. Creating new summary with defaults.`);
    summaryData = {
      id: summaryId,
      date: dateTimestampForQuery,
      outlet_id: "", 
      actual_food_revenue: 0,
      actual_beverage_revenue: 0,
      budget_food_revenue: 0,
      budget_beverage_revenue: 0,
      budget_food_cost: 0,
      budget_beverage_cost: 0,
      gross_food_cost: 0,
      gross_beverage_cost: 0,
      net_food_cost: 0,
      net_beverage_cost: 0,
      total_adjusted_food_cost: 0,
      total_adjusted_beverage_cost: 0,
      total_covers: 0,
      average_check: 0,

      budget_food_cost_pct: 0, 
      budget_beverage_cost_pct: 0, 

      ent_food: 0,
      oc_food: 0,
      other_food_adjustment: 0,

      entertainment_beverage_cost: 0,
      officer_check_comp_beverage: 0,
      other_beverage_adjustments: 0,

      actual_food_cost: null, 
      actual_food_cost_pct: null,
      food_variance_pct: null,
      actual_beverage_cost: null, 
      actual_beverage_cost_pct: null,
      beverage_variance_pct: null,
      notes: "",
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };
    await setDoc(summaryDocRef, summaryData, { merge: true });
  } else {
    summaryData = summarySnap.data() as DailyFinancialSummary;
    console.log(`[recalculateAndSaveFS] DailyFinancialSummary found for ${summaryId}. Proceeding with recalculation.`);
  }

  const foodCostEntriesQuery = query(
    collection(db!, foodCostEntriesCollectionName),
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
  if (summaryData.actual_food_revenue != null && summaryData.actual_food_revenue > 0) {
    actual_food_cost_pct = (actual_food_cost / summaryData.actual_food_revenue) * 100;
  } else if (summaryData.actual_food_revenue === 0 && actual_food_cost > 0) {
    actual_food_cost_pct = null; 
  } else {
    actual_food_cost_pct = 0; 
  }
  let food_variance_pct: number | null = null;
  if (actual_food_cost_pct !== null && summaryData.budget_food_cost_pct != null) {
    food_variance_pct = actual_food_cost_pct - summaryData.budget_food_cost_pct;
  }

  const beverageCostEntriesQuery = query(
    collection(db!, beverageCostEntriesCollectionName),
    where("date", "==", dateTimestampForQuery)
  );
  const beverageCostEntriesSnap = await getDocs(beverageCostEntriesQuery);
  let grossBeverageCost = 0;
  beverageCostEntriesSnap.forEach(doc => {
    const entry = doc.data() as BeverageCostEntry;
    grossBeverageCost += entry.total_beverage_cost || 0;
  });
  
  const entBeverage = summaryData.entertainment_beverage_cost || 0;
  const ocBeverage = summaryData.officer_check_comp_beverage || 0;
  const otherBeverageAdjustment = summaryData.other_beverage_adjustments || 0;
  const actual_beverage_cost = grossBeverageCost - entBeverage - ocBeverage + otherBeverageAdjustment;
  let actual_beverage_cost_pct: number | null = null;
  if (summaryData.actual_beverage_revenue != null && summaryData.actual_beverage_revenue > 0) {
    actual_beverage_cost_pct = (actual_beverage_cost / summaryData.actual_beverage_revenue) * 100;
  } else if (summaryData.actual_beverage_revenue === 0 && actual_beverage_cost > 0) {
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
    ent_food: summaryData.ent_food,
    oc_food: summaryData.oc_food,
    other_food_adjustment: summaryData.other_food_adjustment,
    entertainment_beverage_cost: summaryData.entertainment_beverage_cost,
    officer_check_comp_beverage: summaryData.officer_check_comp_beverage,
    other_beverage_adjustments: summaryData.other_beverage_adjustments,
    updatedAt: serverTimestamp() as Timestamp,
  };

  await setDoc(summaryDocRef, updatePayload, { merge: true });
  console.log(`[recalculateAndSaveFS] DailyFinancialSummary ${summaryId} updated with calculated costs.`);
  revalidatePath("/dashboard/financial-summary");
  revalidatePath("/dashboard");
}


export async function saveDailyFinancialSummaryAction(
  summaryData: Partial<Omit<DailyFinancialSummary, 'id' | 'createdAt' | 'updatedAt'>> & { date: Date },
  originalIdIfEditing?: string 
): Promise<void> {
  const newNormalizedDate = new Date(Date.UTC(summaryData.date.getFullYear(), summaryData.date.getMonth(), summaryData.date.getDate()));
  const newEntryId = format(newNormalizedDate, "yyyy-MM-dd");
  
  if (!newEntryId) { 
    throw new Error("Date is required to create or update an entry ID.");
  }

  try {
    const dataToSave: Partial<DailyFinancialSummary> & { date: Timestamp; updatedAt: Timestamp; createdAt?: Timestamp } = {
      ...summaryData, 
      date: Timestamp.fromDate(newNormalizedDate),
      updatedAt: serverTimestamp() as Timestamp,
    };
    // These fields are already optional in the interface, no need to delete.
    // delete (dataToSave as any).actual_food_cost;
    // delete (dataToSave as any).actual_food_cost_pct;
    // delete (dataToSave as any).food_variance_pct;
    // delete (dataToSave as any).actual_beverage_cost;
    // delete (dataToSave as any).actual_beverage_cost_pct;
    // delete (dataToSave as any).beverage_variance_pct;

    const defaultsForNewEntry: Partial<DailyFinancialSummary> = {
        actual_food_revenue: 0,
        actual_beverage_revenue: 0,
        budget_food_revenue: 0,
        budget_beverage_revenue: 0,
        budget_food_cost: 0,
        budget_beverage_cost: 0,
        budget_food_cost_pct: 0, 
        ent_food: 0,
        oc_food: 0,
        other_food_adjustment: 0,
        budget_beverage_cost_pct: 0, 
        entertainment_beverage_cost: 0, 
        officer_check_comp_beverage: 0, 
        other_beverage_adjustments: 0,
        total_covers: 0,
        average_check: 0,
        notes: '',
        actual_food_cost: null, 
        actual_food_cost_pct: null, 
        food_variance_pct: null,
        actual_beverage_cost: null, 
        actual_beverage_cost_pct: null, 
        beverage_variance_pct: null,
        gross_food_cost: 0, 
        gross_beverage_cost: 0, 
        net_food_cost: 0, 
        net_beverage_cost: 0, 
        total_adjusted_food_cost: 0, 
        total_adjusted_beverage_cost: 0, 
        outlet_id: "", 
    };
    
    if (originalIdIfEditing && originalIdIfEditing !== newEntryId) {
      const oldDocRef = doc(db!, collectionName, originalIdIfEditing);
      await deleteDoc(oldDocRef);
      console.log(`[saveDFSAction] Deleted old summary ${originalIdIfEditing} as date changed to ${newEntryId}.`);

      dataToSave.createdAt = serverTimestamp() as Timestamp; 
      await setDoc(doc(db!, collectionName, newEntryId), { ...defaultsForNewEntry, ...dataToSave });
      console.log(`[saveDFSAction] Created new summary ${newEntryId} after date change.`);
      
      const [year, month, day] = originalIdIfEditing.split('-').map(Number);
      const oldDateForRecalc = new Date(Date.UTC(year, month - 1, day));
      await recalculateAndSaveFinancialSummary(oldDateForRecalc); 
      await recalculateAndSaveFinancialSummary(newNormalizedDate); 

    } else {
      const entryDocRef = doc(db!, collectionName, newEntryId);
      const existingDocSnap = await getDoc(entryDocRef);

      if (existingDocSnap.exists()) {
        await setDoc(entryDocRef, dataToSave, { merge: true });
        console.log(`[saveDFSAction] Updated/merged summary for ${newEntryId}.`);
      } else {
        dataToSave.createdAt = serverTimestamp() as Timestamp;
        await setDoc(entryDocRef, { ...defaultsForNewEntry, ...dataToSave });
        console.log(`[saveDFSAction] Created new summary for ${newEntryId}.`);
      }
      await recalculateAndSaveFinancialSummary(newNormalizedDate);
    }

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
    const entryDocRef = doc(db!, collectionName, id);
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
    const entryRef = doc(db!, collectionName, id);
    
    // Delete the main daily financial summary document
    const batch = writeBatch(db!);
    batch.delete(entryRef);

    // Also delete related food cost details
    const detailsQuery = query(collection(db!, foodCostEntriesCollectionName), where("food_cost_entry_id", "==", id));
    const detailsSnapshot = await getDocs(detailsQuery);
    detailsSnapshot.forEach(detailDoc => batch.delete(detailDoc.ref));

    await batch.commit();

    // Note: We intentionally do NOT call recalculateAndSaveFinancialSummary here
    // because that would recreate the document we just deleted with zero values.
    // The document should remain deleted.

    revalidatePath("/dashboard/financial-summary");
    revalidatePath("/dashboard");

  } catch (error) {
    console.error("Error deleting daily financial summary: ", error);
    throw new Error(`Failed to delete daily financial summary: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getPaginatedDailyFinancialSummariesAction(
  limitValue?: number, 
  lastVisibleDocId?: string,
  fetchAll: boolean = false 
): Promise<{ summaries: DailyFinancialSummary[]; lastVisibleDocId: string | null; totalCount: number; hasMore: boolean }> {
  try {
    if (!db) {
      throw new Error("Firestore 'db' instance is not available.");
    }

    let q = query(collection(db!, collectionName), orderBy("date", "desc"));
    let totalCount = 0;

    if (fetchAll) {
      const allDocsSnap = await getDocs(q);
      totalCount = allDocsSnap.size;
    } else {
      const countQuery = query(collection(db!, collectionName));
      const countSnapshot = await getDocs(countQuery);
      totalCount = countSnapshot.size;
    }

    if (limitValue && !fetchAll) {
      q = query(q, firestoreLimit(limitValue));
    }

    if (lastVisibleDocId && !fetchAll) {
      const lastDocSnap = await getDoc(doc(db!, collectionName, lastVisibleDocId));
      if (lastDocSnap.exists()) {
        q = query(q, startAfter(lastDocSnap));
      }
    }

    const querySnapshot = await getDocs(q);
    const summaries: DailyFinancialSummary[] = querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        date: data.date instanceof Timestamp ? data.date.toDate() : data.date,
        createdAt: data.createdAt && data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt as any) : undefined),
        updatedAt: data.updatedAt && data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt as any) : undefined),
      } as DailyFinancialSummary;
    });

    const hasMore = !fetchAll && (summaries.length === limitValue);
    const newLastVisibleDocId = summaries.length > 0 && !fetchAll ? summaries[summaries.length - 1].id : null;

    return { summaries, lastVisibleDocId: newLastVisibleDocId, totalCount, hasMore };
  } catch (error: any) {
    console.error("Error fetching paginated daily financial summaries:", error);
    throw new Error(`Could not load daily financial summaries. Details: ${error.message}`);
  }
}
