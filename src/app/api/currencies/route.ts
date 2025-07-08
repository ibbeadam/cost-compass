import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server-auth";
import { getActiveCurrenciesAction } from "@/actions/currencyActions";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

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
}