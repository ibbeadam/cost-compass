
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
  const [allEntries, setAllEntries] = useState<DailyHotelEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DailyHotelEntry | null>(null);
  const { toast } = useToast();

  const fetchAllEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getPaginatedDailyEntriesAction(undefined, undefined, true);
      setAllEntries(result.entries.map(convertTimestampsToDates));
      setTotalEntries(result.totalCount);
      setCurrentPage(1); 
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
  }, [toast]);

  useEffect(() => {
    fetchAllEntries();
  }, [fetchAllEntries]);

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
      fetchAllEntries(); 
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
    fetchAllEntries(); 
  };
  
  const onFormCancel = () => {
    setIsFormOpen(false);
    setEditingEntry(null);
  };

  const totalPages = Math.max(1, Math.ceil(totalEntries / ITEMS_PER_PAGE));
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return allEntries.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [allEntries, currentPage]);

  const startIndexDisplay = totalEntries > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const endIndexDisplay = totalEntries > 0 ? Math.min(currentPage * ITEMS_PER_PAGE, totalEntries) : 0;

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


  if (isLoading && allEntries.length === 0) {
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
             {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-9 w-9 bg-muted rounded-md" />)}
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

      {currentItems.length === 0 && !isLoading ? (
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
              {currentItems.map((entry) => (
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

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 px-2">
            <div className="text-sm text-muted-foreground">
                Showing {startIndexDisplay} to {endIndexDisplay} of {totalEntries} results
            </div>
            <div className="flex items-center space-x-1">
                <Button onClick={() => setCurrentPage(currentPage-1)} disabled={currentPage === 1 || isLoading} variant="outline" size="icon" className="h-9 w-9"><ChevronLeft className="h-4 w-4" /><span className="sr-only">Previous Page</span></Button>
                {renderPageNumbers()}
                <Button onClick={() => setCurrentPage(currentPage+1)} disabled={currentPage === totalPages || isLoading} variant="outline" size="icon" className="h-9 w-9"><ChevronRight className="h-4 w-4" /><span className="sr-only">Next Page</span></Button>
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
