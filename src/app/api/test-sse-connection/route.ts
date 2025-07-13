import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  console.log(`\n🧪 TEST SSE CONNECTION REQUEST`);
  console.log(`🕐 Time: ${new Date().toISOString()}`);
  
  try {
    const session = await getServerSession(authOptions);
    console.log(`🔐 Test session:`, {
      hasSession: !!session,
      userId: session?.user?.id,
      userRole: session?.user?.role
    });

    if (!session?.user) {
      console.log(`❌ Test: No session found`);
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    console.log(`✅ Test: Session found for user ${session.user.id} (${session.user.role})`);
    
    // Check global connections
    console.log(`📊 Test: Current SSE connections: ${global.sseConnections?.size || 0}`);
    if (global.sseConnections) {
      for (const [id, conn] of global.sseConnections.entries()) {
        console.log(`  - ${id}: user ${conn.userId} (${conn.userRole})`);
      }
    }

    return NextResponse.json({
      success: true,
      userId: session.user.id,
      userRole: session.user.role,
      totalConnections: global.sseConnections?.size || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Test SSE connection error:', error);
    return NextResponse.json({ error: 'Test failed' }, { status: 500 });
  }
}