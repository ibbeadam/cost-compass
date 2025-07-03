
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Outlet, Property } from "@/types";
import { createOutletAction, updateOutletAction } from "@/actions/prismaOutletActions";
import { getPropertiesAction } from "@/actions/propertyActions";
import { showToast } from "@/lib/toast";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useUserPropertyAccess } from "@/hooks/useUserPropertyAccess";

const outletFormSchema = z.object({
  name: z.string().min(2, {
    message: "Outlet name must be at least 2 characters.",
  }).max(100, {
    message: "Outlet name must not exceed 100 characters."
  }),
  outletCode: z.string().min(2, {
    message: "Outlet code must be at least 2 characters.",
  }).max(20, {
    message: "Outlet code must not exceed 20 characters."
  }).regex(/^[A-Z0-9_-]+$/, {
    message: "Outlet code must contain only uppercase letters, numbers, underscores, and hyphens."
  }),
  propertyId: z.string().optional(),
  address: z.string().optional(),
});

type OutletFormValues = z.infer<typeof outletFormSchema>;

interface OutletFormProps {
  outlet?: Outlet | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function OutletForm({ outlet, onSuccess, onCancel }: OutletFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const { isSuperAdmin, filterPropertiesByAccess, getDefaultPropertyId } = useUserPropertyAccess();
  
  // Get default property
  const defaultPropertyId = outlet?.propertyId?.toString() || 
    (isSuperAdmin ? "" : getDefaultPropertyId?.toString() || "");

  const form = useForm<OutletFormValues>({
    resolver: zodResolver(outletFormSchema),
    defaultValues: {
      name: outlet?.name || "",
      outletCode: outlet?.outletCode || "",
      propertyId: defaultPropertyId,
      address: outlet?.address || "",
    },
  });

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const fetchedProperties = await getPropertiesAction();
        // Filter properties based on user access
        const accessibleProperties = filterPropertiesByAccess(fetchedProperties);
        setProperties(accessibleProperties);
      } catch (error) {
        console.error("Error fetching properties:", error);
        showToast.error("Could not load properties");
      } finally {
        setIsLoadingProperties(false);
      }
    };
    
    fetchProperties();
  }, [filterPropertiesByAccess]);

  async function onSubmit(data: OutletFormValues) {
    setIsSubmitting(true);
    try {
      // Determine the propertyId to use
      let propertyId: number | undefined;
      
      if (isSuperAdmin) {
        // Super admin must choose a property (required by schema)
        if (!data.propertyId || data.propertyId === "none") {
          throw new Error("Please select a property for this outlet.");
        }
        propertyId = parseInt(data.propertyId);
      } else {
        // Non-super admin must use their default property
        const defaultPropId = getDefaultPropertyId;
        if (defaultPropId) {
          propertyId = defaultPropId;
        } else {
          throw new Error("No accessible property found. Please contact your administrator.");
        }
      }

      const outletData = {
        name: data.name,
        outletCode: data.outletCode,
        propertyId: propertyId,
        address: data.address || undefined,
      };

      if (outlet) {
        // Editing existing outlet
        await updateOutletAction(outlet.id, outletData);
        showToast.success("The outlet has been successfully updated.");
      } else {
        // Adding new outlet
        await createOutletAction(outletData);
        showToast.success("The new outlet has been successfully added.");
      }
      onSuccess();
    } catch (error) {
      console.error("Error saving outlet:", error);
      showToast.error((error as Error).message || "Could not save the outlet. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Outlet Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Main Street Cafe" {...field} />
              </FormControl>
              <FormDescription>
                A unique name for this outlet location.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="outletCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Outlet Code</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g., MSC-001 or MAIN_ST" 
                  {...field} 
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                />
              </FormControl>
              <FormDescription>
                A unique code for this outlet (uppercase letters, numbers, underscores, and hyphens only).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Only show property selection for super admins */}
        {isSuperAdmin && (
          <FormField
            control={form.control}
            name="propertyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Property</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingProperties ? "Loading properties..." : "Select a property"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id.toString()}>
                        {property.name} ({property.propertyCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Assign this outlet to a property for better organization.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {/* Show property info for non-super admins */}
        {!isSuperAdmin && properties.length > 0 && (
          <div className="space-y-2">
            <Label>Property</Label>
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">
                {properties.find(p => p.id.toString() === defaultPropertyId)?.name || "Auto-assigned to your property"}
              </p>
              <p className="text-xs text-muted-foreground">
                Outlets are automatically assigned to your accessible property.
              </p>
            </div>
          </div>
        )}
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 123 Main Street, City, State" {...field} />
              </FormControl>
              <FormDescription>
                The physical address of this outlet location.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {outlet ? "Save Changes" : "Add Outlet"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
