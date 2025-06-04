
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { DailyHotelEntry } from "@/types";
import { saveDailyHotelEntryAction } from "@/actions/dailyEntryActions";
import { Timestamp } from "firebase/firestore";
import { ScrollArea } from "@/components/ui/scroll-area";

const dailyHotelEntrySchema = z.object({
  date: z.date({
    required_error: "A date is required.",
  }),
  hotelNetSales: z.coerce.number().min(0, "Hotel net sales cannot be negative."),
  budgetHotelFoodCostPct: z.coerce.number().min(0, "Budget food cost % cannot be negative.").max(100, "Budget food cost % cannot exceed 100."),
  budgetHotelBeverageCostPct: z.coerce.number().min(0, "Budget beverage cost % cannot be negative.").max(100, "Budget beverage cost % cannot exceed 100."),
  
  foodCostDetails: z.object({
    transferIns: z.array(z.object({ id: z.string(), toOutletId: z.string(), toOutletName: z.string(), description: z.string(), amount: z.coerce.number(), category: z.literal("Food") })).default([]),
    directPurchases: z.array(z.object({ id: z.string(), purchaseCategory: z.string(), description: z.string().optional(), amount: z.coerce.number(), costCategory: z.literal("Food") })).default([]),
    otherAdjustments: z.array(z.object({ id: z.string(), description: z.string(), amount: z.coerce.number(), type: z.string(), costCategory: z.literal("Food") })).default([]),
    transfersOut: z.array(z.object({ id: z.string(), description: z.string(), amount: z.coerce.number(), type: z.string(), costCategory: z.literal("Food") })).default([]),
    creditAdjustments: z.array(z.object({ id: z.string(), description: z.string(), amount: z.coerce.number(), type: z.string(), costCategory: z.literal("Food") })).default([]),
  }).default({ transferIns: [], directPurchases: [], otherAdjustments: [], transfersOut: [], creditAdjustments: [] }),

  beverageCostDetails: z.object({
    transferIns: z.array(z.object({ id: z.string(), toOutletId: z.string(), toOutletName: z.string(), description: z.string(), amount: z.coerce.number(), category: z.literal("Beverage") })).default([]),
    directPurchases: z.array(z.object({ id: z.string(), purchaseCategory: z.string(), description: z.string().optional(), amount: z.coerce.number(), costCategory: z.literal("Beverage") })).default([]),
    otherAdjustments: z.array(z.object({ id: z.string(), description: z.string(), amount: z.coerce.number(), type: z.string(), costCategory: z.literal("Beverage") })).default([]),
    transfersOut: z.array(z.object({ id: z.string(), description: z.string(), amount: z.coerce.number(), type: z.string(), costCategory: z.literal("Beverage") })).default([]),
    creditAdjustments: z.array(z.object({ id: z.string(), description: z.string(), amount: z.coerce.number(), type: z.string(), costCategory: z.literal("Beverage") })).default([]),
  }).default({ transferIns: [], directPurchases: [], otherAdjustments: [], transfersOut: [], creditAdjustments: [] }),
});

type DailyHotelEntryFormValues = z.infer<typeof dailyHotelEntrySchema>;

interface DailyEntryFormProps {
  initialData?: DailyHotelEntry | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function DailyEntryForm({ initialData, onSuccess, onCancel }: DailyEntryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<DailyHotelEntryFormValues>({
    resolver: zodResolver(dailyHotelEntrySchema),
    defaultValues: initialData
      ? {
          ...initialData,
          date: initialData.date instanceof Timestamp ? initialData.date.toDate() : new Date(initialData.date),
          foodCostDetails: initialData.foodCostDetails || { transferIns: [], directPurchases: [], otherAdjustments: [], transfersOut: [], creditAdjustments: [] },
          beverageCostDetails: initialData.beverageCostDetails || { transferIns: [], directPurchases: [], otherAdjustments: [], transfersOut: [], creditAdjustments: [] },
        }
      : {
          date: new Date(),
          hotelNetSales: 0,
          budgetHotelFoodCostPct: 0,
          budgetHotelBeverageCostPct: 0,
          foodCostDetails: { transferIns: [], directPurchases: [], otherAdjustments: [], transfersOut: [], creditAdjustments: [] },
          beverageCostDetails: { transferIns: [], directPurchases: [], otherAdjustments: [], transfersOut: [], creditAdjustments: [] },
        },
    mode: "onChange",
  });
  
  // Reset form if initialData changes (e.g. opening dialog for different entry)
   useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        date: initialData.date instanceof Timestamp ? initialData.date.toDate() : new Date(initialData.date),
        foodCostDetails: initialData.foodCostDetails || { transferIns: [], directPurchases: [], otherAdjustments: [], transfersOut: [], creditAdjustments: [] },
        beverageCostDetails: initialData.beverageCostDetails || { transferIns: [], directPurchases: [], otherAdjustments: [], transfersOut: [], creditAdjustments: [] },
      });
    } else {
      form.reset({
        date: new Date(),
        hotelNetSales: 0,
        budgetHotelFoodCostPct: 0,
        budgetHotelBeverageCostPct: 0,
        foodCostDetails: { transferIns: [], directPurchases: [], otherAdjustments: [], transfersOut: [], creditAdjustments: [] },
        beverageCostDetails: { transferIns: [], directPurchases: [], otherAdjustments: [], transfersOut: [], creditAdjustments: [] },
      });
    }
  }, [initialData, form]);


  async function onSubmit(data: DailyHotelEntryFormValues) {
    setIsSubmitting(true);
    try {
       const entryToSave = {
        ...data,
        // Date is already a JS Date object from the form
      };
      
      await saveDailyHotelEntryAction(entryToSave);
      toast({
        title: "Entry Saved",
        description: `Financial entry for ${format(data.date, "PPP")} has been successfully saved.`,
      });
      onSuccess();
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 h-full flex flex-col">
        <ScrollArea className="flex-grow pr-3">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Entry Date</FormLabel>
                    <DatePicker 
                      date={field.value} 
                      setDate={field.onChange} 
                      className="w-full"
                      disabled={!!initialData} // Disable date change if editing
                    />
                    {initialData && <FormMessage>Date cannot be changed for existing entries.</FormMessage>}
                    {!initialData && <FormMessage />}
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
            
            <div className="space-y-4 pt-4">
                <h3 className="text-lg font-medium border-b pb-2">Food Cost Details</h3>
                <p className="text-sm text-muted-foreground">Detailed food cost entry (Transfer Ins, Direct Purchases, etc.) will be available here in a future update.</p>
            </div>

            <div className="space-y-4 pt-4">
                <h3 className="text-lg font-medium border-b pb-2">Beverage Cost Details</h3>
                <p className="text-sm text-muted-foreground">Detailed beverage cost entry (Transfer Ins, Direct Purchases, etc.) will be available here in a future update.</p>
            </div>
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 pt-4 border-t mt-auto">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Saving..." : "Save Entry"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
