"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DailyFinancialSummary } from "@/types";
import { format as formatDateFn } from "date-fns";
import { formatNumber } from "@/lib/utils";

interface FlashFoodCostReportTableProps {
  data: DailyFinancialSummary[];
}

export function FlashFoodCostReportTable({ data }: FlashFoodCostReportTableProps) {
  if (!data || data.length === 0) {
    return <p className="text-center text-muted-foreground">No data available for the selected range and outlet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-full divide-y divide-border">
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Outlet ID</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Gross Food Cost</TableHead>
            <TableHead className="text-right">Net Food Cost</TableHead>
            <TableHead className="text-right">Adj. Food Cost</TableHead>
            <TableHead className="text-right">Entertainment Food</TableHead>
            <TableHead className="text-right">Officer's Check Food</TableHead>
            <TableHead className="text-right">Other Food Adj.</TableHead>
            <TableHead className="text-right">Gross Beverage Cost</TableHead>
            <TableHead className="text-right">Net Beverage Cost</TableHead>
            <TableHead className="text-right">Adj. Beverage Cost</TableHead>
            <TableHead className="text-right">Entertainment Beverage</TableHead>
            <TableHead className="text-right">Officer's Check Beverage</TableHead>
            <TableHead className="text-right">Other Beverage Adj.</TableHead>
            <TableHead className="text-right">Total Covers</TableHead>
            <TableHead className="text-right">Avg. Check</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((summary) => (
            <TableRow key={summary.id}>
              <TableCell className="font-medium">{formatDateFn(summary.date instanceof Date ? summary.date : summary.date.toDate(), "MMM dd, yyyy")}</TableCell>
              <TableCell>{summary.outlet_id}</TableCell>
              <TableCell className="text-right">{formatNumber(summary.actual_food_revenue)}</TableCell>
              <TableCell className="text-right">{formatNumber(summary.actual_food_cost)}</TableCell>
              <TableCell className="text-right">{formatNumber(summary.net_food_cost)}</TableCell>
              <TableCell className="text-right">{formatNumber(summary.total_adjusted_food_cost)}</TableCell>
              <TableCell className="text-right">{formatNumber(summary.ent_food)}</TableCell>
              <TableCell className="text-right">{formatNumber(summary.oc_food)}</TableCell>
              <TableCell className="text-right">{formatNumber(summary.other_food_adjustment)}</TableCell>
              <TableCell className="text-right">{formatNumber(summary.gross_beverage_cost)}</TableCell>
              <TableCell className="text-right">{formatNumber(summary.net_beverage_cost)}</TableCell>
              <TableCell className="text-right">{formatNumber(summary.total_adjusted_beverage_cost)}</TableCell>
              <TableCell className="text-right">{formatNumber(summary.entertainment_beverage_cost)}</TableCell>
              <TableCell className="text-right">{formatNumber(summary.officer_check_comp_beverage)}</TableCell>
              <TableCell className="text-right">{formatNumber(summary.other_beverage_adjustments)}</TableCell>
              <TableCell className="text-right">{formatNumber(summary.total_covers)}</TableCell>
              <TableCell className="text-right">{formatNumber(summary.average_check)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 