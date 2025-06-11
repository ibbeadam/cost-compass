
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage as ShadcnFormMessage, 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// DatePicker is no longer imported or used here, it's managed in FoodCostEntryListClient.tsx
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import type { Category, FoodCostEntry, FoodCostDetail } from "@/types";
import { saveFoodCostEntryAction } from "@/actions/foodCostActions";


const foodCostItemSchema = z.object({
  id: z.string().optional(), 
  categoryId: z.string().min(1, "Category is required."),
  categoryName: z.string().optional(), 
  cost: z.coerce.number().min(0.01, "Cost must be greater than 0."),
  description: z.string().optional(),
});

const foodCostInputFormSchema = z.object({
  items: z.array(foodCostItemSchema).min(1, "At least one item is required."),
});

type FoodCostItemFormValues = z.infer<typeof foodCostItemSchema>;
type FoodCostInputFormValues = z.infer<typeof foodCostInputFormSchema>;

interface FoodCostInputFormProps {
  selectedDate: Date; // Date is now a prop, not state managed here
  selectedOutletId: string;
  foodCategories: Category[];
  existingEntry: (FoodCostEntry & { details: FoodCostDetail[] }) | null;
  onSuccess: () => void;
}

export default function FoodCostInputForm({
  selectedDate, // Receive selectedDate as a prop
  selectedOutletId,
  foodCategories,
  existingEntry,
  onSuccess,
}: FoodCostInputFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Removed entryDate state, as selectedDate prop will be used directly
  const { toast } = useToast();

  const form = useForm<FoodCostInputFormValues>({
    resolver: zodResolver(foodCostInputFormSchema),
    defaultValues: {
      items: existingEntry?.details.map(d => ({
        id: d.id,
        categoryId: d.category_id,
        categoryName: d.categoryName || d.category_id,
        cost: d.cost,
        description: d.description || "",
      })) || [{ categoryId: "", cost: 0, description: "" }],
    },
    mode: "onChange",
  });

  // Re-initialize form if existingEntry or its date changes (relevant for edits)
  useEffect(() => {
    if (existingEntry) {
      form.reset({
        items: existingEntry.details.map(d => ({
          id: d.id,
          categoryId: d.category_id,
          categoryName: d.categoryName || d.category_id,
          cost: d.cost,
          description: d.description || "",
        }))
      });
    } else {
      // For new entries, if selectedDate or selectedOutletId change (e.g. user changes selection before adding items)
      // we might want to reset items, or ensure the key prop on this component in parent handles re-mount
      form.reset({
        items: [{ categoryId: "", cost: 0, description: "" }]
      });
    }
  }, [existingEntry, form, selectedDate, selectedOutletId]);


  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const totalCost = form.watch("items").reduce((sum, item) => sum + (Number(item.cost) || 0), 0);

  async function onSubmit(data: FoodCostInputFormValues) {
    if (!selectedDate) {
        toast({ variant: "destructive", title: "Date Missing", description: "Please ensure a date is selected."});
        return;
    }
    if (!selectedOutletId) {
        toast({ variant: "destructive", title: "Outlet Missing", description: "Please ensure an outlet is selected."});
        return;
    }

    setIsSubmitting(true);
    try {
      const itemsToSave = data.items.map(item => ({
        id: item.id, 
        categoryId: item.categoryId,
        cost: item.cost,
        description: item.description,
      }));

      await saveFoodCostEntryAction(selectedDate, selectedOutletId, itemsToSave, existingEntry?.id);
      toast({ title: "Food Cost Entry Saved", description: "Successfully saved." });
      onSuccess(); 
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error Saving Entry",
        description: (error as Error).message || "Could not save the entry.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
        {/* DatePicker removed from here, it's managed by the parent FoodCostEntryListClient */}
        <div className="flex-grow min-h-0 overflow-y-auto pr-3">
          <div className="space-y-4 pb-4"> 
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-3 p-4 border rounded-md shadow-sm bg-card/80 relative">
                <FormField
                  control={form.control}
                  name={`items.${index}.categoryId`}
                  render={({ field: formField }) => (
                    <FormItem className="flex-grow">
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={formField.onChange} defaultValue={formField.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select food category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {foodCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <ShadcnFormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.cost`}
                  render={({ field: formField }) => (
                    <FormItem className="w-32">
                      <FormLabel>Cost</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...formField} />
                      </FormControl>
                      <ShadcnFormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.description`}
                  render={({ field: formField }) => (
                    <FormItem className="flex-grow">
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Supplier name, item details" {...formField} />
                      </FormControl>
                      <ShadcnFormMessage />
                    </FormItem>
                  )}
                />
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 self-center"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remove item</span>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="pt-4 border-t flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ categoryId: "", cost: 0, description: "" })}
                disabled={isSubmitting}
                className="text-sm"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
              </Button>
              <div className="text-lg font-semibold">
                Total Food Cost: ${totalCost.toFixed(2)}
              </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={isSubmitting || !form.formState.isValid || fields.length === 0} className="min-w-[120px]">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (existingEntry ? "Update Entry" : "Save Entry")}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

    