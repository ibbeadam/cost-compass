
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, orderBy, Timestamp, query } from "firebase/firestore";
import { PlusCircle, Edit, Trash2, AlertTriangle, ListChecks, Utensils, GlassWater } from "lucide-react";

import { db } from "@/lib/firebase";
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
import { useToast } from "@/hooks/use-toast";
import { deleteCategoryAction } from "@/actions/categoryActions";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// Helper to convert Firestore Timestamps in a category to JS Dates
const convertTimestampsToDates = (category: Category): Category => {
  return {
    ...category,
    createdAt: category.createdAt && category.createdAt instanceof Timestamp ? category.createdAt.toDate() : category.createdAt,
    updatedAt: category.updatedAt && category.updatedAt instanceof Timestamp ? category.updatedAt.toDate() : category.updatedAt,
  };
};

export default function CategoryListClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, "categories"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedCategories = snapshot.docs.map(doc => {
        const data = doc.data() as Omit<Category, 'id'>;
        return convertTimestampsToDates({ id: doc.id, ...data });
      });
      setCategories(fetchedCategories);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching categories:", error);
      toast({
        variant: "destructive",
        title: "Error Fetching Categories",
        description: "Could not load categories from the database.",
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

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
  };
  
  const onFormCancel = () => {
    setIsFormOpen(false);
    setEditingCategory(null);
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-end mb-4">
          <Skeleton className="h-10 w-40 bg-muted" />
        </div>
        <div className="rounded-lg border overflow-hidden shadow-md bg-card">
          <Skeleton className="h-12 w-full bg-muted/50" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center p-4 border-b">
              <Skeleton className="h-6 w-1/3 bg-muted mr-4" /> {/* Name */}
              <Skeleton className="h-6 w-1/4 bg-muted mr-4" /> {/* Type */}
              <Skeleton className="h-6 w-1/3 bg-muted mr-4" /> {/* Description */}
              <Skeleton className="h-8 w-8 bg-muted mr-2" /> {/* Edit */}
              <Skeleton className="h-8 w-8 bg-muted" /> {/* Delete */}
            </div>
          ))}
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

      {categories.length === 0 ? (
         <div className="text-center py-10 text-muted-foreground bg-card border rounded-lg">
            <ListChecks className="mx-auto h-12 w-12 mb-4 text-primary" />
            <p className="text-lg font-medium">No categories found.</p>
            <p>Click "Add New Category" to get started.</p>
        </div>
      ) : (
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
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>
                    <Badge variant={category.type === 'Food' ? 'default' : 'secondary'} className="capitalize">
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
