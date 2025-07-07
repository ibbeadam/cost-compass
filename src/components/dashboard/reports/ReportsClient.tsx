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
  Calendar,
  Info,
  RefreshCw,
  Clock,
  Play,
  Pause,
  Building2,
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
import { getPropertyPerformanceComparisonReportAction, type PropertyPerformanceComparisonReport } from "@/actions/propertyPerformanceActions";
import { getOutletEfficiencyProfitabilityReportAction, type OutletEfficiencyProfitabilityReport } from "@/actions/outletEfficiencyActions";
import { getCategoryPerformanceTrendsReportAction, type CategoryPerformanceTrendsReport } from "@/actions/categoryTrendsActions";
import { getUserActivityAuditReportAction, type UserActivityAuditReport } from "@/actions/userActivityAuditActions";
import { getCostVarianceAnalysisReportAction, type CostVarianceAnalysisReport } from "@/actions/costVarianceActions";
import { getPredictiveAnalyticsReportAction, type PredictiveAnalyticsReport } from "@/actions/predictiveAnalyticsActions";
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
import PropertyPerformanceComparisonReport from "./PropertyPerformanceComparisonReport";
import OutletEfficiencyProfitabilityReport from "./OutletEfficiencyProfitabilityReport";
import CategoryPerformanceTrendsReport from "./CategoryPerformanceTrendsReport";
import UserActivityAuditReport from "./UserActivityAuditReport";
import CostVarianceAnalysisReport from "./CostVarianceAnalysisReport";
import PredictiveAnalyticsReport from "./PredictiveAnalyticsReport";
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
  { value: "property_performance_comparison", label: "Property Performance Comparison" },
  { value: "outlet_efficiency_profitability", label: "Outlet Efficiency & Profitability" },
  { value: "category_performance_trends", label: "Category Performance Trends" },
  { value: "user_activity_audit", label: "User Activity & Audit Report" },
  { value: "cost_variance_analysis", label: "Cost Variance Analysis Report" },
  { value: "predictive_analytics", label: "Predictive Analytics & Forecasting Report" },
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
    | PropertyPerformanceComparisonReport
    | OutletEfficiencyProfitabilityReport
    | CategoryPerformanceTrendsReport
    | UserActivityAuditReport
    | CostVarianceAnalysisReport
    | PredictiveAnalyticsReport
    | null
  >(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(
    null
  );

  // Helper function to get property name for report title
  const getPropertyDisplayName = () => {
    if (user?.role !== "super_admin") {
      // For non-super admin users, don't show property selector
      return "";
    }
    
    if (!selectedPropertyId || selectedPropertyId === "all") {
      return " (All Properties)";
    }
    
    const selectedProperty = properties.find(p => p.id.toString() === selectedPropertyId);
    return selectedProperty ? ` (${selectedProperty.name})` : "";
  };

  // Helper function to get property name from report data
  const getReportPropertyName = (reportData: any) => {
    if (reportData?.propertyInfo?.name) {
      return ` - ${reportData.propertyInfo.name}`;
    }
    if (user?.role === "super_admin") {
      if (!selectedPropertyId || selectedPropertyId === "all") {
        return " - All Properties";
      } else {
        // Super admin selected a specific property but propertyInfo is missing
        const selectedProperty = properties.find(p => p.id.toString() === selectedPropertyId);
        return selectedProperty ? ` - ${selectedProperty.name}` : " - Selected Property";
      }
    }
    // For non-super admin users, show their assigned property if available
    if (user?.propertyAccess && user.propertyAccess.length === 1) {
      return ` - ${user.propertyAccess[0].property.name}`;
    }
    return "";
  };

  // Helper function to get formatted date range
  const getDateRangeDisplay = () => {
    if (!dateRange?.from || !dateRange?.to) {
      return "";
    }
    return ` | ${formatDateFn(dateRange.from, "MMM dd, yyyy")} - ${formatDateFn(dateRange.to, "MMM dd, yyyy")}`;
  };

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

  // Helper function to get property header data for reports
  const getPropertyHeaderData = () => {
    const selectedProperty = properties.find(p => p.id.toString() === selectedPropertyId);
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    if (!selectedProperty && selectedPropertyId !== "all") {
      return {
        propertyName: "Unknown Property",
        propertyType: "",
        propertyCode: "",
        address: "",
        city: "",
        state: "",
        country: "",
        logoUrl: "",
        generatedAt: currentDate,
        isAllProperties: false
      };
    }

    if (selectedPropertyId === "all" || !selectedProperty) {
      return {
        propertyName: "All Properties",
        propertyType: "Multi-Property Report",
        propertyCode: "ALL",
        address: "",
        city: "",
        state: "",
        country: "",
        logoUrl: "",
        generatedAt: currentDate,
        isAllProperties: true
      };
    }

    return {
      propertyName: selectedProperty.name || "Unknown Property",
      propertyType: selectedProperty.propertyType ? 
        selectedProperty.propertyType.charAt(0).toUpperCase() + selectedProperty.propertyType.slice(1) : "",
      propertyCode: selectedProperty.propertyCode || "",
      address: selectedProperty.address || "",
      city: selectedProperty.city || "",
      state: selectedProperty.state || "",
      country: selectedProperty.country || "",
      logoUrl: selectedProperty.logoUrl || "",
      generatedAt: currentDate,
      isAllProperties: false
    };
  };

  // Helper function to create formatted header for Excel reports
  const createExcelReportHeader = (reportTitle: string, dateRangeText: string) => {
    const propertyHeader = getPropertyHeaderData();
    const headerRows: any[][] = [];
    
    // 1. Report Title (centered)
    headerRows.push(["", "", reportTitle, "", "", ""]);
    
    // 2. Date Range (centered)
    headerRows.push(["", "", dateRangeText, "", "", ""]);
    
    // Empty row for spacing
    headerRows.push([]);
    
    // 3. Property details on left, space for logo on right
    // Property Name (left) + Logo space (right)
    headerRows.push([propertyHeader.propertyName, "", "", "", "", "LOGO_PLACEHOLDER"]);
    
    // Property Code (left)
    if (propertyHeader.propertyCode) {
      headerRows.push([`Property Code: ${propertyHeader.propertyCode}`, "", "", "", "", ""]);
    }
    
    // Full Address (left)
    const fullAddress = [
      propertyHeader.address,
      propertyHeader.city,
      propertyHeader.state,
      propertyHeader.country
    ].filter(Boolean).join(", ");
    
    if (fullAddress) {
      headerRows.push([fullAddress, "", "", "", "", ""]);
    }
    
    // Generated date (left)
    headerRows.push([`Generated: ${propertyHeader.generatedAt}`, "", "", "", "", ""]);
    
    // Empty row for spacing
    headerRows.push([]);
    
    return headerRows;
  };

  // Helper function to load and add logo to PDF
  const addLogoToPDF = async (
    doc: jsPDF, 
    logoUrl: string, 
    x: number, 
    y: number, 
    maxWidth: number = 40, 
    maxHeight: number = 30
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
        try {
          // Calculate dimensions while maintaining aspect ratio
          const imgWidth = img.width;
          const imgHeight = img.height;
          const aspectRatio = imgWidth / imgHeight;
          
          let finalWidth = maxWidth;
          let finalHeight = maxHeight;
          
          if (aspectRatio > 1) {
            // Image is wider than it is tall
            finalHeight = maxWidth / aspectRatio;
          } else {
            // Image is taller than it is wide
            finalWidth = maxHeight * aspectRatio;
          }
          
          // Ensure dimensions don't exceed maximums
          if (finalWidth > maxWidth) {
            finalWidth = maxWidth;
            finalHeight = maxWidth / aspectRatio;
          }
          if (finalHeight > maxHeight) {
            finalHeight = maxHeight;
            finalWidth = maxHeight * aspectRatio;
          }
          
          // Add the image to the PDF
          doc.addImage(img, 'JPEG', x, y, finalWidth, finalHeight);
          resolve();
        } catch (error) {
          console.warn("Failed to add logo to PDF:", error);
          resolve(); // Continue without logo rather than failing
        }
      };
      
      img.onerror = () => {
        console.warn("Failed to load logo for PDF");
        resolve(); // Continue without logo rather than failing
      };
      
      // Handle both relative and absolute URLs
      if (logoUrl.startsWith('/')) {
        img.src = `${window.location.origin}${logoUrl}`;
      } else {
        img.src = logoUrl;
      }
    });
  };

  // Helper function to add footer to PDF pages
  const addPDFFooter = (doc: jsPDF, currentUser: any) => {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const leftMargin = 14;
    const rightMargin = 14;
    const footerY = pageHeight - 10; // 10px from bottom
    
    // Get current date and time in the requested format
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    const formattedDate = now.toLocaleDateString('en-US', options);
    
    // Format: "Generated by: Ibrahim Adam on July 7, 2025 at 02:43 PM"
    const userName = currentUser?.name || 'System User';
    const generatedByText = `Generated by: ${userName} on ${formattedDate}`;
    
    // Page numbers: "Page X of Y"
    const pageInfo = doc.internal.getCurrentPageInfo();
    const currentPage = pageInfo.pageNumber;
    const totalPages = doc.internal.getNumberOfPages();
    const pageText = `Page ${currentPage} of ${totalPages}`;
    
    // Set footer font
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100); // Gray color
    
    // Add generated by text (left side)
    doc.text(generatedByText, leftMargin, footerY);
    
    // Add page numbers (right side)
    const pageTextWidth = doc.getTextWidth(pageText);
    doc.text(pageText, pageWidth - rightMargin - pageTextWidth, footerY);
    
    // Reset text color to black for other content
    doc.setTextColor(0, 0, 0);
  };

  // Helper function to create professional PDF header layout with logo support
  const createProfessionalPDFHeader = async (
    doc: jsPDF, 
    reportTitle: string, 
    dateRangeText: string
  ): Promise<number> => {
    const propertyHeader = getPropertyHeaderData();
    let yPos = 20;
    const pageWidth = doc.internal.pageSize.width;
    const leftMargin = 14;
    const rightMargin = 14;
    const contentWidth = pageWidth - leftMargin - rightMargin;
    
    // 1. Report title (centered)
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    const titleWidth = doc.getTextWidth(reportTitle);
    const titleX = leftMargin + (contentWidth - titleWidth) / 2;
    doc.text(reportTitle, titleX, yPos);
    yPos += 10;
    
    // 2. Date range (centered)
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    const dateWidth = doc.getTextWidth(dateRangeText);
    const dateX = leftMargin + (contentWidth - dateWidth) / 2;
    doc.text(dateRangeText, dateX, yPos);
    yPos += 15;
    
    // Store the starting Y position for property details
    const propertyDetailsStartY = yPos;
    
    // 3. Property details on left, logo on right
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    
    // Property Name (left side)
    doc.text(propertyHeader.propertyName, leftMargin, yPos);
    yPos += 6;
    
    // Property Code (left side)
    if (propertyHeader.propertyCode) {
      doc.setFont("helvetica", "normal");
      doc.text(`Property Code: ${propertyHeader.propertyCode}`, leftMargin, yPos);
      yPos += 6;
    }
    
    // Full Address (left side)
    const fullAddress = [
      propertyHeader.address,
      propertyHeader.city,
      propertyHeader.state,
      propertyHeader.country
    ].filter(Boolean).join(", ");
    
    if (fullAddress) {
      doc.setFont("helvetica", "normal");
      doc.text(fullAddress, leftMargin, yPos);
      yPos += 6;
    }
    
    // Add logo on the right side (aligned with property details)
    if (propertyHeader.logoUrl) {
      const logoX = pageWidth - rightMargin - 40; // 40px width for logo
      const logoY = propertyDetailsStartY - 15; // Move logo up for better positioning
      
      try {
        await addLogoToPDF(doc, propertyHeader.logoUrl, logoX, logoY, 40, 30);
      } catch (error) {
        console.warn("Could not add logo to PDF:", error);
      }
    }
    
    yPos += 15; // Extra space before content
    
    return yPos;
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
        
        // Filter outlets based on selected property
        let filteredOutlets = fetchedOutletsFromDB;
        
        if (user?.role === "super_admin" && selectedPropertyId && selectedPropertyId !== "all") {
          // For super admin with specific property selected, filter by property
          const numericPropertyId = Number(selectedPropertyId);
          filteredOutlets = fetchedOutletsFromDB.filter(outlet => outlet.propertyId === numericPropertyId);
        } else if (user?.role !== "super_admin" && user?.propertyAccess) {
          // For non-super admin users, filter by their assigned properties
          const userPropertyIds = user.propertyAccess.map(access => access.propertyId);
          filteredOutlets = fetchedOutletsFromDB.filter(outlet => 
            outlet.propertyId && userPropertyIds.includes(outlet.propertyId)
          );
        }
        
        setAllOutlets([
          { id: "all", name: "All Outlets" },
          ...filteredOutlets,
        ]);
        
        // Reset outlet selection if current selection is no longer valid
        if (selectedOutletId && selectedOutletId !== "all") {
          const isOutletStillValid = filteredOutlets.some(outlet => outlet.id.toString() === selectedOutletId.toString());
          if (!isOutletStillValid) {
            setSelectedOutletId("all");
          }
        }
      } catch (error) {
        console.error("Error fetching outlets:", error);
        showToast.error((error as Error).message);
      } finally {
        setIsFetchingOutlets(false);
      }
    };
    fetchOutlets();
  }, [selectedPropertyId, user]);

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
          "all",
          selectedPropertyId || "all"
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
          "all",
          selectedPropertyId || "all"
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
          taxRate,
          selectedPropertyId || "all"
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
          selectedOutletId,
          selectedPropertyId
        );
        console.log("Cost Analysis by Category Report data:", data);
        console.log("dateRange:", data.dateRange);
        setReportData(data);
      } else if (selectedReport === "budget_vs_actuals") {
        console.log("Calling getBudgetVsActualsReportAction from client...");
        const data = await getBudgetVsActualsReportAction(
          dateRange.from,
          dateRange.to,
          selectedOutletId,
          selectedPropertyId
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
          selectedOutletId,
          selectedPropertyId
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
          previousYear,
          selectedPropertyId
        );
        console.log("Year-over-Year Report data:", data);
        setReportData(data);
      } else if (selectedReport === "real_time_kpi") {
        console.log("Calling getRealTimeKPIDashboardAction from client...");
        const data = await getRealTimeKPIDashboardAction(
          undefined, // Always use all outlets for real-time KPI dashboard
          selectedPropertyId
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
          undefined, // Always use all outlets for forecasting report
          selectedPropertyId
        );
        console.log("Forecasting Report data:", data);
        setReportData(data);
      } else if (selectedReport === "property_performance_comparison") {
        console.log("Calling getPropertyPerformanceComparisonReportAction from client...");
        const data = await getPropertyPerformanceComparisonReportAction(
          dateRange.from,
          dateRange.to,
          selectedPropertyId
        );
        console.log("Property Performance Comparison Report data:", data);
        setReportData(data);
      } else if (selectedReport === "outlet_efficiency_profitability") {
        console.log("Calling getOutletEfficiencyProfitabilityReportAction from client...");
        const data = await getOutletEfficiencyProfitabilityReportAction(
          dateRange.from,
          dateRange.to,
          selectedOutletId,
          selectedPropertyId
        );
        console.log("Outlet Efficiency Profitability Report data:", data);
        setReportData(data);
      } else if (selectedReport === "category_performance_trends") {
        console.log("Calling getCategoryPerformanceTrendsReportAction from client...");
        const data = await getCategoryPerformanceTrendsReportAction(
          dateRange.from,
          dateRange.to,
          selectedOutletId,
          selectedPropertyId
        );
        console.log("Category Performance Trends Report data:", data);
        setReportData(data);
      } else if (selectedReport === "user_activity_audit") {
        console.log("Calling getUserActivityAuditReportAction from client...");
        const data = await getUserActivityAuditReportAction(
          dateRange.from,
          dateRange.to,
          selectedPropertyId
        );
        console.log("User Activity & Audit Report data:", data);
        setReportData(data);
      } else if (selectedReport === "cost_variance_analysis") {
        console.log("Calling getCostVarianceAnalysisReportAction from client...");
        const data = await getCostVarianceAnalysisReportAction(
          dateRange.from,
          dateRange.to,
          selectedOutletId,
          selectedPropertyId
        );
        console.log("Cost Variance Analysis Report data:", data);
        setReportData(data);
      } else if (selectedReport === "predictive_analytics") {
        console.log("Calling getPredictiveAnalyticsReportAction from client...");
        const data = await getPredictiveAnalyticsReportAction(
          dateRange.from,
          dateRange.to,
          30, // 30 days forecast
          selectedOutletId,
          selectedPropertyId
        );
        console.log("Predictive Analytics & Forecasting Report data:", data);
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
      const propertyHeader = getPropertyHeaderData();
      
      // Simple Excel header
      ws_data.push([`${propertyHeader.propertyName} - Detailed Food Cost Report`]);
      ws_data.push([
        `Date Range: ${formatDateFn(
          foodReportData.overallSummaryReport.dateRange.from,
          "MMM dd, yyyy"
        )} - ${formatDateFn(
          foodReportData.overallSummaryReport.dateRange.to,
          "MMM dd, yyyy"
        )}`,
      ]);
      ws_data.push([`Generated: ${propertyHeader.generatedAt}`]);
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
      const propertyHeader = getPropertyHeaderData();
      
      // Simple Excel header
      ws_data.push([`${propertyHeader.propertyName} - Detailed Beverage Cost Report`]);
      ws_data.push([
        `Date Range: ${formatDateFn(
          beverageReportData.overallSummaryReport.dateRange.from,
          "MMM dd, yyyy"
        )} - ${formatDateFn(
          beverageReportData.overallSummaryReport.dateRange.to,
          "MMM dd, yyyy"
        )}`,
      ]);
      ws_data.push([`Generated: ${propertyHeader.generatedAt}`]);
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
      const propertyHeader = getPropertyHeaderData();
      
      // Simple Excel header
      if (monthlyReports.length > 0) {
        const reportTitle = monthlyReports.length > 1 
          ? `${propertyHeader.propertyName} - Monthly Profit/Loss Reports (${monthlyReports.length} months)`
          : `${propertyHeader.propertyName} - Monthly Profit/Loss Report for ${monthlyReports[0].monthYear}`;
        const dateRangeText = monthlyReports.length > 1
          ? `Multiple Periods: ${monthlyReports[0].monthYear} through ${monthlyReports[monthlyReports.length - 1].monthYear}`
          : `Period: ${monthlyReports[0].monthYear}`;
        
        ws_data.push([reportTitle]);
        ws_data.push([dateRangeText]);
        ws_data.push([`Generated: ${propertyHeader.generatedAt}`]);
        ws_data.push([]); // Empty row for spacing
      }
      
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
      const selectedOutlet = allOutlets.find((o) => o.id.toString() === selectedOutletId.toString());
      const isOutletSpecific =
        selectedOutletId && selectedOutletId !== "all" && selectedOutlet;

      const propertyHeader = getPropertyHeaderData();
      
      // Simple Excel header
      const reportTitle = isOutletSpecific 
        ? `${propertyHeader.propertyName} - Cost Analysis by Category Report - ${selectedOutlet.name}`
        : `${propertyHeader.propertyName} - Cost Analysis by Category Report`;
      const dateRangeText = `Date Range: ${formatDateFn(
        categoryReport.dateRange.from,
        "MMM dd, yyyy"
      )} - ${formatDateFn(categoryReport.dateRange.to, "MMM dd, yyyy")}`;
      
      ws_data.push([reportTitle]);
      ws_data.push([dateRangeText]);
      ws_data.push([`Generated: ${propertyHeader.generatedAt}`]);
      ws_data.push([]); // Empty row for spacing

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
    } else if (selectedReport === "property_performance_comparison" && reportData) {
      // Property Performance Comparison Excel Export
      const propertyReport = reportData as any;
      const propertyHeader = getPropertyHeaderData();
      
      ws_data.push([`${propertyHeader.propertyName} - Property Performance Comparison Report`]);
      ws_data.push([`Date Range: ${formatDateFn(dateRange.from, "MMM dd, yyyy")} - ${formatDateFn(dateRange.to, "MMM dd, yyyy")}`]);
      ws_data.push([`Generated: ${propertyHeader.generatedAt}`]);
      ws_data.push([]);
      
      if (propertyReport.properties && propertyReport.properties.length > 0) {
        ws_data.push(["Property Performance Summary"]);
        ws_data.push(["Property", "Total Revenue", "Total Costs", "Net Profit", "Profit Margin"]);
        propertyReport.properties.forEach((property: any) => {
          ws_data.push([
            property.name || "Unknown Property",
            formatNumber(property.totalRevenue || 0),
            formatNumber(property.totalCosts || 0),
            formatNumber((property.totalRevenue || 0) - (property.totalCosts || 0)),
            formatNumber(property.profitMargin || 0)
          ]);
        });
      }
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      XLSX.utils.book_append_sheet(wb, ws, "Property Performance");
      XLSX.writeFile(wb, `Property_Performance_Comparison_${formatDateFn(dateRange.from, "yyyyMMdd")}_to_${formatDateFn(dateRange.to, "yyyyMMdd")}.xlsx`);
      
      showToast.success("Report successfully exported to Excel.");
    } else if (selectedReport === "outlet_efficiency_profitability" && reportData) {
      // Outlet Efficiency & Profitability Excel Export
      const outletReport = reportData as any;
      const propertyHeader = getPropertyHeaderData();
      
      ws_data.push([`${propertyHeader.propertyName} - Outlet Efficiency & Profitability Report`]);
      ws_data.push([`Date Range: ${formatDateFn(dateRange.from, "MMM dd, yyyy")} - ${formatDateFn(dateRange.to, "MMM dd, yyyy")}`]);
      ws_data.push([`Generated: ${propertyHeader.generatedAt}`]);
      ws_data.push([]);
      
      if (outletReport.outlets && outletReport.outlets.length > 0) {
        ws_data.push(["Outlet Efficiency Summary"]);
        ws_data.push(["Outlet", "Revenue per Sq Ft", "Cost Efficiency", "Profit Margin", "Performance Score"]);
        outletReport.outlets.forEach((outlet: any) => {
          ws_data.push([
            outlet.name || "Unknown Outlet",
            formatNumber(outlet.revenuePerSqFt || 0),
            formatNumber(outlet.costEfficiency || 0),
            formatNumber(outlet.profitMargin || 0),
            formatNumber(outlet.performanceScore || 0)
          ]);
        });
      }
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      XLSX.utils.book_append_sheet(wb, ws, "Outlet Efficiency");
      XLSX.writeFile(wb, `Outlet_Efficiency_Profitability_${formatDateFn(dateRange.from, "yyyyMMdd")}_to_${formatDateFn(dateRange.to, "yyyyMMdd")}.xlsx`);
      
      showToast.success("Report successfully exported to Excel.");
    } else if (selectedReport === "category_performance_trends" && reportData) {
      // Category Performance Trends Excel Export
      const categoryTrendsReport = reportData as any;
      const propertyHeader = getPropertyHeaderData();
      
      ws_data.push([`${propertyHeader.propertyName} - Category Performance Trends Report`]);
      ws_data.push([`Date Range: ${formatDateFn(dateRange.from, "MMM dd, yyyy")} - ${formatDateFn(dateRange.to, "MMM dd, yyyy")}`]);
      ws_data.push([`Generated: ${propertyHeader.generatedAt}`]);
      ws_data.push([]);
      
      if (categoryTrendsReport.categoryTrends && categoryTrendsReport.categoryTrends.length > 0) {
        ws_data.push(["Category Performance Trends"]);
        ws_data.push(["Category", "Current Performance", "Trend Direction", "Growth Rate", "Performance Score"]);
        categoryTrendsReport.categoryTrends.forEach((trend: any) => {
          ws_data.push([
            trend.categoryName || "Unknown Category",
            formatNumber(trend.currentPerformance || 0),
            trend.trendDirection || "Stable",
            formatNumber(trend.growthRate || 0),
            formatNumber(trend.performanceScore || 0)
          ]);
        });
      }
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      XLSX.utils.book_append_sheet(wb, ws, "Category Trends");
      XLSX.writeFile(wb, `Category_Performance_Trends_${formatDateFn(dateRange.from, "yyyyMMdd")}_to_${formatDateFn(dateRange.to, "yyyyMMdd")}.xlsx`);
      
      showToast.success("Report successfully exported to Excel.");
    } else if (selectedReport === "user_activity_audit" && reportData) {
      // User Activity & Audit Excel Export
      const auditReport = reportData as any;
      const propertyHeader = getPropertyHeaderData();
      
      ws_data.push([`${propertyHeader.propertyName} - User Activity & Audit Report`]);
      ws_data.push([`Date Range: ${formatDateFn(dateRange.from, "MMM dd, yyyy")} - ${formatDateFn(dateRange.to, "MMM dd, yyyy")}`]);
      ws_data.push([`Generated: ${propertyHeader.generatedAt}`]);
      ws_data.push([]);
      
      if (auditReport.activities && auditReport.activities.length > 0) {
        ws_data.push(["User Activity Log"]);
        ws_data.push(["User", "Action", "Module", "Timestamp", "IP Address"]);
        auditReport.activities.forEach((activity: any) => {
          ws_data.push([
            activity.userName || "Unknown User",
            activity.action || "Unknown Action",
            activity.module || "Unknown Module",
            activity.timestamp ? new Date(activity.timestamp).toLocaleString() : "N/A",
            activity.ipAddress || "N/A"
          ]);
        });
      }
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      XLSX.utils.book_append_sheet(wb, ws, "Activity Audit");
      XLSX.writeFile(wb, `User_Activity_Audit_${formatDateFn(dateRange.from, "yyyyMMdd")}_to_${formatDateFn(dateRange.to, "yyyyMMdd")}.xlsx`);
      
      showToast.success("Report successfully exported to Excel.");
    } else if (selectedReport === "cost_variance_analysis" && reportData) {
      // Cost Variance Analysis Excel Export
      const varianceReport = reportData as any;
      const propertyHeader = getPropertyHeaderData();
      
      ws_data.push([`${propertyHeader.propertyName} - Cost Variance Analysis Report`]);
      ws_data.push([`Date Range: ${formatDateFn(dateRange.from, "MMM dd, yyyy")} - ${formatDateFn(dateRange.to, "MMM dd, yyyy")}`]);
      ws_data.push([`Generated: ${propertyHeader.generatedAt}`]);
      ws_data.push([]);
      
      if (varianceReport.variances && varianceReport.variances.length > 0) {
        ws_data.push(["Cost Variance Analysis"]);
        ws_data.push(["Category", "Budgeted Cost", "Actual Cost", "Variance", "Variance %"]);
        varianceReport.variances.forEach((variance: any) => {
          ws_data.push([
            variance.category || "Unknown Category",
            formatNumber(variance.budgetedCost || 0),
            formatNumber(variance.actualCost || 0),
            formatNumber(variance.variance || 0),
            formatNumber(variance.variancePercentage || 0)
          ]);
        });
      }
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      XLSX.utils.book_append_sheet(wb, ws, "Cost Variance");
      XLSX.writeFile(wb, `Cost_Variance_Analysis_${formatDateFn(dateRange.from, "yyyyMMdd")}_to_${formatDateFn(dateRange.to, "yyyyMMdd")}.xlsx`);
      
      showToast.success("Report successfully exported to Excel.");
    } else if (selectedReport === "predictive_analytics" && reportData) {
      // Predictive Analytics Excel Export
      const predictiveReport = reportData as any;
      const propertyHeader = getPropertyHeaderData();
      
      ws_data.push([`${propertyHeader.propertyName} - Predictive Analytics & Forecasting Report`]);
      ws_data.push([`Date Range: ${formatDateFn(dateRange.from, "MMM dd, yyyy")} - ${formatDateFn(dateRange.to, "MMM dd, yyyy")}`]);
      ws_data.push([`Generated: ${propertyHeader.generatedAt}`]);
      ws_data.push([]);
      
      if (predictiveReport.predictions && predictiveReport.predictions.length > 0) {
        ws_data.push(["Predictive Analytics Summary"]);
        ws_data.push(["Metric", "Current Value", "Predicted Value", "Confidence", "Trend"]);
        predictiveReport.predictions.forEach((prediction: any) => {
          ws_data.push([
            prediction.metric || "Unknown Metric",
            formatNumber(prediction.currentValue || 0),
            formatNumber(prediction.predictedValue || 0),
            formatNumber(prediction.confidence || 0),
            prediction.trend || "Stable"
          ]);
        });
      }
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      XLSX.utils.book_append_sheet(wb, ws, "Predictive Analytics");
      XLSX.writeFile(wb, `Predictive_Analytics_Forecasting_${formatDateFn(dateRange.from, "yyyyMMdd")}_to_${formatDateFn(dateRange.to, "yyyyMMdd")}.xlsx`);
      
      showToast.success("Report successfully exported to Excel.");
    }
  };

  const handleExportToPDF = async () => {
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

      // Create professional header
      const reportTitle = "Detailed Food Cost Report (All Outlets)";
      const dateRangeText = `Date Range: ${formatDateFn(
        dateRange.from,
        "MMM dd, yyyy"
      )} - ${formatDateFn(dateRange.to, "MMM dd, yyyy")}`;
      
      yPos = await createProfessionalPDFHeader(doc, reportTitle, dateRangeText);

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

      // Add footer to all pages before saving
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addPDFFooter(doc, user);
      }

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

      // Create professional header
      const reportTitle = "Detailed Beverage Cost Report (All Outlets)";
      const dateRangeText = `Date Range: ${formatDateFn(
        dateRange.from,
        "MMM dd, yyyy"
      )} - ${formatDateFn(dateRange.to, "MMM dd, yyyy")}`;
      
      yPos = await createProfessionalPDFHeader(doc, reportTitle, dateRangeText);

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

      // Add footer to all pages before saving
      const totalPagesBev = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPagesBev; i++) {
        doc.setPage(i);
        addPDFFooter(doc, user);
      }

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
      
      // Create professional header
      const reportTitle = "Monthly Profit/Loss Report";
      const dateRangeText = `Report Period: ${monthlyReportData.monthYear}`;
      
      yPos = await createProfessionalPDFHeader(doc, reportTitle, dateRangeText);
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
      
      // Add footer to all pages before saving
      const totalPagesMonthly = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPagesMonthly; i++) {
        doc.setPage(i);
        addPDFFooter(doc, user);
      }
      
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
      const selectedOutlet = allOutlets.find((o) => o.id.toString() === selectedOutletId.toString());
      const isOutletSpecific =
        selectedOutletId && selectedOutletId !== "all" && selectedOutlet;

      // Create professional header
      const reportTitle = "Cost Analysis by Category Report";
      const outletText = isOutletSpecific ? `Outlet: ${selectedOutlet.name}` : "";
      const dateRangeText = `Date Range: ${formatDateFn(
        dateRange.from,
        "MMM dd, yyyy"
      )} - ${formatDateFn(dateRange.to, "MMM dd, yyyy")}${outletText ? `\n${outletText}` : ""}`;
      
      yPos = await createProfessionalPDFHeader(doc, reportTitle, dateRangeText);

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
      // Check if we need a new page (reserve 40px for section header + minimum content)
      if (yPos + 40 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
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
        margin: { bottom: 30 }, // Reserve space for footer
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });
      yPos += 15;

      // Beverage Categories
      // Check if we need a new page (reserve 40px for section header + minimum content)
      if (yPos + 40 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
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
        margin: { bottom: 30 }, // Reserve space for footer
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });

      // Key Insights Section
      yPos += 10;
      // Check if we need a new page (reserve 60px for section header + minimum content)
      if (yPos + 60 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
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
        margin: { bottom: 30 }, // Reserve space for footer
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
        margin: { bottom: 30 }, // Reserve space for footer
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });

      if (categoryReport.topFoodCategories[0]) {
        yPos += 5;
        // Check if we need a new page for insight text (reserve 20px)
        if (yPos + 20 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(9);
        const foodInsightText = `Insight: ${categoryReport.topFoodCategories[0].categoryName} is your highest food cost category, representing ${formatNumber(categoryReport.topFoodCategories[0].percentageOfTotalFoodCost)}% of total food costs.`;
        const splitText = doc.splitTextToSize(foodInsightText, 180);
        doc.text(splitText, 14, yPos);
        yPos += splitText.length * 4;
      }

      // Beverage Key Insights
      yPos += 10;
      // Check if we need a new page (reserve 50px for subsection header + minimum content)
      if (yPos + 50 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
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
        margin: { bottom: 30 }, // Reserve space for footer
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
        margin: { bottom: 30 }, // Reserve space for footer
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });

      if (categoryReport.topBeverageCategories[0]) {
        yPos += 5;
        // Check if we need a new page for insight text (reserve 20px)
        if (yPos + 20 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(9);
        const beverageInsightText = `Insight: ${categoryReport.topBeverageCategories[0].categoryName} is your highest beverage cost category, representing ${formatNumber(categoryReport.topBeverageCategories[0].percentageOfTotalBeverageCost)}% of total beverage costs.`;
        const splitText = doc.splitTextToSize(beverageInsightText, 180);
        doc.text(splitText, 14, yPos);
        yPos += splitText.length * 4;
      }

      // Overall Summary
      yPos += 10;
      // Check if we need a new page (reserve 40px for section header + minimum content)
      if (yPos + 40 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
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
        margin: { bottom: 30 }, // Reserve space for footer
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });

      // Add footer to all pages before saving
      const totalPagesCostAnalysis = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPagesCostAnalysis; i++) {
        doc.setPage(i);
        addPDFFooter(doc, user);
      }

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
      
      // Create professional header
      const reportTitle = "Budget vs. Actuals Report";
      const dateRangeText = `Date Range: ${formatDateFn(
        dateRange.from,
        "MMM dd, yyyy"
      )} - ${formatDateFn(dateRange.to, "MMM dd, yyyy")}`;
      
      yPos = await createProfessionalPDFHeader(doc, reportTitle, dateRangeText);

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

      // Add footer to all pages before saving
      const totalPagesBudget = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPagesBudget; i++) {
        doc.setPage(i);
        addPDFFooter(doc, user);
      }

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
      
      // Create professional header
      const reportTitle = "Daily Revenue Trends Report";
      const dateRangeText = `Date Range: ${formatDateFn(
        dateRange.from,
        "MMM dd, yyyy"
      )} - ${formatDateFn(dateRange.to, "MMM dd, yyyy")}`;
      
      yPos = await createProfessionalPDFHeader(doc, reportTitle, dateRangeText);

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

      // Add footer to all pages before saving
      const totalPagesDaily = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPagesDaily; i++) {
        doc.setPage(i);
        addPDFFooter(doc, user);
      }

      doc.save(
        `Daily_Revenue_Trends_Report_${formatDateFn(
          dateRange.from,
          "yyyyMMdd"
        )}_to_${formatDateFn(dateRange.to, "yyyyMMdd")}.pdf`
      );
    } else if (selectedReport === "year_over_year" && reportData) {
      // Year-over-Year Report PDF Export
      const yearOverYearReport = reportData as any;

      // Create professional header
      const reportTitle = "Year-over-Year Performance Report";
      const dateRangeText = `${yearOverYearReport.currentYearData.year} vs ${yearOverYearReport.previousYearData.year} Comparison`;
      
      yPos = await createProfessionalPDFHeader(doc, reportTitle, dateRangeText);

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

      // Add footer to all pages before saving
      const totalPagesYearOverYear = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPagesYearOverYear; i++) {
        doc.setPage(i);
        addPDFFooter(doc, user);
      }

      doc.save(
        `Year_Over_Year_Report_${yearOverYearReport.currentYearData.year}_vs_${yearOverYearReport.previousYearData.year}.pdf`
      );
    } else if (selectedReport === "real_time_kpi" && reportData) {
      // Real-Time KPI Dashboard PDF Export
      const kpiReport = reportData as any;

      // Create professional header
      const reportTitle = "Real-Time KPI Dashboard";
      const dateRangeText = `${kpiReport.outletName} • Last updated: ${kpiReport.lastUpdated.toLocaleString()}`;
      
      yPos = await createProfessionalPDFHeader(doc, reportTitle, dateRangeText);

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

      // Add footer to all pages before saving
      const totalPagesKPI = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPagesKPI; i++) {
        doc.setPage(i);
        addPDFFooter(doc, user);
      }

      doc.save(
        `Real_Time_KPI_Dashboard_${formatDateFn(new Date(), "yyyyMMdd_HHmmss")}.pdf`
      );
    } else if (selectedReport === "forecasting_report" && reportData) {
      // Forecasting Report PDF Export
      const forecastReport = reportData as any;

      // Create custom header for forecasting report with proper positioning
      const propertyHeader = getPropertyHeaderData();
      let yPos = 20;
      const pageWidth = doc.internal.pageSize.width;
      const leftMargin = 14;
      const rightMargin = 14;
      const contentWidth = pageWidth - leftMargin - rightMargin;
      
      // 1. Report title (centered)
      const reportTitle = "Revenue & Cost Forecasting Report";
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      const titleWidth = doc.getTextWidth(reportTitle);
      const titleX = leftMargin + (contentWidth - titleWidth) / 2;
      doc.text(reportTitle, titleX, yPos);
      yPos += 10;
      
      // 2. Historical period (centered)
      const historicalText = `${forecastReport.outletName} • Historical: ${forecastReport.dateRange.from.toLocaleDateString()} - ${forecastReport.dateRange.to.toLocaleDateString()}`;
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      const historicalWidth = doc.getTextWidth(historicalText);
      const historicalX = leftMargin + (contentWidth - historicalWidth) / 2;
      doc.text(historicalText, historicalX, yPos);
      yPos += 6;
      
      // 3. Forecast period (centered)
      const forecastText = `Forecast Period: ${forecastReport.forecastPeriod.from.toLocaleDateString()} - ${forecastReport.forecastPeriod.to.toLocaleDateString()}`;
      const forecastWidth = doc.getTextWidth(forecastText);
      const forecastX = leftMargin + (contentWidth - forecastWidth) / 2;
      doc.text(forecastText, forecastX, yPos);
      yPos += 15;
      
      // Store the starting Y position for property details
      const propertyDetailsStartY = yPos;
      
      // 4. Property details on left, logo on right
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      
      // Property Name (left side)
      doc.text(propertyHeader.propertyName, leftMargin, yPos);
      yPos += 6;
      
      // Property Code (left side)
      if (propertyHeader.propertyCode) {
        doc.setFont("helvetica", "normal");
        doc.text(`Property Code: ${propertyHeader.propertyCode}`, leftMargin, yPos);
        yPos += 6;
      }
      
      // Full Address (left side)
      const fullAddress = [
        propertyHeader.address,
        propertyHeader.city,
        propertyHeader.state,
        propertyHeader.country
      ].filter(Boolean).join(", ");
      
      if (fullAddress) {
        doc.setFont("helvetica", "normal");
        doc.text(fullAddress, leftMargin, yPos);
        yPos += 6;
      }
      
      // Add logo on the right side (aligned with property details)
      if (propertyHeader.logoUrl) {
        const logoX = pageWidth - rightMargin - 40; // 40px width for logo
        const logoY = propertyDetailsStartY - 15; // Move logo up for better positioning
        
        try {
          await addLogoToPDF(doc, propertyHeader.logoUrl, logoX, logoY, 40, 30);
        } catch (error) {
          console.warn("Could not add logo to PDF:", error);
        }
      }
      
      yPos += 15; // Extra space before content

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

      // Add footer to all pages before saving
      const totalPagesForecasting = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPagesForecasting; i++) {
        doc.setPage(i);
        addPDFFooter(doc, user);
      }

      doc.save(
        `Forecasting_Report_${formatDateFn(forecastReport.dateRange.from, "yyyyMMdd")}_to_${formatDateFn(forecastReport.dateRange.to, "yyyyMMdd")}.pdf`
      );
    } else if (selectedReport === "property_performance_comparison" && reportData) {
      // Property Performance Comparison Report PDF Export
      const propertyReport = reportData as any;

      // Create professional header
      const reportTitle = "Property Performance Comparison Report";
      const dateRangeText = `Date Range: ${formatDateFn(
        dateRange.from,
        "MMM dd, yyyy"
      )} - ${formatDateFn(dateRange.to, "MMM dd, yyyy")}`;
      
      yPos = await createProfessionalPDFHeader(doc, reportTitle, dateRangeText);

      // Overall Summary
      if (propertyReport.overallSummary) {
        doc.setFontSize(14);
        doc.text("Overall Summary", 14, yPos);
        yPos += 10;

        const summaryHeaders = [["Metric", "Value"]];
        const summaryData = [
          ["Total Properties", (propertyReport.overallSummary.totalProperties || 0).toString()],
          ["Total Revenue", renderCurrency(propertyReport.overallSummary.totalRevenue || 0)],
          ["Average Profit Margin", renderPercentage(propertyReport.overallSummary.avgProfitMargin || 0)],
          ["Best Performing Property", propertyReport.overallSummary.bestPerformingProperty || "N/A"],
          ["Total Outlets", (propertyReport.overallSummary.totalOutlets || 0).toString()]
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
          margin: { bottom: 30 },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos;
          },
        });
        yPos += 15;
      }

      // Property Data Details
      if (propertyReport.propertyData && propertyReport.propertyData.length > 0) {
        // Check if we need a new page
        if (yPos + 40 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.text("Property Performance Details", 14, yPos);
        yPos += 10;

        const propertyHeaders = [["Property", "Revenue", "Cost", "Profit Margin", "Efficiency", "Outlets"]];
        const propertyData = propertyReport.propertyData.map((property: any) => [
          property.propertyName || "Unknown Property",
          renderCurrency(property.totalRevenue || 0),
          renderCurrency(property.totalCost || 0),
          renderPercentage(property.profitMargin || 0),
          renderPercentage(property.efficiency || 0),
          (property.outletCount || 0).toString()
        ]);

        autoTable(doc, {
          startY: yPos,
          head: propertyHeaders,
          body: propertyData,
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
            5: { halign: "right" },
          },
          margin: { bottom: 30 },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos;
          },
        });
        yPos += 15;
      }

      // Revenue Ranking (Tab 2)
      if (propertyReport.rankings?.byRevenue && propertyReport.rankings.byRevenue.length > 0) {
        // Check if we need a new page
        if (yPos + 40 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.text("Revenue Ranking", 14, yPos);
        yPos += 10;

        const revenueHeaders = [["Rank", "Property", "Revenue", "Growth", "Market Share"]];
        const revenueData = propertyReport.rankings.byRevenue.map((property: any, index: number) => [
          (index + 1).toString(),
          property.propertyName || "Unknown Property",
          renderCurrency(property.totalRevenue || 0),
          renderPercentage(property.revenueGrowth || 0),
          renderPercentage(property.marketShare || 0)
        ]);

        autoTable(doc, {
          startY: yPos,
          head: revenueHeaders,
          body: revenueData,
          theme: "grid",
          headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: "bold",
          },
          styles: { fontSize: 9, cellPadding: 1.5 },
          columnStyles: {
            2: { halign: "right" },
            3: { halign: "right" },
            4: { halign: "right" },
          },
          margin: { bottom: 30 },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos;
          },
        });
        yPos += 15;
      }

      // Profit Ranking (Tab 3)
      if (propertyReport.rankings?.byProfitMargin && propertyReport.rankings.byProfitMargin.length > 0) {
        // Check if we need a new page
        if (yPos + 40 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.text("Profit Ranking", 14, yPos);
        yPos += 10;

        const profitHeaders = [["Rank", "Property", "Profit Margin", "Net Profit", "Profit Growth"]];
        const profitData = propertyReport.rankings.byProfitMargin.map((property: any, index: number) => [
          (index + 1).toString(),
          property.propertyName || "Unknown Property",
          renderPercentage(property.profitMargin || 0),
          renderCurrency(property.netProfit || 0),
          renderPercentage(property.profitGrowth || 0)
        ]);

        autoTable(doc, {
          startY: yPos,
          head: profitHeaders,
          body: profitData,
          theme: "grid",
          headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: "bold",
          },
          styles: { fontSize: 9, cellPadding: 1.5 },
          columnStyles: {
            2: { halign: "right" },
            3: { halign: "right" },
            4: { halign: "right" },
          },
          margin: { bottom: 30 },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos;
          },
        });
        yPos += 15;
      }

      // Efficiency Ranking (Tab 4)
      if (propertyReport.rankings?.byEfficiency && propertyReport.rankings.byEfficiency.length > 0) {
        // Check if we need a new page
        if (yPos + 40 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.text("Efficiency Ranking", 14, yPos);
        yPos += 10;

        const efficiencyHeaders = [["Rank", "Property", "Efficiency", "Cost Control", "Revenue per Outlet"]];
        const efficiencyData = propertyReport.rankings.byEfficiency.map((property: any, index: number) => [
          (index + 1).toString(),
          property.propertyName || "Unknown Property",
          renderPercentage(property.efficiency || 0),
          renderPercentage(property.costControl || 0),
          renderCurrency(property.revenuePerOutlet || 0)
        ]);

        autoTable(doc, {
          startY: yPos,
          head: efficiencyHeaders,
          body: efficiencyData,
          theme: "grid",
          headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: "bold",
          },
          styles: { fontSize: 9, cellPadding: 1.5 },
          columnStyles: {
            2: { halign: "right" },
            3: { halign: "right" },
            4: { halign: "right" },
          },
          margin: { bottom: 30 },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos;
          },
        });
        yPos += 15;
      }

      // Cost Control Ranking (Tab 5)
      if (propertyReport.rankings?.byCostControl && propertyReport.rankings.byCostControl.length > 0) {
        // Check if we need a new page
        if (yPos + 40 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.text("Cost Control Ranking", 14, yPos);
        yPos += 10;

        const costControlHeaders = [["Rank", "Property", "Cost Control %", "Food Cost %", "Beverage Cost %"]];
        const costControlData = propertyReport.rankings.byCostControl.map((property: any, index: number) => [
          (index + 1).toString(),
          property.propertyName || "Unknown Property",
          renderPercentage(property.costControl || 0),
          renderPercentage(property.avgFoodCostPct || 0),
          renderPercentage(property.avgBeverageCostPct || 0)
        ]);

        autoTable(doc, {
          startY: yPos,
          head: costControlHeaders,
          body: costControlData,
          theme: "grid",
          headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: "bold",
          },
          styles: { fontSize: 9, cellPadding: 1.5 },
          columnStyles: {
            2: { halign: "right" },
            3: { halign: "right" },
            4: { halign: "right" },
          },
          margin: { bottom: 30 },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos;
          },
        });
      }

      // Add footer to all pages before saving
      const totalPagesProperty = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPagesProperty; i++) {
        doc.setPage(i);
        addPDFFooter(doc, user);
      }

      doc.save(
        `Property_Performance_Comparison_${formatDateFn(
          dateRange.from,
          "yyyyMMdd"
        )}_to_${formatDateFn(dateRange.to, "yyyyMMdd")}.pdf`
      );
    } else if (selectedReport === "outlet_efficiency_profitability" && reportData) {
      // Outlet Efficiency & Profitability Report PDF Export
      const outletReport = reportData as any;

      // Create professional header
      const reportTitle = "Outlet Efficiency & Profitability Report";
      const dateRangeText = `Date Range: ${formatDateFn(
        dateRange.from,
        "MMM dd, yyyy"
      )} - ${formatDateFn(dateRange.to, "MMM dd, yyyy")}`;
      
      yPos = await createProfessionalPDFHeader(doc, reportTitle, dateRangeText);

      // Summary
      if (outletReport.summary) {
        doc.setFontSize(14);
        doc.text("Outlet Summary", 14, yPos);
        yPos += 10;

        const summaryHeaders = [["Metric", "Value"]];
        const summaryData = [
          ["Total Outlets", (outletReport.summary.totalOutlets || 0).toString()],
          ["Active Outlets", (outletReport.summary.activeOutlets || 0).toString()],
          ["Total Revenue", renderCurrency(outletReport.summary.totalRevenue || 0)],
          ["Average Profit Margin", renderPercentage(outletReport.summary.avgProfitMargin || 0)],
          ["Total Profit", renderCurrency(outletReport.summary.totalProfit || 0)],
          ["Top Performing Outlet", outletReport.summary.topPerformingOutlet || "N/A"]
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
          margin: { bottom: 30 },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos;
          },
        });
        yPos += 15;
      }

      // Outlet Efficiency Details
      if (outletReport.outletData && outletReport.outletData.length > 0) {
        // Check if we need a new page
        if (yPos + 40 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.text("Outlet Efficiency Details", 14, yPos);
        yPos += 10;

        const efficiencyHeaders = [["Outlet", "Revenue", "Cost", "Profit Margin", "Efficiency Ratio", "Rating"]];
        const efficiencyData = outletReport.outletData.map((outlet: any) => [
          outlet.outletName || "Unknown Outlet",
          renderCurrency(outlet.totalRevenue || 0),
          renderCurrency(outlet.totalCost || 0),
          renderPercentage(outlet.profitMargin || 0),
          formatNumber(outlet.revenueToCostRatio || 0),
          outlet.performanceRating || "N/A"
        ]);

        autoTable(doc, {
          startY: yPos,
          head: efficiencyHeaders,
          body: efficiencyData,
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
          margin: { bottom: 30 },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos;
          },
        });
        yPos += 15;
      }

      // Revenue Ranking (Tab 2)
      if (outletReport.rankings?.byRevenue && outletReport.rankings.byRevenue.length > 0) {
        // Check if we need a new page
        if (yPos + 40 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.text("Revenue Ranking", 14, yPos);
        yPos += 10;

        const revenueHeaders = [["Rank", "Outlet", "Revenue", "Daily Avg", "Growth %"]];
        const revenueData = outletReport.rankings.byRevenue.map((outlet: any, index: number) => [
          (index + 1).toString(),
          outlet.outletName || "Unknown Outlet",
          renderCurrency(outlet.totalRevenue || 0),
          renderCurrency(outlet.avgDailyRevenue || 0),
          renderPercentage(outlet.revenueGrowth || 0)
        ]);

        autoTable(doc, {
          startY: yPos,
          head: revenueHeaders,
          body: revenueData,
          theme: "grid",
          headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: "bold",
          },
          styles: { fontSize: 9, cellPadding: 1.5 },
          columnStyles: {
            2: { halign: "right" },
            3: { halign: "right" },
            4: { halign: "right" },
          },
          margin: { bottom: 30 },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos;
          },
        });
        yPos += 15;
      }

      // Profit Ranking (Tab 3) & Efficiency Ranking (Tab 4) & Insights (Tab 5)
      if (outletReport.rankings || outletReport.insights) {
        // Profit Ranking
        if (outletReport.rankings?.byProfit && outletReport.rankings.byProfit.length > 0) {
          if (yPos + 40 > doc.internal.pageSize.height - 20) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.setFontSize(14);
          doc.text("Profit Ranking", 14, yPos);
          yPos += 10;

          const profitHeaders = [["Rank", "Outlet", "Profit Margin", "Net Profit", "Growth %"]];
          const profitData = outletReport.rankings.byProfit.map((outlet: any, index: number) => [
            (index + 1).toString(),
            outlet.outletName || "Unknown Outlet",
            renderPercentage(outlet.profitMargin || 0),
            renderCurrency(outlet.totalProfit || 0),
            renderPercentage(outlet.profitGrowth || 0)
          ]);

          autoTable(doc, {
            startY: yPos,
            head: profitHeaders,
            body: profitData,
            theme: "grid",
            headStyles: {
              fillColor: [240, 240, 240],
              textColor: [0, 0, 0],
              fontStyle: "bold",
            },
            styles: { fontSize: 9, cellPadding: 1.5 },
            columnStyles: {
              2: { halign: "right" },
              3: { halign: "right" },
              4: { halign: "right" },
            },
            margin: { bottom: 30 },
            didDrawPage: function (data) {
              yPos = data.cursor?.y || yPos;
            },
          });
          yPos += 15;
        }

        // Efficiency Ranking
        if (outletReport.rankings?.byEfficiency && outletReport.rankings.byEfficiency.length > 0) {
          if (yPos + 40 > doc.internal.pageSize.height - 20) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.setFontSize(14);
          doc.text("Efficiency Ranking", 14, yPos);
          yPos += 10;

          const efficiencyHeaders = [["Rank", "Outlet", "Revenue-Cost Ratio", "Rating", "Trend"]];
          const efficiencyData = outletReport.rankings.byEfficiency.map((outlet: any, index: number) => [
            (index + 1).toString(),
            outlet.outletName || "Unknown Outlet",
            formatNumber(outlet.revenueToCostRatio || 0),
            outlet.performanceRating || "N/A",
            outlet.efficiencyTrend || "Stable"
          ]);

          autoTable(doc, {
            startY: yPos,
            head: efficiencyHeaders,
            body: efficiencyData,
            theme: "grid",
            headStyles: {
              fillColor: [240, 240, 240],
              textColor: [0, 0, 0],
              fontStyle: "bold",
            },
            styles: { fontSize: 9, cellPadding: 1.5 },
            columnStyles: {
              2: { halign: "right" },
            },
            margin: { bottom: 30 },
            didDrawPage: function (data) {
              yPos = data.cursor?.y || yPos;
            },
          });
          yPos += 15;
        }

        // Insights Tab
        if (outletReport.insights?.topPerformers || outletReport.insights?.recommendations) {
          if (yPos + 40 > doc.internal.pageSize.height - 20) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.setFontSize(14);
          doc.text("Performance Insights & Recommendations", 14, yPos);
          yPos += 10;

          if (outletReport.insights.topPerformers && outletReport.insights.topPerformers.length > 0) {
            doc.setFontSize(12);
            doc.text("Top Performers:", 14, yPos);
            yPos += 6;

            const insightsHeaders = [["Outlet", "Strength", "Score"]];
            const insightsData = outletReport.insights.topPerformers.slice(0, 5).map((performer: any) => [
              performer.outletName || "N/A",
              performer.strength || "High Performance",
              formatNumber(performer.score || 0)
            ]);

            autoTable(doc, {
              startY: yPos,
              head: insightsHeaders,
              body: insightsData,
              theme: "grid",
              styles: { fontSize: 9, cellPadding: 1.5 },
              columnStyles: { 2: { halign: "right" } },
              margin: { bottom: 30 },
              didDrawPage: function (data) {
                yPos = data.cursor?.y || yPos;
              },
            });
            yPos += 10;
          }

          if (outletReport.insights.recommendations && outletReport.insights.recommendations.length > 0) {
            doc.setFontSize(12);
            doc.text("Key Recommendations:", 14, yPos);
            yPos += 6;

            outletReport.insights.recommendations.slice(0, 5).forEach((recommendation: string, index: number) => {
              if (yPos + 10 > doc.internal.pageSize.height - 20) {
                doc.addPage();
                yPos = 20;
              }
              doc.setFontSize(10);
              const recText = `${index + 1}. ${recommendation}`;
              const splitText = doc.splitTextToSize(recText, 180);
              doc.text(splitText, 14, yPos);
              yPos += splitText.length * 5;
            });
          }
        }
      }

      // Add footer to all pages before saving
      const totalPagesOutlet = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPagesOutlet; i++) {
        doc.setPage(i);
        addPDFFooter(doc, user);
      }

      doc.save(
        `Outlet_Efficiency_Profitability_${formatDateFn(
          dateRange.from,
          "yyyyMMdd"
        )}_to_${formatDateFn(dateRange.to, "yyyyMMdd")}.pdf`
      );
    } else if (selectedReport === "category_performance_trends" && reportData) {
      // Category Performance Trends Report PDF Export - ALL TABS
      const categoryTrendsReport = reportData as CategoryPerformanceTrendsReport;

      // Create professional header
      const reportTitle = "Category Performance Trends Report";
      const dateRangeText = `Date Range: ${formatDateFn(
        dateRange.from,
        "MMM dd, yyyy"
      )} - ${formatDateFn(dateRange.to, "MMM dd, yyyy")}`;
      
      yPos = await createProfessionalPDFHeader(doc, reportTitle, dateRangeText);

      // Tab 1: Overview - Summary
      doc.setFontSize(16);
      doc.text("Overview Summary", 14, yPos);
      yPos += 10;

      const summaryHeaders = [["Metric", "Value"]];
      const summaryData = [
        ["Total Categories", categoryTrendsReport.summary.totalCategories.toString()],
        ["Food Categories", categoryTrendsReport.summary.foodCategories.toString()],
        ["Beverage Categories", categoryTrendsReport.summary.beverageCategories.toString()],
        ["Total Cost", renderCurrency(categoryTrendsReport.summary.totalCost)],
        ["Average Daily Cost", renderCurrency(categoryTrendsReport.summary.averageDailyCost)],
        ["Most Expensive Category", categoryTrendsReport.summary.mostExpensiveCategory.name],
        ["Fastest Growing Category", categoryTrendsReport.summary.fastestGrowingCategory.name]
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
        margin: { bottom: 30 },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });
      yPos += 15;

      // Food vs Beverage Analysis
      if (yPos + 40 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.text("Food vs Beverage Analysis", 14, yPos);
      yPos += 10;

      const fvbHeaders = [["Category", "Cost", "Percentage", "Growth"]];
      const fvbData = [
        ["Food Total", renderCurrency(categoryTrendsReport.foodVsBeverage.foodTotal), 
         renderPercentage(categoryTrendsReport.foodVsBeverage.foodPercentage), 
         renderPercentage(categoryTrendsReport.foodVsBeverage.foodGrowth)],
        ["Beverage Total", renderCurrency(categoryTrendsReport.foodVsBeverage.beverageTotal), 
         renderPercentage(categoryTrendsReport.foodVsBeverage.beveragePercentage), 
         renderPercentage(categoryTrendsReport.foodVsBeverage.beverageGrowth)]
      ];

      autoTable(doc, {
        startY: yPos,
        head: fvbHeaders,
        body: fvbData,
        theme: "grid",
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
        margin: { bottom: 30 },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });
      yPos += 15;

      // Period Comparison
      if (yPos + 40 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.text("Period Comparison", 14, yPos);
      yPos += 10;

      const periodHeaders = [["Period", "Total Cost", "Category Count", "Growth %"]];
      const periodData = [
        ["Previous Period", renderCurrency(categoryTrendsReport.periodComparison.previousPeriod.totalCost), 
         categoryTrendsReport.periodComparison.previousPeriod.categoryCount.toString(), "Base"],
        ["Current Period", renderCurrency(categoryTrendsReport.periodComparison.currentPeriod.totalCost), 
         categoryTrendsReport.periodComparison.currentPeriod.categoryCount.toString(), 
         renderPercentage(categoryTrendsReport.periodComparison.growth.totalCostGrowth)]
      ];

      autoTable(doc, {
        startY: yPos,
        head: periodHeaders,
        body: periodData,
        theme: "grid",
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
        margin: { bottom: 30 },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });
      yPos += 15;

      // Tab 2: Food Categories (Complete)
      if (yPos + 40 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.text("Food Category Performance", 14, yPos);
      yPos += 10;

      if (categoryTrendsReport.foodCategories && categoryTrendsReport.foodCategories.length > 0) {
        const foodHeaders = [["Category", "Total Cost", "Daily Avg", "% of Total", "Trend", "Growth %", "Volatility", "Rank"]];
        const foodData = categoryTrendsReport.foodCategories.map((category: any) => [
          category.categoryName || "Unknown Category",
          renderCurrency(category.totalCost || 0),
          renderCurrency(category.averageDailyCost || 0),
          renderPercentage(category.percentageOfTotalCost || 0),
          category.trendDirection || "Stable",
          renderPercentage(category.trendPercentage || 0),
          renderPercentage(category.volatility || 0),
          (category.rankByCost || 0).toString()
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
          styles: { fontSize: 8, cellPadding: 1.5 },
          columnStyles: {
            1: { halign: "right" },
            2: { halign: "right" },
            3: { halign: "right" },
            5: { halign: "right" },
            6: { halign: "right" },
            7: { halign: "center" },
          },
          margin: { bottom: 30 },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos;
          },
        });
        yPos += 15;
      }

      // Tab 3: Beverage Categories (Complete)
      if (yPos + 40 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.text("Beverage Category Performance", 14, yPos);
      yPos += 10;

      if (categoryTrendsReport.beverageCategories && categoryTrendsReport.beverageCategories.length > 0) {
        const beverageHeaders = [["Category", "Total Cost", "Daily Avg", "% of Total", "Trend", "Growth %", "Volatility", "Rank"]];
        const beverageData = categoryTrendsReport.beverageCategories.map((category: any) => [
          category.categoryName || "Unknown Category",
          renderCurrency(category.totalCost || 0),
          renderCurrency(category.averageDailyCost || 0),
          renderPercentage(category.percentageOfTotalCost || 0),
          category.trendDirection || "Stable",
          renderPercentage(category.trendPercentage || 0),
          renderPercentage(category.volatility || 0),
          (category.rankByCost || 0).toString()
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
          styles: { fontSize: 8, cellPadding: 1.5 },
          columnStyles: {
            1: { halign: "right" },
            2: { halign: "right" },
            3: { halign: "right" },
            5: { halign: "right" },
            6: { halign: "right" },
            7: { halign: "center" },
          },
          margin: { bottom: 30 },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos;
          },
        });
        yPos += 15;
      }

      // Tab 4: Trend Analysis (Complete)
      if (yPos + 40 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.text("Detailed Trend Analysis", 14, yPos);
      yPos += 10;

      const allCategories = [...(categoryTrendsReport.foodCategories || []), ...(categoryTrendsReport.beverageCategories || [])];
      if (allCategories.length > 0) {
        const trendHeaders = [["Category", "Type", "Highest Cost", "Lowest Cost", "Volatility", "Seasonal Pattern", "Growth Rank"]];
        const trendData = allCategories.slice(0, 15).map((category: any) => [
          category.categoryName || "Unknown Category",
          category.categoryType || "Unknown",
          renderCurrency(category.highestCostDay?.cost || 0),
          renderCurrency(category.lowestCostDay?.cost || 0),
          renderPercentage(category.volatility || 0),
          category.seasonalPattern?.patternType || "No Pattern",
          (category.rankByGrowth || 0).toString()
        ]);

        autoTable(doc, {
          startY: yPos,
          head: trendHeaders,
          body: trendData,
          theme: "grid",
          headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: "bold",
          },
          styles: { fontSize: 8, cellPadding: 1.5 },
          columnStyles: {
            2: { halign: "right" },
            3: { halign: "right" },
            4: { halign: "right" },
            6: { halign: "center" },
          },
          margin: { bottom: 30 },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos;
          },
        });
        yPos += 15;
      }

      // Tab 5: Outlet Breakdown
      if (yPos + 40 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.text("Outlet Breakdown Analysis", 14, yPos);
      yPos += 10;

      // Show outlet breakdown for top categories
      const topCategories = allCategories.filter(cat => cat.outletBreakdown && cat.outletBreakdown.length > 0).slice(0, 3);
      for (const category of topCategories) {
        if (yPos + 30 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.text(`${category.categoryName} - Outlet Distribution`, 14, yPos);
        yPos += 8;

        const outletHeaders = [["Outlet", "Total Cost", "% of Category", "Trend"]];
        const outletData = (category.outletBreakdown || []).map((outlet: any) => [
          outlet.outletName || "Unknown Outlet",
          renderCurrency(outlet.totalCost || 0),
          renderPercentage(outlet.percentage || 0),
          outlet.trend || "Stable"
        ]);

        autoTable(doc, {
          startY: yPos,
          head: outletHeaders,
          body: outletData,
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
          },
          margin: { bottom: 30 },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos;
          },
        });
        yPos += 15;
      }

      // Tab 6: Insights (Complete)
      if (yPos + 40 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.text("Key Insights & Recommendations", 14, yPos);
      yPos += 10;

      // Trending Up
      if (categoryTrendsReport.insights.trendingUp && categoryTrendsReport.insights.trendingUp.length > 0) {
        doc.setFontSize(12);
        doc.text("Categories Trending Up (Cost Increases):", 14, yPos);
        yPos += 6;
        
        categoryTrendsReport.insights.trendingUp.forEach((category: string, index: number) => {
          doc.setFontSize(10);
          doc.text(`• ${category}`, 20, yPos);
          yPos += 5;
        });
        yPos += 5;
      }

      // Trending Down
      if (categoryTrendsReport.insights.trendingDown && categoryTrendsReport.insights.trendingDown.length > 0) {
        if (yPos + 20 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.text("Categories Trending Down (Cost Decreases):", 14, yPos);
        yPos += 6;
        
        categoryTrendsReport.insights.trendingDown.forEach((category: string, index: number) => {
          doc.setFontSize(10);
          doc.text(`• ${category}`, 20, yPos);
          yPos += 5;
        });
        yPos += 5;
      }

      // Most Stable
      if (categoryTrendsReport.insights.mostStable && categoryTrendsReport.insights.mostStable.length > 0) {
        if (yPos + 20 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.text("Most Stable Categories:", 14, yPos);
        yPos += 6;
        
        categoryTrendsReport.insights.mostStable.forEach((category: string, index: number) => {
          doc.setFontSize(10);
          doc.text(`• ${category}`, 20, yPos);
          yPos += 5;
        });
        yPos += 5;
      }

      // Key Findings
      if (categoryTrendsReport.insights.keyFindings && categoryTrendsReport.insights.keyFindings.length > 0) {
        if (yPos + 20 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.text("Key Findings:", 14, yPos);
        yPos += 6;
        
        categoryTrendsReport.insights.keyFindings.forEach((finding: string, index: number) => {
          doc.setFontSize(10);
          const splitText = doc.splitTextToSize(`• ${finding}`, 180);
          doc.text(splitText, 20, yPos);
          yPos += splitText.length * 5;
        });
        yPos += 5;
      }

      // Recommendations
      if (categoryTrendsReport.insights.recommendations && categoryTrendsReport.insights.recommendations.length > 0) {
        if (yPos + 20 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.text("Recommendations:", 14, yPos);
        yPos += 6;
        
        categoryTrendsReport.insights.recommendations.forEach((recommendation: string, index: number) => {
          doc.setFontSize(10);
          const splitText = doc.splitTextToSize(`• ${recommendation}`, 180);
          doc.text(splitText, 20, yPos);
          yPos += splitText.length * 5;
        });
      }

      // Add footer to all pages before saving
      const totalPagesCategoryTrends = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPagesCategoryTrends; i++) {
        doc.setPage(i);
        addPDFFooter(doc, user);
      }

      doc.save(
        `Category_Performance_Trends_ALL_TABS_${formatDateFn(
          dateRange.from,
          "yyyyMMdd"
        )}_to_${formatDateFn(dateRange.to, "yyyyMMdd")}.pdf`
      );
    } else if (selectedReport === "user_activity_audit" && reportData) {
      // User Activity & Audit Report PDF Export
      const auditReport = reportData as any;

      // Create professional header
      const reportTitle = "User Activity & Audit Report";
      const dateRangeText = `Date Range: ${formatDateFn(
        dateRange.from,
        "MMM dd, yyyy"
      )} - ${formatDateFn(dateRange.to, "MMM dd, yyyy")}`;
      
      yPos = await createProfessionalPDFHeader(doc, reportTitle, dateRangeText);

      // Summary
      if (auditReport.summary) {
        doc.setFontSize(14);
        doc.text("Activity Summary", 14, yPos);
        yPos += 10;

        const summaryHeaders = [["Metric", "Value"]];
        const summaryData = [
          ["Total Users", (auditReport.summary.totalUsers || 0).toString()],
          ["Active Users", (auditReport.summary.activeUsers || 0).toString()],
          ["Total Actions", (auditReport.summary.totalActions || 0).toString()],
          ["Avg Actions per User", formatNumber(auditReport.summary.avgActionsPerUser || 0)],
          ["Most Active User", auditReport.summary.mostActiveUser || "N/A"],
          ["Top Action", auditReport.summary.topAction || "N/A"]
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
          margin: { bottom: 30 },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos;
          },
        });
        yPos += 15;
      }

      // User Activity Details
      if (auditReport.userData && auditReport.userData.length > 0) {
        // Check if we need a new page
        if (yPos + 40 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.text("User Activity Details", 14, yPos);
        yPos += 10;

        const userHeaders = [["User", "Role", "Total Actions", "Daily Avg", "Last Active", "Risk Score"]];
        const userData = auditReport.userData.slice(0, 20).map((user: any) => [
          user.userName || "Unknown User",
          user.userRole || "N/A",
          (user.totalActions || 0).toString(),
          formatNumber(user.dailyAverage || 0),
          user.lastActive ? new Date(user.lastActive).toLocaleDateString() : "N/A",
          formatNumber(user.riskScore || 0)
        ]);

        autoTable(doc, {
          startY: yPos,
          head: userHeaders,
          body: userData,
          theme: "grid",
          headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: "bold",
          },
          styles: { fontSize: 9, cellPadding: 1.5 },
          columnStyles: {
            2: { halign: "right" },
            3: { halign: "right" },
            5: { halign: "right" },
          },
          margin: { bottom: 30 },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos;
          },
        });
      }

      // Add footer to all pages before saving
      const totalPagesAudit = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPagesAudit; i++) {
        doc.setPage(i);
        addPDFFooter(doc, user);
      }

      doc.save(
        `User_Activity_Audit_${formatDateFn(
          dateRange.from,
          "yyyyMMdd"
        )}_to_${formatDateFn(dateRange.to, "yyyyMMdd")}.pdf`
      );
    } else if (selectedReport === "cost_variance_analysis" && reportData) {
      // Cost Variance Analysis Report PDF Export - ALL TABS
      const varianceReport = reportData as CostVarianceAnalysisReport;

      // Create professional header
      const reportTitle = "Cost Variance Analysis Report";
      const dateRangeText = `Date Range: ${formatDateFn(
        dateRange.from,
        "MMM dd, yyyy"
      )} - ${formatDateFn(dateRange.to, "MMM dd, yyyy")}`;
      
      yPos = await createProfessionalPDFHeader(doc, reportTitle, dateRangeText);

      // Executive Summary
      doc.setFontSize(16);
      doc.text("Executive Summary", 14, yPos);
      yPos += 10;

      const summaryHeaders = [["Metric", "Value"]];
      const summaryData = [
        ["Overall Variance", renderCurrency(varianceReport.summary.overallVariance)],
        ["Overall Variance %", renderPercentage(varianceReport.summary.overallVariancePercentage)],
        ["Budget Accuracy", renderPercentage(varianceReport.summary.budgetAccuracy)],
        ["Categories Over Budget", varianceReport.summary.categoriesOverBudget.toString()],
        ["Variance Trend", varianceReport.summary.varianceTrend],
        ["Average Daily Variance", renderCurrency(varianceReport.summary.averageDailyVariance)]
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
        margin: { bottom: 30 },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });
      yPos += 15;

      // Key Performance Indicators
      if (yPos + 40 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.text("Key Performance Indicators", 14, yPos);
      yPos += 10;

      const kpiHeaders = [["Category", "Performance", "Variance", "Status"]];
      const kpiData = [
        ["Worst Performing", varianceReport.summary.worstPerformingCategory.name, 
         renderCurrency(varianceReport.summary.worstPerformingCategory.variance), "Critical"],
        ["Best Performing", varianceReport.summary.bestPerformingCategory.name, 
         renderCurrency(varianceReport.summary.bestPerformingCategory.variance), "Excellent"],
        ["Most Volatile", varianceReport.summary.mostVolatileCategory.name, 
         `${varianceReport.summary.mostVolatileCategory.volatility.toFixed(1)}% volatility`, "Monitor"]
      ];

      autoTable(doc, {
        startY: yPos,
        head: kpiHeaders,
        body: kpiData,
        theme: "grid",
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 2: { halign: "right" } },
        margin: { bottom: 30 },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });
      yPos += 15;

      // Tab 1: Categories (Complete)
      if (yPos + 40 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.text("Category Variance Analysis", 14, yPos);
      yPos += 10;

      if (varianceReport.categoryVariances && varianceReport.categoryVariances.length > 0) {
        const categoryHeaders = [["Category", "Type", "Budgeted", "Actual", "Variance", "Variance %", "Utilization", "Trend", "Status"]];
        const categoryData = varianceReport.categoryVariances.map((category: any) => [
          category.categoryName || "Unknown Category",
          category.categoryType || "Unknown",
          renderCurrency(category.budgetedCost || 0),
          renderCurrency(category.actualCost || 0),
          renderCurrency(category.variance || 0),
          renderPercentage(category.variancePercentage || 0),
          `${(category.budgetUtilization || 0).toFixed(1)}%`,
          category.trendDirection || "Stable",
          category.variancePercentage > 10 ? "High Over" : 
          category.variancePercentage > 5 ? "Moderate Over" : 
          category.variancePercentage > -5 ? "Within Budget" : "Under Budget"
        ]);

        autoTable(doc, {
          startY: yPos,
          head: categoryHeaders,
          body: categoryData,
          theme: "grid",
          headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: "bold",
          },
          styles: { fontSize: 8, cellPadding: 1.5 },
          columnStyles: {
            2: { halign: "right" },
            3: { halign: "right" },
            4: { halign: "right" },
            5: { halign: "right" },
            6: { halign: "right" },
          },
          margin: { bottom: 30 },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos;
          },
        });
        yPos += 15;
      }

      // Tab 2: Outlets (Complete)
      if (yPos + 40 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.text("Outlet Performance Analysis", 14, yPos);
      yPos += 10;

      if (varianceReport.outletVariances && varianceReport.outletVariances.length > 0) {
        const outletHeaders = [["Outlet", "Total Budgeted", "Total Actual", "Total Variance", "Variance %", "Performance", "Risk Level"]];
        const outletData = varianceReport.outletVariances.map((outlet: any) => [
          outlet.outletName || "Unknown Outlet",
          renderCurrency(outlet.totalBudgeted || 0),
          renderCurrency(outlet.totalActual || 0),
          renderCurrency(outlet.totalVariance || 0),
          renderPercentage(outlet.totalVariancePercentage || 0),
          outlet.performanceRating || "Unknown",
          outlet.riskLevel || "Unknown"
        ]);

        autoTable(doc, {
          startY: yPos,
          head: outletHeaders,
          body: outletData,
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
          margin: { bottom: 30 },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos;
          },
        });
        yPos += 15;

        // Food vs Beverage Breakdown by Outlet
        if (yPos + 40 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.text("Food vs Beverage Variance by Outlet", 14, yPos);
        yPos += 10;

        const fbHeaders = [["Outlet", "Food Variance", "Food %", "Beverage Variance", "Beverage %"]];
        const fbData = varianceReport.outletVariances.map((outlet: any) => [
          outlet.outletName || "Unknown Outlet",
          renderCurrency(outlet.foodVariance?.variance || 0),
          renderPercentage(outlet.foodVariance?.variancePercentage || 0),
          renderCurrency(outlet.beverageVariance?.variance || 0),
          renderPercentage(outlet.beverageVariance?.variancePercentage || 0)
        ]);

        autoTable(doc, {
          startY: yPos,
          head: fbHeaders,
          body: fbData,
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
          margin: { bottom: 30 },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos;
          },
        });
        yPos += 15;
      }

      // Tab 3: Daily Variance Trends
      if (yPos + 40 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.text("Daily Variance Trends", 14, yPos);
      yPos += 10;

      if (varianceReport.timeSeriesAnalysis?.daily && varianceReport.timeSeriesAnalysis.daily.length > 0) {
        const trendsHeaders = [["Date", "Budgeted", "Actual", "Variance", "Variance %", "Accuracy"]];
        const trendsData = varianceReport.timeSeriesAnalysis.daily.slice(0, 15).map((day: any) => [
          formatDateFn(day.period, "MMM dd, yyyy"),
          renderCurrency(day.totalBudgeted || 0),
          renderCurrency(day.totalActual || 0),
          renderCurrency(day.totalVariance || 0),
          renderPercentage(day.totalVariancePercentage || 0),
          `${(day.budgetAccuracy || 0).toFixed(1)}%`
        ]);

        autoTable(doc, {
          startY: yPos,
          head: trendsHeaders,
          body: trendsData,
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
            5: { halign: "right" },
          },
          margin: { bottom: 30 },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos;
          },
        });
        yPos += 15;
      }

      // Tab 4: Variance Distribution
      if (yPos + 40 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.text("Variance Distribution Analysis", 14, yPos);
      yPos += 10;

      // Significant Over Budget
      if (varianceReport.varianceDistribution?.significantOverBudget && varianceReport.varianceDistribution.significantOverBudget.length > 0) {
        doc.setFontSize(12);
        doc.text("Significant Over Budget (>10%)", 14, yPos);
        yPos += 8;

        const sigOverHeaders = [["Category", "Variance %"]];
        const sigOverData = varianceReport.varianceDistribution.significantOverBudget.map((category: any) => [
          category.categoryName || "Unknown Category",
          renderPercentage(category.variancePercentage || 0)
        ]);

        autoTable(doc, {
          startY: yPos,
          head: sigOverHeaders,
          body: sigOverData,
          theme: "grid",
          headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: "bold",
          },
          styles: { fontSize: 9, cellPadding: 1.5 },
          columnStyles: { 1: { halign: "right" } },
          margin: { bottom: 30 },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos;
          },
        });
        yPos += 15;
      }

      // Within Budget
      if (varianceReport.varianceDistribution?.withinBudget && varianceReport.varianceDistribution.withinBudget.length > 0) {
        if (yPos + 30 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.text("Within Budget (±5%)", 14, yPos);
        yPos += 8;

        const withinHeaders = [["Category", "Variance %"]];
        const withinData = varianceReport.varianceDistribution.withinBudget.slice(0, 10).map((category: any) => [
          category.categoryName || "Unknown Category",
          renderPercentage(category.variancePercentage || 0)
        ]);

        autoTable(doc, {
          startY: yPos,
          head: withinHeaders,
          body: withinData,
          theme: "grid",
          headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: "bold",
          },
          styles: { fontSize: 9, cellPadding: 1.5 },
          columnStyles: { 1: { halign: "right" } },
          margin: { bottom: 30 },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos;
          },
        });
        yPos += 15;
      }

      // Tab 5: Insights & Risk Factors
      if (yPos + 40 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.text("Insights & Risk Analysis", 14, yPos);
      yPos += 10;

      // Risk Factors
      if (varianceReport.predictions?.riskFactors && varianceReport.predictions.riskFactors.length > 0) {
        doc.setFontSize(12);
        doc.text("Risk Factors:", 14, yPos);
        yPos += 6;
        
        varianceReport.predictions.riskFactors.forEach((risk: string, index: number) => {
          doc.setFontSize(10);
          const splitText = doc.splitTextToSize(`• ${risk}`, 180);
          doc.text(splitText, 20, yPos);
          yPos += splitText.length * 5;
        });
        yPos += 5;
      }

      // Opportunities
      if (varianceReport.predictions?.opportunities && varianceReport.predictions.opportunities.length > 0) {
        if (yPos + 20 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.text("Opportunities:", 14, yPos);
        yPos += 6;
        
        varianceReport.predictions.opportunities.forEach((opportunity: string, index: number) => {
          doc.setFontSize(10);
          const splitText = doc.splitTextToSize(`• ${opportunity}`, 180);
          doc.text(splitText, 20, yPos);
          yPos += splitText.length * 5;
        });
        yPos += 5;
      }

      // Category Performance Insights
      if (yPos + 30 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.text("Category Performance Insights:", 14, yPos);
      yPos += 8;

      const insightCategories = varianceReport.categoryVariances.slice(0, 6);
      for (const category of insightCategories) {
        if (yPos + 20 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(10);
        doc.text(`${category.categoryName}:`, 20, yPos);
        yPos += 5;
        doc.text(`  Variance: ${renderCurrency(category.variance)} (${renderPercentage(category.variancePercentage)})`, 25, yPos);
        yPos += 4;
        doc.text(`  Volatility: ${category.volatility?.toFixed(1) || 0}%`, 25, yPos);
        yPos += 4;
        doc.text(`  Consistency: ${category.consistencyScore?.toFixed(1) || 0}%`, 25, yPos);
        yPos += 4;
        doc.text(`  Trend: ${category.trendDirection}`, 25, yPos);
        yPos += 8;
      }

      // Tab 6: Predictions & Recommendations
      if (yPos + 40 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.text("Predictions & Recommendations", 14, yPos);
      yPos += 10;

      // Projected Month-End Variance
      doc.setFontSize(12);
      doc.text("Projected Month-End Variance:", 14, yPos);
      yPos += 6;
      doc.setFontSize(14);
      doc.text(renderCurrency(varianceReport.predictions?.projectedMonthEndVariance || 0), 20, yPos);
      yPos += 10;

      // Budget Performance Status
      doc.setFontSize(12);
      doc.text("Budget Performance Status:", 14, yPos);
      yPos += 6;
      doc.setFontSize(10);
      doc.text(`Current Accuracy: ${varianceReport.summary.budgetAccuracy.toFixed(1)}%`, 20, yPos);
      yPos += 5;
      doc.text(`Categories on track: ${varianceReport.categoryVariances.length - varianceReport.summary.categoriesOverBudget}`, 20, yPos);
      yPos += 5;
      doc.text(`Categories over budget: ${varianceReport.summary.categoriesOverBudget}`, 20, yPos);
      yPos += 10;

      // Recommendations
      if (varianceReport.predictions?.recommendations && varianceReport.predictions.recommendations.length > 0) {
        if (yPos + 20 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.text("Recommendations:", 14, yPos);
        yPos += 6;
        
        varianceReport.predictions.recommendations.forEach((recommendation: string, index: number) => {
          doc.setFontSize(10);
          const splitText = doc.splitTextToSize(`• ${recommendation}`, 180);
          doc.text(splitText, 20, yPos);
          yPos += splitText.length * 5;
        });
      }

      // Add footer to all pages before saving
      const totalPagesVariance = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPagesVariance; i++) {
        doc.setPage(i);
        addPDFFooter(doc, user);
      }

      doc.save(
        `Cost_Variance_Analysis_ALL_TABS_${formatDateFn(
          dateRange.from,
          "yyyyMMdd"
        )}_to_${formatDateFn(dateRange.to, "yyyyMMdd")}.pdf`
      );
    } else if (selectedReport === "predictive_analytics" && reportData) {
      // Predictive Analytics & Forecasting Report PDF Export - ALL TABS
      const predictiveReport = reportData as PredictiveAnalyticsReport;

      // Create professional header
      const reportTitle = "Predictive Analytics & Forecasting Report";
      const dateRangeText = `Historical: ${formatDateFn(
        dateRange.from,
        "MMM dd, yyyy"
      )} - ${formatDateFn(dateRange.to, "MMM dd, yyyy")} | Forecast: ${formatDateFn(
        predictiveReport.forecastPeriod?.from || dateRange.from,
        "MMM dd, yyyy"
      )} - ${formatDateFn(
        predictiveReport.forecastPeriod?.to || dateRange.to,
        "MMM dd, yyyy"
      )}`;
      
      yPos = await createProfessionalPDFHeader(doc, reportTitle, dateRangeText);

      // Executive Summary
      doc.setFontSize(16);
      doc.text("Executive Summary", 14, yPos);
      yPos += 10;

      const summaryHeaders = [["Metric", "Value"]];
      const summaryData = [
        ["Forecasted Revenue", renderCurrency(predictiveReport.summary.forecastedRevenue)],
        ["Forecasted Costs", renderCurrency(predictiveReport.summary.forecastedCosts)],
        ["Revenue Growth Prediction", renderPercentage(predictiveReport.summary.revenueGrowthPrediction)],
        ["Cost Growth Prediction", renderPercentage(predictiveReport.summary.costGrowthPrediction)],
        ["Predicted Margin", `${predictiveReport.summary.predictedMargin.toFixed(1)}%`],
        ["Margin Trend", predictiveReport.summary.marginTrend],
        ["Confidence Level", `${predictiveReport.summary.confidenceLevel.toFixed(1)}%`]
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
        margin: { bottom: 30 },
        didDrawPage: function (data) {
          yPos = data.cursor?.y || yPos;
        },
      });
      yPos += 15;

      // Key Insights & Alerts
      if (yPos + 40 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.text("Key Insights & Critical Alerts", 14, yPos);
      yPos += 10;

      // Key Insights
      if (predictiveReport.summary.keyInsights && predictiveReport.summary.keyInsights.length > 0) {
        doc.setFontSize(12);
        doc.text("Key Insights:", 14, yPos);
        yPos += 6;
        
        predictiveReport.summary.keyInsights.forEach((insight: string, index: number) => {
          doc.setFontSize(10);
          const splitText = doc.splitTextToSize(`• ${insight}`, 180);
          doc.text(splitText, 20, yPos);
          yPos += splitText.length * 5;
        });
        yPos += 5;
      }

      // Critical Alerts
      if (predictiveReport.summary.criticalAlerts && predictiveReport.summary.criticalAlerts.length > 0) {
        if (yPos + 20 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.text("Critical Alerts:", 14, yPos);
        yPos += 6;
        
        predictiveReport.summary.criticalAlerts.forEach((alert: string, index: number) => {
          doc.setFontSize(10);
          const splitText = doc.splitTextToSize(`⚠ ${alert}`, 180);
          doc.text(splitText, 20, yPos);
          yPos += splitText.length * 5;
        });
        yPos += 10;
      }

      // Tab 1: Categories (Complete)
      if (yPos + 40 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.text("Category Forecasting Analysis", 14, yPos);
      yPos += 10;

      if (predictiveReport.categoryForecasts && predictiveReport.categoryForecasts.length > 0) {
        const categoryHeaders = [["Category", "Type", "Historical Avg", "Forecast Avg", "Trend", "Seasonality", "Accuracy", "Volatility", "Confidence"]];
        const categoryData = predictiveReport.categoryForecasts.map((category: any) => {
          const forecastAvg = category.forecast && category.forecast.length > 0 ? 
            category.forecast.reduce((sum: number, f: any) => sum + (f.predicted || 0), 0) / category.forecast.length : 0;
          
          return [
            category.categoryName || "Unknown Category",
            category.categoryType || "Unknown",
            renderCurrency(category.historicalAverage || 0),
            renderCurrency(forecastAvg),
            category.historicalTrend || "Stable",
            category.seasonality?.pattern || "No Pattern",
            `${(category.accuracy || 0).toFixed(1)}%`,
            `${(category.volatility || 0).toFixed(1)}%`,
            `${(category.confidenceLevel || 0).toFixed(1)}%`
          ];
        });

        autoTable(doc, {
          startY: yPos,
          head: categoryHeaders,
          body: categoryData,
          theme: "grid",
          headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: "bold",
          },
          styles: { fontSize: 8, cellPadding: 1.5 },
          columnStyles: {
            2: { halign: "right" },
            3: { halign: "right" },
            6: { halign: "right" },
            7: { halign: "right" },
            8: { halign: "right" },
          },
          margin: { bottom: 30 },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos;
          },
        });
        yPos += 15;

        // Category Risk Factors and Opportunities
        if (yPos + 40 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.text("Category Risk Factors & Opportunities", 14, yPos);
        yPos += 10;

        const categoriesWithRisks = predictiveReport.categoryForecasts.filter(cat => cat.riskFactors && cat.riskFactors.length > 0).slice(0, 3);
        for (const category of categoriesWithRisks) {
          if (yPos + 25 > doc.internal.pageSize.height - 20) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.setFontSize(12);
          doc.text(`${category.categoryName} - Risk Factors:`, 14, yPos);
          yPos += 6;
          
          (category.riskFactors || []).forEach((risk: string, index: number) => {
            doc.setFontSize(10);
            doc.text(`• ${risk}`, 20, yPos);
            yPos += 5;
          });
          yPos += 8;
        }

        const categoriesWithOpportunities = predictiveReport.categoryForecasts.filter(cat => cat.opportunities && cat.opportunities.length > 0).slice(0, 3);
        for (const category of categoriesWithOpportunities) {
          if (yPos + 25 > doc.internal.pageSize.height - 20) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.setFontSize(12);
          doc.text(`${category.categoryName} - Opportunities:`, 14, yPos);
          yPos += 6;
          
          (category.opportunities || []).forEach((opportunity: string, index: number) => {
            doc.setFontSize(10);
            doc.text(`• ${opportunity}`, 20, yPos);
            yPos += 5;
          });
          yPos += 8;
        }
      }

      // Tab 2: Outlets (Complete)
      if (yPos + 40 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.text("Outlet Performance Forecasting", 14, yPos);
      yPos += 10;

      if (predictiveReport.outletForecasts && predictiveReport.outletForecasts.length > 0) {
        const outletHeaders = [["Outlet", "Forecasted Revenue", "Forecasted Costs", "Predicted Margin", "Expected Growth", "Risk Level"]];
        const outletData = predictiveReport.outletForecasts.map((outlet: any) => {
          const totalRevenue = outlet.revenueForecast?.total ? 
            outlet.revenueForecast.total.reduce((sum: number, f: any) => sum + (f.predicted || 0), 0) : 0;
          const totalCosts = outlet.costForecast?.total ? 
            outlet.costForecast.total.reduce((sum: number, f: any) => sum + (f.predicted || 0), 0) : 0;
          
          return [
            outlet.outletName || "Unknown Outlet",
            renderCurrency(totalRevenue),
            renderCurrency(totalCosts),
            `${(outlet.forecastedMargin || 0).toFixed(1)}%`,
            renderPercentage(outlet.expectedGrowth || 0),
            outlet.riskLevel || "Unknown"
          ];
        });

        autoTable(doc, {
          startY: yPos,
          head: outletHeaders,
          body: outletData,
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
          margin: { bottom: 30 },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos;
          },
        });
        yPos += 15;

        // Outlet Recommendations
        if (yPos + 30 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.text("Outlet-Specific Recommendations", 14, yPos);
        yPos += 10;

        for (const outlet of predictiveReport.outletForecasts.slice(0, 5)) {
          if (yPos + 20 > doc.internal.pageSize.height - 20) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.setFontSize(12);
          doc.text(`${outlet.outletName}:`, 14, yPos);
          yPos += 6;
          
          (outlet.recommendations || []).slice(0, 2).forEach((rec: string, index: number) => {
            doc.setFontSize(10);
            const splitText = doc.splitTextToSize(`• ${rec}`, 180);
            doc.text(splitText, 20, yPos);
            yPos += splitText.length * 5;
          });
          yPos += 5;
        }
      }

      // Tab 3: Market Trends (Complete)
      if (yPos + 40 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.text("Market Trend Analysis", 14, yPos);
      yPos += 10;

      if (predictiveReport.marketTrends && predictiveReport.marketTrends.length > 0) {
        for (const trend of predictiveReport.marketTrends) {
          if (yPos + 30 > doc.internal.pageSize.height - 20) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.setFontSize(12);
          doc.text(`${trend.trendName} (${trend.strength} Strength, ${trend.impact} Impact)`, 14, yPos);
          yPos += 6;
          
          doc.setFontSize(10);
          const splitDescription = doc.splitTextToSize(trend.description || "", 180);
          doc.text(splitDescription, 14, yPos);
          yPos += splitDescription.length * 5 + 3;
          
          doc.text("Recommended Actions:", 14, yPos);
          yPos += 5;
          
          (trend.recommendedActions || []).forEach((action: string, index: number) => {
            const splitText = doc.splitTextToSize(`• ${action}`, 180);
            doc.text(splitText, 20, yPos);
            yPos += splitText.length * 5;
          });
          yPos += 8;
        }
      }

      // Tab 4: Seasonality (Complete)
      if (yPos + 40 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.text("Seasonality Patterns", 14, yPos);
      yPos += 10;

      if (predictiveReport.seasonalityAnalysis && predictiveReport.seasonalityAnalysis.length > 0) {
        for (const pattern of predictiveReport.seasonalityAnalysis) {
          if (yPos + 30 > doc.internal.pageSize.height - 20) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.setFontSize(12);
          doc.text(`${pattern.type} Seasonality (${pattern.strength}% strength)`, 14, yPos);
          yPos += 6;
          
          doc.setFontSize(10);
          const splitDescription = doc.splitTextToSize(pattern.description || "", 180);
          doc.text(splitDescription, 14, yPos);
          yPos += splitDescription.length * 5 + 3;
          
          if (pattern.pattern && pattern.pattern.length > 0) {
            const seasonalHeaders = [["Period", "Multiplier", "Confidence", "Impact"]];
            const seasonalData = pattern.pattern.map((item: any) => [
              item.period || "Unknown",
              `${(item.multiplier || 1).toFixed(2)}x`,
              `${item.confidence || 0}%`,
              item.multiplier > 1.1 ? "High" : item.multiplier < 0.9 ? "Low" : "Normal"
            ]);

            autoTable(doc, {
              startY: yPos,
              head: seasonalHeaders,
              body: seasonalData,
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
              },
              margin: { bottom: 30 },
              didDrawPage: function (data) {
                yPos = data.cursor?.y || yPos;
              },
            });
            yPos += 10;
          }
        }
      }

      // Tab 5: Risk Analysis (Complete)
      if (yPos + 40 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.text("Risk Assessment & Scenario Analysis", 14, yPos);
      yPos += 10;

      // Overall Risk Score
      doc.setFontSize(12);
      doc.text("Overall Risk Score:", 14, yPos);
      yPos += 6;
      doc.setFontSize(14);
      doc.text(`${predictiveReport.riskAssessment?.overallRiskScore?.toFixed(1) || 0}/100`, 20, yPos);
      yPos += 8;

      // Risk Factors
      if (predictiveReport.riskAssessment?.riskFactors && predictiveReport.riskAssessment.riskFactors.length > 0) {
        doc.setFontSize(12);
        doc.text("Risk Factors:", 14, yPos);
        yPos += 6;
        
        predictiveReport.riskAssessment.riskFactors.forEach((risk: any, index: number) => {
          if (yPos + 15 > doc.internal.pageSize.height - 20) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.setFontSize(10);
          doc.text(`• ${risk.factor} (${risk.probability}% probability)`, 20, yPos);
          yPos += 5;
          const splitMitigation = doc.splitTextToSize(`  Mitigation: ${risk.mitigation}`, 170);
          doc.text(splitMitigation, 22, yPos);
          yPos += splitMitigation.length * 5 + 3;
        });
        yPos += 5;
      }

      // Scenario Analysis
      if (predictiveReport.riskAssessment?.scenarios && predictiveReport.riskAssessment.scenarios.length > 0) {
        if (yPos + 40 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.text("Scenario Analysis:", 14, yPos);
        yPos += 10;

        const scenarioHeaders = [["Scenario", "Probability", "Revenue Impact", "Cost Impact", "Description"]];
        const scenarioData = predictiveReport.riskAssessment.scenarios.map((scenario: any) => [
          scenario.name || "Unknown Scenario",
          `${scenario.probability || 0}%`,
          renderPercentage(scenario.revenueImpact || 0),
          renderPercentage(scenario.costImpact || 0),
          (scenario.description || "").substring(0, 50) + "..."
        ]);

        autoTable(doc, {
          startY: yPos,
          head: scenarioHeaders,
          body: scenarioData,
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
          },
          margin: { bottom: 30 },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos;
          },
        });
        yPos += 15;
      }

      // Tab 6: Strategic Insights (Complete)
      if (yPos + 40 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.text("Strategic Insights & Recommendations", 14, yPos);
      yPos += 10;

      // Short Term Recommendations
      if (predictiveReport.recommendations?.shortTerm && predictiveReport.recommendations.shortTerm.length > 0) {
        doc.setFontSize(12);
        doc.text("Short Term (30 days):", 14, yPos);
        yPos += 6;
        
        predictiveReport.recommendations.shortTerm.forEach((rec: string, index: number) => {
          doc.setFontSize(10);
          const splitText = doc.splitTextToSize(`• ${rec}`, 180);
          doc.text(splitText, 20, yPos);
          yPos += splitText.length * 5;
        });
        yPos += 5;
      }

      // Medium Term Recommendations
      if (predictiveReport.recommendations?.mediumTerm && predictiveReport.recommendations.mediumTerm.length > 0) {
        if (yPos + 20 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.text("Medium Term (3 months):", 14, yPos);
        yPos += 6;
        
        predictiveReport.recommendations.mediumTerm.forEach((rec: string, index: number) => {
          doc.setFontSize(10);
          const splitText = doc.splitTextToSize(`• ${rec}`, 180);
          doc.text(splitText, 20, yPos);
          yPos += splitText.length * 5;
        });
        yPos += 5;
      }

      // Long Term Recommendations
      if (predictiveReport.recommendations?.longTerm && predictiveReport.recommendations.longTerm.length > 0) {
        if (yPos + 20 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.text("Long Term (6-12 months):", 14, yPos);
        yPos += 6;
        
        predictiveReport.recommendations.longTerm.forEach((rec: string, index: number) => {
          doc.setFontSize(10);
          const splitText = doc.splitTextToSize(`• ${rec}`, 180);
          doc.text(splitText, 20, yPos);
          yPos += splitText.length * 5;
        });
        yPos += 5;
      }

      // Actionable Insights
      if (predictiveReport.actionableInsights && predictiveReport.actionableInsights.length > 0) {
        if (yPos + 30 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.text("Actionable Insights", 14, yPos);
        yPos += 10;

        for (const insight of predictiveReport.actionableInsights.slice(0, 5)) {
          if (yPos + 25 > doc.internal.pageSize.height - 20) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.setFontSize(12);
          doc.text(`${insight.priority} Priority - ${insight.category}:`, 14, yPos);
          yPos += 6;
          
          doc.setFontSize(10);
          const splitInsight = doc.splitTextToSize(insight.insight || "", 180);
          doc.text(splitInsight, 14, yPos);
          yPos += splitInsight.length * 5 + 3;
          
          doc.text(`Expected Impact: ${insight.expectedImpact}`, 14, yPos);
          yPos += 5;
          doc.text(`Timeframe: ${insight.timeframe}`, 14, yPos);
          yPos += 5;
          
          doc.text("Required Actions:", 14, yPos);
          yPos += 5;
          
          (insight.requiredActions || []).forEach((action: string, index: number) => {
            const splitText = doc.splitTextToSize(`• ${action}`, 180);
            doc.text(splitText, 20, yPos);
            yPos += splitText.length * 5;
          });
          yPos += 8;
        }
      }

      // Tab 7: Model Performance (Complete)
      if (yPos + 40 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.text("Model Performance Metrics", 14, yPos);
      yPos += 10;

      if (predictiveReport.modelPerformance && predictiveReport.modelPerformance.length > 0) {
        const modelHeaders = [["Model Type", "Accuracy", "MAE", "RMSE", "Last Updated", "Performance"]];
        const modelData = predictiveReport.modelPerformance.map((model: any) => [
          model.modelType || "Unknown Model",
          `${(model.accuracy || 0).toFixed(1)}%`,
          (model.meanAbsoluteError || 0).toFixed(2),
          (model.rootMeanSquareError || 0).toFixed(2),
          formatDateFn(model.lastUpdated || new Date(), "MMM dd, yyyy"),
          model.accuracy >= 80 ? "Excellent" : 
          model.accuracy >= 70 ? "Good" : 
          model.accuracy >= 60 ? "Fair" : "Poor"
        ]);

        autoTable(doc, {
          startY: yPos,
          head: modelHeaders,
          body: modelData,
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
          },
          margin: { bottom: 30 },
          didDrawPage: function (data) {
            yPos = data.cursor?.y || yPos;
          },
        });
        yPos += 15;
      }

      // Model Improvement Recommendations
      if (yPos + 20 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.text("Model Improvement Recommendations", 14, yPos);
      yPos += 10;

      const improvements = [
        "Data Quality Enhancement: Increase data collection frequency for better accuracy",
        "Advanced Algorithms: Consider implementing machine learning models for complex patterns",
        "External Factors: Incorporate external market data and economic indicators"
      ];

      improvements.forEach((improvement: string, index: number) => {
        doc.setFontSize(10);
        const splitText = doc.splitTextToSize(`• ${improvement}`, 180);
        doc.text(splitText, 14, yPos);
        yPos += splitText.length * 5 + 3;
      });

      // Add footer to all pages before saving
      const totalPagesPredictive = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPagesPredictive; i++) {
        doc.setPage(i);
        addPDFFooter(doc, user);
      }

      doc.save(
        `Predictive_Analytics_ALL_TABS_${formatDateFn(
          dateRange.from,
          "yyyyMMdd"
        )}_to_${formatDateFn(dateRange.to, "yyyyMMdd")}.pdf`
      );
    }

    showToast.success("Report successfully exported to PDF.");
  };

  const daysInRange =
    dateRange?.from && dateRange?.to
      ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 0;

  return (
    <div className="flex flex-col gap-6 w-full text-[clamp(0.65rem,0.7vw+0.5rem,1rem)]">
      {/* Report Options */}
      <Card className="w-full shadow-md bg-card">
        <CardHeader>
          <CardTitle className="font-headline text-xl">
            Report Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="min-w-[200px] select-dropdown-scrollable">
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
                <SelectContent 
                  sideOffset={8}
                  align="start"
                  avoidCollisions={true}
                  collisionPadding={100}
                  className="h-[324px] max-h-[324px] overflow-y-auto z-[9999]"
                >
                  {reportOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[200px]">
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

            {/* Property Selector - Show for super admin users */}
            {user?.role === "super_admin" && properties.length > 0 && (
              <div className="min-w-[200px] select-dropdown-scrollable">
                <label
                  htmlFor="property-select"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Property Filter
                </label>
                <Select
                  value={selectedPropertyId}
                  onValueChange={setSelectedPropertyId}
                  disabled={isLoadingProperties}
                >
                  <SelectTrigger
                    id="property-select"
                    className="w-full text-base md:text-sm"
                  >
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent 
                    sideOffset={8}
                    align="start"
                    avoidCollisions={true}
                    collisionPadding={100}
                    className="max-h-[300px] overflow-y-auto z-[9999]"
                  >
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id.toString()}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="min-w-[200px] select-dropdown-scrollable">
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
              <SelectContent 
                sideOffset={8}
                align="start"
                avoidCollisions={true}
                collisionPadding={100}
                className="max-h-[300px] overflow-y-auto z-[9999]"
              >
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

            <div className="min-w-[200px] flex items-end">
              <Button
                onClick={handleGenerateReport}
                className="w-full"
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
            </div>
          </div>
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
          {/* Report Title Section */}
          {reportData && (
            <div className="mb-6 pb-4 border-b border-border">
              <h2 className="text-2xl font-bold text-foreground mb-1">
                {reportOptions.find(opt => opt.value === selectedReport)?.label || 'Report'}
                {getReportPropertyName(reportData)}
              </h2>
              <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <p className="text-md">
                {getDateRangeDisplay().replace(' | ', '')}
              </p>
              {selectedOutletId && selectedOutletId !== "all" ? (
                <div className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  <span>
                    {allOutlets.find((o) => o.id.toString() === selectedOutletId.toString())?.name || "Selected Outlet"}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  <span>All Outlets</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{daysInRange} days</span>
              </div>
              </div>
            </div>
          )}

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
                    allOutlets.find((o) => o.id.toString() === selectedOutletId.toString())?.name
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

          {/* Property Performance Comparison Report */}
          {!isLoadingReport &&
            reportData &&
            selectedReport === "property_performance_comparison" &&
            "propertyData" in reportData && (
              <div className="space-y-6">
                <PropertyPerformanceComparisonReport
                  data={reportData as PropertyPerformanceComparisonReport}
                  outletName={
                    selectedOutletId && selectedOutletId !== "all"
                      ? allOutlets.find((o) => o.id.toString() === selectedOutletId.toString())?.name
                      : undefined
                  }
                />
              </div>
            )}

          {/* Outlet Efficiency & Profitability Report */}
          {!isLoadingReport &&
            reportData &&
            selectedReport === "outlet_efficiency_profitability" &&
            "outletData" in reportData && (
              <div className="space-y-6">
                <OutletEfficiencyProfitabilityReport
                  data={reportData as OutletEfficiencyProfitabilityReport}
                  outletName={
                    selectedOutletId && selectedOutletId !== "all"
                      ? allOutlets.find((o) => o.id.toString() === selectedOutletId.toString())?.name
                      : undefined
                  }
                />
              </div>
            )}

          {/* Category Performance Trends Report */}
          {!isLoadingReport &&
            reportData &&
            selectedReport === "category_performance_trends" &&
            "foodCategories" in reportData && (
              <div className="space-y-6">
                <CategoryPerformanceTrendsReport
                  data={reportData as CategoryPerformanceTrendsReport}
                  outletName={
                    selectedOutletId && selectedOutletId !== "all"
                      ? allOutlets.find((o) => o.id.toString() === selectedOutletId.toString())?.name
                      : undefined
                  }
                />
              </div>
            )}

          {/* User Activity & Audit Report */}
          {!isLoadingReport &&
            reportData &&
            selectedReport === "user_activity_audit" &&
            "userData" in reportData && (
              <div className="space-y-6">
                <UserActivityAuditReport
                  data={reportData as UserActivityAuditReport}
                />
              </div>
            )}

          {/* Cost Variance Analysis Report */}
          {!isLoadingReport &&
            reportData &&
            selectedReport === "cost_variance_analysis" &&
            "categoryVariances" in reportData && (
              <div className="space-y-6">
                <CostVarianceAnalysisReport
                  data={reportData as CostVarianceAnalysisReport}
                  outletName={
                    selectedOutletId && selectedOutletId !== "all"
                      ? allOutlets.find((o) => o.id.toString() === selectedOutletId.toString())?.name
                      : undefined
                  }
                />
              </div>
            )}

          {/* Predictive Analytics & Forecasting Report */}
          {!isLoadingReport &&
            reportData &&
            selectedReport === "predictive_analytics" &&
            "categoryForecasts" in reportData && (
              <div className="space-y-6">
                <PredictiveAnalyticsReport
                  data={reportData as PredictiveAnalyticsReport}
                  outletName={
                    selectedOutletId && selectedOutletId !== "all"
                      ? allOutlets.find((o) => o.id.toString() === selectedOutletId.toString())?.name
                      : undefined
                  }
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
              "forecasting_report",
              "property_performance_comparison",
              "outlet_efficiency_profitability",
              "category_performance_trends",
              "user_activity_audit",
              "cost_variance_analysis",
              "predictive_analytics",
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
