
"use server";

import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { revalidatePath } from "next/cache";
import type { Outlet } from "@/types"; // Assuming Outlet type is defined

const outletsCol = collection(db, "outlets");

export async function addOutletAction(name: string): Promise<Outlet> {
  if (!name.trim()) {
    throw new Error("Outlet name cannot be empty.");
  }
  try {
    const docRef = await addDoc(outletsCol, {
      name: name.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    revalidatePath("/dashboard/outlets");
    revalidatePath("/dashboard"); // Also revalidate main dashboard as it lists outlets
    
    // Fetch the document to return it with the ID and timestamps
    const newDocSnap = await getDoc(docRef);
    if (!newDocSnap.exists()) {
        throw new Error("Failed to create and retrieve outlet.");
    }
    return { id: newDocSnap.id, ...newDocSnap.data() } as Outlet;

  } catch (error) {
    console.error("Error adding outlet: ", error);
    throw new Error(`Failed to add outlet: ${(error as Error).message}`);
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
    throw new Error(`Failed to update outlet: ${(error as Error).message}`);
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
    throw new Error(`Failed to delete outlet: ${(error as Error).message}`);
  }
}
