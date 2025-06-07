
"use server";

import { collection, addDoc, doc, writeBatch, serverTimestamp, getDocs, query, where, Timestamp, deleteDoc, getDoc, runTransaction, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { revalidatePath } from "next/cache";
import type { BeverageCostEntry, BeverageCostDetail, Category, Outlet } from "@/types";
import { isValid } from "date-fns";
import { recalculateAndSaveFinancialSummary } from "./dailyFinancialSummaryActions";
import { getOutletsAction } from "./foodCostActions"; // Re-use getOutletsAction

const BEVERAGE_COST_ENTRIES_COLLECTION = "beverageCostEntries";
const BEVERAGE_COST_DETAILS_COLLECTION = "beverageCostDetails";
const CATEGORIES_COLLECTION = "categories"; 

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

    await runTransaction(db, async (transaction) => {
      if (existingEntryId) {
        const entryRef = doc(db, BEVERAGE_COST_ENTRIES_COLLECTION, existingEntryId);
        transaction.update(entryRef, {
          total_beverage_cost: totalBeverageCost,
          outlet_id: outletId,
          date: entryDateTimestamp,
          updatedAt: serverTimestamp(),
        });

        const detailsQuery = query(collection(db, BEVERAGE_COST_DETAILS_COLLECTION), where("beverage_cost_entry_id", "==", existingEntryId));
        const oldDetailsSnapshot = await getDocs(detailsQuery); 
        oldDetailsSnapshot.forEach(detailDoc => transaction.delete(detailDoc.ref));

      } else {
        const newEntryRef = doc(collection(db, BEVERAGE_COST_ENTRIES_COLLECTION));
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
        const detailRef = doc(collection(db, BEVERAGE_COST_DETAILS_COLLECTION));
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
    collection(db, BEVERAGE_COST_ENTRIES_COLLECTION),
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

  const detailsQuery = query(collection(db, BEVERAGE_COST_DETAILS_COLLECTION), where("beverage_cost_entry_id", "==", beverageCostEntryId));
  const detailsSnapshot = await getDocs(detailsQuery);
  
  const categoriesSnapshot = await getDocs(query(collection(db, CATEGORIES_COLLECTION), where("type", "==", "Beverage")));
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
    const entryRef = doc(db, BEVERAGE_COST_ENTRIES_COLLECTION, beverageCostEntryId);
    const entrySnap = await getDoc(entryRef);
    if (entrySnap.exists()) {
        const entryData = entrySnap.data();
        if (entryData && entryData.date instanceof Timestamp) {
            entryDate = entryData.date.toDate();
        }
    }

    const batch = writeBatch(db);
    batch.delete(entryRef);

    const detailsQuery = query(collection(db, BEVERAGE_COST_DETAILS_COLLECTION), where("beverage_cost_entry_id", "==", beverageCostEntryId));
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
        const q = query(collection(db, CATEGORIES_COLLECTION), where("type", "==", "Beverage"), orderBy("name", "asc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Category, 'id' | 'createdAt' | 'updatedAt'>),
            createdAt: docSnap.data().createdAt instanceof Timestamp ? docSnap.data().createdAt.toDate() : docSnap.data().createdAt,
            updatedAt: docSnap.data().updatedAt instanceof Timestamp ? docSnap.data().updatedAt.toDate() : docSnap.data().updatedAt,
        } as Category));
    } catch (error) {
        console.error("Error fetching beverage categories:", error);
        throw new Error("Could not load beverage categories.");
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
      collection(db, BEVERAGE_COST_ENTRIES_COLLECTION),
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
        collection(db, BEVERAGE_COST_DETAILS_COLLECTION),
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
