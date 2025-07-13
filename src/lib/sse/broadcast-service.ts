/**
 * SSE Broadcast Service
 * Centralized service for broadcasting permission updates via Server-Sent Events
 */

// Global connection store
if (!global.sseConnections) {
  global.sseConnections = new Map();
}

export interface PermissionUpdateData {
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

/**
 * Broadcast permission updates to all connected SSE clients
 */
export function broadcastPermissionUpdate(updateData: PermissionUpdateData) {
  if (!global.sseConnections) {
    console.log('🚫 No SSE connections store available');
    return;
  }

  console.log(`📡 Broadcasting permission update:`, updateData);
  console.log(`📊 Available connections: ${global.sseConnections.size}`);
  
  // Debug: List all current connections before broadcast
  console.log(`📋 All connections before broadcast:`);
  for (const [id, conn] of global.sseConnections.entries()) {
    console.log(`  - ${id}: user ${conn.userId} (${conn.userRole}) - last activity: ${conn.lastActivity}`);
  }

  let sentCount = 0;
  const staleConnections = [];

  for (const [connectionId, connection] of global.sseConnections.entries()) {
    try {
      // Check if this connection should receive this update
      let shouldSend = false;

      console.log(`🔍 Checking connection ${connectionId}: user ${connection.userId} (${connection.userRole})`);

      if (updateData.type === 'role_updated' && connection.userRole === updateData.affectedRole) {
        shouldSend = true;
        console.log(`✅ Sending to ${connectionId}: role match (${connection.userRole})`);
      } else if (updateData.type === 'user_updated' && connection.userId === updateData.userId) {
        shouldSend = true;
        console.log(`✅ Sending to ${connectionId}: user match (${connection.userId})`);
      } else if (updateData.type === 'permission_updated') {
        shouldSend = true; // Global updates go to everyone
        console.log(`✅ Sending to ${connectionId}: global update`);
      } else {
        console.log(`⏭️ Skipping ${connectionId}: no match`);
      }

      if (shouldSend) {
        const message = `data: ${JSON.stringify(updateData)}\n\n`;
        connection.controller.enqueue(connection.encoder.encode(message));
        connection.lastActivity = new Date();
        sentCount++;
        console.log(`📤 Sent update to connection ${connectionId}`);
      }
    } catch (error) {
      console.error(`❌ Error sending to connection ${connectionId}:`, error);
      staleConnections.push(connectionId);
    }
  }

  // Clean up stale connections
  staleConnections.forEach(id => {
    global.sseConnections.delete(id);
  });

  console.log(`📡 Broadcast complete: sent to ${sentCount} connections, cleaned up ${staleConnections.length} stale`);
  console.log(`📊 Remaining connections: ${global.sseConnections?.size || 0}`);
}

/**
 * Get SSE connection statistics
 */
export function getSSEStats() {
  const stats = {
    totalConnections: global.sseConnections?.size || 0,
    connectionsByRole: {} as Record<string, number>,
    connectionsByUser: {} as Record<number, number>
  };

  if (global.sseConnections) {
    for (const connection of global.sseConnections.values()) {
      // Count by role
      stats.connectionsByRole[connection.userRole] = 
        (stats.connectionsByRole[connection.userRole] || 0) + 1;

      // Count by user
      stats.connectionsByUser[connection.userId] = 
        (stats.connectionsByUser[connection.userId] || 0) + 1;
    }
  }

  return stats;
}