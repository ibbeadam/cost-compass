
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ColorPaletteSelector } from "@/components/ui/color-palette-selector";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  Palette, 
  Monitor, 
  Bell, 
  Shield, 
  Download, 
  Upload,
  User,
  Globe,
  Clock,
  HelpCircle,
  ChevronRight,
  Check,
  AlertCircle,
  Zap
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNotifications } from "@/contexts/NotificationContext";
import { NotificationDemo } from "@/components/notifications/NotificationDemo";
import { CostAdvisorDemo } from "@/components/demo/CostAdvisorDemo";

export default function GeneralSettingsPage() {
  const { preferences: notificationPreferences, updatePreferences, requestPermission } = useNotifications();
  
  const [notifications, setNotifications] = useState(notificationPreferences);

  // Sync with notification context
  useEffect(() => {
    setNotifications(notificationPreferences);
  }, [notificationPreferences]);

  // Update notification preferences when local state changes
  const handleNotificationChange = (key: keyof typeof notifications, value: boolean) => {
    const newNotifications = { ...notifications, [key]: value };
    setNotifications(newNotifications);
    updatePreferences(newNotifications);
    
    // Request permission if enabling push notifications
    if (key === 'push' && value) {
      requestPermission();
    }
  };

  const [preferences, setPreferences] = useState({
    autoSave: true,
    compactView: false,
    showTooltips: true,
    confirmActions: true
  });

  const settingsSections = [
    {
      id: "appearance",
      title: "Appearance & Display",
      description: "Customize how Cost Compass looks and feels",
      icon: Palette,
      content: (
        <div className="space-y-6">
          <ThemeToggle />
          <ColorPaletteSelector />
        </div>
      )
    },
    {
      id: "notifications",
      title: "Notifications",
      description: "Manage your notification preferences",
      icon: Bell,
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive important updates via email</p>
            </div>
            <Switch 
              id="email-notifications"
              checked={notifications.email}
              onCheckedChange={(checked) => setNotifications(prev => ({...prev, email: checked}))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-notifications">Push Notifications</Label>
              <p className="text-sm text-muted-foreground">Get instant alerts in your browser</p>
            </div>
            <Switch 
              id="push-notifications"
              checked={notifications.push}
              onCheckedChange={(checked) => setNotifications(prev => ({...prev, push: checked}))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="daily-reports">Daily Reports</Label>
              <p className="text-sm text-muted-foreground">Receive daily cost summaries</p>
            </div>
            <Switch 
              id="daily-reports"
              checked={notifications.dailyReports}
              onCheckedChange={(checked) => setNotifications(prev => ({...prev, dailyReports: checked}))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="cost-alerts">Cost Alerts</Label>
              <p className="text-sm text-muted-foreground">Get notified when costs exceed thresholds</p>
            </div>
            <Switch 
              id="cost-alerts"
              checked={notifications.alerts}
              onCheckedChange={(checked) => setNotifications(prev => ({...prev, alerts: checked}))}
            />
          </div>
        </div>
      )
    },
    {
      id: "preferences",
      title: "General Preferences",
      description: "Configure general application behavior",
      icon: Settings,
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-save">Auto-Save</Label>
              <p className="text-sm text-muted-foreground">Automatically save changes as you type</p>
            </div>
            <Switch 
              id="auto-save"
              checked={preferences.autoSave}
              onCheckedChange={(checked) => setPreferences(prev => ({...prev, autoSave: checked}))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="compact-view">Compact View</Label>
              <p className="text-sm text-muted-foreground">Use a more condensed interface layout</p>
            </div>
            <Switch 
              id="compact-view"
              checked={preferences.compactView}
              onCheckedChange={(checked) => setPreferences(prev => ({...prev, compactView: checked}))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-tooltips">Show Tooltips</Label>
              <p className="text-sm text-muted-foreground">Display helpful hints and explanations</p>
            </div>
            <Switch 
              id="show-tooltips"
              checked={preferences.showTooltips}
              onCheckedChange={(checked) => setPreferences(prev => ({...prev, showTooltips: checked}))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="confirm-actions">Confirm Destructive Actions</Label>
              <p className="text-sm text-muted-foreground">Ask for confirmation before deleting data</p>
            </div>
            <Switch 
              id="confirm-actions"
              checked={preferences.confirmActions}
              onCheckedChange={(checked) => setPreferences(prev => ({...prev, confirmActions: checked}))}
            />
          </div>
        </div>
      )
    },
    {
      id: "data",
      title: "Data Management",
      description: "Import, export, and backup your data",
      icon: Download,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="h-auto p-4 flex-col items-start space-y-2">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                <span className="font-medium">Export Data</span>
              </div>
              <p className="text-sm text-muted-foreground text-left">
                Download your data as Excel or CSV files
              </p>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col items-start space-y-2">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                <span className="font-medium">Import Data</span>
              </div>
              <p className="text-sm text-muted-foreground text-left">
                Upload data from external sources
              </p>
            </Button>
          </div>
          <Separator />
          <div className="space-y-3">
            <h4 className="font-medium">Backup Options</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button variant="secondary" size="sm">
                <Shield className="h-4 w-4 mr-2" />
                Create Backup
              </Button>
              <Button variant="secondary" size="sm">
                <Clock className="h-4 w-4 mr-2" />
                Schedule Backups
              </Button>
              <Button variant="secondary" size="sm">
                <Globe className="h-4 w-4 mr-2" />
                Cloud Sync
              </Button>
            </div>
          </div>
        </div>
      )
    }
  ];

  const quickActions = [
    {
      title: "Profile Settings",
      description: "Update your personal information",
      icon: User,
      action: () => console.log("Navigate to profile"),
      badge: null
    },
    {
      title: "Help & Support",
      description: "Get help or contact support",
      icon: HelpCircle,
      action: () => console.log("Open help"),
      badge: null
    },
    {
      title: "System Status",
      description: "Check application health",
      icon: Monitor,
      action: () => console.log("Show status"),
      badge: <Badge variant="secondary" className="text-xs">All Good</Badge>
    }
  ];

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="grid w-full grid-cols-7">
        <TabsTrigger value="overview" className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          <span className="hidden sm:inline">Overview</span>
        </TabsTrigger>
        <TabsTrigger value="appearance" className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          <span className="hidden sm:inline">Appearance</span>
        </TabsTrigger>
        <TabsTrigger value="notifications" className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <span className="hidden sm:inline">Notifications</span>
        </TabsTrigger>
        <TabsTrigger value="preferences" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Preferences</span>
        </TabsTrigger>
        <TabsTrigger value="data" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Data</span>
        </TabsTrigger>
        <TabsTrigger value="demos" className="flex items-center gap-2">
          <Monitor className="h-4 w-4" />
          <span className="hidden sm:inline">Demos</span>
        </TabsTrigger>
        <TabsTrigger value="about" className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span className="hidden sm:inline">About</span>
        </TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview" className="space-y-6">
        <Card className="shadow-lg bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline text-xl">
              <Zap className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Frequently used settings and tools
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={action.action}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <action.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{action.title}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {action.badge}
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Settings Summary */}
        <Card className="shadow-lg bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline text-xl">
              <Monitor className="h-5 w-5" />
              Settings Summary
            </CardTitle>
            <CardDescription>
              Overview of your current settings configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Theme</span>
                </div>
                <p className="text-xs text-muted-foreground">System preference</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Notifications</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {Object.values(notifications).filter(Boolean).length} of {Object.keys(notifications).length} enabled
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Preferences</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {Object.values(preferences).filter(Boolean).length} of {Object.keys(preferences).length} enabled
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Security</span>
                </div>
                <p className="text-xs text-muted-foreground">All protections active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Appearance Tab */}
      <TabsContent value="appearance" className="space-y-6">
        <Card className="shadow-lg bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline text-xl">
              <Palette className="h-5 w-5" />
              Appearance & Display
            </CardTitle>
            <CardDescription>
              Customize how Cost Compass looks and feels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ThemeToggle />
            <ColorPaletteSelector />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Notifications Tab */}
      <TabsContent value="notifications" className="space-y-6">
        <Card className="shadow-lg bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline text-xl">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Manage your notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive important updates via email</p>
                </div>
                <Switch 
                  id="email-notifications"
                  checked={notifications.email}
                  onCheckedChange={(checked) => handleNotificationChange('email', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Get instant alerts in your browser</p>
                </div>
                <Switch 
                  id="push-notifications"
                  checked={notifications.push}
                  onCheckedChange={(checked) => handleNotificationChange('push', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="daily-reports">Daily Reports</Label>
                  <p className="text-sm text-muted-foreground">Receive daily cost summaries</p>
                </div>
                <Switch 
                  id="daily-reports"
                  checked={notifications.dailyReports}
                  onCheckedChange={(checked) => handleNotificationChange('dailyReports', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="cost-alerts">Cost Alerts</Label>
                  <p className="text-sm text-muted-foreground">Get notified when costs exceed thresholds</p>
                </div>
                <Switch 
                  id="cost-alerts"
                  checked={notifications.alerts}
                  onCheckedChange={(checked) => handleNotificationChange('alerts', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="cost-thresholds">Cost Threshold Alerts</Label>
                  <p className="text-sm text-muted-foreground">Budget warnings and overspend notifications</p>
                </div>
                <Switch 
                  id="cost-thresholds"
                  checked={notifications.costThresholds}
                  onCheckedChange={(checked) => handleNotificationChange('costThresholds', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="business-insights">Business Insights</Label>
                  <p className="text-sm text-muted-foreground">Cost trends and profit analysis notifications</p>
                </div>
                <Switch 
                  id="business-insights"
                  checked={notifications.businessInsights}
                  onCheckedChange={(checked) => handleNotificationChange('businessInsights', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="system-updates">System Updates</Label>
                  <p className="text-sm text-muted-foreground">App updates and maintenance notifications</p>
                </div>
                <Switch 
                  id="system-updates"
                  checked={notifications.systemUpdates}
                  onCheckedChange={(checked) => handleNotificationChange('systemUpdates', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Preferences Tab */}
      <TabsContent value="preferences" className="space-y-6">
        <Card className="shadow-lg bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline text-xl">
              <Settings className="h-5 w-5" />
              General Preferences
            </CardTitle>
            <CardDescription>
              Configure general application behavior
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-save">Auto-Save</Label>
                  <p className="text-sm text-muted-foreground">Automatically save changes as you type</p>
                </div>
                <Switch 
                  id="auto-save"
                  checked={preferences.autoSave}
                  onCheckedChange={(checked) => setPreferences(prev => ({...prev, autoSave: checked}))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="compact-view">Compact View</Label>
                  <p className="text-sm text-muted-foreground">Use a more condensed interface layout</p>
                </div>
                <Switch 
                  id="compact-view"
                  checked={preferences.compactView}
                  onCheckedChange={(checked) => setPreferences(prev => ({...prev, compactView: checked}))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-tooltips">Show Tooltips</Label>
                  <p className="text-sm text-muted-foreground">Display helpful hints and explanations</p>
                </div>
                <Switch 
                  id="show-tooltips"
                  checked={preferences.showTooltips}
                  onCheckedChange={(checked) => setPreferences(prev => ({...prev, showTooltips: checked}))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="confirm-actions">Confirm Destructive Actions</Label>
                  <p className="text-sm text-muted-foreground">Ask for confirmation before deleting data</p>
                </div>
                <Switch 
                  id="confirm-actions"
                  checked={preferences.confirmActions}
                  onCheckedChange={(checked) => setPreferences(prev => ({...prev, confirmActions: checked}))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Data Management Tab */}
      <TabsContent value="data" className="space-y-6">
        <Card className="shadow-lg bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline text-xl">
              <Download className="h-5 w-5" />
              Data Management
            </CardTitle>
            <CardDescription>
              Import, export, and backup your data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-auto p-4 flex-col items-start space-y-2">
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    <span className="font-medium">Export Data</span>
                  </div>
                  <p className="text-sm text-muted-foreground text-left">
                    Download your data as Excel or CSV files
                  </p>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex-col items-start space-y-2">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    <span className="font-medium">Import Data</span>
                  </div>
                  <p className="text-sm text-muted-foreground text-left">
                    Upload data from external sources
                  </p>
                </Button>
              </div>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium">Backup Options</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button variant="secondary" size="sm">
                    <Shield className="h-4 w-4 mr-2" />
                    Create Backup
                  </Button>
                  <Button variant="secondary" size="sm">
                    <Clock className="h-4 w-4 mr-2" />
                    Schedule Backups
                  </Button>
                  <Button variant="secondary" size="sm">
                    <Globe className="h-4 w-4 mr-2" />
                    Cloud Sync
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Demos Tab */}
      <TabsContent value="demos" className="space-y-6">
        <CostAdvisorDemo />
        <NotificationDemo />
      </TabsContent>

      {/* About Tab */}
      <TabsContent value="about" className="space-y-6">
        <Card className="shadow-lg bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline text-xl">
              <AlertCircle className="h-5 w-5" />
              About Cost Compass
            </CardTitle>
            <CardDescription>
              Application information and system details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="space-y-1">
                <p className="text-2xl font-bold text-primary">v1.0.0</p>
                <p className="text-xs text-muted-foreground">Version</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-primary">2024</p>
                <p className="text-xs text-muted-foreground">Year</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-primary">
                  <Check className="h-6 w-6 mx-auto" />
                </p>
                <p className="text-xs text-muted-foreground">Up to Date</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-primary">99.9%</p>
                <p className="text-xs text-muted-foreground">Uptime</p>
              </div>
            </div>
            <Separator />
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Cost Compass - Daily Food and Beverage Cost Monitoring
              </p>
              <p className="text-xs text-muted-foreground">
                Built with Next.js, React, and TypeScript
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
