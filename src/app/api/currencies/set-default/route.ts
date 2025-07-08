import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server-auth";
import { setDefaultCurrencyAction } from "@/actions/currencyActions";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super administrators can manage currencies" },
        { status: 403 }
      );
    }

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
}