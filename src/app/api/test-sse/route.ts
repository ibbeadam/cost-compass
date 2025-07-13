/**
 * Test SSE endpoint - for development testing only
 * Allows admins to test the real-time permission update system
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { broadcastPermissionUpdate, getSSEStats } from "@/lib/sse/broadcast-service";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: "Only super admin can test SSE" }, { status: 403 });
    }

    const { type, role, permissionName, message } = await request.json();

    switch (type) {
      case 'role_update':
        console.log(`🧪 Testing role update broadcast for role: ${role || 'readonly'}`);
        broadcastPermissionUpdate({
          type: 'role_updated',
          message: `Test permission update for role ${role || 'readonly'}`,
          timestamp: new Date().toISOString(),
          affectedRole: role || 'readonly',
          permissionName: permissionName || 'test.permission.read',
          action: 'granted',
          requiresRefresh: true
        });
        break;

      case 'global_update':
        broadcastPermissionUpdate({
          type: 'permission_updated',
          message: message || 'Testing global permission update',
          timestamp: new Date().toISOString(),
          requiresRefresh: true
        });
        break;

      default:
        return NextResponse.json({ error: "Invalid test type" }, { status: 400 });
    }

    const stats = getSSEStats();

    return NextResponse.json({
      success: true,
      message: `Test ${type} notification sent`,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Test SSE error:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}