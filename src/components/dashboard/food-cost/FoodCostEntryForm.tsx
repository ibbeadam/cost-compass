
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
import type { DailyHotelEntry, CostDetailCategory } from "@/types";
import { saveDailyHotelEntryAction } from "@/actions/dailyEntryActions";
import { Timestamp } from "firebase/firestore";
import { ScrollArea } from "@/components/ui/scroll-area";

// Helper to ensure CostDetailCategory has all its arrays initialized
// This could be moved to a utils file if used elsewhere
function initializeCostDetailCategory(details?: Partial<CostDetailCategory>): CostDetailCategory {
  return {
    transferIns: details?.transferIns || [],
    directPurchases: details?.directPurchases || [],
    otherAdjustments: details?.otherAdjustments || [],
    transfersOut: details?.transfersOut || [],
    creditAdjustments: details?.creditAdjustments || [],
  };
}

const foodCostEntrySchema = z.object({
  date: z.date({
    required_error: "A date is required.",
  }),
  hotelNetSales: z.coerce.number().min(0, "Hotel net sales cannot be negative."),
  budgetHotelFoodCostPct: z.coerce.number().min(0, "Budget food cost % cannot be negative.").max(100, "Budget food cost % cannot exceed 100."),
  
  foodCostDetails: z.object({
    transferIns: z.array(z.object({ id: z.string(), toOutletId: z.string(), toOutletName: z.string(), description: z.string(), amount: z.coerce.number(), category: z.literal("Food") })).default([]),
    directPurchases: z.array(z.object({ id: z.string(), purchaseCategory: z.string(), description: z.string().optional(), amount: z.coerce.number(), costCategory: z.literal("Food") })).default([]),
    otherAdjustments: z.array(z.object({ id: z.string(), description: z.string(), amount: z.coerce.number(), type: z.string(), costCategory: z.literal("Food") })).default([]),
    transfersOut: z.array(z.object({ id: z.string(), description: z.string(), amount: z.coerce.number(), type: z.string(), costCategory: z.literal("Food") })).default([]),
    creditAdjustments: z.array(z.object({ id: z.string(), description: z.string(), amount: z.coerce.number(), type: z.string(), costCategory: z.literal("Food") })).default([]),
  }).default({ transferIns: [], directPurchases: [], otherAdjustments: [], transfersOut: [], creditAdjustments: [] }),
});

type FoodCostEntryFormValues = z.infer<typeof foodCostEntrySchema>;

interface FoodCostEntryFormProps {
  initialData?: DailyHotelEntry | null; // Full entry for context, even if only editing food parts
  onSuccess: () => void;
  onCancel: () => void;
}

export default function FoodCostEntryForm({ initialData, onSuccess, onCancel }: FoodCostEntryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<FoodCostEntryFormValues>({
    resolver: zodResolver(foodCostEntrySchema),
    defaultValues: initialData
      ? {
          date: initialData.date instanceof Timestamp ? initialData.date.toDate() : new Date(initialData.date),
          hotelNetSales: initialData.hotelNetSales,
          budgetHotelFoodCostPct: initialData.budgetHotelFoodCostPct,
          foodCostDetails: initialData.foodCostDetails ? initializeCostDetailCategory(initialData.foodCostDetails) : initializeCostDetailCategory(undefined),
        }
      : {
          date: new Date(),
          hotelNetSales: 0,
          budgetHotelFoodCostPct: 0,
          foodCostDetails: initializeCostDetailCategory(undefined),
        },
    mode: "onChange",
  });
  
   useEffect(() => {
    if (initialData) {
      form.reset({
        date: initialData.date instanceof Timestamp ? initialData.date.toDate() : new Date(initialData.date),
        hotelNetSales: initialData.hotelNetSales,
        budgetHotelFoodCostPct: initialData.budgetHotelFoodCostPct,
        foodCostDetails: initialData.foodCostDetails ? initializeCostDetailCategory(initialData.foodCostDetails) : initializeCostDetailCategory(undefined),
      });
    } else {
      form.reset({
        date: new Date(),
        hotelNetSales: 0,
        budgetHotelFoodCostPct: 0,
        foodCostDetails: initializeCostDetailCategory(undefined),
      });
    }
  }, [initialData, form]);


  async function onSubmit(data: FoodCostEntryFormValues) {
    setIsSubmitting(true);
    try {
      // Construct the payload for saveDailyHotelEntryAction
      // This action expects an object that can be spread into DailyHotelEntry, 
      // minus id, createdAt, updatedAt, and calculated fields. Date is passed as JS Date.
      const payload: Omit<DailyHotelEntry, 'id' | 'createdAt' | 'updatedAt' | 'calculatedNetFoodCost' | 'calculatedActualFoodCostPct' | 'calculatedFoodCostVariancePct' | 'calculatedNetBeverageCost' | 'calculatedActualBeverageCostPct' | 'calculatedBeverageCostVariancePct'> & { date: Date } = {
        date: data.date,
        hotelNetSales: data.hotelNetSales,
        budgetHotelFoodCostPct: data.budgetHotelFoodCostPct,
        foodCostDetails: initializeCostDetailCategory(data.foodCostDetails),
        
        // Preserve beverage data if editing, or initialize if new
        budgetHotelBeverageCostPct: initialData?.budgetHotelBeverageCostPct ?? 0,
        beverageCostDetails: initialData?.beverageCostDetails ? initializeCostDetailCategory(initialData.beverageCostDetails) : initializeCostDetailCategory(undefined),
        
        // Preserve other fields like notes if they exist
        notes: initialData?.notes,
      };

      if (payload.notes === undefined) {
        delete (payload as any).notes; // Clean up notes if undefined
      }
      
      await saveDailyHotelEntryAction(payload);
      toast({
        title: "Food Cost Entry Saved",
        description: `Food cost entry for ${format(data.date, "PPP")} has been successfully saved.`,
      });
      onSuccess();
    } catch (error) {
      console.error("Error saving food cost entry:", error);
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

            <h3 className="text-lg font-medium border-b pb-2">Hotel & Food Cost Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="hotelNetSales"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hotel Net Sales (Overall)</FormLabel>
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
            </div>
            
            <div className="space-y-4 pt-4">
                <h3 className="text-lg font-medium border-b pb-2">Food Cost Details</h3>
                <p className="text-sm text-muted-foreground">Detailed food cost breakdown (Transfer Ins, Direct Purchases, etc.) will be available here in a future update. Current save includes this section as empty.</p>
                {/* Placeholder for foodCostDetails sub-form components if needed later */}
            </div>

          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 pt-4 border-t mt-auto">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Saving..." : "Save Food Entry"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
