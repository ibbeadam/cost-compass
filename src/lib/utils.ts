import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) {
    return "-";
  }
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Normalizes a date to UTC date (YYYY-MM-DD) for consistent database storage
 * Handles various date input types consistently and ensures the intended date is preserved
 */
export function normalizeDate(date: Date | string | number): Date {
  let targetDate: Date;
  
  if (date instanceof Date) {
    targetDate = date;
  } else if (typeof date === 'string') {
    // Handle string dates from Excel or other sources
    // Parse as local date to avoid timezone issues
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date string');
    }
    targetDate = parsedDate;
  } else if (typeof date === 'number') {
    targetDate = new Date(date);
  } else {
    throw new Error('Invalid date type');
  }
  
  // Get the local date components
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const day = targetDate.getDate();
  
  // Create a UTC date with the same year, month, day to avoid timezone shift
  // This ensures the intended date is preserved when stored in the database
  return new Date(Date.UTC(year, month, day));
}
