
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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Category } from "@/types/index";
import { createCategoryAction, updateCategoryAction } from "@/actions/prismaCategoryActions";
import { showToast } from "@/lib/toast";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

const categoryFormSchema = z.object({
  name: z.string().min(2, {
    message: "Category name must be at least 2 characters.",
  }).max(100, {
    message: "Category name must not exceed 100 characters."
  }),
  description: z.string().max(250, {
    message: "Description must not exceed 250 characters."
  }).optional(),
  type: z.enum(["Food", "Beverage"], {
    required_error: "You need to select a category type.",
  }),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

interface CategoryFormProps {
  category?: Category | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CategoryForm({ category, onSuccess, onCancel }: CategoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues: Partial<CategoryFormValues> = {
    name: category?.name || "",
    description: category?.description || "",
    type: category?.type,
  };
  
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        description: category.description || "",
        type: category.type,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        type: undefined, // Ensure type is undefined for new entries to trigger validation
      });
    }
  }, [category, form]);


  async function onSubmit(data: CategoryFormValues) {
    setIsSubmitting(true);
    try {
      if (category && category.id) {
        await updateCategoryAction(category.id, {
          name: data.name,
          description: data.description,
          type: data.type,
        });
        showToast.success("Category has been successfully updated!");
      } else {
        await createCategoryAction({
          name: data.name,
          description: data.description,
          type: data.type,
        });
        showToast.success("New category has been successfully added!");
      }
      onSuccess();
    } catch (error) {
      console.error("Error saving category:", error);
      showToast.error((error as Error).message || "Could not save the category. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Dairy Products, Soft Drinks" {...field} />
              </FormControl>
              <FormDescription>
                A descriptive name for the category.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide a brief description of the category"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Category Type</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="Food" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Food
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="Beverage" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Beverage
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {category ? "Save Changes" : "Add Category"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
