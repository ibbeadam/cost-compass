import { NextRequest, NextResponse } from "next/server";
import { withServerPermissions } from "@/lib/permissions/server-middleware";
import { 
  getRolesWithPermissions,
  assignPermissionToRole,
  removePermissionFromRole,
  bulkAssignPermissionsToRole,
  bulkRemovePermissionsFromRole,
  copyRolePermissions,
  getRolePermissionStats
} from "@/actions/rolePermissionActions";
import type { UserRole } from "@/types";

/**
 * GET - Fetch roles with permissions or stats
 */
export const GET = withServerPermissions(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const action = searchParams.get("action");

      if (action === "stats") {
        const result = await getRolePermissionStats();
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        return NextResponse.json(result.data);
      }

      // Default: Get roles with permissions
      const result = await getRolesWithPermissions();
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ roles: result.data });
    } catch (error) {
      console.error("GET /api/roles-permissions error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  },
  {
    permissions: ["system.roles.read", "users.roles.manage", "system.admin.full_access"],
    requireAllPermissions: false, // User needs ANY of these permissions
    auditAction: "READ",
    auditResource: "roles_permissions",
    rateLimiting: {
      maxRequests: 100,
      windowMs: 60000
    }
  }
);

/**
 * POST - Assign permission to role or perform bulk operations
 */
export const POST = withServerPermissions(
  async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { action, role, permissionId, permissionIds, sourceRole, targetRole, overwrite } = body;

    // Validate role
    if (!role || typeof role !== "string") {
      return NextResponse.json({ error: "Valid role is required" }, { status: 400 });
    }

    switch (action) {
      case "assign": {
        if (!permissionId || typeof permissionId !== "number") {
          return NextResponse.json({ error: "Valid permission ID is required" }, { status: 400 });
        }

        const result = await assignPermissionToRole(role as UserRole, permissionId);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ message: "Permission assigned successfully" });
      }

      case "bulk-assign": {
        if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
          return NextResponse.json({ error: "Valid permission IDs array is required" }, { status: 400 });
        }

        const result = await bulkAssignPermissionsToRole(role as UserRole, permissionIds);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
          message: `Bulk assignment completed`,
          assigned: result.assigned,
          skipped: result.skipped
        });
      }

      case "copy": {
        if (!sourceRole || !targetRole) {
          return NextResponse.json({ error: "Source and target roles are required" }, { status: 400 });
        }

        const result = await copyRolePermissions(
          sourceRole as UserRole,
          targetRole as UserRole,
          overwrite || false
        );
        
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
          message: "Role permissions copied successfully",
          copied: result.copied,
          skipped: result.skipped
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("POST /api/roles-permissions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
},
{
  permissions: ["system.roles.update", "users.roles.manage", "system.admin.full_access"],
  requireAllPermissions: false, // User needs ANY of these permissions
  auditAction: "UPDATE",
  auditResource: "role_permissions",
  rateLimiting: {
    maxRequests: 50,
    windowMs: 60000
  }
}
);

/**
 * DELETE - Remove permission from role or bulk remove
 */
export const DELETE = withServerPermissions(
  async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { action, role, permissionId, permissionIds } = body;

    // Validate role
    if (!role || typeof role !== "string") {
      return NextResponse.json({ error: "Valid role is required" }, { status: 400 });
    }

    switch (action) {
      case "remove": {
        if (!permissionId || typeof permissionId !== "number") {
          return NextResponse.json({ error: "Valid permission ID is required" }, { status: 400 });
        }

        const result = await removePermissionFromRole(role as UserRole, permissionId);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ message: "Permission removed successfully" });
      }

      case "bulk-remove": {
        if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
          return NextResponse.json({ error: "Valid permission IDs array is required" }, { status: 400 });
        }

        const result = await bulkRemovePermissionsFromRole(role as UserRole, permissionIds);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
          message: "Bulk removal completed",
          removed: result.removed,
          notFound: result.notFound
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("DELETE /api/roles-permissions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
},
{
  permissions: ["system.roles.update", "users.roles.manage", "system.admin.full_access"],
  requireAllPermissions: false, // User needs ANY of these permissions
  auditAction: "DELETE",
  auditResource: "role_permissions",
  rateLimiting: {
    maxRequests: 50,
    windowMs: 60000
  }
}
);