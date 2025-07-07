import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server-auth";
import { toggleUserLockAction, getUserLockInfoAction } from "@/actions/prismaUserActions";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user has super admin access
    if (currentUser.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super administrators can lock/unlock user accounts" },
        { status: 403 }
      );
    }

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
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user has super admin access
    if (currentUser.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super administrators can view user lock status" },
        { status: 403 }
      );
    }

    const lockInfo = await getUserLockInfoAction(params.id);

    return NextResponse.json(lockInfo);

  } catch (error) {
    console.error("Error getting user lock info:", error);
    return NextResponse.json(
      { error: "Failed to get user lock information" },
      { status: 500 }
    );
  }
}