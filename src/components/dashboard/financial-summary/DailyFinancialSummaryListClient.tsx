
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, orderBy, Timestamp, query as firestoreQuery } from "firebase/firestore";
import { PlusCircle, Edit, Trash2, AlertTriangle, DollarSign } from "lucide-react";
import { format } from "date-fns";

import { db } from "@/lib/firebase";
import type { DailyFinancialSummary } from "@/types";
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
import { useToast } from "@/hooks/use-toast";
import { deleteDailyFinancialSummaryAction } from "@/actions/dailyFinancialSummaryActions";
import { Skeleton } from "@/components/ui/skeleton";

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
      toast({
        variant: "destructive",
        title: "Error Fetching Summaries",
        description: "Could not load daily financial summaries.",
      });
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

  const handleDelete = async (summaryId: string) => {
    try {
      await deleteDailyFinancialSummaryAction(summaryId);
      toast({
        title: "Summary Deleted",
        description: "The daily financial summary has been deleted.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error Deleting Summary",
        description: (error as Error).message || "Could not delete summary.",
      });
    }
  };

  const onFormSuccess = () => setIsFormOpen(false);
  const onFormCancel = () => setIsFormOpen(false);

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-end mb-4">
          <Skeleton className="h-10 w-52 bg-muted" />
        </div>
        <div className="rounded-lg border overflow-hidden shadow-md bg-card">
          <Skeleton className="h-12 w-full bg-muted/50" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center p-4 border-b">
              <Skeleton className="h-6 w-1/5 bg-muted mr-2" /> <Skeleton className="h-6 w-1/5 bg-muted mr-2" />
              <Skeleton className="h-6 w-1/5 bg-muted mr-2" /> <Skeleton className="h-6 w-1/5 bg-muted mr-2" />
              <Skeleton className="h-6 w-1/5 bg-muted mr-2" />
              <Skeleton className="h-8 w-8 bg-muted mr-2" /> <Skeleton className="h-8 w-8 bg-muted" />
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
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Daily Summary
        </Button>
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
                <TableHead className="font-headline text-right">Food Revenue</TableHead>
                <TableHead className="font-headline text-right">Budget Food %</TableHead>
                <TableHead className="font-headline text-right">Bev Revenue</TableHead>
                <TableHead className="font-headline text-right">Budget Bev %</TableHead>
                <TableHead className="font-headline w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map((summary) => (
                <TableRow key={summary.id}>
                  <TableCell className="font-code">
                    {summary.date instanceof Date ? format(summary.date, "PPP") : summary.id}
                  </TableCell>
                  <TableCell className="text-right font-code">${summary.food_revenue?.toFixed(2) ?? '0.00'}</TableCell>
                  <TableCell className="text-right font-code">{summary.budget_food_cost_pct?.toFixed(2) ?? '0.00'}%</TableCell>
                  <TableCell className="text-right font-code">${summary.beverage_revenue?.toFixed(2) ?? '0.00'}</TableCell>
                  <TableCell className="text-right font-code">{summary.budget_beverage_cost_pct?.toFixed(2) ?? '0.00'}%</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(summary)} className="mr-2 hover:text-primary">
                      <Edit className="h-4 w-4" /><span className="sr-only">Edit</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="hover:text-destructive">
                          <Trash2 className="h-4 w-4" /><span className="sr-only">Delete</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center"><AlertTriangle className="mr-2 h-5 w-5 text-destructive" />Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the summary for {summary.date instanceof Date ? format(summary.date, "PPP") : summary.id}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(summary.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
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

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[90vh] flex flex-col bg-card">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl">{editingSummary ? "Edit" : "Add New"} Daily Financial Summary</DialogTitle>
            <DialogDescription>
              {editingSummary ? `Update summary for ${editingSummary.date instanceof Date ? format(editingSummary.date, "PPP") : editingSummary.id}.` : "Enter details for a new daily summary."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto pr-2 pl-1 py-2">
            <DailyFinancialSummaryForm
              key={editingSummary ? editingSummary.id : 'new-summary'}
              initialData={editingSummary}
              onSuccess={onFormSuccess}
              onCancel={onFormCancel}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
