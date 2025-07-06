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
import { Badge } from "@/components/ui/badge";
import { format as formatDateFn } from "date-fns";
import type {
  DetailedBeverageCostReport,
  DetailedBeverageCostReportResponse,
} from "@/types";
import { DetailedBeverageCostReportTable } from "./detailed-beverage-cost-report-table";
import { formatNumber } from "@/lib/utils";

interface CombinedBeverageCostReportTableProps {
  reportData: DetailedBeverageCostReportResponse & { propertyInfo?: { id: number; name: string; propertyCode: string } | null };
}

export function CombinedBeverageCostReportTable({
  reportData,
}: CombinedBeverageCostReportTableProps) {
  const getPropertySuffix = () => {
    if (reportData.propertyInfo?.name) {
      return ` - ${reportData.propertyInfo.name}`;
    }
    return " - All Properties";
  };

  const getDateRangeDisplay = () => {
    if (!reportData.overallSummaryReport.dateRange?.from || !reportData.overallSummaryReport.dateRange?.to) {
      return "";
    }
    return ` | ${formatDateFn(reportData.overallSummaryReport.dateRange.from, "MMM dd, yyyy")} - ${formatDateFn(reportData.overallSummaryReport.dateRange.to, "MMM dd, yyyy")}`;
  };
  const renderCurrency = (value: number | null | undefined) => {
    if (value == null) return "-";
    return `$${formatNumber(value)}`;
  };
  const renderPercentage = (value: number | null | undefined) => {
    if (value == null) return "-";
    return `${formatNumber(value)}%`;
  };

  return (
    <div className="space-y-8">
      {/* Overall Summary */}
      <Card className="shadow-lg border-2 border-blue-200">
        <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 border-b">
          <CardTitle className="text-2xl font-bold text-blue-800">
            Overall Summary - All Outlets{getPropertySuffix()}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 min-w-0">
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200 min-w-0 break-words">
              <div className="text-2xl font-bold text-blue-700 truncate">
                {renderCurrency(
                  reportData.overallSummaryReport.totalCostFromTransfers
                )}
              </div>
              <div className="text-sm text-blue-600 break-words">
                Total Cost from Transfers
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200 min-w-0 break-words">
              <div className="text-2xl font-bold text-green-700 truncate">
                {renderCurrency(
                  reportData.overallSummaryReport.totalBeverageRevenue
                )}
              </div>
              <div className="text-sm text-green-600 break-words">
                Total Beverage Revenue
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200 min-w-0 break-words">
              <div className="text-2xl font-bold text-purple-700 truncate">
                {renderPercentage(
                  reportData.overallSummaryReport.beverageCostPercentage
                )}
              </div>
              <div className="text-sm text-purple-600 break-words">
                Beverage Cost %
              </div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200 min-w-0 break-words">
              <div className="text-2xl font-bold text-orange-700 truncate">
                {renderPercentage(
                  reportData.overallSummaryReport.variancePercentage
                )}
              </div>
              <div className="text-sm text-orange-600 break-words">
                Variance %
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 min-w-0">
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 min-w-0 break-words">
              <div className="text-lg font-semibold text-gray-800 truncate">
                {renderCurrency(
                  reportData.overallSummaryReport.entBeverageTotal
                )}
              </div>
              <div className="text-sm text-gray-600 break-words">
                Entertainment Beverage
              </div>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 min-w-0 break-words">
              <div className="text-lg font-semibold text-gray-800 truncate">
                {renderCurrency(
                  reportData.overallSummaryReport.ocBeverageTotal
                )}
              </div>
              <div className="text-sm text-gray-600 break-words">
                Officer's Check Beverage
              </div>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 min-w-0 break-words">
              <div className="text-lg font-semibold text-gray-800 truncate">
                {renderCurrency(
                  reportData.overallSummaryReport.otherAdjustmentsBeverage
                )}
              </div>
              <div className="text-sm text-gray-600 break-words">
                Other Adjustments
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <div className="text-lg font-semibold text-blue-800">
                {renderCurrency(
                  reportData.overallSummaryReport.totalCostOfBeverage
                )}
              </div>
              <div className="text-sm text-blue-600">
                Total Cost of Beverage
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-blue-800">
                {renderPercentage(
                  reportData.overallSummaryReport.budgetBeverageCostPercentage
                )}
              </div>
              <div className="text-sm text-blue-600">
                Budget Beverage Cost %
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Outlet Reports */}
      {reportData.outletReports.length > 0 && (
        <div className="space-y-8 mt-8">
          <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">
            Detailed Beverage Cost Items by Outlet
          </h2>
          {reportData.outletReports.map((report) => (
            <DetailedBeverageCostReportTable
              key={report.outletId}
              report={report}
            />
          ))}
        </div>
      )}
    </div>
  );
}
