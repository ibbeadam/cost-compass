"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query as firestoreQuery,
  Timestamp,
} from "firebase/firestore";
import {
  PlusCircle,
  Edit,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useToast } from "@/hooks/use-toast";
import {
  deleteFoodCostEntryAction,
  getFoodCostEntryWithDetailsAction,
  getOutletsAction,
  getFoodCategoriesAction,
} from "@/actions/foodCostActions";
import type { Outlet, Category, FoodCostEntry, FoodCostDetail } from "@/types";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const ITEMS_PER_PAGE = 5;

export default function FoodCostEntryListClient() {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const [allFoodCostEntries, setAllFoodCostEntries] = useState<FoodCostEntry[]>(
    []
  );
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [foodCategories, setFoodCategories] = useState<Category[]>([]);

  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [isLoadingOutlets, setIsLoadingOutlets] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingDetailsForEdit, setIsLoadingDetailsForEdit] = useState(false);

  const [editingEntry, setEditingEntry] = useState<
    (FoodCostEntry & { details: FoodCostDetail[] }) | null
  >(null);

  const [dialogDate, setDialogDate] = useState<Date>(new Date());
  const [dialogOutletId, setDialogOutletId] = useState<string | undefined>(
    undefined
  );

  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    setIsLoadingEntries(true);
    if (!db) {
      setIsLoadingEntries(false);
      setError(new Error("Firestore database is not initialized."));
      return;
    }
    const q = firestoreQuery(
      collection(db, "foodCostEntries"),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedEntries = snapshot.docs.map((doc) => {
          const data = doc.data();

          const convertToValidDate = (fieldValue: any): Date => {
            if (fieldValue instanceof Timestamp) {
              return fieldValue.toDate();
            }
            if (fieldValue instanceof Date && isValid(fieldValue)) {
              return fieldValue;
            }
            if (
              typeof fieldValue === "string" ||
              typeof fieldValue === "number"
            ) {
              const d = new Date(fieldValue);
              if (isValid(d)) return d;
            }
            if (
              typeof fieldValue === "object" &&
              fieldValue !== null &&
              "_seconds" in fieldValue &&
              "_nanoseconds" in fieldValue
            ) {
              try {
                const ts = new Timestamp(
                  (fieldValue as any)._seconds,
                  (fieldValue as any)._nanoseconds
                );
                const d = ts.toDate();
                if (isValid(d)) return d;
              } catch (e) {
                console.warn(
                  "Failed to convert object to Timestamp:",
                  fieldValue,
                  e
                );
              }
            }
            console.warn(
              "Returning default invalid date for field:",
              fieldValue
            );
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
        setAllFoodCostEntries(fetchedEntries);
        setIsLoadingEntries(false);
        setCurrentPage(1); // Reset to first page on new data
      },
      (err) => {
        console.error("Error fetching food cost entries:", err);
        toast({
          variant: "destructive",
          title: "Error Fetching Entries",
          description: "Could not load food cost entries.",
        });
        setIsLoadingEntries(false);
        setError(err as Error);
      }
    );

    return () => unsubscribe();
  }, [isClient, toast]);

  const fetchOutletsAndCategories = useCallback(async () => {
    try {
      setIsLoadingOutlets(true);
      setIsLoadingCategories(true);
      const [outletsData, categoriesData] = await Promise.all([
        getOutletsAction(),
        getFoodCategoriesAction(),
      ]);
      setOutlets(outletsData);
      if (outletsData.length > 0 && !dialogOutletId) {
        setDialogOutletId(outletsData[0].id);
      }
      setFoodCategories(categoriesData);
    } catch (err) {
      console.error("Error fetching outlets or categories:", err);
      toast({
        variant: "destructive",
        title: "Error Loading Form Data",
        description:
          (err as Error).message ||
          "Could not load required data for the form.",
      });
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
      const fullEntryWithDetails = await getFoodCostEntryWithDetailsAction(
        listEntry.date,
        listEntry.outlet_id
      );
      if (fullEntryWithDetails) {
        setEditingEntry(fullEntryWithDetails);
        setDialogDate(
          fullEntryWithDetails.date instanceof Date
            ? fullEntryWithDetails.date
            : fullEntryWithDetails.date instanceof Timestamp
            ? fullEntryWithDetails.date.toDate()
            : new Date(fullEntryWithDetails.date)
        );
        setDialogOutletId(fullEntryWithDetails.outlet_id);
        setIsFormOpen(true);
      } else {
        toast({
          title: "Entry Not Found",
          description:
            "Could not load the details for the selected entry. It might have been deleted.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error Loading Details",
        description:
          (err as Error).message || "Failed to load entry details for editing.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDetailsForEdit(false);
    }
  };

  const onFormSuccess = () => {
    setIsFormOpen(false);
    setEditingEntry(null);
    // Data will be re-fetched by onSnapshot
  };

  const handleDelete = async (entryId: string) => {
    try {
      await deleteFoodCostEntryAction(entryId);
      toast({
        title: "Entry Deleted",
        description: "The food cost entry has been deleted.",
      });
      // Data will be re-fetched by onSnapshot
    } catch (err) {
      console.error("Error deleting food cost entry:", err);
      toast({
        variant: "destructive",
        title: "Error Deleting Entry",
        description: (err as Error).message || "Could not delete entry.",
      });
    }
  };

  const totalEntries = allFoodCostEntries.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / ITEMS_PER_PAGE));
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return allFoodCostEntries.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [allFoodCostEntries, currentPage]);

  const startIndexDisplay =
    totalEntries > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const endIndexDisplay =
    totalEntries > 0 ? Math.min(currentPage * ITEMS_PER_PAGE, totalEntries) : 0;

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
          disabled={isLoadingEntries || isLoadingOutlets || isLoadingCategories}
        >
          {i}
        </Button>
      );
    }
    return pageNumbers;
  };

  if (error) {
    return (
      <div className="text-center py-10 text-destructive-foreground bg-destructive/20 rounded-lg border border-destructive">
        <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
        <h3 className="mt-2 text-lg font-semibold">Error</h3>
        <p className="mt-1 text-sm text-destructive-foreground">
          An error occurred: {error.message}
        </p>
      </div>
    );
  }

  if (!isClient) {
    return null;
  }

  const isLoadingInitialData =
    isLoadingEntries || isLoadingOutlets || isLoadingCategories;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold font-headline">Food Cost Entries</h2>
        <Button
          onClick={handleAddNew}
          disabled={isLoadingOutlets || isLoadingCategories}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Entry
        </Button>
      </div>

      {isLoadingInitialData && currentItems.length === 0 ? (
        <div>
          <div className="rounded-lg border overflow-hidden shadow-md bg-card p-4">
            <Skeleton className="h-8 w-3/4 mb-4 bg-muted/50" />
            {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
              <div
                key={i}
                className="flex justify-between items-center p-4 border-b"
              >
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
          <div className="flex items-center justify-between mt-4 px-2">
            <Skeleton className="h-6 w-1/4 bg-muted" />
            <div className="flex items-center space-x-1">
              <Skeleton className="h-9 w-9 bg-muted rounded-md" />
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-9 w-9 bg-muted rounded-md" />
              ))}
              <Skeleton className="h-9 w-9 bg-muted rounded-md" />
            </div>
          </div>
        </div>
      ) : currentItems.length === 0 && !isLoadingInitialData ? (
        <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border">
          <ClipboardList className="mx-auto h-12 w-12 mb-4 text-primary" />
          <h3 className="mt-2 text-lg font-semibold">No Food Cost Entries</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started by creating a new food cost entry.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border overflow-hidden shadow-md bg-card">
            <Table className="whitespace-nowrap">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Outlet</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right w-[120px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {entry.date instanceof Date && isValid(entry.date)
                        ? format(entry.date, "PPP")
                        : "Invalid Date"}
                    </TableCell>
                    <TableCell>
                      {outlets.find((o) => o.id === entry.outlet_id)?.name ||
                        entry.outlet_id ||
                        "Unknown Outlet"}
                    </TableCell>
                    <TableCell className="text-right font-code">
                      ${(entry.total_food_cost || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(entry)}
                        className="mr-2 hover:text-primary"
                        disabled={isLoadingDetailsForEdit}
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit Entry</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete Entry</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center">
                              <AlertTriangle className="h-5 w-5 text-destructive mr-2" />
                              Are you sure?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will
                              permanently delete the food cost entry for{" "}
                              {entry.date instanceof Date && isValid(entry.date)
                                ? format(entry.date, "PPP")
                                : "this date"}{" "}
                              at{" "}
                              {outlets.find((o) => o.id === entry.outlet_id)
                                ?.name || "this outlet"}
                              .
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(entry.id)}
                              className="bg-destructive hover:bg-destructive/80 text-destructive-foreground"
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
                Showing {startIndexDisplay} to {endIndexDisplay} of{" "}
                {totalEntries} results
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={
                    currentPage === 1 ||
                    isLoadingEntries ||
                    isLoadingOutlets ||
                    isLoadingCategories
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous Page</span>
                </Button>
                {renderPageNumbers()}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={
                    currentPage === totalPages ||
                    isLoadingEntries ||
                    isLoadingOutlets ||
                    isLoadingCategories
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next Page</span>
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingEntry(null);
        }}
      >
        <DialogContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col bg-card"
        >
          <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b">
            <DialogTitle className="font-headline text-xl">
              {editingEntry
                ? "Edit Food Cost Entry"
                : "Add New Food Cost Entry"}
            </DialogTitle>
            <DialogDescription>
              {editingEntry
                ? `Update details for outlet: ${
                    outlets.find((o) => o.id === dialogOutletId)?.name ||
                    "Unknown"
                  } on ${
                    dialogDate && isValid(dialogDate)
                      ? format(dialogDate, "PPP")
                      : "selected date"
                  }`
                : "Enter the details for a new food cost entry."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-grow min-h-0 overflow-y-auto">
            {isClient && (outlets.length > 0 || isLoadingOutlets) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 pb-4 border-b">
                <div>
                  <Label
                    htmlFor="dialog-entry-date"
                    className="mb-1 block text-sm font-medium"
                  >
                    Date
                  </Label>
                  <DatePicker
                    date={
                      dialogDate && isValid(dialogDate) ? dialogDate : undefined
                    }
                    setDate={(newDate) =>
                      newDate && isValid(newDate) && setDialogDate(newDate)
                    }
                    id="dialog-entry-date"
                    className="w-full"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="dialog-entry-outlet"
                    className="mb-1 block text-sm font-medium"
                  >
                    Outlet
                  </Label>
                  {isLoadingOutlets ? (
                    <Skeleton className="h-10 w-full bg-muted" />
                  ) : (
                    <Select
                      value={dialogOutletId}
                      onValueChange={setDialogOutletId}
                    >
                      <SelectTrigger
                        id="dialog-entry-outlet"
                        className="w-full"
                      >
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
              {isClient &&
              (isLoadingOutlets || isLoadingCategories) &&
              !editingEntry &&
              (!dialogOutletId || !(dialogDate && isValid(dialogDate))) ? (
                <div className="flex justify-center items-center h-40">
                  <p className="text-muted-foreground">
                    {isLoadingOutlets || isLoadingCategories
                      ? "Loading selection options..."
                      : "Please select a date and outlet above to start."}
                  </p>
                </div>
              ) : (
                <FoodCostInputForm
                  key={
                    editingEntry
                      ? `${editingEntry.id}-${
                          dialogDate instanceof Date && isValid(dialogDate)
                            ? dialogDate.toISOString()
                            : "invalid-edit-date"
                        }-${dialogOutletId || "no-dialog-outlet"}`
                      : `new-${
                          dialogDate instanceof Date && isValid(dialogDate)
                            ? dialogDate.toISOString()
                            : "invalid-new-date"
                        }-${dialogOutletId || "no-dialog-outlet"}`
                  }
                  selectedDate={dialogDate}
                  selectedOutletId={
                    dialogOutletId || (outlets.length > 0 ? outlets[0].id : "")
                  }
                  foodCategories={foodCategories}
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
