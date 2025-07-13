/**
 * Permission Refresh Hook
 * Provides functionality to manually trigger permission refresh
 */

"use client";

import { useCallback, useState } from "react";
import { useSession } from "next-auth/react";

export function usePermissionRefresh() {
  const { update } = useSession();
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Manually refresh current user's permissions
   */
  const refreshMyPermissions = useCallback(async () => {
    if (isRefreshing) return false;

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
          permissions: result.data.permissions,
          role: result.data.role,
        });

        console.log('✅ Permissions refreshed successfully');
        return true;
      } else {
        console.error('❌ Failed to refresh permissions:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error refreshing permissions:', error);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [update, isRefreshing]);

  /**
   * Trigger global permission refresh notification
   * This will cause all clients to refresh their permissions
   */
  const triggerGlobalRefresh = useCallback(() => {
    // Dispatch custom event to trigger refresh across all tabs
    window.dispatchEvent(new CustomEvent('refresh-permissions'));
    
    // Also store in localStorage for cross-tab communication
    localStorage.setItem('permissions-updated', Date.now().toString());
    
    console.log('🔄 Global permission refresh triggered');
  }, []);

  return {
    refreshMyPermissions,
    triggerGlobalRefresh,
    isRefreshing,
  };
}