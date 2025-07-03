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
import { format as formatDateFn } from "date-fns";
import type { DetailedBeverageCostReport } from "@/types";
import { formatNumber } from "@/lib/utils";

interface DetailedBeverageCostReportTableProps {
  report: DetailedBeverageCostReport;
}

export function DetailedBeverageCostReportTable({ report }: DetailedBeverageCostReportTableProps) {
  const renderCurrency = (value: number | null | undefined) => {
    if (value == null) return "-";
    return `$${formatNumber(value)}`;
  };

  return (
    <div className="space-y-6 p-4 bg-background rounded-lg shadow-lg">
      {/* Report Title and Date Range */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 mb-4">
        <h2 className="text-3xl font-extrabold font-headline text-foreground tracking-tight">
          {report.outletName} - Detailed Beverage Cost Report
        </h2>
        <p className="text-sm text-muted-foreground mt-2 md:mt-0">
          <span className="font-semibold">Date Range:</span> {formatDateFn(report.dateRange.from, "MMM dd, yyyy")} - {formatDateFn(report.dateRange.to, "MMM dd, yyyy")}
        </p>
      </div>

      {/* Category Costs Table */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
          <CardTitle className="text-lg font-semibold text-gray-800">Category Costs</CardTitle>
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
              {report.categoryCosts.map((category) => (
                <TableRow key={category.categoryName} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{category.categoryName}</TableCell>
                  <TableCell className="text-right font-mono">{renderCurrency(category.totalCost)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {report.totalCostFromTransfers > 0 
                      ? `${formatNumber((category.totalCost / report.totalCostFromTransfers) * 100)}%`
                      : "0.00%"
                    }
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-gray-100 font-semibold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right font-mono">{renderCurrency(report.totalCostFromTransfers)}</TableCell>
                <TableCell className="text-right font-mono">100.00%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detailed Items Table */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
          <CardTitle className="text-lg font-semibold text-gray-800">Detailed Beverage Cost Items</CardTitle>
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
              {report.beverageCostDetailsByItem?.map((item, index) => (
                <TableRow key={index} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{item.categoryName}</TableCell>
                  <TableCell className="text-gray-600">{item.description}</TableCell>
                  <TableCell className="text-right font-mono">{renderCurrency(item.cost)}</TableCell>
                </TableRow>
              )) || (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-gray-500">
                    No detailed beverage cost items found
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