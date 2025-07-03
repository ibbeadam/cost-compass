"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
    const category = await prisma.category.create({
      data: categoryData,
    });

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
    const category = await prisma.category.update({
      where: { id: Number(id) },
      data: categoryData,
    });

    revalidatePath("/dashboard/categories");
    return category;
  } catch (error) {
    console.error("Error updating category:", error);
    throw new Error("Failed to update category");
  }
}

export async function deleteCategoryAction(id: number) {
  try {
    await prisma.category.delete({
      where: { id: Number(id) },
    });

    revalidatePath("/dashboard/categories");
    return { success: true };
  } catch (error) {
    console.error("Error deleting category:", error);
    throw new Error("Failed to delete category");
  }
}