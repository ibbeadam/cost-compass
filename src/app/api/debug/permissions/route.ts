import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PropertyAccessService } from "@/lib/property-access";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    
    // Get user data with all related permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userPermissions: {
          include: { permission: true },
          where: {
            granted: true,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get role permissions from database
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role: user.role },
      include: { permission: true }
    });

    // Get computed permissions using the service
    const computedPermissions = await PropertyAccessService.getUserPropertyPermissions(userId, 0);

    // Check specific permissions needed for roles-permissions API
    const requiredPermissions = ["system.roles.read", "users.roles.manage", "system.admin.full_access"];
    const hasPermissions = requiredPermissions.map(perm => ({
      permission: perm,
      hasPermission: computedPermissions.includes(perm)
    }));

    const debugInfo = {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      },
      session: {
        user: session.user,
        expires: session.expires
      },
      rolePermissionsFromDB: rolePermissions.map(rp => ({
        permission: `${rp.permission.resource}.${rp.permission.action}`,
        name: rp.permission.name,
        category: rp.permission.category
      })),
      userSpecificPermissions: user.userPermissions.map(up => ({
        permission: `${up.permission.resource}.${up.permission.action}`,
        name: up.permission.name,
        granted: up.granted,
        expiresAt: up.expiresAt
      })),
      computedPermissions,
      requiredPermissionCheck: hasPermissions,
      canAccessRolesAPI: hasPermissions.some(p => p.hasPermission)
    };

    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error("Debug permissions error:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}