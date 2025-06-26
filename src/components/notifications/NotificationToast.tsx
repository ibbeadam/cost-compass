"use client";

import React, { useEffect, useState } from 'react';
import { useNotifications, Notification } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';
import { X, Bell, AlertTriangle, CheckCircle, Info, DollarSign, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ToastNotificationProps {
  notification: Notification;
  onDismiss: () => void;
  duration?: number;
}

const getToastIcon = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case 'error':
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    case 'cost-alert':
      return <DollarSign className="h-5 w-5 text-red-500" />;
    case 'reminder':
      return <Clock className="h-5 w-5 text-blue-500" />;
    default:
      return <Info className="h-5 w-5 text-blue-500" />;
  }
};

const getToastStyles = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20';
    case 'warning':
      return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20';
    case 'error':
      return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20';
    case 'cost-alert':
      return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20';
    case 'reminder':
      return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20';
    default:
      return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20';
  }
};

function ToastNotification({ notification, onDismiss, duration = 5000 }: ToastNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger animation on mount
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] transform transition-all duration-300 ease-in-out",
        "border rounded-lg shadow-lg backdrop-blur-sm",
        getToastStyles(notification.type),
        isVisible && !isExiting ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {getToastIcon(notification.type)}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-foreground mb-1">
              {notification.title}
            </h4>
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
              {notification.message}
            </p>
            {notification.actionable && notification.actionUrl && (
              <Link 
                href={notification.actionUrl}
                className="inline-flex items-center text-sm text-primary hover:underline"
                onClick={handleDismiss}
              >
                {notification.actionLabel || 'View Details'}
              </Link>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function NotificationToastContainer() {
  const { notifications } = useNotifications();
  const [displayedToasts, setDisplayedToasts] = useState<string[]>([]);

  // Only show toasts for new notifications (last 3, unread, high priority)
  const toastNotifications = notifications
    .filter(n => !n.read && (n.priority === 'high' || n.priority === 'urgent'))
    .slice(0, 3)
    .filter(n => !displayedToasts.includes(n.id));

  const handleDismissToast = (notificationId: string) => {
    setDisplayedToasts(prev => [...prev, notificationId]);
  };

  return (
    <div className="fixed top-0 right-0 z-50 pointer-events-none">
      <div className="space-y-2">
        {toastNotifications.map((notification, index) => (
          <div
            key={notification.id}
            className="pointer-events-auto"
            style={{
              transform: `translateY(${index * 8}px)`,
              zIndex: 50 - index,
            }}
          >
            <ToastNotification
              notification={notification}
              onDismiss={() => handleDismissToast(notification.id)}
              duration={notification.priority === 'urgent' ? 8000 : 5000}
            />
          </div>
        ))}
      </div>
    </div>
  );
}