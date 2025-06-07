
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, orderBy, Timestamp, query as firestoreQuery } from "firebase/firestore";
import { PlusCircle, Edit, Trash2, AlertTriangle, DollarSign, TrendingUp, TrendingDown, Eye, Utensils, GlassWater } from "lucide-react";
import { format } from "date-fns";

import { db } from "@/lib/firebase";
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
import { deleteDailyFinancialSummaryAction } from "@/actions/dailyFinancialSummaryActions";
import { getFoodCostEntriesForDateAction } from "@/actions/foodCostActions";
import { getBeverageCostEntriesForDateAction } from "@/actions/beverageCostActions"; // New import
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    setIsLoading(true);
    const q = firestoreQuery(collection(db, "dailyFinancialSummaries"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedSummaries = snapshot.docs.map(doc => {
        const data = doc.data() as Omit<DailyFinancialSummary, 'id'>;
        return convertTimestampsToDates({ id: doc.id, ...data });
      });
      setSummaries(fetchedSummaries);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching daily financial summaries:", error);
      toast({ variant: "destructive", title: "Error Fetching Summaries", description: "Could not load daily financial summaries." });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

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
      toast({ title: "Summary Deleted", description: "The daily financial summary has been deleted." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error Deleting Summary", description: (error as Error).message || "Could not delete summary." });
    }
  };

  const onFormSuccess = () => setIsFormOpen(false);
  const onFormCancel = () => setIsFormOpen(false);

  const renderPercentage = (value: number | null | undefined) => {
    if (value == null) return <span className="text-muted-foreground">-</span>;
    return `${value.toFixed(2)}%`;
  };

  const renderCurrency = (value: number | null | undefined) => {
    if (value == null) return <span className="text-muted-foreground">-</span>;
    return `$${value.toFixed(2)}`;
  }

  const getVarianceColor = (variance: number | null | undefined) => {
    if (variance == null) return "";
    if (variance > 1) return "text-destructive"; 
    if (variance < -1) return "text-green-600 dark:text-green-500"; 
    return ""; 
  }
  
  const getActualCostColor = (actualPct: number | null | undefined, budgetPct: number | null | undefined) => {
    if (actualPct == null || budgetPct == null) return "";
    if (actualPct > budgetPct) return "text-destructive";
    if (actualPct < budgetPct) return "text-green-600 dark:text-green-500";
    return "";
  }


  if (isLoading) {
    return (
      <div>
        <div className="flex justify-end mb-4"> <Skeleton className="h-10 w-52 bg-muted" /> </div>
        <div className="rounded-lg border overflow-hidden shadow-md bg-card">
          <Skeleton className="h-12 w-full bg-muted/50" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="grid grid-cols-10 items-center p-4 border-b gap-2">
              <Skeleton className="h-6 bg-muted col-span-1" /> <Skeleton className="h-6 bg-muted col-span-1" /> 
              <Skeleton className="h-6 bg-muted col-span-1" /> <Skeleton className="h-6 bg-muted col-span-1" />
              <Skeleton className="h-6 bg-muted col-span-1" /> <Skeleton className="h-6 bg-muted col-span-1" />
              <Skeleton className="h-6 bg-muted col-span-1" /> <Skeleton className="h-6 bg-muted col-span-1" />
              <Skeleton className="h-6 bg-muted col-span-1" />
              <div className="col-span-1 flex justify-end gap-1">
                 <Skeleton className="h-8 w-8 bg-muted" /> <Skeleton className="h-8 w-8 bg-muted" /> <Skeleton className="h-8 w-8 bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-end mb-4">
        <Button onClick={handleAddNew}> <PlusCircle className="mr-2 h-4 w-4" /> Add New Daily Summary </Button>
      </div>

      {summaries.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border">
          <DollarSign className="mx-auto h-12 w-12 mb-4 text-primary" />
          <p className="text-lg font-medium">No daily financial summaries found.</p>
          <p>Click "Add New Daily Summary" to get started.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden shadow-md bg-card">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-headline">Date</TableHead>
                <TableHead className="font-headline text-right">Food Rev.</TableHead>
                <TableHead className="font-headline text-right">Bud. Food %</TableHead>
                <TableHead className="font-headline text-right">Act. Food Cost</TableHead>
                <TableHead className="font-headline text-right">Act. Food %</TableHead>
                <TableHead className="font-headline text-right">Food Var. %</TableHead>
                <TableHead className="font-headline text-right">Bev Rev.</TableHead>
                <TableHead className="font-headline text-right">Bud. Bev %</TableHead>
                <TableHead className="font-headline text-right">Act. Bev %</TableHead>
                <TableHead className="font-headline w-[150px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map((summary) => (
                <TableRow key={summary.id} className="hover:bg-muted/30 cursor-default">
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
                  <TableCell className={cn("text-right font-code font-semibold", getActualCostColor(summary.actual_beverage_cost_pct, summary.budget_beverage_cost_pct))} onClick={() => handleViewDetails(summary)}> {renderPercentage(summary.actual_beverage_cost_pct)} </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleViewDetails(summary)} className="mr-1 hover:text-blue-500"> <Eye className="h-4 w-4" /><span className="sr-only">View Details</span> </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(summary)} className="mr-1 hover:text-primary"> <Edit className="h-4 w-4" /><span className="sr-only">Edit</span> </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="hover:text-destructive"> <Trash2 className="h-4 w-4" /><span className="sr-only">Delete</span> </Button>
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

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
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
