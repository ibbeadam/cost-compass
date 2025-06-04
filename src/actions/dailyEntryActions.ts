
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
  // updatePayload contains only the fields the specific form wants to change.
  // 'date' is mandatory to identify/create the document.
  updatePayload: Partial<Omit<DailyHotelEntry, 'id' | 'createdAt' | 'updatedAt' | 'date'>> & { date: Date }
): Promise<void> {
  const entryId = format(updatePayload.date, "yyyy-MM-dd");
  
  if (!entryId) {
    throw new Error("Date is required to create an entry ID.");
  }

  try {
    const entryDocRef = doc(db, "dailyHotelEntries", entryId);
    const existingDocSnap = await getDoc(entryDocRef);

    // Base structure for data to be written, always including date and updatedAt
    let dataForFirestore: Partial<DailyHotelEntry> & { date: Timestamp; updatedAt: Timestamp } = {
      date: Timestamp.fromDate(updatePayload.date), // Ensure date is always a Timestamp
      updatedAt: serverTimestamp() as Timestamp,
    };

    // Merge updatePayload into dataForFirestore, effectively adding/overwriting fields from the form
    // We delete id, createdAt, updatedAt from updatePayload before spreading to avoid issues if they were passed
    const { id, createdAt, updatedAt, date, ...restOfPayload } = updatePayload;
    dataForFirestore = {
        ...dataForFirestore,
        ...restOfPayload,
    };


    // Explicitly handle foodCostDetails and beverageCostDetails
    // If they are part of the submission (e.g. from Food Cost Form), initialize/update them.
    // If not provided in updatePayload (e.g. from Hotel Daily Entry Form), this logic won't add them to dataForFirestore,
    // so for an update, merge:true will preserve existing values in Firestore.
    // For a new document, they will be initialized later.
    if ('foodCostDetails' in updatePayload && updatePayload.foodCostDetails !== undefined) {
      dataForFirestore.foodCostDetails = initializeCostDetailCategory(updatePayload.foodCostDetails);
    }
    if ('beverageCostDetails' in updatePayload && updatePayload.beverageCostDetails !== undefined) {
      dataForFirestore.beverageCostDetails = initializeCostDetailCategory(updatePayload.beverageCostDetails);
    }
    
    // Preserve or initialize calculated fields
    const existingData = existingDocSnap.data();
    const defaultCalcFields = {
      calculatedNetFoodCost: 0,
      calculatedActualFoodCostPct: 0,
      calculatedFoodCostVariancePct: 0,
      calculatedNetBeverageCost: 0,
      calculatedActualBeverageCostPct: 0,
      calculatedBeverageCostVariancePct: 0,
    };

    dataForFirestore.calculatedNetFoodCost = updatePayload.calculatedNetFoodCost ?? existingData?.calculatedNetFoodCost ?? defaultCalcFields.calculatedNetFoodCost;
    dataForFirestore.calculatedActualFoodCostPct = updatePayload.calculatedActualFoodCostPct ?? existingData?.calculatedActualFoodCostPct ?? defaultCalcFields.calculatedActualFoodCostPct;
    dataForFirestore.calculatedFoodCostVariancePct = updatePayload.calculatedFoodCostVariancePct ?? existingData?.calculatedFoodCostVariancePct ?? defaultCalcFields.calculatedFoodCostVariancePct;
    dataForFirestore.calculatedNetBeverageCost = updatePayload.calculatedNetBeverageCost ?? existingData?.calculatedNetBeverageCost ?? defaultCalcFields.calculatedNetBeverageCost;
    dataForFirestore.calculatedActualBeverageCostPct = updatePayload.calculatedActualBeverageCostPct ?? existingData?.calculatedActualBeverageCostPct ?? defaultCalcFields.calculatedActualBeverageCostPct;
    dataForFirestore.calculatedBeverageCostVariancePct = updatePayload.calculatedBeverageCostVariancePct ?? existingData?.calculatedBeverageCostVariancePct ?? defaultCalcFields.calculatedBeverageCostVariancePct;


    if (existingDocSnap.exists()) {
      // Updating existing document: merge the payload.
      await setDoc(entryDocRef, dataForFirestore, { merge: true });
    } else {
      // Creating new document: construct the full new document data.
      const newDocumentData: Omit<DailyHotelEntry, 'id'> = {
        date: Timestamp.fromDate(updatePayload.date),
        hotelNetSales: 0, // Default
        budgetHotelFoodCostPct: 0, // Default
        budgetHotelBeverageCostPct: 0, // Default
        foodCostDetails: initializeCostDetailCategory(), // Default
        beverageCostDetails: initializeCostDetailCategory(), // Default
        hotelNetFoodSales: 0, // Default
        entFood: 0, // Default
        ocFood: 0, // Default
        otherFoodCredit: 0, // Default
        hotelNetBeverageSales: 0, // Default
        entBeverage: 0, // Default
        ocBeverage: 0, // Default
        otherBeverageCredit: 0, // Default
        notes: '', // Default
        // Calculated fields defaults
        calculatedNetFoodCost: defaultCalcFields.calculatedNetFoodCost,
        calculatedActualFoodCostPct: defaultCalcFields.calculatedActualFoodCostPct,
        calculatedFoodCostVariancePct: defaultCalcFields.calculatedFoodCostVariancePct,
        calculatedNetBeverageCost: defaultCalcFields.calculatedNetBeverageCost,
        calculatedActualBeverageCostPct: defaultCalcFields.calculatedActualBeverageCostPct,
        calculatedBeverageCostVariancePct: defaultCalcFields.calculatedBeverageCostVariancePct,
        
        // Spread the actual payload from the form, which might override some defaults
        ...restOfPayload, 

        // Ensure critical fields are correctly typed and set for new doc
        updatedAt: serverTimestamp() as Timestamp,
        createdAt: serverTimestamp() as Timestamp,
      };

      // If form provided details, use them instead of default initialized ones (already handled by spread if present in restOfPayload)
       if ('foodCostDetails' in updatePayload && updatePayload.foodCostDetails !== undefined) {
        newDocumentData.foodCostDetails = initializeCostDetailCategory(updatePayload.foodCostDetails);
      }
      if ('beverageCostDetails' in updatePayload && updatePayload.beverageCostDetails !== undefined) {
        newDocumentData.beverageCostDetails = initializeCostDetailCategory(updatePayload.beverageCostDetails);
      }
      // Override defaults with calculated fields if they were somehow in updatePayload
      newDocumentData.calculatedNetFoodCost = updatePayload.calculatedNetFoodCost ?? newDocumentData.calculatedNetFoodCost;
      newDocumentData.calculatedActualFoodCostPct = updatePayload.calculatedActualFoodCostPct ?? newDocumentData.calculatedActualFoodCostPct;
      // ... and so on for other calculated fields in updatePayload

      await setDoc(entryDocRef, newDocumentData);
    }

    revalidatePath("/dashboard/hotel-daily-entry");
    revalidatePath("/dashboard/food-cost");
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
    revalidatePath("/dashboard/hotel-daily-entry");
    revalidatePath("/dashboard/food-cost"); 
    revalidatePath("/dashboard");
  } catch (error) {
    console.error("Error deleting daily hotel entry: ", error);
    throw new Error(`Failed to delete daily hotel entry: ${(error as Error).message}`);
  }
}
