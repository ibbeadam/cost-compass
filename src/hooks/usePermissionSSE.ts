/**
 * Permission SSE Hook
 * Client-side hook for receiving real-time permission updates via Server-Sent Events
 * Provides cross-device/cross-browser permission synchronization
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { showToast } from "@/lib/toast";

export interface PermissionUpdateEvent {
  type: 'permission_updated' | 'role_updated' | 'user_updated' | 'connected' | 'heartbeat';
  message: string;
  timestamp: string;
  userId?: number;
  userRole?: string;
  affectedRole?: string;
  affectedUsers?: number[];
  permissionName?: string;
  action?: 'granted' | 'revoked';
  requiresRefresh?: boolean;
}

interface UsePermissionSSEOptions {
  onPermissionUpdate?: (event: PermissionUpdateEvent) => void;
  onRoleUpdate?: (event: PermissionUpdateEvent) => void;
  onUserUpdate?: (event: PermissionUpdateEvent) => void;
  onConnectionEstablished?: () => void;
  onConnectionLost?: () => void;
  showNotifications?: boolean;
  autoReconnect?: boolean;
  reconnectDelay?: number;
}

export function usePermissionSSE(options: UsePermissionSSEOptions = {}) {
  const { data: session } = useSession();
  const {
    onPermissionUpdate,
    onRoleUpdate,
    onUserUpdate,
    onConnectionEstablished,
    onConnectionLost,
    showNotifications = true,
    autoReconnect = true,
    reconnectDelay = 3000
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<PermissionUpdateEvent | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!session?.user?.id || eventSourceRef.current?.readyState === EventSource.OPEN) {
      return;
    }

    try {
      console.log('🔄 Establishing SSE connection for permission updates...');
      
      const eventSource = new EventSource('/api/sse/permission-updates');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('✅ SSE connection established');
        setIsConnected(true);
        setConnectionAttempts(0);
        onConnectionEstablished?.();
      };

      eventSource.onmessage = (event) => {
        try {
          const updateData: PermissionUpdateEvent = JSON.parse(event.data);
          
          // Update state
          setLastUpdate(updateData);

          // Handle different types of updates
          switch (updateData.type) {
            case 'connected':
              console.log('🔗 SSE connection confirmed:', updateData.message);
              break;

            case 'heartbeat':
              // Silent heartbeat, just to keep connection alive
              break;

            case 'permission_updated':
              console.log('🔔 Global permission update:', updateData.message);
              onPermissionUpdate?.(updateData);
              
              if (showNotifications) {
                showToast.info(`Permission Update: ${updateData.message}`);
              }
              break;

            case 'role_updated':
              console.log('👥 Role permission update:', updateData.message);
              onRoleUpdate?.(updateData);
              
              // Check if this affects the current user
              if (updateData.affectedRole === session.user.role) {
                if (showNotifications) {
                  showToast.warning(`Your permissions have been updated: ${updateData.permissionName} ${updateData.action}`);
                }
              }
              break;

            case 'user_updated':
              console.log('👤 User permission update:', updateData.message);
              onUserUpdate?.(updateData);
              
              // Check if this update is for the current user
              if (updateData.userId === parseInt(session.user.id)) {
                if (showNotifications) {
                  showToast.success(`Your permission has been ${updateData.action}: ${updateData.permissionName}`);
                }
              }
              break;

            default:
              console.log('📝 Unknown SSE event type:', updateData.type);
          }

        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ SSE connection error:', error);
        setIsConnected(false);
        onConnectionLost?.();

        // Auto-reconnect if enabled
        if (autoReconnect && session?.user?.id) {
          const attempts = connectionAttempts + 1;
          setConnectionAttempts(attempts);
          
          const delay = Math.min(reconnectDelay * Math.pow(2, attempts - 1), 30000); // Exponential backoff, max 30s
          
          console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${attempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (eventSourceRef.current?.readyState !== EventSource.OPEN) {
              eventSourceRef.current?.close();
              connect();
            }
          }, delay);
        }
      };

    } catch (error) {
      console.error('Error creating SSE connection:', error);
      setIsConnected(false);
    }
  }, [
    session?.user?.id, 
    session?.user?.role,
    onPermissionUpdate, 
    onRoleUpdate, 
    onUserUpdate, 
    onConnectionEstablished, 
    onConnectionLost,
    showNotifications,
    autoReconnect,
    reconnectDelay,
    connectionAttempts
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    setConnectionAttempts(0);
    console.log('🔌 SSE connection closed');
  }, []);

  // Establish connection when user is authenticated
  useEffect(() => {
    if (session?.user?.id) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [session?.user?.id, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session?.user?.id && !isConnected) {
        console.log('🔄 Page became visible, reconnecting SSE...');
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session?.user?.id, isConnected, connect]);

  return {
    isConnected,
    lastUpdate,
    connectionAttempts,
    connect,
    disconnect,
    // Helper methods
    isCurrentUserAffected: (event: PermissionUpdateEvent) => {
      return event.userId === parseInt(session?.user?.id || '0') || 
             event.affectedRole === session?.user?.role;
    }
  };
}