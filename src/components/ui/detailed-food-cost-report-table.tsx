"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DetailedFoodCostReport } from "@/types";
import { format as formatDateFn } from "date-fns";
import { Utensils } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface DetailedFoodCostReportTableProps {
  data: DetailedFoodCostReport;
  onOutletClick?: (outletId: string) => void;
}

export function DetailedFoodCostReportTable({ data, onOutletClick }: DetailedFoodCostReportTableProps) {
  const { 
    outletName, 
    dateRange, 
    totalCostFromTransfers,
    foodCostDetailsByItem 
  } = data;

  const renderCurrency = (value: number | null | undefined) => {
    if (value == null) return "-";
    return `$${formatNumber(value)}`;
  };

  const renderPercentage = (value: number | null | undefined) => {
    if (value == null) return "-";
    return `${formatNumber(value)}%`;
  };

  return (
    <div className="space-y-8 p-4 bg-background rounded-lg shadow-lg">
      {/* Report Title and Date Range */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 mb-4">
        <h2 
          className="text-3xl font-extrabold font-headline text-foreground tracking-tight"
          onClick={() => onOutletClick?.(data.outletId)}
        >
          {outletName} - Detailed Food Cost Report
        </h2>
        <p className="text-sm text-muted-foreground mt-2 md:mt-0">
          <span className="font-semibold">Date Range:</span> {formatDateFn(dateRange.from, "MMM dd, yyyy")} - {formatDateFn(dateRange.to, "MMM dd, yyyy")}
        </p>
      </div>

      {/* PART 1: Cost details from outlets */}
      <div className="border rounded-md shadow-sm overflow-hidden">
        <div className="flex items-center space-x-3 p-4 bg-secondary/10 border-b">
          <Utensils className="h-6 w-6 text-primary" />
          <h3 className="font-bold text-xl text-foreground">Cost Details from Outlets</h3>
          <span className="ml-auto font-extrabold text-primary text-lg">Total Cost from Transfers: {renderCurrency(totalCostFromTransfers)}</span>
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-full divide-y divide-border">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Cost</TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">% of Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {foodCostDetailsByItem && foodCostDetailsByItem.length > 0 ? (
                foodCostDetailsByItem.map((item, index) => (
                  <TableRow key={index} className="hover:bg-muted/20">
                    <TableCell className="px-4 py-2 whitespace-nowrap text-sm font-medium text-foreground">{item.categoryName}</TableCell>
                    <TableCell className="px-4 py-2 whitespace-nowrap text-sm text-muted-foreground">{item.description}</TableCell>
                    <TableCell className="px-4 py-2 whitespace-nowrap text-sm text-right font-medium text-foreground">{renderCurrency(item.cost)}</TableCell>
                    <TableCell className="px-4 py-2 whitespace-nowrap text-sm text-right font-medium text-foreground">{renderPercentage(item.percentageOfTotalCost)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    No detailed food cost entries for this period.
                  </TableCell>
                </TableRow>
              )}
              <TableRow className="bg-accent/30 font-bold hover:bg-accent/40">
                <TableCell colSpan={2} className="px-4 py-3 text-base">Total Cost from Transfers</TableCell>
                <TableCell className="px-4 py-3 text-right text-base">{renderCurrency(totalCostFromTransfers)}</TableCell>
                <TableCell className="px-4 py-3 text-right text-base"></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
} 