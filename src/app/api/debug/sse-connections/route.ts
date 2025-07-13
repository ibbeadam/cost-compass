import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: "Only super admin can view SSE debug info" }, { status: 403 });
    }

    const connections = [];
    
    if (global.sseConnections) {
      for (const [connectionId, connection] of global.sseConnections.entries()) {
        connections.push({
          connectionId,
          userId: connection.userId,
          userRole: connection.userRole,
          lastActivity: connection.lastActivity,
          isActive: Date.now() - connection.lastActivity.getTime() < 60000 // Active in last minute
        });
      }
    }

    return NextResponse.json({
      totalConnections: global.sseConnections?.size || 0,
      connections,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("SSE debug error:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}