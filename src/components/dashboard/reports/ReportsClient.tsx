"use client";

import { useState, useEffect, useMemo } from "react";
import { subDays, format as formatDateFn } from "date-fns";
import { cn, formatNumber } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, FileText, Filter, Download, Info } from "lucide-react";
import { getOutletsAction, getFlashFoodCostReportAction, getDetailedFoodCostReportAction } from "@/actions/foodCostActions";
import { getDetailedBeverageCostReportAction } from "@/actions/beverageCostActions";
import { getMonthlyProfitLossReportAction } from "@/actions/profitLossActions";
import type { Outlet, DailyFinancialSummary, DetailedFoodCostReport, DetailedFoodCostReportResponse, DetailedBeverageCostReportResponse, MonthlyProfitLossReport } from "@/types";
import { FlashFoodCostReportTable } from "../../ui/flash-food-cost-report-table";
import { DetailedFoodCostReportTable } from "../../ui/detailed-food-cost-report-table";
import { CombinedFoodCostReportTable } from "../../ui/combined-food-cost-report-table";
import { DetailedBeverageCostReportTable } from "../../ui/detailed-beverage-cost-report-table";
import { CombinedBeverageCostReportTable } from "../../ui/combined-beverage-cost-report-table";
import { MonthlyProfitLossReportTable } from "../../ui/MonthlyProfitLossReportTable";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import * as XLSX from "xlsx"; // Import the xlsx library
import { jsPDF } from "jspdf"; // Import jsPDF
import autoTable from "jspdf-autotable"; // Import jspdf-autotable

interface ReportOption {
  value: string;
  label: string;
}

const reportOptions: ReportOption[] = [
  { value: "detailed_food_cost", label: "Detailed Food Cost Report" },
  { value: "detailed_beverage_cost", label: "Detailed Beverage Cost Report" },
  { value: "monthly_profit_loss", label: "Monthly Profit/Loss Report" },
  { value: "cost_analysis_by_category", label: "Cost Analysis by Category" },
  { value: "budget_vs_actuals", label: "Budget vs. Actuals (F&B)" },
  { value: "daily_revenue_trends", label: "Daily Revenue Trends" },
];

export default function ReportsClient() {
  const [selectedReport, setSelectedReport] = useState<string>("detailed_food_cost");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [allOutlets, setAllOutlets] = useState<Outlet[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<string | undefined>("all");
  const [isFetchingOutlets, setIsFetchingOutlets] = useState(true);
  const [reportData, setReportData] = useState<DetailedFoodCostReportResponse | DetailedBeverageCostReportResponse | MonthlyProfitLossReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  const { toast } = useToast();

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
    if (selectedReport === "detailed_food_cost" || selectedReport === "detailed_beverage_cost") {
      setSelectedOutletId("all");
    }
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
        setAllOutlets([{ id: "all", name: "All Outlets" }, ...fetchedOutletsFromDB]);
      } catch (error) {
        console.error("Error fetching outlets:", error);
        toast({ variant: "destructive", title: "Error fetching outlets", description: (error as Error).message });
      } finally {
        setIsFetchingOutlets(false);
      }
    };
    fetchOutlets();
  }, [toast]);

  const handleGenerateReport = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast({ variant: "destructive", title: "Missing Date Range", description: "Please select a date range to generate the report." });
      return;
    }
    
    setIsLoadingReport(true);
    setReportData(null); // Clear previous report data

    try {
      if (selectedReport === "detailed_food_cost") {
        if (!dateRange?.from || !dateRange?.to) {
          toast({ variant: "destructive", title: "Missing Report Parameters", description: "Please select a valid date range." });
          return;
        }
        console.log("Calling getDetailedFoodCostReportAction from client...");
        const data = await getDetailedFoodCostReportAction(dateRange.from, dateRange.to, "all");
        setReportData(data);
      } else if (selectedReport === "detailed_beverage_cost") {
        console.log("Calling getDetailedBeverageCostReportAction from client...");
        const data = await getDetailedBeverageCostReportAction(dateRange.from, dateRange.to, "all");
        setReportData(data);
      } else if (selectedReport === "monthly_profit_loss") {
        if (!dateRange?.from) {
          toast({ variant: "destructive", title: "Missing Date", description: "Please select a date for the monthly report." });
          return;
        }
        console.log("Calling getMonthlyProfitLossReportAction from client...");
        const year = dateRange.from.getFullYear();
        const month = dateRange.from.getMonth(); // 0-indexed
        const data = await getMonthlyProfitLossReportAction(year, month);
        setReportData(data);
      } else {
        // Fallback for other reports not yet implemented
        console.log(`Generating ${selectedReport} for ${formatDateFn(dateRange.from, 'PPP')} to ${formatDateFn(dateRange.to, 'PPP')}`);
        setReportData(null); // Clear data for unsupported reports
      }
      toast({ title: "Report Generated", description: "Your report is ready." });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({ variant: "destructive", title: "Report Generation Error", description: (error as Error).message || "Failed to generate report." });
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleExportToExcel = () => {
    if (!reportData) {
      toast({ variant: "destructive", title: "No Report Data", description: "Generate a report first before exporting." });
      return;
    }

    if (!dateRange?.from || !dateRange?.to) {
      toast({ variant: "destructive", title: "Missing Date Range", description: "Please select a date range to export the report." });
      return;
    }

    const ws_data: any[][] = [];

    if (selectedReport === "detailed_food_cost" && 'overallSummaryReport' in reportData) {
      // Food Cost Report Export
      const foodReportData = reportData as DetailedFoodCostReportResponse;
      ws_data.push(["Detailed Food Cost Report (All Outlets)"]);
      ws_data.push([`Date Range: ${formatDateFn(foodReportData.overallSummaryReport.dateRange.from, "MMM dd, yyyy")} - ${formatDateFn(foodReportData.overallSummaryReport.dateRange.to, "MMM dd, yyyy")}`]);
      ws_data.push([]); // Empty row for spacing
      ws_data.push(["Summary Financial Metrics"]);
      ws_data.push(["Details", "Total"]);
      ws_data.push(["Total Food Revenue:", formatNumber(foodReportData.overallSummaryReport.totalFoodRevenue)]);
      ws_data.push(["Budget Food Cost %:", formatNumber(foodReportData.overallSummaryReport.budgetFoodCostPercentage)]);
      ws_data.push(["OC Food:", formatNumber(foodReportData.overallSummaryReport.ocFoodTotal)]);
      ws_data.push(["Entertainment Food:", formatNumber(foodReportData.overallSummaryReport.entFoodTotal)]);
      ws_data.push(["Other Food Adjustments:", formatNumber(foodReportData.overallSummaryReport.otherAdjustmentsFood)]);
      ws_data.push(["Total Cost of Food:", formatNumber(foodReportData.overallSummaryReport.totalCostOfFood)]);
      ws_data.push(["Food Cost %:", formatNumber(foodReportData.overallSummaryReport.foodCostPercentage)]);
      ws_data.push(["Variance %:", formatNumber(foodReportData.overallSummaryReport.variancePercentage)]);
      ws_data.push([]); // Empty row for spacing

      // Add Individual Outlet Details
      ws_data.push(["Cost Details from Outlets"]);
      foodReportData.outletReports.forEach(outletReport => {
        ws_data.push([]); // Empty row for spacing
        ws_data.push([`${outletReport.outletName} - Total Cost from Transfers:`, formatNumber(outletReport.totalCostFromTransfers)]);
        ws_data.push(["Category", "Description", "Cost"]);
        if (outletReport.foodCostDetailsByItem.length > 0) {
          outletReport.foodCostDetailsByItem.forEach((item: any) => {
            ws_data.push([item.categoryName, item.description, formatNumber(item.cost)]);
          });
        } else {
          ws_data.push(["No detailed food cost entries for this outlet.", "", ""]);
        }
      });
    } else if (selectedReport === "detailed_beverage_cost" && 'overallSummaryReport' in reportData) {
      // Beverage Cost Report Export
      const beverageReportData = reportData as DetailedBeverageCostReportResponse;
      ws_data.push(["Detailed Beverage Cost Report (All Outlets)"]);
      ws_data.push([`Date Range: ${formatDateFn(beverageReportData.overallSummaryReport.dateRange.from, "MMM dd, yyyy")} - ${formatDateFn(beverageReportData.overallSummaryReport.dateRange.to, "MMM dd, yyyy")}`]);
      ws_data.push([]); // Empty row for spacing
      ws_data.push(["Summary Financial Metrics"]);
      ws_data.push(["Details", "Total"]);
      ws_data.push(["Total Beverage Revenue:", formatNumber(beverageReportData.overallSummaryReport.totalBeverageRevenue)]);
      ws_data.push(["Budget Beverage Cost %:", formatNumber(beverageReportData.overallSummaryReport.budgetBeverageCostPercentage)]);
      ws_data.push(["OC Beverage:", formatNumber(beverageReportData.overallSummaryReport.ocBeverageTotal)]);
      ws_data.push(["Entertainment Beverage:", formatNumber(beverageReportData.overallSummaryReport.entBeverageTotal)]);
      ws_data.push(["Other Beverage Adjustments:", formatNumber(beverageReportData.overallSummaryReport.otherAdjustmentsBeverage)]);
      ws_data.push(["Total Cost of Beverage:", formatNumber(beverageReportData.overallSummaryReport.totalCostOfBeverage)]);
      ws_data.push(["Beverage Cost %:", formatNumber(beverageReportData.overallSummaryReport.beverageCostPercentage)]);
      ws_data.push(["Variance %:", formatNumber(beverageReportData.overallSummaryReport.variancePercentage)]);
      ws_data.push([]); // Empty row for spacing

      // Add Individual Outlet Details
      ws_data.push(["Cost Details from Outlets"]);
      beverageReportData.outletReports.forEach(outletReport => {
        ws_data.push([]); // Empty row for spacing
        ws_data.push([`${outletReport.outletName} - Total Cost from Transfers:`, formatNumber(outletReport.totalCostFromTransfers)]);
        ws_data.push(["Category", "Description", "Cost"]);
        if (outletReport.beverageCostDetailsByItem.length > 0) {
          outletReport.beverageCostDetailsByItem.forEach((item: any) => {
            ws_data.push([item.categoryName, item.description, formatNumber(item.cost)]);
          });
        } else {
          ws_data.push(["No detailed beverage cost entries for this outlet.", "", ""]);
        }
      });
    } else if (selectedReport === "monthly_profit_loss" && 'monthYear' in reportData) {
      const monthlyReportData = reportData as MonthlyProfitLossReport;
      ws_data.push([`Monthly Profit/Loss Report for ${monthlyReportData.monthYear}`]);
      ws_data.push([]);
      ws_data.push(["Metric", "Value"]);
      ws_data.push(["Total Food Revenue", formatNumber(monthlyReportData.totalFoodRevenue)]);
      ws_data.push(["Total Beverage Revenue", formatNumber(monthlyReportData.totalBeverageRevenue)]);
      ws_data.push(["Total Revenue", formatNumber(monthlyReportData.totalRevenue)]);
      ws_data.push(["Total Actual Food Cost", formatNumber(monthlyReportData.totalActualFoodCost)]);
      ws_data.push(["Total Actual Beverage Cost", formatNumber(monthlyReportData.totalActualBeverageCost)]);
      ws_data.push(["Total Actual Cost", formatNumber(monthlyReportData.totalActualCost)]);
      ws_data.push(["Gross Profit", formatNumber(monthlyReportData.grossProfit)]);
      ws_data.push(["Food Cost %", formatNumber(monthlyReportData.foodCostPercentage)]);
      ws_data.push(["Beverage Cost %", formatNumber(monthlyReportData.beverageCostPercentage)]);
      ws_data.push(["Overall Cost %", formatNumber(monthlyReportData.overallCostPercentage)]);
      ws_data.push(["Avg. Budget Food Cost %", formatNumber(monthlyReportData.averageBudgetFoodCostPct)]);
      ws_data.push(["Avg. Budget Beverage Cost %", formatNumber(monthlyReportData.averageBudgetBeverageCostPct)]);

      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Monthly Profit Loss Report");
      XLSX.writeFile(wb, `Monthly_Profit_Loss_Report_${monthlyReportData.monthYear.replace(/[^a-zA-Z0-9-]/g, '_')}.xlsx`);
    }

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedReport === "detailed_food_cost" ? "Food Cost Report" : "Beverage Cost Report");
    XLSX.writeFile(wb, `${selectedReport === "detailed_food_cost" ? "Detailed_Food_Cost_Report" : "Detailed_Beverage_Cost_Report"}_${formatDateFn(dateRange.from, 'yyyyMMdd')}_to_${formatDateFn(dateRange.to, 'yyyyMMdd')}.xlsx`);

    toast({ title: "Export to Excel", description: "Report successfully exported to Excel." });
  };

  const handleExportToPDF = () => {
    if (!reportData) {
      toast({ variant: "destructive", title: "No Report Data", description: "Generate a report first before exporting." });
      return;
    }

    if (!dateRange?.from || !dateRange?.to) {
      toast({ variant: "destructive", title: "Missing Date Range", description: "Please select a date range to export the report." });
      return;
    }

    const doc = new jsPDF();
    let yPos = 10; // Initial Y position

    if (selectedReport === "detailed_food_cost" && 'overallSummaryReport' in reportData) {
      // Food Cost Report Export
      const foodReportData = reportData as DetailedFoodCostReportResponse;
      
      // Report Title and Date Range
      doc.setFontSize(18);
      doc.text("Detailed Food Cost Report (All Outlets)", 14, yPos);
      yPos += 10;
      doc.setFontSize(10);
      doc.text(`Date Range: ${formatDateFn(dateRange.from, "MMM dd, yyyy")} - ${formatDateFn(dateRange.to, "MMM dd, yyyy")}`, 14, yPos);
      yPos += 15;

      // Summary Financial Metrics
      doc.setFontSize(14);
      doc.text("Summary Financial Metrics", 14, yPos);
      yPos += 5; // Small gap

      const summaryHeaders = [["Details", "Total"]];
      const summaryData = [
        ["Total Food Revenue:", renderCurrency(foodReportData.overallSummaryReport.totalFoodRevenue)],
        ["Budget Food Cost %:", renderPercentage(foodReportData.overallSummaryReport.budgetFoodCostPercentage)],
        ["OC Food:", renderCurrency(foodReportData.overallSummaryReport.ocFoodTotal)],
        ["Entertainment Food:", renderCurrency(foodReportData.overallSummaryReport.entFoodTotal)],
        ["Other Food Adjustments:", renderCurrency(foodReportData.overallSummaryReport.otherAdjustmentsFood)],
        ["Total Cost of Food:", renderCurrency(foodReportData.overallSummaryReport.totalCostOfFood)],
        ["Food Cost %:", renderPercentage(foodReportData.overallSummaryReport.foodCostPercentage)],
        ["Variance %:", renderPercentage(foodReportData.overallSummaryReport.variancePercentage)],
      ];

      autoTable(doc, {
        startY: yPos,
        head: summaryHeaders,
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 1: { halign: 'right' } },
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
        doc.text(`${outletReport.outletName} - Total Cost from Transfers: ${renderCurrency(outletReport.totalCostFromTransfers)}`, 14, yPos);
        yPos += 5;

        const outletDetailsHeaders = [["Category", "Description", "Cost"]];
        const outletDetailsData = outletReport.foodCostDetailsByItem.length > 0 
          ? outletReport.foodCostDetailsByItem.map((item: { categoryName: string; description: string; cost: number }) => [item.categoryName, item.description, renderCurrency(item.cost)])
          : [["No detailed food cost entries for this outlet.", "", ""]];

        autoTable(doc, {
          startY: yPos,
          head: outletDetailsHeaders,
          body: outletDetailsData,
          theme: 'grid',
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
          styles: { fontSize: 9, cellPadding: 1.5 },
          columnStyles: { 2: { halign: 'right' } },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos; // Update yPos after table
          },
        });
        yPos += 10; // Gap after each outlet table
      });

      doc.save(`Detailed_Food_Cost_Report_${formatDateFn(dateRange.from, 'yyyyMMdd')}_to_${formatDateFn(dateRange.to, 'yyyyMMdd')}.pdf`);
    } else if (selectedReport === "detailed_beverage_cost" && 'overallSummaryReport' in reportData) {
      // Beverage Cost Report Export
      const beverageReportData = reportData as DetailedBeverageCostReportResponse;
      
      // Report Title and Date Range
      doc.setFontSize(18);
      doc.text("Detailed Beverage Cost Report (All Outlets)", 14, yPos);
      yPos += 10;
      doc.setFontSize(10);
      doc.text(`Date Range: ${formatDateFn(dateRange.from, "MMM dd, yyyy")} - ${formatDateFn(dateRange.to, "MMM dd, yyyy")}`, 14, yPos);
      yPos += 15;

      // Summary Financial Metrics
      doc.setFontSize(14);
      doc.text("Summary Financial Metrics", 14, yPos);
      yPos += 5; // Small gap

      const summaryHeaders = [["Details", "Total"]];
      const summaryData = [
        ["Total Beverage Revenue:", renderCurrency(beverageReportData.overallSummaryReport.totalBeverageRevenue)],
        ["Budget Beverage Cost %:", renderPercentage(beverageReportData.overallSummaryReport.budgetBeverageCostPercentage)],
        ["OC Beverage:", renderCurrency(beverageReportData.overallSummaryReport.ocBeverageTotal)],
        ["Entertainment Beverage:", renderCurrency(beverageReportData.overallSummaryReport.entBeverageTotal)],
        ["Other Beverage Adjustments:", renderCurrency(beverageReportData.overallSummaryReport.otherAdjustmentsBeverage)],
        ["Total Cost of Beverage:", renderCurrency(beverageReportData.overallSummaryReport.totalCostOfBeverage)],
        ["Beverage Cost %:", renderPercentage(beverageReportData.overallSummaryReport.beverageCostPercentage)],
        ["Variance %:", renderPercentage(beverageReportData.overallSummaryReport.variancePercentage)],
      ];

      autoTable(doc, {
        startY: yPos,
        head: summaryHeaders,
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 1: { halign: 'right' } },
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
        doc.text(`${outletReport.outletName} - Total Cost from Transfers: ${renderCurrency(outletReport.totalCostFromTransfers)}`, 14, yPos);
        yPos += 5;

        const outletDetailsHeaders = [["Category", "Description", "Cost"]];
        const outletDetailsData = outletReport.beverageCostDetailsByItem.length > 0 
          ? outletReport.beverageCostDetailsByItem.map((item: { categoryName: string; description: string; cost: number }) => [item.categoryName, item.description, renderCurrency(item.cost)])
          : [["No detailed beverage cost entries for this outlet.", "", ""]];

        autoTable(doc, {
          startY: yPos,
          head: outletDetailsHeaders,
          body: outletDetailsData,
          theme: 'grid',
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
          styles: { fontSize: 9, cellPadding: 1.5 },
          columnStyles: { 2: { halign: 'right' } },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos; // Update yPos after table
          },
        });
        yPos += 10; // Gap after each outlet table
      });

      doc.save(`Detailed_Beverage_Cost_Report_${formatDateFn(dateRange.from, 'yyyyMMdd')}_to_${formatDateFn(dateRange.to, 'yyyyMMdd')}.pdf`);
    } else if (selectedReport === "monthly_profit_loss" && 'monthYear' in reportData) {
      const monthlyReportData = reportData as MonthlyProfitLossReport;
      doc.setFontSize(18);
      doc.text(`Monthly Profit/Loss Report for ${monthlyReportData.monthYear}`, 14, yPos);
      yPos += 15;

      const monthlyHeaders = [["Metric", "Value"]];
      const monthlyData = [
        ["Total Food Revenue:", renderCurrency(monthlyReportData.totalFoodRevenue)],
        ["Total Beverage Revenue:", renderCurrency(monthlyReportData.totalBeverageRevenue)],
        ["Total Revenue:", renderCurrency(monthlyReportData.totalRevenue)],
        ["Total Actual Food Cost:", renderCurrency(monthlyReportData.totalActualFoodCost)],
        ["Total Actual Beverage Cost:", renderCurrency(monthlyReportData.totalActualBeverageCost)],
        ["Total Actual Cost:", renderCurrency(monthlyReportData.totalActualCost)],
        ["Gross Profit:", renderCurrency(monthlyReportData.grossProfit)],
        ["Food Cost %:", renderPercentage(monthlyReportData.foodCostPercentage)],
        ["Beverage Cost %:", renderPercentage(monthlyReportData.beverageCostPercentage)],
        ["Overall Cost %:", renderPercentage(monthlyReportData.overallCostPercentage)],
        ["Avg. Budget Food Cost %:", renderPercentage(monthlyReportData.averageBudgetFoodCostPct)],
        ["Avg. Budget Beverage Cost %:", renderPercentage(monthlyReportData.averageBudgetBeverageCostPct)],
      ];

      autoTable(doc, {
        startY: yPos,
        head: monthlyHeaders,
        body: monthlyData,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 1: { halign: 'right' } },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos; 
        },
      });

      doc.save(`Monthly_Profit_Loss_Report_${monthlyReportData.monthYear.replace(/ /g, '_')}.pdf`);
    }

    toast({ title: "Export to PDF", description: "Report successfully exported to PDF." });
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Report Options */}
      <Card className="w-full shadow-md bg-card">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Report Options</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="report-select" className="block text-sm font-medium text-foreground mb-1">Report Type</label>
            <Select value={selectedReport} onValueChange={setSelectedReport}>
              <SelectTrigger id="report-select" className="w-full text-base md:text-sm">
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
            <label htmlFor="date-range-picker" className="block text-sm font-medium text-foreground mb-1">Date Range</label>
            {dateRange && (
              <DateRangePicker date={dateRange} setDate={setDateRange} />
            )}
          </div>

          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-1 mb-1">
              <label htmlFor="outlet-select" className="block text-sm font-medium text-foreground">Outlet Filter</label>
              {(selectedReport === "detailed_food_cost" || selectedReport === "detailed_beverage_cost" || selectedReport === "monthly_profit_loss") && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Outlet filter is disabled for Detailed Cost Reports and Monthly Profit/Loss Report. All outlets will be shown.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <Select 
              value={selectedOutletId} 
              onValueChange={setSelectedOutletId} 
              disabled={isFetchingOutlets || selectedReport === "detailed_food_cost" || selectedReport === "detailed_beverage_cost" || selectedReport === "monthly_profit_loss"}
            >
              <SelectTrigger id="outlet-select" className="w-full text-base md:text-sm">
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
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-headline text-xl">Report Display</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportToExcel}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export to Excel
            </Button>
            <Button variant="outline" onClick={handleExportToPDF}>
              <FileText className="mr-2 h-4 w-4" />
              Export to PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingReport && <p className="text-center text-muted-foreground">Generating report...</p>}
          {!isLoadingReport && !reportData && <p className="text-center text-muted-foreground">Select a report type and click Apply Filters to generate the report</p>}
          {!isLoadingReport && reportData && selectedReport === "detailed_food_cost" && (
            <div className="space-y-6">
              <CombinedFoodCostReportTable data={reportData as DetailedFoodCostReportResponse} />
            </div>
          )}
          {!isLoadingReport && reportData && selectedReport === "detailed_beverage_cost" && (
            <div className="space-y-6">
              <CombinedBeverageCostReportTable reportData={reportData as DetailedBeverageCostReportResponse} />
            </div>
          )}
          {!isLoadingReport && reportData && selectedReport === "monthly_profit_loss" && (
            <div className="space-y-6">
              <MonthlyProfitLossReportTable data={reportData as MonthlyProfitLossReport} />
            </div>
          )}
          {!isLoadingReport && reportData && selectedReport !== "detailed_food_cost" && selectedReport !== "detailed_beverage_cost" && selectedReport !== "monthly_profit_loss" && (
            <div className="border p-4 rounded-lg bg-secondary/10">
              <h3 className="text-lg font-semibold mb-2">Report Output:</h3>
              <pre className="whitespace-pre-wrap text-sm text-foreground/80">{JSON.stringify(reportData, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 