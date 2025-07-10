import { NextRequest, NextResponse } from "next/server";
import { withServerPermissions } from "@/lib/permissions/server-middleware";
import { getActiveCurrenciesAction } from "@/actions/currencyActions";

export const GET = withServerPermissions(
  async (request: NextRequest) => {
    try {
      // Get active currencies for dropdown
      const currencies = await getActiveCurrenciesAction();
      
      // Transform to the format expected by the frontend
      const currencyOptions = currencies.map(currency => ({
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol,
        displayName: currency.displayName,
        decimalPlaces: currency.decimalPlaces,
        locale: currency.locale
      }));

      return NextResponse.json({ currencies: currencyOptions });
    } catch (error) {
      console.error("Error fetching currencies:", error);
      return NextResponse.json(
        { error: "Failed to fetch currencies" },
        { status: 500 }
      );
    }
  },
  {
    permissions: ["financial.read"],
    auditAction: "READ",
    auditResource: "currencies",
    rateLimiting: {
      maxRequests: 50,
      windowMs: 60000 // 50 requests per minute
    }
  }
);