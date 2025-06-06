
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
  FormDescription, // Kept for completeness, though not used in simplified version
} from "@/components/ui/form";
// import { Input } from "@/components/ui/input"; // Not used in simplified version
// import { DatePicker } from "@/components/ui/date-picker"; // Not used in simplified version
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
// import { format, isValid } from "date-fns"; // Not used in simplified version
import type { DailyFinancialSummary } from "@/types";
// import { saveDailyFinancialSummaryAction } from "@/actions/dailyFinancialSummaryActions"; // Not used in simplified version
import { ScrollArea } from "@/components/ui/scroll-area";

// Simplified schema for diagnostics
const simplifiedSummaryFormSchema = z.object({
  notes: z.string().max(500, "Notes cannot exceed 500 characters.").optional(),
});

type SimplifiedFormValues = z.infer<typeof simplifiedSummaryFormSchema>;

interface DailyFinancialSummaryFormProps {
  initialData?: DailyFinancialSummary | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function DailyFinancialSummaryForm({ initialData, onSuccess, onCancel }: DailyFinancialSummaryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<SimplifiedFormValues>({
    resolver: zodResolver(simplifiedSummaryFormSchema),
    defaultValues: {
      notes: initialData?.notes ?? '',
    },
    mode: "onChange",
  });
  
  // Simplified onSubmit for diagnostics
  async function onSubmit(data: SimplifiedFormValues) {
    setIsSubmitting(true);
    console.log("Simplified form submitted with data:", data);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate async operation
    toast({
      title: "Diagnostic Submit",
      description: "Notes field submitted. Check console.",
    });
    setIsSubmitting(false);
    // onSuccess(); // Temporarily commented out for diagnostics
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
        <ScrollArea className="flex-grow pr-3">
          <div className="space-y-6 p-1">
            {/* Only the notes field for diagnostics */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any specific notes for this day's summary..."
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
