"use client";

import React from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  UserIcon, 
  ActivityIcon, 
  ShieldIcon,
  TrendingUpIcon, 
  TrendingDownIcon,
  MinusIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  LockIcon,
  ClockIcon,
  MapPinIcon,
  MonitorIcon,
  UsersIcon,
  BarChart3Icon,
  CalendarIcon,
  GlobeIcon,
  CpuIcon,
  ShieldCheckIcon
} from "lucide-react";
import type { UserActivityAuditReport } from "@/actions/userActivityAuditActions";

interface UserActivityAuditReportProps {
  data: UserActivityAuditReport;
}

export default function UserActivityAuditReport({
  data,
}: UserActivityAuditReportProps) {
  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(2)}%`;
  };

  const getRiskBadge = (riskScore: number) => {
    if (riskScore >= 70) return <Badge variant="destructive">High Risk</Badge>;
    if (riskScore >= 40) return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Medium Risk</Badge>;
    return <Badge variant="default" className="bg-green-100 text-green-800">Low Risk</Badge>;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "Increasing":
        return <TrendingUpIcon className="h-4 w-4 text-green-500" />;
      case "Decreasing":
        return <TrendingDownIcon className="h-4 w-4 text-red-500" />;
      default:
        return <MinusIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "super_admin":
        return <Badge variant="destructive">Super Admin</Badge>;
      case "property_admin":
        return <Badge variant="outline" className="border-blue-500 text-blue-700">Property Admin</Badge>;
      case "outlet_manager":
        return <Badge variant="secondary">Outlet Manager</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes("LOGIN")) return <LockIcon className="h-4 w-4" />;
    if (action.includes("CREATE")) return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
    if (action.includes("UPDATE")) return <EyeIcon className="h-4 w-4 text-blue-500" />;
    if (action.includes("DELETE")) return <AlertTriangleIcon className="h-4 w-4 text-red-500" />;
    return <ActivityIcon className="h-4 w-4" />;
  };

  const getSeverityBadge = (severity: "High" | "Medium" | "Low") => {
    switch (severity) {
      case "High":
        return <Badge variant="destructive">High</Badge>;
      case "Medium":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Medium</Badge>;
      case "Low":
        return <Badge variant="secondary">Low</Badge>;
    }
  };

  const getReportPropertySuffix = () => {
    if (data.propertyInfo?.name) {
      return ` - ${data.propertyInfo.name}`;
    }
    return "";
  };

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">
          {data.reportTitle}{getReportPropertySuffix()}
        </h2>
        <p className="text-muted-foreground">
          {format(data.dateRange.from, "MMM dd, yyyy")} -{" "}
          {format(data.dateRange.to, "MMM dd, yyyy")}
        </p>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UsersIcon className="h-4 w-4" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.activeUsers} active users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ActivityIcon className="h-4 w-4" />
              Total Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalActions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {data.summary.avgActionsPerUser.toFixed(1)} per user
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3Icon className="h-4 w-4" />
              Peak Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{data.summary.peakActivityDay.actions}</div>
            <p className="text-xs text-muted-foreground">
              {format(data.summary.peakActivityDay.date, "MMM dd, yyyy")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldIcon className="h-4 w-4" />
              Risk Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.riskAssessment.overallRiskScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              {data.riskAssessment.highRiskUsers.length} high-risk users
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Actions & Most Active User */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3Icon className="h-5 w-5" />
              Top Action
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-3">
                <div className="font-semibold text-lg truncate" title={data.summary.topAction.name}>
                  {data.summary.topAction.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {data.summary.topAction.count.toLocaleString()} occurrences ({formatPercentage(data.summary.topAction.percentage)})
                </div>
              </div>
              <div className="flex-shrink-0">
                {getActionIcon(data.summary.topAction.name)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Most Active User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <div className="font-semibold">{data.summary.mostActiveUser.name}</div>
              <div className="text-sm text-muted-foreground">{data.summary.mostActiveUser.email}</div>
              <div className="text-lg font-bold mt-1">{data.summary.mostActiveUser.actions.toLocaleString()} actions</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Activity Analysis</CardTitle>
              <CardDescription>Detailed breakdown of user activity and behavior patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Total Actions</TableHead>
                      <TableHead className="text-right">Daily Avg</TableHead>
                      <TableHead className="text-right">Logins</TableHead>
                      <TableHead className="text-right">Last Active</TableHead>
                      <TableHead className="text-right">Trend</TableHead>
                      <TableHead>Risk Level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.userData.map((user) => (
                      <TableRow key={user.userId}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.userName}</div>
                            <div className="text-sm text-muted-foreground">{user.userEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(user.userRole)}</TableCell>
                        <TableCell className="text-right font-medium">{user.totalActions.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{user.dailyAverage.toFixed(1)}</TableCell>
                        <TableCell className="text-right">{user.totalLogins}</TableCell>
                        <TableCell className="text-right">
                          <div className="text-sm">
                            {format(user.lastActive, "MMM dd, HH:mm")}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {getTrendIcon(user.activityTrend)}
                            <span className="text-sm">{user.activityTrend}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getRiskBadge(user.riskScore)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Daily Activity Timeline
              </CardTitle>
              <CardDescription>Activity patterns and trends over the reporting period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Total Actions</TableHead>
                      <TableHead className="text-right">Unique Users</TableHead>
                      <TableHead className="text-right">Avg Actions/User</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.dailyActivity.map((day, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {format(day.date, "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">{day.totalActions.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{day.uniqueUsers}</TableCell>
                        <TableCell className="text-right">{day.averageActionsPerUser.toFixed(1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Actions</CardTitle>
                <CardDescription>Most frequently performed actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.actionAnalytics.totalActions.slice(0, 10).map((action, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getActionIcon(action.action)}
                        <span className="font-medium">{action.action}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{action.count.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatPercentage(action.percentage)} • {action.uniqueUsers} users
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Activity</CardTitle>
                <CardDescription>Most accessed system resources</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.actionAnalytics.resourceActivity.slice(0, 10).map((resource, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{resource.resource}</div>
                        <div className="text-xs text-muted-foreground">
                          Top users: {resource.topUsers.slice(0, 2).join(", ")}
                          {resource.topUsers.length > 2 && " +more"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{resource.count.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatPercentage(resource.percentage)} • {resource.uniqueUsers} users
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldIcon className="h-5 w-5 text-red-500" />
                  High Risk Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.riskAssessment.highRiskUsers.length > 0 ? (
                  <ul className="space-y-2">
                    {data.riskAssessment.highRiskUsers.map((user, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <AlertTriangleIcon className="h-4 w-4 text-red-500" />
                        <span>{user}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircleIcon className="h-4 w-4" />
                    <span>No high-risk users identified</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangleIcon className="h-5 w-5 text-yellow-500" />
                  Suspicious Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.riskAssessment.suspiciousActivities.length > 0 ? (
                  <div className="space-y-3">
                    {data.riskAssessment.suspiciousActivities.slice(0, 5).map((activity, index) => (
                      <div key={index} className="border-l-4 border-yellow-400 pl-3">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{activity.userName}</div>
                          {getSeverityBadge(activity.riskLevel)}
                        </div>
                        <div className="text-sm text-muted-foreground">{activity.activity}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(activity.timestamp, "MMM dd, yyyy HH:mm")}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircleIcon className="h-4 w-4" />
                    <span>No suspicious activities detected</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LockIcon className="h-5 w-5" />
                Login Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Total Logins</div>
                  <div className="text-xl font-bold">{data.loginAnalytics.totalLogins.toLocaleString()}</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Unique Users</div>
                  <div className="text-xl font-bold">{data.loginAnalytics.uniqueLoginUsers}</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Login Failures</div>
                  <div className="text-xl font-bold text-red-600">{data.loginAnalytics.loginFailures}</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                  <div className="text-xl font-bold text-green-600">
                    {data.loginAnalytics.totalLogins > 0 
                      ? formatPercentage(((data.loginAnalytics.totalLogins - data.loginAnalytics.loginFailures) / data.loginAnalytics.totalLogins) * 100)
                      : "N/A"
                    }
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          {data.userData.filter(user => user.unusualActivity.length > 0).map((user, userIndex) => (
            <Card key={userIndex}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{user.userName} - Activity Insights</span>
                  {getRiskBadge(user.riskScore)}
                </CardTitle>
                <CardDescription>Detailed analysis of user behavior patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Action Breakdown</h4>
                    <div className="space-y-2">
                      {user.actionBreakdown.slice(0, 5).map((action, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getActionIcon(action.action)}
                            <span className="text-sm">{action.action}</span>
                          </div>
                          <div className="text-sm">
                            {action.count} ({formatPercentage(action.percentage)})
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Resource Access</h4>
                    <div className="space-y-2">
                      {user.resourceBreakdown.slice(0, 5).map((resource, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm">{resource.resource}</span>
                          <div className="text-sm">
                            {resource.count} ({formatPercentage(resource.percentage)})
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {user.unusualActivity.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-semibold mb-3 text-yellow-600">Unusual Activity Detected</h4>
                    <ul className="space-y-1">
                      {user.unusualActivity.map((activity, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <AlertTriangleIcon className="h-3 w-3 text-yellow-500" />
                          <span>{activity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-semibold mb-3">Recent Activity Sample</h4>
                  <div className="space-y-2">
                    {user.recentActivity.slice(0, 3).map((activity, index) => (
                      <div key={index} className="text-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getActionIcon(activity.action)}
                            <span>{activity.action}</span>
                            <span className="text-muted-foreground">on {activity.resource}</span>
                          </div>
                          <span className="text-muted-foreground">
                            {format(activity.timestamp, "MMM dd, HH:mm")}
                          </span>
                        </div>
                        {activity.ipAddress && (
                          <div className="text-xs text-muted-foreground ml-6">
                            IP: {activity.ipAddress}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheckIcon className="h-5 w-5 text-blue-500" />
                Security Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {data.riskAssessment.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircleIcon className="h-4 w-4 text-blue-500 mt-0.5" />
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Overall Risk Level</span>
                    {getRiskBadge(data.riskAssessment.overallRiskScore)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Active Users</span>
                    <span className="font-medium">{data.summary.activeUsers}/{data.summary.totalUsers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Login Success Rate</span>
                    <span className="font-medium text-green-600">
                      {data.loginAnalytics.totalLogins > 0 
                        ? formatPercentage(((data.loginAnalytics.totalLogins - data.loginAnalytics.loginFailures) / data.loginAnalytics.totalLogins) * 100)
                        : "N/A"
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Action Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm">Review high-risk users ({data.riskAssessment.highRiskUsers.length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">Investigate suspicious activities ({data.riskAssessment.suspiciousActivities.length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Monitor login failures ({data.loginAnalytics.loginFailures})</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}