"use server";

import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, getDoc, Timestamp, query, orderBy, limit, startAfter, getDocs, QueryConstraint, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { revalidatePath } from "next/cache";
import type { Category } from "@/types";

const categoriesCol = collection(db!, "categories");

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
    revalidatePath("/dashboard/settings/categories"); // Keep old path for now, or update if component moves
    revalidatePath("/dashboard/categories");


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
    const categoryDoc = doc(db!, "categories", id);
    await updateDoc(categoryDoc, {
      name: trimmedName,
      description: trimmedDescription,
      type,
      updatedAt: serverTimestamp(),
    });
    revalidatePath("/dashboard/settings/categories"); // Keep old path for now
    revalidatePath("/dashboard/categories");
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
    const categoryDoc = doc(db!, "categories", id);
    await deleteDoc(categoryDoc);
    revalidatePath("/dashboard/settings/categories"); // Keep old path for now
    revalidatePath("/dashboard/categories");
  } catch (error) {
    console.error("Error deleting category: ", error);
    throw new Error(`Failed to delete category: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getCategoryByIdAction(id: string): Promise<Category | null> {
  if (!id) {
    throw new Error("Category ID is required.");
  }
  try {
    const categoryDoc = doc(db!, "categories", id);
    const categorySnap = await getDoc(categoryDoc);
    
    if (categorySnap.exists()) {
      const data = categorySnap.data();
      return {
        id: categorySnap.id,
        name: data.name,
        description: data.description,
        type: data.type,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
      } as Category;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting category by ID: ", error);
    throw new Error(`Failed to get category: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getPaginatedCategoriesAction(
  limitValue?: number, // Make limitValue optional
  lastVisibleDocId?: string,
  fetchAll: boolean = false // New parameter
): Promise<{ categories: Category[], lastVisibleDocId: string | null, hasMore: boolean, totalCount: number }> {
  try {
    const queryConstraints: QueryConstraint[] = [orderBy("createdAt", "desc")];

    if (!fetchAll && limitValue && limitValue > 0) {
      queryConstraints.push(limit(limitValue));
      if (lastVisibleDocId) {
        const lastVisibleDoc = await getDoc(doc(db!, "categories", lastVisibleDocId));
        if (lastVisibleDoc.exists()) {
          queryConstraints.push(startAfter(lastVisibleDoc));
        } else {
          console.warn(`Last visible document with ID ${lastVisibleDocId} not found. Starting from the beginning.`);
        }
      }
    }
    // If fetchAll is true, no limit or startAfter is applied, fetching all documents.

    const categoryQuery = query(categoriesCol, ...queryConstraints);
    
    const totalCountQuery = query(categoriesCol);
    const totalSnapshot = await getDocs(totalCountQuery);
    const totalCount = totalSnapshot.size;

    const querySnapshot = await getDocs(categoryQuery);
    const categories: Category[] = querySnapshot.docs.map(doc => {
      const data = doc.data() as Omit<Category, 'id'>;
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt as any),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt as any),
      } as Category;
    });

    let lastVisibleDocIdResult: string | null = null;
    let hasMoreResult = false;

    if (querySnapshot.docs.length > 0) {
      const lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      lastVisibleDocIdResult = lastVisibleDoc.id;
      hasMoreResult = querySnapshot.docs.length === limitValue;
    }

    return {
      categories,
      lastVisibleDocId: lastVisibleDocIdResult,
      hasMore: hasMoreResult,
      totalCount
    };
  } catch (error) {
    console.error("Error getting paginated categories: ", error);
    throw new Error(`Failed to get categories: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function initializeDefaultCategoriesAction(): Promise<{ created: number, total: number }> {
  try {
    if (!db) {
      throw new Error("Firestore is not initialized");
    }

    const foodCategories = [
      { name: "Meat & Poultry", description: "Beef, chicken, pork, lamb, etc.", type: "Food" as const },
      { name: "Seafood", description: "Fish, shrimp, shellfish, etc.", type: "Food" as const },
      { name: "Vegetables", description: "Fresh and frozen vegetables", type: "Food" as const },
      { name: "Fruits", description: "Fresh and frozen fruits", type: "Food" as const },
      { name: "Dairy & Eggs", description: "Milk, cheese, eggs, yogurt, etc.", type: "Food" as const },
      { name: "Grains & Bread", description: "Rice, pasta, bread, flour, etc.", type: "Food" as const },
      { name: "Herbs & Spices", description: "Fresh herbs, dried spices, seasonings", type: "Food" as const },
      { name: "Oils & Fats", description: "Cooking oils, butter, margarine", type: "Food" as const },
      { name: "Canned Goods", description: "Canned vegetables, fruits, beans", type: "Food" as const },
      { name: "Frozen Foods", description: "Frozen meals, vegetables, meats", type: "Food" as const },
      { name: "Condiments", description: "Sauces, dressings, spreads", type: "Food" as const },
      { name: "Bakery", description: "Pastries, cakes, desserts", type: "Food" as const }
    ];

    const beverageCategories = [
      { name: "Soft Drinks", description: "Cola, lemonade, fruit juices", type: "Beverage" as const },
      { name: "Coffee & Tea", description: "Coffee beans, tea leaves, instant coffee", type: "Beverage" as const },
      { name: "Alcoholic Beverages", description: "Beer, wine, spirits", type: "Beverage" as const },
      { name: "Dairy Drinks", description: "Milk, milkshakes, smoothies", type: "Beverage" as const },
      { name: "Energy Drinks", description: "Sports drinks, energy beverages", type: "Beverage" as const },
      { name: "Water", description: "Bottled water, sparkling water", type: "Beverage" as const },
      { name: "Syrups & Mixers", description: "Cocktail mixers, flavored syrups", type: "Beverage" as const }
    ];

    let createdCount = 0;
    const allCategories = [...foodCategories, ...beverageCategories];

    for (const category of allCategories) {
      try {
        // Check if category already exists
        const existingQuery = query(
          categoriesCol,
          where("name", "==", category.name),
          where("type", "==", category.type)
        );
        const existingSnapshot = await getDocs(existingQuery);
        
        if (existingSnapshot.empty) {
          await addDoc(categoriesCol, {
            ...category,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          createdCount++;
        }
      } catch (error) {
        console.error(`Failed to create ${category.name}:`, error);
      }
    }

    // Get total count
    const totalSnapshot = await getDocs(categoriesCol);
    const totalCount = totalSnapshot.size;

    revalidatePath("/dashboard/categories");
    
    return { created: createdCount, total: totalCount };
  } catch (error) {
    console.error("Error initializing default categories:", error);
    throw new Error(`Failed to initialize default categories: ${error instanceof Error ? error.message : String(error)}`);
  }
}
