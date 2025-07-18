"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  PlusCircle,
  Edit,
  Trash2,
  AlertTriangle,
  ListChecks,
  Utensils,
  GlassWater,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

import type { Category } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CategoryForm } from "./CategoryForm";
import {
  getAllCategoriesAction,
  createCategoryAction,
} from "@/actions/prismaCategoryActions";
import { showToast } from "@/lib/toast";
import { deleteCategoryAction } from "@/actions/prismaCategoryActions";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RecordsPerPageSelector } from "@/components/ui/records-per-page-selector";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";

// No longer needed since Prisma returns Date objects directly

export default function CategoryListClient() {
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCategories, setTotalCategories] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const { hasPermission } = usePermissions();

  const fetchAllCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedCategories = await getAllCategoriesAction();
      setAllCategories(fetchedCategories);
      setTotalCategories(fetchedCategories.length);
      setCurrentPage(1); // Reset to first page
    } catch (error) {
      console.error("Error fetching all categories:", error);
      showToast.error("Could not load categories from the database.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInitializeDefaultCategories = async () => {
    setIsInitializing(true);
    try {
      // Create default categories manually for Prisma
      const defaultCategories = [
        { name: "Meat", type: "Food" as const },
        { name: "Vegetables", type: "Food" as const },
        { name: "Dairy", type: "Food" as const },
        { name: "Beer", type: "Beverage" as const },
        { name: "Wine", type: "Beverage" as const },
        { name: "Spirits", type: "Beverage" as const },
      ];
      
      for (const category of defaultCategories) {
        try {
          await createCategoryAction(category);
        } catch (error) {
          // Category might already exist, continue
        }
      }
      
      showToast.success("Successfully initialized default categories");
      await fetchAllCategories(); // Refresh the list
    } catch (error) {
      console.error("Error initializing categories:", error);
      showToast.error((error as Error).message || "Could not initialize default categories.");
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    fetchAllCategories();
  }, [fetchAllCategories]);

  const handleAddNew = () => {
    setEditingCategory(null);
    setIsFormOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleDelete = async (categoryId: string) => {
    try {
      await deleteCategoryAction(categoryId);
      showToast.success("The category has been successfully deleted.");
      fetchAllCategories(); // Re-fetch all categories to update the list
    } catch (error) {
      console.error("Error deleting category:", error);
      showToast.error((error as Error).message || "Could not delete the category.");
    }
  };

  const onFormSuccess = () => {
    setIsFormOpen(false);
    setEditingCategory(null);
    fetchAllCategories(); // Re-fetch all categories after success
  };

  const onFormCancel = () => {
    setIsFormOpen(false);
    setEditingCategory(null);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const totalPages = Math.max(1, Math.ceil(totalCategories / itemsPerPage));
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return allCategories.slice(startIndex, startIndex + itemsPerPage);
  }, [allCategories, currentPage, itemsPerPage]);

  const startIndexDisplay =
    totalCategories > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndexDisplay =
    totalCategories > 0
      ? Math.min(currentPage * itemsPerPage, totalCategories)
      : 0;

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    let startPage, endPage;

    if (totalPages <= maxPagesToShow) {
      startPage = 1;
      endPage = totalPages;
    } else {
      if (currentPage <= Math.ceil(maxPagesToShow / 2)) {
        startPage = 1;
        endPage = maxPagesToShow;
      } else if (currentPage + Math.floor(maxPagesToShow / 2) >= totalPages) {
        startPage = totalPages - maxPagesToShow + 1;
        endPage = totalPages;
      } else {
        startPage = currentPage - Math.floor(maxPagesToShow / 2);
        endPage = currentPage + Math.floor(maxPagesToShow / 2);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <Button
          key={i}
          variant={currentPage === i ? "default" : "outline"}
          size="icon"
          className="h-9 w-9"
          onClick={() => setCurrentPage(i)}
          disabled={isLoading}
        >
          {i}
        </Button>
      );
    }
    return pageNumbers;
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-end mb-4">
          {" "}
          <Skeleton className="h-10 w-40 bg-muted" />{" "}
        </div>
        <div className="rounded-lg border overflow-hidden shadow-md bg-card">
          <Skeleton className="h-12 w-full bg-muted/50" />
          {[...Array(itemsPerPage)].map((_, i) => (
            <div key={i} className="flex items-center p-4 border-b">
              <Skeleton className="h-6 w-1/3 bg-muted mr-4" />
              <Skeleton className="h-6 w-1/4 bg-muted mr-4" />
              <Skeleton className="h-6 w-1/3 bg-muted mr-4" />
              <Skeleton className="h-8 w-8 bg-muted mr-2" />
              <Skeleton className="h-8 w-8 bg-muted" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4 px-2">
          <Skeleton className="h-6 w-1/3 bg-muted" />
          <div className="flex items-center space-x-1">
            <Skeleton className="h-9 w-9 bg-muted rounded-md" />
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-9 w-9 bg-muted rounded-md" />
            ))}
            <Skeleton className="h-9 w-9 bg-muted rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold font-headline">Categories</h2>
          <p className="text-muted-foreground">
            Manage food and beverage categories for cost tracking
          </p>
        </div>
        <div className="flex gap-2">
          <PermissionGate permissions={["categories.create"]}>
            {allCategories.length === 0 && (
              <Button
                onClick={handleInitializeDefaultCategories}
                disabled={isInitializing}
                variant="outline"
              >
                {isInitializing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <ListChecks className="mr-2 h-4 w-4" />
                    Initialize Default Categories
                  </>
                )}
              </Button>
            )}
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
            </Button>
          </PermissionGate>
        </div>
      </div>

      {allCategories.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border">
          <ListChecks className="mx-auto h-12 w-12 mb-4 text-primary" />
          <p className="text-lg font-medium">No categories found.</p>
          <p className="mb-4">
            Click "Initialize Default Categories" to get started with
            pre-defined categories, or "Add New Category" to create your own.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border overflow-hidden shadow-md bg-card">
            <Table className="whitespace-nowrap">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-headline">Name</TableHead>
                  <TableHead className="font-headline">Type</TableHead>
                  <TableHead className="font-headline">Description</TableHead>
                  <TableHead className="font-headline w-[120px] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      {category.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          category.type === "Food" ? "default" : "secondary"
                        }
                        className="capitalize bg-primary/10 text-primary border-primary/20"
                      >
                        {category.type === "Food" ? (
                          <Utensils className="mr-1.5 h-3.5 w-3.5" />
                        ) : (
                          <GlassWater className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        {category.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm truncate max-w-xs">
                      {category.description || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <PermissionGate permissions={["categories.update"]}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(category)}
                            className="hover:text-primary"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit Category</span>
                          </Button>
                        </PermissionGate>
                        <PermissionGate permissions={["categories.delete"]}>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete Category</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center">
                                  <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
                                  Are you sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will
                                  permanently delete the category "{category.name}".
                                  It might affect existing cost entries if this
                                  category is in use.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(category.id)}
                                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </PermissionGate>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4 px-2">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndexDisplay} to {endIndexDisplay} of{" "}
                {totalCategories} results
              </div>
              <RecordsPerPageSelector
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
                disabled={isLoading}
              />
            </div>
            {totalPages > 1 && (
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1 || isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous Page</span>
                </Button>
                {renderPageNumbers()}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages || isLoading}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next Page</span>
                </Button>
              </div>
            )}
          </div>
        </>
      )}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl">
              {editingCategory ? "Edit Category" : "Add New Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update the details for this category."
                : "Enter the details for the new category."}
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4">
            <CategoryForm
              key={editingCategory ? editingCategory.id : "new-category"}
              category={editingCategory}
              onSuccess={onFormSuccess}
              onCancel={onFormCancel}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
