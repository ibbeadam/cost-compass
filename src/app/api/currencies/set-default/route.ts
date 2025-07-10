import { NextRequest, NextResponse } from "next/server";
import { withServerPermissions } from "@/lib/permissions/server-middleware";
import { setDefaultCurrencyAction } from "@/actions/currencyActions";

export const POST = withServerPermissions(
  async (request: NextRequest) => {
    try {
      const { id }: { id: number } = await request.json();
      
      if (!id) {
        return NextResponse.json(
          { error: "Currency ID is required" },
          { status: 400 }
        );
      }

      await setDefaultCurrencyAction(id);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error setting default currency:", error);
      return NextResponse.json(
        { error: (error as Error).message || "Failed to set default currency" },
        { status: 400 }
      );
    }
  },
  {
    permissions: ["system.currencies.update"],
    auditAction: "UPDATE",
    auditResource: "default_currency",
    rateLimiting: {
      maxRequests: 5,
      windowMs: 60000
    }
  }
);