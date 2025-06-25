"use client";

import { useState, useEffect, useMemo } from "react";
import { subDays, format as formatDateFn } from "date-fns";
import { cn, formatNumber } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { showToast } from "@/lib/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileSpreadsheet,
  FileText,
  Filter,
  Download,
  Info,
  RefreshCw,
  Clock,
  Play,
  Pause,
} from "lucide-react";
import {
  getOutletsAction,
  getFlashFoodCostReportAction,
  getDetailedFoodCostReportAction,
  getCostAnalysisByCategoryReportAction,
} from "@/actions/foodCostActions";
import { getDetailedBeverageCostReportAction } from "@/actions/beverageCostActions";
import {
  getMonthlyProfitLossReportAction,
  getMonthlyProfitLossReportForDateRangeAction,
  getBudgetVsActualsReportAction,
  getDailyRevenueTrendsReportAction,
  getYearOverYearReportAction,
  getRealTimeKPIDashboardAction,
  getForecastingReportAction,
} from "@/actions/profitLossActions";
import type {
  Outlet,
  DailyFinancialSummary,
  DetailedFoodCostReport,
  DetailedFoodCostReportResponse,
  DetailedBeverageCostReportResponse,
  MonthlyProfitLossReport,
  CostAnalysisByCategoryReport,
  BudgetVsActualsReport,
  DailyRevenueTrendsReport,
  YearOverYearReport,
  RealTimeKPIDashboard,
  ForecastingReport,
} from "@/types";
import { FlashFoodCostReportTable } from "../../ui/flash-food-cost-report-table";
import { DetailedFoodCostReportTable } from "../../ui/detailed-food-cost-report-table";
import { CombinedFoodCostReportTable } from "../../ui/combined-food-cost-report-table";
import { DetailedBeverageCostReportTable } from "../../ui/detailed-beverage-cost-report-table";
import { CombinedBeverageCostReportTable } from "../../ui/combined-beverage-cost-report-table";
import { MonthlyProfitLossReportTable } from "../../ui/MonthlyProfitLossReportTable";
import { CostAnalysisByCategoryReportTable } from "../../ui/cost-analysis-by-category-report-table";
import { BudgetVsActualsReportTable } from "../../ui/budget-vs-actuals-report-table";
import { DailyRevenueTrendsReportTable } from "../../ui/daily-revenue-trends-report-table";
import { YearOverYearReportTable } from "../../ui/year-over-year-report-table";
import { RealTimeKPIDashboardComponent } from "../../ui/real-time-kpi-dashboard";
import { ForecastingReportTable } from "../../ui/forecasting-report-table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import * as XLSX from "xlsx"; // Import the xlsx library
import { jsPDF } from "jspdf"; // Import jsPDF
import autoTable from "jspdf-autotable"; // Import jspdf-autotable

interface ReportOption {
  value: string;
  label: string;
}

const reportOptions: ReportOption[] = [
  // Existing Reports
  { value: "detailed_food_cost", label: "Detailed Food Cost Report" },
  { value: "detailed_beverage_cost", label: "Detailed Beverage Cost Report" },
  { value: "monthly_profit_loss", label: "Monthly Profit/Loss Report" },
  { value: "cost_analysis_by_category", label: "Cost Analysis by Category" },
  { value: "budget_vs_actuals", label: "Budget vs. Actuals (F&B)" },
  { value: "daily_revenue_trends", label: "Daily Revenue Trends" },
  
  // Required New Reports
  { value: "year_over_year", label: "Year-over-Year Comparison" },
  { value: "real_time_kpi", label: "Real-Time KPI Dashboard" },
  { value: "forecasting_report", label: "Revenue & Cost Forecasting" },
];

export default function ReportsClient() {
  const [selectedReport, setSelectedReport] =
    useState<string>("detailed_food_cost");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [allOutlets, setAllOutlets] = useState<Outlet[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<string | undefined>(
    "all"
  );
  const [isFetchingOutlets, setIsFetchingOutlets] = useState(true);
  const [reportData, setReportData] = useState<
    | DetailedFoodCostReportResponse
    | DetailedBeverageCostReportResponse
    | MonthlyProfitLossReport
    | CostAnalysisByCategoryReport
    | BudgetVsActualsReport
    | DailyRevenueTrendsReport
    | YearOverYearReport
    | RealTimeKPIDashboard
    | ForecastingReport
    | null
  >(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(
    null
  );


  // Helper function to render currency
  const renderCurrency = (value: number | null | undefined) => {
    if (value == null) return "-";
    return `$${formatNumber(value)}`;
  };

  // Helper function to render percentage
  const renderPercentage = (value: number | null | undefined) => {
    if (value == null) return "-";
    return `${formatNumber(value)}%`;
  };

  // Add effect to handle outlet selection when report type changes
  useEffect(() => {
    if (
      selectedReport === "detailed_food_cost" ||
      selectedReport === "detailed_beverage_cost"
    ) {
      setSelectedOutletId("all");
    }
    // Clear report data when switching report types to prevent wrong data being passed to components
    setReportData(null);
  }, [selectedReport]);

  useEffect(() => {
    setDateRange({
      from: subDays(new Date(), 29),
      to: new Date(),
    });
  }, []);

  useEffect(() => {
    const fetchOutlets = async () => {
      setIsFetchingOutlets(true);
      try {
        const fetchedOutletsFromDB = await getOutletsAction();
        setAllOutlets([
          { id: "all", name: "All Outlets" },
          ...fetchedOutletsFromDB,
        ]);
      } catch (error) {
        console.error("Error fetching outlets:", error);
        showToast.error((error as Error).message);
      } finally {
        setIsFetchingOutlets(false);
      }
    };
    fetchOutlets();
  }, []);

  const handleGenerateReport = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      showToast.error("Please select a date range to generate the report.");
      return;
    }

    setIsLoadingReport(true);
    setReportData(null); // Clear previous report data

    try {
      if (selectedReport === "detailed_food_cost") {
        if (!dateRange?.from || !dateRange?.to) {
          showToast.error("Please select a valid date range.");
          return;
        }
        console.log("Calling getDetailedFoodCostReportAction from client...");
        const data = await getDetailedFoodCostReportAction(
          dateRange.from,
          dateRange.to,
          "all"
        );
        setReportData(data);
      } else if (selectedReport === "detailed_beverage_cost") {
        console.log(
          "Calling getDetailedBeverageCostReportAction from client..."
        );
        const data = await getDetailedBeverageCostReportAction(
          dateRange.from,
          dateRange.to,
          "all"
        );
        setReportData(data);
      } else if (selectedReport === "monthly_profit_loss") {
        if (!dateRange?.from || !dateRange?.to) {
          showToast.error("Please select a date range for the monthly report.");
          return;
        }
        console.log("Calling getMonthlyProfitLossReportAction from client...");
        console.log("Date range:", dateRange.from, "to", dateRange.to);

        // For Monthly Profit/Loss Report, we'll use the entire date range
        // but we need to create a new action that accepts date range instead of year/month
        const data = await getMonthlyProfitLossReportForDateRangeAction(
          dateRange.from,
          dateRange.to
        );
        console.log("Monthly Profit/Loss Report data:", data);
        console.log("incomeItems:", data.incomeItems);
        console.log("expenseItems:", data.expenseItems);
        setReportData(data);
      } else if (selectedReport === "cost_analysis_by_category") {
        console.log(
          "Calling getCostAnalysisByCategoryReportAction from client..."
        );
        const data = await getCostAnalysisByCategoryReportAction(
          dateRange.from,
          dateRange.to,
          selectedOutletId
        );
        console.log("Cost Analysis by Category Report data:", data);
        console.log("dateRange:", data.dateRange);
        setReportData(data);
      } else if (selectedReport === "budget_vs_actuals") {
        console.log("Calling getBudgetVsActualsReportAction from client...");
        const data = await getBudgetVsActualsReportAction(
          dateRange.from,
          dateRange.to,
          selectedOutletId
        );
        console.log("Budget vs. Actuals Report data:", data);
        console.log("Data structure check:", {
          hasFoodBudget: !!data.foodBudget,
          hasFoodActual: !!data.foodActual,
          hasFoodVariance: !!data.foodVariance,
          hasBeverageBudget: !!data.beverageBudget,
          hasBeverageActual: !!data.beverageActual,
          hasBeverageVariance: !!data.beverageVariance,
          hasCombinedBudget: !!data.combinedBudget,
          hasCombinedActual: !!data.combinedActual,
          hasCombinedVariance: !!data.combinedVariance,
          hasDailyBreakdown: !!data.dailyBreakdown,
          hasPerformanceIndicators: !!data.performanceIndicators,
          dailyBreakdownLength: data.dailyBreakdown?.length || 0,
        });
        setReportData(data);
      } else if (selectedReport === "daily_revenue_trends") {
        console.log("Calling getDailyRevenueTrendsReportAction from client...");
        const data = await getDailyRevenueTrendsReportAction(
          dateRange.from,
          dateRange.to,
          selectedOutletId
        );
        console.log("Daily Revenue Trends Report data:", data);
        setReportData(data);
      } else if (selectedReport === "year_over_year") {
        console.log("Calling getYearOverYearReportAction from client...");
        // For Year-over-Year, we'll use the current year from the date range
        const currentYear = dateRange.from.getFullYear();
        const data = await getYearOverYearReportAction(
          currentYear,
          selectedOutletId === "all" ? undefined : selectedOutletId
        );
        console.log("Year-over-Year Report data:", data);
        setReportData(data);
      } else if (selectedReport === "real_time_kpi") {
        console.log("Calling getRealTimeKPIDashboardAction from client...");
        const data = await getRealTimeKPIDashboardAction(
          undefined, // Always use all outlets for real-time KPI dashboard
          dateRange.from,
          dateRange.to
        );
        console.log("Real-Time KPI Dashboard data:", data);
        setReportData(data);
      } else if (selectedReport === "forecasting_report") {
        console.log("Calling getForecastingReportAction from client...");
        
        // For forecasting, ensure we have enough historical data
        // If selected range is too short, extend it backwards to get at least 7 days
        const minHistoricalDays = 7;
        const selectedDays = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        let historicalStart = new Date(dateRange.from);
        const historicalEnd = new Date(dateRange.to);
        
        if (selectedDays < minHistoricalDays) {
          // Extend the historical period backwards to get enough data
          historicalStart = new Date(dateRange.to);
          historicalStart.setDate(historicalStart.getDate() - (minHistoricalDays - 1));
        }
        
        // Predict for the next 30 days
        const forecastStartDate = new Date(dateRange.to);
        forecastStartDate.setDate(forecastStartDate.getDate() + 1);
        const forecastEndDate = new Date(forecastStartDate);
        forecastEndDate.setDate(forecastEndDate.getDate() + 30);
        
        const data = await getForecastingReportAction(
          { from: historicalStart, to: historicalEnd }, // Extended historical period
          { from: forecastStartDate, to: forecastEndDate }, // Forecast period
          undefined // Always use all outlets for forecasting report
        );
        console.log("Forecasting Report data:", data);
        setReportData(data);
      } else {
        // Fallback for other reports not yet implemented
        console.log(
          `Generating ${selectedReport} for ${formatDateFn(
            dateRange.from,
            "PPP"
          )} to ${formatDateFn(dateRange.to, "PPP")}`
        );
        setReportData(null); // Clear data for unsupported reports
      }
      setLastRefreshTime(new Date());
      showToast.success("Your report is ready.");
    } catch (error) {
      console.error("Error generating report:", error);
      showToast.error((error as Error).message || "Failed to generate report.");
    } finally {
      setIsLoadingReport(false);
    }
  };

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh && reportData) {
      const interval = setInterval(() => {
        handleGenerateReport();
      }, 30000); // Refresh every 30 seconds

      setRefreshInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [autoRefresh, reportData, dateRange, selectedReport, selectedOutletId]);

  const handleRefresh = () => {
    if (reportData) {
      handleGenerateReport();
    }
  };

  const handleExportToExcel = () => {
    if (!reportData) {
      showToast.error("Generate a report first before exporting.");
      return;
    }

    if (!dateRange?.from || !dateRange?.to) {
      showToast.error("Please select a date range to export the report.");
      return;
    }

    const ws_data: any[][] = [];

    if (
      selectedReport === "detailed_food_cost" &&
      "overallSummaryReport" in reportData
    ) {
      // Food Cost Report Export
      const foodReportData = reportData as DetailedFoodCostReportResponse;
      ws_data.push(["Detailed Food Cost Report (All Outlets)"]);
      ws_data.push([
        `Date Range: ${formatDateFn(
          foodReportData.overallSummaryReport.dateRange.from,
          "MMM dd, yyyy"
        )} - ${formatDateFn(
          foodReportData.overallSummaryReport.dateRange.to,
          "MMM dd, yyyy"
        )}`,
      ]);
      ws_data.push([]); // Empty row for spacing
      ws_data.push(["Summary Financial Metrics"]);
      ws_data.push(["Details", "Total"]);
      ws_data.push([
        "Total Food Revenue:",
        formatNumber(foodReportData.overallSummaryReport.totalFoodRevenue),
      ]);
      ws_data.push([
        "Budget Food Cost %:",
        formatNumber(
          foodReportData.overallSummaryReport.budgetFoodCostPercentage
        ),
      ]);
      ws_data.push([
        "OC Food:",
        formatNumber(foodReportData.overallSummaryReport.ocFoodTotal),
      ]);
      ws_data.push([
        "Entertainment Food:",
        formatNumber(foodReportData.overallSummaryReport.entFoodTotal),
      ]);
      ws_data.push([
        "Other Food Adjustments:",
        formatNumber(foodReportData.overallSummaryReport.otherAdjustmentsFood),
      ]);
      ws_data.push([
        "Total Cost of Food:",
        formatNumber(foodReportData.overallSummaryReport.totalCostOfFood),
      ]);
      ws_data.push([
        "Food Cost %:",
        formatNumber(foodReportData.overallSummaryReport.foodCostPercentage),
      ]);
      ws_data.push([
        "Variance %:",
        formatNumber(foodReportData.overallSummaryReport.variancePercentage),
      ]);
      ws_data.push([]); // Empty row for spacing

      // Add Individual Outlet Details
      ws_data.push(["Cost Details from Outlets"]);
      foodReportData.outletReports.forEach((outletReport) => {
        ws_data.push([]); // Empty row for spacing
        ws_data.push([
          `${outletReport.outletName} - Total Cost from Transfers:`,
          formatNumber(outletReport.totalCostFromTransfers),
        ]);
        ws_data.push(["Category", "Description", "Cost"]);
        if (outletReport.foodCostDetailsByItem.length > 0) {
          outletReport.foodCostDetailsByItem.forEach((item: any) => {
            ws_data.push([
              item.categoryName,
              item.description,
              formatNumber(item.cost),
            ]);
          });
        } else {
          ws_data.push([
            "No detailed food cost entries for this outlet.",
            "",
            "",
          ]);
        }
      });
    } else if (
      selectedReport === "detailed_beverage_cost" &&
      "overallSummaryReport" in reportData
    ) {
      // Beverage Cost Report Export
      const beverageReportData =
        reportData as DetailedBeverageCostReportResponse;
      ws_data.push(["Detailed Beverage Cost Report (All Outlets)"]);
      ws_data.push([
        `Date Range: ${formatDateFn(
          beverageReportData.overallSummaryReport.dateRange.from,
          "MMM dd, yyyy"
        )} - ${formatDateFn(
          beverageReportData.overallSummaryReport.dateRange.to,
          "MMM dd, yyyy"
        )}`,
      ]);
      ws_data.push([]); // Empty row for spacing
      ws_data.push(["Summary Financial Metrics"]);
      ws_data.push(["Details", "Total"]);
      ws_data.push([
        "Total Beverage Revenue:",
        formatNumber(
          beverageReportData.overallSummaryReport.totalBeverageRevenue
        ),
      ]);
      ws_data.push([
        "Budget Beverage Cost %:",
        formatNumber(
          beverageReportData.overallSummaryReport.budgetBeverageCostPercentage
        ),
      ]);
      ws_data.push([
        "OC Beverage:",
        formatNumber(beverageReportData.overallSummaryReport.ocBeverageTotal),
      ]);
      ws_data.push([
        "Entertainment Beverage:",
        formatNumber(beverageReportData.overallSummaryReport.entBeverageTotal),
      ]);
      ws_data.push([
        "Other Beverage Adjustments:",
        formatNumber(
          beverageReportData.overallSummaryReport.otherAdjustmentsBeverage
        ),
      ]);
      ws_data.push([
        "Total Cost of Beverage:",
        formatNumber(
          beverageReportData.overallSummaryReport.totalCostOfBeverage
        ),
      ]);
      ws_data.push([
        "Beverage Cost %:",
        formatNumber(
          beverageReportData.overallSummaryReport.beverageCostPercentage
        ),
      ]);
      ws_data.push([
        "Variance %:",
        formatNumber(
          beverageReportData.overallSummaryReport.variancePercentage
        ),
      ]);
      ws_data.push([]); // Empty row for spacing

      // Add Individual Outlet Details
      ws_data.push(["Cost Details from Outlets"]);
      beverageReportData.outletReports.forEach((outletReport) => {
        ws_data.push([]); // Empty row for spacing
        ws_data.push([
          `${outletReport.outletName} - Total Cost from Transfers:`,
          formatNumber(outletReport.totalCostFromTransfers),
        ]);
        ws_data.push(["Category", "Description", "Cost"]);
        if (outletReport.beverageCostDetailsByItem.length > 0) {
          outletReport.beverageCostDetailsByItem.forEach((item: any) => {
            ws_data.push([
              item.categoryName,
              item.description,
              formatNumber(item.cost),
            ]);
          });
        } else {
          ws_data.push([
            "No detailed beverage cost entries for this outlet.",
            "",
            "",
          ]);
        }
      });
    } else if (
      selectedReport === "monthly_profit_loss" &&
      "monthYear" in reportData
    ) {
      const monthlyReportData = reportData as MonthlyProfitLossReport;
      ws_data.push([
        `Monthly Profit/Loss Report for ${monthlyReportData.monthYear}`,
      ]);
      ws_data.push([]);
      // INCOME SECTION
      ws_data.push(["INCOME"]);
      ws_data.push(["REFERENCE ID.", "DESCRIPTION", "AMOUNT"]);
      monthlyReportData.incomeItems.forEach((item) => {
        ws_data.push([
          item.referenceId,
          item.description,
          formatNumber(item.amount),
        ]);
      });
      ws_data.push([
        "",
        "INCOME TOTAL",
        formatNumber(monthlyReportData.totalIncome),
      ]);
      ws_data.push([]);
      // EXPENSES SECTION
      ws_data.push(["EXPENSES"]);
      ws_data.push(["REFERENCE ID.", "DESCRIPTION", "AMOUNT"]);
      monthlyReportData.expenseItems.forEach((item) => {
        ws_data.push([
          item.referenceId,
          item.description,
          formatNumber(item.amount),
        ]);
      });
      ws_data.push([
        "",
        "EXPENSE TOTAL",
        formatNumber(monthlyReportData.totalExpenses),
      ]);
      ws_data.push([]);
      // OC & ENT SECTION
      ws_data.push(["OC & ENT"]);
      ws_data.push(["REFERENCE ID.", "DESCRIPTION", "AMOUNT"]);
      ws_data.push([
        "OC-001",
        "Food OC & ENT",
        formatNumber((monthlyReportData as any).ocEntFood),
      ]);
      ws_data.push([
        "OC-002",
        "Beverage OC & ENT",
        formatNumber((monthlyReportData as any).ocEntBeverage),
      ]);
      ws_data.push([
        "",
        "OC & ENT TOTAL",
        formatNumber(
          ((monthlyReportData as any).ocEntFood || 0) +
            ((monthlyReportData as any).ocEntBeverage || 0)
        ),
      ]);
      ws_data.push([]);
      // Other Adjustments SECTION
      ws_data.push(["Other Adjustments"]);
      ws_data.push(["REFERENCE ID.", "DESCRIPTION", "AMOUNT"]);
      ws_data.push([
        "OA-001",
        "Food Other Adjustments",
        formatNumber((monthlyReportData as any).otherAdjFood),
      ]);
      ws_data.push([
        "OA-002",
        "Beverage Other Adjustments",
        formatNumber((monthlyReportData as any).otherAdjBeverage),
      ]);
      ws_data.push([
        "",
        "Other Adjustments TOTAL",
        formatNumber(
          ((monthlyReportData as any).otherAdjFood || 0) +
            ((monthlyReportData as any).otherAdjBeverage || 0)
        ),
      ]);
      ws_data.push([]);
      // Total Expenses After Adjustments
      ws_data.push([
        "",
        "Total Expenses After Adjustments",
        formatNumber(
          (monthlyReportData.totalExpenses || 0) -
            (((monthlyReportData as any).ocEntFood || 0) +
              ((monthlyReportData as any).ocEntBeverage || 0)) +
            (((monthlyReportData as any).otherAdjFood || 0) +
              ((monthlyReportData as any).otherAdjBeverage || 0))
        ),
      ]);
      ws_data.push([]);
      // Summary Section
      ws_data.push(["Summary"]);
      ws_data.push([
        "NET INCOME BEFORE TAXES",
        formatNumber(monthlyReportData.netIncomeBeforeTaxes),
      ]);
      ws_data.push([
        "INCOME TAX EXPENSE",
        formatNumber(monthlyReportData.incomeTaxExpense),
      ]);
      ws_data.push([
        "TAX RATE",
        formatNumber(monthlyReportData.taxRate || 0) + "%",
      ]);
      ws_data.push(["NET INCOME", formatNumber(monthlyReportData.netIncome)]);

      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Monthly Profit Loss Report");
      XLSX.writeFile(
        wb,
        `Monthly_Profit_Loss_Report_${monthlyReportData.monthYear.replace(
          /[^a-zA-Z0-9-]/g,
          "_"
        )}.xlsx`
      );

      showToast.success("Report successfully exported to Excel.");
      return; // Exit early to avoid creating duplicate files
    } else if (
      selectedReport === "cost_analysis_by_category" &&
      "foodCategories" in reportData
    ) {
      const categoryReport = reportData as CostAnalysisByCategoryReport;
      const selectedOutlet = allOutlets.find((o) => o.id === selectedOutletId);
      const isOutletSpecific =
        selectedOutletId && selectedOutletId !== "all" && selectedOutlet;

      ws_data.push(["Cost Analysis by Category Report"]);
      if (isOutletSpecific) {
        ws_data.push([`Outlet: ${selectedOutlet.name}`]);
      }
      ws_data.push([
        `Date Range: ${formatDateFn(
          categoryReport.dateRange.from,
          "MMM dd, yyyy"
        )} - ${formatDateFn(categoryReport.dateRange.to, "MMM dd, yyyy")}`,
      ]);
      ws_data.push([]);

      // Summary section
      ws_data.push(["Summary"]);
      ws_data.push([
        "Total Food Revenue",
        formatNumber(categoryReport.totalFoodRevenue),
      ]);
      ws_data.push([
        "Total Beverage Revenue",
        formatNumber(categoryReport.totalBeverageRevenue),
      ]);
      ws_data.push([
        "Total Revenue",
        formatNumber(categoryReport.totalRevenue),
      ]);
      ws_data.push([
        "Total Food Cost",
        formatNumber(categoryReport.totalFoodCost),
      ]);
      ws_data.push([
        "Total Beverage Cost",
        formatNumber(categoryReport.totalBeverageCost),
      ]);
      ws_data.push(["Total Cost", formatNumber(categoryReport.totalCost)]);
      ws_data.push([
        "Overall Food Cost %",
        formatNumber(categoryReport.overallFoodCostPercentage),
      ]);
      ws_data.push([
        "Overall Beverage Cost %",
        formatNumber(categoryReport.overallBeverageCostPercentage),
      ]);
      ws_data.push([
        "Overall Cost %",
        formatNumber(categoryReport.overallCostPercentage),
      ]);
      ws_data.push([]);

      // Food Categories
      ws_data.push(["Food Categories Analysis"]);
      ws_data.push([
        "Category",
        "Total Cost",
        "% of Food Cost",
        "% of Total Revenue",
        "Avg Daily Cost",
      ]);
      categoryReport.foodCategories.forEach((category) => {
        ws_data.push([
          category.categoryName,
          formatNumber(category.totalCost),
          formatNumber(category.percentageOfTotalFoodCost),
          formatNumber(category.percentageOfTotalRevenue),
          formatNumber(category.averageDailyCost),
        ]);
      });
      ws_data.push([]);

      // Beverage Categories
      ws_data.push(["Beverage Categories Analysis"]);
      ws_data.push([
        "Category",
        "Total Cost",
        "% of Beverage Cost",
        "% of Total Revenue",
        "Avg Daily Cost",
      ]);
      categoryReport.beverageCategories.forEach((category) => {
        ws_data.push([
          category.categoryName,
          formatNumber(category.totalCost),
          formatNumber(category.percentageOfTotalBeverageCost),
          formatNumber(category.percentageOfTotalRevenue),
          formatNumber(category.averageDailyCost),
        ]);
      });
      ws_data.push([]);

      // Key Insights Section
      ws_data.push(["Key Insights"]);
      ws_data.push([]);
      
      // Food Key Insights
      ws_data.push(["Food Key Insights"]);
      ws_data.push(["Total Food Revenue", formatNumber(categoryReport.totalFoodRevenue)]);
      ws_data.push(["Food Cost Percentage", formatNumber(categoryReport.overallFoodCostPercentage) + "%"]);
      ws_data.push(["Food Categories Analyzed", categoryReport.foodCategories.length]);
      const daysInRange = Math.ceil((categoryReport.dateRange.to.getTime() - categoryReport.dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      ws_data.push(["Average Daily Food Cost", formatNumber(categoryReport.totalFoodCost / daysInRange)]);
      ws_data.push([]);
      
      ws_data.push(["Top Food Performers"]);
      categoryReport.topFoodCategories.slice(0, 3).forEach((category, index) => {
        ws_data.push([
          `#${index + 1} ${category.categoryName}`,
          formatNumber(category.percentageOfTotalFoodCost) + "% of food costs"
        ]);
      });
      ws_data.push([]);
      
      if (categoryReport.topFoodCategories[0]) {
        ws_data.push([
          "Food Insight",
          `${categoryReport.topFoodCategories[0].categoryName} is your highest food cost category, representing ${formatNumber(categoryReport.topFoodCategories[0].percentageOfTotalFoodCost)}% of total food costs.`
        ]);
      }
      ws_data.push([]);
      
      // Beverage Key Insights
      ws_data.push(["Beverage Key Insights"]);
      ws_data.push(["Total Beverage Revenue", formatNumber(categoryReport.totalBeverageRevenue)]);
      ws_data.push(["Beverage Cost Percentage", formatNumber(categoryReport.overallBeverageCostPercentage) + "%"]);
      ws_data.push(["Beverage Categories Analyzed", categoryReport.beverageCategories.length]);
      ws_data.push(["Average Daily Beverage Cost", formatNumber(categoryReport.totalBeverageCost / daysInRange)]);
      ws_data.push([]);
      
      ws_data.push(["Top Beverage Performers"]);
      categoryReport.topBeverageCategories.slice(0, 3).forEach((category, index) => {
        ws_data.push([
          `#${index + 1} ${category.categoryName}`,
          formatNumber(category.percentageOfTotalBeverageCost) + "% of beverage costs"
        ]);
      });
      ws_data.push([]);
      
      if (categoryReport.topBeverageCategories[0]) {
        ws_data.push([
          "Beverage Insight",
          `${categoryReport.topBeverageCategories[0].categoryName} is your highest beverage cost category, representing ${formatNumber(categoryReport.topBeverageCategories[0].percentageOfTotalBeverageCost)}% of total beverage costs.`
        ]);
      }
      ws_data.push([]);
      
      // Overall Summary
      ws_data.push(["Overall Performance Summary"]);
      ws_data.push(["Total Revenue", formatNumber(categoryReport.totalRevenue)]);
      ws_data.push(["Overall Cost Percentage", formatNumber(categoryReport.overallCostPercentage) + "%"]);
      ws_data.push(["Total Categories Analyzed", categoryReport.foodCategories.length + categoryReport.beverageCategories.length]);
      ws_data.push([]);

      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Cost Analysis by Category");
      XLSX.writeFile(
        wb,
        `Cost_Analysis_by_Category_Report_${formatDateFn(
          dateRange.from,
          "yyyyMMdd"
        )}_to_${formatDateFn(dateRange.to, "yyyyMMdd")}.xlsx`
      );

      showToast.success("Report successfully exported to Excel.");
      return; // Exit early to avoid creating duplicate files
    } else if (
      selectedReport === "budget_vs_actuals" &&
      "foodBudget" in reportData
    ) {
      const budgetVsActualsReport = reportData as BudgetVsActualsReport;
      ws_data.push(["Budget vs. Actuals Report"]);
      ws_data.push([
        `Date Range: ${formatDateFn(
          budgetVsActualsReport.dateRange.from,
          "MMM dd, yyyy"
        )} - ${formatDateFn(
          budgetVsActualsReport.dateRange.to,
          "MMM dd, yyyy"
        )}`,
      ]);
      if (budgetVsActualsReport.outletName) {
        ws_data.push([`Outlet: ${budgetVsActualsReport.outletName}`]);
      }
      ws_data.push([]);

      // Food section
      ws_data.push(["Food Budget vs Actuals"]);
      ws_data.push(["Metric", "Budget", "Actual", "Variance", "Variance %"]);
      ws_data.push([
        "Revenue",
        budgetVsActualsReport.foodBudget.budgetedRevenue,
        budgetVsActualsReport.foodActual.actualRevenue,
        budgetVsActualsReport.foodVariance.revenueVariance,
        budgetVsActualsReport.foodVariance.revenueVariancePercentage,
      ]);
      ws_data.push([
        "Cost",
        budgetVsActualsReport.foodBudget.budgetedCost,
        budgetVsActualsReport.foodActual.actualCost,
        budgetVsActualsReport.foodVariance.costVariance,
        budgetVsActualsReport.foodVariance.costVariancePercentage,
      ]);
      ws_data.push([
        "Cost %",
        budgetVsActualsReport.foodBudget.budgetedCostPercentage,
        budgetVsActualsReport.foodActual.actualCostPercentage,
        budgetVsActualsReport.foodVariance.costPercentageVariance,
        "",
      ]);
      ws_data.push([]);

      // Beverage section
      ws_data.push(["Beverage Budget vs Actuals"]);
      ws_data.push(["Metric", "Budget", "Actual", "Variance", "Variance %"]);
      ws_data.push([
        "Revenue",
        budgetVsActualsReport.beverageBudget.budgetedRevenue,
        budgetVsActualsReport.beverageActual.actualRevenue,
        budgetVsActualsReport.beverageVariance.revenueVariance,
        budgetVsActualsReport.beverageVariance.revenueVariancePercentage,
      ]);
      ws_data.push([
        "Cost",
        budgetVsActualsReport.beverageBudget.budgetedCost,
        budgetVsActualsReport.beverageActual.actualCost,
        budgetVsActualsReport.beverageVariance.costVariance,
        budgetVsActualsReport.beverageVariance.costVariancePercentage,
      ]);
      ws_data.push([
        "Cost %",
        budgetVsActualsReport.beverageBudget.budgetedCostPercentage,
        budgetVsActualsReport.beverageActual.actualCostPercentage,
        budgetVsActualsReport.beverageVariance.costPercentageVariance,
        "",
      ]);
      ws_data.push([]);

      // Combined section
      ws_data.push(["Combined F&B Budget vs Actuals"]);
      ws_data.push(["Metric", "Budget", "Actual", "Variance", "Variance %"]);
      ws_data.push([
        "Revenue",
        budgetVsActualsReport.combinedBudget.budgetedRevenue,
        budgetVsActualsReport.combinedActual.actualRevenue,
        budgetVsActualsReport.combinedVariance.revenueVariance,
        budgetVsActualsReport.combinedVariance.revenueVariancePercentage,
      ]);
      ws_data.push([
        "Cost",
        budgetVsActualsReport.combinedBudget.budgetedCost,
        budgetVsActualsReport.combinedActual.actualCost,
        budgetVsActualsReport.combinedVariance.costVariance,
        budgetVsActualsReport.combinedVariance.costVariancePercentage,
      ]);
      ws_data.push([
        "Cost %",
        budgetVsActualsReport.combinedBudget.budgetedCostPercentage,
        budgetVsActualsReport.combinedActual.actualCostPercentage,
        budgetVsActualsReport.combinedVariance.costPercentageVariance,
        "",
      ]);

      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Budget vs. Actuals Report");
      XLSX.writeFile(
        wb,
        `Budget_vs_Actuals_Report_${formatDateFn(
          dateRange.from,
          "yyyyMMdd"
        )}_to_${formatDateFn(dateRange.to, "yyyyMMdd")}.xlsx`
      );

      showToast.success("Report successfully exported to Excel.");
    } else if (
      selectedReport === "daily_revenue_trends" &&
      "summary" in reportData
    ) {
      const dailyRevenueTrendsReport = reportData as DailyRevenueTrendsReport;
      ws_data.push(["Daily Revenue Trends Report"]);
      ws_data.push([
        `Date Range: ${formatDateFn(
          dateRange.from,
          "MMM dd, yyyy"
        )} - ${formatDateFn(dateRange.to, "MMM dd, yyyy")}`,
      ]);
      if (dailyRevenueTrendsReport.outletName) {
        ws_data.push([`Outlet: ${dailyRevenueTrendsReport.outletName}`]);
      }
      ws_data.push([]);

      // Summary section
      ws_data.push(["Summary"]);
      ws_data.push(["Metric", "Value"]);
      ws_data.push([
        "Total Food Revenue",
        formatNumber(dailyRevenueTrendsReport.summary.totalFoodRevenue),
      ]);
      ws_data.push([
        "Total Beverage Revenue",
        formatNumber(dailyRevenueTrendsReport.summary.totalBeverageRevenue),
      ]);
      ws_data.push([
        "Total Revenue",
        formatNumber(dailyRevenueTrendsReport.summary.totalRevenue),
      ]);
      ws_data.push([
        "Average Daily Food Revenue",
        formatNumber(dailyRevenueTrendsReport.summary.averageDailyFoodRevenue),
      ]);
      ws_data.push([
        "Average Daily Beverage Revenue",
        formatNumber(
          dailyRevenueTrendsReport.summary.averageDailyBeverageRevenue
        ),
      ]);
      ws_data.push([
        "Average Daily Total Revenue",
        formatNumber(dailyRevenueTrendsReport.summary.averageDailyTotalRevenue),
      ]);
      ws_data.push(["Total Days", dailyRevenueTrendsReport.summary.totalDays]);
      ws_data.push([]);

      // Daily trends section
      ws_data.push(["Daily Trends"]);
      ws_data.push([
        "Date",
        "Food Revenue",
        "Beverage Revenue",
        "Total Revenue",
        "Food Change %",
        "Beverage Change %",
        "Total Change %",
      ]);
      dailyRevenueTrendsReport.dailyTrends.forEach((trend) => {
        ws_data.push([
          formatDateFn(trend.date, "MMM dd, yyyy"),
          formatNumber(trend.foodRevenue),
          formatNumber(trend.beverageRevenue),
          formatNumber(trend.totalRevenue),
          formatNumber(trend.foodRevenueChangePercentage),
          formatNumber(trend.beverageRevenueChangePercentage),
          formatNumber(trend.totalRevenueChangePercentage),
        ]);
      });
      ws_data.push([]);

      // Weekly trends section
      ws_data.push(["Weekly Trends"]);
      ws_data.push([
        "Week",
        "Total Food Revenue",
        "Total Beverage Revenue",
        "Total Revenue",
        "Avg Daily Food",
        "Avg Daily Beverage",
        "Avg Daily Total",
        "Days",
      ]);
      dailyRevenueTrendsReport.weeklyTrends.forEach((week) => {
        ws_data.push([
          `${formatDateFn(week.weekStart, "MMM dd")} - ${formatDateFn(
            week.weekEnd,
            "MMM dd"
          )}`,
          formatNumber(week.totalFoodRevenue),
          formatNumber(week.totalBeverageRevenue),
          formatNumber(week.totalRevenue),
          formatNumber(week.averageDailyFoodRevenue),
          formatNumber(week.averageDailyBeverageRevenue),
          formatNumber(week.averageDailyTotalRevenue),
          week.daysInWeek,
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Daily Revenue Trends Report");
      XLSX.writeFile(
        wb,
        `Daily_Revenue_Trends_Report_${formatDateFn(
          dateRange.from,
          "yyyyMMdd"
        )}_to_${formatDateFn(dateRange.to, "yyyyMMdd")}.xlsx`
      );

      showToast.success("Report successfully exported to Excel.");
    }

    // Only create Excel files for food and beverage reports (monthly profit/loss handled above)
    if (
      selectedReport === "detailed_food_cost" ||
      selectedReport === "detailed_beverage_cost"
    ) {
      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        wb,
        ws,
        selectedReport === "detailed_food_cost"
          ? "Food Cost Report"
          : "Beverage Cost Report"
      );
      XLSX.writeFile(
        wb,
        `${
          selectedReport === "detailed_food_cost"
            ? "Detailed_Food_Cost_Report"
            : "Detailed_Beverage_Cost_Report"
        }_${formatDateFn(dateRange.from, "yyyyMMdd")}_to_${formatDateFn(
          dateRange.to,
          "yyyyMMdd"
        )}.xlsx`
      );

      showToast.success("Report successfully exported to Excel.");
    }
  };

  const handleExportToPDF = () => {
    if (!reportData) {
      showToast.error("Generate a report first before exporting.");
      return;
    }

    if (!dateRange?.from || !dateRange?.to) {
      showToast.error("Please select a date range to export the report.");
      return;
    }

    const doc = new jsPDF();
    let yPos = 10; // Initial Y position

    if (
      selectedReport === "detailed_food_cost" &&
      "overallSummaryReport" in reportData
    ) {
      // Food Cost Report Export
      const foodReportData = reportData as DetailedFoodCostReportResponse;

      // Report Title and Date Range
      doc.setFontSize(18);
      doc.text("Detailed Food Cost Report (All Outlets)", 14, yPos);
      yPos += 10;
      doc.setFontSize(10);
      doc.text(
        `Date Range: ${formatDateFn(
          dateRange.from,
          "MMM dd, yyyy"
        )} - ${formatDateFn(dateRange.to, "MMM dd, yyyy")}`,
        14,
        yPos
      );
      yPos += 15;

      // Summary Financial Metrics
      doc.setFontSize(14);
      doc.text("Summary Financial Metrics", 14, yPos);
      yPos += 5; // Small gap

      const summaryHeaders = [["Details", "Total"]];
      const summaryData: string[][] = [
        [
          "Total Food Revenue:",
          renderCurrency(foodReportData.overallSummaryReport.totalFoodRevenue),
        ],
        [
          "Budget Food Cost %:",
          renderPercentage(
            foodReportData.overallSummaryReport.budgetFoodCostPercentage
          ),
        ],
        [
          "OC Food:",
          renderCurrency(foodReportData.overallSummaryReport.ocFoodTotal),
        ],
        [
          "Entertainment Food:",
          renderCurrency(foodReportData.overallSummaryReport.entFoodTotal),
        ],
        [
          "Other Food Adjustments:",
          renderCurrency(
            foodReportData.overallSummaryReport.otherAdjustmentsFood
          ),
        ],
        [
          "Total Cost of Food:",
          renderCurrency(foodReportData.overallSummaryReport.totalCostOfFood),
        ],
        [
          "Food Cost %:",
          renderPercentage(
            foodReportData.overallSummaryReport.foodCostPercentage
          ),
        ],
        [
          "Variance %:",
          renderPercentage(
            foodReportData.overallSummaryReport.variancePercentage
          ),
        ],
      ];

      autoTable(doc, {
        startY: yPos,
        head: summaryHeaders,
        body: summaryData,
        theme: "grid",
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 1: { halign: "right" } },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos; // Update yPos after table
        },
      });
      yPos += 15; // Gap after summary table

      // Individual Outlet Sections
      doc.setFontSize(14);
      doc.text("Cost Details from Outlets", 14, yPos);
      yPos += 5;

      foodReportData.outletReports.forEach((outletReport, index) => {
        if (yPos + 40 > doc.internal.pageSize.height) {
          doc.addPage();
          yPos = 10;
          doc.setFontSize(14);
          doc.text("Cost Details from Outlets (continued)", 14, yPos);
          yPos += 5;
        }

        doc.setFontSize(12);
        doc.text(
          `${
            outletReport.outletName
          } - Total Cost from Transfers: ${renderCurrency(
            outletReport.totalCostFromTransfers
          )}`,
          14,
          yPos
        );
        yPos += 5;

        const outletDetailsHeaders = [["Category", "Description", "Cost"]];
        const outletDetailsData =
          outletReport.foodCostDetailsByItem.length > 0
            ? outletReport.foodCostDetailsByItem.map(
                (item: {
                  categoryName: string;
                  description: string;
                  cost: number;
                }) => [
                  item.categoryName,
                  item.description,
                  renderCurrency(item.cost),
                ]
              )
            : [["No detailed food cost entries for this outlet.", "", ""]];

        autoTable(doc, {
          startY: yPos,
          head: outletDetailsHeaders,
          body: outletDetailsData,
          theme: "grid",
          headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: "bold",
          },
          styles: { fontSize: 9, cellPadding: 1.5 },
          columnStyles: { 2: { halign: "right" } },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos; // Update yPos after table
          },
        });
        yPos += 10; // Gap after each outlet table
      });

      doc.save(
        `Detailed_Food_Cost_Report_${formatDateFn(
          dateRange.from,
          "yyyyMMdd"
        )}_to_${formatDateFn(dateRange.to, "yyyyMMdd")}.pdf`
      );
    } else if (
      selectedReport === "detailed_beverage_cost" &&
      "overallSummaryReport" in reportData
    ) {
      // Beverage Cost Report Export
      const beverageReportData =
        reportData as DetailedBeverageCostReportResponse;

      // Report Title and Date Range
      doc.setFontSize(18);
      doc.text("Detailed Beverage Cost Report (All Outlets)", 14, yPos);
      yPos += 10;
      doc.setFontSize(10);
      doc.text(
        `Date Range: ${formatDateFn(
          dateRange.from,
          "MMM dd, yyyy"
        )} - ${formatDateFn(dateRange.to, "MMM dd, yyyy")}`,
        14,
        yPos
      );
      yPos += 15;

      // Summary Financial Metrics
      doc.setFontSize(14);
      doc.text("Summary Financial Metrics", 14, yPos);
      yPos += 5; // Small gap

      const summaryHeaders = [["Details", "Total"]];
      const summaryData = [
        [
          "Total Beverage Revenue:",
          renderCurrency(
            beverageReportData.overallSummaryReport.totalBeverageRevenue
          ),
        ],
        [
          "Budget Beverage Cost %:",
          renderPercentage(
            beverageReportData.overallSummaryReport.budgetBeverageCostPercentage
          ),
        ],
        [
          "OC Beverage:",
          renderCurrency(
            beverageReportData.overallSummaryReport.ocBeverageTotal
          ),
        ],
        [
          "Entertainment Beverage:",
          renderCurrency(
            beverageReportData.overallSummaryReport.entBeverageTotal
          ),
        ],
        [
          "Other Beverage Adjustments:",
          renderCurrency(
            beverageReportData.overallSummaryReport.otherAdjustmentsBeverage
          ),
        ],
        [
          "Total Cost of Beverage:",
          renderCurrency(
            beverageReportData.overallSummaryReport.totalCostOfBeverage
          ),
        ],
        [
          "Beverage Cost %:",
          renderPercentage(
            beverageReportData.overallSummaryReport.beverageCostPercentage
          ),
        ],
        [
          "Variance %:",
          renderPercentage(
            beverageReportData.overallSummaryReport.variancePercentage
          ),
        ],
      ];

      autoTable(doc, {
        startY: yPos,
        head: summaryHeaders,
        body: summaryData,
        theme: "grid",
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 1: { halign: "right" } },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos; // Update yPos after table
        },
      });
      yPos += 15; // Gap after summary table

      // Individual Outlet Sections
      doc.setFontSize(14);
      doc.text("Cost Details from Outlets", 14, yPos);
      yPos += 5;

      beverageReportData.outletReports.forEach((outletReport, index) => {
        if (yPos + 40 > doc.internal.pageSize.height) {
          doc.addPage();
          yPos = 10;
          doc.setFontSize(14);
          doc.text("Cost Details from Outlets (continued)", 14, yPos);
          yPos += 5;
        }

        doc.setFontSize(12);
        doc.text(
          `${
            outletReport.outletName
          } - Total Cost from Transfers: ${renderCurrency(
            outletReport.totalCostFromTransfers
          )}`,
          14,
          yPos
        );
        yPos += 5;

        const outletDetailsHeaders = [["Category", "Description", "Cost"]];
        const outletDetailsData =
          outletReport.beverageCostDetailsByItem.length > 0
            ? outletReport.beverageCostDetailsByItem.map(
                (item: {
                  categoryName: string;
                  description: string;
                  cost: number;
                }) => [
                  item.categoryName,
                  item.description,
                  renderCurrency(item.cost),
                ]
              )
            : [["No detailed beverage cost entries for this outlet.", "", ""]];

        autoTable(doc, {
          startY: yPos,
          head: outletDetailsHeaders,
          body: outletDetailsData,
          theme: "grid",
          headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: "bold",
          },
          styles: { fontSize: 9, cellPadding: 1.5 },
          columnStyles: { 2: { halign: "right" } },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos; // Update yPos after table
          },
        });
        yPos += 10; // Gap after each outlet table
      });

      doc.save(
        `Detailed_Beverage_Cost_Report_${formatDateFn(
          dateRange.from,
          "yyyyMMdd"
        )}_to_${formatDateFn(dateRange.to, "yyyyMMdd")}.pdf`
      );
    } else if (
      selectedReport === "monthly_profit_loss" &&
      "monthYear" in reportData
    ) {
      const monthlyReportData = reportData as MonthlyProfitLossReport;
      doc.setFontSize(18);
      doc.text(
        `Monthly Profit/Loss Report for ${monthlyReportData.monthYear}`,
        14,
        yPos
      );
      yPos += 10;
      // INCOME SECTION
      doc.setFontSize(14);
      doc.text("INCOME", 14, yPos);
      yPos += 6;
      autoTable(doc, {
        startY: yPos,
        head: [["REFERENCE ID.", "DESCRIPTION", "AMOUNT"]],
        body: monthlyReportData.incomeItems.map((item) => [
          item.referenceId,
          item.description,
          renderCurrency(item.amount),
        ]),
        theme: "grid",
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 2: { halign: "right" } },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });
      yPos += 2;
      autoTable(doc, {
        startY: yPos,
        body: [
          ["", "INCOME TOTAL", renderCurrency(monthlyReportData.totalIncome)],
        ],
        theme: "plain",
        styles: { fontStyle: "bold", fontSize: 11, cellPadding: 2 },
        columnStyles: { 2: { halign: "right" } },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });
      yPos += 10;
      // EXPENSES SECTION
      doc.setFontSize(14);
      doc.text("EXPENSES", 14, yPos);
      yPos += 6;
      autoTable(doc, {
        startY: yPos,
        head: [["REFERENCE ID.", "DESCRIPTION", "AMOUNT"]],
        body: monthlyReportData.expenseItems.map((item) => [
          item.referenceId,
          item.description,
          renderCurrency(item.amount),
        ]),
        theme: "grid",
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 2: { halign: "right" } },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });
      yPos += 2;
      autoTable(doc, {
        startY: yPos,
        body: [
          [
            "",
            "EXPENSE TOTAL",
            renderCurrency(monthlyReportData.totalExpenses),
          ],
        ],
        theme: "plain",
        styles: { fontStyle: "bold", fontSize: 11, cellPadding: 2 },
        columnStyles: { 2: { halign: "right" } },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });
      yPos += 10;
      // OC & ENT SECTION
      doc.setFontSize(14);
      doc.text("OC & ENT", 14, yPos);
      yPos += 6;
      autoTable(doc, {
        startY: yPos,
        head: [["REFERENCE ID.", "DESCRIPTION", "AMOUNT"]],
        body: [
          [
            "OC-001",
            "Food OC & ENT",
            renderCurrency((monthlyReportData as any).ocEntFood),
          ],
          [
            "OC-002",
            "Beverage OC & ENT",
            renderCurrency((monthlyReportData as any).ocEntBeverage),
          ],
        ],
        theme: "grid",
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 2: { halign: "right" } },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });
      autoTable(doc, {
        startY: yPos,
        body: [
          [
            "",
            "OC & ENT TOTAL",
            renderCurrency(
              ((monthlyReportData as any).ocEntFood || 0) +
                ((monthlyReportData as any).ocEntBeverage || 0)
            ),
          ],
        ],
        theme: "plain",
        styles: { fontStyle: "bold", fontSize: 11, cellPadding: 2 },
        columnStyles: { 2: { halign: "right" } },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });
      yPos += 10;
      // Other Adjustments SECTION
      doc.setFontSize(14);
      doc.text("Other Adjustments", 14, yPos);
      yPos += 6;
      autoTable(doc, {
        startY: yPos,
        head: [["REFERENCE ID.", "DESCRIPTION", "AMOUNT"]],
        body: [
          [
            "OA-001",
            "Food Other Adjustments",
            renderCurrency((monthlyReportData as any).otherAdjFood),
          ],
          [
            "OA-002",
            "Beverage Other Adjustments",
            renderCurrency((monthlyReportData as any).otherAdjBeverage),
          ],
        ],
        theme: "grid",
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 2: { halign: "right" } },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });
      autoTable(doc, {
        startY: yPos,
        body: [
          [
            "",
            "Other Adjustments TOTAL",
            renderCurrency(
              ((monthlyReportData as any).otherAdjFood || 0) +
                ((monthlyReportData as any).otherAdjBeverage || 0)
            ),
          ],
        ],
        theme: "plain",
        styles: { fontStyle: "bold", fontSize: 11, cellPadding: 2 },
        columnStyles: { 2: { halign: "right" } },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });
      yPos += 10;
      // Total Expenses After Adjustments
      autoTable(doc, {
        startY: yPos,
        body: [
          [
            "",
            "Total Expenses After Adjustments",
            renderCurrency(
              (monthlyReportData.totalExpenses || 0) -
                (((monthlyReportData as any).ocEntFood || 0) +
                  ((monthlyReportData as any).ocEntBeverage || 0)) +
                (((monthlyReportData as any).otherAdjFood || 0) +
                  ((monthlyReportData as any).otherAdjBeverage || 0))
            ),
          ],
        ],
        theme: "plain",
        styles: {
          fontStyle: "bold",
          fontSize: 13,
          cellPadding: 2,
          fillColor: [220, 235, 255],
        },
        columnStyles: { 2: { halign: "right" } },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });
      yPos += 10;
      // Summary Section
      doc.setFontSize(13);
      autoTable(doc, {
        startY: yPos,
        body: [
          [
            "NET INCOME BEFORE TAXES",
            renderCurrency(monthlyReportData.netIncomeBeforeTaxes),
          ],
          [
            "INCOME TAX EXPENSE",
            renderCurrency(monthlyReportData.incomeTaxExpense),
          ],
          ["TAX RATE", renderPercentage(monthlyReportData.taxRate)],
          ["NET INCOME", renderCurrency(monthlyReportData.netIncome)],
        ],
        theme: "plain",
        styles: { fontStyle: "bold", fontSize: 12, cellPadding: 2 },
        columnStyles: { 1: { halign: "right" } },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });
      doc.save(
        `Monthly_Profit_Loss_Report_${monthlyReportData.monthYear.replace(
          / /g,
          "_"
        )}.pdf`
      );
    } else if (
      selectedReport === "cost_analysis_by_category" &&
      "foodCategories" in reportData
    ) {
      const categoryReport = reportData as CostAnalysisByCategoryReport;
      const selectedOutlet = allOutlets.find((o) => o.id === selectedOutletId);
      const isOutletSpecific =
        selectedOutletId && selectedOutletId !== "all" && selectedOutlet;

      doc.setFontSize(18);
      doc.text("Cost Analysis by Category Report", 14, yPos);
      yPos += 10;
      if (isOutletSpecific) {
        doc.setFontSize(12);
        doc.text(`Outlet: ${selectedOutlet.name}`, 14, yPos);
        yPos += 8;
      }
      doc.setFontSize(10);
      doc.text(
        `Date Range: ${formatDateFn(
          dateRange.from,
          "MMM dd, yyyy"
        )} - ${formatDateFn(dateRange.to, "MMM dd, yyyy")}`,
        14,
        yPos
      );
      yPos += 15;

      // Summary section
      doc.setFontSize(14);
      doc.text("Summary", 14, yPos);
      yPos += 6;
      const summaryHeaders = [["Metric", "Value"]];
      const summaryData = [
        ["Total Food Revenue", renderCurrency(categoryReport.totalFoodRevenue)],
        [
          "Total Beverage Revenue",
          renderCurrency(categoryReport.totalBeverageRevenue),
        ],
        ["Total Revenue", renderCurrency(categoryReport.totalRevenue)],
        ["Total Food Cost", renderCurrency(categoryReport.totalFoodCost)],
        [
          "Total Beverage Cost",
          renderCurrency(categoryReport.totalBeverageCost),
        ],
        ["Total Cost", renderCurrency(categoryReport.totalCost)],
        [
          "Overall Food Cost %",
          renderPercentage(categoryReport.overallFoodCostPercentage),
        ],
        [
          "Overall Beverage Cost %",
          renderPercentage(categoryReport.overallBeverageCostPercentage),
        ],
        [
          "Overall Cost %",
          renderPercentage(categoryReport.overallCostPercentage),
        ],
      ];

      autoTable(doc, {
        startY: yPos,
        head: summaryHeaders,
        body: summaryData,
        theme: "grid",
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 1: { halign: "right" } },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });
      yPos += 15;

      // Food Categories
      doc.setFontSize(14);
      doc.text("Food Categories Analysis", 14, yPos);
      yPos += 6;
      const foodHeaders = [
        [
          "Category",
          "Total Cost",
          "% of Food Cost",
          "% of Revenue",
          "Avg Daily Cost",
        ],
      ];
      const foodData = categoryReport.foodCategories.map((category) => [
        category.categoryName,
        renderCurrency(category.totalCost),
        renderPercentage(category.percentageOfTotalFoodCost),
        renderPercentage(category.percentageOfTotalRevenue),
        renderCurrency(category.averageDailyCost),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: foodHeaders,
        body: foodData,
        theme: "grid",
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        styles: { fontSize: 9, cellPadding: 1.5 },
        columnStyles: {
          1: { halign: "right" },
          2: { halign: "right" },
          3: { halign: "right" },
          4: { halign: "right" },
        },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });
      yPos += 15;

      // Beverage Categories
      doc.setFontSize(14);
      doc.text("Beverage Categories Analysis", 14, yPos);
      yPos += 6;
      const beverageHeaders = [
        [
          "Category",
          "Total Cost",
          "% of Beverage Cost",
          "% of Revenue",
          "Avg Daily Cost",
        ],
      ];
      const beverageData = categoryReport.beverageCategories.map((category) => [
        category.categoryName,
        renderCurrency(category.totalCost),
        renderPercentage(category.percentageOfTotalBeverageCost),
        renderPercentage(category.percentageOfTotalRevenue),
        renderCurrency(category.averageDailyCost),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: beverageHeaders,
        body: beverageData,
        theme: "grid",
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        styles: { fontSize: 9, cellPadding: 1.5 },
        columnStyles: {
          1: { halign: "right" },
          2: { halign: "right" },
          3: { halign: "right" },
          4: { halign: "right" },
        },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });

      // Key Insights Section
      yPos += 10;
      doc.setFontSize(14);
      doc.text("Key Insights", 14, yPos);
      yPos += 10;

      // Food Key Insights
      doc.setFontSize(12);
      doc.text("Food Key Insights", 14, yPos);
      yPos += 8;
      doc.setFontSize(10);
      
      const daysInRangePDF = Math.ceil((categoryReport.dateRange.to.getTime() - categoryReport.dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      const foodInsightsData = [
        ["Total Food Revenue", `$${formatNumber(categoryReport.totalFoodRevenue)}`],
        ["Food Cost Percentage", `${formatNumber(categoryReport.overallFoodCostPercentage)}%`],
        ["Food Categories Analyzed", categoryReport.foodCategories.length.toString()],
        ["Average Daily Food Cost", `$${formatNumber(categoryReport.totalFoodCost / daysInRangePDF)}`]
      ];

      autoTable(doc, {
        head: [["Metric", "Value"]],
        body: foodInsightsData,
        startY: yPos,
        theme: "grid",
        styles: { fontSize: 9 },
        columnStyles: {
          0: { halign: "left" },
          1: { halign: "right" },
        },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });

      yPos += 8;
      doc.setFontSize(10);
      doc.text("Top Food Performers:", 14, yPos);
      yPos += 5;
      
      const topFoodData = categoryReport.topFoodCategories.slice(0, 3).map((category, index) => [
        `#${index + 1}`,
        category.categoryName,
        `${formatNumber(category.percentageOfTotalFoodCost)}%`
      ]);

      autoTable(doc, {
        head: [["Rank", "Category", "% of Food Cost"]],
        body: topFoodData,
        startY: yPos,
        theme: "striped",
        styles: { fontSize: 9 },
        columnStyles: {
          0: { halign: "center" },
          1: { halign: "left" },
          2: { halign: "right" },
        },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });

      if (categoryReport.topFoodCategories[0]) {
        yPos += 5;
        doc.setFontSize(9);
        const foodInsightText = `Insight: ${categoryReport.topFoodCategories[0].categoryName} is your highest food cost category, representing ${formatNumber(categoryReport.topFoodCategories[0].percentageOfTotalFoodCost)}% of total food costs.`;
        const splitText = doc.splitTextToSize(foodInsightText, 180);
        doc.text(splitText, 14, yPos);
        yPos += splitText.length * 4;
      }

      // Beverage Key Insights
      yPos += 10;
      doc.setFontSize(12);
      doc.text("Beverage Key Insights", 14, yPos);
      yPos += 8;
      doc.setFontSize(10);

      const beverageInsightsData = [
        ["Total Beverage Revenue", `$${formatNumber(categoryReport.totalBeverageRevenue)}`],
        ["Beverage Cost Percentage", `${formatNumber(categoryReport.overallBeverageCostPercentage)}%`],
        ["Beverage Categories Analyzed", categoryReport.beverageCategories.length.toString()],
        ["Average Daily Beverage Cost", `$${formatNumber(categoryReport.totalBeverageCost / daysInRangePDF)}`]
      ];

      autoTable(doc, {
        head: [["Metric", "Value"]],
        body: beverageInsightsData,
        startY: yPos,
        theme: "grid",
        styles: { fontSize: 9 },
        columnStyles: {
          0: { halign: "left" },
          1: { halign: "right" },
        },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });

      yPos += 8;
      doc.setFontSize(10);
      doc.text("Top Beverage Performers:", 14, yPos);
      yPos += 5;
      
      const topBeverageData = categoryReport.topBeverageCategories.slice(0, 3).map((category, index) => [
        `#${index + 1}`,
        category.categoryName,
        `${formatNumber(category.percentageOfTotalBeverageCost)}%`
      ]);

      autoTable(doc, {
        head: [["Rank", "Category", "% of Beverage Cost"]],
        body: topBeverageData,
        startY: yPos,
        theme: "striped",
        styles: { fontSize: 9 },
        columnStyles: {
          0: { halign: "center" },
          1: { halign: "left" },
          2: { halign: "right" },
        },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });

      if (categoryReport.topBeverageCategories[0]) {
        yPos += 5;
        doc.setFontSize(9);
        const beverageInsightText = `Insight: ${categoryReport.topBeverageCategories[0].categoryName} is your highest beverage cost category, representing ${formatNumber(categoryReport.topBeverageCategories[0].percentageOfTotalBeverageCost)}% of total beverage costs.`;
        const splitText = doc.splitTextToSize(beverageInsightText, 180);
        doc.text(splitText, 14, yPos);
        yPos += splitText.length * 4;
      }

      // Overall Summary
      yPos += 10;
      doc.setFontSize(12);
      doc.text("Overall Performance Summary", 14, yPos);
      yPos += 8;

      const overallSummaryData = [
        ["Total Revenue", `$${formatNumber(categoryReport.totalRevenue)}`],
        ["Overall Cost Percentage", `${formatNumber(categoryReport.overallCostPercentage)}%`],
        ["Total Categories Analyzed", `${categoryReport.foodCategories.length + categoryReport.beverageCategories.length}`]
      ];

      autoTable(doc, {
        head: [["Metric", "Value"]],
        body: overallSummaryData,
        startY: yPos,
        theme: "grid",
        styles: { fontSize: 9 },
        columnStyles: {
          0: { halign: "left" },
          1: { halign: "right" },
        },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });

      doc.save(
        `Cost_Analysis_by_Category_Report_${formatDateFn(
          dateRange.from,
          "yyyyMMdd"
        )}_to_${formatDateFn(dateRange.to, "yyyyMMdd")}.pdf`
      );
    } else if (
      selectedReport === "budget_vs_actuals" &&
      "foodBudget" in reportData
    ) {
      const budgetVsActualsReport = reportData as BudgetVsActualsReport;
      doc.setFontSize(18);
      doc.text("Budget vs. Actuals Report", 14, yPos);
      yPos += 10;
      doc.setFontSize(10);
      doc.text(
        `Date Range: ${formatDateFn(
          dateRange.from,
          "MMM dd, yyyy"
        )} - ${formatDateFn(dateRange.to, "MMM dd, yyyy")}`,
        14,
        yPos
      );
      yPos += 15;

      // Food section
      doc.setFontSize(14);
      doc.text("Food Budget vs Actuals", 14, yPos);
      yPos += 6;
      const foodHeaders = [
        ["Metric", "Budget", "Actual", "Variance", "Variance %"],
      ];
      const foodData = [
        [
          "Revenue",
          renderCurrency(budgetVsActualsReport.foodBudget.budgetedRevenue),
          renderCurrency(budgetVsActualsReport.foodActual.actualRevenue),
          renderCurrency(budgetVsActualsReport.foodVariance.revenueVariance),
          renderPercentage(
            budgetVsActualsReport.foodVariance.revenueVariancePercentage
          ),
        ],
        [
          "Cost",
          renderCurrency(budgetVsActualsReport.foodBudget.budgetedCost),
          renderCurrency(budgetVsActualsReport.foodActual.actualCost),
          renderCurrency(budgetVsActualsReport.foodVariance.costVariance),
          renderPercentage(
            budgetVsActualsReport.foodVariance.costVariancePercentage
          ),
        ],
        [
          "Cost %",
          renderPercentage(
            budgetVsActualsReport.foodBudget.budgetedCostPercentage
          ),
          renderPercentage(
            budgetVsActualsReport.foodActual.actualCostPercentage
          ),
          renderPercentage(
            budgetVsActualsReport.foodVariance.costPercentageVariance
          ),
          "",
        ],
      ];

      autoTable(doc, {
        startY: yPos,
        head: foodHeaders,
        body: foodData,
        theme: "grid",
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        styles: { fontSize: 9, cellPadding: 1.5 },
        columnStyles: {
          1: { halign: "right" },
          2: { halign: "right" },
          3: { halign: "right" },
          4: { halign: "right" },
        },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });

      yPos += 20;

      // Beverage section
      doc.setFontSize(14);
      doc.text("Beverage Budget vs Actuals", 14, yPos);
      yPos += 6;
      const beverageHeaders = [
        ["Metric", "Budget", "Actual", "Variance", "Variance %"],
      ];
      const beverageData = [
        [
          "Revenue",
          renderCurrency(budgetVsActualsReport.beverageBudget.budgetedRevenue),
          renderCurrency(budgetVsActualsReport.beverageActual.actualRevenue),
          renderCurrency(
            budgetVsActualsReport.beverageVariance.revenueVariance
          ),
          renderPercentage(
            budgetVsActualsReport.beverageVariance.revenueVariancePercentage
          ),
        ],
        [
          "Cost",
          renderCurrency(budgetVsActualsReport.beverageBudget.budgetedCost),
          renderCurrency(budgetVsActualsReport.beverageActual.actualCost),
          renderCurrency(budgetVsActualsReport.beverageVariance.costVariance),
          renderPercentage(
            budgetVsActualsReport.beverageVariance.costVariancePercentage
          ),
        ],
        [
          "Cost %",
          renderPercentage(
            budgetVsActualsReport.beverageBudget.budgetedCostPercentage
          ),
          renderPercentage(
            budgetVsActualsReport.beverageActual.actualCostPercentage
          ),
          renderPercentage(
            budgetVsActualsReport.beverageVariance.costPercentageVariance
          ),
          "",
        ],
      ];

      autoTable(doc, {
        startY: yPos,
        head: beverageHeaders,
        body: beverageData,
        theme: "grid",
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        styles: { fontSize: 9, cellPadding: 1.5 },
        columnStyles: {
          1: { halign: "right" },
          2: { halign: "right" },
          3: { halign: "right" },
          4: { halign: "right" },
        },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });

      doc.save(
        `Budget_vs_Actuals_Report_${formatDateFn(
          dateRange.from,
          "yyyyMMdd"
        )}_to_${formatDateFn(dateRange.to, "yyyyMMdd")}.pdf`
      );
    } else if (
      selectedReport === "daily_revenue_trends" &&
      "summary" in reportData
    ) {
      const dailyRevenueTrendsReport = reportData as DailyRevenueTrendsReport;
      doc.setFontSize(18);
      doc.text("Daily Revenue Trends Report", 14, yPos);
      yPos += 10;
      doc.setFontSize(10);
      doc.text(
        `Date Range: ${formatDateFn(
          dateRange.from,
          "MMM dd, yyyy"
        )} - ${formatDateFn(dateRange.to, "MMM dd, yyyy")}`,
        14,
        yPos
      );
      yPos += 15;

      // Summary section
      doc.setFontSize(14);
      doc.text("Summary", 14, yPos);
      yPos += 6;
      const summaryHeaders = [["Metric", "Value"]];
      const summaryData = [
        [
          "Total Food Revenue",
          renderCurrency(dailyRevenueTrendsReport.summary.totalFoodRevenue),
        ],
        [
          "Total Beverage Revenue",
          renderCurrency(dailyRevenueTrendsReport.summary.totalBeverageRevenue),
        ],
        [
          "Total Revenue",
          renderCurrency(dailyRevenueTrendsReport.summary.totalRevenue),
        ],
        [
          "Average Daily Food Revenue",
          renderCurrency(
            dailyRevenueTrendsReport.summary.averageDailyFoodRevenue
          ),
        ],
        [
          "Average Daily Beverage Revenue",
          renderCurrency(
            dailyRevenueTrendsReport.summary.averageDailyBeverageRevenue
          ),
        ],
        [
          "Average Daily Total Revenue",
          renderCurrency(
            dailyRevenueTrendsReport.summary.averageDailyTotalRevenue
          ),
        ],
        ["Total Days", dailyRevenueTrendsReport.summary.totalDays],
      ];

      autoTable(doc, {
        startY: yPos,
        head: summaryHeaders,
        body: summaryData,
        theme: "grid",
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 1: { halign: "right" } },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });
      yPos += 15;

      // Daily trends section
      doc.setFontSize(14);
      doc.text("Daily Trends", 14, yPos);
      yPos += 6;
      dailyRevenueTrendsReport.dailyTrends.forEach((trend) => {
        doc.text(
          `${formatDateFn(trend.date, "MMM dd, yyyy")}: ${renderCurrency(
            trend.foodRevenue
          )}`,
          14,
          yPos
        );
        yPos += 5;
      });

      doc.save(
        `Daily_Revenue_Trends_Report_${formatDateFn(
          dateRange.from,
          "yyyyMMdd"
        )}_to_${formatDateFn(dateRange.to, "yyyyMMdd")}.pdf`
      );
    }

    showToast.success("Report successfully exported to PDF.");
  };

  return (
    <div className="flex flex-col gap-6 w-full text-[clamp(0.65rem,0.7vw+0.5rem,1rem)]">
      {/* Report Options */}
      <Card className="w-full shadow-md bg-card">
        <CardHeader>
          <CardTitle className="font-headline text-xl">
            Report Options
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex-1 min-w-[200px]">
            <label
              htmlFor="report-select"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Report Type
            </label>
            <Select value={selectedReport} onValueChange={setSelectedReport}>
              <SelectTrigger
                id="report-select"
                className="w-full text-base md:text-sm"
              >
                <SelectValue placeholder="Select a report" />
              </SelectTrigger>
              <SelectContent>
                {reportOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-1 mb-1">
              <label
                htmlFor="date-range-picker"
                className="block text-sm font-medium text-foreground"
              >
                Date Range
              </label>
              {selectedReport === "forecasting_report" && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        For forecasting, this date range represents historical data.
                        If less than 7 days, the system will automatically extend
                        the period to ensure reliable predictions.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {dateRange && (
              <DateRangePicker date={dateRange} setDate={setDateRange} />
            )}
          </div>

          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-1 mb-1">
              <label
                htmlFor="outlet-select"
                className="block text-sm font-medium text-foreground"
              >
                Outlet Filter
              </label>
              {(selectedReport === "detailed_food_cost" ||
                selectedReport === "detailed_beverage_cost" ||
                selectedReport === "monthly_profit_loss" ||
                selectedReport === "real_time_kpi" ||
                selectedReport === "forecasting_report") && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Outlet filter is disabled for Detailed Cost Reports, 
                        Monthly Profit/Loss Report, Real-Time KPI Dashboard, and Forecasting Report. All outlets will be shown.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <Select
              value={selectedOutletId}
              onValueChange={setSelectedOutletId}
              disabled={
                isFetchingOutlets ||
                selectedReport === "detailed_food_cost" ||
                selectedReport === "detailed_beverage_cost" ||
                selectedReport === "monthly_profit_loss" ||
                selectedReport === "real_time_kpi" ||
                selectedReport === "forecasting_report"
              }
            >
              <SelectTrigger
                id="outlet-select"
                className="w-full text-base md:text-sm"
              >
                <SelectValue placeholder="All Outlets" />
              </SelectTrigger>
              <SelectContent>
                {allOutlets.map((outlet) => (
                  <SelectItem key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGenerateReport}
            className="w-full md:w-auto"
            disabled={isLoadingReport}
          >
            {isLoadingReport ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <Filter className="mr-2 h-4 w-4" />
                Apply Filters
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Report Display Area */}
      <Card className="w-full shadow-md bg-card">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0 pb-2">
          <div className="flex items-center gap-4 min-w-0">
            <CardTitle className="font-headline text-xl truncate">
              Report Display
            </CardTitle>
            {lastRefreshTime && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground min-w-0">
                <Clock className="h-4 w-4" />
                <span className="truncate">
                  Last updated: {formatDateFn(lastRefreshTime, "HH:mm:ss")}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto overflow-x-auto items-center md:justify-end">
            {/* Full buttons for md+ screens */}
            <div className="hidden md:flex gap-2">
              {reportData && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={isLoadingReport}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw
                      className={cn("h-4 w-4", {
                        "animate-spin": isLoadingReport,
                      })}
                    />
                    Refresh
                  </Button>
                  <Button
                    variant={autoRefresh ? "default" : "outline"}
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    disabled={isLoadingReport}
                    className="flex items-center gap-2"
                  >
                    {autoRefresh ? (
                      <>
                        <Pause className="h-4 w-4" />
                        Stop Auto-refresh
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Auto-refresh
                      </>
                    )}
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                onClick={handleExportToExcel}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export to Excel
              </Button>
              <Button
                variant="outline"
                onClick={handleExportToPDF}
                className="flex items-center gap-2"
              >
                <FileText className="mr-2 h-4 w-4" />
                Export to PDF
              </Button>
            </div>
            {/* Mini icon-only buttons for small screens */}
            <div className="flex md:hidden gap-2">
              {reportData && (
                <>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={handleRefresh}
                          disabled={isLoadingReport}
                        >
                          <RefreshCw
                            className={cn("h-4 w-4", {
                              "animate-spin": isLoadingReport,
                            })}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Refresh</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant={autoRefresh ? "default" : "outline"}
                          onClick={() => setAutoRefresh(!autoRefresh)}
                          disabled={isLoadingReport}
                        >
                          {autoRefresh ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {autoRefresh ? "Stop Auto-refresh" : "Auto-refresh"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={handleExportToExcel}
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export to Excel</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={handleExportToPDF}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export to PDF</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingReport && (
            <p className="text-center text-muted-foreground">
              Generating report...
            </p>
          )}
          {!isLoadingReport && !reportData && (
            <p className="text-center text-muted-foreground">
              Select a report type and click Apply Filters to generate the
              report
            </p>
          )}
          {!isLoadingReport &&
            reportData &&
            selectedReport === "detailed_food_cost" &&
            "overallSummaryReport" in reportData && (
              <div className="space-y-6">
                <CombinedFoodCostReportTable
                  data={reportData as DetailedFoodCostReportResponse}
                />
              </div>
            )}
          {!isLoadingReport &&
            reportData &&
            selectedReport === "detailed_beverage_cost" &&
            "overallSummaryReport" in reportData && (
              <div className="space-y-6">
                <CombinedBeverageCostReportTable
                  reportData={reportData as DetailedBeverageCostReportResponse}
                />
              </div>
            )}
          {!isLoadingReport &&
            reportData &&
            selectedReport === "monthly_profit_loss" &&
            "monthYear" in reportData && (
              <div className="space-y-6">
                <MonthlyProfitLossReportTable
                  data={reportData as MonthlyProfitLossReport}
                />
              </div>
            )}
          {!isLoadingReport &&
            reportData &&
            selectedReport === "cost_analysis_by_category" &&
            "foodCategories" in reportData && (
              <div className="space-y-6">
                <CostAnalysisByCategoryReportTable
                  data={reportData as CostAnalysisByCategoryReport}
                  outletId={selectedOutletId}
                  outletName={
                    allOutlets.find((o) => o.id === selectedOutletId)?.name
                  }
                  isLoading={isLoadingReport}
                />
              </div>
            )}
          {!isLoadingReport &&
            reportData &&
            selectedReport === "budget_vs_actuals" &&
            "foodBudget" in reportData && (
              <div className="space-y-6">
                <BudgetVsActualsReportTable
                  reportData={reportData as BudgetVsActualsReport}
                />
              </div>
            )}
          {!isLoadingReport &&
            reportData &&
            selectedReport === "daily_revenue_trends" &&
            "summary" in reportData && (
              <div className="space-y-6">
                <DailyRevenueTrendsReportTable
                  reportData={reportData as DailyRevenueTrendsReport}
                />
              </div>
            )}

          {/* Year-over-Year Report */}
          {!isLoadingReport &&
            reportData &&
            selectedReport === "year_over_year" &&
            "currentYearData" in reportData && (
              <div className="space-y-6">
                <YearOverYearReportTable
                  data={reportData as YearOverYearReport}
                />
              </div>
            )}

          {/* Real-Time KPI Dashboard */}
          {!isLoadingReport &&
            reportData &&
            selectedReport === "real_time_kpi" &&
            "currentPeriodKPIs" in reportData && (
              <div className="space-y-6">
                <RealTimeKPIDashboardComponent
                  data={reportData as RealTimeKPIDashboard}
                />
              </div>
            )}

          {/* Forecasting Report */}
          {!isLoadingReport &&
            reportData &&
            selectedReport === "forecasting_report" &&
            "revenueForecast" in reportData && (
              <div className="space-y-6">
                <ForecastingReportTable
                  data={reportData as ForecastingReport}
                />
              </div>
            )}


          {/* Placeholder for reports without implemented components yet */}
          {!isLoadingReport &&
            reportData &&
            ![
              "detailed_food_cost",
              "detailed_beverage_cost", 
              "monthly_profit_loss",
              "cost_analysis_by_category",
              "budget_vs_actuals",
              "daily_revenue_trends",
              "year_over_year",
              "real_time_kpi",
              "forecasting_report"
            ].includes(selectedReport) && (
              <div className="border p-4 rounded-lg bg-secondary/10">
                <h3 className="text-lg font-semibold mb-2">Report Output:</h3>
                <pre className="whitespace-pre-wrap text-sm text-foreground/80">
                  {JSON.stringify(reportData, null, 2)}
                </pre>
              </div>
            )}

        </CardContent>
      </Card>
    </div>
  );
}
