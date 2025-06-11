
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Timestamp } from "firebase/firestore";
import { PlusCircle, Edit, Trash2, AlertTriangle, ListChecks, Utensils, GlassWater, ChevronLeft, ChevronRight } from "lucide-react";

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
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { CategoryForm } from "./CategoryForm";
import { getPaginatedCategoriesAction } from "@/actions/categoryActions";
import { useToast } from "@/hooks/use-toast";
import { deleteCategoryAction } from "@/actions/categoryActions";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const ITEMS_PER_PAGE = 5;

const convertTimestampsToDates = (category: Category): Category => {
  return {
    ...category,
    createdAt: category.createdAt && category.createdAt instanceof Timestamp ? category.createdAt.toDate() : category.createdAt,
    updatedAt: category.updatedAt && category.updatedAt instanceof Timestamp ? category.updatedAt.toDate() : category.updatedAt,
  };
};

export default function CategoryListClient() {
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCategories, setTotalCategories] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { toast } = useToast();
  
  const fetchAllCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      // Pass fetchAll = true to get all categories
      const { categories: fetchedCategories, totalCount } = await getPaginatedCategoriesAction(undefined, undefined, true);
      setAllCategories(fetchedCategories.map(convertTimestampsToDates));
      setTotalCategories(totalCount);
      setCurrentPage(1); // Reset to first page
    } catch (error) {
      console.error("Error fetching all categories:", error);
      toast({
        variant: "destructive",
        title: "Error Fetching Categories",
        description: "Could not load categories from the database.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

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
      toast({
        title: "Category Deleted",
        description: "The category has been successfully deleted.",
      });
      fetchAllCategories(); // Re-fetch all categories to update the list
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({
        variant: "destructive",
        title: "Error Deleting Category",
        description: (error as Error).message || "Could not delete the category.",
      });
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

  const totalPages = Math.max(1, Math.ceil(totalCategories / ITEMS_PER_PAGE));
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return allCategories.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [allCategories, currentPage]);

  const startIndexDisplay = totalCategories > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const endIndexDisplay = totalCategories > 0 ? Math.min(currentPage * ITEMS_PER_PAGE, totalCategories) : 0;

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
        <div className="flex justify-end mb-4"> <Skeleton className="h-10 w-40 bg-muted" /> </div>
        <div className="rounded-lg border overflow-hidden shadow-md bg-card">
          <Skeleton className="h-12 w-full bg-muted/50" />
          {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
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
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-9 w-9 bg-muted rounded-md" />)}
            <Skeleton className="h-9 w-9 bg-muted rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-end mb-4">
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
        </Button>
      </div>

      {allCategories.length === 0 ? (
         <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border">
            <ListChecks className="mx-auto h-12 w-12 mb-4 text-primary" />
            <p className="text-lg font-medium">No categories found.</p>
            <p>Click "Add New Category" to get started.</p>
        </div>
      ) : (
        <>
        <div className="rounded-lg border overflow-hidden shadow-md bg-card">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-headline">Name</TableHead>
                <TableHead className="font-headline">Type</TableHead>
                <TableHead className="font-headline">Description</TableHead>
                <TableHead className="font-headline w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>
                    <Badge variant={category.type === 'Food' ? 'default' : 'secondary'} className="capitalize bg-primary/10 text-primary border-primary/20">
                      {category.type === 'Food' ? 
                        <Utensils className="mr-1.5 h-3.5 w-3.5" /> : 
                        <GlassWater className="mr-1.5 h-3.5 w-3.5" />
                      }
                      {category.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm truncate max-w-xs">{category.description || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(category)} className="mr-2 hover:text-primary">
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit Category</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="hover:text-destructive">
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
                            This action cannot be undone. This will permanently delete the category "{category.name}". 
                            It might affect existing cost entries if this category is in use.
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
         {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 px-2">
                <div className="text-sm text-muted-foreground">
                Showing {startIndexDisplay} to {endIndexDisplay} of {totalCategories} results
                </div>
                <div className="flex items-center space-x-1">
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1 || isLoading}>
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Previous Page</span>
                </Button>
                {renderPageNumbers()}
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages || isLoading}>
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">Next Page</span>
                </Button>
                </div>
            </div>
        )}
        </>
      )}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl">
              {editingCategory ? "Edit Category" : "Add New Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory ? "Update the details for this category." : "Enter the details for the new category."}
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4">
             <CategoryForm
                key={editingCategory ? editingCategory.id : 'new-category'}
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
