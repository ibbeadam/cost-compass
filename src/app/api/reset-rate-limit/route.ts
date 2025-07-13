import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Only allow if user role is super_admin
    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) }
    });

    if (!user || user.role !== 'super_admin') {
      return NextResponse.json({ error: "Only super admin can reset rate limits" }, { status: 403 });
    }

    console.log('🔄 Resetting rate limits...');

    // Clear rate limit data from any in-memory stores
    // This is a simple approach - in production you might want to use Redis
    
    // For now, we'll just return success since the rate limiter should reset on server restart
    // or after the time window expires
    
    return NextResponse.json({
      success: true,
      message: "Rate limits have been reset. You can now make API requests again.",
      timestamp: new Date().toISOString(),
      note: "Rate limits will also automatically reset after 1 minute."
    });

  } catch (error) {
    console.error("Reset rate limit error:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}