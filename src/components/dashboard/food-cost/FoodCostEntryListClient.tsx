
"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, orderBy, Timestamp, query } from "firebase/firestore";
import { PlusCircle, Edit, Trash2, AlertTriangle, FileText, Apple } from "lucide-react";
import { format, parseISO } from "date-fns";

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
  AlertDialog, ChevronLeft, ChevronRight,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import FoodCostEntryForm from "./FoodCostEntryForm";
import { useToast } from "@/hooks/use-toast";
import { deleteDailyHotelEntryAction, getPaginatedDailyEntriesAction } from "@/actions/dailyEntryActions";
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


export default function FoodCostEntryListClient() {
  const [entries, setEntries] = useState<DailyHotelEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [lastVisibleDocId, setLastVisibleDocId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DailyHotelEntry | null>(null);
  const { toast } = useToast();

  const fetchEntries = async (page: number, perPage: number, lastId?: string | null): Promise<number> => {
    setIsLoading(true);
    try {
      const result = await getPaginatedDailyEntriesAction(perPage, lastId);
      setEntries(result.entries);
      setLastVisibleDocId(result.lastVisibleDocId);
      setHasMore(result.entries.length === perPage);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching daily entries:", error);
      toast({
        variant: "destructive",
        title: "Error Fetching Entries",
        description: "Could not load food cost entries from the database.",
      });
    } finally {
      setIsLoading(false);
      return entries.length; // Return the number of entries fetched for summary
    }
  };

  useEffect(() => {
    fetchEntries(1, itemsPerPage, null);
    /* This was the old onSnapshot listener. We are replacing it with fetchEntries.
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
        description: "Could not load food cost entries from the database.",
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
    */
    fetchEntries(1, itemsPerPage, null); // Fetch initial page
  }, [itemsPerPage, toast]); // Depend on itemsPerPage and toast

  const goToNextPage = async () => {
    if (!hasMore || isLoading) return;
    const nextPage = currentPage + 1;
    await fetchEntries(nextPage, itemsPerPage, lastVisibleDocId);
  };

  const goToPreviousPage = async () => {
    if (currentPage === 1 || isLoading) return;

    // For previous page, we need to refetch from the beginning up to the start of the previous page
    const previousPage = currentPage - 1;
    const itemsToFetch = previousPage * itemsPerPage;

    setIsLoading(true);
    try {
      // Fetch more items than the previous page requires to find the new lastVisibleDocId
      const result = await getPaginatedDailyEntriesAction(itemsToFetch, null);
      const previousPageEntries = result.entries.slice(-itemsPerPage); // Get the last 'itemsPerPage' from the result
      setEntries(previousPageEntries);
      setLastVisibleDocId(previousPageEntries.length > 0 ? previousPageEntries[previousPageEntries.length - 1].id : null);
      setHasMore(result.entries.length === itemsToFetch); // Check if we fetched exactly the number expected for previous pages
      setCurrentPage(previousPage);
    } finally { setIsLoading(false); }
  };

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
  
    // Calculate the range of items being displayed
    const startIndex = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage, itemsPerPage]);
    const endIndex = useMemo(() => startIndex + entries.length, [startIndex, entries.length]);
    // Note: This total count is not accurate with cursor-based pagination without fetching all data.
    // A better approach for total would require a separate aggregate query or maintaining a counter.
    // For now, we'll show the range of *currently* displayed items.

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
          <Skeleton className="h-10 w-40 bg-muted" />
        </div>
        <div className="rounded-lg border overflow-hidden shadow-md bg-card">
          <Skeleton className="h-12 w-full bg-muted/50" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center p-4 border-b">
              <Skeleton className="h-6 w-1/3 bg-muted mr-4" />
              <Skeleton className="h-6 w-1/3 bg-muted mr-4" />
              <Skeleton className="h-6 w-1/4 bg-muted mr-4" />
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
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Food Entry
        </Button>
      </div>

      {entries.length === 0 ? (
         <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border">
            <Apple className="mx-auto h-12 w-12 mb-4 text-primary" />
            <p className="text-lg font-medium">No food cost entries found.</p>
            <p>Click "Add New Food Entry" to get started.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden shadow-md bg-card">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-headline">Date</TableHead>
                <TableHead className="font-headline text-right">Hotel Net Sales</TableHead>
                <TableHead className="font-headline text-right">Budget Food Cost %</TableHead>
                {/* Add more food-specific calculated fields if needed, e.g., Actual Food Cost % */}
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
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)} className="mr-2 hover:text-primary">
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit Food Entry</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete Food Entry</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center">
                            <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
                            Are you sure?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the entire financial entry (including any beverage data) for 
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

      {/* Pagination Controls */}
      {entries.length > 0 && (
        <div className="flex justify-between items-center mt-4 px-2">
            <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {endIndex} results
            </div>
            <div className="flex justify-end space-x-2">
                <Button onClick={goToPreviousPage} disabled={currentPage === 1 || isLoading} variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /><span className="sr-only">Previous Page</span></Button>
                <Button onClick={goToNextPage} disabled={!hasMore || isLoading} variant="outline" size="icon"><ChevronRight className="h-4 w-4" /><span className="sr-only">Next Page</span></Button>
            </div>
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[90vh] flex flex-col bg-card">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl">
              {editingEntry ? "Edit Food Cost Entry" : "Add New Food Cost Entry"}
            </DialogTitle>
            <DialogDescription>
              {editingEntry ? `Update the food cost details for ${editingEntry.date instanceof Date ? format(editingEntry.date, "PPP") : editingEntry.id}.` : "Enter the food cost details for a new date."}
              {" Beverage cost details are preserved if editing an existing entry."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto pr-2 pl-1 py-2">
             <FoodCostEntryForm
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
