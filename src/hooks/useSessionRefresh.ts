/**
 * Session Refresh Hook
 * Provides functionality to refresh user session and permissions
 */

"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

export function useSessionRefresh() {
  const { data: session, update } = useSession();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  /**
   * Refresh user permissions from server
   */
  const refreshPermissions = useCallback(async () => {
    if (!session?.user?.id || isRefreshing) {
      return false;
    }

    setIsRefreshing(true);
    
    try {
      // Call our refresh endpoint
      const response = await fetch('/api/auth/refresh-permissions', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to refresh permissions');
      }

      const result = await response.json();
      
      if (result.success) {
        // Update the session with new permissions
        await update({
          ...session,
          user: {
            ...session.user,
            permissions: result.data.permissions,
            role: result.data.role,
          }
        });

        setLastRefresh(new Date());
        console.log('Permissions refreshed successfully');
        return true;
      } else {
        console.error('Failed to refresh permissions:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error refreshing permissions:', error);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [session, update, isRefreshing]);

  /**
   * Auto-refresh permissions periodically - DISABLED
   * Uncomment the code below to re-enable automatic permission refresh every 30 seconds
   */
  // useEffect(() => {
  //   if (!session?.user?.id) return;

  //   // Refresh permissions every 30 seconds
  //   const interval = setInterval(() => {
  //     refreshPermissions();
  //   }, 30000);

  //   return () => clearInterval(interval);
  // }, [session?.user?.id, refreshPermissions]);

  /**
   * Refresh permissions when the page becomes visible - DISABLED
   * Uncomment the code below to re-enable automatic permission refresh when switching tabs
   */
  // useEffect(() => {
  //   const handleVisibilityChange = () => {
  //     if (document.visibilityState === 'visible' && session?.user?.id) {
  //       // Refresh permissions when user comes back to the tab
  //       setTimeout(() => {
  //         refreshPermissions();
  //       }, 1000);
  //     }
  //   };

  //   document.addEventListener('visibilitychange', handleVisibilityChange);
  //   return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  // }, [session?.user?.id, refreshPermissions]);

  return {
    refreshPermissions,
    isRefreshing,
    lastRefresh,
  };
}