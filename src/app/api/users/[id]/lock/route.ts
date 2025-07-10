import { NextRequest, NextResponse } from "next/server";
import { withServerPermissions } from "@/lib/permissions/server-middleware";
import { toggleUserLockAction, getUserLockInfoAction } from "@/actions/prismaUserActions";

export const POST = withServerPermissions(
  async (
    request: NextRequest,
    context,
    { params }: { params: { id: string } }
  ) => {
    try {
      const currentUser = context.user;

    const { locked } = await request.json();
    
    if (typeof locked !== "boolean") {
      return NextResponse.json(
        { error: "Lock status must be a boolean value" },
        { status: 400 }
      );
    }

    // Prevent user from locking/unlocking themselves
    if (Number(params.id) === currentUser.id) {
      return NextResponse.json(
        { error: "Cannot modify your own account lock status" },
        { status: 400 }
      );
    }

    await toggleUserLockAction(params.id, locked, currentUser.id);

    return NextResponse.json({
      success: true,
      message: `User ${locked ? "locked" : "unlocked"} successfully`
    });

  } catch (error) {
    console.error("Error toggling user lock:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to toggle user lock status" },
      { status: 500 }
    );
  }
},
{
  permissions: ["users.lock"],
  auditAction: "UPDATE",
  auditResource: "user_lock",
  rateLimiting: {
    maxRequests: 5,
    windowMs: 60000
  }
}
);

export const GET = withServerPermissions(
  async (
    request: NextRequest,
    context,
    { params }: { params: { id: string } }
  ) => {
    try {
      const currentUser = context.user;

    const lockInfo = await getUserLockInfoAction(params.id);

    return NextResponse.json(lockInfo);

  } catch (error) {
    console.error("Error getting user lock info:", error);
    return NextResponse.json(
      { error: "Failed to get user lock information" },
      { status: 500 }
    );
  }
},
{
  permissions: ["users.read"],
  auditAction: "READ",
  auditResource: "user_lock_info",
  rateLimiting: {
    maxRequests: 10,
    windowMs: 60000
  }
}
);