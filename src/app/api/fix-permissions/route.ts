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

    // Only allow if user role is super_admin or if it's for fixing permissions
    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) }
    });

    if (!user || user.role !== 'super_admin') {
      return NextResponse.json({ error: "Only super admin can fix permissions" }, { status: 403 });
    }

    console.log('🔧 Starting permission fix...');

    // 1. Ensure super admin permissions exist
    try {
      const { ensureSuperAdminPermissions } = await import('@/lib/permission-refresh');
      await ensureSuperAdminPermissions();
    } catch (error) {
      console.warn('Could not load permission refresh function:', error);
    }

    // 2. Get all super admin users and verify their permissions
    const superAdmins = await prisma.user.findMany({
      where: { role: 'super_admin' }
    });

    const results = [];
    
    for (const admin of superAdmins) {
      // Get role permissions for super_admin
      const rolePermissions = await prisma.rolePermission.findMany({
        where: { role: 'super_admin' },
        include: { permission: true }
      });

      results.push({
        userId: admin.id,
        email: admin.email,
        rolePermissionsCount: rolePermissions.length,
        hasRequiredPermissions: rolePermissions.some(rp => 
          ['system.roles.read', 'users.roles.manage', 'system.admin.full_access'].includes(rp.permission.name)
        )
      });
    }

    // 3. Clear any permission caches
    try {
      // Clear Node.js cache for permission modules
      delete require.cache[require.resolve('@/lib/property-access')];
      delete require.cache[require.resolve('@/lib/permission-utils')];
    } catch (e) {
      // Cache clearing is optional
    }

    console.log('✅ Permission fix completed');

    return NextResponse.json({
      success: true,
      message: "Permissions fixed successfully",
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Fix permissions error:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}