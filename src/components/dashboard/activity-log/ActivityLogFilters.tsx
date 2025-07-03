"use client";

import { useState, useEffect } from "react";
import { X, CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";

import type { AuditLogFilters } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface ActivityLogFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: AuditLogFilters;
  onFiltersChange: (filters: AuditLogFilters) => void;
}

export function ActivityLogFilters({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}: ActivityLogFiltersProps) {
  const [localFilters, setLocalFilters] = useState<AuditLogFilters>(filters);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  
  // Convert the filter dateRange to DateRange format for the date range picker
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (filters.dateRange?.from || filters.dateRange?.to) {
      return {
        from: filters.dateRange.from,
        to: filters.dateRange.to,
      };
    }
    return undefined;
  });

  useEffect(() => {
    setLocalFilters(filters);
    // Update dateRange state when filters change
    if (filters.dateRange?.from || filters.dateRange?.to) {
      setDateRange({
        from: filters.dateRange.from,
        to: filters.dateRange.to,
      });
    } else {
      setDateRange(undefined);
    }
  }, [filters]);

  // Handle date range changes
  const handleDateRangeChange = (newDateRange: DateRange | undefined) => {
    setDateRange(newDateRange);
    setLocalFilters({
      ...localFilters,
      dateRange: newDateRange ? {
        from: newDateRange.from,
        to: newDateRange.to,
      } : undefined,
    });
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    onOpenChange(false);
  };

  const handleClearFilters = () => {
    const clearedFilters: AuditLogFilters = {
      page: 1,
      limit: filters.limit || 25,
    };
    setLocalFilters(clearedFilters);
    setDateRange(undefined);
    setDateRangeOpen(false);
    onFiltersChange(clearedFilters);
    onOpenChange(false);
  };

  const hasActiveFilters = !!(
    localFilters.searchTerm ||
    localFilters.action ||
    localFilters.resource ||
    localFilters.userId ||
    localFilters.propertyId ||
    dateRange
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Filter Activity Logs</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {/* Search Term */}
          <div className="space-y-2">
            <Label htmlFor="searchTerm">Search</Label>
            <Input
              id="searchTerm"
              placeholder="Search actions, resources, users..."
              value={localFilters.searchTerm || ""}
              onChange={(e) =>
                setLocalFilters({
                  ...localFilters,
                  searchTerm: e.target.value || undefined,
                })
              }
            />
          </div>

          {/* Action Filter */}
          <div className="space-y-2">
            <Label htmlFor="action">Action</Label>
            <Select
              value={localFilters.action || "all"}
              onValueChange={(value) =>
                setLocalFilters({
                  ...localFilters,
                  action: value === "all" ? undefined : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                <SelectItem value="CREATE">Create</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
                <SelectItem value="LOGIN">Login</SelectItem>
                <SelectItem value="LOGOUT">Logout</SelectItem>
                <SelectItem value="ACTIVATE">Activate</SelectItem>
                <SelectItem value="DEACTIVATE">Deactivate</SelectItem>
                <SelectItem value="EXPORT">Export</SelectItem>
                <SelectItem value="IMPORT">Import</SelectItem>
                <SelectItem value="VIEW">View</SelectItem>
                <SelectItem value="DOWNLOAD">Download</SelectItem>
                <SelectItem value="RESET_PASSWORD">Reset Password</SelectItem>
                <SelectItem value="CHANGE_PASSWORD">Change Password</SelectItem>
                <SelectItem value="GRANT_ACCESS">Grant Access</SelectItem>
                <SelectItem value="REVOKE_ACCESS">Revoke Access</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Resource Filter */}
          <div className="space-y-2">
            <Label htmlFor="resource">Resource</Label>
            <Select
              value={localFilters.resource || "all"}
              onValueChange={(value) =>
                setLocalFilters({
                  ...localFilters,
                  resource: value === "all" ? undefined : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All resources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All resources</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="property">Property</SelectItem>
                <SelectItem value="outlet">Outlet</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="food_cost_entry">Food Cost Entry</SelectItem>
                <SelectItem value="beverage_cost_entry">Beverage Cost Entry</SelectItem>
                <SelectItem value="daily_financial_summary">Daily Financial Summary</SelectItem>
                <SelectItem value="property_access">Property Access</SelectItem>
                <SelectItem value="user_permission">User Permission</SelectItem>
                <SelectItem value="settings">Settings</SelectItem>
                <SelectItem value="report">Report</SelectItem>
                <SelectItem value="dashboard">Dashboard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User ID Filter */}
          <div className="space-y-2">
            <Label htmlFor="userId">User ID</Label>
            <Input
              id="userId"
              type="number"
              placeholder="Enter user ID"
              value={localFilters.userId?.toString() || ""}
              onChange={(e) => {
                const value = e.target.value.trim();
                setLocalFilters({
                  ...localFilters,
                  userId: value && !isNaN(Number(value)) ? Number(value) : undefined,
                });
              }}
            />
          </div>

          {/* Property ID Filter */}
          <div className="space-y-2">
            <Label htmlFor="propertyId">Property ID</Label>
            <Input
              id="propertyId"
              type="number"
              placeholder="Enter property ID"
              value={localFilters.propertyId?.toString() || ""}
              onChange={(e) => {
                const value = e.target.value.trim();
                setLocalFilters({
                  ...localFilters,
                  propertyId: value && !isNaN(Number(value)) ? Number(value) : undefined,
                });
              }}
            />
          </div>

          {/* Date Range */}
          <div className="space-y-2 md:col-span-2 relative">
            <Label>Date Range</Label>
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground"
                )}
                onClick={() => setDateRangeOpen(!dateRangeOpen)}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
              
              {dateRangeOpen && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-[55]" 
                    onClick={() => setDateRangeOpen(false)}
                  />
                  
                  {/* Calendar dropdown */}
                  <div className="absolute top-full left-0 mt-1 z-[60] bg-background border rounded-md shadow-lg min-w-max">
                    <Calendar
                      mode="range"
                      defaultMonth={dateRange?.from || new Date()}
                      selected={dateRange}
                      onSelect={(newDateRange) => {
                        handleDateRangeChange(newDateRange);
                        // Close the dropdown when both dates are selected
                        if (newDateRange?.from && newDateRange?.to) {
                          setDateRangeOpen(false);
                        }
                      }}
                      numberOfMonths={2}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Clear Date Range Button */}
        {dateRange && (
          <div className="flex justify-start">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateRange(undefined);
                setDateRangeOpen(false);
                setLocalFilters({
                  ...localFilters,
                  dateRange: undefined,
                });
              }}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Clear date range
            </Button>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" onClick={handleClearFilters}>
              Clear All Filters
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyFilters}>
              Apply Filters
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}