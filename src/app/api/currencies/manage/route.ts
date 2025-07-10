import { NextRequest, NextResponse } from "next/server";
import { withServerPermissions } from "@/lib/permissions/server-middleware";
import { 
  getCurrenciesAction, 
  createCurrencyAction, 
  updateCurrencyAction, 
  deleteCurrencyAction,
  setDefaultCurrencyAction,
  type CreateCurrencyData,
  type UpdateCurrencyData
} from "@/actions/currencyActions";

export const GET = withServerPermissions(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const filters = {
        isActive: searchParams.get('isActive') ? searchParams.get('isActive') === 'true' : undefined,
        isSystemCurrency: searchParams.get('isSystemCurrency') ? searchParams.get('isSystemCurrency') === 'true' : undefined,
        searchTerm: searchParams.get('searchTerm') || undefined
      };

      const currencies = await getCurrenciesAction(filters);
      return NextResponse.json({ currencies });
    } catch (error) {
      console.error("Error fetching currencies for management:", error);
      return NextResponse.json(
        { error: "Failed to fetch currencies" },
        { status: 500 }
      );
    }
  },
  {
    permissions: ["system.currencies.read"],
    auditAction: "READ",
    auditResource: "currencies_manage",
    rateLimiting: {
      maxRequests: 30,
      windowMs: 60000
    }
  }
);

export const POST = withServerPermissions(
  async (request: NextRequest) => {
    try {
      const data: CreateCurrencyData = await request.json();
      const currency = await createCurrencyAction(data);
      
      return NextResponse.json({ currency }, { status: 201 });
    } catch (error) {
      console.error("Error creating currency:", error);
      return NextResponse.json(
        { error: (error as Error).message || "Failed to create currency" },
        { status: 400 }
      );
    }
  },
  {
    permissions: ["system.currencies.create"],
    auditAction: "CREATE",
    auditResource: "currency",
    rateLimiting: {
      maxRequests: 10,
      windowMs: 60000
    }
  }
);

export const PUT = withServerPermissions(
  async (request: NextRequest) => {
    try {
      const { id, ...data }: { id: number } & UpdateCurrencyData = await request.json();
      
      if (!id) {
        return NextResponse.json(
          { error: "Currency ID is required" },
          { status: 400 }
        );
      }

      const currency = await updateCurrencyAction(id, data);
      return NextResponse.json({ currency });
    } catch (error) {
      console.error("Error updating currency:", error);
      return NextResponse.json(
        { error: (error as Error).message || "Failed to update currency" },
        { status: 400 }
      );
    }
  },
  {
    permissions: ["system.currencies.update"],
    auditAction: "UPDATE",
    auditResource: "currency",
    rateLimiting: {
      maxRequests: 15,
      windowMs: 60000
    }
  }
);

export const DELETE = withServerPermissions(
  async (request: NextRequest) => {
    try {
      const { id }: { id: number } = await request.json();
      
      if (!id) {
        return NextResponse.json(
          { error: "Currency ID is required" },
          { status: 400 }
        );
      }

      await deleteCurrencyAction(id);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error deleting currency:", error);
      return NextResponse.json(
        { error: (error as Error).message || "Failed to delete currency" },
        { status: 400 }
      );
    }
  },
  {
    permissions: ["system.currencies.delete"],
    auditAction: "DELETE",
    auditResource: "currency",
    rateLimiting: {
      maxRequests: 5,
      windowMs: 60000
    }
  }
);