
"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, orderBy, onSnapshot, Unsubscribe, Timestamp } from "firebase/firestore";
import { PlusCircle, Edit, Trash2, AlertTriangle, Building } from "lucide-react";
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
  DialogFooter,
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

export default function OutletListClient() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    // No need for q = orderBy("name") if sorting client-side after fetch.
    // onSnapshot will provide the collection.
    
    const unsubscribe = onSnapshot(collection(db, "outlets"), (snapshot) => {
      const fetchedOutlets = snapshot.docs.map(doc => {
        const data = doc.data();
        // Convert Timestamps to Dates for client-side usage
        // Ensure all fields from Outlet type are explicitly mapped
        const outletData: Outlet = {
          id: doc.id,
          name: data.name,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
          isActive: data.isActive,
          address: data.address,
          phoneNumber: data.phoneNumber,
          email: data.email,
          type: data.type,
          currency: data.currency,
          timezone: data.timezone,
          defaultBudgetFoodCostPct: data.defaultBudgetFoodCostPct,
          defaultBudgetBeverageCostPct: data.defaultBudgetBeverageCostPct,
          targetOccupancy: data.targetOccupancy,
        };
        return outletData;
      }).sort((a, b) => a.name.localeCompare(b.name)); // Sort by name client-side

      setOutlets(fetchedOutlets);
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
      // Realtime listener will update the list
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
    // Realtime listener will update the list, no manual refresh needed for outlets state
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-end mb-4">
          <Skeleton className="h-10 w-32 bg-muted" />
        </div>
        <div className="rounded-lg border overflow-hidden shadow-md bg-card">
          <Skeleton className="h-12 w-full bg-muted/50" /> {/* Header */}
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center p-4 border-b">
              <Skeleton className="h-6 flex-grow bg-muted mr-4" />
              <Skeleton className="h-8 w-8 bg-muted mr-2" />
              <Skeleton className="h-8 w-8 bg-muted" />
            </div>
          ))}
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

      {outlets.length === 0 ? (
         <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg">
            <Building className="mx-auto h-12 w-12 mb-4" />
            <p className="text-lg font-medium">No outlets found.</p>
            <p>Click "Add New Outlet" to get started.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden shadow-md bg-card">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-headline">Outlet Name</TableHead>
                <TableHead className="font-headline w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outlets.map((outlet) => (
                <TableRow key={outlet.id}>
                  <TableCell>{outlet.name}</TableCell>
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
                            "{outlet.name}" and all associated data (if any linked in the future).
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
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card">
          <DialogHeader>
            <DialogTitle className="font-headline">{editingOutlet ? "Edit Outlet" : "Add New Outlet"}</DialogTitle>
            <DialogDescription>
              {editingOutlet ? "Update the details for this outlet." : "Enter the details for the new outlet."}
            </DialogDescription>
          </DialogHeader>
          <OutletForm
            outlet={editingOutlet}
            onSuccess={onFormSuccess}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
