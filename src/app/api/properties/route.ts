import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getPropertiesAction, createPropertyAction } from "@/actions/propertyActions";
import { getUserFromHeaders } from "@/middleware";
import { PermissionService } from "@/lib/permission-utils";

/**
 * GET /api/properties
 * Get all properties (filtered by user access)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user context from middleware headers
    const { userId, role } = getUserFromHeaders(request);
    
    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const filters = {
      isActive: searchParams.get('isActive') === 'true' ? true : 
                searchParams.get('isActive') === 'false' ? false : undefined,
      propertyType: searchParams.get('propertyType') || undefined,
      searchTerm: searchParams.get('search') || undefined,
    };

    // Check if user has permission to view properties
    const user = {
      id: parseInt(session.user.id),
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      department: session.user.department,
      phoneNumber: session.user.phoneNumber,
      isActive: true,
      permissions: session.user.permissions || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const canViewProperties = PermissionService.hasAnyPermission(user, [
      'properties.read',
      'properties.view_all',
      'properties.view_own'
    ]);

    if (!canViewProperties) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Get properties based on user permissions
    let properties;
    
    if (PermissionService.hasPermission(user, 'properties.view_all') || 
        PermissionService.isSuperAdmin(user)) {
      // User can see all properties
      properties = await getPropertiesAction(filters);
    } else {
      // User can only see their accessible properties
      // TODO: Implement user-specific property filtering when database is updated
      properties = await getPropertiesAction({
        ...filters,
        // ownerId: userId, // Uncomment when schema is updated
      });
    }

    return NextResponse.json({ properties });
  } catch (error) {
    console.error("Error fetching properties:", error);
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/properties
 * Create a new property
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to create properties
    const user = {
      id: parseInt(session.user.id),
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      department: session.user.department,
      phoneNumber: session.user.phoneNumber,
      isActive: true,
      permissions: session.user.permissions || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const canCreateProperties = PermissionService.hasPermission(user, 'properties.create');

    if (!canCreateProperties) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.propertyCode || !body.propertyType) {
      return NextResponse.json(
        { error: "Missing required fields: name, propertyCode, propertyType" },
        { status: 400 }
      );
    }

    // Create the property
    const property = await createPropertyAction({
      name: body.name,
      propertyCode: body.propertyCode,
      propertyType: body.propertyType,
      address: body.address,
      city: body.city,
      state: body.state,
      country: body.country,
      timeZone: body.timeZone,
      currency: body.currency,
      logoUrl: body.logoUrl,
      ownerId: body.ownerId || parseInt(session.user.id), // Default to current user as owner
      managerId: body.managerId,
    });

    return NextResponse.json({ property }, { status: 201 });
  } catch (error) {
    console.error("Error creating property:", error);
    
    if (error instanceof Error && error.message.includes("already exists")) {
      return NextResponse.json(
        { error: "Property code already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create property" },
      { status: 500 }
    );
  }
}