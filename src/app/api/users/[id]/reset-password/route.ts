import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server-auth";
import { resetUserPasswordAction } from "@/actions/prismaUserActions";

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

    // Check if user has super admin access (only super admins can reset passwords)
    if (currentUser.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super administrators can reset user passwords" },
        { status: 403 }
      );
    }

    const { newPassword } = await request.json();
    
    if (!newPassword) {
      return NextResponse.json(
        { error: "New password is required" },
        { status: 400 }
      );
    }

    // Validate password length
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Prevent user from resetting their own password through this endpoint
    if (Number(params.id) === currentUser.id) {
      return NextResponse.json(
        { error: "Cannot reset your own password through this endpoint" },
        { status: 400 }
      );
    }

    await resetUserPasswordAction(params.id, newPassword, currentUser.id);

    return NextResponse.json({
      success: true,
      message: "Password reset successfully"
    });

  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reset password" },
      { status: 500 }
    );
  }
}