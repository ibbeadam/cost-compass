
"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, Unsubscribe, Timestamp } from "firebase/firestore";
import { PlusCircle, Edit, Trash2, AlertTriangle, Building, ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/firebase";
import type { Outlet } from "@/types";
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
import { OutletForm } from "./OutletForm";
import { useToast } from "@/hooks/use-toast";
import { deleteOutletAction } from "@/actions/outletActions";
import { Skeleton } from "@/components/ui/skeleton";

const ITEMS_PER_PAGE = 5; 

export default function OutletListClient() {
  const [allOutlets, setAllOutlets] = useState<Outlet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOutlets, setTotalOutlets] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe: Unsubscribe = onSnapshot(collection(db, "outlets"), (snapshot) => {
      const fetchedOutlets = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
          isActive: data.isActive ?? true,
          address: data.address ?? '',
          phoneNumber: data.phoneNumber ?? '',
          email: data.email ?? '',
          type: data.type ?? 'Restaurant',
          currency: data.currency ?? 'USD',
          timezone: data.timezone ?? 'UTC',
          defaultBudgetFoodCostPct: data.defaultBudgetFoodCostPct ?? 0,
          defaultBudgetBeverageCostPct: data.defaultBudgetBeverageCostPct ?? 0,
          targetOccupancy: data.targetOccupancy ?? 0,
        } as Outlet;
      }).sort((a, b) => a.name.localeCompare(b.name));

      setAllOutlets(fetchedOutlets);
      setTotalOutlets(fetchedOutlets.length);
      setCurrentPage(1); 
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching outlets:", error);
      toast({
        variant: "destructive",
        title: "Error fetching outlets",
        description: "Could not load outlets from the database.",
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleAddNew = () => {
    setEditingOutlet(null);
    setIsFormOpen(true);
  };

  const handleEdit = (outlet: Outlet) => {
    setEditingOutlet(outlet);
    setIsFormOpen(true);
  };

  const handleDelete = async (outletId: string) => {
    try {
      await deleteOutletAction(outletId);
      toast({
        title: "Outlet Deleted",
        description: "The outlet has been successfully deleted.",
      });
      // The onSnapshot listener will automatically update the list
    } catch (error) {
      console.error("Error deleting outlet:", error);
      toast({
        variant: "destructive",
        title: "Error Deleting Outlet",
        description: (error as Error).message || "Could not delete the outlet.",
      });
    }
  };

  const onFormSuccess = () => {
    setIsFormOpen(false);
    // The onSnapshot listener will automatically update the list
  };
  
  const onFormCancel = () => {
    setIsFormOpen(false);
    setEditingOutlet(null);
  };

  const totalPages = Math.max(1, Math.ceil(totalOutlets / ITEMS_PER_PAGE));
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return allOutlets.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [allOutlets, currentPage]);

  const startIndexDisplay = totalOutlets > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const endIndexDisplay = totalOutlets > 0 ? Math.min(currentPage * ITEMS_PER_PAGE, totalOutlets) : 0;


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
        <div className="flex justify-end mb-4"> <Skeleton className="h-10 w-32 bg-muted" /> </div>
        <div className="rounded-lg border overflow-hidden shadow-md bg-card">
          <Skeleton className="h-12 w-full bg-muted/50" />
          {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
            <div key={i} className="flex items-center p-4 border-b">
              <Skeleton className="h-6 flex-grow bg-muted mr-4" />
              <Skeleton className="h-6 w-24 bg-muted mr-4" />
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
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Outlet
        </Button>
      </div>

      {allOutlets.length === 0 ? (
         <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border">
            <Building className="mx-auto h-12 w-12 mb-4 text-primary" />
            <p className="text-lg font-medium">No outlets found.</p>
            <p>Click "Add New Outlet" to get started.</p>
        </div>
      ) : (
        <>
        <div className="rounded-lg border overflow-hidden shadow-md bg-card">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-headline">Outlet Name</TableHead>
                <TableHead className="font-headline">Outlet ID</TableHead>
                <TableHead className="font-headline w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.map((outlet) => (
                <TableRow key={outlet.id}>
                  <TableCell>{outlet.name}</TableCell>
                  <TableCell className="font-code">{outlet.id}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(outlet)} className="mr-2 hover:text-primary">
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit Outlet</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete Outlet</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center">
                            <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
                            Are you sure?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the outlet
                            "{outlet.name}" (ID: {outlet.id}) and all associated data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(outlet.id)}
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
              Showing {startIndexDisplay} to {endIndexDisplay} of {totalOutlets} results
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

      <Dialog open={isFormOpen} onOpenChange={(open) => {if (!open) { setEditingOutlet(null); } setIsFormOpen(open);}}>
        <DialogContent className="sm:max-w-[425px] bg-card">
          <DialogHeader>
            <DialogTitle className="font-headline">{editingOutlet ? "Edit Outlet" : "Add New Outlet"}</DialogTitle>
            <DialogDescription>
              {editingOutlet ? "Update the details for this outlet." : "Enter the details for the new outlet."}
            </DialogDescription>
          </DialogHeader>
          <OutletForm
            key={editingOutlet ? editingOutlet.id : 'new-outlet'}
            outlet={editingOutlet}
            onSuccess={onFormSuccess}
            onCancel={onFormCancel}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

    