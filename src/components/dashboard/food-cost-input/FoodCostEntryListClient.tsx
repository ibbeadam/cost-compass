
"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, orderBy, query as firestoreQuery } from "firebase/firestore";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { format, isValid } from "date-fns";

import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import FoodCostInputForm from "./FoodCostInputForm";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { deleteFoodCostEntryAction } from "@/actions/foodCostActions";

// Import necessary types for FoodCostInputForm props (replace with actual imports)
import type { Outlet, Category, FoodCostEntry, FoodCostDetail } from "@/types";
import { getOutletsAction, getFoodCategoriesAction } from "@/actions/foodCostActions";

export default function FoodCostEntryListClient() {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isClient, setIsClient] = useState(false); // State to track if component is mounted on client
  const [foodCostEntries, setFoodCostEntries] = useState<(FoodCostEntry & { details: FoodCostDetail[] })[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [foodCategories, setFoodCategories] = useState<Category[]>([]); // Added missing state
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [isLoadingOutlets, setIsLoadingOutlets] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [editingEntry, setEditingEntry] = useState<(FoodCostEntry & { details: FoodCostDetail[] }) | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedOutletId, setSelectedOutletId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null); // State for error boundary

  useEffect(() => {
    setIsClient(true); // Set isClient to true after component mounts on client
  }, []);

  // Effect to fetch food cost entries
  useEffect(() => {
    setIsLoadingEntries(true);
    const q = firestoreQuery(collection(db, "foodCostEntries"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEntries = snapshot.docs.map(doc => {
        const data = doc.data() as Omit<FoodCostEntry, 'id'> & { details: FoodCostDetail[] };
        return { id: doc.id, ...data };
      });
      setFoodCostEntries(fetchedEntries);
      setIsLoadingEntries(false);
      
    }, (error) => {
      console.error("Error fetching food cost entries:", error);
      toast({
        variant: "destructive",
        title: "Error Fetching Entries",
        description: "Could not load food cost entries.",
      });
      setIsLoadingEntries(false);
      setError(error as Error); // Capture error for boundary
    });

    return () => unsubscribe();
  }, [toast]);

  // Effect to fetch outlets and food categories
  const fetchOutletsAndCategories = useCallback(async () => {
    try {
      setIsLoadingOutlets(true);
      setIsLoadingCategories(true);
      const outletsData = await getOutletsAction();
      const categoriesData = await getFoodCategoriesAction();
      setOutlets(outletsData);
      setFoodCategories(categoriesData);    
      setIsLoadingOutlets(false);
      setIsLoadingCategories(false);
    } catch (error) {
      console.error("Error fetching outlets or categories:", error);
      toast({
        variant: "destructive",
        title: "Error Loading Form Data",
        description: "Could not load required data for the form.",
      });
      setError(error as Error); // Capture error for boundary
      setIsLoadingOutlets(false);
      setIsLoadingCategories(false);

    } 
  }, [toast, setOutlets, setFoodCategories, setIsLoadingOutlets, setIsLoadingCategories, setError]);

  useEffect(() => {
    if (isClient) {
 fetchOutletsAndCategories();
    }
  }, [fetchOutletsAndCategories, isClient]);

  const handleAddNew = () => {
    setEditingEntry(null);
    setSelectedDate(new Date());
    setSelectedOutletId(outlets.length > 0 ? outlets[0]?.id : undefined);

    setIsFormOpen(true);
  };

  const onFormSuccess = () => {
    setIsFormOpen(false);
    // Potentially refresh list data here later
 };
  
  const handleDelete = async (entryId: string) => {
    try {
      await deleteFoodCostEntryAction(entryId);
      toast({ title: "Entry Deleted", description: "The food cost entry has been deleted." });
    } catch (error) {
      console.error("Error deleting food cost entry:", error);
      toast({
        variant: "destructive",
        title: "Error Deleting Entry", description: (error as Error).message || "Could not delete entry."
      });
    }
  };

  if (error) {
    return (
      <div className="text-center py-10 text-destructive-foreground bg-destructive/20 rounded-lg border border-destructive">
        <h3 className="mt-2 text-lg font-semibold">Error</h3>
        <p className="mt-1 text-sm text-destructive-foreground">An error occurred loading food cost entries: {error.message}</p>
      </div>
    );
  }

  if (!isClient) {
    return null; // Render nothing on the server until hydration
  }

  return (
    <>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold font-headline">Food Cost Entries</h2>
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Entry
        </Button>
      </div>

      {(isLoadingEntries || isLoadingOutlets || isLoadingCategories) ? (
        <div className="rounded-lg border overflow-hidden shadow-md bg-card p-4">
          <Skeleton className="h-8 w-3/4 mb-4 bg-muted/50" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex justify-between items-center p-4 border-b">
              <Skeleton className="h-6 w-1/4 bg-muted" />
              <Skeleton className="h-6 w-1/6 bg-muted" />
              <Skeleton className="h-8 w-16 bg-muted" />
            </div>
          ))}
        </div>
      ) : foodCostEntries.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border">
           <h3 className="mt-2 text-lg font-semibold">No Food Cost Entries</h3>
          <p className="mt-1 text-sm text-muted-foreground">Get started by creating a new food cost entry.</p>
        </div> 
      ) : (
        <div className="rounded-lg border overflow-hidden shadow-md bg-card">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Outlet</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {foodCostEntries && foodCostEntries.length > 0 ? (
                foodCostEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{format(new Date(entry.date as any), "PPP")}</TableCell>
                    <TableCell>{outlets.find(o => o.id === entry.outlet_id)?.name || 'Unknown Outlet'}</TableCell>
                    <TableCell className="text-right">${(entry.total_food_cost || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingEntry(entry); setIsFormOpen(true); }} className="mr-2"><Edit className="h-4 w-4" /></Button>
                       <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(entry.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                 <TableRow><TableCell colSpan={4} className="text-center">No entries found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingEntry ? "Edit Food Cost Entry" : "Add New Food Cost Entry"}</DialogTitle>
            <DialogDescription>
              {editingEntry ? `Update details for outlet: ${outlets.find(o => o.id === editingEntry.outlet_id)?.name || 'Unknown'} on ${format(new Date(editingEntry.date as any), "PPP")}` : "Enter the details for a new food cost entry."}
            </DialogDescription>
          </DialogHeader>
          {/* Render FoodCostInputForm only on client after hydration */}
          {isClient && (
            <FoodCostInputForm
                selectedDate={editingEntry ? new Date(editingEntry.date as any) : selectedDate || new Date()} 
                selectedOutletId={editingEntry?.outlet_id || selectedOutletId || (outlets.length > 0 ? outlets[0].id : "")} 
                foodCategories={foodCategories}
                existingEntry={editingEntry} 
                onSuccess={onFormSuccess}
              />
          )}
        </DialogContent>
      </Dialog>

    </>
 );
}
