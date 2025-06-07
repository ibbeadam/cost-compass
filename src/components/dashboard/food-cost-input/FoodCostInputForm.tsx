
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
  FormMessage as ShadcnFormMessage, // Renamed to avoid conflict
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import type { Category, FoodCostEntry, FoodCostDetail } from "@/types";
import { saveFoodCostEntryAction } from "@/actions/foodCostActions";
import { ScrollArea } from "@/components/ui/scroll-area";

const foodCostItemSchema = z.object({
  id: z.string().optional(), // For existing details
  categoryId: z.string().min(1, "Category is required."),
  categoryName: z.string().optional(), // For display, not saved directly if not needed
  cost: z.coerce.number().min(0.01, "Cost must be greater than 0."),
  description: z.string().optional(),
});

const foodCostInputFormSchema = z.object({
  items: z.array(foodCostItemSchema).min(1, "At least one item is required."),
});

type FoodCostItemFormValues = z.infer<typeof foodCostItemSchema>;
type FoodCostInputFormValues = z.infer<typeof foodCostInputFormSchema>;

interface FoodCostInputFormProps {
  selectedDate: Date;
  selectedOutletId: string;
  foodCategories: Category[];
  existingEntry: (FoodCostEntry & { details: FoodCostDetail[] }) | null;
  onSuccess: () => void;
}

export default function FoodCostInputForm({
  selectedDate,
  selectedOutletId,
  foodCategories,
  existingEntry,
  onSuccess,
}: FoodCostInputFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const totalCost = form.watch("items").reduce((sum, item) => sum + (Number(item.cost) || 0), 0);

  async function onSubmit(data: FoodCostInputFormValues) {
    setIsSubmitting(true);
    try {
      const itemsToSave = data.items.map(item => ({
        id: item.id, // Pass existing detail ID if present
        categoryId: item.categoryId,
        cost: item.cost,
        description: item.description,
      }));

      await saveFoodCostEntryAction(selectedDate, selectedOutletId, itemsToSave, existingEntry?.id);
      toast({ title: "Food Cost Entry Saved", description: "Successfully saved." });
      onSuccess(); // Callback to refresh data or close modal
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex flex-col h-full overflow-hidden">
        <ScrollArea className="flex-grow pr-3 space-y-4"> {/* Add space-y-4 for spacing inside scroll area */}
          <div className="space-y-4">
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
                      <ShadcnFormMessage /> {/* Use renamed component */}
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
                      <ShadcnFormMessage /> {/* Use renamed component */}
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
                      <ShadcnFormMessage /> {/* Use renamed component */}
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
          {/* Move Add Item button and Total Cost inside ScrollArea */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t flex-shrink-0"> {/* flex-shrink-0 prevents shrinking */}
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
          {/* Move Save Entry button inside ScrollArea */}
          <div className="flex justify-end gap-2 mt-4 flex-shrink-0"> {/* Use mt-4 for spacing from Total Cost/Add Item, flex-shrink-0 prevents shrinking */}
            <Button type="submit" disabled={isSubmitting || !form.formState.isValid || fields.length === 0} className="min-w-[120px]">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (existingEntry ? "Update Entry" : "Save Entry")}
            </Button>
          </div>
        </ScrollArea>
      </form>
    </Form>
  );
}
