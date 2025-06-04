
"use server";

import { collection, doc, updateDoc, deleteDoc, serverTimestamp, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { revalidatePath } from "next/cache";
import type { Outlet } from "@/types"; 

const outletsCol = collection(db, "outlets");

export async function addOutletAction(id: string, name: string): Promise<Outlet> {
  const trimmedId = id.trim();
  const trimmedName = name.trim();

  if (!trimmedId) {
    throw new Error("Outlet ID cannot be empty.");
  }
  if (!trimmedName) {
    throw new Error("Outlet name cannot be empty.");
  }
  
  const idRegex = /^[a-zA-Z0-9-_]+$/;
  if (!idRegex.test(trimmedId)) {
    throw new Error("Outlet ID can only contain letters, numbers, hyphens, and underscores (no spaces).");
  }

  try {
    const outletDocRef = doc(db, "outlets", trimmedId);
    const docSnap = await getDoc(outletDocRef);

    if (docSnap.exists()) {
      throw new Error(`Outlet with ID "${trimmedId}" already exists. Please use a unique ID.`);
    }

    const outletData = {
      name: trimmedName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(outletDocRef, outletData);

    revalidatePath("/dashboard/outlets");
    revalidatePath("/dashboard"); 
    
    const newDocSnap = await getDoc(outletDocRef);
    if (!newDocSnap.exists()) {
        throw new Error("Failed to create and retrieve outlet after saving.");
    }
    const savedData = newDocSnap.data()!; // Assert savedData is not undefined
    
    // Convert Timestamps to Dates before returning to client
    const returnOutlet: Outlet = {
        id: newDocSnap.id,
        name: savedData.name,
        createdAt: savedData.createdAt instanceof Timestamp ? savedData.createdAt.toDate() : savedData.createdAt,
        updatedAt: savedData.updatedAt instanceof Timestamp ? savedData.updatedAt.toDate() : savedData.updatedAt,
        isActive: savedData.isActive,
        address: savedData.address,
        phoneNumber: savedData.phoneNumber,
        email: savedData.email,
        type: savedData.type,
        currency: savedData.currency,
        timezone: savedData.timezone,
        defaultBudgetFoodCostPct: savedData.defaultBudgetFoodCostPct,
        defaultBudgetBeverageCostPct: savedData.defaultBudgetBeverageCostPct,
        targetOccupancy: savedData.targetOccupancy,
    };
    return returnOutlet;

  } catch (error)
 {
    console.error("Error adding outlet: ", error);
    if (error instanceof Error && error.message.includes("already exists")) {
        throw error;
    }
    throw new Error(`Failed to add outlet: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function updateOutletAction(id: string, name: string): Promise<void> {
  if (!id) {
    throw new Error("Outlet ID is required for update.");
  }
  if (!name.trim()) {
    throw new Error("Outlet name cannot be empty.");
  }
  try {
    const outletDoc = doc(db, "outlets", id);
    await updateDoc(outletDoc, {
      name: name.trim(),
      updatedAt: serverTimestamp(),
    });
    revalidatePath("/dashboard/outlets");
    revalidatePath("/dashboard");
  } catch (error) {
    console.error("Error updating outlet: ", error);
    throw new Error(`Failed to update outlet: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function deleteOutletAction(id: string): Promise<void> {
  if (!id) {
    throw new Error("Outlet ID is required for deletion.");
  }
  try {
    const outletDoc = doc(db, "outlets", id);
    await deleteDoc(outletDoc);
    revalidatePath("/dashboard/outlets");
    revalidatePath("/dashboard");
  } catch (error)
  {
    console.error("Error deleting outlet: ", error);
    throw new Error(`Failed to delete outlet: ${error instanceof Error ? error.message : String(error)}`);
  }
}
