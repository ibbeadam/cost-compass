
"use client";

import { useState, useEffect, useMemo } from "react";
import { Timestamp } from "firebase/firestore";
import { PlusCircle, Edit, Trash2, AlertTriangle, DollarSign, TrendingUp, TrendingDown, Utensils, GlassWater, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

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
import { useToast } from "@/hooks/use-toast";
import { deleteDailyFinancialSummaryAction, getPaginatedDailyFinancialSummariesAction } from "@/actions/dailyFinancialSummaryActions";
import { getFoodCostEntriesForDateAction } from "@/actions/foodCostActions";
import { getBeverageCostEntriesForDateAction } from "@/actions/beverageCostActions";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 10;

const convertTimestampsToDates = (entry: DailyFinancialSummary): DailyFinancialSummary => {
  return {
    ...entry,
    date: entry.date instanceof Timestamp ? entry.date.toDate() : new Date(entry.date as any),
    createdAt: entry.createdAt && entry.createdAt instanceof Timestamp ? entry.createdAt.toDate() : (entry.createdAt ? new Date(entry.createdAt as any) : undefined),
    updatedAt: entry.updatedAt && entry.updatedAt instanceof Timestamp ? entry.updatedAt.toDate() : (entry.updatedAt ? new Date(entry.updatedAt as any) : undefined),
  };
};

export default function DailyFinancialSummaryListClient() {
  const [summaries, setSummaries] = useState<DailyFinancialSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSummary, setEditingSummary] = useState<DailyFinancialSummary | null>(null);
  
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedSummaryForDetail, setSelectedSummaryForDetail] = useState<DailyFinancialSummary | null>(null);
  const [detailedFoodCosts, setDetailedFoodCosts] = useState<(FoodCostEntry & { details: FoodCostDetail[]; outletName?: string })[]>([]);
  const [detailedBeverageCosts, setDetailedBeverageCosts] = useState<(BeverageCostEntry & { details: BeverageCostDetail[]; outletName?: string })[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const { toast } = useToast();
  const [lastVisibleDocId, setLastVisibleDocId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCursors, setPageCursors] = useState<(string | null)[]>([null]); // Store cursor for the start of each page

  const fetchSummaries = async (page: number, cursor: string | null) => {
    setIsLoading(true);
    try {
      const { summaries: fetchedSummaries, lastVisibleDocId: newLastVisibleDocId } = await getPaginatedDailyFinancialSummariesAction(ITEMS_PER_PAGE, cursor);
      setSummaries(fetchedSummaries.map(convertTimestampsToDates));
      setLastVisibleDocId(newLastVisibleDocId);
      setHasMore(fetchedSummaries.length === ITEMS_PER_PAGE);
      setCurrentPage(page);
      
      // Update cursors
      const newCursors = [...pageCursors];
      if (page >= newCursors.length) { // If moving forward to a new page
        newCursors[page] = newLastVisibleDocId; // Store cursor for *next* page start
      }
      setPageCursors(newCursors);

    } catch (error) {
      toast({ variant: "destructive", title: "Error Fetching Summaries", description: (error as Error).message || "Could not load daily financial summaries." });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchSummaries(1, null); // Fetch initial page
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Removed itemsPerPage and toast from deps as fetchSummaries has them implicitly or they don't change fetch logic here.

  const nextPage = () => {
    if (!hasMore || isLoading) return;
    fetchSummaries(currentPage + 1, lastVisibleDocId);
  };

  const prevPage = () => {
    if (currentPage === 1 || isLoading) return;
    // pageCursors[0] is for page 1 (null cursor)
    // pageCursors[1] is cursor for start of page 2
    // So, for page N, we need cursor for page N-1, which is pageCursors[N-2]
    const prevPageCursor = currentPage > 1 ? pageCursors[currentPage - 2] : null;
    fetchSummaries(currentPage - 1, prevPageCursor);
  };
  
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
        const targetDate = summary.date instanceof Date ? summary.date : new Date(summary.date);
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
      toast({ variant: "destructive", title: "Error Fetching Details", description: (error as Error).message || "Could not load detailed costs."});
      setDetailedFoodCosts([]);
      setDetailedBeverageCosts([]);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleDelete = async (summaryId: string) => {
    try {
      await deleteDailyFinancialSummaryAction(summaryId);
      // Refetch current page data after deletion
      fetchSummaries(currentPage, currentPage > 1 ? pageCursors[currentPage-1] : null);
      toast({ title: "Summary Deleted", description: "The daily financial summary has been deleted." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error Deleting Summary", description: (error as Error).message || "Could not delete summary." });
    }
  };

  const onFormSuccess = () => {
    setIsFormOpen(false);
    setEditingSummary(null);
    // Refetch current page to see the new/updated entry
    fetchSummaries(currentPage, currentPage > 1 ? pageCursors[currentPage-1] : null);
  };

  const onFormCancel = () => {
    setIsFormOpen(false);
    setEditingSummary(null);
  };

  const renderPercentage = (value: number | null | undefined) => {
    if (value == null) return <span className="text-muted-foreground">-</span>;
    return `${value.toFixed(2)}%`;
  };

  const renderCurrency = (value: number | null | undefined) => {
    if (value == null) return <span className="text-muted-foreground">-</span>;
    return `$${value.toFixed(2)}`;
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

   const startIndexText = summaries.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
   const endIndexText = summaries.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + summaries.length : 0;
   // Total results is unknown with cursor pagination without an extra query. So we can't show "of Z".

  if (isLoading && summaries.length === 0) { // Show full skeleton only on initial load
    return (
      <div>
        <div className="flex justify-end mb-4"> <Skeleton className="h-10 w-52 bg-muted" /> </div>
        <div className="rounded-lg border shadow-md bg-card overflow-x-auto">
            <table className="w-full caption-bottom text-sm min-w-[1200px]">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  {[...Array(12)].map((_, i) => (
                    <th key={i} className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      <Skeleton className="h-6 w-full bg-muted/50" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
                  <tr key={i} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    {[...Array(11)].map((_, j) => (
                      <td key={j} className="p-4 align-middle">
                        <Skeleton className="h-6 w-full bg-muted" />
                      </td>
                    ))}
                    <td className="p-4 align-middle">
                      <div className="flex justify-end gap-1">
                        <Skeleton className="h-8 w-8 bg-muted rounded-md" /> {/* Edit */}
                        <Skeleton className="h-8 w-8 bg-muted rounded-md" /> {/* Delete */}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
 <div className="w-full flex flex-col">
      <div className="flex justify-end mb-4">
        <Button onClick={handleAddNew}> <PlusCircle className="mr-2 h-4 w-4" /> Add New Daily Summary </Button>
      </div>

      {summaries.length === 0 && !isLoading ? (
        <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border">
          <DollarSign className="mx-auto h-12 w-12 mb-4 text-primary" />
          <p className="text-lg font-medium">No daily financial summaries found.</p>
          <p>Click "Add New Daily Summary" to get started.</p>
        </div>
 ) : (
        <div className="rounded-lg border shadow-md bg-card overflow-x-auto w-full">
          <Table className="min-w-[1200px]"><TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-headline cursor-pointer hover:text-primary" onClick={() => toast({ title: "Tip", description: "Click any data cell in a row to view full details."})}>Date</TableHead>
                <TableHead className="font-headline text-right">Food Rev.</TableHead>
                <TableHead className="font-headline text-right">Bud. Food %</TableHead>
                <TableHead className="font-headline text-right">Act. Food Cost</TableHead>
                <TableHead className="font-headline text-right">Act. Food %</TableHead>
                <TableHead className="font-headline text-right">Food Var. %</TableHead>
                <TableHead className="font-headline text-right">Bev Rev.</TableHead>
                <TableHead className="font-headline text-right">Bud. Bev %</TableHead>
                <TableHead className="font-headline text-right">Act. Bev Cost</TableHead>
                <TableHead className="font-headline text-right">Act. Bev %</TableHead>
                <TableHead className="font-headline text-right">Bev Var. %</TableHead>
                <TableHead className="font-headline w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map((summary) => (
                <TableRow key={summary.id} className="hover:bg-muted/30 cursor-pointer">
                  <TableCell className="font-code" onClick={() => handleViewDetails(summary)}> {summary.date instanceof Date ? format(summary.date, "PPP") : summary.id} </TableCell>
                  <TableCell className="text-right font-code" onClick={() => handleViewDetails(summary)}>{renderCurrency(summary.food_revenue)}</TableCell>
                  <TableCell className="text-right font-code" onClick={() => handleViewDetails(summary)}>{renderPercentage(summary.budget_food_cost_pct)}</TableCell>
                  <TableCell className="text-right font-code font-semibold" onClick={() => handleViewDetails(summary)}>{renderCurrency(summary.actual_food_cost)}</TableCell>
                  <TableCell className={cn("text-right font-code font-semibold", getActualCostColor(summary.actual_food_cost_pct, summary.budget_food_cost_pct))} onClick={() => handleViewDetails(summary)}> {renderPercentage(summary.actual_food_cost_pct)} </TableCell>
                  <TableCell className={cn("text-right font-code font-semibold", getVarianceColor(summary.food_variance_pct))} onClick={() => handleViewDetails(summary)}>
                    {summary.food_variance_pct != null && summary.food_variance_pct !== 0 ? (summary.food_variance_pct > 0 ? <TrendingUp className="inline h-4 w-4 mr-1" /> : <TrendingDown className="inline h-4 w-4 mr-1" />) : null}
                    {renderPercentage(summary.food_variance_pct)}
                  </TableCell>
                  <TableCell className="text-right font-code" onClick={() => handleViewDetails(summary)}>{renderCurrency(summary.beverage_revenue)}</TableCell>
                  <TableCell className="text-right font-code" onClick={() => handleViewDetails(summary)}>{renderPercentage(summary.budget_beverage_cost_pct)}</TableCell>
                  <TableCell className="text-right font-code font-semibold" onClick={() => handleViewDetails(summary)}>{renderCurrency(summary.actual_beverage_cost)}</TableCell>
                  <TableCell className={cn("text-right font-code font-semibold", getActualCostColor(summary.actual_beverage_cost_pct, summary.budget_beverage_cost_pct))} onClick={() => handleViewDetails(summary)}> {renderPercentage(summary.actual_beverage_cost_pct)} </TableCell>
                  <TableCell className={cn("text-right font-code font-semibold", getVarianceColor(summary.beverage_variance_pct))} onClick={() => handleViewDetails(summary)}>
                    {summary.beverage_variance_pct != null && summary.beverage_variance_pct !== 0 ? (summary.beverage_variance_pct > 0 ? <TrendingUp className="inline h-4 w-4 mr-1" /> : <TrendingDown className="inline h-4 w-4 mr-1" />) : null}
                    {renderPercentage(summary.beverage_variance_pct)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(summary)} className="mr-1 hover:text-primary h-9 w-9"> <Edit className="h-4 w-4" /><span className="sr-only">Edit</span> </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="hover:text-destructive h-9 w-9"> <Trash2 className="h-4 w-4" /><span className="sr-only">Delete</span> </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader> <AlertDialogTitle className="flex items-center"><AlertTriangle className="mr-2 h-5 w-5 text-destructive" />Are you sure?</AlertDialogTitle> <AlertDialogDescription> This will permanently delete the summary for {summary.date instanceof Date ? format(summary.date, "PPP") : summary.id}. </AlertDialogDescription> </AlertDialogHeader>
                        <AlertDialogFooter> <AlertDialogCancel>Cancel</AlertDialogCancel> <AlertDialogAction onClick={() => handleDelete(summary.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction> </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {summaries.length > 0 && (
        <div className="flex justify-between items-center mt-4 px-2">
          <div className="text-sm text-muted-foreground">
            Showing {startIndexText} to {endIndexText} results {hasMore ? "(more available)" : ""}
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={prevPage}
              disabled={currentPage === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous Page</span>
            </Button>
            <span className="text-sm font-medium p-2">Page {currentPage}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={nextPage}
              disabled={!hasMore || isLoading}
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
 </div>
  );
}
