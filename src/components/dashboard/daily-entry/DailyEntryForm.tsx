
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react"; // Added useEffect here
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { DailyHotelEntry, TransferInItem, DirectPurchaseItem, CostAdjustmentItem } from "@/types";
import { saveDailyHotelEntryAction, getDailyHotelEntryAction } from "@/actions/dailyEntryActions";
import { Timestamp } from "firebase/firestore";

const dailyHotelEntrySchema = z.object({
  date: z.date({
    required_error: "A date is required.",
  }),
  hotelNetSales: z.coerce.number().min(0, "Hotel net sales cannot be negative."),
  budgetHotelFoodCostPct: z.coerce.number().min(0, "Budget food cost % cannot be negative.").max(100, "Budget food cost % cannot exceed 100."),
  budgetHotelBeverageCostPct: z.coerce.number().min(0, "Budget beverage cost % cannot be negative.").max(100, "Budget beverage cost % cannot exceed 100."),
  
  // Placeholder for more complex fields to be added later
  foodCostDetails: z.object({
    transferIns: z.array(z.object({ id: z.string(), toOutletId: z.string(), toOutletName: z.string(), description: z.string(), amount: z.number(), category: z.literal("Food") })).default([]),
    directPurchases: z.array(z.object({ id: z.string(), purchaseCategory: z.string(), description: z.string().optional(), amount: z.number(), costCategory: z.literal("Food") })).default([]),
    otherAdjustments: z.array(z.object({ id: z.string(), description: z.string(), amount: z.number(), type: z.string(), costCategory: z.literal("Food") })).default([]),
    transfersOut: z.array(z.object({ id: z.string(), description: z.string(), amount: z.number(), type: z.string(), costCategory: z.literal("Food") })).default([]),
    creditAdjustments: z.array(z.object({ id: z.string(), description: z.string(), amount: z.number(), type: z.string(), costCategory: z.literal("Food") })).default([]),
  }).default({ transferIns: [], directPurchases: [], otherAdjustments: [], transfersOut: [], creditAdjustments: [] }),

  beverageCostDetails: z.object({
    transferIns: z.array(z.object({ id: z.string(), toOutletId: z.string(), toOutletName: z.string(), description: z.string(), amount: z.number(), category: z.literal("Beverage") })).default([]),
    directPurchases: z.array(z.object({ id: z.string(), purchaseCategory: z.string(), description: z.string().optional(), amount: z.number(), costCategory: z.literal("Beverage") })).default([]),
    otherAdjustments: z.array(z.object({ id: z.string(), description: z.string(), amount: z.number(), type: z.string(), costCategory: z.literal("Beverage") })).default([]),
    transfersOut: z.array(z.object({ id: z.string(), description: z.string(), amount: z.number(), type: z.string(), costCategory: z.literal("Beverage") })).default([]),
    creditAdjustments: z.array(z.object({ id: z.string(), description: z.string(), amount: z.number(), type: z.string(), costCategory: z.literal("Beverage") })).default([]),
  }).default({ transferIns: [], directPurchases: [], otherAdjustments: [], transfersOut: [], creditAdjustments: [] }),
});

type DailyHotelEntryFormValues = z.infer<typeof dailyHotelEntrySchema>;

interface DailyEntryFormProps {
  initialData?: DailyHotelEntry | null; // To pre-fill form if editing
}

export default function DailyEntryForm({ initialData }: DailyEntryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEntry, setIsLoadingEntry] = useState(false);
  const { toast } = useToast();

  const defaultValues: Partial<DailyHotelEntryFormValues> = initialData
    ? {
        ...initialData,
        date: initialData.date instanceof Timestamp ? initialData.date.toDate() : new Date(initialData.date),
        // TODO: Map foodCostDetails and beverageCostDetails if they exist in initialData
      }
    : {
        date: new Date(),
        hotelNetSales: 0,
        budgetHotelFoodCostPct: 0,
        budgetHotelBeverageCostPct: 0,
        foodCostDetails: { transferIns: [], directPurchases: [], otherAdjustments: [], transfersOut: [], creditAdjustments: [] },
        beverageCostDetails: { transferIns: [], directPurchases: [], otherAdjustments: [], transfersOut: [], creditAdjustments: [] },
      };

  const form = useForm<DailyHotelEntryFormValues>({
    resolver: zodResolver(dailyHotelEntrySchema),
    defaultValues,
    mode: "onChange",
  });

  const selectedDate = form.watch("date");

  useEffect(() => {
    async function fetchEntryForDate(date: Date | undefined) {
      if (!date) return;
      setIsLoadingEntry(true);
      try {
        const entryId = format(date, "yyyy-MM-dd");
        const existingEntry = await getDailyHotelEntryAction(entryId);
        if (existingEntry) {
          form.reset({
            ...existingEntry,
            date: existingEntry.date instanceof Timestamp ? existingEntry.date.toDate() : new Date(existingEntry.date),
            // Ensure all sub-details are defaulted if not present
            foodCostDetails: existingEntry.foodCostDetails || { transferIns: [], directPurchases: [], otherAdjustments: [], transfersOut: [], creditAdjustments: [] },
            beverageCostDetails: existingEntry.beverageCostDetails || { transferIns: [], directPurchases: [], otherAdjustments: [], transfersOut: [], creditAdjustments: [] },
          });
          toast({ title: "Entry Loaded", description: `Displaying existing entry for ${format(date, "PPP")}.`});
        } else {
           form.reset({ // Reset to defaults for a new entry but keep the selected date
            date: date,
            hotelNetSales: 0,
            budgetHotelFoodCostPct: 0,
            budgetHotelBeverageCostPct: 0,
            foodCostDetails: { transferIns: [], directPurchases: [], otherAdjustments: [], transfersOut: [], creditAdjustments: [] },
            beverageCostDetails: { transferIns: [], directPurchases: [], otherAdjustments: [], transfersOut: [], creditAdjustments: [] },
          });
        }
      } catch (error) {
        console.error("Error fetching daily entry:", error);
        toast({ variant: "destructive", title: "Error Fetching Entry", description: (error as Error).message });
      } finally {
        setIsLoadingEntry(false);
      }
    }
    if(selectedDate && !initialData){ // Only fetch if no initial data was explicitly passed (i.e., not an edit scenario from a list)
        fetchEntryForDate(selectedDate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, form.reset, toast, initialData]);


  async function onSubmit(data: DailyHotelEntryFormValues) {
    setIsSubmitting(true);
    try {
      const entryToSave: Omit<DailyHotelEntry, 'id' | 'createdAt' | 'updatedAt' | 'calculatedNetFoodCost' | 'calculatedActualFoodCostPct' | 'calculatedFoodCostVariancePct' | 'calculatedNetBeverageCost' | 'calculatedActualBeverageCostPct' | 'calculatedBeverageCostVariancePct'> & { date: Date } = {
        date: data.date, // Date object from form
        hotelNetSales: data.hotelNetSales,
        budgetHotelFoodCostPct: data.budgetHotelFoodCostPct,
        budgetHotelBeverageCostPct: data.budgetHotelBeverageCostPct,
        foodCostDetails: data.foodCostDetails, // Will be empty arrays for now
        beverageCostDetails: data.beverageCostDetails, // Will be empty arrays for now
      };

      await saveDailyHotelEntryAction(entryToSave);
      toast({
        title: "Entry Saved",
        description: `Financial entry for ${format(data.date, "PPP")} has been successfully saved.`,
      });
    } catch (error) {
      console.error("Error saving daily entry:", error);
      toast({
        variant: "destructive",
        title: "Error Saving Entry",
        description: (error as Error).message || "Could not save the entry. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Entry Date</FormLabel>
                <DatePicker date={field.value} setDate={field.onChange} className="w-full"/>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <h3 className="text-lg font-medium border-b pb-2">Hotel Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="hotelNetSales"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hotel Net Sales</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 15000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="budgetHotelFoodCostPct"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Budget Food Cost %</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 30" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="budgetHotelBeverageCostPct"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Budget Beverage Cost %</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 25" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Placeholder for Food Cost Details - To be implemented with dynamic fields */}
        <div className="space-y-4 pt-4">
            <h3 className="text-lg font-medium border-b pb-2">Food Cost Details</h3>
            <p className="text-sm text-muted-foreground">Detailed food cost entry (Transfer Ins, Direct Purchases, etc.) will be available here in a future update.</p>
        </div>

        {/* Placeholder for Beverage Cost Details - To be implemented with dynamic fields */}
        <div className="space-y-4 pt-4">
            <h3 className="text-lg font-medium border-b pb-2">Beverage Cost Details</h3>
            <p className="text-sm text-muted-foreground">Detailed beverage cost entry (Transfer Ins, Direct Purchases, etc.) will be available here in a future update.</p>
        </div>

        <div className="flex justify-end gap-2 pt-8">
          <Button type="submit" disabled={isSubmitting || isLoadingEntry}>
            {(isSubmitting || isLoadingEntry) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoadingEntry ? 'Loading Entry...' : (isSubmitting ? "Saving..." : "Save Entry")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
