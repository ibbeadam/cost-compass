"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useNotifications, createCostAlert, createReminder, createBusinessInsight, createSystemNotification } from '@/contexts/NotificationContext';
import { Bell, DollarSign, TrendingUp, Clock, Settings, AlertTriangle } from 'lucide-react';

export function NotificationDemo() {
  const { addNotification } = useNotifications();

  const demoNotifications = [
    {
      title: "Daily Budget Alert",
      description: "Shows when daily costs exceed budget",
      icon: DollarSign,
      color: "text-red-500",
      action: () => addNotification(createCostAlert(
        'Daily Budget Exceeded',
        'Today\'s food costs ($1,250.00) have exceeded your daily budget of $1,000.00 at Main Kitchen.',
        { costAmount: 1250, threshold: 1000, outlet: 'Main Kitchen' }
      ))
    },
    {
      title: "Cost Trend Alert",
      description: "Notification about unusual cost increases",
      icon: TrendingUp,
      color: "text-orange-500",
      action: () => addNotification(createBusinessInsight(
        'Unusual Cost Increase Detected',
        'Today\'s costs are 25.3% higher than your 7-day average. This may require attention.',
        { increasePercentage: 25.3, outlet: 'Main Kitchen' }
      ))
    },
    {
      title: "Missing Entry Reminder",
      description: "Reminds to enter daily cost data",
      icon: Clock,
      color: "text-blue-500",
      action: () => addNotification(createReminder(
        'Missing Daily Entry',
        'You haven\'t entered cost data for 2 days. Keep your records up to date!',
        '/dashboard/food-cost-input'
      ))
    },
    {
      title: "System Update",
      description: "App updates and maintenance notices",
      icon: Settings,
      color: "text-green-500",
      action: () => addNotification(createSystemNotification(
        'System Update Available',
        'A new version of Cost Compass is available with improved features and bug fixes.',
        'info'
      ))
    },
    {
      title: "Category Alert",
      description: "Category-specific budget warnings",
      icon: AlertTriangle,
      color: "text-yellow-500",
      action: () => addNotification(createCostAlert(
        'Beverages Budget Alert',
        'Beverage costs ($350.00) have exceeded the limit of $300.00 at Downtown Cafe.',
        { category: 'Beverages', costAmount: 350, threshold: 300 }
      ))
    },
    {
      title: "Welcome Message",
      description: "Welcome notification for new users",
      icon: Bell,
      color: "text-purple-500",
      action: () => addNotification(createSystemNotification(
        'Welcome to Cost Compass!',
        'Start by entering your daily food and beverage costs to track your business expenses effectively.',
        'success'
      ))
    }
  ];

  return (
    <Card className="shadow-lg bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-xl">
          <Bell className="h-5 w-5" />
          Notification Demo
        </CardTitle>
        <CardDescription>
          Try out different types of notifications to see how they work
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {demoNotifications.map((demo, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto p-4 flex-col items-start space-y-2 hover:bg-muted/50"
              onClick={demo.action}
            >
              <div className="flex items-center gap-2 w-full">
                <demo.icon className={`h-4 w-4 ${demo.color}`} />
                <span className="font-medium text-sm">{demo.title}</span>
              </div>
              <p className="text-xs text-muted-foreground text-left">
                {demo.description}
              </p>
            </Button>
          ))}
        </div>
        <div className="mt-4 p-3 bg-muted/20 rounded-lg">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Tip:</strong> Click any button above to trigger a demo notification. 
            Check the notification bell in the header and your browser notifications (if enabled).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}