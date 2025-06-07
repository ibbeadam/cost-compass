
"use server";

import { collection, addDoc, doc, writeBatch, serverTimestamp, getDocs, query, where, Timestamp, deleteDoc, getDoc, runTransaction, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { revalidatePath } from "next/cache";
import type { FoodCostEntry, FoodCostDetail, Category, Outlet, DailyFinancialSummary } from "@/types";
import { format as formatDateFn, isValid } from "date-fns";
// Import the recalculate function from dailyFinancialSummaryActions
import { recalculateAndSaveFinancialSummary } from "./dailyFinancialSummaryActions";


const FOOD_COST_ENTRIES_COLLECTION = "foodCostEntries";
const FOOD_COST_DETAILS_COLLECTION = "foodCostDetails";
const CATEGORIES_COLLECTION = "categories"; 

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

    await runTransaction(db, async (transaction) => {
      if (existingEntryId) {
        const entryRef = doc(db, FOOD_COST_ENTRIES_COLLECTION, existingEntryId);
        transaction.update(entryRef, {
          total_food_cost: totalFoodCost,
          outlet_id: outletId, // Ensure outlet_id is also updatable if changed for an existing date/entry ID
          date: entryDateTimestamp, // Ensure date is also updatable
          updatedAt: serverTimestamp(),
        });

        const detailsQuery = query(collection(db, FOOD_COST_DETAILS_COLLECTION), where("food_cost_entry_id", "==", existingEntryId));
        const oldDetailsSnapshot = await getDocs(detailsQuery); 
        oldDetailsSnapshot.forEach(detailDoc => transaction.delete(detailDoc.ref));

      } else {
        const newEntryRef = doc(collection(db, FOOD_COST_ENTRIES_COLLECTION));
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
        const detailRef = doc(collection(db, FOOD_COST_DETAILS_COLLECTION));
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
    collection(db, FOOD_COST_ENTRIES_COLLECTION),
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

  const detailsQuery = query(collection(db, FOOD_COST_DETAILS_COLLECTION), where("food_cost_entry_id", "==", foodCostEntryId));
  const detailsSnapshot = await getDocs(detailsQuery);
  
  const categoriesSnapshot = await getDocs(collection(db, CATEGORIES_COLLECTION));
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
    const entryRef = doc(db, FOOD_COST_ENTRIES_COLLECTION, foodCostEntryId);
    const entrySnap = await getDoc(entryRef);
    if (entrySnap.exists()) {
        const entryData = entrySnap.data();
        if (entryData && entryData.date instanceof Timestamp) {
            entryDate = entryData.date.toDate();
        }
    }

    const batch = writeBatch(db);
    batch.delete(entryRef);

    const detailsQuery = query(collection(db, FOOD_COST_DETAILS_COLLECTION), where("food_cost_entry_id", "==", foodCostEntryId));
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
        const q = query(collection(db, CATEGORIES_COLLECTION), where("type", "==", "Food"), orderBy("name", "asc"));
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
        const outletsCollectionRef = collection(db, "outlets");
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
      collection(db, FOOD_COST_ENTRIES_COLLECTION),
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
        collection(db, FOOD_COST_DETAILS_COLLECTION),
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
    

    