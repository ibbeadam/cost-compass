"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  // Calculate category costs from detailed items
  const categoryCosts = foodCostDetailsByItem?.reduce((acc, item) => {
    const existing = acc.find(cat => cat.categoryName === item.categoryName);
    if (existing) {
      existing.totalCost += item.cost || 0;
    } else {
      acc.push({
        categoryName: item.categoryName,
        totalCost: item.cost || 0
      });
    }
    return acc;
  }, [] as { categoryName: string; totalCost: number }[]) || [];

  return (
    <div className="space-y-6 p-4 bg-background rounded-lg shadow-lg">
      {/* Report Title and Date Range */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 mb-4">
        <h2 
          className="text-3xl font-extrabold font-headline text-foreground tracking-tight cursor-pointer hover:text-primary transition-colors"
          onClick={() => onOutletClick?.(data.outletId)}
        >
          {outletName} - Detailed Food Cost Report
        </h2>
        <p className="text-sm text-muted-foreground mt-2 md:mt-0">
          <span className="font-semibold">Date Range:</span> {formatDateFn(dateRange.from, "MMM dd, yyyy")} - {formatDateFn(dateRange.to, "MMM dd, yyyy")}
        </p>
      </div>

      {/* Category Costs Table */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b">
          <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
            <Utensils className="h-5 w-5 mr-2 text-orange-600" />
            Category Costs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="text-right font-semibold">Total Cost</TableHead>
                <TableHead className="text-right font-semibold">Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoryCosts.map((category) => (
                <TableRow key={category.categoryName} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{category.categoryName}</TableCell>
                  <TableCell className="text-right font-mono">{renderCurrency(category.totalCost)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {totalCostFromTransfers > 0 
                      ? `${formatNumber((category.totalCost / totalCostFromTransfers) * 100)}%`
                      : "0.00%"
                    }
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-gray-100 font-semibold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right font-mono">{renderCurrency(totalCostFromTransfers)}</TableCell>
                <TableCell className="text-right font-mono">100.00%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detailed Items Table */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
          <CardTitle className="text-lg font-semibold text-gray-800">Detailed Food Cost Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="text-right font-semibold">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {foodCostDetailsByItem && foodCostDetailsByItem.length > 0 ? (
                foodCostDetailsByItem.map((item, index) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{item.categoryName}</TableCell>
                    <TableCell className="text-gray-600">{item.description}</TableCell>
                    <TableCell className="text-right font-mono">{renderCurrency(item.cost)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-gray-500 py-6">
                    No detailed food cost items found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 