
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, orderBy, Timestamp, query } from "firebase/firestore";
import { PlusCircle, Edit, Trash2, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";

import { db } from "@/lib/firebase";
import type { DailyHotelEntry } from "@/types";
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
import HotelDailyEntryForm from "./HotelDailyEntryForm"; // Ensure this path is correct
import { useToast } from "@/hooks/use-toast";
import { deleteDailyHotelEntryAction } from "@/actions/dailyEntryActions";
import { Skeleton } from "@/components/ui/skeleton";

// Helper to convert Firestore Timestamps in an entry to JS Dates
const convertTimestampsToDates = (entry: DailyHotelEntry): DailyHotelEntry => {
  return {
    ...entry,
    date: entry.date instanceof Timestamp ? entry.date.toDate() : new Date(entry.date),
    createdAt: entry.createdAt instanceof Timestamp ? entry.createdAt.toDate() : new Date(entry.createdAt),
    updatedAt: entry.updatedAt instanceof Timestamp ? entry.updatedAt.toDate() : new Date(entry.updatedAt),
  };
};


export default function HotelDailyEntryListClient() {
  const [entries, setEntries] = useState<DailyHotelEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DailyHotelEntry | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, "dailyHotelEntries"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEntries = snapshot.docs.map(doc => {
        const data = doc.data() as Omit<DailyHotelEntry, 'id'>;
        return convertTimestampsToDates({ id: doc.id, ...data } as DailyHotelEntry);
      });
      setEntries(fetchedEntries);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching hotel daily entries:", error);
      toast({
        variant: "destructive",
        title: "Error Fetching Entries",
        description: "Could not load hotel daily entries from the database.",
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleAddNew = () => {
    setEditingEntry(null);
    setIsFormOpen(true);
  };

  const handleEdit = (entry: DailyHotelEntry) => {
    setEditingEntry(entry);
    setIsFormOpen(true);
  };

  const handleDelete = async (entryId: string) => {
    try {
      await deleteDailyHotelEntryAction(entryId);
      toast({
        title: "Entry Deleted",
        description: "The hotel daily entry has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast({
        variant: "destructive",
        title: "Error Deleting Entry",
        description: (error as Error).message || "Could not delete the entry.",
      });
    }
  };

  const onFormSuccess = () => {
    setIsFormOpen(false);
  };
  
  const onFormCancel = () => {
    setIsFormOpen(false);
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-end mb-4">
          <Skeleton className="h-10 w-44 bg-muted" />
        </div>
        <div className="rounded-lg border overflow-hidden shadow-md bg-card">
          <Skeleton className="h-12 w-full bg-muted/50" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center p-4 border-b">
              <Skeleton className="h-6 w-1/4 bg-muted mr-2" />
              <Skeleton className="h-6 w-1/4 bg-muted mr-2" />
              <Skeleton className="h-6 w-1/4 bg-muted mr-2" />
              <Skeleton className="h-6 w-1/5 bg-muted mr-2" />
              <Skeleton className="h-8 w-8 bg-muted mr-2" />
              <Skeleton className="h-8 w-8 bg-muted" />
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
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Hotel Entry
        </Button>
      </div>

      {entries.length === 0 ? (
         <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border">
            <FileSpreadsheet className="mx-auto h-12 w-12 mb-4 text-primary" />
            <p className="text-lg font-medium">No hotel daily entries found.</p>
            <p>Click "Add New Hotel Entry" to get started.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden shadow-md bg-card">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-headline">Date</TableHead>
                <TableHead className="font-headline text-right">Net Food Sales</TableHead>
                <TableHead className="font-headline text-right">Budget Food %</TableHead>
                <TableHead className="font-headline text-right">Net Bev Sales</TableHead>
                <TableHead className="font-headline text-right">Budget Bev %</TableHead>
                <TableHead className="font-headline w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-code">
                    {entry.date instanceof Date ? format(entry.date, "PPP") : entry.id}
                  </TableCell>
                  <TableCell className="text-right font-code">${entry.hotelNetFoodSales?.toFixed(2) ?? '0.00'}</TableCell>
                  <TableCell className="text-right font-code">{entry.budgetHotelFoodCostPct?.toFixed(2) ?? '0.00'}%</TableCell>
                  <TableCell className="text-right font-code">${entry.hotelNetBeverageSales?.toFixed(2) ?? '0.00'}</TableCell>
                  <TableCell className="text-right font-code">{entry.budgetHotelBeverageCostPct?.toFixed(2) ?? '0.00'}%</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)} className="mr-2 hover:text-primary">
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit Hotel Entry</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete Hotel Entry</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center">
                            <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
                            Are you sure?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the entire financial entry for 
                            {entry.date instanceof Date ? ` ${format(entry.date, "PPP")}` : ` entry ID ${entry.id}`}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(entry.id)}
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
        <DialogContent className="sm:max-w-3xl md:max-w-4xl max-h-[90vh] flex flex-col bg-card">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl">
              {editingEntry ? "Edit Hotel Daily Entry" : "Add New Hotel Daily Entry"}
            </DialogTitle>
            <DialogDescription>
              {editingEntry ? `Update the hotel daily financial details for ${editingEntry.date instanceof Date ? format(editingEntry.date, "PPP") : editingEntry.id}.` : "Enter the hotel daily financial details for a new date."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto pr-2 pl-1 py-2">
             <HotelDailyEntryForm
                initialData={editingEntry}
                onSuccess={onFormSuccess}
                onCancel={onFormCancel}
              />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
