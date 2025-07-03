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
import { Input } from "@/components/ui/input";
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
import { getPropertiesAction } from "@/actions/propertyActions";
import { useAuth } from "@/contexts/AuthContext";
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
  const [taxRate, setTaxRate] = useState<number>(25); // Default 25% tax rate
  const [isFetchingOutlets, setIsFetchingOutlets] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>("all");
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const { user } = useAuth();
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

  // Load properties for super admin users
  useEffect(() => {
    const loadProperties = async () => {
      if (user?.role === "super_admin") {
        try {
          const propertiesData = await getPropertiesAction();
          setProperties([
            { id: "all", name: "All Properties" },
            ...propertiesData
          ]);
        } catch (error) {
          console.error("Error loading properties:", error);
          showToast.error("Failed to load properties");
        }
      }
      setIsLoadingProperties(false);
    };
    
    loadProperties();
  }, [user]);

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
        console.log("Food report data received:", data);
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
        console.log("Beverage report data received:", data);
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
          dateRange.to,
          undefined, // outletId - not used for this report
          taxRate
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
        const previousYear = currentYear - 1; // Calculate previous year
        const data = await getYearOverYearReportAction(
          currentYear,
          previousYear
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

    if (selectedReport !== "monthly_profit_loss" && (!dateRange?.from || !dateRange?.to)) {
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
      Array.isArray(reportData) &&
      reportData.length > 0
    ) {
      // Handle array of monthly reports
      const monthlyReports = reportData as MonthlyProfitLossReport[];
      
      // Export all monthly reports
      monthlyReports.forEach((monthlyReportData, index) => {
        if (index > 0) {
          ws_data.push([]); // Add separator between reports
          ws_data.push([]);
        }
        
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
      }); // Close the forEach loop

      // Generate filename based on first report's month/year
      const firstReport = monthlyReports[0];
      const filename = monthlyReports.length > 1 
        ? `Monthly_Profit_Loss_Reports_${firstReport.monthYear.replace(/[^a-zA-Z0-9-]/g, "_")}_and_more.xlsx`
        : `Monthly_Profit_Loss_Report_${firstReport.monthYear.replace(/[^a-zA-Z0-9-]/g, "_")}.xlsx`;

      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Monthly Profit Loss Report");
      XLSX.writeFile(wb, filename);

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
          `${formatDateFn(week.weekStartDate, "MMM dd")} - ${formatDateFn(
            week.weekEndDate,
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
    } else if (selectedReport === "year_over_year" && reportData) {
      // Year-over-Year Report Export
      const yearOverYearReport = reportData as any;
      ws_data.push(["Year-over-Year Performance Report"]);
      ws_data.push([
        `${yearOverYearReport.currentYearData.year} vs ${yearOverYearReport.previousYearData.year} Comparison`,
      ]);
      ws_data.push([]); // Empty row for spacing

      // High-Level Metrics
      ws_data.push(["High-Level Performance Metrics"]);
      ws_data.push(["Metric", "Growth/Change"]);
      ws_data.push([
        "Total Revenue Growth",
        `${formatNumber(yearOverYearReport.growthMetrics.revenueGrowth)}%`,
      ]);
      ws_data.push([
        "Profit Growth",
        `${formatNumber(yearOverYearReport.growthMetrics.profitGrowth)}%`,
      ]);
      ws_data.push([
        "Margin Improvement",
        `${formatNumber(yearOverYearReport.growthMetrics.marginImprovement)}%`,
      ]);
      ws_data.push([]); // Empty row for spacing

      // Financial Comparison
      ws_data.push(["Detailed Financial Comparison"]);
      ws_data.push([
        "Metric",
        `${yearOverYearReport.previousYearData.year}`,
        `${yearOverYearReport.currentYearData.year}`,
        "Growth %",
        "Change ($)",
      ]);
      ws_data.push([
        "Total Revenue",
        formatNumber(yearOverYearReport.previousYearData.totalRevenue),
        formatNumber(yearOverYearReport.currentYearData.totalRevenue),
        `${formatNumber(yearOverYearReport.growthMetrics.revenueGrowth)}%`,
        formatNumber(yearOverYearReport.currentYearData.totalRevenue - yearOverYearReport.previousYearData.totalRevenue),
      ]);
      ws_data.push([
        "Food Revenue",
        formatNumber(yearOverYearReport.previousYearData.totalFoodRevenue),
        formatNumber(yearOverYearReport.currentYearData.totalFoodRevenue),
        `${formatNumber(yearOverYearReport.growthMetrics.foodRevenueGrowth)}%`,
        formatNumber(yearOverYearReport.currentYearData.totalFoodRevenue - yearOverYearReport.previousYearData.totalFoodRevenue),
      ]);
      ws_data.push([
        "Beverage Revenue",
        formatNumber(yearOverYearReport.previousYearData.totalBeverageRevenue),
        formatNumber(yearOverYearReport.currentYearData.totalBeverageRevenue),
        `${formatNumber(yearOverYearReport.growthMetrics.beverageRevenueGrowth)}%`,
        formatNumber(yearOverYearReport.currentYearData.totalBeverageRevenue - yearOverYearReport.previousYearData.totalBeverageRevenue),
      ]);
      ws_data.push([
        "Total Costs",
        formatNumber(yearOverYearReport.previousYearData.totalCosts),
        formatNumber(yearOverYearReport.currentYearData.totalCosts),
        `${formatNumber(yearOverYearReport.growthMetrics.costGrowth)}%`,
        formatNumber(yearOverYearReport.currentYearData.totalCosts - yearOverYearReport.previousYearData.totalCosts),
      ]);
      ws_data.push([
        "Net Profit",
        formatNumber(yearOverYearReport.previousYearData.netProfit),
        formatNumber(yearOverYearReport.currentYearData.netProfit),
        `${formatNumber(yearOverYearReport.growthMetrics.profitGrowth)}%`,
        formatNumber(yearOverYearReport.currentYearData.netProfit - yearOverYearReport.previousYearData.netProfit),
      ]);
      ws_data.push([]); // Empty row for spacing

      // Monthly Performance
      ws_data.push(["Monthly Performance Tracking"]);
      ws_data.push([
        "Month",
        `${yearOverYearReport.previousYearData.year}`,
        `${yearOverYearReport.currentYearData.year}`,
        "Growth %",
        "Performance",
      ]);
      yearOverYearReport.monthlyComparison.forEach((month: any) => {
        ws_data.push([
          month.monthName,
          formatNumber(month.previousYearRevenue),
          formatNumber(month.currentYearRevenue),
          `${formatNumber(month.growth)}%`,
          month.performance.replace("_", " "),
        ]);
      });
      ws_data.push([]); // Empty row for spacing

      // Insights
      ws_data.push(["Key Insights & Recommendations"]);
      ws_data.push(["Strongest Performing Months"]);
      yearOverYearReport.insights.strongestMonths.forEach((month: string) => {
        ws_data.push([month]);
      });
      ws_data.push([]);
      ws_data.push(["Areas for Improvement"]);
      yearOverYearReport.insights.weakestMonths.forEach((month: string) => {
        ws_data.push([month]);
      });
      ws_data.push([]);
      ws_data.push(["Strategic Recommendations"]);
      yearOverYearReport.insights.recommendations.forEach((recommendation: string) => {
        ws_data.push([recommendation]);
      });

      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Year-over-Year Report");
      XLSX.writeFile(
        wb,
        `Year_Over_Year_Report_${yearOverYearReport.currentYearData.year}_vs_${yearOverYearReport.previousYearData.year}.xlsx`
      );

      showToast.success("Report successfully exported to Excel.");
    } else if (selectedReport === "real_time_kpi" && reportData) {
      // Real-Time KPI Dashboard Export
      const kpiReport = reportData as any;
      ws_data.push(["Real-Time KPI Dashboard"]);
      ws_data.push([
        `${kpiReport.outletName} • Last updated: ${kpiReport.lastUpdated.toLocaleString()}`,
      ]);
      ws_data.push([]); // Empty row for spacing

      // Current Period KPIs
      ws_data.push(["Current Period KPIs"]);
      ws_data.push(["Metric", "Value", "Target", "Status"]);
      ws_data.push([
        "Today's Revenue",
        formatNumber(kpiReport.currentPeriodKPIs.todayRevenue),
        formatNumber(kpiReport.currentPeriodKPIs.revenueTarget),
        `${formatNumber(kpiReport.currentPeriodKPIs.revenueAchievement)}% Achievement`,
      ]);
      ws_data.push([
        "Food Cost %",
        `${formatNumber(kpiReport.currentPeriodKPIs.currentFoodCostPct)}%`,
        `${formatNumber(kpiReport.currentPeriodKPIs.targetFoodCostPct)}%`,
        `${formatNumber(kpiReport.currentPeriodKPIs.foodCostVariance)}% Variance`,
      ]);
      ws_data.push([
        "Beverage Cost %",
        `${formatNumber(kpiReport.currentPeriodKPIs.currentBeverageCostPct)}%`,
        `${formatNumber(kpiReport.currentPeriodKPIs.targetBeverageCostPct)}%`,
        `${formatNumber(kpiReport.currentPeriodKPIs.beverageCostVariance)}% Variance`,
      ]);
      ws_data.push([
        "Profit Margin",
        `${formatNumber(kpiReport.currentPeriodKPIs.profitMargin)}%`,
        "15%",
        kpiReport.currentPeriodKPIs.profitMargin >= 15 ? "Excellent" : kpiReport.currentPeriodKPIs.profitMargin >= 10 ? "Good" : "Below Target",
      ]);
      ws_data.push([]); // Empty row for spacing

      // Trending KPIs
      ws_data.push(["Trending KPIs"]);
      ws_data.push(["KPI Name", "Current Value", "Target", "Trend", "Status"]);
      kpiReport.trendingKPIs.forEach((kpi: any) => {
        ws_data.push([
          kpi.name,
          formatNumber(kpi.value),
          formatNumber(kpi.target),
          `${kpi.trend} (${formatNumber(kpi.trendPercentage)}%)`,
          kpi.status,
        ]);
      });
      ws_data.push([]); // Empty row for spacing

      // Month-to-Date Metrics
      ws_data.push(["Month-to-Date Metrics"]);
      ws_data.push(["Metric", "Value"]);
      ws_data.push([
        "Total Revenue",
        formatNumber(kpiReport.monthToDateMetrics.totalRevenue),
      ]);
      ws_data.push([
        "Total Costs",
        formatNumber(kpiReport.monthToDateMetrics.totalCosts),
      ]);
      ws_data.push([
        "Net Profit",
        formatNumber(kpiReport.monthToDateMetrics.netProfit),
      ]);
      ws_data.push([
        "Profit Margin",
        `${formatNumber(kpiReport.monthToDateMetrics.profitMargin)}%`,
      ]);
      ws_data.push([
        "Average Daily Revenue",
        formatNumber(kpiReport.monthToDateMetrics.averageDailyRevenue),
      ]);
      ws_data.push([
        "Revenue Growth",
        `${formatNumber(kpiReport.monthToDateMetrics.revenueGrowth)}%`,
      ]);
      ws_data.push([]); // Empty row for spacing

      // Alerts
      if (kpiReport.alerts.length > 0) {
        ws_data.push(["Active Alerts"]);
        ws_data.push(["Severity", "Message", "Type", "Timestamp"]);
        kpiReport.alerts.forEach((alert: any) => {
          ws_data.push([
            alert.severity,
            alert.message,
            alert.type.replace("_", " "),
            alert.timestamp.toLocaleString(),
          ]);
        });
      } else {
        ws_data.push(["Active Alerts"]);
        ws_data.push(["No active alerts at this time"]);
      }

      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Real-Time KPI Dashboard");
      XLSX.writeFile(
        wb,
        `Real_Time_KPI_Dashboard_${formatDateFn(new Date(), "yyyyMMdd_HHmmss")}.xlsx`
      );

      showToast.success("Report successfully exported to Excel.");
    } else if (selectedReport === "forecasting_report" && reportData) {
      // Forecasting Report Export
      const forecastReport = reportData as any;
      ws_data.push(["Revenue & Cost Forecasting Report"]);
      ws_data.push([
        `${forecastReport.outletName} • Historical: ${forecastReport.dateRange.from.toLocaleDateString()} - ${forecastReport.dateRange.to.toLocaleDateString()}`,
      ]);
      ws_data.push([
        `Forecast Period: ${forecastReport.forecastPeriod.from.toLocaleDateString()} - ${forecastReport.forecastPeriod.to.toLocaleDateString()}`,
      ]);
      ws_data.push([]); // Empty row for spacing

      // Historical Analysis
      ws_data.push(["Historical Analysis"]);
      ws_data.push(["Metric", "Value"]);
      ws_data.push([
        "Total Revenue",
        formatNumber(forecastReport.historicalAnalysis.totalRevenue),
      ]);
      ws_data.push([
        "Total Costs",
        formatNumber(forecastReport.historicalAnalysis.totalCosts),
      ]);
      ws_data.push([
        "Average Daily Revenue",
        formatNumber(forecastReport.historicalAnalysis.averageDailyRevenue),
      ]);
      ws_data.push([
        "Growth Rate",
        `${formatNumber(forecastReport.historicalAnalysis.growthRate)}%`,
      ]);
      ws_data.push([
        "Revenue Volatility",
        `${formatNumber(forecastReport.historicalAnalysis.volatility)}%`,
      ]);
      ws_data.push([
        "Data Points",
        forecastReport.historicalAnalysis.dataPoints,
      ]);
      ws_data.push([]); // Empty row for spacing

      // Cost Forecast Summary
      ws_data.push(["Cost Forecast Summary"]);
      ws_data.push(["Metric", "Value"]);
      ws_data.push([
        "Predicted Food Cost %",
        `${formatNumber(forecastReport.costForecast.predictedFoodCostPct)}%`,
      ]);
      ws_data.push([
        "Predicted Beverage Cost %",
        `${formatNumber(forecastReport.costForecast.predictedBeverageCostPct)}%`,
      ]);
      ws_data.push([
        "Cost Efficiency Ratio",
        `${formatNumber(forecastReport.costForecast.costEfficiencyRatio)}%`,
      ]);
      ws_data.push([
        "Confidence Level",
        `${formatNumber(forecastReport.costForecast.confidenceLevel)}%`,
      ]);
      ws_data.push([]); // Empty row for spacing

      // Daily Revenue Forecast (first 7 days)
      ws_data.push(["Daily Revenue Forecast (Next 7 Days)"]);
      ws_data.push([
        "Date",
        "Predicted Revenue",
        "Confidence Range (Low)",
        "Confidence Range (High)",
        "Confidence Level",
      ]);
      forecastReport.revenueForecast.daily.slice(0, 7).forEach((forecast: any) => {
        ws_data.push([
          forecast.date.toLocaleDateString(),
          formatNumber(forecast.predictedRevenue),
          formatNumber(forecast.confidenceInterval.lower),
          formatNumber(forecast.confidenceInterval.upper),
          `${formatNumber(forecast.confidenceLevel)}%`,
        ]);
      });
      ws_data.push([]); // Empty row for spacing

      // Monthly Forecasts
      ws_data.push(["Monthly Forecasts"]);
      ws_data.push([
        "Month",
        "Forecast Revenue",
        "Forecast Costs",
        "Forecast Profit",
        "Confidence Level",
      ]);
      forecastReport.revenueForecast.monthly.forEach((monthly: any) => {
        ws_data.push([
          monthly.month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          formatNumber(monthly.forecastRevenue),
          formatNumber(monthly.forecastCosts),
          formatNumber(monthly.forecastProfit),
          `${formatNumber(monthly.confidenceLevel)}%`,
        ]);
      });
      ws_data.push([]); // Empty row for spacing

      // Insights
      ws_data.push(["Key Insights"]);
      ws_data.push([
        "Expected Growth",
        `${formatNumber(forecastReport.insights.expectedGrowth)}%`,
      ]);
      ws_data.push([]);
      ws_data.push(["Risk Factors"]);
      forecastReport.insights.riskFactors.forEach((risk: string) => {
        ws_data.push([risk]);
      });
      ws_data.push([]);
      ws_data.push(["Opportunities"]);
      forecastReport.insights.opportunities.forEach((opportunity: string) => {
        ws_data.push([opportunity]);
      });
      ws_data.push([]);
      ws_data.push(["Recommendations"]);
      forecastReport.insights.recommendations.forEach((recommendation: string) => {
        ws_data.push([recommendation]);
      });

      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Forecasting Report");
      XLSX.writeFile(
        wb,
        `Forecasting_Report_${formatDateFn(forecastReport.dateRange.from, "yyyyMMdd")}_to_${formatDateFn(forecastReport.dateRange.to, "yyyyMMdd")}.xlsx`
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

    if (selectedReport !== "monthly_profit_loss" && (!dateRange?.from || !dateRange?.to)) {
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
      Array.isArray(reportData) &&
      reportData.length > 0
    ) {
      // Handle array of monthly reports - export the first one for now
      const monthlyReportData = reportData[0] as MonthlyProfitLossReport;
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
      const ocEntBody = (monthlyReportData as any).ocEntItems?.length > 0 
        ? (monthlyReportData as any).ocEntItems.map((item: any) => [
            item.referenceId,
            item.description,
            renderCurrency(item.amount),
          ])
        : [["", "No OC & ENT data for this period", ""]];

      autoTable(doc, {
        startY: yPos,
        head: [["REFERENCE ID.", "DESCRIPTION", "AMOUNT"]],
        body: ocEntBody,
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
      const otherAdjBody = (monthlyReportData as any).otherAdjustmentItems?.length > 0 
        ? (monthlyReportData as any).otherAdjustmentItems.map((item: any) => [
            item.referenceId,
            item.description,
            renderCurrency(item.amount),
          ])
        : [["", "No other adjustments for this period", ""]];

      autoTable(doc, {
        startY: yPos,
        head: [["REFERENCE ID.", "DESCRIPTION", "AMOUNT"]],
        body: otherAdjBody,
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
            renderCurrency((monthlyReportData as any).totalExpensesAfterAdjustments || 0),
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

      // Add new page if needed
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }

      // Daily trends section
      doc.setFontSize(14);
      doc.text("Daily Trends", 14, yPos);
      yPos += 6;
      
      const dailyHeaders = [["Date", "Food Revenue", "Beverage Revenue", "Total Revenue", "Total Covers", "Avg Check"]];
      const dailyData = dailyRevenueTrendsReport.dailyTrends.map((trend) => [
        formatDateFn(trend.date, "MMM dd, yyyy"),
        renderCurrency(trend.foodRevenue),
        renderCurrency(trend.beverageRevenue), 
        renderCurrency(trend.totalRevenue),
        trend.totalCovers.toString(),
        renderCurrency(trend.averageCheck)
      ]);

      autoTable(doc, {
        startY: yPos,
        head: dailyHeaders,
        body: dailyData,
        theme: "grid",
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 
          1: { halign: "right" },
          2: { halign: "right" },
          3: { halign: "right" },
          4: { halign: "right" },
          5: { halign: "right" }
        },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });
      yPos += 15;

      // Add new page if needed
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }

      // Weekly trends section
      doc.setFontSize(14);
      doc.text("Weekly Trends", 14, yPos);
      yPos += 6;
      
      const weeklyHeaders = [["Week", "Food Revenue", "Beverage Revenue", "Total Revenue", "Days"]];
      const weeklyData = dailyRevenueTrendsReport.weeklyTrends.map((week) => [
        `${formatDateFn(week.weekStartDate, "MMM dd")} - ${formatDateFn(week.weekEndDate, "MMM dd")}`,
        renderCurrency(week.foodRevenue),
        renderCurrency(week.beverageRevenue),
        renderCurrency(week.totalRevenue),
        week.daysInWeek.toString()
      ]);

      autoTable(doc, {
        startY: yPos,
        head: weeklyHeaders,
        body: weeklyData,
        theme: "grid",
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 
          1: { halign: "right" },
          2: { halign: "right" },
          3: { halign: "right" },
          4: { halign: "right" }
        },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });

      doc.save(
        `Daily_Revenue_Trends_Report_${formatDateFn(
          dateRange.from,
          "yyyyMMdd"
        )}_to_${formatDateFn(dateRange.to, "yyyyMMdd")}.pdf`
      );
    } else if (selectedReport === "year_over_year" && reportData) {
      // Year-over-Year Report PDF Export
      const yearOverYearReport = reportData as any;

      // Report Title
      doc.setFontSize(18);
      doc.text("Year-over-Year Performance Report", 14, yPos);
      yPos += 10;
      doc.setFontSize(12);
      doc.text(
        `${yearOverYearReport.currentYearData.year} vs ${yearOverYearReport.previousYearData.year} Comparison`,
        14,
        yPos
      );
      yPos += 15;

      // High-Level Metrics
      doc.setFontSize(14);
      doc.text("High-Level Performance Metrics", 14, yPos);
      yPos += 10;

      const metricsHeaders = [["Metric", "Growth/Change"]];
      const metricsData = [
        ["Total Revenue Growth", `${formatNumber(yearOverYearReport.growthMetrics.revenueGrowth)}%`],
        ["Profit Growth", `${formatNumber(yearOverYearReport.growthMetrics.profitGrowth)}%`],
        ["Margin Improvement", `${formatNumber(yearOverYearReport.growthMetrics.marginImprovement)}%`],
      ];

      autoTable(doc, {
        head: metricsHeaders,
        body: metricsData,
        startY: yPos,
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [66, 139, 202] },
        margin: { left: 14, right: 14 },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Financial Comparison
      doc.setFontSize(14);
      doc.text("Detailed Financial Comparison", 14, yPos);
      yPos += 10;

      const financialHeaders = [
        ["Metric", `${yearOverYearReport.previousYearData.year}`, `${yearOverYearReport.currentYearData.year}`, "Growth %", "Change ($)"]
      ];
      const financialData = [
        [
          "Total Revenue",
          `$${formatNumber(yearOverYearReport.previousYearData.totalRevenue)}`,
          `$${formatNumber(yearOverYearReport.currentYearData.totalRevenue)}`,
          `${formatNumber(yearOverYearReport.growthMetrics.revenueGrowth)}%`,
          `$${formatNumber(yearOverYearReport.currentYearData.totalRevenue - yearOverYearReport.previousYearData.totalRevenue)}`,
        ],
        [
          "Food Revenue",
          `$${formatNumber(yearOverYearReport.previousYearData.totalFoodRevenue)}`,
          `$${formatNumber(yearOverYearReport.currentYearData.totalFoodRevenue)}`,
          `${formatNumber(yearOverYearReport.growthMetrics.foodRevenueGrowth)}%`,
          `$${formatNumber(yearOverYearReport.currentYearData.totalFoodRevenue - yearOverYearReport.previousYearData.totalFoodRevenue)}`,
        ],
        [
          "Beverage Revenue",
          `$${formatNumber(yearOverYearReport.previousYearData.totalBeverageRevenue)}`,
          `$${formatNumber(yearOverYearReport.currentYearData.totalBeverageRevenue)}`,
          `${formatNumber(yearOverYearReport.growthMetrics.beverageRevenueGrowth)}%`,
          `$${formatNumber(yearOverYearReport.currentYearData.totalBeverageRevenue - yearOverYearReport.previousYearData.totalBeverageRevenue)}`,
        ],
        [
          "Total Costs",
          `$${formatNumber(yearOverYearReport.previousYearData.totalCosts)}`,
          `$${formatNumber(yearOverYearReport.currentYearData.totalCosts)}`,
          `${formatNumber(yearOverYearReport.growthMetrics.costGrowth)}%`,
          `$${formatNumber(yearOverYearReport.currentYearData.totalCosts - yearOverYearReport.previousYearData.totalCosts)}`,
        ],
        [
          "Net Profit",
          `$${formatNumber(yearOverYearReport.previousYearData.netProfit)}`,
          `$${formatNumber(yearOverYearReport.currentYearData.netProfit)}`,
          `${formatNumber(yearOverYearReport.growthMetrics.profitGrowth)}%`,
          `$${formatNumber(yearOverYearReport.currentYearData.netProfit - yearOverYearReport.previousYearData.netProfit)}`,
        ],
      ];

      autoTable(doc, {
        head: financialHeaders,
        body: financialData,
        startY: yPos,
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [66, 139, 202] },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Monthly Performance (add new page if needed)
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.text("Monthly Performance Tracking", 14, yPos);
      yPos += 10;

      const monthlyHeaders = [
        ["Month", `${yearOverYearReport.previousYearData.year}`, `${yearOverYearReport.currentYearData.year}`, "Growth %", "Performance"]
      ];
      const monthlyData = yearOverYearReport.monthlyComparison.map((month: any) => [
        month.monthName,
        `$${formatNumber(month.previousYearRevenue)}`,
        `$${formatNumber(month.currentYearRevenue)}`,
        `${formatNumber(month.growth)}%`,
        month.performance.replace("_", " "),
      ]);

      autoTable(doc, {
        head: monthlyHeaders,
        body: monthlyData,
        startY: yPos,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [66, 139, 202] },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Key Insights (add new page if needed)
      if (yPos > 230) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.text("Key Insights & Recommendations", 14, yPos);
      yPos += 10;

      // Strongest Performing Months
      doc.setFontSize(12);
      doc.text("Strongest Performing Months:", 14, yPos);
      yPos += 8;
      doc.setFontSize(10);
      yearOverYearReport.insights.strongestMonths.forEach((month: string) => {
        doc.text(`• ${month}`, 20, yPos);
        yPos += 5;
      });
      yPos += 5;

      // Areas for Improvement
      doc.setFontSize(12);
      doc.text("Areas for Improvement:", 14, yPos);
      yPos += 8;
      doc.setFontSize(10);
      yearOverYearReport.insights.weakestMonths.forEach((month: string) => {
        doc.text(`• ${month}`, 20, yPos);
        yPos += 5;
      });
      yPos += 5;

      // Strategic Recommendations
      doc.setFontSize(12);
      doc.text("Strategic Recommendations:", 14, yPos);
      yPos += 8;
      doc.setFontSize(10);
      yearOverYearReport.insights.recommendations.forEach((recommendation: string) => {
        // Handle long recommendations by splitting them across lines
        const maxWidth = 170;
        const lines = doc.splitTextToSize(recommendation, maxWidth);
        lines.forEach((line: string, index: number) => {
          doc.text(index === 0 ? `• ${line}` : `  ${line}`, 20, yPos);
          yPos += 5;
        });
      });

      doc.save(
        `Year_Over_Year_Report_${yearOverYearReport.currentYearData.year}_vs_${yearOverYearReport.previousYearData.year}.pdf`
      );
    } else if (selectedReport === "real_time_kpi" && reportData) {
      // Real-Time KPI Dashboard PDF Export
      const kpiReport = reportData as any;

      // Report Title
      doc.setFontSize(18);
      doc.text("Real-Time KPI Dashboard", 14, yPos);
      yPos += 10;
      doc.setFontSize(10);
      doc.text(
        `${kpiReport.outletName} • Last updated: ${kpiReport.lastUpdated.toLocaleString()}`,
        14,
        yPos
      );
      yPos += 15;

      // Current Period KPIs
      doc.setFontSize(14);
      doc.text("Current Period KPIs", 14, yPos);
      yPos += 10;

      const currentKPIHeaders = [["Metric", "Value", "Target", "Status"]];
      const currentKPIData = [
        [
          "Today's Revenue",
          `$${formatNumber(kpiReport.currentPeriodKPIs.todayRevenue)}`,
          `$${formatNumber(kpiReport.currentPeriodKPIs.revenueTarget)}`,
          `${formatNumber(kpiReport.currentPeriodKPIs.revenueAchievement)}% Achievement`,
        ],
        [
          "Food Cost %",
          `${formatNumber(kpiReport.currentPeriodKPIs.currentFoodCostPct)}%`,
          `${formatNumber(kpiReport.currentPeriodKPIs.targetFoodCostPct)}%`,
          `${formatNumber(kpiReport.currentPeriodKPIs.foodCostVariance)}% Variance`,
        ],
        [
          "Beverage Cost %",
          `${formatNumber(kpiReport.currentPeriodKPIs.currentBeverageCostPct)}%`,
          `${formatNumber(kpiReport.currentPeriodKPIs.targetBeverageCostPct)}%`,
          `${formatNumber(kpiReport.currentPeriodKPIs.beverageCostVariance)}% Variance`,
        ],
        [
          "Profit Margin",
          `${formatNumber(kpiReport.currentPeriodKPIs.profitMargin)}%`,
          "15%",
          kpiReport.currentPeriodKPIs.profitMargin >= 15 ? "Excellent" : kpiReport.currentPeriodKPIs.profitMargin >= 10 ? "Good" : "Below Target",
        ],
      ];

      autoTable(doc, {
        head: currentKPIHeaders,
        body: currentKPIData,
        startY: yPos,
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [66, 139, 202] },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Trending KPIs
      doc.setFontSize(14);
      doc.text("Trending KPIs", 14, yPos);
      yPos += 10;

      const trendingHeaders = [["KPI Name", "Current Value", "Target", "Trend", "Status"]];
      const trendingData = kpiReport.trendingKPIs.map((kpi: any) => [
        kpi.name,
        formatNumber(kpi.value),
        formatNumber(kpi.target),
        `${kpi.trend} (${formatNumber(kpi.trendPercentage)}%)`,
        kpi.status,
      ]);

      autoTable(doc, {
        head: trendingHeaders,
        body: trendingData,
        startY: yPos,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [66, 139, 202] },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Month-to-Date Metrics
      if (yPos > 230) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.text("Month-to-Date Metrics", 14, yPos);
      yPos += 10;

      const mtdHeaders = [["Metric", "Value"]];
      const mtdData = [
        ["Total Revenue", `$${formatNumber(kpiReport.monthToDateMetrics.totalRevenue)}`],
        ["Total Costs", `$${formatNumber(kpiReport.monthToDateMetrics.totalCosts)}`],
        ["Net Profit", `$${formatNumber(kpiReport.monthToDateMetrics.netProfit)}`],
        ["Profit Margin", `${formatNumber(kpiReport.monthToDateMetrics.profitMargin)}%`],
        ["Average Daily Revenue", `$${formatNumber(kpiReport.monthToDateMetrics.averageDailyRevenue)}`],
        ["Revenue Growth", `${formatNumber(kpiReport.monthToDateMetrics.revenueGrowth)}%`],
      ];

      autoTable(doc, {
        head: mtdHeaders,
        body: mtdData,
        startY: yPos,
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [66, 139, 202] },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Active Alerts
      if (kpiReport.alerts.length > 0) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.text("Active Alerts", 14, yPos);
        yPos += 10;

        const alertHeaders = [["Severity", "Message", "Type", "Timestamp"]];
        const alertData = kpiReport.alerts.map((alert: any) => [
          alert.severity,
          alert.message,
          alert.type.replace("_", " "),
          alert.timestamp.toLocaleString(),
        ]);

        autoTable(doc, {
          head: alertHeaders,
          body: alertData,
          startY: yPos,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [220, 53, 69] }, // Red color for alerts
          margin: { left: 14, right: 14 },
          columnStyles: {
            1: { cellWidth: 80 }, // Make message column wider
          },
        });
      } else {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.text("Active Alerts", 14, yPos);
        yPos += 10;
        doc.setFontSize(10);
        doc.text("No active alerts at this time", 14, yPos);
      }

      doc.save(
        `Real_Time_KPI_Dashboard_${formatDateFn(new Date(), "yyyyMMdd_HHmmss")}.pdf`
      );
    } else if (selectedReport === "forecasting_report" && reportData) {
      // Forecasting Report PDF Export
      const forecastReport = reportData as any;

      // Report Title
      doc.setFontSize(18);
      doc.text("Revenue & Cost Forecasting Report", 14, yPos);
      yPos += 10;
      doc.setFontSize(10);
      doc.text(
        `${forecastReport.outletName} • Historical: ${forecastReport.dateRange.from.toLocaleDateString()} - ${forecastReport.dateRange.to.toLocaleDateString()}`,
        14,
        yPos
      );
      yPos += 5;
      doc.text(
        `Forecast Period: ${forecastReport.forecastPeriod.from.toLocaleDateString()} - ${forecastReport.forecastPeriod.to.toLocaleDateString()}`,
        14,
        yPos
      );
      yPos += 15;

      // Historical Analysis
      doc.setFontSize(14);
      doc.text("Historical Analysis", 14, yPos);
      yPos += 10;

      const historicalHeaders = [["Metric", "Value"]];
      const historicalData = [
        ["Total Revenue", `$${formatNumber(forecastReport.historicalAnalysis.totalRevenue)}`],
        ["Total Costs", `$${formatNumber(forecastReport.historicalAnalysis.totalCosts)}`],
        ["Average Daily Revenue", `$${formatNumber(forecastReport.historicalAnalysis.averageDailyRevenue)}`],
        ["Growth Rate", `${formatNumber(forecastReport.historicalAnalysis.growthRate)}%`],
        ["Revenue Volatility", `${formatNumber(forecastReport.historicalAnalysis.volatility)}%`],
        ["Data Points", forecastReport.historicalAnalysis.dataPoints.toString()],
      ];

      autoTable(doc, {
        head: historicalHeaders,
        body: historicalData,
        startY: yPos,
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [66, 139, 202] },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Cost Forecast Summary
      doc.setFontSize(14);
      doc.text("Cost Forecast Summary", 14, yPos);
      yPos += 10;

      const costForecastHeaders = [["Metric", "Value"]];
      const costForecastData = [
        ["Predicted Food Cost %", `${formatNumber(forecastReport.costForecast.predictedFoodCostPct)}%`],
        ["Predicted Beverage Cost %", `${formatNumber(forecastReport.costForecast.predictedBeverageCostPct)}%`],
        ["Cost Efficiency Ratio", `${formatNumber(forecastReport.costForecast.costEfficiencyRatio)}%`],
        ["Confidence Level", `${formatNumber(forecastReport.costForecast.confidenceLevel)}%`],
      ];

      autoTable(doc, {
        head: costForecastHeaders,
        body: costForecastData,
        startY: yPos,
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [66, 139, 202] },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Daily Revenue Forecast (next 7 days)
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.text("Daily Revenue Forecast (Next 7 Days)", 14, yPos);
      yPos += 10;

      const dailyForecastHeaders = [["Date", "Predicted Revenue", "Confidence Range", "Confidence Level"]];
      const dailyForecastData = forecastReport.revenueForecast.daily.slice(0, 7).map((forecast: any) => [
        forecast.date.toLocaleDateString(),
        `$${formatNumber(forecast.predictedRevenue)}`,
        `$${formatNumber(forecast.confidenceInterval.lower)} - $${formatNumber(forecast.confidenceInterval.upper)}`,
        `${formatNumber(forecast.confidenceLevel)}%`,
      ]);

      autoTable(doc, {
        head: dailyForecastHeaders,
        body: dailyForecastData,
        startY: yPos,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [66, 139, 202] },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Monthly Forecasts
      if (yPos > 230) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.text("Monthly Forecasts", 14, yPos);
      yPos += 10;

      const monthlyHeaders = [["Month", "Forecast Revenue", "Forecast Costs", "Forecast Profit", "Confidence"]];
      const monthlyData = forecastReport.revenueForecast.monthly.map((monthly: any) => [
        monthly.month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        `$${formatNumber(monthly.forecastRevenue)}`,
        `$${formatNumber(monthly.forecastCosts)}`,
        `$${formatNumber(monthly.forecastProfit)}`,
        `${formatNumber(monthly.confidenceLevel)}%`,
      ]);

      autoTable(doc, {
        head: monthlyHeaders,
        body: monthlyData,
        startY: yPos,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [66, 139, 202] },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Key Insights
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.text("Key Insights", 14, yPos);
      yPos += 10;

      // Expected Growth
      doc.setFontSize(12);
      doc.text(`Expected Growth: ${formatNumber(forecastReport.insights.expectedGrowth)}%`, 14, yPos);
      yPos += 10;

      // Risk Factors
      if (forecastReport.insights.riskFactors.length > 0) {
        doc.setFontSize(12);
        doc.text("Risk Factors:", 14, yPos);
        yPos += 8;
        doc.setFontSize(10);
        forecastReport.insights.riskFactors.forEach((risk: string) => {
          const lines = doc.splitTextToSize(`• ${risk}`, 170);
          lines.forEach((line: string, index: number) => {
            doc.text(index === 0 ? line : `  ${line}`, 20, yPos);
            yPos += 5;
          });
        });
        yPos += 5;
      }

      // Opportunities
      if (forecastReport.insights.opportunities.length > 0) {
        doc.setFontSize(12);
        doc.text("Opportunities:", 14, yPos);
        yPos += 8;
        doc.setFontSize(10);
        forecastReport.insights.opportunities.forEach((opportunity: string) => {
          const lines = doc.splitTextToSize(`• ${opportunity}`, 170);
          lines.forEach((line: string, index: number) => {
            doc.text(index === 0 ? line : `  ${line}`, 20, yPos);
            yPos += 5;
          });
        });
        yPos += 5;
      }

      // Recommendations
      if (forecastReport.insights.recommendations.length > 0) {
        doc.setFontSize(12);
        doc.text("Recommendations:", 14, yPos);
        yPos += 8;
        doc.setFontSize(10);
        forecastReport.insights.recommendations.forEach((recommendation: string) => {
          const lines = doc.splitTextToSize(`• ${recommendation}`, 170);
          lines.forEach((line: string, index: number) => {
            doc.text(index === 0 ? line : `  ${line}`, 20, yPos);
            yPos += 5;
          });
        });
      }

      doc.save(
        `Forecasting_Report_${formatDateFn(forecastReport.dateRange.from, "yyyyMMdd")}_to_${formatDateFn(forecastReport.dateRange.to, "yyyyMMdd")}.pdf`
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

          {/* Tax Rate Input - Only for Monthly Profit/Loss Report */}
          {selectedReport === "monthly_profit_loss" && (
            <div className="w-32 min-w-[120px]">
              <label
                htmlFor="tax-rate-input"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Tax Rate (%)
              </label>
              <Input
                id="tax-rate-input"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                placeholder="25"
                className="w-full text-center"
              />
            </div>
          )}

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
            Array.isArray(reportData) &&
            reportData.length > 0 && (
              <div className="space-y-6">
                {reportData.map((report: any, index: number) => (
                  <MonthlyProfitLossReportTable
                    key={index}
                    data={report as MonthlyProfitLossReport}
                  />
                ))}
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
