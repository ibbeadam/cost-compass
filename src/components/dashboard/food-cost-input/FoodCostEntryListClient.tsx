"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  getFoodCategoriesAction,
  createFoodCostEntryAction,
  getAllFoodCostEntriesAction,
  getFoodCostEntryByIdAction,
} from "@/actions/foodCostActions";
import { getAllOutletsAction } from "@/actions/prismaOutletActions";
import { getPropertiesAction } from "@/actions/propertyActions";
import { useAuth } from "@/contexts/AuthContext";
import type { Outlet, Category, FoodCostEntry, FoodCostDetail, Property } from "@/types";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { normalizeDate } from "@/lib/utils";
import { RecordsPerPageSelector } from "@/components/ui/records-per-page-selector";
import { PermissionGate } from "@/components/auth/PermissionGate";

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
  const { user: sessionUser, userProfile } = useAuth();
  const user = userProfile || sessionUser; // Use userProfile for database info, fallback to sessionUser
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
  const [isLoadingImportProperties, setIsLoadingImportProperties] = useState(false);

  const [editingEntry, setEditingEntry] = useState<
    (FoodCostEntry & { details: FoodCostDetail[] }) | null
  >(null);
  
  // View dialog states
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingEntry, setViewingEntry] = useState<
    (FoodCostEntry & { details: FoodCostDetail[] }) | null
  >(null);
  const [isLoadingDetailsForView, setIsLoadingDetailsForView] = useState(false);

  // Import dialog states
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importedData, setImportedData] = useState<ExcelFoodCostRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedImportPropertyId, setSelectedImportPropertyId] = useState<number | undefined>(undefined);
  const [importProperties, setImportProperties] = useState<Property[]>([]);

  const [dialogDate, setDialogDate] = useState<Date>(new Date());

  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Remove duplicate - already defined above

  // File input ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchFoodCostEntries = useCallback(async () => {
    setIsLoadingEntries(true);
    try {
      const entries = await getAllFoodCostEntriesAction();
      // Ensure proper data transformation
      const transformedEntries = entries.map(entry => ({
        ...entry,
        id: Number(entry.id),
        date: entry.date instanceof Date ? entry.date : new Date(entry.date),
        outletId: Number(entry.outletId),
        totalFoodCost: Number(entry.totalFoodCost),
      }));
      setAllFoodCostEntries(transformedEntries);
      setCurrentPage(1);
      console.log("Fetched food cost entries:", transformedEntries.length, "entries");
    } catch (err) {
      console.error("Error fetching food cost entries:", err);
      showToast.error("Could not load food cost entries.");
      setError(err as Error);
    } finally {
      setIsLoadingEntries(false);
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      fetchFoodCostEntries();
    }
  }, [isClient, fetchFoodCostEntries]);

  const fetchOutletsAndCategories = useCallback(async () => {
    try {
      setIsLoadingOutlets(true);
      setIsLoadingCategories(true);
      const [outletsData, categoriesData] = await Promise.all([
        getAllOutletsAction(),
        getFoodCategoriesAction(),
      ]);
      setOutlets(outletsData);
      setFoodCategories(categoriesData);
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

  // Fetch properties for import when dialog opens
  useEffect(() => {
    if (isImportDialogOpen && user?.role === "super_admin") {
      setIsLoadingImportProperties(true);
      getPropertiesAction()
        .then(setImportProperties)
        .catch(console.error)
        .finally(() => setIsLoadingImportProperties(false));
    }
  }, [isImportDialogOpen, user?.role]);

  const handleAddNew = () => {
    setEditingEntry(null);
    setDialogDate(new Date());
    setIsFormOpen(true);
  };

  const handleEdit = async (listEntry: FoodCostEntry) => {
    if (!(listEntry.date instanceof Date) || !isValid(listEntry.date)) {
      showToast.error(`Cannot edit entry. The date for entry ID ${listEntry.id} is invalid. Please check the data. Date value: ${listEntry.date}`);
      return;
    }
    setIsLoadingDetailsForEdit(true);
    try {
      const fullEntryWithDetails = await getFoodCostEntryByIdAction(listEntry.id);
      if (fullEntryWithDetails) {
        setEditingEntry(fullEntryWithDetails as any);
        setDialogDate(
          fullEntryWithDetails.date instanceof Date
            ? fullEntryWithDetails.date
            : new Date(fullEntryWithDetails.date)
        );
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

  const handleView = async (listEntry: FoodCostEntry) => {
    if (!(listEntry.date instanceof Date) || !isValid(listEntry.date)) {
      showToast.error(`Cannot view entry. The date for entry ID ${listEntry.id} is invalid. Please check the data. Date value: ${listEntry.date}`);
      return;
    }
    
    console.log("Viewing entry:", listEntry.id, "Type:", typeof listEntry.id);
    setIsLoadingDetailsForView(true);
    
    try {
      const fullEntryWithDetails = await getFoodCostEntryByIdAction(Number(listEntry.id));
      console.log("Received entry details:", fullEntryWithDetails);
      
      if (fullEntryWithDetails) {
        setViewingEntry(fullEntryWithDetails as any);
        setIsViewDialogOpen(true);
      } else {
        showToast.error("Could not load the details for the selected entry. It might have been deleted.");
      }
    } catch (err) {
      console.error("Error in handleView:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load entry details for viewing.";
      showToast.error(errorMessage);
    } finally {
      setIsLoadingDetailsForView(false);
    }
  };

  const onFormSuccess = () => {
    setIsFormOpen(false);
    setEditingEntry(null);
    // Refresh the data
    fetchFoodCostEntries();
  };

  const handleDelete = async (entryId: number) => {
    if (!entryId || isNaN(entryId)) {
      console.error("Invalid entry ID:", entryId);
      showToast.error("Invalid entry ID. Cannot delete.");
      return;
    }

    try {
      console.log("Attempting to delete food cost entry with ID:", entryId, "Type:", typeof entryId);
      
      // Call the delete action
      const result = await deleteFoodCostEntryAction(entryId);
      console.log("Delete action result:", result);
      
      showToast.success("The food cost entry has been deleted.");
      
      // Refresh the data
      await fetchFoodCostEntries();
    } catch (err) {
      console.error("Error deleting food cost entry:", err);
      const errorMessage = err instanceof Error ? err.message : "Could not delete entry.";
      showToast.error(errorMessage);
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

            // Find outlet by name (case-insensitive and trim whitespace)
            const outlet = outlets.find(o => 
              o.name.toLowerCase().trim() === outletName.toLowerCase().trim()
            );
            if (!outlet) {
              const availableOutlets = outlets.map(o => o.name).join(', ');
              errors.push(`Row ${i + 1}: Outlet "${outletName}" not found. Available outlets: ${availableOutlets}`);
              continue;
            }

            // Process categories
            const categories: ExcelFoodCostRow['categories'] = [];
            for (const col of categoryColumns) {
              const costValue = parseFloat(row[col.costIndex]) || 0;
              if (costValue > 0) {
                // Find category by name (improved matching)
                const category = foodCategories.find(c => {
                  const categoryNameLower = c.name.toLowerCase().trim();
                  const colNameLower = col.categoryName.toLowerCase().trim();
                  return categoryNameLower === colNameLower ||
                         categoryNameLower.includes(colNameLower) ||
                         colNameLower.includes(categoryNameLower);
                });
                
                if (!category) {
                  const availableCategories = foodCategories.filter(c => c.type === 'Food').map(c => c.name).join(', ');
                  errors.push(`Row ${i + 1}: Food category "${col.categoryName}" not found. Available food categories: ${availableCategories}`);
                  continue;
                }

                categories.push({
                  category_id: category.id.toString(),
                  category_name: category.name,
                  cost: costValue,
                  description: col.descIndex ? String(row[col.descIndex] || '').trim() : undefined
                });
              }
            }

            if (categories.length > 0) {
              const excelRow: ExcelFoodCostRow = {
                date: date.toISOString().split('T')[0],
                outlet_id: outlet.id.toString(),
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
        
        // Reset property selection states
        setSelectedImportPropertyId(undefined);
        setImportProperties([]);
        
        // Load properties if super admin
        if (user?.role === "super_admin") {
          setIsLoadingImportProperties(true);
          getPropertiesAction()
            .then(setImportProperties)
            .catch(console.error)
            .finally(() => setIsLoadingImportProperties(false));
        }
      } catch (error) {
        showToast.error("Failed to read Excel file. Please ensure it's a valid Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportData = async () => {
    if (importedData.length === 0) return;

    // Validate property selection for super admin
    if (user?.role === "super_admin" && !selectedImportPropertyId) {
      showToast.error("Please select a property for import.");
      return;
    }

    setIsImporting(true);
    const errors: string[] = [];
    let successCount = 0;

    try {
      for (const row of importedData) {
        try {
          // Validate row data
          if (!row.categories || row.categories.length === 0) {
            errors.push(`${row.outlet_name} - ${row.date}: No valid categories found`);
            continue;
          }

          // Prepare details for the food cost entry
          const details = row.categories.map(cat => ({
            categoryId: Number(cat.category_id),
            categoryName: cat.category_name,
            cost: Number(cat.cost),
            description: cat.description || undefined,
          }));

          // Validate details
          const invalidDetails = details.filter(d => isNaN(d.categoryId) || isNaN(d.cost) || d.cost <= 0);
          if (invalidDetails.length > 0) {
            errors.push(`${row.outlet_name} - ${row.date}: Invalid category data found`);
            continue;
          }

          // Calculate total food cost
          const totalFoodCost = details.reduce((sum, detail) => sum + detail.cost, 0);

          if (totalFoodCost <= 0) {
            errors.push(`${row.outlet_name} - ${row.date}: Total cost must be greater than 0`);
            continue;
          }

          // Validate outlet ID
          const outletId = Number(row.outlet_id);
          if (isNaN(outletId)) {
            errors.push(`${row.outlet_name} - ${row.date}: Invalid outlet ID`);
            continue;
          }

          // Create food cost entry using correct function signature
          await createFoodCostEntryAction({
            date: normalizeDate(row.date),
            outletId,
            totalFoodCost,
            details,
            propertyId: user?.role === "super_admin" ? selectedImportPropertyId : undefined,
          });
          
          successCount++;
        } catch (error) {
          console.error('Import error for row:', row, error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to save';
          errors.push(`${row.outlet_name} - ${row.date}: ${errorMessage}`);
        }
      }

      if (successCount > 0) {
        showToast.success(`Successfully imported ${successCount} food cost entries.${errors.length > 0 ? ` ${errors.length} errors occurred.` : ''}`);
        fetchFoodCostEntries(); // Refresh the list
        if (errors.length === 0) {
          handleImportCancel();
        }
      }

      if (errors.length > 0) {
        setImportErrors(errors);
        if (successCount === 0) {
          showToast.error(`Import failed. ${errors.length} errors occurred.`);
        }
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
    setSelectedImportPropertyId(undefined);
    setImportProperties([]);
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

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const totalEntries = allFoodCostEntries.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / itemsPerPage));
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return allFoodCostEntries.slice(startIndex, startIndex + itemsPerPage);
  }, [allFoodCostEntries, currentPage, itemsPerPage]);

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
          <PermissionGate permissions={["financial.food_costs.read"]}>
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
          </PermissionGate>
          <PermissionGate permissions={["financial.food_costs.create"]}>
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
          </PermissionGate>
          <PermissionGate permissions={["financial.food_costs.create"]}>
            <Button
              onClick={handleAddNew}
              disabled={isLoadingOutlets || isLoadingCategories}
              size="sm"
              className="text-xs sm:text-sm"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Entry
            </Button>
          </PermissionGate>
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
                        entry.outletId ||
                        "Unknown Outlet"}
                    </TableCell>
                    {user?.role === "super_admin" && (
                      <TableCell>
                        {(entry as any).property?.name || (entry as any).property?.propertyCode || 
                         `Property ${(entry as any).propertyId || 'Unknown'}`}
                      </TableCell>
                    )}
                    <TableCell className="text-right font-code">
                      ${(entry.totalFoodCost || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <PermissionGate permissions={["financial.food_costs.read"]}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(entry)}
                          className="mr-1 hover:text-blue-600"
                          disabled={isLoadingDetailsForView}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View Entry</span>
                        </Button>
                      </PermissionGate>
                      <PermissionGate permissions={["financial.food_costs.update"]}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(entry)}
                          className="mr-1 hover:text-primary"
                          disabled={isLoadingDetailsForEdit}
                          title="Edit Entry"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit Entry</span>
                        </Button>
                      </PermissionGate>
                      <PermissionGate permissions={["financial.food_costs.delete"]}>
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
                              {outlets.find((o) => o.id === entry.outletId)
                                ?.name || "this outlet"}
                              .
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                console.log("Delete button clicked for entry:", entry.id, "Type:", typeof entry.id);
                                handleDelete(Number(entry.id));
                              }}
                              className="bg-destructive hover:bg-destructive/80 text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                      </PermissionGate>
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
                disabled={isLoadingEntries || isLoadingOutlets || isLoadingCategories}
              />
            </div>
            {totalPages > 1 && (
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
                ? "Edit Food Cost Entry"
                : "Add New Food Cost Entry"}
            </DialogTitle>
            <DialogDescription>
              {editingEntry
                ? `Update details for ${
                    dialogDate && isValid(dialogDate)
                      ? format(dialogDate, "PPP")
                      : "selected date"
                  }`
                : "Enter the details for a new food cost entry."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-grow min-h-0 overflow-y-auto">
            {isClient && (
              <div className="p-4 border-b">
                <div className="max-w-xs">
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
              </div>
            )}

            <div className="p-6">
              {isClient &&
              (isLoadingOutlets || isLoadingCategories) &&
              !editingEntry ? (
                <div className="flex justify-center items-center h-40">
                  <p className="text-muted-foreground">
                    Loading form options...
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
                        }`
                      : `new-${
                          dialogDate instanceof Date && isValid(dialogDate)
                            ? dialogDate.toISOString()
                            : "invalid-new-date"
                        }`
                  }
                  selectedDate={dialogDate}
                  outlets={outlets}
                  foodCategories={foodCategories}
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
              Import Food Cost Entries
            </DialogTitle>
            <DialogDescription>
              Review the data from your Excel file before importing. Make sure all dates, outlets, and categories are correct.
            </DialogDescription>
          </DialogHeader>
          
          {/* Property Selection for Import */}
          {importedData.length > 0 && (
            <div className="mb-4 p-4 border rounded-lg bg-muted">
              <h4 className="font-medium mb-3">Import Settings</h4>
              {user?.role === "super_admin" ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Property *</label>
                  <Select
                    value={selectedImportPropertyId ? String(selectedImportPropertyId) : ""}
                    onValueChange={(value) => setSelectedImportPropertyId(value ? parseInt(value) : undefined)}
                    disabled={isLoadingImportProperties}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={isLoadingImportProperties ? "Loading..." : "Select property for import"} />
                    </SelectTrigger>
                    <SelectContent>
                      {importProperties.map((property) => (
                        <SelectItem key={property.id} value={String(property.id)}>
                          {property.name} ({property.propertyCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    All imported records will be assigned to the selected property.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Property</label>
                  <div className="px-3 py-2 bg-background rounded-md border">
                    <span className="text-sm font-medium">
                      {(() => {
                        if (!user) return 'Loading user information...';
                        if (!user.propertyAccess) return 'Loading property access...';
                        
                        const accessibleProperty = user.propertyAccess.find(pa => pa.property?.isActive !== false);
                        if (accessibleProperty?.property) {
                          const { name, propertyCode } = accessibleProperty.property;
                          return name && propertyCode ? `${name} (${propertyCode})` : name || `Property ${accessibleProperty.propertyId}`;
                        }
                        
                        if (user.propertyAccess.length === 0) {
                          return 'No property assigned';
                        }
                        
                        return 'Loading property information...';
                      })()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All imported records will be assigned to your property.
                  </p>
                </div>
              )}
            </div>
          )}
          
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
              Food Cost Entry Details
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
                      ${(viewingEntry.totalFoodCost || 0).toFixed(2)}
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
                               foodCategories.find(c => c.id === detail.categoryId)?.name || 
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
                    <span>Total Food Cost:</span>
                    <span className="text-primary">
                      ${(viewingEntry.totalFoodCost || 0).toFixed(2)}
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
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsViewDialogOpen(false)}
              >
                Close
              </Button>
              {viewingEntry && (
                <Button
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    handleEdit(viewingEntry);
                  }}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Entry
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
