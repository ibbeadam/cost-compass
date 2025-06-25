"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import { format, isValid } from "date-fns";
import * as XLSX from 'xlsx';

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
import { showToast } from "@/lib/toast";
import {
  deleteFoodCostEntryAction,
  getFoodCostEntryWithDetailsAction,
  getOutletsAction,
  getFoodCategoriesAction,
  saveFoodCostEntryAction,
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

// Excel import interface for food cost entries
interface ExcelFoodCostRow {
  date: string;
  outlet_id: string;
  outlet_name?: string; // For display/validation
  categories: {
    category_id: string;
    category_name: string;
    cost: number;
    description?: string;
  }[];
}

export default function FoodCostEntryListClient() {
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

  // Excel import states
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importedData, setImportedData] = useState<ExcelFoodCostRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  // File input ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
        showToast.error("Could not load food cost entries.");
        setIsLoadingEntries(false);
        setError(err as Error);
      }
    );

    return () => unsubscribe();
  }, [isClient]);

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
      showToast.error((err as Error).message || "Could not load required data for the form.");
      setError(err as Error);
    } finally {
      setIsLoadingOutlets(false);
      setIsLoadingCategories(false);
    }
  }, [dialogOutletId]);

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
      showToast.error(`Cannot edit entry. The date for entry ID ${listEntry.id} is invalid. Please check the data. Date value: ${listEntry.date}`);
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
        showToast.error("Could not load the details for the selected entry. It might have been deleted.");
      }
    } catch (err) {
      showToast.error((err as Error).message || "Failed to load entry details for editing.");
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
      showToast.success("The food cost entry has been deleted.");
      // Data will be re-fetched by onSnapshot
    } catch (err) {
      console.error("Error deleting food cost entry:", err);
      showToast.error((err as Error).message || "Could not delete entry.");
    }
  };

  // Excel import functions
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Parse headers to identify categories
        const headers = jsonData[0] as string[];
        const processedData: ExcelFoodCostRow[] = [];
        const errors: string[] = [];

        // Find category columns dynamically
        const categoryColumns: { index: number; categoryName: string; costIndex: number; descIndex?: number }[] = [];
        
        for (let i = 2; i < headers.length; i++) {
          const header = String(headers[i]).trim();
          if (header.includes('_Cost') || header.includes(' Cost')) {
            const categoryName = header.replace(/_Cost|Cost/g, '').trim();
            const descIndex = headers.findIndex((h, idx) => idx > i && String(h).includes(categoryName) && (String(h).includes('Description') || String(h).includes('Desc')));
            
            categoryColumns.push({
              index: i,
              categoryName,
              costIndex: i,
              descIndex: descIndex > 0 ? descIndex : undefined
            });
          }
        }

        if (categoryColumns.length === 0) {
          errors.push("No category cost columns found. Expected columns with '_Cost' or ' Cost' suffix.");
        }

        // Process data rows
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length < 3) {
            errors.push(`Row ${i + 1}: Insufficient columns. Expected at least Date, Outlet, and category costs.`);
            continue;
          }

          try {
            const dateStr = String(row[0]).trim();
            const outletName = String(row[1]).trim();
            const date = new Date(dateStr);
            
            if (isNaN(date.getTime())) {
              errors.push(`Row ${i + 1}: Invalid date format - ${dateStr}`);
              continue;
            }

            // Find outlet by name
            const outlet = outlets.find(o => o.name.toLowerCase() === outletName.toLowerCase());
            if (!outlet) {
              errors.push(`Row ${i + 1}: Outlet "${outletName}" not found`);
              continue;
            }

            // Process categories
            const categories: ExcelFoodCostRow['categories'] = [];
            for (const col of categoryColumns) {
              const costValue = parseFloat(row[col.costIndex]) || 0;
              if (costValue > 0) {
                // Find category by name
                const category = foodCategories.find(c => 
                  c.name.toLowerCase().includes(col.categoryName.toLowerCase()) ||
                  col.categoryName.toLowerCase().includes(c.name.toLowerCase())
                );
                
                if (!category) {
                  errors.push(`Row ${i + 1}: Category "${col.categoryName}" not found`);
                  continue;
                }

                categories.push({
                  category_id: category.id,
                  category_name: category.name,
                  cost: costValue,
                  description: col.descIndex ? String(row[col.descIndex] || '').trim() : undefined
                });
              }
            }

            if (categories.length > 0) {
              const excelRow: ExcelFoodCostRow = {
                date: date.toISOString().split('T')[0],
                outlet_id: outlet.id,
                outlet_name: outlet.name,
                categories
              };

              processedData.push(excelRow);
            }
          } catch (error) {
            errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        setImportedData(processedData);
        setImportErrors(errors);
        setIsImportDialogOpen(true);
      } catch (error) {
        showToast.error("Failed to read Excel file. Please ensure it's a valid Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportData = async () => {
    if (importedData.length === 0) return;

    setIsImporting(true);
    const errors: string[] = [];
    let successCount = 0;

    try {
      for (const row of importedData) {
        try {
          // Create food cost entry using correct parameter format
          const items = row.categories.map(cat => ({
            categoryId: cat.category_id,
            cost: cat.cost,
            description: cat.description || undefined
          }));

          await saveFoodCostEntryAction(
            new Date(row.date),  // date parameter
            row.outlet_id,       // outletId parameter  
            items                // items parameter
          );
          successCount++;
        } catch (error) {
          errors.push(`${row.outlet_name} - ${row.date}: ${error instanceof Error ? error.message : 'Failed to save'}`);
        }
      }

      if (successCount > 0) {
        showToast.success(`Successfully imported ${successCount} food cost entries.${errors.length > 0 ? ` ${errors.length} errors occurred.` : ''}`);
        setIsImportDialogOpen(false);
        setImportedData([]);
        setImportErrors([]);
      }

      if (errors.length > 0) {
        setImportErrors(errors);
      }
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : "Failed to import data");
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportCancel = () => {
    setIsImportDialogOpen(false);
    setImportedData([]);
    setImportErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    if (foodCategories.length === 0) {
      showToast.error("Please wait for categories to load before downloading template.");
      return;
    }

    // Create dynamic headers based on available food categories
    const headers = ['Date', 'Outlet'];
    
    // Add category cost and description columns
    foodCategories.slice(0, 10).forEach(category => { // Limit to first 10 categories for Excel readability
      headers.push(`${category.name}_Cost`, `${category.name}_Description`);
    });

    // Create sample data
    const sampleData = ['2024-01-01', outlets[0]?.name || 'Sample Outlet'];
    foodCategories.slice(0, 10).forEach(() => {
      sampleData.push(100, 'Sample description'); // Sample cost and description
    });

    const template = [headers, sampleData];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Food Cost Template');
    
    XLSX.writeFile(wb, 'food_cost_import_template.xlsx');
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold font-headline">Food Cost Entries</h2>
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={downloadTemplate} 
            variant="outline" 
            size="sm" 
            className="text-xs sm:text-sm"
            disabled={isLoadingCategories || foodCategories.length === 0}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Download Template
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            variant="outline"
            size="sm"
            className="text-xs sm:text-sm"
            disabled={isLoadingOutlets || isLoadingCategories}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import Excel
          </Button>
          <Button
            onClick={handleAddNew}
            disabled={isLoadingOutlets || isLoadingCategories}
            size="sm"
            className="text-xs sm:text-sm"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Entry
          </Button>
        </div>
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

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col bg-card">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl flex items-center">
              <FileSpreadsheet className="mr-2 h-5 w-5" />
              Import Food Cost Entries
            </DialogTitle>
            <DialogDescription>
              Review the data from your Excel file before importing. Make sure all dates, outlets, and categories are correct.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-grow min-h-0 overflow-y-auto">
            {importErrors.length > 0 && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <h4 className="font-medium text-destructive mb-2">Import Errors ({importErrors.length})</h4>
                <div className="max-h-32 overflow-y-auto text-sm">
                  {importErrors.map((error, index) => (
                    <div key={index} className="text-destructive mb-1">• {error}</div>
                  ))}
                </div>
              </div>
            )}

            {importedData.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Preview ({importedData.length} records)</h4>
                  <div className="text-sm text-muted-foreground">
                    {importedData.length} food cost entries ready to import
                  </div>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Outlet</TableHead>
                          <TableHead>Categories</TableHead>
                          <TableHead className="text-right">Total Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importedData.slice(0, 10).map((row, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-code">{row.date}</TableCell>
                            <TableCell>{row.outlet_name}</TableCell>
                            <TableCell className="max-w-[200px]">
                              <div className="space-y-1">
                                {row.categories.slice(0, 3).map((cat, catIndex) => (
                                  <div key={catIndex} className="text-xs">
                                    {cat.category_name}: ${cat.cost.toFixed(2)}
                                  </div>
                                ))}
                                {row.categories.length > 3 && (
                                  <div className="text-xs text-muted-foreground">
                                    +{row.categories.length - 3} more...
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-code">
                              ${row.categories.reduce((sum, cat) => sum + cat.cost, 0).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {importedData.length > 10 && (
                    <div className="p-3 bg-muted/30 text-center text-sm text-muted-foreground">
                      Showing first 10 of {importedData.length} records
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleImportCancel} disabled={isImporting}>
              Cancel
            </Button>
            <Button 
              onClick={handleImportData} 
              disabled={isImporting || importedData.length === 0}
              className="min-w-[100px]"
            >
              {isImporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Importing...
                </>
              ) : (
                `Import ${importedData.length} Records`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
