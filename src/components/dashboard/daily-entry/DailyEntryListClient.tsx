
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, orderBy, Timestamp, query } from "firebase/firestore";
import { PlusCircle, Edit, Trash2, AlertTriangle, FileText } from "lucide-react";
import { format, parse } from "date-fns";

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
import DailyEntryForm from "./DailyEntryForm";
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


export default function DailyEntryListClient() {
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
      console.error("Error fetching daily entries:", error);
      toast({
        variant: "destructive",
        title: "Error Fetching Entries",
        description: "Could not load daily entries from the database.",
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
        description: "The financial entry has been successfully deleted.",
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
    // Real-time listener will update the list
  };
  
  const onFormCancel = () => {
    setIsFormOpen(false);
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-end mb-4">
          <Skeleton className="h-10 w-36 bg-muted" />
        </div>
        <div className="rounded-lg border overflow-hidden shadow-md bg-card">
          <Skeleton className="h-12 w-full bg-muted/50" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center p-4 border-b">
              <Skeleton className="h-6 w-1/4 bg-muted mr-4" />
              <Skeleton className="h-6 w-1/4 bg-muted mr-4" />
              <Skeleton className="h-6 w-1/4 bg-muted mr-4" />
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
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Entry
        </Button>
      </div>

      {entries.length === 0 ? (
         <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg">
            <FileText className="mx-auto h-12 w-12 mb-4" />
            <p className="text-lg font-medium">No financial entries found.</p>
            <p>Click "Add New Entry" to get started.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden shadow-md bg-card">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-headline">Date</TableHead>
                <TableHead className="font-headline text-right">Net Sales</TableHead>
                <TableHead className="font-headline text-right">Budget Food Cost %</TableHead>
                <TableHead className="font-headline text-right">Budget Bev Cost %</TableHead>
                <TableHead className="font-headline w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-code">
                    {entry.date instanceof Date ? format(entry.date, "PPP") : entry.id}
                  </TableCell>
                  <TableCell className="text-right font-code">${entry.hotelNetSales?.toFixed(2) ?? '0.00'}</TableCell>
                  <TableCell className="text-right font-code">{entry.budgetHotelFoodCostPct?.toFixed(2) ?? '0.00'}%</TableCell>
                  <TableCell className="text-right font-code">{entry.budgetHotelBeverageCostPct?.toFixed(2) ?? '0.00'}%</TableCell>
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
                          <AlertDialogTitle className="flex items-center">
                            <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
                            Are you sure?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the financial entry for 
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
        <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[90vh] flex flex-col bg-card">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl">
              {editingEntry ? "Edit Financial Entry" : "Add New Financial Entry"}
            </DialogTitle>
            <DialogDescription>
              {editingEntry ? `Update the financial details for ${editingEntry.date instanceof Date ? format(editingEntry.date, "PPP") : editingEntry.id}.` : "Enter the financial details for a new date."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto pr-2 pl-1 py-2">
             <DailyEntryForm
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
