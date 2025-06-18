"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, Percent, TrendingUp, TrendingDown } from "lucide-react";
import type { MonthlyProfitLossReport } from "@/types";
import { cn, formatNumber } from "@/lib/utils";
import React, { useState } from "react";

interface MonthlyProfitLossReportTableProps {
  data: MonthlyProfitLossReport | null;
}

const StatCard = ({
  title,
  value,
  isCurrency = false,
  isPercentage = false,
  trendValue = null,
}: { 
  title: string; 
  value: number; 
  isCurrency?: boolean; 
  isPercentage?: boolean; 
  trendValue?: number | null; 
}) => {
  const formattedValue = isCurrency
    ? `$${formatNumber(value)}`
    : isPercentage
    ? `${formatNumber(value)}%`
    : formatNumber(value);

  const trendIcon = trendValue !== null ? (
    trendValue > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500 ml-1" />
    ) : trendValue < 0 ? (
      <TrendingDown className="h-4 w-4 text-destructive ml-1" />
    ) : null
  ) : null;

  return (
    <Card className="shadow-sm transition-all duration-300 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {isCurrency && <DollarSign className="h-4 w-4 text-muted-foreground" />}
        {isPercentage && <Percent className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold flex items-center", {
          "text-green-600": isPercentage && trendValue !== null && trendValue < 0,
          "text-destructive": isPercentage && trendValue !== null && trendValue > 0
        })}>
          {formattedValue}
          {trendIcon}
        </div>
      </CardContent>
    </Card>
  );
};

export function MonthlyProfitLossReportTable({ data }: MonthlyProfitLossReportTableProps) {
  if (!data) {
    return <p className="text-center text-muted-foreground">No monthly profit/loss data available for the selected period.</p>;
  }

  // Safety check for required arrays
  if (!data.incomeItems || !data.expenseItems) {
    return <p className="text-center text-muted-foreground">Report data is incomplete. Please try generating the report again.</p>;
  }

  const [taxRate, setTaxRate] = useState<number>(0);

  const renderCurrency = (value: number | null | undefined) => {
    if (value == null) return "-";
    return `$${formatNumber(value)}`;
  };

  const renderPercentage = (value: number | null | undefined) => {
    if (value == null) return "-";
    return `${formatNumber(value)}%`;
  };

  // Calculate tax and net income based on user input
  const grossProfit = data.netIncomeBeforeTaxes;
  const incomeTaxExpense = grossProfit * (taxRate / 100);
  const netIncome = grossProfit - incomeTaxExpense;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground text-center">Monthly Profit/Loss Report for {data.monthYear}</h2>

      {/* Tax Rate Input */}
      <div className="flex items-center gap-2 justify-end mb-2">
        <label htmlFor="tax-rate-input" className="font-medium">Tax Rate (%):</label>
        <input
          id="tax-rate-input"
          type="number"
          min={0}
          max={100}
          step={0.01}
          value={taxRate}
          onChange={e => setTaxRate(Number(e.target.value))}
          className="border rounded px-2 py-1 w-24 text-right font-mono"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Food Revenue" value={data.totalFoodRevenue} isCurrency />
        <StatCard title="Total Beverage Revenue" value={data.totalBeverageRevenue} isCurrency />
        <StatCard title="Total Revenue" value={data.totalRevenue} isCurrency />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Actual Food Cost" value={data.totalActualFoodCost} isCurrency />
        <StatCard title="Total Actual Beverage Cost" value={data.totalActualBeverageCost} isCurrency />
        <StatCard title="Total Actual Cost" value={data.totalActualCost} isCurrency />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Gross Profit" value={grossProfit} isCurrency trendValue={grossProfit} />
        <StatCard title="Food Cost %" value={data.foodCostPercentage} isPercentage trendValue={data.foodCostPercentage - data.averageBudgetFoodCostPct} />
        <StatCard title="Beverage Cost %" value={data.beverageCostPercentage} isPercentage trendValue={data.beverageCostPercentage - data.averageBudgetBeverageCostPct} />
        <StatCard title="Overall Cost %" value={data.overallCostPercentage} isPercentage trendValue={data.overallCostPercentage - ((data.averageBudgetFoodCostPct + data.averageBudgetBeverageCostPct) / 2)} />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Avg. Budget Food Cost %" value={data.averageBudgetFoodCostPct} isPercentage />
        <StatCard title="Avg. Budget Beverage Cost %" value={data.averageBudgetBeverageCostPct} isPercentage />
      </div>

      {/* Detailed P&L Statement */}
      <Card className="w-full shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="text-lg font-semibold text-gray-800">Profit & Loss Statement</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4">INCOME</h3>
            <Table className="w-full mb-4">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[150px]">REFERENCE ID.</TableHead>
                  <TableHead>DESCRIPTION</TableHead>
                  <TableHead className="text-right">AMOUNT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.incomeItems?.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono">{item.referenceId}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right font-mono">{renderCurrency(item.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted">
                  <TableCell colSpan={2} className="text-right">INCOME TOTAL</TableCell>
                  <TableCell className="text-right">{renderCurrency(data.totalIncome)}</TableCell>
                </TableRow>
                <TableRow className="font-bold bg-primary/10">
                  <TableCell colSpan={2} className="text-right text-lg">TOTAL REVENUE</TableCell>
                  <TableCell className="text-right text-lg">{renderCurrency(data.totalIncome)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4">EXPENSES</h3>
            <Table className="w-full mb-4">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[150px]">REFERENCE ID.</TableHead>
                  <TableHead>DESCRIPTION</TableHead>
                  <TableHead className="text-right">AMOUNT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.expenseItems?.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono">{item.referenceId}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right font-mono">{renderCurrency(item.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted">
                  <TableCell colSpan={2} className="text-right">EXPENSE TOTAL</TableCell>
                  <TableCell className="text-right">{renderCurrency(data.totalExpenses)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* OC & ENT Section as a separate table */}
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4">OC & ENT</h3>
            <Table className="w-full mb-4">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[150px]">REFERENCE ID.</TableHead>
                  <TableHead>DESCRIPTION</TableHead>
                  <TableHead className="text-right">AMOUNT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-accent/10">
                  <TableCell className="font-mono text-muted-foreground">-</TableCell>
                  <TableCell className="font-semibold">Food OC & ENT</TableCell>
                  <TableCell className="text-right font-mono">{renderCurrency((data as any).ocEntFood)}</TableCell>
                </TableRow>
                <TableRow className="bg-accent/10">
                  <TableCell className="font-mono text-muted-foreground">-</TableCell>
                  <TableCell className="font-semibold">Beverage OC & ENT</TableCell>
                  <TableCell className="text-right font-mono">{renderCurrency((data as any).ocEntBeverage)}</TableCell>
                </TableRow>
                <TableRow className="font-bold bg-muted">
                  <TableCell colSpan={2} className="text-right">OC & ENT TOTAL</TableCell>
                  <TableCell className="text-right">{renderCurrency(((data as any).ocEntFood || 0) + ((data as any).ocEntBeverage || 0))}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Other Adjustments Section as a separate table */}
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4">Other Adjustments</h3>
            <Table className="w-full mb-4">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[150px]">REFERENCE ID.</TableHead>
                  <TableHead>DESCRIPTION</TableHead>
                  <TableHead className="text-right">AMOUNT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-accent/5">
                  <TableCell className="font-mono text-muted-foreground">-</TableCell>
                  <TableCell className="font-semibold">Food Other Adjustments</TableCell>
                  <TableCell className="text-right font-mono">{renderCurrency((data as any).otherAdjFood)}</TableCell>
                </TableRow>
                <TableRow className="bg-accent/5">
                  <TableCell className="font-mono text-muted-foreground">-</TableCell>
                  <TableCell className="font-semibold">Beverage Other Adjustments</TableCell>
                  <TableCell className="text-right font-mono">{renderCurrency((data as any).otherAdjBeverage)}</TableCell>
                </TableRow>
                <TableRow className="font-bold bg-muted">
                  <TableCell colSpan={2} className="text-right">Other Adjustments TOTAL</TableCell>
                  <TableCell className="text-right">{renderCurrency(((data as any).otherAdjFood || 0) + ((data as any).otherAdjBeverage || 0))}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Total Expenses After Adjustments row */}
          <div className="mb-8">
            <Table className="w-full">
              <TableBody>
                <TableRow className="font-bold bg-primary/20 text-lg">
                  <TableCell colSpan={2} className="text-right">Total Expenses After Adjustments</TableCell>
                  <TableCell className="text-right">
                    {renderCurrency(
                      (data.totalExpenses || 0) - (((data as any).ocEntFood || 0) + ((data as any).ocEntBeverage || 0)) + (((data as any).otherAdjFood || 0) + ((data as any).otherAdjBeverage || 0))
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2 max-w-sm ml-auto text-right text-base font-semibold">
            <div className="flex justify-between items-center">
              <span>NET INCOME BEFORE TAXES</span>
              <span className="font-mono">{renderCurrency(grossProfit)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>INCOME TAX EXPENSE</span>
              <span className="font-mono">{renderCurrency(incomeTaxExpense)}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span>TAX RATE</span>
              <span className="font-mono">{renderPercentage(taxRate)}</span>
            </div>
            <div className="flex justify-between items-center text-lg pt-2 font-extrabold text-primary">
              <span>NET INCOME</span>
              <span className="font-mono">{renderCurrency(netIncome)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 