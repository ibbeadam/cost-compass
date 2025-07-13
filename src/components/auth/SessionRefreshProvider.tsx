/**
 * Session Refresh Provider
 * Automatically refreshes user session when permissions change
 */

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSessionRefresh } from "@/hooks/useSessionRefresh";

interface SessionRefreshProviderProps {
  children: React.ReactNode;
}

export function SessionRefreshProvider({ children }: SessionRefreshProviderProps) {
  const { data: session } = useSession();
  const { refreshPermissions } = useSessionRefresh();
  const [isSSEConnected, setIsSSEConnected] = useState(false);

  // Simple SSE connection for real-time permission updates
  useEffect(() => {
    if (!session?.user?.id) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      try {
        console.log('🔄 Connecting to SSE...');
        eventSource = new EventSource('/api/sse/permission-updates');

        eventSource.onopen = () => {
          console.log('✅ SSE connected');
          setIsSSEConnected(true);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📨 SSE message received:', data);

            // Handle different types of updates
            if (data.type === 'role_updated' && data.affectedRole === session.user.role && data.requiresRefresh) {
              console.log('🔄 Role permission updated, refreshing session...');
              refreshPermissions();
            } else if (data.type === 'user_updated' && data.userId === parseInt(session.user.id) && data.requiresRefresh) {
              console.log('🔄 User permission updated, refreshing session...');
              refreshPermissions();
            } else if (data.type === 'permission_updated' && data.requiresRefresh) {
              console.log('🔄 Global permission update, refreshing session...');
              refreshPermissions();
            }
          } catch (error) {
            console.error('Error parsing SSE message:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('❌ SSE error:', error);
          setIsSSEConnected(false);
          
          if (eventSource) {
            eventSource.close();
          }

          // Reconnect after 3 seconds
          reconnectTimeout = setTimeout(() => {
            connect();
          }, 3000);
        };

      } catch (error) {
        console.error('Error creating SSE connection:', error);
        setIsSSEConnected(false);
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (eventSource) {
        eventSource.close();
      }
      setIsSSEConnected(false);
    };
  }, [session?.user?.id, session?.user?.role, refreshPermissions]);

  // Listen for storage events (for cross-tab communication)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      // If another tab triggered a permission refresh, refresh this tab too
      if (event.key === 'permissions-updated' && session?.user?.id) {
        console.log('Permissions updated in another tab, refreshing...');
        refreshPermissions();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [session?.user?.id, refreshPermissions]);

  // Listen for custom permission refresh events
  useEffect(() => {
    const handlePermissionRefresh = () => {
      if (session?.user?.id) {
        console.log('Permission refresh event received');
        refreshPermissions();
      }
    };

    // Listen for custom events
    window.addEventListener('refresh-permissions', handlePermissionRefresh);
    return () => window.removeEventListener('refresh-permissions', handlePermissionRefresh);
  }, [session?.user?.id, refreshPermissions]);

  return (
    <>
      {children}
      {/* SSE Connection status indicator */}
      {session?.user?.id && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
            isSSEConnected 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
          }`}>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                isSSEConnected ? 'bg-green-500' : 'bg-yellow-500'
              }`} />
              <span>{isSSEConnected ? 'Live Updates' : 'Connecting...'}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Utility function to trigger permission refresh across all tabs
 */
export function triggerPermissionRefresh() {
  // Trigger storage event for cross-tab communication
  localStorage.setItem('permissions-updated', Date.now().toString());
  
  // Trigger custom event for current tab
  window.dispatchEvent(new CustomEvent('refresh-permissions'));
  
  console.log('Permission refresh triggered');
}