"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DetailedFoodCostReportResponse } from "@/types";
import { format as formatDateFn } from "date-fns";
import {
  DollarSign,
  Utensils,
  Percent,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DetailedFoodCostReportTable } from "./detailed-food-cost-report-table"; // Import for individual outlet reports

interface CombinedFoodCostReportTableProps {
  data: DetailedFoodCostReportResponse;
}

export function CombinedFoodCostReportTable({
  data,
}: CombinedFoodCostReportTableProps) {
  const { overallSummaryReport, outletReports } = data;

  const renderCurrency = (value: number | null | undefined) => {
    if (value == null) return "-";
    return `$${formatNumber(value)}`;
  };

  const renderPercentage = (value: number | null | undefined) => {
    if (value == null) return "-";
    return `${formatNumber(value)}%`;
  };

  const getVarianceColorClass = (variance: number | null | undefined) => {
    if (variance == null) return "";
    if (variance > 0) return "text-destructive";
    if (variance < 0) return "text-green-600 dark:text-green-500";
    return "";
  };

  if (!overallSummaryReport) {
    return (
      <p className="text-center text-muted-foreground">
        No data available for the selected range.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overall Summary */}
      <Card className="shadow-lg border-2 border-blue-200">
        <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 border-b">
          <CardTitle className="text-2xl font-bold text-blue-800">
            Overall Summary - All Outlets
          </CardTitle>
          <div className="text-sm text-blue-600">
            {formatDateFn(overallSummaryReport.dateRange.from, "MMM dd, yyyy")}{" "}
            - {formatDateFn(overallSummaryReport.dateRange.to, "MMM dd, yyyy")}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 min-w-0">
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200 min-w-0 break-words">
              <div className="text-2xl font-bold text-blue-700 truncate">
                {renderCurrency(overallSummaryReport.totalCostFromTransfers)}
              </div>
              <div className="text-sm text-blue-600 break-words">
                Total Cost from Transfers
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200 min-w-0 break-words">
              <div className="text-2xl font-bold text-green-700 truncate">
                {renderCurrency(overallSummaryReport.totalFoodRevenue)}
              </div>
              <div className="text-sm text-green-600 break-words">
                Total Food Revenue
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200 min-w-0 break-words">
              <div className="text-2xl font-bold text-purple-700 truncate">
                {renderPercentage(overallSummaryReport.foodCostPercentage)}
              </div>
              <div className="text-sm text-purple-600 break-words">
                Food Cost %
              </div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200 min-w-0 break-words">
              <div className="text-2xl font-bold text-orange-700 truncate">
                {renderPercentage(overallSummaryReport.variancePercentage)}
              </div>
              <div className="text-sm text-orange-600 break-words">
                Variance %
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 min-w-0">
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 min-w-0 break-words">
              <div className="text-lg font-semibold text-gray-800 truncate">
                {renderCurrency(overallSummaryReport.entFoodTotal)}
              </div>
              <div className="text-sm text-gray-600 break-words">
                Entertainment Food
              </div>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 min-w-0 break-words">
              <div className="text-lg font-semibold text-gray-800 truncate">
                {renderCurrency(overallSummaryReport.ocFoodTotal)}
              </div>
              <div className="text-sm text-gray-600 break-words">
                Officer's Check Food
              </div>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 min-w-0 break-words">
              <div className="text-lg font-semibold text-gray-800 truncate">
                {renderCurrency(overallSummaryReport.otherAdjustmentsFood)}
              </div>
              <div className="text-sm text-gray-600 break-words">
                Other Adjustments
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <div className="text-lg font-semibold text-blue-800">
                {renderCurrency(overallSummaryReport.totalCostOfFood)}
              </div>
              <div className="text-sm text-blue-600">Total Cost of Food</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-blue-800">
                {renderPercentage(
                  overallSummaryReport.budgetFoodCostPercentage
                )}
              </div>
              <div className="text-sm text-blue-600">Budget Food Cost %</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Outlet Reports */}
      {outletReports.length > 0 && (
        <div className="space-y-8 mt-8">
          <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">
            Detailed Food Cost Items by Outlet
          </h2>
          {outletReports.map((report) => (
            <DetailedFoodCostReportTable key={report.outletId} data={report} />
          ))}
        </div>
      )}
    </div>
  );
}
