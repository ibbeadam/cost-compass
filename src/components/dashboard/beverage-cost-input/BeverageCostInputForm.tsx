
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
import { showToast } from "@/lib/toast";
import { useState, useEffect } from "react";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import type { Category, BeverageCostEntry, BeverageCostDetail, Property, User, Outlet } from "@/types";
import { createBeverageCostEntryAction, updateBeverageCostEntryAction } from "@/actions/beverageCostActions";
import { getPropertiesAction } from "@/actions/propertyActions";

const beverageCostItemSchema = z.object({
  id: z.number().optional(), 
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
  selectedDate: Date; // Date is now a prop, not state managed here
  outlets: Outlet[]; // Pass all outlets, will filter by property
  beverageCategories: Category[];
  existingEntry: (BeverageCostEntry & { details: BeverageCostDetail[] }) | null;
  onSuccess: () => void;
  user: User | null; // Add user for role checking
}

export default function BeverageCostInputForm({
  selectedDate, // Receive selectedDate as a prop
  outlets,
  beverageCategories,
  existingEntry,
  onSuccess,
  user,
}: BeverageCostInputFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | undefined>(undefined);
  const [selectedOutletId, setSelectedOutletId] = useState<string | undefined>(undefined);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);

  const form = useForm<BeverageCostInputFormValues>({
    resolver: zodResolver(beverageCostInputFormSchema),
    defaultValues: {
      items: existingEntry?.details.map(d => ({
        id: d.id,
        categoryId: d.categoryId.toString(),
        categoryName: d.categoryName || "",
        cost: d.cost,
        description: d.description || "",
      })) || [{ categoryId: "", cost: 0, description: "" }],
    },
    mode: "onChange",
  });

  // Load properties for super admin
  useEffect(() => {
    if (user?.role === "super_admin") {
      setIsLoadingProperties(true);
      getPropertiesAction()
        .then(setProperties)
        .catch(console.error)
        .finally(() => setIsLoadingProperties(false));
    }
  }, [user?.role]);

  // Set default property selection
  useEffect(() => {
    if (user?.role === "super_admin" && properties.length > 0 && !selectedPropertyId) {
      // Auto-select first property for super admin
      setSelectedPropertyId(properties[0].id);
    } else if (user?.role !== "super_admin" && user?.propertyAccess && user.propertyAccess.length > 0) {
      // Auto-select user's property for non-super admin
      const userProperty = user.propertyAccess.find(pa => pa.property?.isActive !== false);
      if (userProperty) {
        setSelectedPropertyId(userProperty.propertyId);
      }
    }
  }, [user, properties, selectedPropertyId]);

  // Filter outlets based on selected property
  const filteredOutlets = selectedPropertyId 
    ? outlets.filter(outlet => outlet.propertyId === selectedPropertyId)
    : outlets;

  // Auto-select outlet when property changes or outlets are filtered
  useEffect(() => {
    if (selectedPropertyId && filteredOutlets.length > 0) {
      // If current outlet is not in filtered list, select first available
      const currentOutletValid = selectedOutletId && filteredOutlets.some(o => o.id.toString() === selectedOutletId);
      if (!currentOutletValid) {
        setSelectedOutletId(filteredOutlets[0].id.toString());
      }
    } else if (filteredOutlets.length === 0) {
      setSelectedOutletId(undefined);
    }
  }, [selectedPropertyId, filteredOutlets, selectedOutletId]);

  // Re-initialize form if existingEntry or its date changes (relevant for edits)
  useEffect(() => {
    if (existingEntry) {
      form.reset({
        items: existingEntry.details.map(d => ({
          id: d.id,
          categoryId: d.categoryId.toString(),
          categoryName: d.categoryName || "",
          cost: d.cost,
          description: d.description || "",
        }))
      });
      // Set property and outlet from existing entry if available
      if (existingEntry.propertyId) {
        setSelectedPropertyId(existingEntry.propertyId);
      }
      if (existingEntry.outletId) {
        setSelectedOutletId(existingEntry.outletId.toString());
      }
    } else {
      // For new entries, if selectedDate or selectedOutletId change (e.g. user changes selection before adding items)
      // we might want to reset items, or ensure the key prop on this component in parent handles re-mount
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
        showToast.error("Please ensure a date is selected.");
        return;
    }
    if (!selectedOutletId) {
        showToast.error("Please ensure an outlet is selected.");
        return;
    }
    if (user?.role === "super_admin" && !selectedPropertyId) {
        showToast.error("Please select a property.");
        return;
    }

    setIsSubmitting(true);
    try {
      const itemsToSave = data.items.map(item => {
        const category = beverageCategories.find(cat => cat.id.toString() === item.categoryId);
        return {
          id: item.id, 
          categoryId: Number(item.categoryId),
          categoryName: category?.name || item.categoryName,
          cost: item.cost,
          description: item.description,
        };
      });

      const totalBeverageCost = itemsToSave.reduce((sum, item) => sum + item.cost, 0);

      if (existingEntry) {
        // Update existing entry
        await updateBeverageCostEntryAction(existingEntry.id, {
          date: selectedDate,
          outletId: Number(selectedOutletId),
          totalBeverageCost,
          details: itemsToSave,
          propertyId: selectedPropertyId,
        });
        showToast.success("Beverage cost entry updated successfully.");
      } else {
        // Create new entry
        await createBeverageCostEntryAction({
          date: selectedDate,
          outletId: Number(selectedOutletId),
          totalBeverageCost,
          details: itemsToSave,
          propertyId: selectedPropertyId,
        });
        showToast.success("Beverage cost entry created successfully.");
      }
      
      onSuccess(); 
    } catch (error) {
      console.error("Error saving beverage cost entry:", error);
      showToast.error((error as Error).message || "Could not save the entry.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
        {/* Property Selection */}
        <div className="mb-4 p-4 border rounded-lg">
          <h4 className="font-medium mb-3">Property Information</h4>
          {user?.role === "super_admin" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Property *</label>
              {isLoadingProperties ? (
                <div className="h-10 bg-muted animate-pulse rounded" />
              ) : (
                <Select
                  value={selectedPropertyId ? String(selectedPropertyId) : ""}
                  onValueChange={(value) => setSelectedPropertyId(value ? parseInt(value) : undefined)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={String(property.id)}>
                        {property.name} ({property.propertyCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                This entry will be assigned to the selected property.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">Property</label>
              <div className="px-3 py-2 bg-background rounded-md border">
                <span className="text-sm font-medium">
                  {(() => {
                    if (!user) return 'Loading user information...';
                    if (!user.propertyAccess) return 'Loading property access...';
                    
                    const accessibleProperty = user.propertyAccess.find(pa => pa.property?.isActive !== false);
                    if (accessibleProperty?.property) {
                      const { name, propertyCode } = accessibleProperty.property;
                      return name && propertyCode ? `${name} (${propertyCode})` : name || `Property ${accessibleProperty.propertyId}`;
                    }
                    
                    if (user.propertyAccess.length === 0) {
                      return 'No property assigned';
                    }
                    
                    return 'Loading property information...';
                  })()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                This entry will be assigned to your property.
              </p>
            </div>
          )}
        </div>
        
        {/* Outlet Selection */}
        <div className="mb-4 p-4 border rounded-lg">
          <h4 className="font-medium mb-3">Outlet Selection</h4>
          <div className="space-y-2">
            <label className="text-sm font-medium">Outlet *</label>
            {filteredOutlets.length === 0 ? (
              <div className="px-3 py-2 bg-background rounded-md border text-muted-foreground">
                <span className="text-sm">
                  {selectedPropertyId ? 'No outlets available for selected property' : 'Please select a property first'}
                </span>
              </div>
            ) : (
              <Select
                value={selectedOutletId || ""}
                onValueChange={setSelectedOutletId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select outlet" />
                </SelectTrigger>
                <SelectContent>
                  {filteredOutlets.map((outlet) => (
                    <SelectItem key={outlet.id} value={outlet.id.toString()}>
                      {outlet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">
              {filteredOutlets.length > 0 
                ? `${filteredOutlets.length} outlet(s) available for the selected property.`
                : 'Outlets will appear when a property is selected.'
              }
            </p>
          </div>
        </div>
        
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
                            <SelectValue placeholder="Select beverage category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {beverageCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
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
