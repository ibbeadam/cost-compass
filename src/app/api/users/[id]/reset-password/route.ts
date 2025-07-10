import { NextRequest, NextResponse } from "next/server";
import { withServerPermissions } from "@/lib/permissions/server-middleware";
import { resetUserPasswordAction } from "@/actions/prismaUserActions";

export const POST = withServerPermissions(
  async (
    request: NextRequest,
    context,
    { params }: { params: { id: string } }
  ) => {
    try {
      const currentUser = context.user;

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
},
{
  permissions: ["users.password.reset"],
  auditAction: "UPDATE",
  auditResource: "user_password",
  rateLimiting: {
    maxRequests: 3,
    windowMs: 60000
  }
}
);