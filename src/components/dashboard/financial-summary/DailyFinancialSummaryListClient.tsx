"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Timestamp } from "firebase/firestore";
import { PlusCircle, Edit, Trash2, AlertTriangle, DollarSign, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Upload, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from 'xlsx';

import type { DailyFinancialSummary, FoodCostEntry, FoodCostDetail, BeverageCostEntry, BeverageCostDetail } from "@/types";
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
import DailyFinancialSummaryForm from "./DailyFinancialSummaryForm";
import DailyFinancialSummaryDetailDialog from "./DailyFinancialSummaryDetailDialog";
import { showToast } from "@/lib/toast";
import { deleteDailyFinancialSummaryAction, getPaginatedDailyFinancialSummariesAction, saveDailyFinancialSummaryAction } from "@/actions/dailyFinancialSummaryActions";
import { getFoodCostEntriesForDateAction } from "@/actions/foodCostActions";
import { getBeverageCostEntriesForDateAction } from "@/actions/beverageCostActions";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils";

const ITEMS_PER_PAGE = 10;

const convertTimestampsToDates = (entry: DailyFinancialSummary): DailyFinancialSummary => {
  return {
    ...entry,
    date: entry.date instanceof Timestamp ? entry.date.toDate() : new Date(entry.date as any),
    createdAt: entry.createdAt && entry.createdAt instanceof Timestamp ? entry.createdAt.toDate() : (entry.createdAt ? new Date(entry.createdAt as any) : undefined),
    updatedAt: entry.updatedAt && entry.updatedAt instanceof Timestamp ? entry.updatedAt.toDate() : (entry.updatedAt ? new Date(entry.updatedAt as any) : undefined),
  };
};

// Excel import interface
interface ExcelRow {
  date: string;
  actual_food_revenue: number;
  budget_food_revenue: number;
  budget_food_cost: number;
  budget_food_cost_pct: number;
  ent_food?: number;
  oc_food?: number;
  other_food_adjustment?: number;
  actual_beverage_revenue: number;
  budget_beverage_revenue: number;
  budget_beverage_cost: number;
  budget_beverage_cost_pct: number;
  entertainment_beverage_cost?: number;
  officer_check_comp_beverage?: number;
  other_beverage_adjustments?: number;
  notes?: string;
}

export default function DailyFinancialSummaryListClient() {
  const [allSummaries, setAllSummaries] = useState<DailyFinancialSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSummary, setEditingSummary] = useState<DailyFinancialSummary | null>(null);
  
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedSummaryForDetail, setSelectedSummaryForDetail] = useState<DailyFinancialSummary | null>(null);
  const [detailedFoodCosts, setDetailedFoodCosts] = useState<(FoodCostEntry & { details: FoodCostDetail[]; outletName?: string })[]>([]);
  const [detailedBeverageCosts, setDetailedBeverageCosts] = useState<(BeverageCostEntry & { details: BeverageCostDetail[]; outletName?: string })[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Excel import states
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importedData, setImportedData] = useState<ExcelRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalSummaries, setTotalSummaries] = useState(0);

  // File input ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchAllSummaries = useCallback(async () => {
    setIsLoading(true);
    try {
      const { summaries: fetchedSummaries, totalCount } = await getPaginatedDailyFinancialSummariesAction(undefined, undefined, true);
      setAllSummaries(fetchedSummaries.map(convertTimestampsToDates));
      setTotalSummaries(totalCount);
      setCurrentPage(1); 
    } catch (error) {
      showToast.error((error as Error).message || "Could not load daily financial summaries.");
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchAllSummaries();
  }, [fetchAllSummaries]);
  
  const handleAddNew = () => {
    setEditingSummary(null);
    setIsFormOpen(true);
  };

  const handleEdit = (summary: DailyFinancialSummary) => {
    setEditingSummary(summary);
    setIsFormOpen(true);
  };

  const handleViewDetails = async (summary: DailyFinancialSummary) => {
    setSelectedSummaryForDetail(summary);
    setIsLoadingDetails(true);
    setIsDetailDialogOpen(true);
    try {
      if (summary.date) {
        const targetDate = summary.date instanceof Date ? summary.date : 
          summary.date instanceof Timestamp ? summary.date.toDate() : 
          new Date(summary.date as string | number);
        const [foodDetails, beverageDetails] = await Promise.all([
            getFoodCostEntriesForDateAction(targetDate),
            getBeverageCostEntriesForDateAction(targetDate)
        ]);
        setDetailedFoodCosts(foodDetails);
        setDetailedBeverageCosts(beverageDetails);
      } else {
        setDetailedFoodCosts([]);
        setDetailedBeverageCosts([]);
      }
    } catch (error) {
      showToast.error((error as Error).message || "Could not load detailed costs.");
      setDetailedFoodCosts([]);
      setDetailedBeverageCosts([]);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleDelete = async (summaryId: string) => {
    try {
      await deleteDailyFinancialSummaryAction(summaryId);
      fetchAllSummaries();
      showToast.success("The daily financial summary has been deleted.");
    } catch (error) {
      showToast.error((error as Error).message || "Could not delete summary.");
    }
  };

  const onFormSuccess = () => {
    setIsFormOpen(false);
    setEditingSummary(null);
    fetchAllSummaries();
  };

  const onFormCancel = () => {
    setIsFormOpen(false);
    setEditingSummary(null);
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

        // Skip header row and process data
        const processedData: ExcelRow[] = [];
        const errors: string[] = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length < 15) {
            errors.push(`Row ${i + 1}: Insufficient number of columns. Expected at least 15, got ${row?.length || 0}.`);
            continue;
          }

          try {
            const dateStr = String(row[0]).trim();
            const date = new Date(dateStr);
            
            if (isNaN(date.getTime())) {
              errors.push(`Row ${i + 1}: Invalid date format - ${dateStr}`);
              continue;
            }

            const excelRow: ExcelRow = {
              date: date.toISOString().split('T')[0], // YYYY-MM-DD format
              actual_food_revenue: parseFloat(row[1]) || 0,
              budget_food_revenue: parseFloat(row[2]) || 0,
              budget_food_cost: parseFloat(row[3]) || 0,
              budget_food_cost_pct: parseFloat(row[4]) || 0,
              ent_food: parseFloat(row[5]) || 0,
              oc_food: parseFloat(row[6]) || 0,
              other_food_adjustment: parseFloat(row[7]) || 0,
              actual_beverage_revenue: parseFloat(row[8]) || 0,
              budget_beverage_revenue: parseFloat(row[9]) || 0,
              budget_beverage_cost: parseFloat(row[10]) || 0,
              budget_beverage_cost_pct: parseFloat(row[11]) || 0,
              entertainment_beverage_cost: parseFloat(row[12]) || 0,
              officer_check_comp_beverage: parseFloat(row[13]) || 0,
              other_beverage_adjustments: parseFloat(row[14]) || 0,
              notes: row[15] ? String(row[15]) : undefined,
            };

            processedData.push(excelRow);
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
          const summaryData = {
            date: new Date(row.date),
            actual_food_revenue: row.actual_food_revenue,
            budget_food_revenue: row.budget_food_revenue,
            budget_food_cost: row.budget_food_cost,
            budget_food_cost_pct: row.budget_food_cost_pct,
            ent_food: row.ent_food,
            oc_food: row.oc_food,
            other_food_adjustment: row.other_food_adjustment,
            actual_beverage_revenue: row.actual_beverage_revenue,
            budget_beverage_revenue: row.budget_beverage_revenue,
            budget_beverage_cost: row.budget_beverage_cost,
            budget_beverage_cost_pct: row.budget_beverage_cost_pct,
            entertainment_beverage_cost: row.entertainment_beverage_cost,
            officer_check_comp_beverage: row.officer_check_comp_beverage,
            other_beverage_adjustments: row.other_beverage_adjustments,
            notes: row.notes,
            actual_food_cost: 0,
            actual_beverage_cost: 0,
            actual_food_cost_pct: 0,
            actual_beverage_cost_pct: 0,
            food_variance_pct: 0,
            beverage_variance_pct: 0,
          };

          await saveDailyFinancialSummaryAction(summaryData);
          successCount++;
        } catch (error) {
          errors.push(`Date ${row.date}: ${error instanceof Error ? error.message : 'Failed to save'}`);
        }
      }

      if (successCount > 0) {
        showToast.success(`Successfully imported ${successCount} summaries.${errors.length > 0 ? ` ${errors.length} errors occurred.` : ''}`);
        fetchAllSummaries();
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
    const template = [
      ['Date', 'Actual Food Revenue', 'Budget Food Revenue', 'Budget Food Cost', 'Budget Food Cost %', 'Entertainment Food Cost', 'Officer\'s Check / Comp Food', 'Other Food Adjustments', 'Actual Beverage Revenue', 'Budget Beverage Revenue', 'Budget Beverage Cost', 'Budget Beverage Cost %', 'Entertainment Beverage Cost', 'Officer\'s Check / Comp Beverage', 'Other Beverage Adjustments', 'Notes'],
      ['2024-01-01', 5000, 4800, 1500, 30, 100, 50, 20, 2000, 1900, 500, 25, 60, 30, 10, 'Sample data for all fields'],
      ['2024-01-02', 5500, 5200, 1650, 30, 120, 60, 25, 2200, 2100, 550, 25, 70, 35, 12, 'Another sample row'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Summary Template');
    
    XLSX.writeFile(wb, 'daily_financial_summary_template.xlsx');
  };

  const renderPercentage = (value: number | null | undefined) => {
    if (value == null) return <span className="text-muted-foreground">-</span>;
    return `${formatNumber(value)}%`;
  };

  const renderCurrency = (value: number | null | undefined) => {
    if (value == null) return <span className="text-muted-foreground">-</span>;
    return `$${formatNumber(value)}`;
  };

  const getVarianceColor = (variance: number | null | undefined) => {
    if (variance == null) return "";
    if (variance > 0) return "text-destructive"; 
    if (variance < 0) return "text-green-600 dark:text-green-500"; 
    return ""; 
  };
  
  const getActualCostColor = (actualPct: number | null | undefined, budgetPct: number | null | undefined) => {
    if (actualPct == null || budgetPct == null) return "";
    if (actualPct > budgetPct) return "text-destructive";
    if (actualPct < budgetPct) return "text-green-600 dark:text-green-500";
    return "";
  };

  const totalPages = Math.max(1, Math.ceil(totalSummaries / ITEMS_PER_PAGE));
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return allSummaries.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [allSummaries, currentPage]);

  const startIndexDisplay = totalSummaries > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const endIndexDisplay = totalSummaries > 0 ? Math.min(currentPage * ITEMS_PER_PAGE, totalSummaries) : 0;

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

  if (isLoading && allSummaries.length === 0) { 
    return (
      <div className="w-full">
        <div className="flex justify-end mb-4"> 
          <Skeleton className="h-10 w-52 bg-muted" /> 
        </div>
        {/* Scrollable skeleton table */}
        <div className="w-full border rounded-lg shadow-md bg-card">
          <div className="overflow-x-auto">
            <table className="w-full caption-bottom text-sm min-w-[1200px]">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  {[...Array(11)].map((_, i) => (
                    <th key={i} className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      <Skeleton className="h-6 w-full bg-muted/50" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
                  <tr key={i} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    {[...Array(10)].map((_, j) => (
                      <td key={j} className="p-4 align-middle">
                        <Skeleton className="h-6 w-full bg-muted" />
                      </td>
                    ))}
                    <td className="p-4 align-middle">
                      <div className="flex justify-end gap-1">
                        <Skeleton className="h-8 w-8 bg-muted rounded-md" /> 
                        <Skeleton className="h-8 w-8 bg-muted rounded-md" /> 
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    <div className="w-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={downloadTemplate} variant="outline" size="sm" className="text-xs sm:text-sm">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Download Template
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
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
          >
            <Upload className="mr-2 h-4 w-4" />
            Import Excel
          </Button>
          <Button onClick={handleAddNew} size="sm" className="text-xs sm:text-sm"> 
            <PlusCircle className="mr-2 h-4 w-4" /> 
            Add New Daily Summary 
          </Button>
        </div>
      </div>

      {currentItems.length === 0 && !isLoading ? (
        <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border">
          <DollarSign className="mx-auto h-12 w-12 mb-4 text-primary" />
          <p className="text-lg font-medium">No daily financial summaries found.</p>
          <p>Click "Add New Daily Summary" to get started.</p>
        </div>
      ) : (
        <div className="w-full border rounded-lg shadow-md bg-card">
          <div className="overflow-x-auto w-full">
            <Table className="min-w-[1000px] w-full text-sm text-left border-collapse devide-y devide-border">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-headline cursor-pointer hover:text-primary whitespace-nowrap px-2 py-3" onClick={() => showToast.info("Click any data cell in a row to view full details.")}>
                    Date
                  </TableHead>
                  <TableHead className="font-headline text-right whitespace-nowrap px-2 py-3">Act. Food Rev.</TableHead>
                  <TableHead className="font-headline text-right whitespace-nowrap px-2 py-3">Act. Food Cost</TableHead>
                  <TableHead className="font-headline text-right whitespace-nowrap px-2 py-3">Act. Food %</TableHead>
                  <TableHead className="font-headline text-right whitespace-nowrap px-2 py-3">Food Var. %</TableHead>
                  <TableHead className="font-headline text-right whitespace-nowrap px-2 py-3">Act. Bev Rev.</TableHead>
                  <TableHead className="font-headline text-right whitespace-nowrap px-2 py-3">Act. Bev Cost</TableHead>
                  <TableHead className="font-headline text-right whitespace-nowrap px-2 py-3">Act. Bev %</TableHead>
                  <TableHead className="font-headline text-right whitespace-nowrap px-2 py-3">Bev Var. %</TableHead>
                  <TableHead className="font-headline w-[100px] text-right whitespace-nowrap px-2 py-3">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.map((summary) => (
                  <TableRow key={summary.id} className="hover:bg-muted/30 cursor-pointer">
                    <TableCell className="font-code whitespace-nowrap px-2 py-3" onClick={() => handleViewDetails(summary)}>
                      {summary.date instanceof Date ? format(summary.date, "PPP") : summary.id}
                    </TableCell>
                    <TableCell className="text-right font-code whitespace-nowrap px-2 py-3" onClick={() => handleViewDetails(summary)}>
                      {renderCurrency(summary.actual_food_revenue)}
                    </TableCell>
                    <TableCell className="text-right font-code font-semibold whitespace-nowrap px-2 py-3" onClick={() => handleViewDetails(summary)}>
                      {renderCurrency(summary.actual_food_cost)}
                    </TableCell>
                    <TableCell className={cn("text-right font-code font-semibold whitespace-nowrap px-2 py-3", getActualCostColor(summary.actual_food_cost_pct, summary.budget_food_cost_pct))} onClick={() => handleViewDetails(summary)}>
                      {renderPercentage(summary.actual_food_cost_pct)}
                    </TableCell>
                    <TableCell className={cn("text-right font-code font-semibold whitespace-nowrap px-2 py-3", getVarianceColor(summary.food_variance_pct))} onClick={() => handleViewDetails(summary)}>
                      {summary.food_variance_pct != null && summary.food_variance_pct !== 0 ? (summary.food_variance_pct > 0 ? <TrendingUp className="inline h-4 w-4 mr-1" /> : <TrendingDown className="inline h-4 w-4 mr-1" />) : null}
                      {renderPercentage(summary.food_variance_pct)}
                    </TableCell>
                    <TableCell className="text-right font-code whitespace-nowrap px-2 py-3" onClick={() => handleViewDetails(summary)}>
                      {renderCurrency(summary.actual_beverage_revenue)}
                    </TableCell>
                    <TableCell className="text-right font-code font-semibold whitespace-nowrap px-2 py-3" onClick={() => handleViewDetails(summary)}>
                      {renderCurrency(summary.actual_beverage_cost)}
                    </TableCell>
                    <TableCell className={cn("text-right font-code font-semibold whitespace-nowrap px-2 py-3", getActualCostColor(summary.actual_beverage_cost_pct, summary.budget_beverage_cost_pct))} onClick={() => handleViewDetails(summary)}>
                      {renderPercentage(summary.actual_beverage_cost_pct)}
                    </TableCell>
                    <TableCell className={cn("text-right font-code font-semibold whitespace-nowrap px-2 py-3", getVarianceColor(summary.beverage_variance_pct))} onClick={() => handleViewDetails(summary)}>
                      {summary.beverage_variance_pct != null && summary.beverage_variance_pct !== 0 ? (summary.beverage_variance_pct > 0 ? <TrendingUp className="inline h-4 w-4 mr-1" /> : <TrendingDown className="inline h-4 w-4 mr-1" />) : null}
                      {renderPercentage(summary.beverage_variance_pct)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap px-2 py-3">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(summary)} className="mr-1 hover:text-primary h-9 w-9">
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="hover:text-destructive h-9 w-9">
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center">
                              <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
                              Are you sure?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the summary for {summary.date instanceof Date ? format(summary.date, "PPP") : summary.id}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(summary.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
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
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 px-2">
          <div className="text-sm text-muted-foreground text-center sm:text-left">
            Showing {startIndexDisplay} to {endIndexDisplay} of {totalSummaries} results
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9"
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
              className="h-8 w-8 sm:h-9 sm:w-9"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next Page</span>
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={(open) => {if (!open) { setEditingSummary(null); setIsFormOpen(false); } else { setIsFormOpen(open); }}}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[90vh] flex flex-col bg-card">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl">{editingSummary ? "Edit" : "Add New"} Daily Financial Summary</DialogTitle>
            <DialogDescription>
              {editingSummary ? `Update summary for ${editingSummary.date instanceof Date ? format(editingSummary.date, "PPP") : editingSummary.id}.` : "Enter details for a new daily summary."}
              {" Calculated fields (actual costs, variances) are updated when Food/Beverage Cost Entries are saved or when this summary is saved."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow min-h-0 overflow-y-auto">
            <DailyFinancialSummaryForm
              key={editingSummary ? editingSummary.id : 'new-summary'}
              initialData={editingSummary}
              onSuccess={onFormSuccess}
              onCancel={onFormCancel}
            />
          </div>
        </DialogContent>
      </Dialog>

      {selectedSummaryForDetail && (
        <DailyFinancialSummaryDetailDialog
          isOpen={isDetailDialogOpen}
          onClose={() => {
            setIsDetailDialogOpen(false);
            setSelectedSummaryForDetail(null);
            setDetailedFoodCosts([]);
            setDetailedBeverageCosts([]);
          }}
          summary={selectedSummaryForDetail}
          foodCostEntries={detailedFoodCosts}
          beverageCostEntries={detailedBeverageCosts}
          isLoadingDetails={isLoadingDetails}
        />
      )}

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col bg-card">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl flex items-center">
              <FileSpreadsheet className="mr-2 h-5 w-5" />
              Import Daily Financial Summaries
            </DialogTitle>
            <DialogDescription>
              Review the data from your Excel file before importing. Make sure all dates and values are correct.
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
                    {importedData.length} summaries ready to import
                  </div>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Act. Food Rev.</TableHead>
                          <TableHead className="text-right">Bud. Food Rev.</TableHead>
                          <TableHead className="text-right">Act. Bev Rev.</TableHead>
                          <TableHead className="text-right">Bud. Bev Rev.</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importedData.slice(0, 10).map((row, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-code">{row.date}</TableCell>
                            <TableCell className="text-right font-code">${row.actual_food_revenue.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-code">${row.budget_food_revenue.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-code">${row.actual_beverage_revenue.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-code">${row.budget_beverage_revenue.toFixed(2)}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{row.notes || '-'}</TableCell>
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
    </div>
  );
}