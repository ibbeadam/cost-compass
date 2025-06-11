
"use server";

import { doc, setDoc, getDoc, serverTimestamp, Timestamp, deleteDoc, collection, query, orderBy, limit as firestoreLimit, startAfter, getDocs, QueryConstraint } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { revalidatePath } from "next/cache";
import type { DailyHotelEntry, CostDetailCategory } from "@/types"; 
import { format } from "date-fns";

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
  updatePayload: Partial<Omit<DailyHotelEntry, 'id' | 'createdAt' | 'updatedAt' | 'date'>> & { date: Date }
): Promise<void> {
  const entryId = format(updatePayload.date, "yyyy-MM-dd");
  
  if (!entryId) {
    throw new Error("Date is required to create an entry ID.");
  }

  try {
    const entryDocRef = doc(db, "dailyHotelEntries", entryId);
    const existingDocSnap = await getDoc(entryDocRef);

    let dataForFirestore: Partial<DailyHotelEntry> & { date: Timestamp; updatedAt: Timestamp } = {
      date: Timestamp.fromDate(updatePayload.date), 
      updatedAt: serverTimestamp() as Timestamp,
    };

    const { id, createdAt, updatedAt, date, ...restOfPayload } = updatePayload;
    dataForFirestore = {
        ...dataForFirestore,
        ...restOfPayload,
    };

    if ('foodCostDetails' in updatePayload && updatePayload.foodCostDetails !== undefined) {
      dataForFirestore.foodCostDetails = initializeCostDetailCategory(updatePayload.foodCostDetails);
    }
    if ('beverageCostDetails' in updatePayload && updatePayload.beverageCostDetails !== undefined) {
      dataForFirestore.beverageCostDetails = initializeCostDetailCategory(updatePayload.beverageCostDetails);
    }
    
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
      await setDoc(entryDocRef, dataForFirestore, { merge: true });
    } else {
      const newDocumentData: Omit<DailyHotelEntry, 'id'> = {
        date: Timestamp.fromDate(updatePayload.date),
        hotelNetSales: 0, 
        budgetHotelFoodCostPct: 0, 
        budgetHotelBeverageCostPct: 0, 
        foodCostDetails: initializeCostDetailCategory(), 
        beverageCostDetails: initializeCostDetailCategory(), 
        hotelNetFoodSales: 0, 
        entFood: 0, 
        ocFood: 0, 
        otherFoodCredit: 0, 
        hotelNetBeverageSales: 0, 
        entBeverage: 0, 
        ocBeverage: 0, 
        otherBeverageCredit: 0, 
        notes: '', 
        calculatedNetFoodCost: defaultCalcFields.calculatedNetFoodCost,
        calculatedActualFoodCostPct: defaultCalcFields.calculatedActualFoodCostPct,
        calculatedFoodCostVariancePct: defaultCalcFields.calculatedFoodCostVariancePct,
        calculatedNetBeverageCost: defaultCalcFields.calculatedNetBeverageCost,
        calculatedActualBeverageCostPct: defaultCalcFields.calculatedActualBeverageCostPct,
        calculatedBeverageCostVariancePct: defaultCalcFields.calculatedBeverageCostVariancePct,
        
        ...restOfPayload, 

        updatedAt: serverTimestamp() as Timestamp,
        createdAt: serverTimestamp() as Timestamp,
      };

       if ('foodCostDetails' in updatePayload && updatePayload.foodCostDetails !== undefined) {
        newDocumentData.foodCostDetails = initializeCostDetailCategory(updatePayload.foodCostDetails);
      }
      if ('beverageCostDetails' in updatePayload && updatePayload.beverageCostDetails !== undefined) {
        newDocumentData.beverageCostDetails = initializeCostDetailCategory(updatePayload.beverageCostDetails);
      }
      newDocumentData.calculatedNetFoodCost = updatePayload.calculatedNetFoodCost ?? newDocumentData.calculatedNetFoodCost;
      newDocumentData.calculatedActualFoodCostPct = updatePayload.calculatedActualFoodCostPct ?? newDocumentData.calculatedActualFoodCostPct;

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

export async function getPaginatedDailyEntriesAction(
  limitValue?: number,
  lastVisibleDocId?: string,
  fetchAll: boolean = false
): Promise<{ entries: DailyHotelEntry[]; lastVisibleDocId: string | null; totalCount: number; hasMore: boolean }> {
  try {
    const entriesCol = collection(db, "dailyHotelEntries");
    let entriesQuery;

    const totalCountQuery = query(entriesCol);
    const totalSnapshot = await getDocs(totalCountQuery);
    const totalCount = totalSnapshot.size;

    if (fetchAll) {
      entriesQuery = query(entriesCol, orderBy("date", "desc"));
    } else if (limitValue && limitValue > 0) {
      const queryConstraints: QueryConstraint[] = [orderBy("date", "desc"), firestoreLimit(limitValue)];
      if (lastVisibleDocId) {
        const lastVisibleDoc = await getDoc(doc(entriesCol, lastVisibleDocId));
        if (lastVisibleDoc.exists()) {
          queryConstraints.push(startAfter(lastVisibleDoc));
        }
      }
      entriesQuery = query(entriesCol, ...queryConstraints);
    } else {
      // Default if no limit and not fetching all
      entriesQuery = query(entriesCol, orderBy("date", "desc"), firestoreLimit(10)); // Default limit
    }

    const querySnapshot = await getDocs(entriesQuery);
    const entries = querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
        foodCostDetails: initializeCostDetailCategory(data.foodCostDetails),
        beverageCostDetails: initializeCostDetailCategory(data.beverageCostDetails),
      } as DailyHotelEntry;
    });

    let newLastVisibleDocId: string | null = null;
    let hasMoreResult = false;

    if (!fetchAll && limitValue && limitValue > 0) {
      newLastVisibleDocId = entries.length > 0 ? entries[entries.length - 1].id : null;
      if (entries.length === limitValue) {
        const nextQuery = query(entriesCol, orderBy("date", "desc"), startAfter(querySnapshot.docs[querySnapshot.docs.length -1]), firestoreLimit(1));
        const nextSnapshot = await getDocs(nextQuery);
        hasMoreResult = !nextSnapshot.empty;
      } else {
        hasMoreResult = false;
      }
    } else if (fetchAll) {
      newLastVisibleDocId = null;
      hasMoreResult = false;
    }
    
    return { entries, lastVisibleDocId: newLastVisibleDocId, totalCount, hasMore: hasMoreResult };

  } catch (error) {
    console.error("Error fetching paginated daily entries: ", error);
    throw new Error(`Failed to fetch paginated daily entries: ${(error as Error).message}`);
  }
}
