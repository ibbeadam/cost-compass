import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server-auth";
import { 
  getCurrenciesAction, 
  createCurrencyAction, 
  updateCurrencyAction, 
  deleteCurrencyAction,
  setDefaultCurrencyAction,
  type CreateCurrencyData,
  type UpdateCurrencyData
} from "@/actions/currencyActions";

export async function GET(request: NextRequest) {
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
}

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
}

export async function PUT(request: NextRequest) {
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
}

export async function DELETE(request: NextRequest) {
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

    await deleteCurrencyAction(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting currency:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to delete currency" },
      { status: 400 }
    );
  }
}