
"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, orderBy, query as firestoreQuery, Timestamp } from "firebase/firestore";
import { PlusCircle, Edit, Trash2, AlertTriangle, GlassWater } from "lucide-react";
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
import BeverageCostInputForm from "./BeverageCostInputForm";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { deleteBeverageCostEntryAction, getBeverageCostEntryWithDetailsAction, getBeverageCategoriesAction } from "@/actions/beverageCostActions";
import { getOutletsAction } from "@/actions/foodCostActions"; // Re-use
import type { Outlet, Category, BeverageCostEntry, BeverageCostDetail } from "@/types";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function BeverageCostEntryListClient() {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const [beverageCostEntries, setBeverageCostEntries] = useState<BeverageCostEntry[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [beverageCategories, setBeverageCategories] = useState<Category[]>([]);
  
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [isLoadingOutlets, setIsLoadingOutlets] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingDetailsForEdit, setIsLoadingDetailsForEdit] = useState(false);

  const [editingEntry, setEditingEntry] = useState<(BeverageCostEntry & { details: BeverageCostDetail[] }) | null>(null);
  
  const [dialogDate, setDialogDate] = useState<Date>(new Date());
  const [dialogOutletId, setDialogOutletId] = useState<string | undefined>(undefined);

  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    setIsLoadingEntries(true);
    const q = firestoreQuery(collection(db, "beverageCostEntries"), orderBy("date", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEntries = snapshot.docs.map(doc => {
        const data = doc.data();
        
        const convertToValidDate = (fieldValue: any): Date => {
          if (fieldValue instanceof Timestamp) return fieldValue.toDate();
          if (fieldValue instanceof Date && isValid(fieldValue)) return fieldValue;
          if (typeof fieldValue === 'string' || typeof fieldValue === 'number') {
            const d = new Date(fieldValue);
            if (isValid(d)) return d;
          }
          if (typeof fieldValue === 'object' && fieldValue !== null && '_seconds' in fieldValue && '_nanoseconds' in fieldValue) {
            try {
                const ts = new Timestamp((fieldValue as any)._seconds, (fieldValue as any)._nanoseconds);
                const d = ts.toDate();
                if (isValid(d)) return d;
            } catch (e) { console.warn("Failed to convert object to Timestamp:", fieldValue, e); }
          }
          return new Date(0); 
        };

        const entryDate = convertToValidDate(data.date);

        return {
          id: doc.id,
          date: entryDate,
          outlet_id: data.outlet_id,
          total_beverage_cost: data.total_beverage_cost,
          createdAt: convertToValidDate(data.createdAt),
          updatedAt: convertToValidDate(data.updatedAt),
        } as BeverageCostEntry;
      });
      setBeverageCostEntries(fetchedEntries);
      setIsLoadingEntries(false);
      
    }, (err) => {
      console.error("Error fetching beverage cost entries:", err);
      toast({ variant: "destructive", title: "Error Fetching Entries", description: "Could not load beverage cost entries." });
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
        getBeverageCategoriesAction()
      ]);
      setOutlets(outletsData);
      if (outletsData.length > 0 && !dialogOutletId) {
        setDialogOutletId(outletsData[0].id);
      }
      setBeverageCategories(categoriesData);    
    } catch (err) {
      console.error("Error fetching outlets or categories:", err);
      toast({ variant: "destructive", title: "Error Loading Form Data", description: (err as Error).message || "Could not load required data for the form."});
      setError(err as Error);
    } finally {
      setIsLoadingOutlets(false);
      setIsLoadingCategories(false);
    }
  }, [toast, dialogOutletId]); 

  useEffect(() => {
    if (isClient) {
      fetchOutletsAndCategories();
    }
  }, [isClient, fetchOutletsAndCategories]);

  const handleAddNew = () => {
    setEditingEntry(null); 
    setDialogDate(new Date()); 
    const initialOutletId = outlets.length > 0 ? outlets[0].id : undefined;
    setDialogOutletId(initialOutletId);
    setIsFormOpen(true);
  };

  const handleEdit = async (listEntry: BeverageCostEntry) => {
    if (!(listEntry.date instanceof Date) || !isValid(listEntry.date)) {
        toast({ title: "Invalid Date for Editing", description: `Cannot edit entry. The date for entry ID ${listEntry.id} is invalid.`, variant: "destructive"});
        return;
    }
    setIsLoadingDetailsForEdit(true);
    try {
      const fullEntryWithDetails = await getBeverageCostEntryWithDetailsAction(listEntry.date, listEntry.outlet_id);
      if (fullEntryWithDetails) {
        setEditingEntry(fullEntryWithDetails);
        setDialogDate(fullEntryWithDetails.date);
        setDialogOutletId(fullEntryWithDetails.outlet_id);
        setIsFormOpen(true);
      } else {
        toast({ title: "Entry Not Found", description: "Could not load details. It might have been deleted.", variant: "destructive"});
      }
    } catch (err) {
      toast({ title: "Error Loading Details", description: (err as Error).message || "Failed to load entry details.", variant: "destructive"});
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
      await deleteBeverageCostEntryAction(entryId);
      toast({ title: "Entry Deleted", description: "The beverage cost entry has been deleted." });
    } catch (err) {
      console.error("Error deleting beverage cost entry:", err);
      toast({ variant: "destructive", title: "Error Deleting Entry", description: (err as Error).message || "Could not delete entry."});
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

  if (!isClient) return null; 

  const isLoading = isLoadingEntries || isLoadingOutlets || isLoadingCategories || isLoadingDetailsForEdit;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold font-headline">Beverage Cost Entries</h2>
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
      ) : beverageCostEntries.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border">
           <GlassWater className="mx-auto h-12 w-12 mb-4 text-primary" />
           <h3 className="mt-2 text-lg font-semibold">No Beverage Cost Entries</h3>
          <p className="mt-1 text-sm text-muted-foreground">Get started by creating a new beverage cost entry.</p>
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
              {beverageCostEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.date instanceof Date && isValid(entry.date) ? format(entry.date, "PPP") : "Invalid Date"}</TableCell>
                    <TableCell>{outlets.find(o => o.id === entry.outlet_id)?.name || entry.outlet_id || 'Unknown Outlet'}</TableCell>
                    <TableCell className="text-right font-code">${(entry.total_beverage_cost || 0).toFixed(2)}</TableCell>
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
                            <AlertDialogDescription>This action cannot be undone. This will permanently delete the beverage cost entry for {entry.date instanceof Date && isValid(entry.date) ? format(entry.date, "PPP") : "this date"} at {outlets.find(o => o.id === entry.outlet_id)?.name || 'this outlet'}.</AlertDialogDescription>
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
        <DialogContent 
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col bg-card"
        >
          <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b">
            <DialogTitle className="font-headline text-xl">{editingEntry ? "Edit Beverage Cost Entry" : "Add New Beverage Cost Entry"}</DialogTitle>
            <DialogDescription>
              {editingEntry 
                ? `Update details for outlet: ${outlets.find(o => o.id === dialogOutletId)?.name || 'Unknown'} on ${dialogDate && isValid(dialogDate) ? format(dialogDate, "PPP") : "selected date"}` 
                : "Enter the details for a new beverage cost entry."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-grow min-h-0 overflow-y-auto">
            {isClient && (outlets.length > 0 || isLoadingOutlets) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 pb-4 border-b">
                <div>
                  <Label htmlFor="dialog-beverage-entry-date" className="mb-1 block text-sm font-medium">Date</Label>
                  <DatePicker 
                    date={dialogDate && isValid(dialogDate) ? dialogDate : undefined} 
                    setDate={(newDate) => newDate && isValid(newDate) && setDialogDate(newDate)}
                    id="dialog-beverage-entry-date"
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="dialog-beverage-entry-outlet" className="mb-1 block text-sm font-medium">Outlet</Label>
                  {isLoadingOutlets ? (
                    <Skeleton className="h-10 w-full bg-muted" />
                  ) : (
                    <Select 
                      value={dialogOutletId} 
                      onValueChange={(id) => setDialogOutletId(id)}
                    >
                      <SelectTrigger id="dialog-beverage-entry-outlet" className="w-full">
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

            <div className="p-6">
              {isClient && (isLoadingOutlets || isLoadingCategories) && !editingEntry && (!dialogOutletId || !isValid(dialogDate)) ? ( 
                <div className="flex justify-center items-center h-40">
                  <p className="text-muted-foreground">
                    {isLoadingOutlets || isLoadingCategories ? "Loading selection options..." : "Please select a date and outlet above to start."}
                  </p>
                </div>
              ) : (
                <BeverageCostInputForm
                    key={
                        editingEntry
                        ? `${editingEntry.id}-${dialogDate instanceof Date && isValid(dialogDate) ? dialogDate.toISOString() : 'invalid-edit-date'}-${dialogOutletId || 'no-dialog-outlet'}`
                        : `new-${dialogDate instanceof Date && isValid(dialogDate) ? dialogDate.toISOString() : 'invalid-new-date'}-${dialogOutletId || 'no-dialog-outlet'}`
                    }
                    selectedDate={dialogDate}
                    selectedOutletId={dialogOutletId || (outlets.length > 0 ? outlets[0].id : "")}
                    beverageCategories={beverageCategories}
                    existingEntry={editingEntry} 
                    onSuccess={onFormSuccess}
                  />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
 );
}
