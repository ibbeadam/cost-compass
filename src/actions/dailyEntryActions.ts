
"use server";

import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from "firebase/firestore";
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
      ...entryData,
      date: Timestamp.fromDate(entryData.date), // Convert JS Date to Firestore Timestamp
      foodCostDetails: initializeCostDetailCategory(entryData.foodCostDetails),
      beverageCostDetails: initializeCostDetailCategory(entryData.beverageCostDetails),
      updatedAt: serverTimestamp() as Timestamp,
      // Initialize calculated fields if not present, or carry them over if this was an update
      calculatedNetFoodCost: existingDocSnap.data()?.calculatedNetFoodCost || 0,
      calculatedActualFoodCostPct: existingDocSnap.data()?.calculatedActualFoodCostPct || 0,
      calculatedFoodCostVariancePct: existingDocSnap.data()?.calculatedFoodCostVariancePct || 0,
      calculatedNetBeverageCost: existingDocSnap.data()?.calculatedNetBeverageCost || 0,
      calculatedActualBeverageCostPct: existingDocSnap.data()?.calculatedActualBeverageCostPct || 0,
      calculatedBeverageCostVariancePct: existingDocSnap.data()?.calculatedBeverageCostVariancePct || 0,
    };

    if (existingDocSnap.exists()) {
      // Update existing document
      await setDoc(entryDocRef, dataToSave, { merge: true });
    } else {
      // Create new document
      dataToSave.createdAt = serverTimestamp() as Timestamp;
      await setDoc(entryDocRef, dataToSave);
    }

    revalidatePath("/dashboard/daily-entry");
    // Consider revalidating other paths that might display this data, e.g., the main dashboard
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
      // Ensure cost details are fully initialized
      return { 
        id: docSnap.id, 
        ...data,
        foodCostDetails: initializeCostDetailCategory(data.foodCostDetails),
        beverageCostDetails: initializeCostDetailCategory(data.beverageCostDetails),
      } as DailyHotelEntry;
    } else {
      return null; // No entry found for this ID
    }
  } catch (error) {
    console.error("Error fetching daily hotel entry: ", error);
    throw new Error(`Failed to fetch daily hotel entry: ${(error as Error).message}`);
  }
}
