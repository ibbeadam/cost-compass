
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import type { Category, BeverageCostEntry, BeverageCostDetail } from "@/types";
import { saveBeverageCostEntryAction } from "@/actions/beverageCostActions";

const beverageCostItemSchema = z.object({
  id: z.string().optional(), 
  categoryId: z.string().min(1, "Category is required."),
  categoryName: z.string().optional(),
  cost: z.coerce.number().min(0.01, "Cost must be greater than 0."),
  description: z.string().optional(),
});

const beverageCostInputFormSchema = z.object({
  items: z.array(beverageCostItemSchema).min(1, "At least one item is required."),
});

type BeverageCostInputFormValues = z.infer<typeof beverageCostInputFormSchema>;

interface BeverageCostInputFormProps {
  selectedDate: Date;
  selectedOutletId: string;
  beverageCategories: Category[];
  existingEntry: (BeverageCostEntry & { details: BeverageCostDetail[] }) | null;
  onSuccess: () => void;
}

export default function BeverageCostInputForm({
  selectedDate,
  selectedOutletId,
  beverageCategories,
  existingEntry,
  onSuccess,
}: BeverageCostInputFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<BeverageCostInputFormValues>({
    resolver: zodResolver(beverageCostInputFormSchema),
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
      form.reset({
        items: [{ categoryId: "", cost: 0, description: "" }]
      });
    }
  }, [existingEntry, form, selectedDate, selectedOutletId]);


  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const totalCost = form.watch("items").reduce((sum, item) => sum + (Number(item.cost) || 0), 0);

  async function onSubmit(data: BeverageCostInputFormValues) {
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

      await saveBeverageCostEntryAction(selectedDate, selectedOutletId, itemsToSave, existingEntry?.id);
      toast({ title: "Beverage Cost Entry Saved", description: "Successfully saved." });
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
        <div className="flex-grow min-h-0 overflow-y-auto pr-3 space-y-4">
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
                            <SelectValue placeholder="Select beverage category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {beverageCategories.map((category) => (
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
        <div className="pt-4 border-t mt-auto flex-shrink-0">
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
                Total Beverage Cost: ${totalCost.toFixed(2)}
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
