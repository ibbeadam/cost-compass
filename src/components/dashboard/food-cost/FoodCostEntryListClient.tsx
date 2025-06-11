
"use client";

import { useState, useEffect, useMemo } from "react";
import { Timestamp } from "firebase/firestore";
import { PlusCircle, Edit, Trash2, AlertTriangle, Apple, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

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
import FoodCostEntryForm from "./FoodCostEntryForm";
import { useToast } from "@/hooks/use-toast";
import { deleteDailyHotelEntryAction, getPaginatedDailyEntriesAction } from "@/actions/dailyEntryActions";
import { Skeleton } from "@/components/ui/skeleton";

const ITEMS_PER_PAGE = 10;

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
  const [lastVisibleDocId, setLastVisibleDocId] = useState<string | null>(null);
  const [pageCursors, setPageCursors] = useState<(string | null)[]>([null]); // Store cursor for the start of each page
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DailyHotelEntry | null>(null);
  const { toast } = useToast();

  const fetchEntries = async (page: number, cursor: string | null) => {
    setIsLoading(true);
    try {
      const result = await getPaginatedDailyEntriesAction(ITEMS_PER_PAGE, cursor);
      setEntries(result.entries.map(convertTimestampsToDates));
      setLastVisibleDocId(result.lastVisibleDocId);
      setHasMore(result.entries.length === ITEMS_PER_PAGE);
      setCurrentPage(page);

      const newCursors = [...pageCursors];
      if (page >= newCursors.length) {
         newCursors[page] = result.lastVisibleDocId; 
      }
      setPageCursors(newCursors);

    } catch (error) {
      console.error("Error fetching daily entries:", error);
      toast({
        variant: "destructive",
        title: "Error Fetching Entries",
        description: "Could not load food cost entries from the database.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries(1, null); // Fetch initial page
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const goToNextPage = () => {
    if (!hasMore || isLoading) return;
    fetchEntries(currentPage + 1, lastVisibleDocId);
  };

  const goToPreviousPage = () => {
    if (currentPage === 1 || isLoading) return;
    const prevPageCursor = currentPage > 1 ? pageCursors[currentPage - 2] : null;
    fetchEntries(currentPage - 1, prevPageCursor);
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
      fetchEntries(currentPage, currentPage > 1 ? pageCursors[currentPage - 1] : null); // Refetch current page
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
    setEditingEntry(null);
    fetchEntries(currentPage, currentPage > 1 ? pageCursors[currentPage - 1] : null); // Refetch current page
  };
  
  const onFormCancel = () => {
    setIsFormOpen(false);
    setEditingEntry(null);
  };

  const startIndexText = entries.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const endIndexText = entries.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + entries.length : 0;


  if (isLoading && entries.length === 0) {
    return (
      <div>
        <div className="flex justify-end mb-4"> <Skeleton className="h-10 w-40 bg-muted" /> </div>
        <div className="rounded-lg border overflow-hidden shadow-md bg-card">
          <Skeleton className="h-12 w-full bg-muted/50" />
          {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
            <div key={i} className="flex items-center p-4 border-b">
              <Skeleton className="h-6 w-1/3 bg-muted mr-4" />
              <Skeleton className="h-6 w-1/3 bg-muted mr-4" />
              <Skeleton className="h-6 w-1/4 bg-muted mr-4" />
              <Skeleton className="h-8 w-8 bg-muted rounded-md mr-2" />
              <Skeleton className="h-8 w-8 bg-muted rounded-md" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4 px-2">
          <Skeleton className="h-6 w-1/4 bg-muted" />
          <div className="flex items-center space-x-1">
            <Skeleton className="h-9 w-9 bg-muted rounded-md" />
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
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Food Entry
        </Button>
      </div>

      {entries.length === 0 && !isLoading ? (
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
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)} className="mr-2 hover:text-primary h-9 w-9">
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit Food Entry</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="hover:text-destructive h-9 w-9">
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

      {entries.length > 0 && (
        <div className="flex justify-between items-center mt-4 px-2">
            <div className="text-sm text-muted-foreground">
                Showing {startIndexText} to {endIndexText} results {hasMore ? "(more available)" : ""}
            </div>
            <div className="flex items-center space-x-1">
                <Button onClick={goToPreviousPage} disabled={currentPage === 1 || isLoading} variant="outline" size="icon" className="h-9 w-9"><ChevronLeft className="h-4 w-4" /><span className="sr-only">Previous Page</span></Button>
                <span className="text-sm font-medium p-2">Page {currentPage}</span>
                <Button onClick={goToNextPage} disabled={!hasMore || isLoading} variant="outline" size="icon" className="h-9 w-9"><ChevronRight className="h-4 w-4" /><span className="sr-only">Next Page</span></Button>
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
                key={editingEntry ? editingEntry.id : 'new-entry-food-cost'}
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
