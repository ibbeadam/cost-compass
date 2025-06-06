
"use server";

import { collection, addDoc, doc, writeBatch, serverTimestamp, getDocs, query, where, Timestamp, deleteDoc, getDoc, runTransaction, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { revalidatePath } from "next/cache";
import type { FoodCostEntry, FoodCostDetail, Category, Outlet } from "@/types";
import { format } from "date-fns";

const FOOD_COST_ENTRIES_COLLECTION = "foodCostEntries";
const FOOD_COST_DETAILS_COLLECTION = "foodCostDetails";
const CATEGORIES_COLLECTION = "categories"; // To fetch category names

interface FoodCostItemInput {
  id?: string; // For existing items being updated
  categoryId: string;
  cost: number;
  description?: string;
}

export async function saveFoodCostEntryAction(
  date: Date,
  outletId: string,
  items: FoodCostItemInput[],
  existingEntryId?: string | null // Pass this if updating an existing entry
): Promise<{ foodCostEntryId: string }> {
  if (!date || !outletId || items.length === 0) {
    throw new Error("Date, Outlet ID, and at least one item are required.");
  }

  const totalFoodCost = items.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
  const entryDate = Timestamp.fromDate(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())));

  try {
    let foodCostEntryId = existingEntryId;

    await runTransaction(db, async (transaction) => {
      if (existingEntryId) {
        // Update existing entry
        const entryRef = doc(db, FOOD_COST_ENTRIES_COLLECTION, existingEntryId);
        transaction.update(entryRef, {
          total_food_cost: totalFoodCost,
          updatedAt: serverTimestamp(),
        });

        // Delete old details for this entry
        const detailsQuery = query(collection(db, FOOD_COST_DETAILS_COLLECTION), where("food_cost_entry_id", "==", existingEntryId));
        const oldDetailsSnapshot = await getDocs(detailsQuery); // Use getDocs directly in transaction for reads
        oldDetailsSnapshot.forEach(detailDoc => transaction.delete(detailDoc.ref));

      } else {
        // Create new entry
        const newEntryRef = doc(collection(db, FOOD_COST_ENTRIES_COLLECTION));
        transaction.set(newEntryRef, {
          date: entryDate,
          outlet_id: outletId,
          total_food_cost: totalFoodCost,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        foodCostEntryId = newEntryRef.id;
      }

      if (!foodCostEntryId) {
        throw new Error("Failed to obtain foodCostEntryId.");
      }

      // Add new details
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


    revalidatePath("/dashboard/food-cost-input");
    revalidatePath("/dashboard/financial-summary"); // For potential recalculations
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
  const entryDateStart = Timestamp.fromDate(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())));
  const entryDateEnd = Timestamp.fromDate(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate() + 1)));

  const q = query(
    collection(db, FOOD_COST_ENTRIES_COLLECTION),
    where("outlet_id", "==", outletId),
    where("date", ">=", entryDateStart),
    where("date", "<", entryDateEnd)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }

  const entryDoc = snapshot.docs[0];
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
      categoryName: categoriesMap.get(detailData.category_id) || detailData.category_id, // Add category name
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
  try {
    const batch = writeBatch(db);

    // Delete the main entry
    const entryRef = doc(db, FOOD_COST_ENTRIES_COLLECTION, foodCostEntryId);
    batch.delete(entryRef);

    // Delete associated details
    const detailsQuery = query(collection(db, FOOD_COST_DETAILS_COLLECTION), where("food_cost_entry_id", "==", foodCostEntryId));
    const detailsSnapshot = await getDocs(detailsQuery);
    detailsSnapshot.forEach(detailDoc => batch.delete(detailDoc.ref));

    await batch.commit();

    revalidatePath("/dashboard/food-cost-input");
    revalidatePath("/dashboard/financial-summary");
    revalidatePath("/dashboard");
  } catch (error) {
    console.error("Error deleting food cost entry: ", error);
    throw new Error(`Failed to delete food cost entry: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Helper to get categories of type 'Food' for populating dropdowns
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

// Helper to get all outlets for populating dropdowns
export async function getOutletsAction(): Promise<Outlet[]> {
    try {
        const q = query(collection(db, "outlets"), orderBy("name", "asc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            // Ensure all fields from Outlet type are explicitly mapped
            // and timestamps are converted
            return {
                id: docSnap.id,
                name: data.name,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
                isActive: data.isActive,
                address: data.address,
                phoneNumber: data.phoneNumber,
                email: data.email,
                type: data.type,
                currency: data.currency,
                timezone: data.timezone,
                defaultBudgetFoodCostPct: data.defaultBudgetFoodCostPct,
                defaultBudgetBeverageCostPct: data.defaultBudgetBeverageCostPct,
                targetOccupancy: data.targetOccupancy,
            } as Outlet;
        });
    } catch (error) {
        console.error("Error fetching outlets:", error);
        throw new Error("Could not load outlets.");
    }
}

