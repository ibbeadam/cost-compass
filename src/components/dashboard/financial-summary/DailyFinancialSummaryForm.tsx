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
import { showToast } from "@/lib/toast";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { format, isValid } from "date-fns";
import type { DailyFinancialSummary, Property } from "@/types";
import { createDailyFinancialSummaryAction, updateDailyFinancialSummaryAction } from "@/actions/dailyFinancialSummaryActions";
import { getPropertiesAction } from "@/actions/propertyActions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeDate } from "@/lib/utils";

const summaryFormSchema = z.object({
  date: z.date({
    required_error: "A date is required.",
  }),
  propertyId: z.coerce.number().optional(),
  actualFoodRevenue: z.coerce.number().min(0, "Actual food revenue cannot be negative."),
  budgetFoodRevenue: z.coerce.number().min(0, "Budget food revenue cannot be negative."),
  budgetFoodCost: z.coerce.number().min(0, "Budget food cost cannot be negative."),
  budgetFoodCostPct: z.coerce.number().min(0, "Budget food cost % cannot be negative.").max(100, "Budget food cost % cannot exceed 100."),
  entFood: z.coerce.number().optional().default(0),
  coFood: z.coerce.number().optional().default(0),
  otherFoodAdjustment: z.coerce.number().optional().default(0),
  
  actualBeverageRevenue: z.coerce.number().min(0, "Actual beverage revenue cannot be negative."),
  budgetBeverageRevenue: z.coerce.number().min(0, "Budget beverage revenue cannot be negative."),
  budgetBeverageCost: z.coerce.number().min(0, "Budget beverage cost cannot be negative."),
  budgetBeverageCostPct: z.coerce.number().min(0, "Budget beverage cost % cannot be negative.").max(100, "Budget beverage cost % cannot exceed 100."),
  entBeverage: z.coerce.number().optional().default(0),
  coBeverage: z.coerce.number().optional().default(0),
  otherBeverageAdjustment: z.coerce.number().optional().default(0),
  
  note: z.string().max(500, "Notes cannot exceed 500 characters.").optional(),
});

type FormValues = z.infer<typeof summaryFormSchema>;

interface DailyFinancialSummaryFormProps {
  initialData?: DailyFinancialSummary | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function DailyFinancialSummaryForm({ initialData, onSuccess, onCancel }: DailyFinancialSummaryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const { user } = useAuth();

  const defaultValues: FormValues = {
    date: initialData?.date ? normalizeDate(initialData.date) : normalizeDate(new Date()),
    propertyId: initialData?.propertyId,
    actualFoodRevenue: initialData?.actualFoodRevenue ?? 0,
    budgetFoodRevenue: initialData?.budgetFoodRevenue ?? 0,
    budgetFoodCost: initialData?.budgetFoodCost ?? 0,
    budgetFoodCostPct: initialData?.budgetFoodCostPct ?? 0,
    entFood: initialData?.entFood ?? 0,
    coFood: initialData?.coFood ?? 0,
    otherFoodAdjustment: initialData?.otherFoodAdjustment ?? 0,
    actualBeverageRevenue: initialData?.actualBeverageRevenue ?? 0,
    budgetBeverageRevenue: initialData?.budgetBeverageRevenue ?? 0,
    budgetBeverageCost: initialData?.budgetBeverageCost ?? 0,
    budgetBeverageCostPct: initialData?.budgetBeverageCostPct ?? 0,
    entBeverage: initialData?.entBeverage ?? 0,
    coBeverage: initialData?.coBeverage ?? 0,
    otherBeverageAdjustment: initialData?.otherBeverageAdjustment ?? 0,
    note: initialData?.note ?? '',
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(summaryFormSchema),
    defaultValues,
    mode: "onChange",
  });

  // Load properties for super admin users
  useEffect(() => {
    const loadProperties = async () => {
      if (user?.role === "super_admin") {
        try {
          const propertiesData = await getPropertiesAction();
          setProperties(propertiesData);
        } catch (error) {
          console.error("Error loading properties:", error);
          showToast.error("Failed to load properties");
        }
      }
      setIsLoadingProperties(false);
    };
    
    loadProperties();
  }, [user]);
  
   useEffect(() => {
    if (initialData) {
      form.reset({
        date: isValid(new Date(initialData.date)) ? normalizeDate(initialData.date) : normalizeDate(new Date()),
        propertyId: initialData.propertyId,
        actualFoodRevenue: initialData.actualFoodRevenue ?? 0,
        budgetFoodRevenue: initialData.budgetFoodRevenue ?? 0,
        budgetFoodCost: initialData.budgetFoodCost ?? 0,
        budgetFoodCostPct: initialData.budgetFoodCostPct ?? 0,
        entFood: initialData.entFood ?? 0,
        coFood: initialData.coFood ?? 0,
        otherFoodAdjustment: initialData.otherFoodAdjustment ?? 0,
        actualBeverageRevenue: initialData.actualBeverageRevenue ?? 0,
        budgetBeverageRevenue: initialData.budgetBeverageRevenue ?? 0,
        budgetBeverageCost: initialData.budgetBeverageCost ?? 0,
        budgetBeverageCostPct: initialData.budgetBeverageCostPct ?? 0,
        entBeverage: initialData.entBeverage ?? 0,
        coBeverage: initialData.coBeverage ?? 0,
        otherBeverageAdjustment: initialData.otherBeverageAdjustment ?? 0,
        note: initialData.note ?? '',
      });
    } else {
      // For new entries, auto-select property for non-super admin users
      let defaultPropertyId;
      if (user?.role !== "super_admin" && user?.propertyAccess?.length) {
        defaultPropertyId = user.propertyAccess[0].propertyId;
      }
      
      form.reset({
        date: normalizeDate(new Date()),
        propertyId: defaultPropertyId,
        actualFoodRevenue: 0,
        budgetFoodRevenue: 0,
        budgetFoodCost: 0,
        budgetFoodCostPct: 0,
        entFood: 0,
        coFood: 0,
        otherFoodAdjustment: 0,
        actualBeverageRevenue: 0,
        budgetBeverageRevenue: 0,
        budgetBeverageCost: 0,
        budgetBeverageCostPct: 0,
        entBeverage: 0,
        coBeverage: 0,
        otherBeverageAdjustment: 0,
        note: '',
      });
    }
  }, [initialData, form, user]);


  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    try {
      const summaryDataPayload = {
        date: normalizeDate(data.date),
        propertyId: data.propertyId,
        actualFoodRevenue: data.actualFoodRevenue,
        budgetFoodRevenue: data.budgetFoodRevenue,
        budgetFoodCost: data.budgetFoodCost,
        budgetFoodCostPct: data.budgetFoodCostPct,
        entFood: data.entFood,
        coFood: data.coFood,
        otherFoodAdjustment: data.otherFoodAdjustment,
        actualBeverageRevenue: data.actualBeverageRevenue,
        budgetBeverageRevenue: data.budgetBeverageRevenue,
        budgetBeverageCost: data.budgetBeverageCost,
        budgetBeverageCostPct: data.budgetBeverageCostPct,
        entBeverage: data.entBeverage,
        coBeverage: data.coBeverage,
        otherBeverageAdjustment: data.otherBeverageAdjustment,
        note: data.note,
      };
      
      if (initialData) {
        (summaryDataPayload as any).actualFoodCost = initialData.actualFoodCost;
        (summaryDataPayload as any).actualFoodCostPct = initialData.actualFoodCostPct;
        (summaryDataPayload as any).foodVariancePct = initialData.foodVariancePct;
        (summaryDataPayload as any).actualBeverageCost = initialData.actualBeverageCost;
        (summaryDataPayload as any).actualBeverageCostPct = initialData.actualBeverageCostPct;
        (summaryDataPayload as any).beverageVariancePct = initialData.beverageVariancePct;
      }
      
      if (initialData) {
        // Update existing record
        await updateDailyFinancialSummaryAction(initialData.id, summaryDataPayload);
        showToast.success(`Daily financial summary for ${format(data.date, "PPP")} has been successfully updated.`);
      } else {
        // Create new record
        await createDailyFinancialSummaryAction(summaryDataPayload);
        showToast.success(`Daily financial summary for ${format(data.date, "PPP")} has been successfully created.`);
      }
      onSuccess();
    } catch (error) {
      console.error("Error saving daily financial summary:", error);
      showToast.error((error as Error).message || "Could not save the summary. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
        <ScrollArea className="flex-grow pr-3">
          <div className="space-y-6 p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    />
                    <FormDescription className="text-xs">Make sure to update the date carefully when editing existing entries.</FormDescription>
                      <FormMessage />
                  </FormItem>
                )}
              />
              
              {user?.role === "super_admin" && (
                <FormField
                  control={form.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select
                        value={field.value ? String(field.value) : ""}
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                        disabled={isLoadingProperties}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingProperties ? "Loading..." : "Select property"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties.map((property) => (
                            <SelectItem key={property.id} value={String(property.id)}>
                              {property.name} ({property.propertyCode})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">Select the property for this financial summary.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {user?.role !== "super_admin" && user?.propertyAccess?.length === 1 && (
                <div className="flex flex-col space-y-2">
                  <FormLabel>Property</FormLabel>
                  <div className="px-3 py-2 bg-muted rounded-md border">
                    <span className="text-sm font-medium">
                      {user.propertyAccess[0].property?.name} ({user.propertyAccess[0].property?.propertyCode})
                    </span>
                  </div>
                  <FormDescription className="text-xs">You can only create entries for your assigned property.</FormDescription>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {/* Food Section */}
                <div className="space-y-4 p-4 border rounded-md shadow-sm bg-card/70">
                    <h3 className="text-lg font-medium border-b pb-2 text-primary">Food Section</h3>
                    <FormField
                      control={form.control}
                      name="actualFoodRevenue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Actual Food Revenue</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., 12000" {...field} step="0.01" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="budgetFoodRevenue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Budget Food Revenue</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., 12000" {...field} step="0.01" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="budgetFoodCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Budget Food Cost</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., 3000" {...field} step="0.01" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="budgetFoodCostPct"
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
                      name="entFood"
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
                      name="coFood"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Complimentary Food</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., 80" {...field} step="0.01" /></FormControl>
                          <FormDescription className="text-xs">Cost of complimentary food.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="otherFoodAdjustment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Other Food Adjustments</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., -25 (for credit)" {...field} step="0.01" /></FormControl>
                          <FormDescription className="text-xs">Positive = adds to cost (e.g., spoilage), Negative = reduces cost (e.g., credits, returns).</FormDescription>
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
                      name="actualBeverageRevenue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Actual Beverage Revenue</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., 8000" {...field} step="0.01" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="budgetBeverageRevenue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Budget Beverage Revenue</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., 8000" {...field} step="0.01" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="budgetBeverageCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Budget Beverage Cost</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., 3000" {...field} step="0.01" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="budgetBeverageCostPct"
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
                      name="entBeverage"
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
                      name="coBeverage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Complimentary Beverage</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., 60" {...field} step="0.01" /></FormControl>
                          <FormDescription className="text-xs">Cost of complimentary beverages.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="otherBeverageAdjustment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Other Beverage Adjustments</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., -15 (for credit)" {...field} step="0.01" /></FormControl>
                           <FormDescription className="text-xs">Positive = adds to cost (e.g., spoilage), Negative = reduces cost (e.g., credits, returns).</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
            </div>
            
            <FormField
              control={form.control}
              name="note"
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

    

    