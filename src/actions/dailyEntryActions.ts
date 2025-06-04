
"use server";

import { doc, setDoc, getDoc, serverTimestamp, Timestamp, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { revalidatePath } from "next/cache";
import type { DailyHotelEntry, CostDetailCategory } from "@/types"; 
import { format } from "date-fns";

// Helper to ensure CostDetailCategory has all its arrays initialized
function initializeCostDetailCategory(details?: Partial<CostDetailCategory>): CostDetailCategory {
  return {
    transferIns: details?.transferIns || [],
    directPurchases: details?.directPurchases || [],
    otherAdjustments: details?.otherAdjustments || [],
    transfersOut: details?.transfersOut || [],
    creditAdjustments: details?.creditAdjustments || [],
  };
}


export async function saveDailyHotelEntryAction(
  // entryData comes from the form (e.g. FoodCostEntryForm), containing relevant fields
  entryData: Omit<DailyHotelEntry, 'id' | 'createdAt' | 'updatedAt' | 'calculatedNetFoodCost' | 'calculatedActualFoodCostPct' | 'calculatedFoodCostVariancePct' | 'calculatedNetBeverageCost' | 'calculatedActualBeverageCostPct' | 'calculatedBeverageCostVariancePct'> & { date: Date } 
): Promise<void> {
  const entryId = format(entryData.date, "yyyy-MM-dd");
  
  if (!entryId) {
    throw new Error("Date is required to create an entry ID.");
  }

  try {
    const entryDocRef = doc(db, "dailyHotelEntries", entryId);
    const existingDocSnap = await getDoc(entryDocRef);

    const dataToSave: Omit<DailyHotelEntry, 'id'> = {
      // Spread all fields from entryData. This will include food fields,
      // and potentially preserved/defaulted beverage fields if the form logic prepared them.
      ...entryData, 
      date: Timestamp.fromDate(entryData.date), // Convert JS Date to Firestore Timestamp for saving
      // Ensure sub-objects are initialized if they are part of entryData and potentially undefined/partial
      foodCostDetails: initializeCostDetailCategory(entryData.foodCostDetails),
      beverageCostDetails: initializeCostDetailCategory(entryData.beverageCostDetails), // This is key for new entries from food-only form
      updatedAt: serverTimestamp() as Timestamp,
      // Initialize calculated fields if not present, or carry them over if this was an update
      // These will be recalculated based on the new data if a calculation step is added later.
      // For now, they are just preserved or set to 0.
      calculatedNetFoodCost: existingDocSnap.data()?.calculatedNetFoodCost || 0,
      calculatedActualFoodCostPct: existingDocSnap.data()?.calculatedActualFoodCostPct || 0,
      calculatedFoodCostVariancePct: existingDocSnap.data()?.calculatedFoodCostVariancePct || 0,
      calculatedNetBeverageCost: existingDocSnap.data()?.calculatedNetBeverageCost || 0,
      calculatedActualBeverageCostPct: existingDocSnap.data()?.calculatedActualBeverageCostPct || 0,
      calculatedBeverageCostVariancePct: existingDocSnap.data()?.calculatedBeverageCostVariancePct || 0,
    };

    if (existingDocSnap.exists()) {
      // Update existing document, merging with existing data
      // setDoc with merge:true might be safer if entryData is truly partial.
      // However, if entryData is constructed to be the full intended state (as planned), direct setDoc is fine.
      await setDoc(entryDocRef, dataToSave, { merge: true }); 
    } else {
      // Create new document
      dataToSave.createdAt = serverTimestamp() as Timestamp;
      await setDoc(entryDocRef, dataToSave);
    }

    revalidatePath("/dashboard/food-cost"); // Updated path
    revalidatePath("/dashboard"); 
  } catch (error) {
    console.error("Error saving daily hotel entry: ", error);
    throw new Error(`Failed to save daily hotel entry: ${(error as Error).message}`);
  }
}

export async function getDailyHotelEntryAction(id: string): Promise<DailyHotelEntry | null> {
  if (!id) {
    throw new Error("Entry ID is required to fetch data.");
  }
  try {
    const entryDocRef = doc(db, "dailyHotelEntries", id);
    const docSnap = await getDoc(entryDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as Omit<DailyHotelEntry, 'id'>;
      // Convert Timestamps to JS Dates for client components
      return { 
        id: docSnap.id, 
        ...data,
        date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
        foodCostDetails: initializeCostDetailCategory(data.foodCostDetails),
        beverageCostDetails: initializeCostDetailCategory(data.beverageCostDetails),
      } as DailyHotelEntry;
    } else {
      return null; 
    }
  } catch (error) {
    console.error("Error fetching daily hotel entry: ", error);
    throw new Error(`Failed to fetch daily hotel entry: ${(error as Error).message}`);
  }
}

export async function deleteDailyHotelEntryAction(id: string): Promise<void> {
  if (!id) {
    throw new Error("Entry ID is required for deletion.");
  }
  try {
    const entryDocRef = doc(db, "dailyHotelEntries", id);
    await deleteDoc(entryDocRef);
    revalidatePath("/dashboard/food-cost"); // Updated path
    revalidatePath("/dashboard");
  } catch (error) {
    console.error("Error deleting daily hotel entry: ", error);
    throw new Error(`Failed to delete daily hotel entry: ${(error as Error).message}`);
  }
}

