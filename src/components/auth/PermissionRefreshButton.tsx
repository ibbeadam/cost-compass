/**
 * Permission Refresh Button
 * Allows admins to manually trigger permission refresh for all users
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { usePermissionRefresh } from "@/hooks/usePermissionRefresh";
import { showToast } from "@/lib/toast";

interface PermissionRefreshButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function PermissionRefreshButton({ 
  variant = "outline", 
  size = "sm",
  className = "" 
}: PermissionRefreshButtonProps) {
  const { refreshMyPermissions, triggerGlobalRefresh, isRefreshing } = usePermissionRefresh();
  const [isTriggering, setIsTriggering] = useState(false);

  const handleRefresh = async () => {
    setIsTriggering(true);
    
    try {
      // First refresh current user's permissions
      const success = await refreshMyPermissions();
      
      if (success) {
        // Then trigger global refresh for all users
        triggerGlobalRefresh();
        
        showToast.success("Permissions refreshed! All users will receive updated permissions.");
      } else {
        showToast.error("Failed to refresh permissions. Please try again.");
      }
    } catch (error) {
      console.error('Error during permission refresh:', error);
      showToast.error("An error occurred while refreshing permissions");
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleRefresh}
      disabled={isRefreshing || isTriggering}
      className={className}
    >
      <RefreshCw 
        className={`w-4 h-4 mr-2 ${(isRefreshing || isTriggering) ? 'animate-spin' : ''}`} 
      />
      {(isRefreshing || isTriggering) ? 'Refreshing...' : 'Refresh Permissions'}
    </Button>
  );
}

/**
 * Compact version for toolbar use
 */
export function PermissionRefreshIcon() {
  const { refreshMyPermissions, triggerGlobalRefresh, isRefreshing } = usePermissionRefresh();

  const handleRefresh = async () => {
    const success = await refreshMyPermissions();
    if (success) {
      triggerGlobalRefresh();
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="p-2"
      title="Refresh permissions for all users"
    >
      <RefreshCw 
        className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
      />
    </Button>
  );
}