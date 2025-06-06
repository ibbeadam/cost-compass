
"use server";

import { doc, setDoc, getDoc, serverTimestamp, Timestamp, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { revalidatePath } from "next/cache";
import type { DailyFinancialSummary } from "@/types"; 
import { format } from "date-fns";

const collectionName = "dailyFinancialSummaries";

export async function saveDailyFinancialSummaryAction(
  summaryData: Partial<Omit<DailyFinancialSummary, 'id' | 'createdAt' | 'updatedAt'>> & { date: Date }
): Promise<void> {
  const entryId = format(summaryData.date, "yyyy-MM-dd");
  
  if (!entryId) {
    throw new Error("Date is required to create or update an entry ID.");
  }

  try {
    const entryDocRef = doc(db, collectionName, entryId);
    const existingDocSnap = await getDoc(entryDocRef);

    const dataToSave: Partial<DailyFinancialSummary> = {
      ...summaryData, // Spread incoming data
      date: Timestamp.fromDate(summaryData.date), // Ensure date is always a Timestamp
      updatedAt: serverTimestamp() as Timestamp,
    };

    // Initialize calculated fields to null or 0 if not provided,
    // these will be updated by other processes or when data is available.
    dataToSave.actual_food_cost = summaryData.actual_food_cost ?? existingDocSnap.data()?.actual_food_cost ?? null;
    dataToSave.actual_food_cost_pct = summaryData.actual_food_cost_pct ?? existingDocSnap.data()?.actual_food_cost_pct ?? null;
    dataToSave.food_variance_pct = summaryData.food_variance_pct ?? existingDocSnap.data()?.food_variance_pct ?? null;
    dataToSave.actual_beverage_cost = summaryData.actual_beverage_cost ?? existingDocSnap.data()?.actual_beverage_cost ?? null;
    dataToSave.actual_beverage_cost_pct = summaryData.actual_beverage_cost_pct ?? existingDocSnap.data()?.actual_beverage_cost_pct ?? null;
    dataToSave.beverage_variance_pct = summaryData.beverage_variance_pct ?? existingDocSnap.data()?.beverage_variance_pct ?? null;


    if (existingDocSnap.exists()) {
      // Update existing document, merge with existing data.
      await setDoc(entryDocRef, dataToSave, { merge: true });
    } else {
      // Create new document.
      dataToSave.createdAt = serverTimestamp() as Timestamp;
      // Ensure all potentially undefined fields from spec have defaults if not in summaryData
      const defaults: Partial<DailyFinancialSummary> = {
        food_revenue: 0,
        budget_food_cost_pct: 0,
        ent_food: 0,
        oc_food: 0,
        other_food_adjustment: 0,
        beverage_revenue: 0,
        budget_beverage_cost_pct: 0,
        ent_beverage: 0,
        oc_beverage: 0,
        other_beverage_adjustment: 0,
        notes: '',
        actual_food_cost: null,
        actual_food_cost_pct: null,
        food_variance_pct: null,
        actual_beverage_cost: null,
        actual_beverage_cost_pct: null,
        beverage_variance_pct: null,
      };
      await setDoc(entryDocRef, { ...defaults, ...dataToSave });
    }

    revalidatePath("/dashboard/financial-summary");
    revalidatePath("/dashboard"); 
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
    await deleteDoc(entryDocRef);
    revalidatePath("/dashboard/financial-summary");
    revalidatePath("/dashboard");
  } catch (error) {
    console.error("Error deleting daily financial summary: ", error);
    throw new Error(`Failed to delete daily financial summary: ${error instanceof Error ? error.message : String(error)}`);
  }
}
