
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
import type { Outlet } from "@/types";
import { addOutletAction, updateOutletAction } from "@/actions/outletActions";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2 } from "lucide-react";

const outletFormSchema = z.object({
  id: z.string().min(1, {
    message: "Outlet ID cannot be empty.",
  }).max(50, {
    message: "Outlet ID must not exceed 50 characters."
  }).regex(/^[a-zA-Z0-9-_]+$/, {
    message: "Outlet ID can only contain letters, numbers, hyphens, and underscores (no spaces)."
  }),
  name: z.string().min(2, {
    message: "Outlet name must be at least 2 characters.",
  }).max(100, {
    message: "Outlet name must not exceed 100 characters."
  }),
});

type OutletFormValues = z.infer<typeof outletFormSchema>;

interface OutletFormProps {
  outlet?: Outlet | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function OutletForm({ outlet, onSuccess, onCancel }: OutletFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const form = useForm<OutletFormValues>({
    resolver: zodResolver(outletFormSchema),
    defaultValues: {
      id: outlet?.id || "",
      name: outlet?.name || "",
    },
  });

  async function onSubmit(data: OutletFormValues) {
    setIsSubmitting(true);
    try {
      if (outlet) {
        // Editing existing outlet - ID is not changed, only name
        await updateOutletAction(outlet.id, data.name);
        toast({
          title: "Outlet Updated",
          description: "The outlet has been successfully updated.",
        });
      } else {
        // Adding new outlet - ID is provided from the form
        await addOutletAction(data.id, data.name);
        toast({
          title: "Outlet Added",
          description: "The new outlet has been successfully added.",
        });
      }
      onSuccess();
    } catch (error) {
      console.error("Error saving outlet:", error);
      toast({
        variant: "destructive",
        title: "Error Saving Outlet",
        description: (error as Error).message || "Could not save the outlet. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Outlet ID</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., MAIN-KITCHEN-01"
                  {...field}
                  readOnly={!!outlet}
                  className={!!outlet ? "bg-muted/50 cursor-not-allowed focus-visible:ring-0 focus-visible:ring-offset-0" : ""}
                  aria-disabled={!!outlet}
                />
              </FormControl>
              <FormDescription>
                Unique identifier (e.g., MAIN-KITCHEN-01). Letters, numbers, hyphens, underscores only (no spaces). Cannot be changed after creation.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Outlet Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Main Street Cafe" {...field} />
              </FormControl>
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
