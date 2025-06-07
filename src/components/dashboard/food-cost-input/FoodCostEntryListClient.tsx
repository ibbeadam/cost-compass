
"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, orderBy, query as firestoreQuery, Timestamp } from "firebase/firestore";
import { PlusCircle, Edit, Trash2, AlertTriangle } from "lucide-react";
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
import { deleteFoodCostEntryAction, getFoodCostEntryWithDetailsAction, getOutletsAction, getFoodCategoriesAction } from "@/actions/foodCostActions";
import type { Outlet, Category, FoodCostEntry, FoodCostDetail } from "@/types";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function FoodCostEntryListClient() {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const [foodCostEntries, setFoodCostEntries] = useState<FoodCostEntry[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [foodCategories, setFoodCategories] = useState<Category[]>([]);
  
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [isLoadingOutlets, setIsLoadingOutlets] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingDetailsForEdit, setIsLoadingDetailsForEdit] = useState(false);

  const [editingEntry, setEditingEntry] = useState<(FoodCostEntry & { details: FoodCostDetail[] }) | null>(null);
  
  const [dateForNewEntry, setDateForNewEntry] = useState<Date>(new Date());
  const [outletIdForNewEntry, setOutletIdForNewEntry] = useState<string | undefined>(undefined);

  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      console.log("[FoodCostEntryListClient] dateForNewEntry changed to:", dateForNewEntry);
    }
  }, [dateForNewEntry, isClient]);

  useEffect(() => {
    if (!isClient) return;
    setIsLoadingEntries(true);
    const q = firestoreQuery(collection(db, "foodCostEntries"), orderBy("date", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEntries = snapshot.docs.map(doc => {
        const data = doc.data();
        
        const convertToValidDate = (fieldValue: any): Date => {
          if (fieldValue instanceof Timestamp) {
            return fieldValue.toDate();
          }
          if (fieldValue instanceof Date && isValid(fieldValue)) {
            return fieldValue;
          }
          if (typeof fieldValue === 'string' || typeof fieldValue === 'number') {
            const d = new Date(fieldValue);
            if (isValid(d)) return d;
          }
          if (typeof fieldValue === 'object' && fieldValue !== null && '_seconds' in fieldValue && '_nanoseconds' in fieldValue) {
            try {
                const ts = new Timestamp((fieldValue as any)._seconds, (fieldValue as any)._nanoseconds);
                const d = ts.toDate();
                if (isValid(d)) return d;
            } catch (e) { 
              console.warn("Failed to convert object to Timestamp:", fieldValue, e);
            }
          }
          console.warn("Returning default invalid date for field:", fieldValue);
          return new Date(0); 
        };

        const entryDate = convertToValidDate(data.date);

        return {
          id: doc.id,
          date: entryDate,
          outlet_id: data.outlet_id,
          total_food_cost: data.total_food_cost,
          createdAt: convertToValidDate(data.createdAt),
          updatedAt: convertToValidDate(data.updatedAt),
        } as FoodCostEntry;
      });
      setFoodCostEntries(fetchedEntries);
      setIsLoadingEntries(false);
      
    }, (err) => {
      console.error("Error fetching food cost entries:", err);
      toast({
        variant: "destructive",
        title: "Error Fetching Entries",
        description: "Could not load food cost entries.",
      });
      setIsLoadingEntries(false);
      setError(err as Error);
    });

    return () => unsubscribe();
  }, [isClient, toast]);

  const fetchOutletsAndCategories = useCallback(async () => {
    try {
      setIsLoadingOutlets(true);
      setIsLoadingCategories(true);
      const [outletsData, categoriesData] = await Promise.all([
        getOutletsAction(),
        getFoodCategoriesAction()
      ]);
      setOutlets(outletsData);
      if (outletsData.length > 0 && !outletIdForNewEntry) {
        setOutletIdForNewEntry(outletsData[0].id);
      }
      setFoodCategories(categoriesData);    
    } catch (err) {
      console.error("Error fetching outlets or categories:", err);
      toast({
        variant: "destructive",
        title: "Error Loading Form Data",
        description: (err as Error).message || "Could not load required data for the form.",
      });
      setError(err as Error);
    } finally {
      setIsLoadingOutlets(false);
      setIsLoadingCategories(false);
    }
  }, [toast, outletIdForNewEntry]); 

  useEffect(() => {
    if (isClient) {
      fetchOutletsAndCategories();
    }
  }, [isClient, fetchOutletsAndCategories]);

  const handleAddNew = () => {
    setEditingEntry(null); 
    setDateForNewEntry(new Date()); 
    if (outlets.length > 0 && !outletIdForNewEntry) { 
        setOutletIdForNewEntry(outlets[0].id);
    } else if (outlets.length > 0 && outletIdForNewEntry) {
        // keep current outletIdForNewEntry if already selected
    } else {
        setOutletIdForNewEntry(undefined); // No outlets
    }
    setIsFormOpen(true);
  };

  const handleEdit = async (listEntry: FoodCostEntry) => {
    if (!(listEntry.date instanceof Date) || !isValid(listEntry.date)) {
        toast({
            title: "Invalid Date for Editing",
            description: `Cannot edit entry. The date for entry ID ${listEntry.id} is invalid. Please check the data. Date value: ${listEntry.date}`,
            variant: "destructive",
        });
        return;
    }
    setIsLoadingDetailsForEdit(true);
    try {
      const fullEntryWithDetails = await getFoodCostEntryWithDetailsAction(listEntry.date, listEntry.outlet_id);
      if (fullEntryWithDetails) {
        setEditingEntry(fullEntryWithDetails);
        setIsFormOpen(true);
      } else {
        toast({
          title: "Entry Not Found",
          description: "Could not load the details for the selected entry. It might have been deleted.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error Loading Details",
        description: (err as Error).message || "Failed to load entry details for editing.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDetailsForEdit(false);
    }
  };
  
  const onFormSuccess = () => {
    setIsFormOpen(false);
    setEditingEntry(null); 
  };
  
  const handleDelete = async (entryId: string) => {
    try {
      await deleteFoodCostEntryAction(entryId);
      toast({ title: "Entry Deleted", description: "The food cost entry has been deleted." });
    } catch (err) {
      console.error("Error deleting food cost entry:", err);
      toast({
        variant: "destructive",
        title: "Error Deleting Entry", description: (err as Error).message || "Could not delete entry."
      });
    }
  };

  const handleDateSelectForNewEntry = (newDate: Date | undefined) => {
    console.log("[FoodCostEntryListClient] DatePicker onSelect (new entry) triggered with:", newDate);
    if (newDate && isValid(newDate)) {
      console.log("[FoodCostEntryListClient] Setting dateForNewEntry to:", newDate);
      setDateForNewEntry(newDate);
    } else {
      console.warn("[FoodCostEntryListClient] Invalid or undefined date received from DatePicker:", newDate);
    }
  };

  if (error) {
    return (
      <div className="text-center py-10 text-destructive-foreground bg-destructive/20 rounded-lg border border-destructive">
        <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
        <h3 className="mt-2 text-lg font-semibold">Error</h3>
        <p className="mt-1 text-sm text-destructive-foreground">An error occurred: {error.message}</p>
      </div>
    );
  }

  if (!isClient) {
    return null; 
  }

  const isLoading = isLoadingEntries || isLoadingOutlets || isLoadingCategories || isLoadingDetailsForEdit;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold font-headline">Food Cost Entries</h2>
        <Button onClick={handleAddNew} disabled={isLoadingOutlets || isLoadingCategories}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Entry
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-lg border overflow-hidden shadow-md bg-card p-4">
          <Skeleton className="h-8 w-3/4 mb-4 bg-muted/50" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex justify-between items-center p-4 border-b">
              <Skeleton className="h-6 w-1/4 bg-muted" />
              <Skeleton className="h-6 w-1/4 bg-muted" />
              <Skeleton className="h-6 w-1/6 bg-muted" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8 bg-muted" />
                <Skeleton className="h-8 w-8 bg-muted" />
              </div>
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
              {foodCostEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.date instanceof Date && isValid(entry.date) ? format(entry.date, "PPP") : "Invalid Date"}</TableCell>
                    <TableCell>{outlets.find(o => o.id === entry.outlet_id)?.name || entry.outlet_id || 'Unknown Outlet'}</TableCell>
                    <TableCell className="text-right font-code">${(entry.total_food_cost || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)} className="mr-2 hover:text-primary">
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit Entry</span>
                      </Button>
                       <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete Entry</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center"><AlertTriangle className="h-5 w-5 text-destructive mr-2" />Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone. This will permanently delete the food cost entry for {entry.date instanceof Date && isValid(entry.date) ? format(entry.date, "PPP") : "this date"} at {outlets.find(o => o.id === entry.outlet_id)?.name || 'this outlet'}.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(entry.id)} className="bg-destructive hover:bg-destructive/80 text-destructive-foreground">Delete</AlertDialogAction>
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

      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingEntry(null); }}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col bg-card">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl">{editingEntry ? "Edit Food Cost Entry" : "Add New Food Cost Entry"}</DialogTitle>
            <DialogDescription>
              {editingEntry 
                ? `Update details for outlet: ${outlets.find(o => o.id === editingEntry.outlet_id)?.name || 'Unknown'} on ${editingEntry.date && isValid(editingEntry.date) ? format(editingEntry.date, "PPP") : "selected date"}` 
                : "Enter the details for a new food cost entry."}
            </DialogDescription>
          </DialogHeader>
          
          {!editingEntry && isClient && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border-b">
              <div>
                <Label htmlFor="new-entry-date" className="mb-1 block text-sm font-medium">Date</Label>
                <DatePicker 
                  date={dateForNewEntry} 
                  setDate={handleDateSelectForNewEntry}
                  id="new-entry-date"
                  className="w-full"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    const testDate = new Date(dateForNewEntry.getFullYear(), dateForNewEntry.getMonth(), dateForNewEntry.getDate() + 1);
                    console.log("[FoodCostEntryListClient] Test button clicked, attempting to set date to:", testDate);
                    setDateForNewEntry(testDate);
                  }}
                >
                  Increment Date (Test)
                </Button>
              </div>
              <div>
                <Label htmlFor="new-entry-outlet" className="mb-1 block text-sm font-medium">Outlet</Label>
                {isLoadingOutlets ? (
                  <Skeleton className="h-10 w-full bg-muted" />
                ) : (
                  <Select 
                    value={outletIdForNewEntry} 
                    onValueChange={(id) => setOutletIdForNewEntry(id)}
                  >
                    <SelectTrigger id="new-entry-outlet" className="w-full">
                      <SelectValue placeholder="Select an outlet" />
                    </SelectTrigger>
                    <SelectContent>
                      {outlets.map((outlet) => (
                        <SelectItem key={outlet.id} value={outlet.id}>
                          {outlet.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}

          {isClient && (isLoadingOutlets || isLoadingCategories) && !editingEntry && (!outletIdForNewEntry || !dateForNewEntry) ? (
             <div className="flex justify-center items-center h-40">
              <p className="text-muted-foreground">
                {isLoadingOutlets || isLoadingCategories ? "Loading selection options..." : "Please select a date and outlet."}
              </p>
            </div>
          ) : (
            <FoodCostInputForm
                 key={
                    editingEntry
                      ? `${editingEntry.id}-${editingEntry.date instanceof Date && isValid(editingEntry.date) ? editingEntry.date.toISOString() : 'invalid-edit-date'}`
                      : `new-${dateForNewEntry instanceof Date && isValid(dateForNewEntry) ? dateForNewEntry.toISOString() : 'invalid-new-date'}-${outletIdForNewEntry || 'no-outlet'}`
                  }
                selectedDate={editingEntry && editingEntry.date && isValid(editingEntry.date) ? editingEntry.date : dateForNewEntry}
                selectedOutletId={editingEntry ? editingEntry.outlet_id : (outletIdForNewEntry || (outlets.length > 0 ? outlets[0].id : ""))}
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

