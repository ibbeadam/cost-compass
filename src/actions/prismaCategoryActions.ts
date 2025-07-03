"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
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

export async function getCategoryByIdAction(id: number) {
  try {
    const category = await prisma.category.findUnique({
      where: { id: Number(id) },
    });
    return category;
  } catch (error) {
    console.error("Error fetching category:", error);
    throw new Error("Failed to fetch category");
  }
}

export async function createCategoryAction(categoryData: {
  name: string;
  description?: string;
  type: "Food" | "Beverage";
}) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Authentication required");
    }

    const category = await prisma.category.create({
      data: categoryData,
    });

    // Create audit log
    await auditDataChange(
      currentUser.id,
      "CREATE",
      "category",
      category.id,
      undefined,
      category,
      currentUser.propertyAccess?.[0]?.propertyId
    );

    revalidatePath("/dashboard/categories");
    return category;
  } catch (error) {
    console.error("Error creating category:", error);
    throw new Error("Failed to create category");
  }
}

export async function updateCategoryAction(
  id: number,
  categoryData: {
    name?: string;
    description?: string;
    type?: "Food" | "Beverage";
  }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Authentication required");
    }

    // Get the original category data for audit
    const originalCategory = await prisma.category.findUnique({
      where: { id: Number(id) },
    });

    if (!originalCategory) {
      throw new Error("Category not found");
    }

    const category = await prisma.category.update({
      where: { id: Number(id) },
      data: categoryData,
    });

    // Create audit log
    await auditDataChange(
      currentUser.id,
      "UPDATE",
      "category",
      category.id,
      originalCategory,
      category,
      currentUser.propertyAccess?.[0]?.propertyId
    );

    revalidatePath("/dashboard/categories");
    return category;
  } catch (error) {
    console.error("Error updating category:", error);
    throw new Error("Failed to update category");
  }
}

export async function deleteCategoryAction(id: number) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Authentication required");
    }

    // Get the category data before deletion for audit
    const categoryToDelete = await prisma.category.findUnique({
      where: { id: Number(id) },
    });

    if (!categoryToDelete) {
      throw new Error("Category not found");
    }

    await prisma.category.delete({
      where: { id: Number(id) },
    });

    // Create audit log
    await auditDataChange(
      currentUser.id,
      "DELETE",
      "category",
      id,
      categoryToDelete,
      undefined,
      currentUser.propertyAccess?.[0]?.propertyId
    );

    revalidatePath("/dashboard/categories");
    return { success: true };
  } catch (error) {
    console.error("Error deleting category:", error);
    throw new Error("Failed to delete category");
  }
}