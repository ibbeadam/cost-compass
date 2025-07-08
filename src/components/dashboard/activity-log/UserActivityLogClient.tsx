"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { 
  Eye, 
  Download, 
  Search, 
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  CalendarIcon,
  LogIn,
  LogOut
} from "lucide-react";

import type { AuditLog, AuditLogFilters } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { showToast } from "@/lib/toast";
import { 
  getAuditLogsAction, 
  exportAuditLogsAction,
  getUserActivityStatsAction 
} from "@/actions/auditLogActions";
import { RecordsPerPageSelector } from "@/components/ui/records-per-page-selector";
import { ActivityLogDetailDialog } from "./ActivityLogDetailDialog";

interface UserActivityStats {
  totalLoginSessions: number;
  todayLogins: number;
  uniqueUsers: number;
  avgSessionDuration: string;
}

export default function UserActivityLogClient() {
  // Initialize from localStorage if available
  const getInitialPerPage = () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('userActivityLogPerPage');
      return stored ? parseInt(stored, 10) : 25;
    }
    return 25;
  };

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<UserActivityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(getInitialPerPage());
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Inline filter states - specific to user activity
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAction, setSelectedAction] = useState("all");
  const [userId, setUserId] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: getInitialPerPage(),
    action: undefined, // Will be set to filter for login/logout only
  });

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      // Build filters for user authentication activities only
      const userActivityFilters = {
        ...filters,
        page: currentPage,
        limit: itemsPerPage,
        resource: "user", // Only user resource
        action: selectedAction === "all" ? "LOGIN" : selectedAction, // Default to LOGIN if "all" is selected
      };

      // If "all" is selected, we need to get both LOGIN and LOGOUT
      if (selectedAction === "all") {
        // Make two separate requests for LOGIN and LOGOUT, then combine
        const [loginResult, logoutResult] = await Promise.all([
          getAuditLogsAction({ ...userActivityFilters, action: "LOGIN" }),
          getAuditLogsAction({ ...userActivityFilters, action: "LOGOUT" })
        ]);
        
        // Combine and sort by timestamp
        const combinedLogs = [...loginResult.logs, ...logoutResult.logs]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        setLogs(combinedLogs);
        setTotal(combinedLogs.length);
        setTotalPages(Math.ceil(combinedLogs.length / itemsPerPage));
      } else {
        // Single action filter
        const result = await getAuditLogsAction(userActivityFilters);
        setLogs(result.logs);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      }
    } catch (error) {
      showToast.error((error as Error).message || "Failed to fetch user activity logs");
    } finally {
      setIsLoading(false);
    }
  }, [filters, currentPage, itemsPerPage, selectedAction]);

  const fetchStats = useCallback(async () => {
    try {
      // Get user-specific activity stats
      const userActivityStats = await getUserActivityStatsAction();
      
      const userStats: UserActivityStats = {
        totalLoginSessions: userActivityStats.totalLoginSessions,
        todayLogins: userActivityStats.todayLogins,
        uniqueUsers: userActivityStats.uniqueUsers,
        avgSessionDuration: userActivityStats.avgSessionDuration,
      };
      
      setStats(userStats);
    } catch (error) {
      console.error("Failed to fetch user activity stats:", error);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Real-time filtering: Update filters when inline filter states change
  useEffect(() => {
    const newFilters: AuditLogFilters = {
      page: 1,
      limit: itemsPerPage,
      resource: "user", // Always filter for user resource
    };

    if (searchTerm.trim()) newFilters.searchTerm = searchTerm.trim();
    if (selectedAction && selectedAction !== "all") newFilters.action = selectedAction;
    if (userId.trim() && !isNaN(Number(userId.trim()))) {
      newFilters.userId = Number(userId.trim());
    }
    if (dateRange?.from || dateRange?.to) {
      newFilters.dateRange = {
        from: dateRange.from,
        to: dateRange.to,
      };
    }

    setFilters(newFilters);
    setCurrentPage(1);
  }, [searchTerm, selectedAction, userId, dateRange, itemsPerPage]);

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    setFilters((prev) => ({ ...prev, limit: newItemsPerPage }));
    if (typeof window !== 'undefined') {
      localStorage.setItem('userActivityLogPerPage', newItemsPerPage.toString());
    }
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedAction("all");
    setUserId("");
    setDateRange(undefined);
    setDateRangeOpen(false);
  };

  const hasActiveFilters = !!(
    searchTerm ||
    (selectedAction && selectedAction !== "all") ||
    userId ||
    dateRange
  );

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportFilters = {
        ...filters,
        resource: "user",
      };
      const csvData = await exportAuditLogsAction(exportFilters);
      
      // Create and download CSV file
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user_activity_log_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      showToast.success("User activity log exported successfully");
    } catch (error) {
      showToast.error((error as Error).message || "Failed to export user activity log");
    } finally {
      setIsExporting(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case "login": return <LogIn className="h-4 w-4 text-green-500" />;
      case "logout": return <LogOut className="h-4 w-4 text-gray-500" />;
      default: return <User className="h-4 w-4 text-blue-500" />;
    }
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action.toLowerCase()) {
      case "login": return "default";
      case "logout": return "secondary";
      default: return "outline";
    }
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    let startPage, endPage;

    if (totalPages <= maxPagesToShow) {
      startPage = 1;
      endPage = totalPages;
    } else {
      if (currentPage <= Math.ceil(maxPagesToShow / 2)) {
        startPage = 1;
        endPage = maxPagesToShow;
      } else if (currentPage + Math.floor(maxPagesToShow / 2) >= totalPages) {
        startPage = totalPages - maxPagesToShow + 1;
        endPage = totalPages;
      } else {
        startPage = currentPage - Math.floor(maxPagesToShow / 2);
        endPage = currentPage + Math.floor(maxPagesToShow / 2);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <Button
          key={i}
          variant={currentPage === i ? "default" : "outline"}
          size="icon"
          className="h-9 w-9"
          onClick={() => setCurrentPage(i)}
          disabled={isLoading}
        >
          {i}
        </Button>
      );
    }
    return pageNumbers;
  };

  const startIndexDisplay = total > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndexDisplay = total > 0 ? Math.min(currentPage * itemsPerPage, total) : 0;

  if (isLoading && logs.length === 0) {
    return (
      <div className="w-full space-y-6">
        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="shadow-lg bg-card">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table Skeleton */}
        <Card className="shadow-lg bg-card">
          <CardHeader>
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...Array(itemsPerPage)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-lg bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Login Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLoginSessions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Today's Logins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayLogins.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">With login activity</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Session Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgSessionDuration}</div>
              <p className="text-xs text-muted-foreground">Estimated</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Activity Log Table */}
      <Card className="shadow-lg bg-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Activity Log
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {isExporting ? "Exporting..." : "Export"}
              </Button>
            </div>
          </div>

          {/* Inline Filter Bar */}
          <Card className="shadow-md bg-card p-4">
          <div className="bg-muted/10 p-4 rounded-md">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search" className="text-xs font-medium text-muted-foreground">
                  Search
                </Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search user activities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Action Filter */}
              <div className="space-y-2">
                <Label htmlFor="action" className="text-xs font-medium text-muted-foreground">
                  Activity Type
                </Label>
                <Select value={selectedAction} onValueChange={setSelectedAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="All activities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All activities</SelectItem>
                    <SelectItem value="LOGIN">Login</SelectItem>
                    <SelectItem value="LOGOUT">Logout</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Date Range
                </Label>
                <div className="relative">
                  <Button
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
                          {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                        </>
                      ) : (
                        format(dateRange.from, "MMM d, yyyy")
                      )
                    ) : (
                      <span>Pick dates</span>
                    )}
                  </Button>
                  
                  {dateRangeOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-[55]" 
                        onClick={() => setDateRangeOpen(false)}
                      />
                      <div className="absolute top-full left-0 mt-1 z-[60] bg-background border rounded-md shadow-lg">
                        <CalendarComponent
                          mode="range"
                          defaultMonth={dateRange?.from || new Date()}
                          selected={dateRange}
                          onSelect={(newDateRange) => {
                            setDateRange(newDateRange);
                            if (newDateRange?.from && newDateRange?.to) {
                              setDateRangeOpen(false);
                            }
                          }}
                          numberOfMonths={2}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          className="p-3"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* User ID Filter */}
              <div className="space-y-2">
                <Label htmlFor="userId" className="text-xs font-medium text-muted-foreground">
                  User ID
                </Label>
                <Input
                  id="userId"
                  type="number"
                  placeholder="User ID"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <div className="flex justify-end mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
          </Card>
        </CardHeader>
        <CardContent>
          
          {logs.length === 0 && !isLoading ? (
            <div className="text-center py-10 text-muted-foreground">
              <User className="mx-auto h-12 w-12 mb-4 text-primary" />
              <p className="text-lg font-medium">No user activities found</p>
              <p>Login and logout activities will appear here as users access the system</p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border overflow-hidden shadow-md bg-card">
                <Table className="whitespace-nowrap">
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>User Agent</TableHead>
                      <TableHead className="w-[100px]">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium">
                                {format(log.timestamp, "MMM d, yyyy")}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(log.timestamp, "h:mm:ss a")}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium">
                                {log.user?.name || "Unknown User"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {log.user?.email || "No email"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={getActionBadgeVariant(log.action)}
                            className="flex items-center gap-1 w-fit"
                          >
                            {getActionIcon(log.action)}
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-mono">
                            {log.ipAddress || "Unknown"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {log.userAgent || "Unknown"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(log)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4 px-2">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndexDisplay} to {endIndexDisplay} of {total} results
                  </div>
                  <RecordsPerPageSelector
                    value={itemsPerPage}
                    onChange={handleItemsPerPageChange}
                    disabled={isLoading}
                    options={[10, 25, 50, 100]}
                  />
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1 || isLoading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="sr-only">Previous Page</span>
                    </Button>
                    {renderPageNumbers()}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages || isLoading}
                    >
                      <ChevronRight className="h-4 w-4" />
                      <span className="sr-only">Next Page</span>
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <ActivityLogDetailDialog
        log={selectedLog}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </div>
  );
}