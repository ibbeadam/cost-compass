"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'cost-alert' | 'reminder';
  category?: 'cost' | 'operational' | 'system' | 'business';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: Date;
  read: boolean;
  actionable?: boolean;
  actionLabel?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  dailyReports: boolean;
  alerts: boolean;
  costThresholds: boolean;
  systemUpdates: boolean;
  businessInsights: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => void;
  requestPermission: () => Promise<boolean>;
  sendBrowserNotification: (title: string, message: string, options?: NotificationOptions) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    push: false,
    dailyReports: true,
    alerts: true,
    costThresholds: true,
    systemUpdates: true,
    businessInsights: true,
  });

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('notification-preferences');
    if (savedPreferences) {
      setPreferences(JSON.parse(savedPreferences));
    }

    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
      const parsed = JSON.parse(savedNotifications);
      setNotifications(parsed.map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp)
      })));
    }
  }, []);

  // Save to localStorage when preferences change
  useEffect(() => {
    localStorage.setItem('notification-preferences', JSON.stringify(preferences));
  }, [preferences]);

  // Save notifications to localStorage
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 100)); // Keep only last 100 notifications

    // Send browser notification if enabled and permission granted
    if (preferences.push && 'Notification' in window && Notification.permission === 'granted') {
      sendBrowserNotification(notification.title, notification.message);
    }

    return newNotification.id;
  }, [preferences.push]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const updatePreferences = useCallback((newPreferences: Partial<NotificationPreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }));
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }, []);

  const sendBrowserNotification = useCallback((title: string, message: string, options?: NotificationOptions) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: 'cost-compass',
        requireInteraction: false,
        ...options,
      });
    }
  }, []);

  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    preferences,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    updatePreferences,
    requestPermission,
    sendBrowserNotification,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

// Utility functions for creating specific notification types
export const createCostAlert = (
  title: string,
  message: string,
  metadata?: Record<string, any>
): Omit<Notification, 'id' | 'timestamp' | 'read'> => ({
  title,
  message,
  type: 'cost-alert',
  category: 'cost',
  priority: 'high',
  actionable: true,
  actionLabel: 'View Details',
  actionUrl: '/dashboard/reports',
  metadata,
});

export const createReminder = (
  title: string,
  message: string,
  actionUrl?: string
): Omit<Notification, 'id' | 'timestamp' | 'read'> => ({
  title,
  message,
  type: 'reminder',
  category: 'operational',
  priority: 'medium',
  actionable: !!actionUrl,
  actionLabel: 'Take Action',
  actionUrl,
});

export const createBusinessInsight = (
  title: string,
  message: string,
  metadata?: Record<string, any>
): Omit<Notification, 'id' | 'timestamp' | 'read'> => ({
  title,
  message,
  type: 'info',
  category: 'business',
  priority: 'medium',
  actionable: true,
  actionLabel: 'View Report',
  actionUrl: '/dashboard/reports',
  metadata,
});

export const createSystemNotification = (
  title: string,
  message: string,
  type: 'info' | 'warning' | 'error' = 'info'
): Omit<Notification, 'id' | 'timestamp' | 'read'> => ({
  title,
  message,
  type,
  category: 'system',
  priority: type === 'error' ? 'urgent' : 'low',
});