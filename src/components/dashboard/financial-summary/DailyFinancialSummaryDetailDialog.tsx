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
import { cn, formatNumber } from "@/lib/utils";

interface DailyFinancialSummaryDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  summary: DailyFinancialSummary | null;
  foodCostEntries: (FoodCostEntry & { details: FoodCostDetail[]; outletName?: string })[];
  beverageCostEntries: (BeverageCostEntry & { details: BeverageCostDetail[]; outletName?: string })[];
  isLoadingDetails: boolean; 
}

const DetailItem: React.FC<{
  label: string;
  value: string | number | null | undefined;
  icon?: React.ElementType;
  isCurrency?: boolean;
  isPercentage?: boolean;
  rootClassName?: string; 
  valueClassName?: string; 
}> = ({ label, value, icon: Icon, isCurrency, isPercentage, rootClassName, valueClassName }) => {
  let displayValue: React.ReactNode = value ?? <span className="text-muted-foreground/70">N/A</span>;
  if (value != null) {
    if (typeof value === 'number') {
      if (isCurrency) displayValue = `$${formatNumber(value)}`;
      else if (isPercentage) displayValue = `${formatNumber(value)}%`;
      else displayValue = formatNumber(value);
    } else {
        displayValue = value; 
    }
  }
  return (
    <div className={cn("flex items-center justify-between py-2", rootClassName)}>
      <div className="flex items-center">
        {Icon && <Icon className="h-4 w-4 mr-2 text-muted-foreground" />}
        <span className="text-sm text-muted-foreground">{label}:</span>
      </div>
      <span className={cn("text-sm font-medium text-foreground", valueClassName)}>{displayValue}</span>
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

  const summaryDate = summary.date instanceof Date ? format(summary.date, "yyyy-MM-dd") : "N/A";

  const getActualCostColorClass = (actualPct: number | null | undefined, budgetPct: number | null | undefined) => {
    if (actualPct == null || budgetPct == null) return "";
    if (actualPct > budgetPct) return "text-destructive";
    if (actualPct < budgetPct) return "text-green-600 dark:text-green-500";
    return "";
  };

  const getVarianceColorClass = (variance: number | null | undefined) => {
    if (variance == null) return "";
    if (variance > 0) return "text-destructive"; 
    if (variance < 0) return "text-green-600 dark:text-green-500"; 
    return "";
  };


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
                  <DetailItem label="Actual Food Revenue" value={summary.actualFoodRevenue} isCurrency icon={DollarSign} />
                  <DetailItem label="Budget Food Revenue" value={summary.budgetFoodRevenue} isCurrency icon={DollarSign} />
                  <DetailItem label="Budget Food Cost" value={summary.budgetFoodCost} isCurrency icon={DollarSign} />
                  <DetailItem label="Budget Food Cost %" value={summary.budgetFoodCostPct} isPercentage icon={Percent} />
                  <DetailItem 
                    label="Actual Food Cost" 
                    value={summary.actualFoodCost} 
                    isCurrency 
                    icon={DollarSign} 
                    valueClassName="font-bold" 
                  />
                   <DetailItem 
                    label="Actual Food Cost %" 
                    value={summary.actualFoodCostPct} 
                    isPercentage 
                    icon={summary.actualFoodCostPct != null && summary.budgetFoodCostPct != null && summary.actualFoodCostPct > summary.budgetFoodCostPct ? TrendingUp : (summary.actualFoodCostPct != null && summary.budgetFoodCostPct != null && summary.actualFoodCostPct < summary.budgetFoodCostPct ? TrendingDown : Percent)} 
                    valueClassName={cn("font-bold", getActualCostColorClass(summary.actualFoodCostPct, summary.budgetFoodCostPct))}
                  />
                  <DetailItem 
                    label="Food Variance %" 
                    value={summary.foodVariancePct} 
                    isPercentage 
                    icon={summary.foodVariancePct != null && summary.foodVariancePct > 0 ? TrendingUp : (summary.foodVariancePct != null && summary.foodVariancePct < 0 ? TrendingDown : Percent)} 
                    valueClassName={cn("font-bold", getVarianceColorClass(summary.foodVariancePct))}
                  />
                  <DetailItem label="Entertainment Food" value={summary.entFood} isCurrency />
                  <DetailItem label="Complimentary Food" value={summary.coFood} isCurrency />
                  <DetailItem label="Other Food Adjustments" value={summary.otherFoodAdjustment} isCurrency />
                </div>
                {/* Beverage Section */}
                <div className="space-y-1">
                  <h4 className="text-md font-semibold text-foreground flex items-center mb-2"><GlassWater className="h-5 w-5 mr-2 text-muted-foreground" />Beverage</h4>
                  <DetailItem label="Actual Beverage Revenue" value={summary.actualBeverageRevenue} isCurrency icon={DollarSign} />
                  <DetailItem label="Budget Beverage Revenue" value={summary.budgetBeverageRevenue} isCurrency icon={DollarSign} />
                  <DetailItem label="Budget Beverage Cost" value={summary.budgetBeverageCost} isCurrency icon={DollarSign} />
                  <DetailItem label="Budget Beverage Cost %" value={summary.budgetBeverageCostPct} isPercentage icon={Percent}/>
                  <DetailItem 
                    label="Actual Beverage Cost" 
                    value={summary.actualBeverageCost} 
                    isCurrency 
                    icon={DollarSign} 
                    valueClassName="font-bold" 
                  />
                  <DetailItem 
                    label="Actual Beverage Cost %" 
                    value={summary.actualBeverageCostPct} 
                    isPercentage 
                    icon={summary.actualBeverageCostPct != null && summary.budgetBeverageCostPct != null && summary.actualBeverageCostPct > summary.budgetBeverageCostPct ? TrendingUp : (summary.actualBeverageCostPct != null && summary.budgetBeverageCostPct != null && summary.actualBeverageCostPct < summary.budgetBeverageCostPct ? TrendingDown : Percent)} 
                    valueClassName={cn("font-bold", getActualCostColorClass(summary.actualBeverageCostPct, summary.budgetBeverageCostPct))}
                  />
                  <DetailItem 
                    label="Beverage Variance %" 
                    value={summary.beverageVariancePct} 
                    isPercentage 
                    icon={summary.beverageVariancePct != null && summary.beverageVariancePct > 0 ? TrendingUp : (summary.beverageVariancePct != null && summary.beverageVariancePct < 0 ? TrendingDown : Percent)} 
                    valueClassName={cn("font-bold", getVarianceColorClass(summary.beverageVariancePct))}
                  />
                  <DetailItem label="Entertainment Beverage" value={summary.entBeverage} isCurrency />
                  <DetailItem label="Complimentary Beverage" value={summary.coBeverage} isCurrency />
                  <DetailItem label="Other Beverage Adjustments" value={summary.otherBeverageAdjustment} isCurrency />
                </div>
              </div>
              {summary.note && (
                <>
                  <Separator className="my-4" />
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Notes:</h4>
                  <p className="text-sm text-foreground bg-muted/50 p-3 rounded-md">{summary.note}</p>
                </>
              )}
            </section>

            {/* Budget vs Actual Comparison Section */}
            <section className="p-4 border rounded-lg shadow-sm bg-background">
              <h3 className="text-lg font-semibold mb-3 text-primary border-b pb-2 flex items-center">
                <DollarSign className="h-5 w-5 mr-2"/>
                Budget vs Actual Comparison
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                {/* Food Budget vs Actual */}
                <div className="space-y-1">
                  <h4 className="text-md font-semibold text-foreground flex items-center mb-2">
                    <Utensils className="h-5 w-5 mr-2 text-muted-foreground" />
                    Food Budget vs Actual
                  </h4>
                  <DetailItem 
                    label="Revenue Variance" 
                    value={summary.actualFoodRevenue && summary.budgetFoodRevenue ? summary.actualFoodRevenue - summary.budgetFoodRevenue : null} 
                    isCurrency 
                    icon={summary.actualFoodRevenue && summary.budgetFoodRevenue && (summary.actualFoodRevenue - summary.budgetFoodRevenue) > 0 ? TrendingUp : TrendingDown}
                    valueClassName={cn("font-bold", summary.actualFoodRevenue && summary.budgetFoodRevenue && (summary.actualFoodRevenue - summary.budgetFoodRevenue) > 0 ? "text-green-600 dark:text-green-500" : "text-destructive")}
                  />
                  <DetailItem 
                    label="Revenue Achievement %" 
                    value={summary.actualFoodRevenue && summary.budgetFoodRevenue && summary.budgetFoodRevenue > 0 ? (summary.actualFoodRevenue / summary.budgetFoodRevenue) * 100 : null} 
                    isPercentage 
                    icon={Percent}
                    valueClassName="font-bold"
                  />
                  <DetailItem 
                    label="Cost Variance" 
                    value={summary.actualFoodCost && summary.budgetFoodCost ? summary.actualFoodCost - summary.budgetFoodCost : null} 
                    isCurrency 
                    icon={summary.actualFoodCost && summary.budgetFoodCost && (summary.actualFoodCost - summary.budgetFoodCost) > 0 ? TrendingUp : TrendingDown}
                    valueClassName={cn("font-bold", summary.actualFoodCost && summary.budgetFoodCost && (summary.actualFoodCost - summary.budgetFoodCost) > 0 ? "text-destructive" : "text-green-600 dark:text-green-500")}
                  />
                  <DetailItem 
                    label="Cost Control %" 
                    value={summary.actualFoodCostPct && summary.budgetFoodCostPct ? summary.budgetFoodCostPct - summary.actualFoodCostPct : null} 
                    isPercentage 
                    icon={summary.actualFoodCostPct && summary.budgetFoodCostPct && (summary.budgetFoodCostPct - summary.actualFoodCostPct) > 0 ? TrendingDown : TrendingUp}
                    valueClassName={cn("font-bold", summary.actualFoodCostPct && summary.budgetFoodCostPct && (summary.budgetFoodCostPct - summary.actualFoodCostPct) > 0 ? "text-green-600 dark:text-green-500" : "text-destructive")}
                  />
                </div>
                {/* Beverage Budget vs Actual */}
                <div className="space-y-1">
                  <h4 className="text-md font-semibold text-foreground flex items-center mb-2">
                    <GlassWater className="h-5 w-5 mr-2 text-muted-foreground" />
                    Beverage Budget vs Actual
                  </h4>
                  <DetailItem 
                    label="Revenue Variance" 
                    value={summary.actualBeverageRevenue && summary.budgetBeverageRevenue ? summary.actualBeverageRevenue - summary.budgetBeverageRevenue : null} 
                    isCurrency 
                    icon={summary.actualBeverageRevenue && summary.budgetBeverageRevenue && (summary.actualBeverageRevenue - summary.budgetBeverageRevenue) > 0 ? TrendingUp : TrendingDown}
                    valueClassName={cn("font-bold", summary.actualBeverageRevenue && summary.budgetBeverageRevenue && (summary.actualBeverageRevenue - summary.budgetBeverageRevenue) > 0 ? "text-green-600 dark:text-green-500" : "text-destructive")}
                  />
                  <DetailItem 
                    label="Revenue Achievement %" 
                    value={summary.actualBeverageRevenue && summary.budgetBeverageRevenue && summary.budgetBeverageRevenue > 0 ? (summary.actualBeverageRevenue / summary.budgetBeverageRevenue) * 100 : null} 
                    isPercentage 
                    icon={Percent}
                    valueClassName="font-bold"
                  />
                  <DetailItem 
                    label="Cost Variance" 
                    value={summary.actualBeverageCost && summary.budgetBeverageCost ? summary.actualBeverageCost - summary.budgetBeverageCost : null} 
                    isCurrency 
                    icon={summary.actualBeverageCost && summary.budgetBeverageCost && (summary.actualBeverageCost - summary.budgetBeverageCost) > 0 ? TrendingUp : TrendingDown}
                    valueClassName={cn("font-bold", summary.actualBeverageCost && summary.budgetBeverageCost && (summary.actualBeverageCost - summary.budgetBeverageCost) > 0 ? "text-destructive" : "text-green-600 dark:text-green-500")}
                  />
                  <DetailItem 
                    label="Cost Control %" 
                    value={summary.actualBeverageCostPct && summary.budgetBeverageCostPct ? summary.budgetBeverageCostPct - summary.actualBeverageCostPct : null} 
                    isPercentage 
                    icon={summary.actualBeverageCostPct && summary.budgetBeverageCostPct && (summary.budgetBeverageCostPct - summary.actualBeverageCostPct) > 0 ? TrendingDown : TrendingUp}
                    valueClassName={cn("font-bold", summary.actualBeverageCostPct && summary.budgetBeverageCostPct && (summary.budgetBeverageCostPct - summary.actualBeverageCostPct) > 0 ? "text-green-600 dark:text-green-500" : "text-destructive")}
                  />
                </div>
              </div>
            </section>

            {/* Detailed Food Cost Entries Section */}
            <section className="p-4 border rounded-lg shadow-sm bg-background">
              <h3 className="text-lg font-semibold mb-3 text-primary border-b pb-2 flex items-center"><Utensils className="h-5 w-5 mr-2"/>Detailed Food Cost Entries</h3>
              {isLoadingDetails ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" /> <Skeleton className="h-16 w-full" />
                </div>
              ) : foodCostEntries.length > 0 ? (
                (() => {
                  // Group entries by outlet
                  const groupedByOutlet = foodCostEntries.reduce((acc, entry) => {
                    const outletKey = entry.outletName || `Outlet ${entry.outletId}`;
                    if (!acc[outletKey]) {
                      acc[outletKey] = [];
                    }
                    acc[outletKey].push(entry);
                    return acc;
                  }, {} as Record<string, typeof foodCostEntries>);

                  return Object.entries(groupedByOutlet).map(([outletName, entries]) => {
                    const totalOutletCost = entries.reduce((sum, entry) => sum + entry.totalFoodCost, 0);
                    const allDetails = entries.flatMap(entry => entry.details || []);
                    
                    return (
                      <div key={outletName} className="mb-6 last:mb-0 p-4 border rounded-md bg-card shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-lg font-semibold text-foreground flex items-center">
                            <Building className="h-5 w-5 mr-2 text-muted-foreground" />
                            {outletName}
                          </h4>
                          <Badge variant="secondary" className="text-sm">
                            Total Food Cost: ${formatNumber(totalOutletCost)}
                          </Badge>
                        </div>
                        
                        {allDetails.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[40%]">Category</TableHead>
                                <TableHead className="w-[40%]">Description</TableHead>
                                <TableHead className="text-right w-[20%]">Cost</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {allDetails.map((detail) => (
                                <TableRow key={detail.id}>
                                  <TableCell className="text-xs flex items-center">
                                    <ListChecks className="h-3.5 w-3.5 mr-1.5 text-muted-foreground/70" />
                                    {detail.categoryName || detail.categoryId}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {detail.description || "-"}
                                  </TableCell>
                                  <TableCell className="text-right text-xs font-code">
                                    ${formatNumber(detail.cost)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-muted-foreground text-sm">No detailed food cost entries for this outlet.</p>
                        )}
                      </div>
                    );
                  });
                })()
              ) : (
                <p className="text-center text-muted-foreground py-4">No food cost entries available for this summary date.</p>
              )}
            </section>

            {/* Detailed Beverage Cost Entries Section */}
            <section className="p-4 border rounded-lg shadow-sm bg-background">
              <h3 className="text-lg font-semibold mb-3 text-primary border-b pb-2 flex items-center"><GlassWater className="h-5 w-5 mr-2"/>Detailed Beverage Cost Entries</h3>
              {isLoadingDetails ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" /> <Skeleton className="h-16 w-full" />
                </div>
              ) : beverageCostEntries.length > 0 ? (
                (() => {
                  // Group entries by outlet
                  const groupedByOutlet = beverageCostEntries.reduce((acc, entry) => {
                    const outletKey = entry.outletName || `Outlet ${entry.outletId}`;
                    if (!acc[outletKey]) {
                      acc[outletKey] = [];
                    }
                    acc[outletKey].push(entry);
                    return acc;
                  }, {} as Record<string, typeof beverageCostEntries>);

                  return Object.entries(groupedByOutlet).map(([outletName, entries]) => {
                    const totalOutletCost = entries.reduce((sum, entry) => sum + entry.totalBeverageCost, 0);
                    const allDetails = entries.flatMap(entry => entry.details || []);
                    
                    return (
                      <div key={outletName} className="mb-6 last:mb-0 p-4 border rounded-md bg-card shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-lg font-semibold text-foreground flex items-center">
                            <Building className="h-5 w-5 mr-2 text-muted-foreground" />
                            {outletName}
                          </h4>
                          <Badge variant="secondary" className="text-sm">
                            Total Beverage Cost: ${formatNumber(totalOutletCost)}
                          </Badge>
                        </div>
                        
                        {allDetails.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[40%]">Category</TableHead>
                                <TableHead className="w-[40%]">Description</TableHead>
                                <TableHead className="text-right w-[20%]">Cost</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {allDetails.map((detail) => (
                                <TableRow key={detail.id}>
                                  <TableCell className="text-xs flex items-center">
                                    <ListChecks className="h-3.5 w-3.5 mr-1.5 text-muted-foreground/70" />
                                    {detail.categoryName || detail.categoryId}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {detail.description || "-"}
                                  </TableCell>
                                  <TableCell className="text-right text-xs font-code">
                                    ${formatNumber(detail.cost)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-muted-foreground text-sm">No detailed beverage cost entries for this outlet.</p>
                        )}
                      </div>
                    );
                  });
                })()
              ) : (
                <p className="text-center text-muted-foreground py-4">No beverage cost entries available for this summary date.</p>
              )}
            </section>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

