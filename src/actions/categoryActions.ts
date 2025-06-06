
"use server";

import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { revalidatePath } from "next/cache";
import type { Category } from "@/types";

const categoriesCol = collection(db, "categories");

export async function addCategoryAction(
  name: string,
  description: string | undefined,
  type: 'Food' | 'Beverage'
): Promise<Category> {
  const trimmedName = name.trim();
  const trimmedDescription = description?.trim();

  if (!trimmedName) {
    throw new Error("Category name cannot be empty.");
  }
  if (!type) {
    throw new Error("Category type must be selected.");
  }

  try {
    const categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: Timestamp, updatedAt: Timestamp } = {
      name: trimmedName,
      description: trimmedDescription,
      type,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };

    const docRef = await addDoc(categoriesCol, categoryData);
    revalidatePath("/dashboard/settings/categories");

    const newDocSnap = await getDoc(docRef);
    if (!newDocSnap.exists()) {
        throw new Error("Failed to create and retrieve category after saving.");
    }
    const savedData = newDocSnap.data()!;
    
    return {
        id: newDocSnap.id,
        name: savedData.name,
        description: savedData.description,
        type: savedData.type,
        createdAt: savedData.createdAt instanceof Timestamp ? savedData.createdAt.toDate() : savedData.createdAt,
        updatedAt: savedData.updatedAt instanceof Timestamp ? savedData.updatedAt.toDate() : savedData.updatedAt,
    };

  } catch (error) {
    console.error("Error adding category: ", error);
    throw new Error(`Failed to add category: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function updateCategoryAction(
  id: string,
  name: string,
  description: string | undefined,
  type: 'Food' | 'Beverage'
): Promise<void> {
  if (!id) {
    throw new Error("Category ID is required for update.");
  }
  const trimmedName = name.trim();
  const trimmedDescription = description?.trim();

  if (!trimmedName) {
    throw new Error("Category name cannot be empty.");
  }
   if (!type) {
    throw new Error("Category type must be selected.");
  }

  try {
    const categoryDoc = doc(db, "categories", id);
    await updateDoc(categoryDoc, {
      name: trimmedName,
      description: trimmedDescription,
      type,
      updatedAt: serverTimestamp(),
    });
    revalidatePath("/dashboard/settings/categories");
  } catch (error) {
    console.error("Error updating category: ", error);
    throw new Error(`Failed to update category: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function deleteCategoryAction(id: string): Promise<void> {
  if (!id) {
    throw new Error("Category ID is required for deletion.");
  }
  try {
    const categoryDoc = doc(db, "categories", id);
    await deleteDoc(categoryDoc);
    revalidatePath("/dashboard/settings/categories");
  } catch (error) {
    console.error("Error deleting category: ", error);
    throw new Error(`Failed to delete category: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Optional: Action to get a single category if needed elsewhere, not strictly required for the list/form client.
export async function getCategoryAction(id: string): Promise<Category | null> {
  if (!id) {
    throw new Error("Category ID is required to fetch data.");
  }
  try {
    const categoryDocRef = doc(db, "categories", id);
    const docSnap = await getDoc(categoryDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as Omit<Category, 'id'>;
      return { 
        id: docSnap.id, 
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt as any),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt as any),
      } as Category;
    } else {
      return null; 
    }
  } catch (error) {
    console.error("Error fetching category: ", error);
    throw new Error(`Failed to fetch category: ${(error as Error).message}`);
  }
}
