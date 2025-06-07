
"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  className?: string;
  id?: string; // Added id prop
}

export function DatePicker({ date, setDate, className, id }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id} // Use the id on the button
          variant={"outline"}
          className={cn(
            "w-full sm:w-[280px] justify-start text-left font-normal text-base md:text-sm",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "yyyy-MM-dd") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 bg-card" 
        align="start"
        onPointerDownOutside={(e) => {
            // Prevent Dialog from closing Popover:
            // Check if the event target is inside another Radix Primitive (like a Select in the Dialog)
            // This is a common pattern for nested Radix UI components.
            if ((e.target as HTMLElement)?.closest('[data-radix-popper-content-wrapper]')) {
                e.preventDefault();
            }
        }}
        // onInteractOutside={(e) => { // Another option to explore if onPointerDownOutside is not enough
        //     if ((e.target as HTMLElement)?.closest('[data-radix-popper-content-wrapper]')) {
        //         e.preventDefault();
        //     }
        // }}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
