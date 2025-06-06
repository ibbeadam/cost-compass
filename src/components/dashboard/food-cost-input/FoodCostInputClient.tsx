
"use client";

import { useState, useEffect, useCallback }
from "react";
import { format, isValid } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Outlet, Category, FoodCostEntry, FoodCostDetail } from "@/types";
import { getOutletsAction, getFoodCategoriesAction } from "@/actions/foodCostActions"; // Reusing from foodCostActions
import FoodCostInputForm from "./FoodCostInputForm";
import { getFoodCostEntryWithDetailsAction } from "@/actions/foodCostActions";

export default function FoodCostInputClient() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<string | undefined>(undefined);
  const [foodCategories, setFoodCategories] = useState<Category[]>([]);
  
  const [isLoadingOutlets, setIsLoadingOutlets] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingEntry, setIsLoadingEntry] = useState(false);
  
  const [currentEntry, setCurrentEntry] = useState<(FoodCostEntry & { details: FoodCostDetail[] }) | null>(null);
  const [formKey, setFormKey] = useState<string>("initial-key"); // To re-mount form

  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      setIsLoadingOutlets(true);
      setIsLoadingCategories(true);
      try {
        const [fetchedOutlets, fetchedCategories] = await Promise.all([
          getOutletsAction(),
          getFoodCategoriesAction()
        ]);
        setOutlets(fetchedOutlets);
        if (fetchedOutlets.length > 0 && !selectedOutletId) {
          setSelectedOutletId(fetchedOutlets[0].id);
        }
        setFoodCategories(fetchedCategories);
      } catch (error) {
        toast({ variant: "destructive", title: "Error fetching initial data", description: (error as Error).message });
      } finally {
        setIsLoadingOutlets(false);
        setIsLoadingCategories(false);
      }
    }
    fetchData();
  }, [toast, selectedOutletId]); // Removed selectedOutletId from dep array as it's set inside, can cause loop if not handled carefully. It was already there, reconsidering this comment. Keeping as is, as original intent.

  const fetchEntryData = useCallback(async () => {
    if (!selectedOutletId) {
      setCurrentEntry(null);
      // Use a consistent key format, considering selectedDate might also be undefined here.
      const dateKeyPart = (selectedDate && selectedDate instanceof Date && isValid(selectedDate))
                          ? selectedDate.toISOString()
                          : (selectedDate ? 'invalid-date' : 'no-date');
      setFormKey(`${dateKeyPart}-no-outlet-nodata`);
      return;
    }

    if (!selectedDate) {
      setCurrentEntry(null);
      setFormKey(`no-date-${selectedOutletId}-nodata`);
      return;
    }

    // At this point, selectedDate is guaranteed to be a Date object (not undefined).
    // Now, we check if it's a *valid* Date.
    if (!isValid(selectedDate)) {
      setCurrentEntry(null);
      // selectedDate is a Date object here, but not valid.
      // toISOString() would throw for invalid dates. Use a placeholder.
      setFormKey(`invalid-date-${selectedOutletId}-nodata`);
      return;
    }

    // If we reach here, selectedDate is a valid Date object, and selectedOutletId is truthy.
    setIsLoadingEntry(true);
    try {
      // All calls to selectedDate.toISOString() are now safe.
      const entry = await getFoodCostEntryWithDetailsAction(selectedDate, selectedOutletId);
      setCurrentEntry(entry);
      setFormKey(`${selectedDate.toISOString()}-${selectedOutletId}-${entry?.id || 'new'}`);
    } catch (error) {
      toast({ variant: "destructive", title: "Error fetching cost entry", description: (error as Error).message });
      setCurrentEntry(null);
      // selectedDate is guaranteed to be a valid Date here due to the checks above.
      setFormKey(`${selectedDate.toISOString()}-${selectedOutletId}-error`);
    } finally {
      setIsLoadingEntry(false);
    }
  }, [selectedDate, selectedOutletId, toast, setIsLoadingEntry, setCurrentEntry, setFormKey]);


  useEffect(() => {
    fetchEntryData();
  }, [fetchEntryData]);


  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const handleOutletChange = (outletId: string) => {
    setSelectedOutletId(outletId);
  };
  
  const onFormSuccess = () => {
    toast({ title: "Food Cost Entry Saved", description: "The entry has been successfully saved." });
    fetchEntryData(); // Refresh data after save
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div>
          <label htmlFor="date-picker-food-cost" className="block text-sm font-medium text-foreground mb-1">Select Date</label>
          <DatePicker 
            date={selectedDate} 
            setDate={handleDateChange} 
            className="w-full"
            id="date-picker-food-cost"
          />
        </div>
        <div>
          <label htmlFor="outlet-select-food-cost" className="block text-sm font-medium text-foreground mb-1">Select Outlet</label>
          {isLoadingOutlets ? (
            <Skeleton className="h-10 w-full bg-muted" />
          ) : (
            <Select value={selectedOutletId} onValueChange={handleOutletChange}>
              <SelectTrigger id="outlet-select-food-cost" className="w-full">
                <SelectValue placeholder="Select an outlet" />
              </SelectTrigger>
              <SelectContent>
                {outlets.map((outlet) => (
                  <SelectItem key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {isLoadingCategories || isLoadingEntry || !selectedDate || !selectedOutletId ? (
        <div className="mt-6">
          <Skeleton className="h-10 w-1/3 mb-4 bg-muted" />
          <Skeleton className="h-40 w-full bg-muted" />
        </div>
      ) : (
         <FoodCostInputForm
            key={formKey}
            selectedDate={selectedDate}
            selectedOutletId={selectedOutletId}
            foodCategories={foodCategories}
            existingEntry={currentEntry}
            onSuccess={onFormSuccess}
          />
      )}
    </div>
  );
}

