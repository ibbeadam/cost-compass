
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
  FormDescription,
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

const hotelDailyEntryFormSchema = z.object({
  date: z.date({
    required_error: "A date is required.",
  }),
  // Food related
  hotelNetFoodSales: z.coerce.number().min(0, "Net food sales cannot be negative.").optional().default(0),
  budgetHotelFoodCostPct: z.coerce.number().min(0, "Budget food cost % cannot be negative.").max(100, "Budget food cost % cannot exceed 100.").optional().default(0),
  entFood: z.coerce.number().optional().default(0),
  ocFood: z.coerce.number().optional().default(0),
  otherFoodCredit: z.coerce.number().optional().default(0),
  // Beverage related
  hotelNetBeverageSales: z.coerce.number().min(0, "Net beverage sales cannot be negative.").optional().default(0),
  budgetHotelBeverageCostPct: z.coerce.number().min(0, "Budget beverage cost % cannot be negative.").max(100, "Budget beverage cost % cannot exceed 100.").optional().default(0),
  entBeverage: z.coerce.number().optional().default(0),
  ocBeverage: z.coerce.number().optional().default(0),
  otherBeverageCredit: z.coerce.number().optional().default(0),
  // Overall notes (optional)
  notes: z.string().optional(),
});

type HotelDailyEntryFormValues = z.infer<typeof hotelDailyEntryFormSchema>;

interface HotelDailyEntryFormProps {
  initialData?: DailyHotelEntry | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function HotelDailyEntryForm({ initialData, onSuccess, onCancel }: HotelDailyEntryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const defaultValues: HotelDailyEntryFormValues = {
    date: initialData?.date instanceof Timestamp ? initialData.date.toDate() : (initialData?.date ? new Date(initialData.date) : new Date()),
    hotelNetFoodSales: initialData?.hotelNetFoodSales ?? 0,
    budgetHotelFoodCostPct: initialData?.budgetHotelFoodCostPct ?? 0,
    entFood: initialData?.entFood ?? 0,
    ocFood: initialData?.ocFood ?? 0,
    otherFoodCredit: initialData?.otherFoodCredit ?? 0,
    hotelNetBeverageSales: initialData?.hotelNetBeverageSales ?? 0,
    budgetHotelBeverageCostPct: initialData?.budgetHotelBeverageCostPct ?? 0,
    entBeverage: initialData?.entBeverage ?? 0,
    ocBeverage: initialData?.ocBeverage ?? 0,
    otherBeverageCredit: initialData?.otherBeverageCredit ?? 0,
    notes: initialData?.notes ?? '',
  };

  const form = useForm<HotelDailyEntryFormValues>({
    resolver: zodResolver(hotelDailyEntryFormSchema),
    defaultValues,
    mode: "onChange",
  });
  
   useEffect(() => {
    if (initialData) {
      form.reset({
        date: initialData.date instanceof Timestamp ? initialData.date.toDate() : new Date(initialData.date),
        hotelNetFoodSales: initialData.hotelNetFoodSales ?? 0,
        budgetHotelFoodCostPct: initialData.budgetHotelFoodCostPct ?? 0,
        entFood: initialData.entFood ?? 0,
        ocFood: initialData.ocFood ?? 0,
        otherFoodCredit: initialData.otherFoodCredit ?? 0,
        hotelNetBeverageSales: initialData.hotelNetBeverageSales ?? 0,
        budgetHotelBeverageCostPct: initialData.budgetHotelBeverageCostPct ?? 0,
        entBeverage: initialData.entBeverage ?? 0,
        ocBeverage: initialData.ocBeverage ?? 0,
        otherBeverageCredit: initialData.otherBeverageCredit ?? 0,
        notes: initialData.notes ?? '',
      });
    } else {
      form.reset({
        date: new Date(), // Default to today for new entries
        hotelNetFoodSales: 0,
        budgetHotelFoodCostPct: 0,
        entFood: 0,
        ocFood: 0,
        otherFoodCredit: 0,
        hotelNetBeverageSales: 0,
        budgetHotelBeverageCostPct: 0,
        entBeverage: 0,
        ocBeverage: 0,
        otherBeverageCredit: 0,
        notes: '',
      });
    }
  }, [initialData, form]);


  async function onSubmit(data: HotelDailyEntryFormValues) {
    setIsSubmitting(true);
    try {
      // Construct the payload for saveDailyHotelEntryAction
      // This action expects a partial object of DailyHotelEntry, plus a JS Date.
      const payload: Partial<Omit<DailyHotelEntry, 'id' | 'createdAt' | 'updatedAt' | 'date'>> & { date: Date } = {
        date: data.date,
        hotelNetFoodSales: data.hotelNetFoodSales,
        budgetHotelFoodCostPct: data.budgetHotelFoodCostPct,
        entFood: data.entFood,
        ocFood: data.ocFood,
        otherFoodCredit: data.otherFoodCredit,
        hotelNetBeverageSales: data.hotelNetBeverageSales,
        budgetHotelBeverageCostPct: data.budgetHotelBeverageCostPct,
        entBeverage: data.entBeverage,
        ocBeverage: data.ocBeverage,
        otherBeverageCredit: data.otherBeverageCredit,
        notes: data.notes,
        // DO NOT include foodCostDetails or beverageCostDetails here,
        // so they are preserved by merge in the action if not explicitly managed by this form.
      };
      
      await saveDailyHotelEntryAction(payload);
      toast({
        title: "Hotel Daily Entry Saved",
        description: `Entry for ${format(data.date, "PPP")} has been successfully saved.`,
      });
      onSuccess();
    } catch (error) {
      console.error("Error saving hotel daily entry:", error);
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
          <div className="space-y-6 p-1">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Entry Date</FormLabel>
                  <DatePicker 
                    date={field.value} 
                    setDate={field.onChange} 
                    className="w-full md:w-1/2"
                    disabled={!!initialData} // Disable date change if editing
                  />
                  {initialData && <FormMessage className="text-xs">Date cannot be changed for existing entries.</FormMessage>}
                  {!initialData && <FormMessage />}
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-4 p-4 border rounded-md shadow-sm bg-card">
                    <h3 className="text-lg font-medium border-b pb-2 text-primary">Food Section</h3>
                    <FormField
                    control={form.control}
                    name="hotelNetFoodSales"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Net Food Sales</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g., 12000" {...field} />
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
                            <Input type="number" step="0.01" placeholder="e.g., 30.5" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="entFood"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Entertainment Food Cost</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g., 150" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">Cost of food for entertainment purposes.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="ocFood"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Officer's Check / Comp Food Cost</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g., 80" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">Cost of complimentary food (officer's check, etc.).</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="otherFoodCredit"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Other Food Credits/Adjustments</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g., -25 (for credit)" {...field} />
                        </FormControl>
                         <FormDescription className="text-xs">Other adjustments impacting food cost (use negative for credits).</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>

                <div className="space-y-4 p-4 border rounded-md shadow-sm bg-card">
                    <h3 className="text-lg font-medium border-b pb-2 text-primary">Beverage Section</h3>
                    <FormField
                    control={form.control}
                    name="hotelNetBeverageSales"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Net Beverage Sales</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g., 8000" {...field} />
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
                            <Input type="number" step="0.01" placeholder="e.g., 22.5" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="entBeverage"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Entertainment Beverage Cost</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g., 120" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">Cost of beverages for entertainment.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="ocBeverage"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Officer's Check / Comp Beverage Cost</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g., 60" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">Cost of complimentary beverages.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="otherBeverageCredit"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Other Beverage Credits/Adjustments</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g., -15 (for credit)" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">Other adjustments impacting beverage cost.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Any specific notes for this day's entry..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 pt-4 border-t mt-auto">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Saving..." : (initialData ? "Save Changes" : "Add Hotel Entry")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
