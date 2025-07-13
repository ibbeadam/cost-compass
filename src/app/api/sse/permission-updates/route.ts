/**
 * Server-Sent Events endpoint for real-time permission updates
 * Simplified implementation for reliable cross-device/browser updates
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Global connection store (in production, use Redis or similar)
if (!global.sseConnections) {
  global.sseConnections = new Map();
  console.log(`🆕 Initializing new global SSE connections store`);
} else {
  console.log(`♻️ Using existing global SSE connections store with ${global.sseConnections.size} connections`);
}

export async function GET(request: NextRequest) {
  console.log(`\n=================== NEW SSE REQUEST ===================`);
  console.log(`🌐 SSE request received at: ${new Date().toISOString()}`);
  console.log(`🔍 Request URL: ${request.url}`);
  console.log(`👤 User Agent: ${request.headers.get('user-agent')?.substring(0, 100)}...`);
  
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    console.log(`🔐 Session check result:`, {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasUserId: !!session?.user?.id,
      userId: session?.user?.id,
      userRole: session?.user?.role
    });
    
    if (!session?.user?.id) {
      console.log(`❌ SSE connection rejected: no valid session`);
      return new Response('Unauthorized', { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const userRole = session.user.role;

    console.log(`🔄 SSE connection establishing for user ${userId} (${userRole})`);

    // Create response headers for SSE
    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Create readable stream
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection confirmation
        const encoder = new TextEncoder();
        
        try {
          const initialMessageData = {
            type: 'connected',
            message: 'Permission update stream connected',
            timestamp: new Date().toISOString(),
            userId,
            userRole
          };

          const initialMessage = `data: ${JSON.stringify(initialMessageData)}\n\n`;
          controller.enqueue(encoder.encode(initialMessage));

          // Store connection in global map
          const connectionId = `${userId}_${Date.now()}`;
          console.log(`💾 Attempting to store SSE connection: ${connectionId}`);
          console.log(`📊 Current connections before storage: ${global.sseConnections.size}`);
          
          const connectionData = {
            controller,
            encoder,
            userId,
            userRole,
            lastActivity: new Date()
          };
          
          global.sseConnections.set(connectionId, connectionData);
          
          // Verify storage
          const storedConnection = global.sseConnections.get(connectionId);
          console.log(`✅ SSE connection stored: ${connectionId}`, {
            stored: !!storedConnection,
            userId: storedConnection?.userId,
            userRole: storedConnection?.userRole
          });
          console.log(`📊 Total SSE connections after storage: ${global.sseConnections.size}`);
          
          // List all current connections
          console.log(`📋 All current connections:`);
          for (const [id, conn] of global.sseConnections.entries()) {
            console.log(`  - ${id}: user ${conn.userId} (${conn.userRole})`);
          }

          // Send heartbeat every 30 seconds
          const heartbeatInterval = setInterval(() => {
            try {
              const heartbeat = `data: ${JSON.stringify({
                type: 'heartbeat',
                timestamp: new Date().toISOString()
              })}\n\n`;
              
              controller.enqueue(encoder.encode(heartbeat));
              
              // Update last activity
              const connection = global.sseConnections.get(connectionId);
              if (connection) {
                connection.lastActivity = new Date();
              }
            } catch (error) {
              console.error(`💓 Heartbeat error for ${connectionId}:`, error);
              clearInterval(heartbeatInterval);
              const deleted = global.sseConnections.delete(connectionId);
              console.log(`🗑️ Heartbeat cleanup - deleted connection: ${deleted}`);
              console.log(`📊 Connections after heartbeat cleanup: ${global.sseConnections.size}`);
              try {
                controller.close();
              } catch (e) {
                // Controller already closed
              }
            }
          }, 30000);

          // Handle client disconnect
          request.signal?.addEventListener('abort', () => {
            console.log(`🔌 SSE connection closed for user ${userId} (${userRole})`);
            console.log(`🗑️ Removing connection: ${connectionId}`);
            clearInterval(heartbeatInterval);
            const deleted = global.sseConnections.delete(connectionId);
            console.log(`🗑️ Connection deletion result: ${deleted}`);
            console.log(`📊 Remaining connections: ${global.sseConnections.size}`);
            try {
              controller.close();
            } catch (e) {
              // Controller already closed
            }
          });

        } catch (error) {
          console.error('SSE start error:', error);
          try {
            controller.close();
          } catch (e) {
            // Controller already closed
          }
        }
      },

      cancel() {
        console.log(`🔌 SSE stream cancelled for user ${userId} (${userRole})`);
        console.log(`📊 Connections at cancel time: ${global.sseConnections?.size || 0}`);
      }
    });

    return new Response(stream, { headers });

  } catch (error) {
    console.error('SSE endpoint error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Re-export the broadcast function from the shared service
export { broadcastPermissionUpdate, getSSEStats } from '@/lib/sse/broadcast-service';