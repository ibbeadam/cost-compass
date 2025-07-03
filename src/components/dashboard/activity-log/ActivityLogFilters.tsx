"use client";

import { useState, useEffect } from "react";
import { CalendarIcon, X } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

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
    onFiltersChange(clearedFilters);
    onOpenChange(false);
  };

  const hasActiveFilters = !!(
    localFilters.searchTerm ||
    localFilters.action ||
    localFilters.resource ||
    localFilters.userId ||
    localFilters.propertyId ||
    localFilters.dateRange
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
              value={localFilters.userId || ""}
              onChange={(e) =>
                setLocalFilters({
                  ...localFilters,
                  userId: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>

          {/* Property ID Filter */}
          <div className="space-y-2">
            <Label htmlFor="propertyId">Property ID</Label>
            <Input
              id="propertyId"
              type="number"
              placeholder="Enter property ID"
              value={localFilters.propertyId || ""}
              onChange={(e) =>
                setLocalFilters({
                  ...localFilters,
                  propertyId: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>

          {/* Date Range From */}
          <div className="space-y-2">
            <Label>Date From</Label>
            <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !localFilters.dateRange?.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {localFilters.dateRange?.from ? (
                    format(localFilters.dateRange.from, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={localFilters.dateRange?.from}
                  onSelect={(date) => {
                    setLocalFilters({
                      ...localFilters,
                      dateRange: {
                        ...localFilters.dateRange,
                        from: date!,
                        to: localFilters.dateRange?.to || date!,
                      },
                    });
                    setDateFromOpen(false);
                  }}
                  disabled={(date) =>
                    date > new Date() || date < new Date("1900-01-01")
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Date Range To */}
          <div className="space-y-2">
            <Label>Date To</Label>
            <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !localFilters.dateRange?.to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {localFilters.dateRange?.to ? (
                    format(localFilters.dateRange.to, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={localFilters.dateRange?.to}
                  onSelect={(date) => {
                    setLocalFilters({
                      ...localFilters,
                      dateRange: {
                        ...localFilters.dateRange,
                        from: localFilters.dateRange?.from || date!,
                        to: date!,
                      },
                    });
                    setDateToOpen(false);
                  }}
                  disabled={(date) =>
                    date > new Date() ||
                    date < new Date("1900-01-01") ||
                    (localFilters.dateRange?.from && date < localFilters.dateRange.from)
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Clear Date Range Button */}
        {localFilters.dateRange && (
          <div className="flex justify-start">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setLocalFilters({
                  ...localFilters,
                  dateRange: undefined,
                })
              }
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