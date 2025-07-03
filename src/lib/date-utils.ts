import { format, isValid, parseISO } from "date-fns";

/**
 * Safely format dates with error handling
 * @param date - Date object, string, or any value that might be a date
 * @param formatStr - Format string for date-fns format function
 * @returns Formatted date string or fallback message
 */
export const safeFormatDate = (date: any, formatStr: string = "MMM dd, yyyy"): string => {
  if (!date) return "N/A";
  
  let dateObj: Date;
  
  if (typeof date === 'string') {
    // Try to parse ISO string or other common date formats
    dateObj = parseISO(date);
  } else if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'number') {
    // Handle timestamp
    dateObj = new Date(date);
  } else {
    console.warn('Invalid date value:', date);
    return "Invalid Date";
  }
  
  if (!isValid(dateObj)) {
    console.warn('Invalid date object:', dateObj, 'from:', date);
    return "Invalid Date";
  }
  
  try {
    return format(dateObj, formatStr);
  } catch (error) {
    console.error('Date formatting error:', error, 'Date:', date);
    return "Format Error";
  }
};

/**
 * Safely convert any value to a valid Date object
 * @param date - Date object, string, number, or any value
 * @returns Valid Date object or current date as fallback
 */
export const safeToDate = (date: any): Date => {
  if (!date) return new Date();
  
  let dateObj: Date;
  
  if (typeof date === 'string') {
    dateObj = parseISO(date);
  } else if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'number') {
    dateObj = new Date(date);
  } else {
    return new Date();
  }
  
  return isValid(dateObj) ? dateObj : new Date();
};

/**
 * Check if a value represents a valid date
 * @param date - Any value to check
 * @returns True if the value can be converted to a valid date
 */
export const isValidDate = (date: any): boolean => {
  if (!date) return false;
  
  let dateObj: Date;
  
  if (typeof date === 'string') {
    dateObj = parseISO(date);
  } else if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'number') {
    dateObj = new Date(date);
  } else {
    return false;
  }
  
  return isValid(dateObj);
};