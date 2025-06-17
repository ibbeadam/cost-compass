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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { format, isValid } from "date-fns";
import type { DailyFinancialSummary } from "@/types";
import { saveDailyFinancialSummaryAction } from "@/actions/dailyFinancialSummaryActions";
import { Timestamp } from "firebase/firestore";
import { ScrollArea } from "@/components/ui/scroll-area";

const summaryFormSchema = z.object({
  date: z.date({
    required_error: "A date is required.",
  }),
  food_revenue: z.coerce.number().min(0, "Food revenue cannot be negative."),
  budget_food_cost_pct: z.coerce.number().min(0, "Budget food cost % cannot be negative.").max(100, "Budget food cost % cannot exceed 100."),
  ent_food: z.coerce.number().optional().default(0),
  oc_food: z.coerce.number().optional().default(0),
  other_food_adjustment: z.coerce.number().optional().default(0),
  
  beverage_revenue: z.coerce.number().min(0, "Beverage revenue cannot be negative."),
  budget_beverage_cost_pct: z.coerce.number().min(0, "Budget beverage cost % cannot be negative.").max(100, "Budget beverage cost % cannot exceed 100."),
  entertainment_beverage_cost: z.coerce.number().optional().default(0),
  officer_check_comp_beverage: z.coerce.number().optional().default(0),
  other_beverage_adjustments: z.coerce.number().optional().default(0),
  
  notes: z.string().max(500, "Notes cannot exceed 500 characters.").optional(),
});

type FormValues = z.infer<typeof summaryFormSchema>;

interface DailyFinancialSummaryFormProps {
  initialData?: DailyFinancialSummary | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function DailyFinancialSummaryForm({ initialData, onSuccess, onCancel }: DailyFinancialSummaryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const defaultValues: FormValues = {
    date: initialData?.date instanceof Timestamp ? initialData.date.toDate() : (initialData?.date ? new Date(initialData.date) : new Date()),
    food_revenue: initialData?.food_revenue ?? 0,
    budget_food_cost_pct: initialData?.budget_food_cost_pct ?? 0,
    ent_food: initialData?.ent_food ?? 0,
    oc_food: initialData?.oc_food ?? 0,
    other_food_adjustment: initialData?.other_food_adjustment ?? 0,
    beverage_revenue: initialData?.beverage_revenue ?? 0,
    budget_beverage_cost_pct: initialData?.budget_beverage_cost_pct ?? 0,
    entertainment_beverage_cost: initialData?.entertainment_beverage_cost ?? 0,
    officer_check_comp_beverage: initialData?.officer_check_comp_beverage ?? 0,
    other_beverage_adjustments: initialData?.other_beverage_adjustments ?? 0,
    notes: initialData?.notes ?? '',
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(summaryFormSchema),
    defaultValues,
    mode: "onChange",
  });
  
   useEffect(() => {
    if (initialData) {
      form.reset({
        date: initialData.date instanceof Timestamp ? initialData.date.toDate() : (isValid(new Date(initialData.date)) ? new Date(initialData.date) : new Date()),
        food_revenue: initialData.food_revenue ?? 0,
        budget_food_cost_pct: initialData.budget_food_cost_pct ?? 0,
        ent_food: initialData.ent_food ?? 0,
        oc_food: initialData.oc_food ?? 0,
        other_food_adjustment: initialData.other_food_adjustment ?? 0,
        beverage_revenue: initialData.beverage_revenue ?? 0,
        budget_beverage_cost_pct: initialData.budget_beverage_cost_pct ?? 0,
        entertainment_beverage_cost: initialData.entertainment_beverage_cost ?? 0,
        officer_check_comp_beverage: initialData.officer_check_comp_beverage ?? 0,
        other_beverage_adjustments: initialData.other_beverage_adjustments ?? 0,
        notes: initialData.notes ?? '',
      });
    } else {
      form.reset({
        date: new Date(), 
        food_revenue: 0,
        budget_food_cost_pct: 0,
        ent_food: 0,
        oc_food: 0,
        other_food_adjustment: 0,
        beverage_revenue: 0,
        budget_beverage_cost_pct: 0,
        entertainment_beverage_cost: 0,
        officer_check_comp_beverage: 0,
        other_beverage_adjustments: 0,
        notes: '',
      });
    }
  }, [initialData, form]);


  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    try {
      const summaryDataPayload: Partial<Omit<DailyFinancialSummary, 'id' | 'createdAt' | 'updatedAt'>> & { date: Date } = {
        date: data.date,
        food_revenue: data.food_revenue,
        budget_food_cost_pct: data.budget_food_cost_pct,
        ent_food: data.ent_food,
        oc_food: data.oc_food,
        other_food_adjustment: data.other_food_adjustment,
        beverage_revenue: data.beverage_revenue,
        budget_beverage_cost_pct: data.budget_beverage_cost_pct,
        entertainment_beverage_cost: data.entertainment_beverage_cost,
        officer_check_comp_beverage: data.officer_check_comp_beverage,
        other_beverage_adjustments: data.other_beverage_adjustments,
        notes: data.notes,
      };
      
      if (initialData) {
        summaryDataPayload.actual_food_cost = initialData.actual_food_cost;
        summaryDataPayload.actual_food_cost_pct = initialData.actual_food_cost_pct;
        summaryDataPayload.food_variance_pct = initialData.food_variance_pct;
        summaryDataPayload.actual_beverage_cost = initialData.actual_beverage_cost;
        summaryDataPayload.actual_beverage_cost_pct = initialData.actual_beverage_cost_pct;
        summaryDataPayload.beverage_variance_pct = initialData.beverage_variance_pct;
      }
      
      await saveDailyFinancialSummaryAction(summaryDataPayload, initialData?.id);
      toast({
        title: initialData ? "Summary Updated" : "Summary Added",
        description: `Daily financial summary for ${format(data.date, "PPP")} has been successfully saved.`,
      });
      onSuccess();
    } catch (error) {
      console.error("Error saving daily financial summary:", error);
      toast({
        variant: "destructive",
        title: "Error Saving Summary",
        description: (error as Error).message || "Could not save the summary. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
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
                    // disabled={!!initialData} // Explicitly pass disabled state
                  />
                  <FormDescription className="text-xs">Make sure to update the date carefully when editing existing entries.</FormDescription>
                    <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {/* Food Section */}
                <div className="space-y-4 p-4 border rounded-md shadow-sm bg-card/70">
                    <h3 className="text-lg font-medium border-b pb-2 text-primary">Food Section</h3>
                    <FormField
                      control={form.control}
                      name="food_revenue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Food Revenue</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., 12000" {...field} step="0.01" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="budget_food_cost_pct"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Budget Food Cost %</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., 30.5" {...field} step="0.01" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ent_food"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Entertainment Food Cost</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., 150" {...field} step="0.01" /></FormControl>
                          <FormDescription className="text-xs">Cost of food for entertainment purposes.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="oc_food"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Officer's Check / Comp Food</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., 80" {...field} step="0.01" /></FormControl>
                          <FormDescription className="text-xs">Cost of complimentary food.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="other_food_adjustment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Other Food Adjustments</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., -25 (for credit)" {...field} step="0.01" /></FormControl>
                          <FormDescription className="text-xs">E.g., spoilage, staff meals (use negative for credits).</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>

                {/* Beverage Section */}
                <div className="space-y-4 p-4 border rounded-md shadow-sm bg-card/70">
                    <h3 className="text-lg font-medium border-b pb-2 text-primary">Beverage Section</h3>
                    <FormField
                      control={form.control}
                      name="beverage_revenue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Beverage Revenue</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., 8000" {...field} step="0.01" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="budget_beverage_cost_pct"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Budget Beverage Cost %</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., 22.5" {...field} step="0.01" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="entertainment_beverage_cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Entertainment Beverage Cost</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., 120" {...field} step="0.01" /></FormControl>
                          <FormDescription className="text-xs">Cost of beverages for entertainment.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="officer_check_comp_beverage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Officer's Check / Comp Beverage</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., 60" {...field} step="0.01" /></FormControl>
                          <FormDescription className="text-xs">Cost of complimentary beverages.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="other_beverage_adjustments"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Other Beverage Adjustments</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., -15 (for credit)" {...field} step="0.01" /></FormControl>
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
                    <Textarea
                      placeholder="Any specific notes for this day's summary..."
                      className="resize-y min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 pt-4 border-t mt-auto">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Saving..." : (initialData ? "Save Changes" : "Add Summary")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

    

    