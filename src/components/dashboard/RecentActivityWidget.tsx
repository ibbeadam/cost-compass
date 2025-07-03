"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { 
  Activity, 
  User, 
  Clock, 
  ChevronRight,
  Eye,
  Database,
  CheckCircle,
  XCircle,
  Settings as SettingsIcon
} from "lucide-react";

import type { AuditLog } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getRecentActivityAction } from "@/actions/auditLogActions";

export function RecentActivityWidget() {
  const [activities, setActivities] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    async function fetchRecentActivity() {
      try {
        const recentLogs = await getRecentActivityAction(5);
        setActivities(recentLogs);
      } catch (error) {
        console.error("Failed to fetch recent activity:", error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecentActivity();
  }, []);

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case "create": return <CheckCircle className="h-3 w-3 text-green-500" />;
      case "update": return <SettingsIcon className="h-3 w-3 text-blue-500" />;
      case "delete": return <XCircle className="h-3 w-3 text-red-500" />;
      case "login": return <User className="h-3 w-3 text-green-500" />;
      case "logout": return <User className="h-3 w-3 text-gray-500" />;
      case "export": return <Database className="h-3 w-3 text-purple-500" />;
      case "activate": return <CheckCircle className="h-3 w-3 text-green-500" />;
      case "deactivate": return <XCircle className="h-3 w-3 text-orange-500" />;
      default: return <Activity className="h-3 w-3 text-blue-500" />;
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

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes === 1) return "1 minute ago";
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours === 1) return "1 hour ago";
    if (hours < 24) return `${hours} hours ago`;
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  };

  if (hasError) {
    return null; // Don't show the widget if the user doesn't have permission
  }

  return (
    <Card className="shadow-lg bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <Link href="/dashboard/activity-log">
            <Button variant="ghost" size="sm" className="text-xs">
              View All
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-shrink-0 mt-0.5">
                  {getActionIcon(activity.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge 
                      variant={getActionBadgeVariant(activity.action)}
                      className="text-xs h-5"
                    >
                      {activity.action}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {activity.resource}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <User className="h-3 w-3" />
                    <span>{activity.user?.name || "System"}</span>
                    <Clock className="h-3 w-3 ml-auto" />
                    <span className="text-xs">
                      {formatTimeAgo(activity.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}