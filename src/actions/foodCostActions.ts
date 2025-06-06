
"use server";

import { collection, addDoc, doc, writeBatch, serverTimestamp, getDocs, query, where, Timestamp, deleteDoc, getDoc, runTransaction, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { revalidatePath } from "next/cache";
import type { FoodCostEntry, FoodCostDetail, Category, Outlet, DailyFinancialSummary } from "@/types";
import { format as formatDateFn } from "date-fns";
import { getDailyFinancialSummaryAction, saveDailyFinancialSummaryAction } from "./dailyFinancialSummaryActions";


const FOOD_COST_ENTRIES_COLLECTION = "foodCostEntries";
const FOOD_COST_DETAILS_COLLECTION = "foodCostDetails";
const CATEGORIES_COLLECTION = "categories"; // To fetch category names

interface FoodCostItemInput {
  id?: string; // For existing items being updated
  categoryId: string;
  cost: number;
  description?: string;
}

async function updateAssociatedFinancialSummary(entryDate: Date, totalFoodCost: number) {
  const financialSummaryId = formatDateFn(entryDate, "yyyy-MM-dd");
  try {
    const summary = await getDailyFinancialSummaryAction(financialSummaryId);

    if (summary) {
      let actual_food_cost_pct: number | null = null;
      let food_variance_pct: number | null = null;

      if (summary.food_revenue != null && summary.food_revenue > 0) {
        actual_food_cost_pct = (totalFoodCost / summary.food_revenue) * 100;
      } else if (summary.food_revenue === 0 && totalFoodCost > 0) {
        actual_food_cost_pct = null; // Or a very high number / specific sentinel if preferred for "infinite" cost %
      } else {
        actual_food_cost_pct = 0; // Both revenue and cost are 0 or revenue is null/undefined
      }
      

      if (actual_food_cost_pct !== null && summary.budget_food_cost_pct != null) {
        food_variance_pct = actual_food_cost_pct - summary.budget_food_cost_pct;
      }

      const updatePayload: Partial<Omit<DailyFinancialSummary, 'id' | 'createdAt' | 'updatedAt'>> & { date: Date } = {
        date: summary.date instanceof Timestamp ? summary.date.toDate() : new Date(summary.date), // ensure it's a JS Date
        actual_food_cost: totalFoodCost,
        actual_food_cost_pct: actual_food_cost_pct,
        food_variance_pct: food_variance_pct,
        // Preserve other fields by not including them, saveDailyFinancialSummaryAction merges
      };
      await saveDailyFinancialSummaryAction(updatePayload);
      console.log(`Updated financial summary ${financialSummaryId} with food cost data.`);
    } else {
      console.log(`No financial summary found for date ${financialSummaryId} to update with food cost data.`);
    }
  } catch (error) {
    console.error(`Error updating financial summary ${financialSummaryId} with food cost:`, error);
    // Decide if this error should propagate or just be logged
  }
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
  // Ensure date is UTC to match Firestore potentially storing it as such if coming from serverTimestamp or specific client setups
  const entryDateTimestamp = Timestamp.fromDate(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())));


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
        const oldDetailsSnapshot = await getDocs(detailsQuery); 
        oldDetailsSnapshot.forEach(detailDoc => transaction.delete(detailDoc.ref));

      } else {
        // Create new entry
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

    // After successful transaction, update the associated DailyFinancialSummary
    // Use the original 'date' (JS Date object) for calculations and fetching summary
    await updateAssociatedFinancialSummary(date, totalFoodCost);


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
  let entryDate: Date | null = null;
  let totalFoodCostZero = 0; // For resetting associated summary

  try {
    // Get the entry to find its date before deleting
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

    // After successful deletion, update the associated DailyFinancialSummary with zero/null food costs
    if (entryDate) {
        await updateAssociatedFinancialSummary(entryDate, totalFoodCostZero);
    }


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
        if (!db) {
            console.error("Firestore 'db' instance is not available in getOutletsAction.");
            throw new Error("Database connection is not available. Could not load outlets.");
        }
        const outletsCollectionRef = collection(db, "outlets");
        // Fetch without orderBy to avoid index issues, sort client-side
        const snapshot = await getDocs(outletsCollectionRef);
        
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

        // Sort client-side
        return outletsData.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    } catch (error: any) {
        console.error("--------------------------------------------------");
        console.error("Detailed error in getOutletsAction:", error);
        if (error.name) console.error("Error Name:", error.name);
        if (error.code) console.error("Error Code:", error.code);
        if (error.message) console.error("Error Message:", error.message);
        if (error.stack) console.error("Error Stack:", error.stack);
        console.error("--------------------------------------------------");

        let errorMessage = "Could not load outlets.";
        if (error instanceof Error) {
          if (error.message.includes("index") || error.message.includes("orderBy") || (error as any).code === 'failed-precondition') {
              errorMessage += " This might be due to a missing Firestore index. Check your Firestore console for index creation links, or create one manually for the 'outlets' collection. If sorting by 'name', ensure an index on that field exists.";
          } else if ((error as any).code === 'permission-denied') {
              errorMessage += " Firestore permission denied. Please check your security rules for the 'outlets' collection.";
          } else {
              errorMessage += ` Details: ${error.message}`;
          }
        } else {
            errorMessage += " An unknown error occurred."
        }
        throw new Error(errorMessage);
    }
}
