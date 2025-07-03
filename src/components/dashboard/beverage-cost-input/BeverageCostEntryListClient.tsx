"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  PlusCircle,
  Edit,
  Trash2,
  AlertTriangle,
  GlassWater,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Upload,
  FileSpreadsheet,
  Eye,
} from "lucide-react";
import { format, isValid } from "date-fns";
import * as XLSX from 'xlsx';

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
  getAllBeverageCostEntriesAction,
  deleteBeverageCostEntryAction,
  getBeverageCostEntryByIdAction,
  getBeverageCategoriesAction,
  createBeverageCostEntryAction,
} from "@/actions/beverageCostActions";
import { getAllOutletsAction } from "@/actions/prismaOutletActions";
import { useAuth } from "@/contexts/AuthContext";
import type {
  Outlet,
  Category,
  BeverageCostEntry,
  BeverageCostDetail,
  Property,
} from "@/types";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { normalizeDate } from "@/lib/utils";
import { RecordsPerPageSelector } from "@/components/ui/records-per-page-selector";

// Excel import interface for beverage cost entries
interface ExcelBeverageCostRow {
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

export default function BeverageCostEntryListClient() {
  const { user: sessionUser, userProfile } = useAuth();
  const user = userProfile || sessionUser;
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const [allBeverageCostEntries, setAllBeverageCostEntries] = useState<
    BeverageCostEntry[]
  >([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [beverageCategories, setBeverageCategories] = useState<Category[]>([]);

  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [isLoadingOutlets, setIsLoadingOutlets] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingDetailsForEdit, setIsLoadingDetailsForEdit] = useState(false);

  const [editingEntry, setEditingEntry] = useState<
    (BeverageCostEntry & { details: BeverageCostDetail[] }) | null
  >(null);

  const [dialogDate, setDialogDate] = useState<Date>(normalizeDate(new Date()));

  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // View dialog states
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingEntry, setViewingEntry] = useState<(BeverageCostEntry & { details: BeverageCostDetail[] }) | null>(null);
  const [isLoadingDetailsForView, setIsLoadingDetailsForView] = useState(false);

  // Bulk import states
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreviewData, setImportPreviewData] = useState<ExcelBeverageCostRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // File input ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchBeverageCostEntries = useCallback(async () => {
    setIsLoadingEntries(true);
    try {
      const entries = await getAllBeverageCostEntriesAction();
      setAllBeverageCostEntries(entries);
      setCurrentPage(1);
    } catch (err) {
      console.error("Error fetching beverage cost entries:", err);
      showToast.error("Could not load beverage cost entries.");
      setError(err as Error);
    } finally {
      setIsLoadingEntries(false);
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      fetchBeverageCostEntries();
    }
  }, [isClient, fetchBeverageCostEntries]);

  const fetchOutletsAndCategories = useCallback(async () => {
    try {
      setIsLoadingOutlets(true);
      setIsLoadingCategories(true);
      const [outletsData, categoriesData] = await Promise.all([
        getAllOutletsAction(),
        getBeverageCategoriesAction(),
      ]);
      setOutlets(outletsData);
      setBeverageCategories(categoriesData);
    } catch (err) {
      console.error("Error fetching outlets or categories:", err);
      showToast.error((err as Error).message || "Could not load required data for the form.");
      setError(err as Error);
    } finally {
      setIsLoadingOutlets(false);
      setIsLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      fetchOutletsAndCategories();
    }
  }, [isClient, fetchOutletsAndCategories]);

  const handleAddNew = () => {
    setEditingEntry(null);
    setDialogDate(normalizeDate(new Date()));
    setIsFormOpen(true);
  };

  const handleEdit = async (listEntry: BeverageCostEntry) => {
    if (!(listEntry.date instanceof Date) || !isValid(listEntry.date)) {
      showToast.error(`Cannot edit entry. The date for entry ID ${listEntry.id} is invalid.`);
      return;
    }
    setIsLoadingDetailsForEdit(true);
    try {
      const fullEntryWithDetails = await getBeverageCostEntryByIdAction(listEntry.id);
      if (fullEntryWithDetails) {
        setEditingEntry(fullEntryWithDetails as any);
        setDialogDate(
          normalizeDate(
            fullEntryWithDetails.date instanceof Date
              ? fullEntryWithDetails.date
              : new Date(fullEntryWithDetails.date)
          )
        );
        setIsFormOpen(true);
      } else {
        showToast.error("Could not load details. It might have been deleted.");
      }
    } catch (err) {
      showToast.error((err as Error).message || "Failed to load entry details.");
    } finally {
      setIsLoadingDetailsForEdit(false);
    }
  };

  const onFormSuccess = () => {
    setIsFormOpen(false);
    setEditingEntry(null);
    fetchBeverageCostEntries(); // Refresh the list
  };

  const handleView = async (listEntry: BeverageCostEntry) => {
    setIsLoadingDetailsForView(true);
    try {
      const fullEntryWithDetails = await getBeverageCostEntryByIdAction(listEntry.id);
      if (fullEntryWithDetails) {
        setViewingEntry(fullEntryWithDetails as any);
        setIsViewDialogOpen(true);
      } else {
        showToast.error("Could not load entry details. It might have been deleted.");
      }
    } catch (err) {
      console.error("Error fetching beverage cost entry for view:", err);
      showToast.error((err as Error).message || "Failed to load entry details.");
    } finally {
      setIsLoadingDetailsForView(false);
    }
  };

  const handleDelete = async (entryId: number) => {
    try {
      await deleteBeverageCostEntryAction(entryId);
      showToast.success("The beverage cost entry has been deleted.");
      fetchBeverageCostEntries(); // Refresh the list
    } catch (err) {
      console.error("Error deleting beverage cost entry:", err);
      showToast.error((err as Error).message || "Could not delete entry.");
    }
  };

  // Bulk import functions
  const generateExcelTemplate = () => {
    if (beverageCategories.length === 0) {
      showToast.error("Please wait for categories to load before downloading template.");
      return;
    }

    // Create dynamic headers based on available beverage categories
    const headers = ['Date', 'Outlet'];
    
    // Add category cost and description columns
    beverageCategories.slice(0, 10).forEach(category => { // Limit to first 10 categories for Excel readability
      headers.push(`${category.name}_Cost`, `${category.name}_Description`);
    });

    // Create sample data
    const sampleData = ['2024-01-01', outlets[0]?.name || 'Sample Outlet'];
    beverageCategories.slice(0, 10).forEach(() => {
      sampleData.push(50, 'Sample description'); // Sample cost and description for beverages
    });

    const template = [headers, sampleData];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Beverage Cost Template');
    
    XLSX.writeFile(wb, 'beverage_cost_import_template.xlsx');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        parseExcelData(jsonData);
        setIsImportDialogOpen(true);
      } catch (error) {
        console.error('Error reading Excel file:', error);
        showToast.error('Error reading Excel file. Please check the format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const parseExcelData = (jsonData: any[]) => {
    const errors: string[] = [];
    const parsedData: ExcelBeverageCostRow[] = [];

    if (jsonData.length < 2) {
      errors.push('Excel file must contain at least header and one data row');
      setImportErrors(errors);
      return;
    }

    // Parse headers to identify categories (skip header row)
    const headers = jsonData[0] as string[];
    
    // Find category columns dynamically
    const categoryColumns: { index: number; categoryName: string; costIndex: number; descIndex?: number }[] = [];
    
    for (let i = 2; i < headers.length; i++) {
      const header = String(headers[i]).trim();
      if (header.endsWith('_Cost')) {
        const categoryName = header.replace('_Cost', '');
        const category = beverageCategories.find(c => c.name === categoryName);
        if (category) {
          const descIndex = headers.findIndex(h => h === `${categoryName}_Description`);
          categoryColumns.push({
            index: i,
            categoryName: category.name,
            costIndex: i,
            descIndex: descIndex >= 0 ? descIndex : undefined
          });
        }
      }
    }

    if (categoryColumns.length === 0) {
      errors.push('No valid category columns found. Expected format: CategoryName_Cost, CategoryName_Description');
      setImportErrors(errors);
      return;
    }

    // Process data rows (skip header)
    for (let rowIndex = 1; rowIndex < jsonData.length; rowIndex++) {
      const row = jsonData[rowIndex] as any[];
      const excelRowNumber = rowIndex + 1;
      
      const date = row[0];
      const outletName = row[1];
      
      // Validate required fields
      if (!date) {
        errors.push(`Row ${excelRowNumber}: Date is required`);
        continue;
      }
      
      if (!outletName) {
        errors.push(`Row ${excelRowNumber}: Outlet is required`);
        continue;
      }

      // Find outlet by name
      const outlet = outlets.find(o => o.name === outletName);
      if (!outlet) {
        errors.push(`Row ${excelRowNumber}: Outlet '${outletName}' not found`);
        continue;
      }

      // Parse categories from columns
      const categories: { category_id: string; category_name: string; cost: number; description?: string }[] = [];
      
      categoryColumns.forEach(col => {
        const cost = parseFloat(row[col.costIndex]) || 0;
        if (cost > 0) {
          const description = col.descIndex !== undefined ? String(row[col.descIndex] || '') : '';
          const category = beverageCategories.find(c => c.name === col.categoryName);
          if (category) {
            categories.push({
              category_id: category.id.toString(),
              category_name: category.name,
              cost: cost,
              description: description
            });
          }
        }
      });

      if (categories.length === 0) {
        errors.push(`Row ${excelRowNumber}: At least one category cost must be greater than 0`);
        continue;
      }

      parsedData.push({
        date: String(date),
        outlet_id: outlet.id.toString(),
        outlet_name: outlet.name,
        categories
      });
    }

    setImportErrors(errors);
    setImportPreviewData(parsedData);
  };

  const handleBulkImport = async () => {
    if (importPreviewData.length === 0) {
      showToast.error('No valid data to import');
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;
    const detailedErrors: string[] = [];

    try {
      for (const row of importPreviewData) {
        try {
          const date = normalizeDate(row.date);
          const items = row.categories.map(cat => ({
            categoryId: Number(cat.category_id),
            categoryName: cat.category_name,
            cost: cat.cost,
            description: cat.description || ''
          }));

          await createBeverageCostEntryAction({
            date,
            outletId: Number(row.outlet_id),
            totalBeverageCost: row.categories.reduce((sum, cat) => sum + cat.cost, 0),
            details: items,
          });
          successCount++;
        } catch (error) {
          errorCount++;
          detailedErrors.push(`${row.outlet_name} - ${row.date}: ${(error as Error).message}`);
        }
      }

      if (successCount > 0) {
        showToast.success(`Successfully imported ${successCount} beverage cost entries.${errorCount > 0 ? ` ${errorCount} errors occurred.` : ''}`);
        // Refresh the entries list after successful import
        fetchBeverageCostEntries();
        
        // Close dialog and reset state if no errors
        if (errorCount === 0) {
          setIsImportDialogOpen(false);
          setImportPreviewData([]);
          setImportErrors([]);
          setImportFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      }

      if (errorCount > 0) {
        setImportErrors(detailedErrors);
        if (successCount === 0) {
          showToast.error(`Import failed. ${errorCount} errors occurred.`);
        }
      }
    } catch (error) {
      console.error('Bulk import error:', error);
      showToast.error('An error occurred during bulk import');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportCancel = () => {
    setIsImportDialogOpen(false);
    setImportPreviewData([]);
    setImportErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const totalEntries = allBeverageCostEntries.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / itemsPerPage));
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return allBeverageCostEntries.slice(
      startIndex,
      startIndex + itemsPerPage
    );
  }, [allBeverageCostEntries, currentPage, itemsPerPage]);

  const startIndexDisplay =
    totalEntries > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndexDisplay =
    totalEntries > 0 ? Math.min(currentPage * itemsPerPage, totalEntries) : 0;

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

  if (!isClient) return null;

  const isLoadingInitialData =
    isLoadingEntries || isLoadingOutlets || isLoadingCategories;
  const isLoading = isLoadingInitialData || isLoadingDetailsForEdit;

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold font-headline">Beverage Cost Entries</h2>
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={generateExcelTemplate} 
            variant="outline" 
            size="sm" 
            className="text-xs sm:text-sm"
            disabled={isLoadingCategories || beverageCategories.length === 0}
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
            {[...Array(itemsPerPage)].map((_, i) => (
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
          <h3 className="mt-2 text-lg font-semibold">
            No Beverage Cost Entries
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started by creating a new beverage cost entry.
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
                  {user?.role === "super_admin" && <TableHead>Property</TableHead>}
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
                      {outlets.find((o) => o.id === entry.outletId)?.name ||
                        "Unknown Outlet"}
                    </TableCell>
                    {user?.role === "super_admin" && (
                      <TableCell>
                        {(entry as any).property?.name && (entry as any).property?.propertyCode
                          ? `${(entry as any).property.name} (${(entry as any).property.propertyCode})`
                          : (entry as any).property?.name || 
                            (entry as any).property?.propertyCode || 
                            `Property ${(entry as any).propertyId || 'Unknown'}`}
                      </TableCell>
                    )}
                    <TableCell className="text-right font-code">
                      ${(entry.totalBeverageCost || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleView(entry)}
                        className="mr-2 hover:text-blue-600"
                        disabled={isLoadingDetailsForView}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View Entry</span>
                      </Button>
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
                              permanently delete the beverage cost entry for{" "}
                              {entry.date instanceof Date && isValid(entry.date)
                                ? format(entry.date, "PPP")
                                : "this date"}{" "}
                              at{" "}
                              {outlets.find((o) => o.id === entry.outletId)
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4 px-2">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndexDisplay} to {endIndexDisplay} of{" "}
                {totalEntries} results
              </div>
              <RecordsPerPageSelector
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
                disabled={isLoading}
              />
            </div>
            {totalPages > 1 && (
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1 || isLoading}
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
                  disabled={currentPage === totalPages || isLoading}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next Page</span>
                </Button>
              </div>
            )}
          </div>
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
                ? "Edit Beverage Cost Entry"
                : "Add New Beverage Cost Entry"}
            </DialogTitle>
            <DialogDescription>
              {editingEntry
                ? `Update beverage cost entry for ${
                    dialogDate && isValid(dialogDate)
                      ? format(dialogDate, "PPP")
                      : "selected date"
                  }`
                : "Enter the details for a new beverage cost entry."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-grow min-h-0 overflow-y-auto">
            {isClient && (
              <div className="p-6 pb-4 border-b">
                <div className="max-w-sm">
                  <Label
                    htmlFor="dialog-beverage-entry-date"
                    className="mb-1 block text-sm font-medium"
                  >
                    Date
                  </Label>
                  <DatePicker
                    date={
                      dialogDate && isValid(dialogDate) ? dialogDate : undefined
                    }
                    setDate={(newDate) =>
                      newDate && isValid(newDate) && setDialogDate(normalizeDate(newDate))
                    }
                    id="dialog-beverage-entry-date"
                    className="w-full"
                  />
                </div>
              </div>
            )}

            <div className="p-6">
              {isClient &&
              (isLoadingOutlets || isLoadingCategories) &&
              !editingEntry ? (
                <div className="flex justify-center items-center h-40">
                  <p className="text-muted-foreground">
                    {isLoadingOutlets || isLoadingCategories
                      ? "Loading selection options..."
                      : "Please select a date to start."}
                  </p>
                </div>
              ) : (
                <BeverageCostInputForm
                  key={
                    editingEntry
                      ? `${editingEntry.id}-${
                          dialogDate instanceof Date && isValid(dialogDate)
                            ? dialogDate.toISOString()
                            : "invalid-edit-date"
                        }`
                      : `new-${
                          dialogDate instanceof Date && isValid(dialogDate)
                            ? dialogDate.toISOString()
                            : "invalid-new-date"
                        }`
                  }
                  selectedDate={dialogDate}
                  outlets={outlets}
                  beverageCategories={beverageCategories}
                  existingEntry={editingEntry}
                  onSuccess={onFormSuccess}
                  user={user}
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
              Import Beverage Cost Entries
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

            {importPreviewData.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Preview ({importPreviewData.length} records)</h4>
                  <div className="text-sm text-muted-foreground">
                    {importPreviewData.length} beverage cost entries ready to import
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
                        {importPreviewData.slice(0, 10).map((row, index) => (
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
                  {importPreviewData.length > 10 && (
                    <div className="p-3 bg-muted/30 text-center text-sm text-muted-foreground">
                      Showing first 10 of {importPreviewData.length} records
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
              onClick={handleBulkImport} 
              disabled={isImporting || importPreviewData.length === 0}
              className="min-w-[100px]"
            >
              {isImporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Importing...
                </>
              ) : (
                `Import ${importPreviewData.length} Records`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog 
        open={isViewDialogOpen} 
        onOpenChange={(open) => {
          setIsViewDialogOpen(open);
          if (!open) setViewingEntry(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col bg-card">
          <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b">
            <DialogTitle className="font-headline text-xl flex items-center">
              <Eye className="mr-2 h-5 w-5" />
              Beverage Cost Entry Details
            </DialogTitle>
            <DialogDescription>
              {viewingEntry ? (
                <>
                  Entry for {viewingEntry.date instanceof Date && isValid(viewingEntry.date)
                    ? format(viewingEntry.date, "PPP")
                    : "Invalid Date"} at {
                    outlets.find((o) => o.id === viewingEntry.outletId)?.name || "Unknown Outlet"
                  }
                </>
              ) : (
                "Loading entry details..."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-grow min-h-0 overflow-y-auto p-6">
            {viewingEntry ? (
              <div className="space-y-6">
                {/* Entry Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date</label>
                    <div className="text-base font-medium">
                      {viewingEntry.date instanceof Date && isValid(viewingEntry.date)
                        ? format(viewingEntry.date, "PPP")
                        : "Invalid Date"}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Outlet</label>
                    <div className="text-base font-medium">
                      {(viewingEntry as any).outlet?.name || "Unknown Outlet"}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Property</label>
                    <div className="text-base font-medium">
                      {(viewingEntry as any).property?.name && (viewingEntry as any).property?.propertyCode
                        ? `${(viewingEntry as any).property.name} (${(viewingEntry as any).property.propertyCode})`
                        : (viewingEntry as any).property?.name || 
                          (viewingEntry as any).property?.propertyCode || 
                          `Property ${(viewingEntry as any).propertyId || 'Unknown'}`}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Total Cost</label>
                    <div className="text-lg font-bold text-primary">
                      ${(viewingEntry.totalBeverageCost || 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Audit Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Creation Details */}
                  <div className="p-4 border rounded-lg bg-muted/20">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3">Creation Details</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Created At</label>
                        <div className="text-sm font-medium">
                          {viewingEntry.createdAt ? (
                            <>
                              <div>{format(new Date(viewingEntry.createdAt), "PPP")}</div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(viewingEntry.createdAt), "p")}
                              </div>
                            </>
                          ) : (
                            "Not available"
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Created By</label>
                        <div className="text-sm font-medium">
                          {(viewingEntry as any).createdByUser ? (
                            <>
                              <div>{(viewingEntry as any).createdByUser.name || 'Unknown User'}</div>
                              <div className="text-xs text-muted-foreground">
                                {(viewingEntry as any).createdByUser.email}
                              </div>
                            </>
                          ) : (
                            "System"
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Update Details */}
                  <div className="p-4 border rounded-lg bg-muted/20">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3">Last Updated</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Updated At</label>
                        <div className="text-sm font-medium">
                          {viewingEntry.updatedAt ? (
                            <>
                              <div>{format(new Date(viewingEntry.updatedAt), "PPP")}</div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(viewingEntry.updatedAt), "p")}
                              </div>
                            </>
                          ) : (
                            "Not available"
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Updated By</label>
                        <div className="text-sm font-medium">
                          {(viewingEntry as any).updatedByUser ? (
                            <>
                              <div>{(viewingEntry as any).updatedByUser.name || 'Unknown User'}</div>
                              <div className="text-xs text-muted-foreground">
                                {(viewingEntry as any).updatedByUser.email}
                              </div>
                            </>
                          ) : (
                            "Same as creator"
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cost Breakdown */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Cost Breakdown</h3>
                  {viewingEntry.details && viewingEntry.details.length > 0 ? (
                    <div className="space-y-3">
                      {viewingEntry.details.map((detail, index) => (
                        <div key={detail.id || index} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                          <div className="flex-grow">
                            <div className="font-medium">
                              {detail.categoryName || 
                               beverageCategories.find(c => c.id === detail.categoryId)?.name || 
                               `Category ${detail.categoryId}`}
                            </div>
                            {detail.description && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {detail.description}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">
                              ${detail.cost.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No cost details available for this entry.
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total Beverage Cost:</span>
                    <span className="text-primary">
                      ${(viewingEntry.totalBeverageCost || 0).toFixed(2)}
                    </span>
                  </div>
                  {viewingEntry.details && viewingEntry.details.length > 0 && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {viewingEntry.details.length} item{viewingEntry.details.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center h-40">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Loading entry details...</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 p-6 border-t">
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => setIsViewDialogOpen(false)}
                className="min-w-[100px]"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
