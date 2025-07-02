"use client";

import { useState, useEffect, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Users,
  Utensils,
  GlassWater,
  Percent,
  BarChart2,
  LineChart as LucideLineChart,
  PieChartIcon,
  ListChecks,
  Apple,
  Martini,
  Building,
} from "lucide-react";
import {
  subDays,
  format as formatDateFn,
  eachDayOfInterval,
  differenceInDays,
  isValid as isValidDate,
} from "date-fns";
import type { DateRange } from "react-day-picker";

import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAllOutletsAction, getOutletsByPropertyAccessAction } from "@/actions/prismaOutletActions";
import { getPropertiesAction } from "@/actions/propertyActions";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPropertyAccess } from "@/hooks/useUserPropertyAccess";
import { getAllCategoriesAction } from "@/actions/prismaCategoryActions";
import { getFoodCostEntriesByDateRangeAction } from "@/actions/foodCostActions";
import { getBeverageCostEntriesByDateRangeAction } from "@/actions/beverageCostActions";
import { getDailyFinancialSummariesByDateRangeAction } from "@/actions/dailyFinancialSummaryActions";
import type {
  Outlet,
  Property,
  DashboardReportData,
  SummaryStat,
  ChartDataPoint,
  DonutChartDataPoint,
  OutletPerformanceDataPoint,
  DailyFinancialSummary,
  FoodCostEntry,
  BeverageCostEntry,
  TopCategoryDataPoint,
  FoodCostDetail,
  BeverageCostDetail,
  Category,
} from "@/types";
import { showToast } from "@/lib/toast";
import {
  useNotifications,
  createCostAlert,
  createBusinessInsight,
} from "@/contexts/NotificationContext";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  Line,
  LineChart as RechartsLine,
  Pie,
  PieChart as RechartsPie,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend as RechartsLegend,
} from "recharts";
import {
  LineChart as RechartsLineChart,
  Line as RechartsLineMini,
} from "recharts";

import {
  analyzeDashboardData,
  type DashboardAdvisorInput,
  type DashboardAdvisorOutput,
} from "@/ai/flows/dashboard-cost-advisor-flow";
import {
  runEnhancedCostAnalysis,
  generateSmartNotifications,
} from "@/ai/integrations/enhanced-cost-advisor-integration";
import { AIInsightsCard } from "./AIInsightsCard";
import { EnhancedCostAdvisorSection } from "./EnhancedCostAdvisorSection";
import { getFoodCategoriesAction } from "@/actions/foodCostActions";
import { getBeverageCategoriesAction } from "@/actions/beverageCostActions";
import dynamic from "next/dynamic";
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});
import { getCategoryIcon, getContextualFallback } from "./TopCategoryIcons";

const StatCard: React.FC<
  SummaryStat & { isLoading?: boolean; trendData?: number[] }
> = ({
  title,
  value,
  icon: Icon,
  iconColor = "text-primary",
  isLoading,
  trendData,
}) => {
  // Tooltip text for each stat (customize as needed)
  const iconTooltips: Record<string, string> = {
    "Total Food Revenue": "Total revenue from food sales.",
    "Total Beverage Revenue": "Total revenue from beverage sales.",
    "Avg. Food Cost %": "Average food cost as a percentage of revenue.",
    "Avg. Beverage Cost %": "Average beverage cost as a percentage of revenue.",
  };
  // Choose chart type based on stat
  let chartType: "area" | "bar" | "line" = "area";
  if (title.includes("Cost %")) chartType = "bar";
  if (title.includes("Beverage")) chartType = "line";
  // Chart options
  const chartOptions = {
    chart: {
      id: "mini-chart",
      sparkline: { enabled: true },
      animations: { enabled: false },
      toolbar: { show: false },
    },
    stroke: { curve: "smooth" as const, width: 2 },
    fill: { type: chartType === "area" ? "solid" : "gradient", opacity: 0.2 },
    colors: [
      chartType === "bar"
        ? "#34d399"
        : chartType === "line"
        ? "#f59e42"
        : "#6366f1",
    ],
    tooltip: {
      enabled: true,
      x: { show: false },
      y: {
        formatter: (val: number) =>
          `${
            title.includes("%")
              ? val.toFixed(1) + "%"
              : "$" + val.toLocaleString()
          }`,
      },
      marker: { show: false },
      style: { fontSize: "12px" },
    },
    xaxis: {
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { show: false },
    grid: { show: false },
  };
  if (isLoading) {
    return (
      <Card className="shadow-md bg-card animate-fade-in">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            <Skeleton className="h-5 w-24 bg-muted" />
          </CardTitle>
          <Skeleton className="h-6 w-6 rounded-sm bg-muted" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-1 bg-muted" />
          <Skeleton className="h-4 w-20 bg-muted" />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card
      className="shadow-md bg-card transition-transform duration-200 hover:scale-[1.03] hover:shadow-lg border-t-4 border-primary/60 animate-fade-in focus-within:scale-[1.03]"
      tabIndex={0}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <span className="relative group">
          <Icon className={`h-5 w-5 ${iconColor}`} />
          <span className="absolute z-10 left-1/2 -translate-x-1/2 mt-2 px-2 py-1 rounded bg-foreground text-background text-xs opacity-0 group-hover:opacity-100 group-focus:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-lg">
            {iconTooltips[title]}
          </span>
        </span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-headline">{value}</div>
        {trendData && trendData.length > 1 && (
          <div className="mt-2 h-10 w-full">
            <ReactApexChart
              type={chartType}
              height={40}
              width={"100%"}
              series={[{ data: trendData }]}
              options={chartOptions}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const overviewChartConfig = {
  foodCostPct: { label: "Food Cost %", color: "hsl(var(--chart-1))" },
  beverageCostPct: { label: "Bev Cost %", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const donutChartConfig = {
  // Minimal config for the donut chart context, colors will be applied directly
} satisfies ChartConfig;

const costDistributionChartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function DashboardClient() {
  const { addNotification } = useNotifications();

  // Helper function to create notifications based on AI analysis results
  const createAnalysisNotifications = async (
    analysisResult: DashboardAdvisorOutput,
    outletName: string
  ) => {
    try {
      let smartNotifications: any[] = [];

      // Try to generate smart notifications using the enhanced integration
      try {
        smartNotifications = await generateSmartNotifications(analysisResult, {
          enableAlerts: true,
          enableInsights: true,
          enableRecommendations: true,
          minAlertLevel: "low",
          maxNotificationsPerSession: 3,
        });
      } catch (enhancedError) {
        console.log(
          "Enhanced notifications failed, using fallback",
          enhancedError
        );
        // Fallback to basic notification creation
        smartNotifications = [];
      }

      // Create notifications in the notification center
      smartNotifications.forEach((notification, index) => {
        setTimeout(() => {
          if (notification.type === "alert") {
            addNotification(
              createCostAlert(notification.title, notification.message, {
                alertLevel: analysisResult.alertLevel,
                outlet: outletName,
                performanceScore:
                  analysisResult.performanceMetrics.overallScore,
                actionRequired: notification.action,
              })
            );
          } else {
            addNotification(
              createBusinessInsight(notification.title, notification.message, {
                type: notification.type,
                priority: notification.priority,
                outlet: outletName,
                actionRequired: notification.action,
              })
            );
          }
        }, index * 1000); // Stagger notifications by 1 second each
      });

      // Always create a basic notification for critical/high alerts
      if (
        analysisResult.alertLevel === "critical" ||
        (analysisResult.alertLevel === "high" &&
          smartNotifications.length === 0)
      ) {
        setTimeout(() => {
          addNotification(
            createCostAlert(
              `${
                analysisResult.alertLevel.charAt(0).toUpperCase() +
                analysisResult.alertLevel.slice(1)
              } Cost Alert`,
              `${
                analysisResult.alertLevel === "critical"
                  ? "Immediate"
                  : "Urgent"
              } attention required for ${outletName}. Overall performance score: ${
                analysisResult.performanceMetrics.overallScore
              }/100. Budget compliance: ${analysisResult.performanceMetrics.budgetCompliance.toFixed(
                1
              )}%.`,
              {
                alertLevel: analysisResult.alertLevel,
                outlet: outletName,
                performanceScore:
                  analysisResult.performanceMetrics.overallScore,
                budgetCompliance:
                  analysisResult.performanceMetrics.budgetCompliance,
                nextStep:
                  (analysisResult.nextSteps && analysisResult.nextSteps[0]) ||
                  "Review cost analysis details",
              }
            )
          );
        }, 500);
      }

      // Create notification for urgent recommendations
      if (
        analysisResult.recommendations &&
        analysisResult.recommendations.length > 0
      ) {
        const urgentRecommendations = analysisResult.recommendations.filter(
          (rec) => rec.priority === "urgent" || rec.priority === "high"
        );
        if (
          urgentRecommendations.length > 0 &&
          smartNotifications.length === 0
        ) {
          setTimeout(() => {
            addNotification(
              createBusinessInsight(
                "Priority Action Required",
                urgentRecommendations[0].action,
                {
                  type: "recommendation",
                  priority: urgentRecommendations[0].priority,
                  outlet: outletName,
                  impact: urgentRecommendations[0].estimatedImpact,
                  timeframe: urgentRecommendations[0].timeframe,
                }
              )
            );
          }, 1500);
        }
      }

      // Create notification for high-impact insights
      if (analysisResult.keyInsights && analysisResult.keyInsights.length > 0) {
        const highImpactInsights = analysisResult.keyInsights.filter(
          (insight) => insight.impact === "high"
        );
        if (highImpactInsights.length > 0 && smartNotifications.length === 0) {
          setTimeout(() => {
            addNotification(
              createBusinessInsight(
                "Critical Business Insight",
                highImpactInsights[0].insight,
                {
                  type: "insight",
                  category: highImpactInsights[0].category,
                  impact: highImpactInsights[0].impact,
                  outlet: outletName,
                }
              )
            );
          }, 2500);
        }
      }

      console.log(
        `Created notifications for ${outletName} - Alert Level: ${analysisResult.alertLevel}, Smart Notifications: ${smartNotifications.length}`
      );
    } catch (error) {
      console.error("Error creating analysis notifications:", error);

      // Final fallback - create a basic notification regardless
      setTimeout(() => {
        addNotification(
          createBusinessInsight(
            "Cost Analysis Complete",
            `Cost analysis completed for ${outletName}. Alert level: ${analysisResult.alertLevel}. Performance score: ${analysisResult.performanceMetrics.overallScore}/100.`,
            {
              type: "analysis_complete",
              outlet: outletName,
              alertLevel: analysisResult.alertLevel,
            }
          )
        );
      }, 100);
    }
  };
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [allOutlets, setAllOutlets] = useState<Outlet[]>([]);
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>("all");
  const [selectedOutletId, setSelectedOutletId] = useState<string | undefined>(
    "all"
  );
  const { userProfile } = useAuth();
  const { filterPropertiesByAccess, isSuperAdmin, getDefaultPropertyId } = useUserPropertyAccess();

  const [dashboardData, setDashboardData] =
    useState<DashboardReportData | null>(null);
  const [isFetchingOutlets, setIsFetchingOutlets] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [aiInsights, setAiInsights] = useState<DashboardAdvisorOutput | null>(
    null
  );
  const [isLoadingAIInsights, setIsLoadingAIInsights] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  
  // Track notification state to prevent spam
  const [lastNotificationTime, setLastNotificationTime] = useState<number>(0);
  const [notifiedAnalysisIds, setNotifiedAnalysisIds] = useState<Set<string>>(new Set());
  const [forceNotifications, setForceNotifications] = useState<boolean>(false);

  // Helper function to determine if notifications should be shown
  const shouldShowNotifications = (analysisResult: DashboardAdvisorOutput | any, outletName: string): boolean => {
    const now = Date.now();
    const timeSinceLastNotification = now - lastNotificationTime;
    const minNotificationInterval = 5 * 60 * 1000; // 5 minutes
    
    // Create unique ID for this analysis context
    const analysisId = `${selectedPropertyId}-${selectedOutletId}-${dateRange?.from?.toISOString()}-${dateRange?.to?.toISOString()}`;
    
    // If notifications are forced (user clicked "Get Alerts" button), always show them
    if (forceNotifications) {
      console.log(`Showing forced notifications for ${outletName} - user requested alerts`);
      setLastNotificationTime(now);
      setNotifiedAnalysisIds(prev => new Set([...prev, analysisId]));
      setForceNotifications(false); // Reset flag after use
      return true;
    }
    
    // Don't show notifications if:
    // 1. We've already notified for this exact analysis context
    if (notifiedAnalysisIds.has(analysisId)) {
      console.log("Skipping notifications: already notified for this analysis context");
      return false;
    }
    
    // 2. Too recent since last notification (rate limiting)
    if (timeSinceLastNotification < minNotificationInterval) {
      console.log(`Skipping notifications: only ${Math.round(timeSinceLastNotification / 1000)}s since last notification`);
      return false;
    }
    
    // 3. Alert level is not significant enough (only show for medium+ alerts)
    if (analysisResult?.alertLevel && !['medium', 'high', 'critical'].includes(analysisResult.alertLevel)) {
      console.log(`Skipping notifications: alert level '${analysisResult.alertLevel}' not significant enough`);
      return false;
    }
    
    console.log(`Showing notifications for ${outletName} - significant analysis with alert level: ${analysisResult?.alertLevel}`);
    
    // Update tracking state
    setLastNotificationTime(now);
    setNotifiedAnalysisIds(prev => new Set([...prev, analysisId]));
    
    return true;
  };

  // Function to manually trigger notifications
  const requestNotifications = () => {
    setForceNotifications(true);
    // Trigger data refresh to re-run analysis and notifications
    setIsLoadingData(true);
    setIsLoadingAIInsights(true);
  };

  // Generate welcome message based on user role and property access
  const getWelcomeMessage = () => {
    if (!userProfile) return "Welcome to Cost Compass Dashboard";
    
    if (isSuperAdmin) {
      return "Welcome to Cost Compass Admin Dashboard";
    }
    
    // For property-specific users, get their property name
    const defaultPropId = getDefaultPropertyId;
    if (defaultPropId && allProperties.length > 0) {
      const userProperty = allProperties.find(p => p.id === defaultPropId);
      if (userProperty && userProperty.name !== "All Properties") {
        return `Welcome to ${userProperty.name} Cost Compass Dashboard`;
      }
    }
    
    return "Welcome to Cost Compass Dashboard";
  };

  useEffect(() => {
    setDateRange({
      from: subDays(new Date(), 29),
      to: new Date(),
    });
  }, []);

  useEffect(() => {
    const fetchOutletsAndProperties = async () => {
      console.log("useEffect [fetchOutletsAndProperties] triggered:");
      console.log("  userProfile?.email:", userProfile?.email);
      console.log("  userProfile?.role:", userProfile?.role);
      console.log("  isSuperAdmin:", isSuperAdmin);
      
      setIsFetchingOutlets(true);
      try {
        // Fetch outlets with fallback mechanism
        let fetchedOutletsFromDB;
        try {
          if (userProfile?.email && userProfile.role !== "super_admin") {
            console.log("  Fetching outlets by property access for:", userProfile.email);
            fetchedOutletsFromDB = await getOutletsByPropertyAccessAction(userProfile.email);
          } else {
            console.log("  Fetching all outlets (super admin)");
            fetchedOutletsFromDB = await getAllOutletsAction();
          }
        } catch (outletError) {
          console.warn("Property-aware outlet fetch failed in dashboard, falling back:", outletError);
          fetchedOutletsFromDB = await getAllOutletsAction();
        }

        console.log("  fetchedOutletsFromDB:", fetchedOutletsFromDB.map(o => ({ 
          id: o.id, 
          name: o.name, 
          propertyId: o.propertyId 
        })));

        const fetchedPropertiesFromDB = await getPropertiesAction();
        console.log("  fetchedPropertiesFromDB:", fetchedPropertiesFromDB.map(p => ({ 
          id: p.id, 
          name: p.name 
        })));

        const outletsWithAll = [
          { id: "all", name: "All Outlets" },
          ...fetchedOutletsFromDB,
        ];
        
        console.log("  Setting allOutlets to:", outletsWithAll.map(o => ({ 
          id: o.id, 
          name: o.name, 
          propertyId: o.propertyId 
        })));
        
        setAllOutlets(outletsWithAll);
        
        // Filter properties based on user access
        const accessibleProperties = filterPropertiesByAccess(fetchedPropertiesFromDB);
        
        // Set properties based on user role
        if (isSuperAdmin) {
          setAllProperties([
            { id: "all", name: "All Properties" },
            ...accessibleProperties,
          ]);
        } else {
          // For non-super admin users, don't include "All Properties" option
          setAllProperties(accessibleProperties);
          
          // Auto-select the user's default property
          const defaultPropId = getDefaultPropertyId;
          if (defaultPropId && accessibleProperties.length > 0) {
            setSelectedPropertyId(defaultPropId.toString());
          } else if (accessibleProperties.length === 1) {
            setSelectedPropertyId(accessibleProperties[0].id.toString());
          }
        }
      } catch (error) {
        console.error("Error fetching outlets and properties:", error);
        showToast.error((error as Error).message);
        setAllOutlets([{ id: "all", name: "All Outlets" }]);
        if (isSuperAdmin) {
          setAllProperties([{ id: "all", name: "All Properties" }]);
        } else {
          setAllProperties([]);
        }
      }
      setIsFetchingOutlets(false);
    };
    fetchOutletsAndProperties();
  }, [userProfile?.email, userProfile?.role, filterPropertiesByAccess, isSuperAdmin, getDefaultPropertyId]);

  // Reset outlet selection when property changes for super admin users
  useEffect(() => {
    console.log("useEffect [outlet reset] triggered:");
    console.log("  isSuperAdmin:", isSuperAdmin);
    console.log("  selectedPropertyId:", selectedPropertyId);
    console.log("  allOutlets.length:", allOutlets.length);
    console.log("  selectedOutletId:", selectedOutletId);
    
    if (isSuperAdmin && selectedPropertyId && allOutlets.length > 0) {
      const availableOutlets = allOutlets.filter((outlet) => {
        if (selectedPropertyId === "all") return true;
        if (outlet.id === "all") return true;
        
        // Use same logic as main filtering: try both string and number comparison
        const propertyIdMatch = outlet.propertyId?.toString() === selectedPropertyId || 
                              outlet.propertyId === parseInt(selectedPropertyId || "0");
        return propertyIdMatch;
      });
      
      console.log("  availableOutlets:", availableOutlets.map(o => ({ id: o.id, name: o.name })));
      
      // If currently selected outlet is not available for the new property, reset to "all"
      const currentOutletStillAvailable = availableOutlets.some(outlet => outlet.id === selectedOutletId);
      console.log("  currentOutletStillAvailable:", currentOutletStillAvailable);
      
      if (!currentOutletStillAvailable) {
        console.log("  Resetting selectedOutletId to 'all'");
        setSelectedOutletId("all");
      }
    }
  }, [selectedPropertyId, allOutlets, isSuperAdmin, selectedOutletId]);

  useEffect(() => {
    if (
      !dateRange?.from ||
      !dateRange?.to ||
      !allOutlets.length ||
      isFetchingOutlets
    ) {
      if (!isFetchingOutlets && (!dateRange?.from || !dateRange?.to)) {
        setIsLoadingData(false);
        setDashboardData(null);
        setAiInsights(null);
      }
      return;
    }

    setIsLoadingData(true);
    setDashboardData(null);
    setAiInsights(null);
    setAiError(null);

    async function fetchDataForDashboard() {
      if (!dateRange?.from || !dateRange?.to) {
        console.warn(
          "fetchDataForDashboard: Date range is undefined. Skipping data fetch."
        );
        setIsLoadingData(false);
        setIsLoadingAIInsights(false);
        setDashboardData(null);
        setAiInsights(null);
        return;
      }

      setIsLoadingAIInsights(true);
      try {
        // Determine which outlets to include based on property and outlet selection
        let outletFilter: string | undefined;
        if (selectedOutletId !== "all") {
          outletFilter = selectedOutletId;
        } else if (selectedPropertyId !== "all") {
          // Get all outlets for the selected property
          const propertyOutlets = allOutlets.filter(o => 
            o.id !== "all" && o.propertyId?.toString() === selectedPropertyId
          );
          if (propertyOutlets.length > 0) {
            // Note: We'll need to modify the actions to handle property-level filtering
            // For now, we'll fetch all data and filter in the frontend
          }
        }

        // Fetch data using Prisma actions with property filtering
        const [dailySummaries, foodCostEntries, beverageCostEntries] = await Promise.all([
          getDailyFinancialSummariesByDateRangeAction(dateRange.from, dateRange.to, outletFilter, selectedPropertyId),
          getFoodCostEntriesByDateRangeAction(dateRange.from, dateRange.to, outletFilter ? parseInt(outletFilter) : undefined, selectedPropertyId),
          getBeverageCostEntriesByDateRangeAction(dateRange.from, dateRange.to, outletFilter ? parseInt(outletFilter) : undefined, selectedPropertyId)
        ]);

        // Since we're filtering by property at the database level, we only need to filter by outlet if a specific outlet is selected
        const filterByOutlet = <T extends { outletId?: string }>(items: T[]): T[] => {
          if (selectedOutletId !== "all") {
            return items.filter(item => item.outletId === selectedOutletId);
          }
          return items;
        };

        // Filter data based on outlet selection (property filtering is already done at database level)
        const filteredDailySummaries = filterByOutlet(dailySummaries);
        const filteredFoodCostEntries = filterByOutlet(foodCostEntries);
        const filteredBeverageCostEntries = filterByOutlet(beverageCostEntries);

        const summariesMap = new Map<string, DailyFinancialSummary>();
        filteredDailySummaries.forEach((s) =>
          summariesMap.set(formatDateFn(s.date as Date, "yyyy-MM-dd"), s)
        );

        const daysInInterval = eachDayOfInterval({
          start: dateRange.from,
          end: dateRange.to,
        });
        const numberOfDaysInPeriod =
          differenceInDays(dateRange.to, dateRange.from) + 1;

        let totalHotelFoodRevenue = 0;
        let totalHotelBeverageRevenue = 0;
        let totalHotelActualFoodCost = 0;
        let totalHotelActualBeverageCost = 0;
        let sumOfBudgetFoodCostPct = 0;
        let sumOfBudgetBeverageCostPct = 0;
        let countBudgetFoodCostPct = 0;
        let countBudgetBeverageCostPct = 0;

        filteredDailySummaries.forEach((summary) => {
          totalHotelFoodRevenue += summary.actualFoodRevenue || 0;
          totalHotelBeverageRevenue += summary.actualBeverageRevenue || 0;
          totalHotelActualFoodCost += summary.actualFoodCost || 0;
          totalHotelActualBeverageCost += summary.actualBeverageCost || 0;
          if (summary.budgetFoodCostPct != null) {
            sumOfBudgetFoodCostPct += summary.budgetFoodCostPct;
            countBudgetFoodCostPct++;
          }
          if (summary.budgetBeverageCostPct != null) {
            sumOfBudgetBeverageCostPct += summary.budgetBeverageCostPct;
            countBudgetBeverageCostPct++;
          }
        });

        let avgActualFoodCostPctVal =
          totalHotelFoodRevenue > 0
            ? (totalHotelActualFoodCost / totalHotelFoodRevenue) * 100
            : 0;
        let avgActualBeverageCostPctVal =
          totalHotelBeverageRevenue > 0
            ? (totalHotelActualBeverageCost / totalHotelBeverageRevenue) * 100
            : 0;
        const avgBudgetFoodCostPct =
          countBudgetFoodCostPct > 0
            ? sumOfBudgetFoodCostPct / countBudgetFoodCostPct
            : 0;
        const avgBudgetBeverageCostPct =
          countBudgetBeverageCostPct > 0
            ? sumOfBudgetBeverageCostPct / countBudgetBeverageCostPct
            : 0;

        if (selectedOutletId && selectedOutletId !== "all") {
          let outletTotalFoodCost = 0;
          let outletTotalFoodRevenueSumForPct = 0;
          filteredFoodCostEntries
            .filter((fce) => fce.outletId === selectedOutletId)
            .forEach((fce) => {
              outletTotalFoodCost += fce.totalFoodCost;
              const daySummary = summariesMap.get(
                formatDateFn(
                  new Date(fce.date),
                  "yyyy-MM-dd"
                )
              );
              if (daySummary)
                outletTotalFoodRevenueSumForPct +=
                  daySummary.actualFoodRevenue || 0;
            });
          avgActualFoodCostPctVal =
            outletTotalFoodRevenueSumForPct > 0
              ? (outletTotalFoodCost / outletTotalFoodRevenueSumForPct) * 100
              : 0;

          let outletTotalBeverageCost = 0;
          let outletTotalBeverageRevenueSumForPct = 0;
          filteredBeverageCostEntries
            .filter((bce) => bce.outletId === selectedOutletId)
            .forEach((bce) => {
              outletTotalBeverageCost += bce.totalBeverageCost;
              const daySummary = summariesMap.get(
                formatDateFn(
                  (bce.date as Date),
                  "yyyy-MM-dd"
                )
              );
              if (daySummary)
                outletTotalBeverageRevenueSumForPct +=
                  daySummary.actualBeverageRevenue || 0;
            });
          avgActualBeverageCostPctVal =
            outletTotalBeverageRevenueSumForPct > 0
              ? (outletTotalBeverageCost /
                  outletTotalBeverageRevenueSumForPct) *
                100
              : 0;
        }

        const summaryStatsData = {
          totalFoodRevenue: parseFloat(totalHotelFoodRevenue.toFixed(2)),
          totalBeverageRevenue: parseFloat(
            totalHotelBeverageRevenue.toFixed(2)
          ),
          avgFoodCostPct: parseFloat(avgActualFoodCostPctVal.toFixed(1)),
          avgBeverageCostPct: parseFloat(
            avgActualBeverageCostPctVal.toFixed(1)
          ),
          totalOrders: 0, // Added for DashboardReportData type compatibility
          totalCustomers: 0, // Added for DashboardReportData type compatibility
        };

        const overviewChartDataResult: ChartDataPoint[] = daysInInterval.map(
          (day) => {
            const dayStr = formatDateFn(day, "MMM dd");
            const summary = summariesMap.get(formatDateFn(day, "yyyy-MM-dd")); // Use full date for map key
            const foodRev = summary?.actualFoodRevenue || 0;
            const bevRev = summary?.actualBeverageRevenue || 0;
            const actualFoodCost = summary?.actualFoodCost || 0;
            const actualBevCost = summary?.actualBeverageCost || 0;
            return {
              date: dayStr,
              foodCostPct:
                foodRev > 0
                  ? parseFloat(((actualFoodCost / foodRev) * 100).toFixed(1))
                  : 0,
              beverageCostPct:
                bevRev > 0
                  ? parseFloat(((actualBevCost / bevRev) * 100).toFixed(1))
                  : 0,
            };
          }
        );

        let costTrendsChartDataResult: ChartDataPoint[];
        if (selectedOutletId && selectedOutletId !== "all") {
          costTrendsChartDataResult = daysInInterval.map((day) => {
            const dayStr = formatDateFn(day, "yyyy-MM-dd");
            const summary = summariesMap.get(dayStr);
            const foodRev = summary?.actualFoodRevenue || 0;
            const bevRev = summary?.actualBeverageRevenue || 0;
            const outletDayFoodCost = filteredFoodCostEntries
              .filter(
                (fce) =>
                  fce.outletId === selectedOutletId &&
                  formatDateFn(
                    fce.date,
                    "yyyy-MM-dd"
                  ) === dayStr
              )
              .reduce((sum, fce) => sum + fce.totalFoodCost, 0);
            const outletDayBeverageCost = filteredBeverageCostEntries
              .filter(
                (bce) =>
                  bce.outletId === selectedOutletId &&
                  formatDateFn(
                    bce.date,
                    "yyyy-MM-dd"
                  ) === dayStr
              )
              .reduce((sum, bce) => sum + bce.totalBeverageCost, 0);
            return {
              date: formatDateFn(day, "MMM dd"),
              foodCostPct:
                foodRev > 0
                  ? parseFloat(((outletDayFoodCost / foodRev) * 100).toFixed(1))
                  : 0,
              beverageCostPct:
                bevRev > 0
                  ? parseFloat(
                      ((outletDayBeverageCost / bevRev) * 100).toFixed(1)
                    )
                  : 0,
            };
          });
        } else {
          costTrendsChartDataResult = overviewChartDataResult;
        }

        const costByOutletMap: Record<
          string,
          { totalCost: number; name: string }
        > = {};
        const outletDetailsMap = new Map(allOutlets.map((o) => [o.id, o.name]));
        filteredFoodCostEntries.forEach((fce) => {
          const outletName =
            outletDetailsMap.get(fce.outletId) || fce.outletId;
          if (!costByOutletMap[fce.outletId])
            costByOutletMap[fce.outletId] = {
              totalCost: 0,
              name: outletName.split(" - ")[0],
            };
          costByOutletMap[fce.outletId].totalCost += fce.totalFoodCost;
        });
        filteredBeverageCostEntries.forEach((bce) => {
          const outletName =
            outletDetailsMap.get(bce.outletId) || bce.outletId;
          if (!costByOutletMap[bce.outletId])
            costByOutletMap[bce.outletId] = {
              totalCost: 0,
              name: outletName.split(" - ")[0],
            };
          costByOutletMap[bce.outletId].totalCost += bce.totalBeverageCost;
        });
        const costDistributionChartDataResult: DonutChartDataPoint[] =
          Object.values(costByOutletMap)
            .map((data, index) => ({
              name: data.name,
              value: parseFloat(data.totalCost.toFixed(2)),
              fill: costDistributionChartColors[
                index % costDistributionChartColors.length
              ],
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        const outletPerformanceList: OutletPerformanceDataPoint[] = [];
        allOutlets
          .filter((o) => o.id !== "all")
          .forEach((outlet) => {
            let totalOutletFoodCost = 0;
            let totalHotelFoodRevenueOnOutletDays = 0;
            let daysWithFoodCost = 0;
            daysInInterval.forEach((day) => {
              const dayStr = formatDateFn(day, "yyyy-MM-dd");
              const dailyFoodCostForOutlet = filteredFoodCostEntries
                .filter(
                  (fce) =>
                    fce.outletId === outlet.id &&
                    formatDateFn(
                      new Date(fce.date),
                      "yyyy-MM-dd"
                    ) === dayStr
                )
                .reduce((sum, fce) => sum + fce.totalFoodCost, 0);
              if (dailyFoodCostForOutlet > 0) {
                totalOutletFoodCost += dailyFoodCostForOutlet;
                const summary = summariesMap.get(dayStr);
                if (summary && summary.actualFoodRevenue)
                  totalHotelFoodRevenueOnOutletDays +=
                    summary.actualFoodRevenue;
                daysWithFoodCost++;
              }
            });
            const avgDailyFoodCostPct =
              totalHotelFoodRevenueOnOutletDays > 0
                ? parseFloat(
                    (
                      (totalOutletFoodCost /
                        totalHotelFoodRevenueOnOutletDays) *
                      100
                    ).toFixed(1)
                  )
                : 0;
            if (daysWithFoodCost > 0) {
              outletPerformanceList.push({
                id: outlet.id,
                outletName: outlet.name.split(" - ")[0],
                metricName: "Avg Food Cost %",
                value: `${avgDailyFoodCostPct}%`,
                metricValue: avgDailyFoodCostPct,
                trend: Math.random() > 0.5 ? "up" : "down",
              });
            }
          });
        const outletPerformanceDataResult = outletPerformanceList
          .sort((a, b) => b.metricValue - a.metricValue)
          .slice(0, 3);

        // --- Extract Details from Prisma Data (details are already included) ---

        const relevantFoodEntries =
          selectedOutletId && selectedOutletId !== "all"
            ? filteredFoodCostEntries.filter((e) => e.outletId === selectedOutletId)
            : filteredFoodCostEntries;
        const foodEntryIds = relevantFoodEntries.map((e) => e.id);

        const relevantBeverageEntries =
          selectedOutletId && selectedOutletId !== "all"
            ? filteredBeverageCostEntries.filter(
                (e) => e.outletId === selectedOutletId
              )
            : filteredBeverageCostEntries;
        const beverageEntryIds = relevantBeverageEntries.map((e) => e.id);

        const [allFoodCategories, allBeverageCategories] = await Promise.all([
          getFoodCategoriesAction(),
          getBeverageCategoriesAction(),
        ]);

        // Extract details from the already loaded entries (Prisma includes details)
        const allFoodDetailsData: FoodCostDetail[] = relevantFoodEntries.flatMap(entry => entry.details || []);
        const allBeverageDetailsData: BeverageCostDetail[] = relevantBeverageEntries.flatMap(entry => entry.details || []);

        const foodCategoryMap = new Map(
          allFoodCategories.map((c) => [c.id, c.name])
        );
        const foodCategoryCosts: Record<string, number> = {};
        allFoodDetailsData.forEach((detail) => {
          foodCategoryCosts[detail.categoryId] =
            (foodCategoryCosts[detail.categoryId] || 0) + detail.cost;
        });
        const topFoodCategoriesData: TopCategoryDataPoint[] = Object.entries(
          foodCategoryCosts
        )
          .map(([categoryId, totalCost]) => ({
            name: foodCategoryMap.get(Number(categoryId)) || "Unknown Category",
            value: parseFloat(totalCost.toFixed(2)),
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 3);

        const beverageCategoryMap = new Map(
          allBeverageCategories.map((c) => [c.id, c.name])
        );
        const beverageCategoryCosts: Record<string, number> = {};
        allBeverageDetailsData.forEach((detail) => {
          beverageCategoryCosts[detail.categoryId] =
            (beverageCategoryCosts[detail.categoryId] || 0) + detail.cost;
        });
        const topBeverageCategoriesData: TopCategoryDataPoint[] =
          Object.entries(beverageCategoryCosts)
            .map(([categoryId, totalCost]) => ({
              name: beverageCategoryMap.get(Number(categoryId)) || "Unknown Category",
              value: parseFloat(totalCost.toFixed(2)),
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 3);
        // --- End Top Categories Processing ---

        // --- Outlet Food Cost Metrics ---
        const outletFoodCostMap: Record<
          string,
          {
            name: string;
            total: number;
            days: Set<string>;
            dailyCosts: { date: string; cost: number }[];
          }
        > = {};
        filteredFoodCostEntries.forEach((fce) => {
          if (!outletFoodCostMap[fce.outletId]) {
            const outletName =
              outletDetailsMap.get(fce.outletId) || fce.outletId;
            outletFoodCostMap[fce.outletId] = {
              name: outletName.split(" - ")[0],
              total: 0,
              days: new Set(),
              dailyCosts: [],
            };
          }
          outletFoodCostMap[fce.outletId].total += fce.totalFoodCost;
          const dayStr = formatDateFn(
            fce.date,
            "yyyy-MM-dd"
          );
          outletFoodCostMap[fce.outletId].days.add(dayStr);
          outletFoodCostMap[fce.outletId].dailyCosts.push({
            date: dayStr,
            cost: fce.totalFoodCost,
          });
        });
        const totalHotelFoodCost = Object.values(outletFoodCostMap).reduce(
          (sum, o) => sum + o.total,
          0
        );
        const outletAvgDailyFoodCost = Object.entries(outletFoodCostMap).map(
          ([id, o]) => ({
            id,
            outletName: o.name,
            avgDailyCost: o.days.size > 0 ? o.total / o.days.size : 0,
          })
        );
        const outletFoodCostPct = Object.entries(outletFoodCostMap).map(
          ([id, o]) => ({
            id,
            outletName: o.name,
            pct:
              totalHotelFoodCost > 0 ? (o.total / totalHotelFoodCost) * 100 : 0,
          })
        );
        const outletFoodCostTrend = Object.entries(outletFoodCostMap).map(
          ([id, o]) => {
            const sorted = o.dailyCosts.sort((a, b) =>
              a.date.localeCompare(b.date)
            );
            const first = sorted[0]?.cost ?? 0;
            const last = sorted[sorted.length - 1]?.cost ?? 0;
            let trend: "up" | "down" | "stable" = "stable";
            if (last > first) trend = "up";
            else if (last < first) trend = "down";
            return { id, outletName: o.name, trend, first, last };
          }
        );
        const outletMetrics = Object.entries(outletFoodCostMap)
          .map(([id, o]) => {
            const avg =
              outletAvgDailyFoodCost.find((x) => x.id === id)?.avgDailyCost ??
              0;
            const pct = outletFoodCostPct.find((x) => x.id === id)?.pct ?? 0;
            const trend =
              outletFoodCostTrend.find((x) => x.id === id)?.trend ?? "stable";
            return {
              id,
              outletName: o.name,
              total: o.total,
              avgDailyCost: avg,
              pctOfTotal: pct,
              trend,
            };
          })
          .sort((a, b) => b.total - a.total);

        // --- Outlet Beverage Cost Metrics ---
        const outletBeverageCostMap: Record<
          string,
          {
            name: string;
            total: number;
            days: Set<string>;
            dailyCosts: { date: string; cost: number }[];
          }
        > = {};
        filteredBeverageCostEntries.forEach((bce) => {
          if (!outletBeverageCostMap[bce.outletId]) {
            const outletName =
              outletDetailsMap.get(bce.outletId) || bce.outletId;
            outletBeverageCostMap[bce.outletId] = {
              name: outletName.split(" - ")[0],
              total: 0,
              days: new Set(),
              dailyCosts: [],
            };
          }
          outletBeverageCostMap[bce.outletId].total += bce.totalBeverageCost;
          const dayStr = formatDateFn(
            bce.date,
            "yyyy-MM-dd"
          );
          outletBeverageCostMap[bce.outletId].days.add(dayStr);
          outletBeverageCostMap[bce.outletId].dailyCosts.push({
            date: dayStr,
            cost: bce.totalBeverageCost,
          });
        });
        const totalHotelBeverageCost = Object.values(
          outletBeverageCostMap
        ).reduce((sum, o) => sum + o.total, 0);
        const outletAvgDailyBeverageCost = Object.entries(
          outletBeverageCostMap
        ).map(([id, o]) => ({
          id,
          outletName: o.name,
          avgDailyCost: o.days.size > 0 ? o.total / o.days.size : 0,
        }));
        const outletBeverageCostPct = Object.entries(outletBeverageCostMap).map(
          ([id, o]) => ({
            id,
            outletName: o.name,
            pct:
              totalHotelBeverageCost > 0
                ? (o.total / totalHotelBeverageCost) * 100
                : 0,
          })
        );
        const outletBeverageCostTrend = Object.entries(
          outletBeverageCostMap
        ).map(([id, o]) => {
          const sorted = o.dailyCosts.sort((a, b) =>
            a.date.localeCompare(b.date)
          );
          const first = sorted[0]?.cost ?? 0;
          const last = sorted[sorted.length - 1]?.cost ?? 0;
          let trend: "up" | "down" | "stable" = "stable";
          if (last > first) trend = "up";
          else if (last < first) trend = "down";
          return { id, outletName: o.name, trend, first, last };
        });
        const outletBeverageMetrics = Object.entries(outletBeverageCostMap)
          .map(([id, o]) => {
            const avg =
              outletAvgDailyBeverageCost.find((x) => x.id === id)
                ?.avgDailyCost ?? 0;
            const pct =
              outletBeverageCostPct.find((x) => x.id === id)?.pct ?? 0;
            const trend =
              outletBeverageCostTrend.find((x) => x.id === id)?.trend ??
              "stable";
            return {
              id,
              outletName: o.name,
              total: o.total,
              avgDailyCost: avg,
              pctOfTotal: pct,
              trend,
            };
          })
          .sort((a, b) => b.total - a.total);

        const currentDashboardData = {
          summaryStats: summaryStatsData,
          overviewChartData: overviewChartDataResult,
          costTrendsChartData: costTrendsChartDataResult,
          costDistributionChartData: costDistributionChartDataResult,
          outletPerformanceData: outletPerformanceDataResult,
          topFoodCategories: topFoodCategoriesData,
          topBeverageCategories: topBeverageCategoriesData,
          outletMetrics,
          outletBeverageMetrics, // new
          dailySummaries, // add this for stat card trends
        };
        setDashboardData(currentDashboardData as DashboardReportData);
        setIsLoadingData(false);

        if (
          numberOfDaysInPeriod > 0 &&
          currentDashboardData.summaryStats.totalFoodRevenue > 0 &&
          currentDashboardData.summaryStats.totalBeverageRevenue > 0
        ) {
          try {
            // Try enhanced analysis first if outlet is selected
            if (selectedOutletId && selectedOutletId !== "all") {
              console.log(
                "Running enhanced cost analysis with real data integration"
              );

              const analysisResult = await runEnhancedCostAnalysis(
                selectedOutletId,
                dateRange?.from || new Date(),
                dateRange?.to || new Date(),
                {
                  totalFoodRevenue:
                    currentDashboardData.summaryStats.totalFoodRevenue,
                  budgetFoodCostPct: avgBudgetFoodCostPct,
                  actualFoodCostPct:
                    currentDashboardData.summaryStats.avgFoodCostPct,
                  totalBeverageRevenue:
                    currentDashboardData.summaryStats.totalBeverageRevenue,
                  budgetBeverageCostPct: avgBudgetBeverageCostPct,
                  actualBeverageCostPct:
                    currentDashboardData.summaryStats.avgBeverageCostPct,
                },
                {
                  // Add business context based on current date
                  specialEvents: [],
                  marketConditions: "Normal market conditions",
                  staffingLevel: "normal",
                }
              );

              setAiInsights(analysisResult);

              // Create notifications for the analysis results (with smart filtering)
              const outletName =
                allOutlets.find((o) => o.id === selectedOutletId)?.name ||
                "Selected Outlet";
              
              if (shouldShowNotifications(analysisResult, outletName)) {
                await createAnalysisNotifications(analysisResult, outletName);
              }

              // Show success notification for enhanced analysis (only for significant alerts)
              if (['medium', 'high', 'critical'].includes(analysisResult.alertLevel)) {
                showToast.success(
                  `Enhanced AI analysis completed - Alert Level: ${analysisResult.alertLevel.toUpperCase()}`
                );
              }
            } else {
              // Fallback to basic analysis for "all outlets" view
              console.log("Running basic cost analysis for multi-outlet view");

              const aiInput: DashboardAdvisorInput = {
                numberOfDays: numberOfDaysInPeriod,
                totalFoodRevenue:
                  currentDashboardData.summaryStats.totalFoodRevenue,
                budgetFoodCostPct: avgBudgetFoodCostPct,
                actualFoodCostPct:
                  currentDashboardData.summaryStats.avgFoodCostPct,
                totalBeverageRevenue:
                  currentDashboardData.summaryStats.totalBeverageRevenue,
                budgetBeverageCostPct: avgBudgetBeverageCostPct,
                actualBeverageCostPct:
                  currentDashboardData.summaryStats.avgBeverageCostPct,
              };

              const analysisResult = await analyzeDashboardData(aiInput);
              setAiInsights(analysisResult);

              // Create notifications for basic analysis results (with smart filtering)
              if (shouldShowNotifications(analysisResult, "All Outlets")) {
                await createAnalysisNotifications(analysisResult, "All Outlets");
              }
            }
          } catch (aiErr) {
            console.error("Error fetching AI insights:", aiErr);

            // Try fallback to basic analysis if enhanced fails
            if (selectedOutletId && selectedOutletId !== "all") {
              console.log(
                "Enhanced analysis failed, falling back to basic analysis"
              );
              try {
                const aiInput: DashboardAdvisorInput = {
                  numberOfDays: numberOfDaysInPeriod,
                  totalFoodRevenue:
                    currentDashboardData.summaryStats.totalFoodRevenue,
                  budgetFoodCostPct: avgBudgetFoodCostPct,
                  actualFoodCostPct:
                    currentDashboardData.summaryStats.avgFoodCostPct,
                  totalBeverageRevenue:
                    currentDashboardData.summaryStats.totalBeverageRevenue,
                  budgetBeverageCostPct: avgBudgetBeverageCostPct,
                  actualBeverageCostPct:
                    currentDashboardData.summaryStats.avgBeverageCostPct,
                };

                const analysisResult = await analyzeDashboardData(aiInput);
                setAiInsights(analysisResult);

                // Create notifications for fallback analysis results (with smart filtering)
                const outletName =
                  allOutlets.find((o) => o.id === selectedOutletId)?.name ||
                  "Selected Outlet";
                
                if (shouldShowNotifications(analysisResult, outletName)) {
                  await createAnalysisNotifications(analysisResult, outletName);
                }

                showToast.warning(
                  "Using basic analysis mode - enhanced features unavailable"
                );
              } catch (fallbackErr) {
                console.error("Fallback analysis also failed:", fallbackErr);
                setAiError("AI analysis failed. Please try again later.");
                showToast.error("AI analysis failed");
                setAiInsights(null);
              }
            } else {
              setAiError(
                (aiErr as Error).message || "Failed to load AI analysis."
              );
              showToast.error((aiErr as Error).message);
              setAiInsights(null);
            }
          }
        } else {
          console.log("Insufficient data for AI analysis");
          setAiInsights(null);
          setAiError(
            "Insufficient data for cost analysis. Please ensure there is revenue data for the selected period."
          );
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        showToast.error((err as Error).message);
        setDashboardData(null);
        setAiInsights(null);
        setAiError((err as Error).message || "Failed to load dashboard data.");
        setIsLoadingData(false);
      } finally {
        setIsLoadingAIInsights(false);
      }
    }

    fetchDataForDashboard();
  }, [dateRange, selectedOutletId, selectedPropertyId, allOutlets, isFetchingOutlets]);

  const summaryStatsList: (SummaryStat & { trendData?: number[] })[] =
    useMemo(() => {
      if (!dashboardData || !dashboardData.summaryStats) {
        return [
          {
            title: "Total Food Revenue",
            value: "$0",
            icon: Utensils,
            trendData: [],
          },
          {
            title: "Total Beverage Revenue",
            value: "$0",
            icon: GlassWater,
            trendData: [],
          },
          {
            title: "Avg. Food Cost %",
            value: "0%",
            icon: Percent,
            iconColor: "text-green-500",
            trendData: [],
          },
          {
            title: "Avg. Beverage Cost %",
            value: "0%",
            icon: Percent,
            iconColor: "text-orange-500",
            trendData: [],
          },
        ];
      }
      const stats = dashboardData.summaryStats;
      // Use overviewChartData for cost % trends
      const foodCostPctTrend =
        dashboardData.overviewChartData?.map((d) => d.foodCostPct) || [];
      const beverageCostPctTrend =
        dashboardData.overviewChartData?.map((d) => d.beverageCostPct) || [];
      // For revenue trends, use dailySummaries if available
      const foodRevenueTrend = dashboardData.dailySummaries
        ? dashboardData.dailySummaries.map((s) => s.actualFoodRevenue || 0)
        : [];
      const beverageRevenueTrend = dashboardData.dailySummaries
        ? dashboardData.dailySummaries.map(
            (s) => s.actualBeverageRevenue || 0
          )
        : [];
      return [
        {
          title: "Total Food Revenue",
          value: `$${stats.totalFoodRevenue?.toLocaleString() ?? "N/A"}`,
          icon: Utensils,
          trendData: foodRevenueTrend,
        },
        {
          title: "Total Beverage Revenue",
          value: `$${stats.totalBeverageRevenue?.toLocaleString() ?? "N/A"}`,
          icon: GlassWater,
          trendData: beverageRevenueTrend,
        },
        {
          title: "Avg. Food Cost %",
          value: `${stats.avgFoodCostPct?.toFixed(1) ?? "N/A"}%`,
          icon: Percent,
          iconColor: "text-green-500",
          trendData: foodCostPctTrend,
        },
        {
          title: "Avg. Beverage Cost %",
          value: `${stats.avgBeverageCostPct?.toFixed(1) ?? "N/A"}%`,
          icon: Percent,
          iconColor: "text-orange-500",
          trendData: beverageCostPctTrend,
        },
      ];
    }, [dashboardData]);

  const TopCategoryList: React.FC<{
    title: string;
    icon: React.ElementType;
    data: TopCategoryDataPoint[] | undefined;
    isLoading: boolean;
    itemType: "Food" | "Beverage";
  }> = ({ title, icon: Icon, data, isLoading, itemType }) => {
    // For progress bar calculation
    const maxValue = data && data.length > 0 ? data[0].value : 1;
    if (isLoading || dateRange === undefined) {
      return (
        <Card className="shadow-md bg-card animate-fade-in">
          <CardHeader>
            <CardTitle className="font-headline text-lg flex items-center">
              <Icon className="mr-2 h-5 w-5 text-primary/70" />
              <Skeleton className="h-6 w-3/4 bg-muted" />
            </CardTitle>
            <CardDescription>
              <Skeleton className="h-4 w-full bg-muted" />
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-5 w-2/3 bg-muted" />
                <Skeleton className="h-5 w-1/4 bg-muted" />
              </div>
            ))}
          </CardContent>
        </Card>
      );
    }
    return (
      <Card className="shadow-md bg-card transition-transform duration-200 hover:scale-[1.02] hover:shadow-lg border-t-4 border-primary/60 animate-fade-in">
        <CardHeader className="pb-3">
          <CardTitle className="font-headline text-lg flex items-center">
            <Icon className="mr-2 h-5 w-5 text-primary/80" />
            {title}
          </CardTitle>
          <CardDescription>
            By total cost in the selected period
            {selectedOutletId && selectedOutletId !== "all"
              ? ` for ${
                  allOutlets
                    .find((o) => o.id === selectedOutletId)
                    ?.name.split(" - ")[0]
                }`
              : selectedPropertyId && selectedPropertyId !== "all"
              ? ` for ${
                  allProperties
                    .find((p) => p.id === selectedPropertyId)
                    ?.name
                }`
              : ""} 
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {data && data.length > 0 ? (
            <ul className="space-y-2.5">
              {data.map((cat, idx) => (
                <li
                  key={`${cat.name}-${idx}-${cat.value}`}
                  className="flex justify-between items-center text-sm group hover:bg-muted/60 rounded px-2 py-1 transition cursor-pointer"
                  tabIndex={0}
                  title={`$${cat.value.toFixed(2)} (${(
                    (cat.value / (data.reduce((a, b) => a + b.value, 0) || 1)) *
                    100
                  ).toFixed(1)}% of total)`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">
                      {getCategoryIcon(
                        cat.name,
                        getContextualFallback(itemType)
                      )}
                    </span>
                    <span className="text-muted-foreground truncate pr-2">
                      {cat.name}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 min-w-[120px] justify-end">
                    {/* Progress bar */}
                    <span className="h-2 w-16 bg-muted rounded-full overflow-hidden">
                      <span
                        className="block h-full bg-primary/70 group-hover:bg-primary transition-all"
                        style={{ width: `${(cat.value / maxValue) * 100}%` }}
                      />
                    </span>
                    <span className="font-medium font-code text-foreground">
                      ${cat.value.toFixed(2)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No {itemType.toLowerCase()} category data available for this
              selection.
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col flex-grow w-full space-y-6">
      {/* Welcome Message */}
      <Card className="shadow-sm bg-card border-l-4 border-l-primary">
        <CardContent className="p-4">
          <h1 className="text-2xl font-bold text-foreground">
            {getWelcomeMessage()}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSuperAdmin 
              ? "Manage and monitor all properties and outlets from this central dashboard."
              : "Monitor your cost analytics, trends, and performance metrics."
            }
          </p>
          {!isSuperAdmin && allProperties.length > 0 && (
            <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Building className="h-3 w-3 mr-1" />
              Viewing: {allProperties.find(p => p.id.toString() === selectedPropertyId)?.name || 'Property Data'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters Row */}
      <Card className="shadow-sm bg-card">
        <CardContent className="p-4">
          <div className={`grid gap-4 items-end ${isSuperAdmin ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
            <div>
              <label
                htmlFor="date-range-picker"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Select Date Range
              </label>
              {dateRange === undefined ? (
                <Skeleton className="h-10 w-full sm:w-[300px] bg-muted" />
              ) : (
                <DateRangePicker date={dateRange} setDate={setDateRange} />
              )}
            </div>
            {isSuperAdmin && (
              <div>
                <label
                  htmlFor="property-select-dashboard"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Select Property
                </label>
                {isFetchingOutlets ? (
                  <Skeleton className="h-10 w-full bg-muted" />
                ) : (
                  <Select
                    value={selectedPropertyId}
                    onValueChange={(value) => {
                      setSelectedPropertyId(value);
                      setSelectedOutletId("all"); // Reset outlet selection when property changes
                    }}
                  >
                    <SelectTrigger
                      id="property-select-dashboard"
                      className="w-full text-base md:text-sm"
                    >
                      <SelectValue placeholder="Select a property" />
                    </SelectTrigger>
                    <SelectContent>
                      {allProperties.map((property) => (
                        <SelectItem key={property.id} value={property.id.toString()}>
                          {property.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            <div>
              <label
                htmlFor="outlet-select-dashboard"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Select Outlet
              </label>
              {isFetchingOutlets ? (
                <Skeleton className="h-10 w-full bg-muted" />
              ) : (
                <Select
                  value={selectedOutletId}
                  onValueChange={setSelectedOutletId}
                >
                  <SelectTrigger
                    id="outlet-select-dashboard"
                    className="w-full text-base md:text-sm"
                  >
                    <SelectValue placeholder="Select an outlet" />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      // Debug logging
                      console.log("Debug outlet filtering:");
                      console.log("selectedPropertyId:", selectedPropertyId, typeof selectedPropertyId);
                      console.log("allOutlets:", allOutlets.map(o => ({
                        id: o.id,
                        name: o.name,
                        propertyId: o.propertyId,
                        propertyIdType: typeof o.propertyId
                      })));
                      
                      const filteredOutlets = allOutlets.filter((outlet) => {
                        if (selectedPropertyId === "all") return true;
                        if (outlet.id === "all") return true;
                        
                        // Try both string and number comparison
                        const propertyIdMatch = outlet.propertyId?.toString() === selectedPropertyId || 
                                              outlet.propertyId === parseInt(selectedPropertyId || "0");
                        
                        console.log(`Outlet ${outlet.name} (${outlet.id}): propertyId=${outlet.propertyId}, selectedPropertyId=${selectedPropertyId}, match=${propertyIdMatch}`);
                        return propertyIdMatch;
                      });
                      
                      console.log("Filtered outlets:", filteredOutlets.map(o => ({ id: o.id, name: o.name })));
                      
                      return filteredOutlets.map((outlet) => (
                        <SelectItem key={outlet.id} value={outlet.id}>
                          {outlet.name}
                        </SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards Row */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
        {isLoadingData || dateRange === undefined ? (
          <>
            {[...Array(4)].map((_, index) => (
              <StatCard
                key={index}
                isLoading={true}
                title=""
                value=""
                icon={DollarSign}
              />
            ))}
          </>
        ) : (
          summaryStatsList.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))
        )}
      </div>

      {/* Top Categories Row */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <TopCategoryList
          title="Top Food Categories"
          icon={Apple}
          data={dashboardData?.topFoodCategories}
          isLoading={isLoadingData}
          itemType="Food"
        />
        <TopCategoryList
          title="Top Beverage Categories"
          icon={Martini}
          data={dashboardData?.topBeverageCategories}
          isLoading={isLoadingData}
          itemType="Beverage"
        />
      </div>

      {/* Enhanced AI Cost Advisor Section */}
      <EnhancedCostAdvisorSection
        isLoading={isLoadingAIInsights}
        insights={aiInsights}
        error={aiError}
        outletName={
          selectedOutletId === "all"
            ? selectedPropertyId === "all"
              ? "All Outlets"
              : `${allProperties.find((p) => p.id === selectedPropertyId)?.name || "Selected Property"} - All Outlets`
            : allOutlets.find((o) => o.id === selectedOutletId)?.name ||
              "Selected Outlet"
        }
        dateRange={
          dateRange
            ? `${formatDateFn(dateRange.from!, "MMM dd")} - ${formatDateFn(
                dateRange.to!,
                "MMM dd, yyyy"
              )}`
            : ""
        }
        onRefresh={() => {
          // Manually trigger data refetch
          setIsLoadingData(true);
          setIsLoadingAIInsights(true);
          // The useEffect will automatically trigger when these states change
        }}
        showRefreshButton={!isLoadingAIInsights}
        onRequestNotifications={requestNotifications}
      />

      {/* Charts Grid */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-1 md:grid-cols-1">
        {/* Overview Chart Card (Main Bar Chart) */}
        <Card className="shadow-md bg-card">
          <CardHeader>
            <CardTitle className="font-headline text-xl">
              Costs Overview (Daily Hotel %)
            </CardTitle>
            <CardDescription>
              Hotel Food & Beverage cost percentages over the selected period.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-4 flex items-center justify-center min-h-[200px] h-[45vw] sm:h-72">
            <div className="w-full h-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                {isLoadingData ||
                dateRange === undefined ||
                !dashboardData?.overviewChartData ? (
                  <Skeleton className="h-full w-full bg-muted" />
                ) : (
                  <ChartContainer
                    config={overviewChartConfig}
                    className="h-full w-full"
                  >
                    <BarChart
                      data={dashboardData.overviewChartData}
                      margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        className="stroke-border/50"
                      />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis
                        unit="%"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        stroke="hsl(var(--muted-foreground))"
                        domain={[0, "dataMax + 5"]}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dashed" />}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar
                        dataKey="foodCostPct"
                        fill="var(--color-foodCostPct)"
                        radius={4}
                        name="Food Cost %"
                      />
                      <Bar
                        dataKey="beverageCostPct"
                        fill="var(--color-beverageCostPct)"
                        radius={4}
                        name="Bev Cost %"
                      />
                    </BarChart>
                  </ChartContainer>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Cost Trends (Line Chart) */}
        <Card className="shadow-md bg-card md:col-span-2 lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Cost Trends</CardTitle>
            <CardDescription>
              {selectedOutletId && selectedOutletId !== "all"
                ? `Food & Bev cost % trend for ${
                    allOutlets.find((o) => o.id === selectedOutletId)?.name ||
                    "selected outlet"
                  } (vs Hotel Revenue).`
                : selectedPropertyId && selectedPropertyId !== "all"
                ? `Average daily cost % trends for ${
                    allProperties.find((p) => p.id === selectedPropertyId)?.name ||
                    "selected property"
                  }.`
                : "Average daily hotel cost % trends."}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-4 flex items-center justify-center min-h-[200px] h-[45vw] sm:h-72">
            <div className="w-full h-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                {isLoadingData ||
                dateRange === undefined ||
                !dashboardData?.costTrendsChartData ? (
                  <Skeleton className="h-full w-full bg-muted" />
                ) : (
                  <ChartContainer
                    config={overviewChartConfig}
                    className="h-full w-full"
                  >
                    <RechartsLine
                      data={dashboardData.costTrendsChartData}
                      margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        className="stroke-border/50"
                      />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis
                        unit="%"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        stroke="hsl(var(--muted-foreground))"
                        domain={[0, "dataMax + 5"]}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" />}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Line
                        type="monotone"
                        dataKey="foodCostPct"
                        stroke="var(--color-foodCostPct)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        name="Food Cost %"
                      />
                      <Line
                        type="monotone"
                        dataKey="beverageCostPct"
                        stroke="var(--color-beverageCostPct)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        name="Bev Cost %"
                      />
                    </RechartsLine>
                  </ChartContainer>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cost Distribution by Outlet (Donut Chart) */}
        <Card className="shadow-md bg-card">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary">
              Cost Distribution by Outlet
            </CardTitle>
            <CardDescription>
              Total costs breakdown per outlet (Top 5).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-4 flex items-center justify-center min-h-[200px] h-[45vw] sm:h-72">
            <div className="w-full max-w-full overflow-x-auto flex justify-center items-center h-full">
              <div className="w-full" style={{ maxWidth: 320, height: "100%" }}>
                {isLoadingData ||
                dateRange === undefined ||
                !dashboardData?.costDistributionChartData ? (
                  <Skeleton className="h-full w-full bg-muted" />
                ) : (
                  <ChartContainer
                    config={donutChartConfig}
                    className="h-full w-full flex items-center justify-center"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={dashboardData.costDistributionChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={90}
                          innerRadius={55}
                          dataKey="value"
                          nameKey="name"
                          label={({
                            cx,
                            cy,
                            midAngle,
                            innerRadius,
                            outerRadius,
                            percent,
                            name,
                          }) => {
                            const radius =
                              innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x =
                              cx +
                              (radius + 20) *
                                Math.cos(-midAngle * (Math.PI / 180));
                            const y =
                              cy +
                              (radius + 20) *
                                Math.sin(-midAngle * (Math.PI / 180));
                            return (
                              <text
                                x={x}
                                y={y}
                                fill="hsl(var(--foreground))"
                                textAnchor={x > cx ? "start" : "end"}
                                dominantBaseline="central"
                                className="text-xs"
                              >
                                {`${name} ${(percent * 100).toFixed(0)}%`}
                              </text>
                            );
                          }}
                        >
                          {dashboardData.costDistributionChartData.map(
                            (entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            )
                          )}
                        </Pie>
                        <ChartTooltip
                          content={<ChartTooltipContent nameKey="name" />}
                        />
                        <RechartsLegend wrapperStyle={{ fontSize: "0.8rem" }} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Outlet Food Cost Metrics */}
        <Card className="shadow-md bg-card">
          <CardHeader>
            <CardTitle className="font-headline text-xl">
              Outlet Food Cost Metrics
            </CardTitle>
            <CardDescription>
              Key food cost metrics by outlet for the selected period.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] overflow-x-auto">
            {isLoadingData ||
            dateRange === undefined ||
            !dashboardData?.outletPerformanceData ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full bg-muted" />
                ))}
              </div>
            ) : dashboardData.outletPerformanceData &&
              dashboardData.outletPerformanceData.length > 0 ? (
              <div className="w-full max-w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left font-semibold">Outlet</th>
                      <th className="text-right font-semibold">Total Cost</th>
                      <th className="text-right font-semibold">
                        Avg Daily Cost
                      </th>
                      <th className="text-right font-semibold">% of Total</th>
                      <th className="text-center font-semibold">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.outletMetrics.map((item: any) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-2 pr-2 text-foreground">
                          {item.outletName}
                        </td>
                        <td className="py-2 pr-2 text-right font-mono">
                          $
                          {item.total.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </td>
                        <td className="py-2 pr-2 text-right font-mono">
                          $
                          {item.avgDailyCost.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </td>
                        <td className="py-2 pr-2 text-right font-mono">
                          {item.pctOfTotal.toFixed(1)}%
                        </td>
                        <td className="py-2 text-center">
                          {item.trend === "up" && (
                            <TrendingUp className="inline h-4 w-4 text-destructive" />
                          )}
                          {item.trend === "down" && (
                            <TrendingDown className="inline h-4 w-4 text-green-600" />
                          )}
                          {item.trend === "stable" && (
                            <span className="text-muted-foreground">–</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No food cost data available for this selection.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Outlet Beverage Cost Metrics */}
        <Card className="shadow-md bg-card">
          <CardHeader>
            <CardTitle className="font-headline text-xl">
              Outlet Beverage Cost Metrics
            </CardTitle>
            <CardDescription>
              Key beverage cost metrics by outlet for the selected period.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] overflow-x-auto">
            {isLoadingData ||
            dateRange === undefined ||
            !dashboardData?.outletBeverageMetrics ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full bg-muted" />
                ))}
              </div>
            ) : dashboardData.outletBeverageMetrics &&
              dashboardData.outletBeverageMetrics.length > 0 ? (
              <div className="w-full max-w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left font-semibold">Outlet</th>
                      <th className="text-right font-semibold">Total Cost</th>
                      <th className="text-right font-semibold">
                        Avg Daily Cost
                      </th>
                      <th className="text-right font-semibold">% of Total</th>
                      <th className="text-center font-semibold">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.outletBeverageMetrics.map((item: any) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-2 pr-2 text-foreground">
                          {item.outletName}
                        </td>
                        <td className="py-2 pr-2 text-right font-mono">
                          $
                          {item.total.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </td>
                        <td className="py-2 pr-2 text-right font-mono">
                          $
                          {item.avgDailyCost.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </td>
                        <td className="py-2 pr-2 text-right font-mono">
                          {item.pctOfTotal.toFixed(1)}%
                        </td>
                        <td className="py-2 text-center">
                          {item.trend === "up" && (
                            <TrendingUp className="inline h-4 w-4 text-destructive" />
                          )}
                          {item.trend === "down" && (
                            <TrendingDown className="inline h-4 w-4 text-green-600" />
                          )}
                          {item.trend === "stable" && (
                            <span className="text-muted-foreground">–</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No beverage cost data available for this selection.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add fade-in animation */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        /* Remove min-width for tables on mobile to prevent page overflow */
        table {
          min-width: 0 !important;
          max-width: 100%;
        }
      `}</style>
    </div>
  );
}
