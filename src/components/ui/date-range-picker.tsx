"use client";

import * as React from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
}

export function DateRangePicker({
  date,
  setDate,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [internalDate, setInternalDate] = React.useState<DateRange | undefined>(date);

  // Update internal date when external date changes
  React.useEffect(() => {
    if (date) {
      setInternalDate(date);
    }
  }, [date]);

  const handleDateSelect = (newDate: DateRange | undefined) => {
    // If newDate is undefined, keep the current date range
    if (!newDate) {
      return;
    }

    // If we have a from date but no to date, or if it's the same date
    if (newDate.from && (!newDate.to || newDate.from.getTime() === newDate.to.getTime())) {
      const sameDateRange = {
        from: newDate.from,
        to: newDate.from
      };
      setInternalDate(sameDateRange);
      setDate(sameDateRange);
      setOpen(false);
    } else if (newDate.from && newDate.to) {
      // If we have both dates, update both states
      setInternalDate(newDate);
      setDate(newDate);
      setOpen(false);
    } else {
      // If we only have a from date, update internal state but don't close
      setInternalDate(newDate);
      setDate(newDate);
    }
  };

  // Ensure we always have a valid date range to display
  const displayDate = internalDate || date;

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date-range"
            variant={"outline"}
            className={cn(
              "w-full sm:w-[300px] justify-start text-left font-normal text-base md:text-sm",
              !displayDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayDate?.from ? (
              displayDate.to ? (
                <>
                  {format(displayDate.from, "LLL dd, y")} -{" "}
                  {format(displayDate.to, "LLL dd, y")}
                </>
              ) : (
                format(displayDate.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0 bg-card" 
          align="start"
          onPointerDownOutside={(e) => {
            // Only close if clicking outside the calendar
            if (!(e.target as HTMLElement).closest('.rdp')) {
              setOpen(false);
            }
          }}
        >
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={internalDate?.from || new Date()}
            selected={internalDate}
            onSelect={handleDateSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
