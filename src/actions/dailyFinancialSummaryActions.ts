
"use server";

import { doc, setDoc, getDoc, serverTimestamp, Timestamp, deleteDoc, collection, query, where, getDocs, limit as firestoreLimit, orderBy, startAfter, DocumentSnapshot } from "firebase/firestore";
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
      const oldDocRef = doc(db, collectionName, originalIdIfEditing);
      await deleteDoc(oldDocRef);
      console.log(`[saveDFSAction] Deleted old summary ${originalIdIfEditing} as date changed to ${newEntryId}.`);

      dataToSave.createdAt = serverTimestamp() as Timestamp; 
      await setDoc(doc(db, collectionName, newEntryId), { ...defaultsForNewEntry, ...dataToSave });
      console.log(`[saveDFSAction] Created new summary ${newEntryId} after date change.`);
      
      const [year, month, day] = originalIdIfEditing.split('-').map(Number);
      const oldDateForRecalc = new Date(Date.UTC(year, month - 1, day));
      await recalculateAndSaveFinancialSummary(oldDateForRecalc); 
      await recalculateAndSaveFinancialSummary(newNormalizedDate); 

    } else {
      const entryDocRef = doc(db, collectionName, newEntryId);
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

export async function getPaginatedDailyFinancialSummariesAction(
  limitValue?: number, // Make limitValue optional
  lastVisibleDocId?: string,
  fetchAll: boolean = false // New parameter
): Promise<{ summaries: DailyFinancialSummary[]; lastVisibleDocId: string | null; totalCount: number; hasMore: boolean }> {
  try {
    const baseQuery = collection(db, collectionName);
    let summariesQuery;

    const totalCountQuery = query(baseQuery);
    const totalSnapshot = await getDocs(totalCountQuery);
    const totalCount = totalSnapshot.size;

    if (fetchAll) {
      summariesQuery = query(baseQuery, orderBy("date", "desc"));
    } else if (limitValue && limitValue > 0) {
      let q = query(baseQuery, orderBy("date", "desc"), firestoreLimit(limitValue));
      if (lastVisibleDocId) {
        const lastDocSnap = await getDoc(doc(db, collectionName, lastVisibleDocId));
        if (lastDocSnap.exists()) {
          q = query(q, startAfter(lastDocSnap));
        }
      }
      summariesQuery = q;
    } else {
      // Default case if no limit specified and not fetching all (though UI should ensure limitValue if not fetchAll)
      summariesQuery = query(baseQuery, orderBy("date", "desc"), firestoreLimit(10)); // Default limit
    }
    
    const querySnapshot = await getDocs(summariesQuery);
    const summaries: DailyFinancialSummary[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Omit<DailyFinancialSummary, 'id'>,
      date: doc.data().date instanceof Timestamp ? doc.data().date.toDate() : new Date(doc.data().date as any),
      createdAt: doc.data().createdAt && doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate() : (doc.data().createdAt ? new Date(doc.data().createdAt as any) : undefined),
      updatedAt: doc.data().updatedAt && doc.data().updatedAt instanceof Timestamp ? doc.data().updatedAt.toDate() : (doc.data().updatedAt ? new Date(doc.data().updatedAt as any) : undefined),
    }));

    let newLastVisibleDocId: string | null = null;
    let hasMoreResult = false;

    if (!fetchAll && limitValue && limitValue > 0) {
      newLastVisibleDocId = summaries.length > 0 ? summaries[summaries.length - 1].id : null;
      // A more robust check for hasMore: fetch limit + 1, then slice.
      // For now, assuming if fetched items = limit, there might be more.
      if (summaries.length === limitValue) {
         // Check if there's at least one more document after the current set
        const nextQuery = query(baseQuery, orderBy("date", "desc"), startAfter(querySnapshot.docs[querySnapshot.docs.length -1]), firestoreLimit(1));
        const nextSnapshot = await getDocs(nextQuery);
        hasMoreResult = !nextSnapshot.empty;
      } else {
        hasMoreResult = false;
      }
    } else if (fetchAll) {
      newLastVisibleDocId = null;
      hasMoreResult = false;
    }

    return { summaries, lastVisibleDocId: newLastVisibleDocId, totalCount, hasMore: hasMoreResult };
  } catch (error) {
    console.error("Error fetching paginated daily financial summaries: ", error);
    throw new Error(`Failed to fetch paginated daily financial summaries: ${error instanceof Error ? error.message : String(error)}`);
  }
}
