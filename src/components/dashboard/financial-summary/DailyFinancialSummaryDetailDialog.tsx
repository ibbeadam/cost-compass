
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DailyFinancialSummary, FoodCostEntry, FoodCostDetail, BeverageCostEntry, BeverageCostDetail } from "@/types";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Utensils, DollarSign, Percent, TrendingUp, TrendingDown, Building, ListChecks, GlassWater } from "lucide-react";
import { cn } from "@/lib/utils";

interface DailyFinancialSummaryDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  summary: DailyFinancialSummary | null;
  foodCostEntries: (FoodCostEntry & { details: FoodCostDetail[]; outletName?: string })[];
  beverageCostEntries: (BeverageCostEntry & { details: BeverageCostDetail[]; outletName?: string })[];
  isLoadingDetails: boolean; // Single flag for loading both food and beverage details
}

const DetailItem: React.FC<{ label: string; value: string | number | null | undefined; icon?: React.ElementType, isCurrency?: boolean, isPercentage?: boolean, className?: string }> = 
({ label, value, icon: Icon, isCurrency, isPercentage, className }) => {
  let displayValue: React.ReactNode = value ?? <span className="text-muted-foreground/70">N/A</span>;
  if (value != null) {
    if (typeof value === 'number') {
      if (isCurrency) displayValue = `$${Number(value).toFixed(2)}`;
      else if (isPercentage) displayValue = `${Number(value).toFixed(2)}%`;
      else displayValue = value;
    } else {
        displayValue = value; // If it's a string (like date)
    }
  }
  return (
    <div className={cn("flex items-center justify-between py-2", className)}>
      <div className="flex items-center">
        {Icon && <Icon className="h-4 w-4 mr-2 text-muted-foreground" />}
        <span className="text-sm text-muted-foreground">{label}:</span>
      </div>
      <span className="text-sm font-medium text-foreground">{displayValue}</span>
    </div>
  );
};


export default function DailyFinancialSummaryDetailDialog({
  isOpen,
  onClose,
  summary,
  foodCostEntries,
  beverageCostEntries,
  isLoadingDetails,
}: DailyFinancialSummaryDetailDialogProps) {
  if (!summary) return null;

  const summaryDate = summary.date instanceof Date ? format(summary.date, "PPP") : "N/A";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col bg-card">
        <DialogHeader className="pb-4 border-b flex-shrink-0">
          <DialogTitle className="font-headline text-2xl flex items-center">
            <DollarSign className="mr-3 h-6 w-6 text-primary" />
            Financial Summary Details
          </DialogTitle>
          <DialogDescription>
            Detailed breakdown for {summaryDate}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow min-h-0 overflow-y-auto"> 
          <div className="space-y-6 p-4 md:p-6">
            <section className="p-4 border rounded-lg shadow-sm bg-background">
              <h3 className="text-lg font-semibold mb-3 text-primary border-b pb-2">Overall Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                {/* Food Section */}
                <div className="space-y-1">
                  <h4 className="text-md font-semibold text-foreground flex items-center mb-2"><Utensils className="h-5 w-5 mr-2 text-muted-foreground" />Food</h4>
                  <DetailItem label="Food Revenue" value={summary.food_revenue} isCurrency icon={DollarSign} />
                  <DetailItem label="Budget Food Cost %" value={summary.budget_food_cost_pct} isPercentage icon={Percent} />
                  <DetailItem label="Actual Food Cost" value={summary.actual_food_cost} isCurrency icon={DollarSign} className="font-bold" />
                   <DetailItem 
                    label="Actual Food Cost %" 
                    value={summary.actual_food_cost_pct} 
                    isPercentage 
                    icon={summary.actual_food_cost_pct != null && summary.budget_food_cost_pct != null && summary.actual_food_cost_pct > summary.budget_food_cost_pct ? TrendingUp : TrendingDown} 
                    className={cn("font-bold", summary.actual_food_cost_pct != null && summary.budget_food_cost_pct != null && summary.actual_food_cost_pct > summary.budget_food_cost_pct ? 'text-destructive' : (summary.actual_food_cost_pct != null ? 'text-green-600' : ''))}
                  />
                  <DetailItem 
                    label="Food Variance %" 
                    value={summary.food_variance_pct} 
                    isPercentage 
                    icon={summary.food_variance_pct != null && summary.food_variance_pct > 0 ? TrendingUp : TrendingDown} 
                    className={cn("font-bold", summary.food_variance_pct != null && summary.food_variance_pct > 0 ? 'text-destructive' : (summary.food_variance_pct != null && summary.food_variance_pct < 0 ? 'text-green-600' : ''))}
                  />
                  <DetailItem label="Entertainment Food" value={summary.ent_food} isCurrency />
                  <DetailItem label="OC Food" value={summary.oc_food} isCurrency />
                  <DetailItem label="Other Food Adjustments" value={summary.other_food_adjustment} isCurrency />
                </div>
                {/* Beverage Section */}
                <div className="space-y-1">
                  <h4 className="text-md font-semibold text-foreground flex items-center mb-2"><GlassWater className="h-5 w-5 mr-2 text-muted-foreground" />Beverage</h4>
                  <DetailItem label="Beverage Revenue" value={summary.beverage_revenue} isCurrency icon={DollarSign} />
                  <DetailItem label="Budget Beverage Cost %" value={summary.budget_beverage_cost_pct} isPercentage icon={Percent}/>
                  <DetailItem label="Actual Beverage Cost" value={summary.actual_beverage_cost} isCurrency icon={DollarSign} className="font-bold" />
                  <DetailItem 
                    label="Actual Beverage Cost %" 
                    value={summary.actual_beverage_cost_pct} 
                    isPercentage 
                    icon={summary.actual_beverage_cost_pct != null && summary.budget_beverage_cost_pct != null && summary.actual_beverage_cost_pct > summary.budget_beverage_cost_pct ? TrendingUp : TrendingDown} 
                    className={cn("font-bold", summary.actual_beverage_cost_pct != null && summary.budget_beverage_cost_pct != null && summary.actual_beverage_cost_pct > summary.budget_beverage_cost_pct ? 'text-destructive' : (summary.actual_beverage_cost_pct != null ? 'text-green-600' : ''))}
                  />
                  <DetailItem 
                    label="Beverage Variance %" 
                    value={summary.beverage_variance_pct} 
                    isPercentage 
                    icon={summary.beverage_variance_pct != null && summary.beverage_variance_pct > 0 ? TrendingUp : TrendingDown} 
                    className={cn("font-bold", summary.beverage_variance_pct != null && summary.beverage_variance_pct > 0 ? 'text-destructive' : (summary.beverage_variance_pct != null && summary.beverage_variance_pct < 0 ? 'text-green-600' : ''))}
                  />
                  <DetailItem label="Entertainment Beverage" value={summary.ent_beverage} isCurrency />
                  <DetailItem label="OC Beverage" value={summary.oc_beverage} isCurrency />
                  <DetailItem label="Other Beverage Adjustments" value={summary.other_beverage_adjustment} isCurrency />
                </div>
              </div>
              {summary.notes && (
                <>
                  <Separator className="my-4" />
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Notes:</h4>
                  <p className="text-sm text-foreground bg-muted/50 p-3 rounded-md">{summary.notes}</p>
                </>
              )}
            </section>

            {/* Detailed Food Cost Entries Section */}
            <section className="p-4 border rounded-lg shadow-sm bg-background">
              <h3 className="text-lg font-semibold mb-3 text-primary border-b pb-2 flex items-center"><Utensils className="h-5 w-5 mr-2"/>Detailed Food Cost Entries</h3>
              {isLoadingDetails ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" /> <Skeleton className="h-16 w-full" />
                </div>
              ) : foodCostEntries.length > 0 ? (
                foodCostEntries.map((entry) => (
                  <div key={entry.id} className="mb-6 last:mb-0 p-3 border rounded-md bg-card shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-md font-semibold text-foreground flex items-center">
                            <Building className="h-5 w-5 mr-2 text-muted-foreground" />
                            Outlet: {entry.outletName || entry.outlet_id}
                        </h4>
                        <Badge variant="secondary">Total Food Cost: ${entry.total_food_cost.toFixed(2)}</Badge>
                    </div>
                    {entry.details && entry.details.length > 0 ? (
                      <Table size="sm">
                        <TableHeader><TableRow><TableHead className="w-[40%]">Category</TableHead><TableHead className="w-[40%]">Description</TableHead><TableHead className="text-right w-[20%]">Cost</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {entry.details.map((detail) => (
                            <TableRow key={detail.id}><TableCell className="text-xs flex items-center"><ListChecks className="h-3.5 w-3.5 mr-1.5 text-muted-foreground/70" />{detail.categoryName || detail.category_id}</TableCell><TableCell className="text-xs text-muted-foreground">{detail.description || "-"}</TableCell><TableCell className="text-right text-xs font-code">${detail.cost.toFixed(2)}</TableCell></TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : ( <p className="text-sm text-muted-foreground text-center py-3">No specific food items recorded for this outlet entry.</p> )}
                  </div>
                ))
              ) : ( <p className="text-sm text-muted-foreground text-center py-4">No detailed food cost entries found for this date.</p> )}
            </section>

            {/* Detailed Beverage Cost Entries Section */}
            <section className="p-4 border rounded-lg shadow-sm bg-background">
              <h3 className="text-lg font-semibold mb-3 text-primary border-b pb-2 flex items-center"><GlassWater className="h-5 w-5 mr-2"/>Detailed Beverage Cost Entries</h3>
              {isLoadingDetails ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" /> <Skeleton className="h-16 w-full" />
                </div>
              ) : beverageCostEntries.length > 0 ? (
                beverageCostEntries.map((entry) => (
                  <div key={entry.id} className="mb-6 last:mb-0 p-3 border rounded-md bg-card shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-md font-semibold text-foreground flex items-center">
                            <Building className="h-5 w-5 mr-2 text-muted-foreground" />
                            Outlet: {entry.outletName || entry.outlet_id}
                        </h4>
                        <Badge variant="secondary">Total Beverage Cost: ${entry.total_beverage_cost.toFixed(2)}</Badge>
                    </div>
                    {entry.details && entry.details.length > 0 ? (
                      <Table size="sm">
                        <TableHeader><TableRow><TableHead className="w-[40%]">Category</TableHead><TableHead className="w-[40%]">Description</TableHead><TableHead className="text-right w-[20%]">Cost</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {entry.details.map((detail) => (
                            <TableRow key={detail.id}><TableCell className="text-xs flex items-center"><ListChecks className="h-3.5 w-3.5 mr-1.5 text-muted-foreground/70" />{detail.categoryName || detail.category_id}</TableCell><TableCell className="text-xs text-muted-foreground">{detail.description || "-"}</TableCell><TableCell className="text-right text-xs font-code">${detail.cost.toFixed(2)}</TableCell></TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : ( <p className="text-sm text-muted-foreground text-center py-3">No specific beverage items recorded for this outlet entry.</p> )}
                  </div>
                ))
              ) : ( <p className="text-sm text-muted-foreground text-center py-4">No detailed beverage cost entries found for this date.</p> )}
            </section>

          </div>
        </div>

        <DialogFooter className="pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
