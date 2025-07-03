"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { Category } from "@/types";
import { getCurrentUser } from "@/lib/server-auth";
import { auditDataChange } from "@/lib/audit-middleware";

export async function getAllCategoriesAction() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        name: "asc",
      },
    });
    return categories;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw new Error("Failed to fetch categories");
  }
}

export async function getCategoriesByTypeAction(type: "Food" | "Beverage") {
  try {
    const categories = await prisma.category.findMany({
      where: { type },
      orderBy: {
        name: "asc",
      },
    });
    return categories;
  } catch (error) {
    console.error("Error fetching categories by type:", error);
    throw new Error("Failed to fetch categories");
  }
}

export async function getCategoryByIdAction(id: string) {
  try {
    const category = await prisma.category.findUnique({
      where: { id },
    });
    return category;
  } catch (error) {
    console.error("Error fetching category:", error);
    throw new Error("Failed to fetch category");
  }
}

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
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    const category = await prisma.category.create({
      data: {
        name: trimmedName,
        description: trimmedDescription || null,
        type,
      },
    });

    // Create audit log
    await auditDataChange(
      user.id,
      "CREATE",
      "category",
      category.id,
      undefined,
      category
    );

    revalidatePath("/dashboard/settings/categories");
    revalidatePath("/dashboard/categories");
    return category as Category;
  } catch (error) {
    console.error("Error adding category:", error);
    throw new Error(`Failed to add category: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function createCategoryAction(categoryData: {
  name: string;
  description?: string;
  type: "Food" | "Beverage";
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    const category = await prisma.category.create({
      data: categoryData,
    });

    // Create audit log
    await auditDataChange(
      user.id,
      "CREATE",
      "category",
      category.id,
      undefined,
      category
    );

    revalidatePath("/dashboard/categories");
    return category;
  } catch (error) {
    console.error("Error creating category:", error);
    throw new Error("Failed to create category");
  }
}

export async function updateCategoryAction(
  id: string,
  name?: string,
  description?: string,
  type?: 'Food' | 'Beverage'
): Promise<void> {
  if (!id) {
    throw new Error("Category ID is required for update.");
  }

  const updateData: any = {};
  
  if (name !== undefined) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("Category name cannot be empty.");
    }
    updateData.name = trimmedName;
  }
  
  if (description !== undefined) {
    updateData.description = description?.trim() || null;
  }
  
  if (type !== undefined) {
    if (!type) {
      throw new Error("Category type must be selected.");
    }
    updateData.type = type;
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    // Get current category for audit logging
    const currentCategory = await prisma.category.findUnique({
      where: { id }
    });

    if (!currentCategory) {
      throw new Error("Category not found");
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    // Create audit log
    await auditDataChange(
      user.id,
      "UPDATE",
      "category",
      id,
      currentCategory,
      updatedCategory
    );

    revalidatePath("/dashboard/settings/categories");
    revalidatePath("/dashboard/categories");
  } catch (error) {
    console.error("Error updating category:", error);
    throw new Error(`Failed to update category: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function deleteCategoryAction(id: string): Promise<void> {
  if (!id) {
    throw new Error("Category ID is required for deletion.");
  }
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    // Get current category for audit logging
    const categoryToDelete = await prisma.category.findUnique({
      where: { id }
    });

    if (!categoryToDelete) {
      throw new Error("Category not found");
    }

    await prisma.category.delete({
      where: { id },
    });

    // Create audit log
    await auditDataChange(
      user.id,
      "DELETE",
      "category",
      id,
      categoryToDelete,
      undefined
    );

    revalidatePath("/dashboard/settings/categories");
    revalidatePath("/dashboard/categories");
  } catch (error) {
    console.error("Error deleting category:", error);
    throw new Error(`Failed to delete category: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getPaginatedCategoriesAction(
  limitValue?: number,
  lastVisibleDocId?: string,
  fetchAll: boolean = false
): Promise<{ categories: Category[], lastVisibleDocId: string | null, hasMore: boolean, totalCount: number }> {
  try {
    const totalCount = await prisma.category.count();
    
    let categories;
    
    if (fetchAll || !limitValue) {
      categories = await prisma.category.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });
    } else {
      const skip = lastVisibleDocId ? 1 : 0; // Skip the cursor if provided
      categories = await prisma.category.findMany({
        take: limitValue,
        skip,
        ...(lastVisibleDocId && {
          cursor: {
            id: lastVisibleDocId,
          },
        }),
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    const hasMore = !fetchAll && limitValue ? categories.length === limitValue : false;
    const lastVisibleDocIdResult = categories.length > 0 ? categories[categories.length - 1].id : null;

    return {
      categories: categories as Category[],
      lastVisibleDocId: lastVisibleDocIdResult,
      hasMore,
      totalCount
    };
  } catch (error) {
    console.error("Error getting paginated categories:", error);
    throw new Error(`Failed to get categories: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function initializeDefaultCategoriesAction(): Promise<{ created: number, total: number }> {
  try {
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
        const existing = await prisma.category.findFirst({
          where: {
            name: category.name,
            type: category.type,
          },
        });
        
        if (!existing) {
          await prisma.category.create({
            data: category,
          });
          createdCount++;
        }
      } catch (error) {
        console.error(`Failed to create ${category.name}:`, error);
      }
    }

    // Get total count
    const totalCount = await prisma.category.count();

    revalidatePath("/dashboard/categories");
    
    return { created: createdCount, total: totalCount };
  } catch (error) {
    console.error("Error initializing default categories:", error);
    throw new Error(`Failed to initialize default categories: ${error instanceof Error ? error.message : String(error)}`);
  }
}