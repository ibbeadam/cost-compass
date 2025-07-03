"use client";

import { useState } from "react";
import { format } from "date-fns";
import { 
  Clock, 
  User, 
  Activity, 
  MapPin, 
  Smartphone, 
  Database,
  Eye,
  Code,
  Building,
  ToggleLeft,
  ToggleRight
} from "lucide-react";

import type { AuditLog } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

interface ActivityLogDetailDialogProps {
  log: AuditLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivityLogDetailDialog({
  log,
  open,
  onOpenChange,
}: ActivityLogDetailDialogProps) {
  const [showRawJson, setShowRawJson] = useState(false);
  
  if (!log) return null;

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case "create": return <Database className="h-4 w-4 text-green-500" />;
      case "update": return <Activity className="h-4 w-4 text-blue-500" />;
      case "delete": return <Database className="h-4 w-4 text-red-500" />;
      case "login": return <User className="h-4 w-4 text-green-500" />;
      case "logout": return <User className="h-4 w-4 text-gray-500" />;
      case "export": return <Code className="h-4 w-4 text-purple-500" />;
      default: return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action.toLowerCase()) {
      case "create": case "activate": case "login": return "default";
      case "update": return "secondary";
      case "delete": case "deactivate": return "destructive";
      case "export": case "view": return "outline";
      default: return "secondary";
    }
  };

  const formatFieldName = (fieldName: string) => {
    // Convert camelCase/snake_case to readable format
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "None";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "string") return value;
    if (typeof value === "number") return value.toString();
    if (value instanceof Date) return format(value, "PPpp");
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  };

  const renderDataChanges = (details: any) => {
    if (!details) return null;

    // Handle different types of audit details
    if (details.changes && typeof details.changes === "object") {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
            <Activity className="h-4 w-4" />
            Field Changes
          </div>
          <div className="space-y-3">
            {Object.entries(details.changes).map(([field, change]: [string, any]) => (
              <div key={field} className="border rounded-lg p-3 bg-muted/30">
                <div className="font-medium text-sm mb-2">{formatFieldName(field)}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground mb-1">From:</div>
                    <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 font-mono">
                      {formatValue(change.from)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">To:</div>
                    <div className="p-2 bg-green-50 border border-green-200 rounded text-green-700 font-mono">
                      {formatValue(change.to)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Handle create operations
    if (details.created || (details.after && !details.before)) {
      const data = details.created || details.after;
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
            <Database className="h-4 w-4 text-green-500" />
            Created Data
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(data).map(([key, value]: [string, any]) => (
              <div key={key} className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">
                  {formatFieldName(key)}
                </div>
                <div className="text-sm p-2 bg-green-50 border border-green-200 rounded">
                  {formatValue(value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Handle delete operations
    if (details.deleted || (details.before && !details.after)) {
      const data = details.deleted || details.before;
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
            <Database className="h-4 w-4 text-red-500" />
            Deleted Data
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(data).map(([key, value]: [string, any]) => (
              <div key={key} className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">
                  {formatFieldName(key)}
                </div>
                <div className="text-sm p-2 bg-red-50 border border-red-200 rounded">
                  {formatValue(value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Handle bulk operations
    if (details.bulkOperation) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
            <Activity className="h-4 w-4" />
            Bulk Operation Summary
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="p-3 border rounded-lg">
              <div className="text-lg font-semibold">{details.totalItems || 0}</div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </div>
            <div className="p-3 border rounded-lg bg-green-50">
              <div className="text-lg font-semibold text-green-600">{details.successCount || 0}</div>
              <div className="text-sm text-muted-foreground">Successful</div>
            </div>
            <div className="p-3 border rounded-lg bg-red-50">
              <div className="text-lg font-semibold text-red-600">{details.failureCount || 0}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-lg font-semibold">
                {details.totalItems ? Math.round((details.successCount / details.totalItems) * 100) : 0}%
              </div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
          </div>
        </div>
      );
    }

    // Handle other structured data
    if (typeof details === "object" && details !== null) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
            <Code className="h-4 w-4" />
            Additional Information
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(details).map(([key, value]: [string, any]) => (
              <div key={key} className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">
                  {formatFieldName(key)}
                </div>
                <div className="text-sm p-2 bg-muted/50 border rounded">
                  {formatValue(value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="text-sm text-muted-foreground">
        No additional details available
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Activity Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Timestamp */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Timestamp
                  </div>
                  <div className="text-sm">
                    <div className="font-medium">
                      {format(log.timestamp, "EEEE, MMMM d, yyyy")}
                    </div>
                    <div className="text-muted-foreground">
                      {format(log.timestamp, "h:mm:ss a zzz")}
                    </div>
                  </div>
                </div>

                {/* Action */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Activity className="h-4 w-4" />
                    Action
                  </div>
                  <Badge 
                    variant={getActionBadgeVariant(log.action)}
                    className="flex items-center gap-1 w-fit"
                  >
                    {getActionIcon(log.action)}
                    {log.action}
                  </Badge>
                </div>

                {/* Resource */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Database className="h-4 w-4" />
                    Resource
                  </div>
                  <div className="text-sm">
                    <div className="font-medium">{log.resource}</div>
                    {log.resourceId && (
                      <div className="text-muted-foreground">
                        ID: {log.resourceId}
                      </div>
                    )}
                  </div>
                </div>

                {/* Property */}
                {log.propertyId && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Building className="h-4 w-4" />
                      Property
                    </div>
                    <div className="text-sm font-medium">
                      Property ID: {log.propertyId}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                User Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* User Details */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <User className="h-4 w-4" />
                    User
                  </div>
                  <div className="text-sm">
                    {log.user ? (
                      <>
                        <div className="font-medium">
                          {log.user.name || "No name"}
                        </div>
                        <div className="text-muted-foreground">
                          {log.user.email}
                        </div>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {log.user.role}
                        </Badge>
                      </>
                    ) : (
                      <div className="text-muted-foreground">System</div>
                    )}
                  </div>
                </div>

                {/* User ID */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Database className="h-4 w-4" />
                    User ID
                  </div>
                  <div className="text-sm font-medium">
                    {log.userId || "N/A"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Technical Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Technical Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* IP Address */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  IP Address
                </div>
                <div className="text-sm font-mono bg-muted p-2 rounded">
                  {log.ipAddress || "Unknown"}
                </div>
              </div>

              {/* User Agent */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Smartphone className="h-4 w-4" />
                  User Agent
                </div>
                <div className="text-sm font-mono bg-muted p-2 rounded break-all">
                  {log.userAgent || "Unknown"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Details */}
          {log.details && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Additional Details
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRawJson(!showRawJson)}
                    className="flex items-center gap-2"
                  >
                    {showRawJson ? (
                      <>
                        <ToggleRight className="h-4 w-4" />
                        Formatted View
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="h-4 w-4" />
                        Raw JSON
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showRawJson ? (
                  <pre className="text-sm bg-muted p-4 rounded overflow-x-auto">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                ) : (
                  renderDataChanges(log.details)
                )}
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5" />
                Metadata
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Log ID:</span>
                  <div className="font-mono">{log.id}</div>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Created:</span>
                  <div>{format(log.timestamp, "PPpp")}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}