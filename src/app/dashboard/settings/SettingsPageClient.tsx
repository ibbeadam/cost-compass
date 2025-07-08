"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Bell, 
  Shield, 
  Download, 
  Upload,
  User,
  HelpCircle,
  ChevronRight,
  DollarSign
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/contexts/NotificationContext";

export default function SettingsPageClient() {
  const router = useRouter();
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
    confirmActions: true
  });

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
    }
  ];

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Overview</span>
        </TabsTrigger>
        <TabsTrigger value="notifications" className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <span className="hidden sm:inline">Notifications</span>
        </TabsTrigger>
        <TabsTrigger value="preferences" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          <span className="hidden sm:inline">Preferences</span>
        </TabsTrigger>
        <TabsTrigger value="data" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Data</span>
        </TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview" className="space-y-6">
        <Card className="shadow-lg bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline text-xl">
              <Settings className="h-5 w-5" />
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
              <Bell className="h-5 w-5" />
              Settings Summary
            </CardTitle>
            <CardDescription>
              Overview of your current configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Security</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {preferences.confirmActions ? 'Confirmations enabled' : 'Confirmations disabled'}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Theme</span>
                </div>
                <p className="text-xs text-muted-foreground">Available in header</p>
              </div>
            </div>
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
                  <Label htmlFor="cost-alerts">Cost & Budget Alerts</Label>
                  <p className="text-sm text-muted-foreground">Budget warnings, overspend notifications, and cost threshold alerts</p>
                </div>
                <Switch 
                  id="cost-alerts"
                  checked={notifications.alerts || notifications.costThresholds}
                  onCheckedChange={(checked) => {
                    handleNotificationChange('alerts', checked);
                    handleNotificationChange('costThresholds', checked);
                  }}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="business-insights">Reports & Insights</Label>
                  <p className="text-sm text-muted-foreground">Daily summaries, cost trends, and profit analysis</p>
                </div>
                <Switch 
                  id="business-insights"
                  checked={notifications.businessInsights || notifications.dailyReports}
                  onCheckedChange={(checked) => {
                    handleNotificationChange('businessInsights', checked);
                    handleNotificationChange('dailyReports', checked);
                  }}
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
              <Shield className="h-5 w-5" />
              Security & Preferences
            </CardTitle>
            <CardDescription>
              Configure application security and behavior settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
              <Separator />
              <div className="bg-muted/50 p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Theme Preference</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Theme preference (Light/Dark mode) is available in the header navigation for quick access.
                </p>
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
                    Download your cost data as Excel or CSV files
                  </p>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex-col items-start space-y-2">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    <span className="font-medium">Import Data</span>
                  </div>
                  <p className="text-sm text-muted-foreground text-left">
                    Upload cost data from Excel templates
                  </p>
                </Button>
              </div>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium">Data Backup</h4>
                <div className="grid grid-cols-1 gap-3">
                  <Button variant="secondary" size="sm" className="w-fit">
                    <Shield className="h-4 w-4 mr-2" />
                    Create Data Backup
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Create a backup of all your cost data, outlets, and financial summaries.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

    </Tabs>
  );
}