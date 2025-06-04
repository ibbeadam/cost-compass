
// @ts-nocheck
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { Download, AlertTriangle } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";

import { Header } from "@/components/layout/Header";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DailySummaryTable } from "./DailySummaryTable";
import { DrillDownModal } from "./DrillDownModal";
import { CostChartToggle } from "./CostChartToggle";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { db } from "@/lib/firebase"; // Import Firestore instance
import { outlets as mockOutlets, generateDailyCosts, generateTransferItems, generateHistoricalData, getHistoricalPercentagesForOutlet } from "@/lib/mockData";
import type { DailyCostData, TransferItem, HistoricalDataPoint, CostFluctuationInput, Outlet } from "@/types";
import { detectCostFluctuation } from '@/ai/flows/cost-fluctuation-detection';
import { useToast } from "@/hooks/use-toast";

export default function DashboardClient() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [allOutlets, setAllOutlets] = useState<Outlet[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<string | undefined>(undefined);
  
  const [dailySummaryData, setDailySummaryData] = useState<DailyCostData[]>([]);
  const [transferItems, setTransferItems] = useState<TransferItem[] | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState<DailyCostData | null>(null);
  
  const [isFetchingOutlets, setIsFetchingOutlets] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const fetchFirestoreOutlets = async () => {
      setIsFetchingOutlets(true);
      try {
        if (!db) {
          throw new Error("Firestore database instance is not available.");
        }
        const outletsCol = collection(db, 'outlets');
        const outletsSnapshot = await getDocs(outletsCol);
        const fetchedOutlets = outletsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Outlet));
        
        if (fetchedOutlets.length > 0) {
          setAllOutlets(fetchedOutlets);
          if (!selectedOutletId) {
            setSelectedOutletId(fetchedOutlets[0].id);
          }
        } else {
          toast({
            title: "No outlets found in database",
            description: "Using sample outlet data. Please add outlets to your 'outlets' collection in Firestore.",
            duration: 7000,
          });
          setAllOutlets(mockOutlets); 
           if (!selectedOutletId && mockOutlets.length > 0) {
            setSelectedOutletId(mockOutlets[0].id);
          }
        }
      } catch (error) {
        console.error("Error fetching outlets from Firestore:", error);
        toast({
          variant: "destructive",
          title: "Error fetching outlets",
          description: `Could not load outlets from database. Using sample data. ${error.message}`,
          duration: 7000,
        });
        setAllOutlets(mockOutlets); 
        if (!selectedOutletId && mockOutlets.length > 0) {
          setSelectedOutletId(mockOutlets[0].id);
        }
      }
      setIsFetchingOutlets(false);
    };

    fetchFirestoreOutlets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]); 

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!selectedDate || isFetchingOutlets || allOutlets.length === 0) {
        if(!isFetchingOutlets && allOutlets.length === 0){
            setIsLoadingData(false);
        }
        return;
      }
      setIsLoadingData(true);
      await new Promise(resolve => setTimeout(resolve, 300)); 

      const summary = allOutlets.map(outlet => generateDailyCosts(selectedDate, outlet));
      setDailySummaryData(summary); // This sets raw data, AI effect will pick it up

      const currentSelectedOutletExists = allOutlets.some(o => o.id === selectedOutletId);
      let targetOutletId = selectedOutletId;

      if (!targetOutletId || !currentSelectedOutletExists) {
        targetOutletId = allOutlets[0]?.id;
        if (targetOutletId && targetOutletId !== selectedOutletId) {
            setSelectedOutletId(targetOutletId); 
        }
      }
      
      if (targetOutletId) {
        const history = generateHistoricalData(targetOutletId, selectedDate, 30);
        setHistoricalData(history);
      } else {
        setHistoricalData([]);
      }
      setIsLoadingData(false);
    };

    loadDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, allOutlets, selectedOutletId, isFetchingOutlets]);


  // AI Anomaly Detection Effect
  useEffect(() => {
    const runAnomalyDetectionLogic = async () => {
      // Ensure data is loaded, not already processing, and there's data to process
      if (isLoadingData || isAiProcessing || dailySummaryData.length === 0 || !selectedDate) {
        return;
      }
      
      // Check if all items already have AI results to prevent unnecessary runs
      const needsProcessing = dailySummaryData.some(item => item.isAnomalous === undefined);
      if (!needsProcessing) {
        return;
      }

      setIsAiProcessing(true);
      const processingDataSnapshot = [...dailySummaryData]; // Take a snapshot for this run
      const results = [];
      let anomaliesFoundThisRun = 0;

      for (let i = 0; i < processingDataSnapshot.length; i++) {
        const item = processingDataSnapshot[i];

        // Skip if already processed in a previous incomplete run or by other means
        if (item.isAnomalous !== undefined) {
          results.push(item);
          if (item.isAnomalous) anomaliesFoundThisRun++;
          continue;
        }

        const currentDate = selectedDate ? new Date(selectedDate) : new Date();
        const historicalPcts = getHistoricalPercentagesForOutlet(item.outletId, currentDate, 30);

        const aiInput: CostFluctuationInput = {
          outlet: item.outletName,
          date: item.date,
          foodCostPercentage: item.foodCostPct,
          beverageCostPercentage: item.beverageCostPct,
          historicalFoodCostPercentages: historicalPcts.food,
          historicalBeverageCostPercentages: historicalPcts.beverage,
        };
        
        try {
          const result = await detectCostFluctuation(aiInput);
          const updatedItem = { ...item, isAnomalous: result.isAnomalous, anomalyExplanation: result.explanation };
          results.push(updatedItem);

          if (result.isAnomalous) {
            anomaliesFoundThisRun++;
            toast({
              variant: "destructive",
              title: ( <div className="flex items-center"> <AlertTriangle className="mr-2 h-5 w-5" /> Anomaly Detected! </div> ),
              description: `${item.outletName}: ${result.explanation}`,
              duration: 7000,
            });
          }
        } catch (error) {
          console.error("Error detecting cost fluctuation for", item.outletName, error);
          results.push({ ...item, isAnomalous: false, anomalyExplanation: "AI analysis failed." });
          toast({
            variant: "destructive",
            title: "AI Analysis Error",
            description: `Could not analyze ${item.outletName}. ${error.message.includes("429") ? "Rate limit may have been exceeded." : "Please try again later."}`,
            duration: 7000,
          });
        }
        
        // Delay between API calls, but not after the last one
        if (i < processingDataSnapshot.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 4500)); // 4.5 seconds delay
        }
      }
      
      setDailySummaryData(results);
      setIsAiProcessing(false);

      if (processingDataSnapshot.length > 0 && selectedDate) {
        const successfullyProcessedCount = results.filter(r => r.anomalyExplanation !== "AI analysis failed.").length;
        if (successfullyProcessedCount < results.length && successfullyProcessedCount > 0) {
            toast({
                title: "AI Analysis Partially Complete",
                description: `${anomaliesFoundThisRun} anomalies found. Some items could not be analyzed.`,
                duration: 5000,
            });
        } else if (successfullyProcessedCount === 0 && results.length > 0) {
             toast({
                variant: "destructive",
                title: "AI Analysis Failed",
                description: `Could not analyze cost data for ${format(selectedDate, "PPP")}.`,
                duration: 5000,
            });
        } else if (results.length > 0) {
            toast({
                title: "AI Analysis Complete",
                description: anomaliesFoundThisRun > 0 ? `${anomaliesFoundThisRun} potential cost anomalies identified for ${format(selectedDate, "PPP")}.` : `No significant cost anomalies detected for ${format(selectedDate, "PPP")}.`,
                duration: 5000,
            });
        }
      }
    };
    
    runAnomalyDetectionLogic();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingData, dailySummaryData, selectedDate, toast, isAiProcessing]); // Added isAiProcessing to deps. The logic inside runAnomalyDetectionLogic now handles re-entry.


  const handleRowClick = async (rowData: DailyCostData) => {
    setSelectedRowData(rowData);
    await new Promise(resolve => setTimeout(resolve, 150));
    if(selectedDate) {
        const items = generateTransferItems(selectedDate, rowData.outletId);
        setTransferItems(items);
    }
    setIsModalOpen(true);
  };

  const handleExport = () => {
    if (dailySummaryData.length === 0) {
      toast({ title: "No data to export", description: "Please select a date with available data."});
      return;
    }
    const headers = ["Date", "Outlet", "Food Revenue", "Food Cost", "Food Cost %", "Beverage Revenue", "Beverage Cost", "Beverage Cost %", "Is Anomalous", "Anomaly Explanation"];
    const rows = dailySummaryData.map(item => [
      item.date,
      `"${item.outletName.replace(/"/g, '""')}"`, 
      item.foodRevenue,
      item.foodCost,
      item.foodCostPct,
      item.beverageRevenue,
      item.beverageCost,
      item.beverageCostPct,
      item.isAnomalous ? "Yes" : "No",
      `"${(item.anomalyExplanation || '').replace(/"/g, '""')}"` 
    ]);
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cost_summary_${selectedDate ? format(selectedDate, 'yyyy-MM-dd') : 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Successful", description: "Data exported as CSV."});
  };
  
  const currentSelectedOutletForChart = useMemo(() => allOutlets.find(o => o.id === selectedOutletId), [selectedOutletId, allOutlets]);


  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <Card className="mb-6 shadow-lg bg-card">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label htmlFor="date-picker" className="block text-sm font-medium text-foreground mb-1">Select Date</label>
                <DatePicker date={selectedDate} setDate={setSelectedDate} className="w-full" />
              </div>
              <div>
                <label htmlFor="outlet-select" className="block text-sm font-medium text-foreground mb-1">Outlet (for Line Chart)</label>
                {isFetchingOutlets ? (
                  <Skeleton className="h-10 w-full bg-muted" />
                ) : (
                  <Select value={selectedOutletId} onValueChange={setSelectedOutletId}>
                    <SelectTrigger id="outlet-select" className="w-full text-base md:text-sm">
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
              <Button onClick={handleExport} variant="outline" className="w-full md:w-auto md:self-end text-base md:text-sm">
                <Download className="mr-2 h-4 w-4" />
                Export Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {(isAiProcessing || isFetchingOutlets) && (
          <div className="mb-4 flex items-center justify-center p-3 bg-primary/10 text-primary rounded-md border border-primary/30">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="font-medium">
              {isFetchingOutlets ? "Fetching outlet data..." : (isAiProcessing ? "AI analyzing cost data..." : "Processing...")}
            </span>
          </div>
        )}

        <div className="mb-6">
          {isLoadingData || isFetchingOutlets ? (
            <Card className="shadow-lg bg-card">
              <CardContent className="p-6">
                <Skeleton className="h-8 w-3/4 mb-4 bg-muted" />
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2 bg-muted" />)}
              </CardContent>
            </Card>
          ) : (
            <DailySummaryTable data={dailySummaryData} onRowClick={handleRowClick} />
          )}
        </div>

        <div>
         {isLoadingData || isFetchingOutlets ? (
            <Card className="shadow-lg bg-card">
              <CardContent className="p-6">
                <Skeleton className="h-8 w-1/2 mb-4 bg-muted" />
                <Skeleton className="h-96 w-full bg-muted" />
              </CardContent>
            </Card>
          ) : (
            <CostChartToggle dailyData={dailySummaryData} historicalData={historicalData} selectedOutletName={currentSelectedOutletForChart?.name}/>
          )}
        </div>

        {selectedRowData && (
          <DrillDownModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            data={transferItems}
            selectedEntry={selectedRowData}
          />
        )}
      </main>
      <footer className="text-center p-4 text-sm text-muted-foreground border-t mt-auto">
        © {new Date().getFullYear()} Cost Compass. All rights reserved.
      </footer>
    </div>
  );
}
