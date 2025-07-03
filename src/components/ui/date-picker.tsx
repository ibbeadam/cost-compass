
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
  id?: string;
  disabled?: boolean; // Added disabled prop
}

export function DatePicker({ date, setDate, className, id, disabled }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant={"outline"}
          disabled={disabled} // Use the disabled prop here
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
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            setDate(selectedDate);
            setOpen(false);
          }}
          disabled={(date) => {
            if (disabled) return true;
            return date < new Date("1900-01-01");
           }}
      />
      </PopoverContent>
    </Popover>
  );
}
