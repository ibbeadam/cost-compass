"use client";

import React, { useState } from 'react';
import { useNotifications, Notification } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetDescription 
} from '@/components/ui/sheet';
import { 
  Bell, 
  BellRing, 
  X, 
  Check, 
  AlertTriangle, 
  Info, 
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Clock,
  DollarSign,
  Settings,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const getNotificationIcon = (notification: Notification) => {
  switch (notification.type) {
    case 'cost-alert':
      return <DollarSign className="h-4 w-4 text-red-500" />;
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'reminder':
      return <Clock className="h-4 w-4 text-blue-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'border-l-red-500 bg-red-50 dark:bg-red-950/20';
    case 'high':
      return 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20';
    case 'medium':
      return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20';
    default:
      return 'border-l-gray-500 bg-gray-50 dark:bg-gray-950/20';
  }
};

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
}

function NotificationItem({ notification, onMarkAsRead, onRemove }: NotificationItemProps) {
  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsRead(notification.id);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(notification.id);
  };

  return (
    <Card 
      className={cn(
        "mb-3 border-l-4 transition-all duration-200 hover:shadow-md",
        getPriorityColor(notification.priority),
        !notification.read && "ring-1 ring-primary/20"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="mt-0.5">
              {getNotificationIcon(notification)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className={cn(
                  "text-sm font-medium truncate",
                  !notification.read && "text-foreground",
                  notification.read && "text-muted-foreground"
                )}>
                  {notification.title}
                </h4>
                {!notification.read && (
                  <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {notification.message}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatDistanceToNow(notification.timestamp, { addSuffix: true })}</span>
                {notification.category && (
                  <>
                    <span>•</span>
                    <Badge variant="secondary" className="text-xs">
                      {notification.category}
                    </Badge>
                  </>
                )}
              </div>
              {notification.actionable && notification.actionUrl && (
                <Link 
                  href={notification.actionUrl}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                >
                  {notification.actionLabel || 'View Details'}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!notification.read && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAsRead}
                className="h-8 w-8 p-0"
                title="Mark as read"
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              title="Remove notification"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function NotificationBell() {
  const { unreadCount } = useNotifications();
  
  return (
    <div className="relative">
      {unreadCount > 0 ? (
        <BellRing className="h-5 w-5" />
      ) : (
        <Bell className="h-5 w-5" />
      )}
      {unreadCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </div>
  );
}

export function NotificationCenter() {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    removeNotification, 
    clearAll 
  } = useNotifications();
  
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  
  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <NotificationBell />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:w-96 sm:max-w-none">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="secondary">
                {unreadCount} new
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Stay updated with your cost monitoring alerts and insights
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Filter and Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All ({notifications.length})
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('unread')}
              >
                Unread ({unreadCount})
              </Button>
            </div>
            
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Clear all
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Notifications List */}
          <ScrollArea className="h-[calc(100vh-200px)]">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No notifications</h3>
                <p className="text-sm text-muted-foreground">
                  {filter === 'unread' 
                    ? "You're all caught up! No unread notifications."
                    : "You'll see notifications here when they arrive."
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredNotifications.map(notification => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onRemove={removeNotification}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}