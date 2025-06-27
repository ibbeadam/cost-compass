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
} from "lucide-react";
import {
  subDays,
  format as formatDateFn,
  eachDayOfInterval,
  differenceInDays,
  isValid as isValidDate,
} from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";

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
import { db } from "@/lib/firebase";
import type {
  Outlet,
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
import { getCategoryIcon } from "./TopCategoryIcons";

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
  const [selectedOutletId, setSelectedOutletId] = useState<string | undefined>(
    "all"
  );

  const [dashboardData, setDashboardData] =
    useState<DashboardReportData | null>(null);
  const [isFetchingOutlets, setIsFetchingOutlets] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [aiInsights, setAiInsights] = useState<DashboardAdvisorOutput | null>(
    null
  );
  const [isLoadingAIInsights, setIsLoadingAIInsights] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    setDateRange({
      from: subDays(new Date(), 29),
      to: new Date(),
    });
  }, []);

  useEffect(() => {
    const fetchFirestoreOutlets = async () => {
      setIsFetchingOutlets(true);
      try {
        const outletsCol = collection(db!, "outlets");
        const outletsSnapshot = await getDocs(outletsCol);
        const fetchedOutletsFromDB = outletsSnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Outlet)
        );

        setAllOutlets([
          { id: "all", name: "All Outlets" },
          ...fetchedOutletsFromDB,
        ]);
      } catch (error) {
        console.error("Error fetching outlets:", error);
        showToast.error((error as Error).message);
        setAllOutlets([{ id: "all", name: "All Outlets" }]);
      }
      setIsFetchingOutlets(false);
    };
    fetchFirestoreOutlets();
  }, []);

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
      if (!db) {
        console.error(
          "Firestore 'db' instance is not available. Cannot fetch dashboard data."
        );
        showToast.error("Firestore is not initialized.");
        setIsLoadingData(false);
        setIsLoadingAIInsights(false);
        return;
      }
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
        const from = Timestamp.fromDate(dateRange.from);
        const to = Timestamp.fromDate(dateRange.to);

        const summariesQuery = query(
          collection(db!, "dailyFinancialSummaries"),
          where("date", ">=", from),
          where("date", "<=", to),
          orderBy("date", "asc")
        );
        const summariesSnapshot = await getDocs(summariesQuery);
        const dailySummaries: DailyFinancialSummary[] =
          summariesSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              date:
                data.date instanceof Timestamp ? data.date.toDate() : data.date,
              createdAt: data.createdAt
                ? data.createdAt instanceof Timestamp
                  ? data.createdAt.toDate()
                  : data.createdAt
                : undefined,
              updatedAt: data.updatedAt
                ? data.updatedAt instanceof Timestamp
                  ? data.updatedAt.toDate()
                  : data.updatedAt
                : undefined,
            } as DailyFinancialSummary;
          });

        const summariesMap = new Map<string, DailyFinancialSummary>();
        dailySummaries.forEach((s) =>
          summariesMap.set(formatDateFn(s.date as Date, "yyyy-MM-dd"), s)
        );

        const foodCostQuery = query(
          collection(db!, "foodCostEntries"),
          where("date", ">=", from),
          where("date", "<=", to)
        );
        const foodCostSnapshot = await getDocs(foodCostQuery);
        const foodCostEntries: FoodCostEntry[] = foodCostSnapshot.docs.map(
          (doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              date:
                data.date instanceof Timestamp ? data.date.toDate() : data.date,
            } as FoodCostEntry;
          }
        );

        const beverageCostQuery = query(
          collection(db!, "beverageCostEntries"),
          where("date", ">=", from),
          where("date", "<=", to)
        );
        const beverageCostSnapshot = await getDocs(beverageCostQuery);
        const beverageCostEntries: BeverageCostEntry[] =
          beverageCostSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              date:
                data.date instanceof Timestamp ? data.date.toDate() : data.date,
            } as BeverageCostEntry;
          });

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

        dailySummaries.forEach((summary) => {
          totalHotelFoodRevenue += summary.actual_food_revenue || 0;
          totalHotelBeverageRevenue += summary.actual_beverage_revenue || 0;
          totalHotelActualFoodCost += summary.actual_food_cost || 0;
          totalHotelActualBeverageCost += summary.actual_beverage_cost || 0;
          if (summary.budget_food_cost_pct != null) {
            sumOfBudgetFoodCostPct += summary.budget_food_cost_pct;
            countBudgetFoodCostPct++;
          }
          if (summary.budget_beverage_cost_pct != null) {
            sumOfBudgetBeverageCostPct += summary.budget_beverage_cost_pct;
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
          foodCostEntries
            .filter((fce) => fce.outlet_id === selectedOutletId)
            .forEach((fce) => {
              outletTotalFoodCost += fce.total_food_cost;
              const daySummary = summariesMap.get(
                formatDateFn(
                  fce.date instanceof Timestamp
                    ? fce.date.toDate()
                    : (fce.date as Date),
                  "yyyy-MM-dd"
                )
              );
              if (daySummary)
                outletTotalFoodRevenueSumForPct +=
                  daySummary.actual_food_revenue || 0;
            });
          avgActualFoodCostPctVal =
            outletTotalFoodRevenueSumForPct > 0
              ? (outletTotalFoodCost / outletTotalFoodRevenueSumForPct) * 100
              : 0;

          let outletTotalBeverageCost = 0;
          let outletTotalBeverageRevenueSumForPct = 0;
          beverageCostEntries
            .filter((bce) => bce.outlet_id === selectedOutletId)
            .forEach((bce) => {
              outletTotalBeverageCost += bce.total_beverage_cost;
              const daySummary = summariesMap.get(
                formatDateFn(
                  bce.date instanceof Timestamp
                    ? bce.date.toDate()
                    : (bce.date as Date),
                  "yyyy-MM-dd"
                )
              );
              if (daySummary)
                outletTotalBeverageRevenueSumForPct +=
                  daySummary.actual_beverage_revenue || 0;
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
            const foodRev = summary?.actual_food_revenue || 0;
            const bevRev = summary?.actual_beverage_revenue || 0;
            const actualFoodCost = summary?.actual_food_cost || 0;
            const actualBevCost = summary?.actual_beverage_cost || 0;
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
            const foodRev = summary?.actual_food_revenue || 0;
            const bevRev = summary?.actual_beverage_revenue || 0;
            const outletDayFoodCost = foodCostEntries
              .filter(
                (fce) =>
                  fce.outlet_id === selectedOutletId &&
                  formatDateFn(
                    fce.date instanceof Timestamp
                      ? fce.date.toDate()
                      : fce.date,
                    "yyyy-MM-dd"
                  ) === dayStr
              )
              .reduce((sum, fce) => sum + fce.total_food_cost, 0);
            const outletDayBeverageCost = beverageCostEntries
              .filter(
                (bce) =>
                  bce.outlet_id === selectedOutletId &&
                  formatDateFn(
                    bce.date instanceof Timestamp
                      ? bce.date.toDate()
                      : bce.date,
                    "yyyy-MM-dd"
                  ) === dayStr
              )
              .reduce((sum, bce) => sum + bce.total_beverage_cost, 0);
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
        foodCostEntries.forEach((fce) => {
          const outletName =
            outletDetailsMap.get(fce.outlet_id) || fce.outlet_id;
          if (!costByOutletMap[fce.outlet_id])
            costByOutletMap[fce.outlet_id] = {
              totalCost: 0,
              name: outletName.split(" - ")[0],
            };
          costByOutletMap[fce.outlet_id].totalCost += fce.total_food_cost;
        });
        beverageCostEntries.forEach((bce) => {
          const outletName =
            outletDetailsMap.get(bce.outlet_id) || bce.outlet_id;
          if (!costByOutletMap[bce.outlet_id])
            costByOutletMap[bce.outlet_id] = {
              totalCost: 0,
              name: outletName.split(" - ")[0],
            };
          costByOutletMap[bce.outlet_id].totalCost += bce.total_beverage_cost;
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
              const dailyFoodCostForOutlet = foodCostEntries
                .filter(
                  (fce) =>
                    fce.outlet_id === outlet.id &&
                    formatDateFn(
                      fce.date instanceof Timestamp
                        ? fce.date.toDate()
                        : fce.date,
                      "yyyy-MM-dd"
                    ) === dayStr
                )
                .reduce((sum, fce) => sum + fce.total_food_cost, 0);
              if (dailyFoodCostForOutlet > 0) {
                totalOutletFoodCost += dailyFoodCostForOutlet;
                const summary = summariesMap.get(dayStr);
                if (summary && summary.actual_food_revenue)
                  totalHotelFoodRevenueOnOutletDays +=
                    summary.actual_food_revenue;
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

        // --- Fetch and Process Top Categories ---
        async function fetchDetailsInBatches<
          T extends FoodCostDetail | BeverageCostDetail
        >(
          entryIds: string[],
          collectionName: "foodCostDetails" | "beverageCostDetails",
          idFieldName: "food_cost_entry_id" | "beverage_cost_entry_id"
        ): Promise<T[]> {
          const details: T[] = [];
          const BATCH_SIZE = 25;
          for (let i = 0; i < entryIds.length; i += BATCH_SIZE) {
            const batchIds = entryIds.slice(i, i + BATCH_SIZE);
            if (batchIds.length > 0) {
              const detailsQuery = query(
                collection(db!, collectionName),
                where(idFieldName, "in", batchIds)
              );
              const snapshot = await getDocs(detailsQuery);
              snapshot.docs.forEach((doc) => {
                const data = doc.data();
                details.push({
                  id: doc.id,
                  ...data,
                  // Ensure category_id exists, provide a fallback if necessary for typing
                  category_id: data.category_id || "unknown_category",
                } as T);
              });
            }
          }
          return details;
        }

        const relevantFoodEntries =
          selectedOutletId && selectedOutletId !== "all"
            ? foodCostEntries.filter((e) => e.outlet_id === selectedOutletId)
            : foodCostEntries;
        const foodEntryIds = relevantFoodEntries.map((e) => e.id);

        const relevantBeverageEntries =
          selectedOutletId && selectedOutletId !== "all"
            ? beverageCostEntries.filter(
                (e) => e.outlet_id === selectedOutletId
              )
            : beverageCostEntries;
        const beverageEntryIds = relevantBeverageEntries.map((e) => e.id);

        const [
          allFoodCategories,
          allBeverageCategories,
          allFoodDetailsData,
          allBeverageDetailsData,
        ] = await Promise.all([
          getFoodCategoriesAction(),
          getBeverageCategoriesAction(),
          foodEntryIds.length > 0
            ? fetchDetailsInBatches<FoodCostDetail>(
                foodEntryIds,
                "foodCostDetails",
                "food_cost_entry_id"
              )
            : Promise.resolve([]),
          beverageEntryIds.length > 0
            ? fetchDetailsInBatches<BeverageCostDetail>(
                beverageEntryIds,
                "beverageCostDetails",
                "beverage_cost_entry_id"
              )
            : Promise.resolve([]),
        ]);

        const foodCategoryMap = new Map(
          allFoodCategories.map((c) => [c.id, c.name])
        );
        const foodCategoryCosts: Record<string, number> = {};
        allFoodDetailsData.forEach((detail) => {
          foodCategoryCosts[detail.category_id] =
            (foodCategoryCosts[detail.category_id] || 0) + detail.cost;
        });
        const topFoodCategoriesData: TopCategoryDataPoint[] = Object.entries(
          foodCategoryCosts
        )
          .map(([categoryId, totalCost]) => ({
            name: foodCategoryMap.get(categoryId) || "Unknown Category",
            value: parseFloat(totalCost.toFixed(2)),
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 3);

        const beverageCategoryMap = new Map(
          allBeverageCategories.map((c) => [c.id, c.name])
        );
        const beverageCategoryCosts: Record<string, number> = {};
        allBeverageDetailsData.forEach((detail) => {
          beverageCategoryCosts[detail.category_id] =
            (beverageCategoryCosts[detail.category_id] || 0) + detail.cost;
        });
        const topBeverageCategoriesData: TopCategoryDataPoint[] =
          Object.entries(beverageCategoryCosts)
            .map(([categoryId, totalCost]) => ({
              name: beverageCategoryMap.get(categoryId) || "Unknown Category",
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
        foodCostEntries.forEach((fce) => {
          if (!outletFoodCostMap[fce.outlet_id]) {
            const outletName =
              outletDetailsMap.get(fce.outlet_id) || fce.outlet_id;
            outletFoodCostMap[fce.outlet_id] = {
              name: outletName.split(" - ")[0],
              total: 0,
              days: new Set(),
              dailyCosts: [],
            };
          }
          outletFoodCostMap[fce.outlet_id].total += fce.total_food_cost;
          const dayStr = formatDateFn(
            fce.date instanceof Timestamp ? fce.date.toDate() : fce.date,
            "yyyy-MM-dd"
          );
          outletFoodCostMap[fce.outlet_id].days.add(dayStr);
          outletFoodCostMap[fce.outlet_id].dailyCosts.push({
            date: dayStr,
            cost: fce.total_food_cost,
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
        beverageCostEntries.forEach((bce) => {
          if (!outletBeverageCostMap[bce.outlet_id]) {
            const outletName =
              outletDetailsMap.get(bce.outlet_id) || bce.outlet_id;
            outletBeverageCostMap[bce.outlet_id] = {
              name: outletName.split(" - ")[0],
              total: 0,
              days: new Set(),
              dailyCosts: [],
            };
          }
          outletBeverageCostMap[bce.outlet_id].total += bce.total_beverage_cost;
          const dayStr = formatDateFn(
            bce.date instanceof Timestamp ? bce.date.toDate() : bce.date,
            "yyyy-MM-dd"
          );
          outletBeverageCostMap[bce.outlet_id].days.add(dayStr);
          outletBeverageCostMap[bce.outlet_id].dailyCosts.push({
            date: dayStr,
            cost: bce.total_beverage_cost,
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

              // Create notifications for the analysis results
              const outletName =
                allOutlets.find((o) => o.id === selectedOutletId)?.name ||
                "Selected Outlet";
              await createAnalysisNotifications(analysisResult, outletName);

              // Show success notification for enhanced analysis
              showToast.success(
                `Enhanced AI analysis completed - Alert Level: ${analysisResult.alertLevel.toUpperCase()}`
              );
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

              // Create notifications for basic analysis results
              await createAnalysisNotifications(analysisResult, "All Outlets");
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

                // Create notifications for fallback analysis results
                const outletName =
                  allOutlets.find((o) => o.id === selectedOutletId)?.name ||
                  "Selected Outlet";
                await createAnalysisNotifications(analysisResult, outletName);

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
  }, [dateRange, selectedOutletId, allOutlets, isFetchingOutlets]);

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
        ? dashboardData.dailySummaries.map((s) => s.actual_food_revenue || 0)
        : [];
      const beverageRevenueTrend = dashboardData.dailySummaries
        ? dashboardData.dailySummaries.map(
            (s) => s.actual_beverage_revenue || 0
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
              : ""}
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {data && data.length > 0 ? (
            <ul className="space-y-2.5">
              {data.map((cat, idx) => (
                <li
                  key={cat.name}
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
                        itemType === "Food" ? "🍎" : "🍸"
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
      {/* Filters Row */}
      <Card className="shadow-sm bg-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
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
                    {allOutlets.map((outlet) => (
                      <SelectItem key={outlet.id} value={outlet.id}>
                        {outlet.name}
                      </SelectItem>
                    ))}
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
            ? "All Outlets"
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
