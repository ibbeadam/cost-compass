import { NextRequest, NextResponse } from "next/server";
import { getPropertiesAction, createPropertyAction } from "@/actions/propertyActions";
import { withServerPermissions, SecureApiContext } from "@/lib/permissions/server-middleware";
import { PropertyDataFilter } from "@/lib/permissions/data-isolation";

/**
 * GET /api/properties
 * Get all properties (filtered by user access)
 */
async function handleGetProperties(request: NextRequest, context: SecureApiContext) {
  // Get query parameters for filtering
  const searchParams = request.nextUrl.searchParams;
  const filters = {
    isActive: searchParams.get('isActive') === 'true' ? true : 
              searchParams.get('isActive') === 'false' ? false : undefined,
    propertyType: searchParams.get('propertyType') || undefined,
    searchTerm: searchParams.get('search') || undefined,
  };

  // Apply property-level data filtering
  const propertyFilter = await PropertyDataFilter.properties(context.userId, 'read_only');
  
  // Get properties with security filtering
  const properties = await getPropertiesAction({
    ...filters,
    ...propertyFilter // This ensures users only see accessible properties
  });

  // Log the access for audit purposes
  await context.auditLog('VIEW_PROPERTIES', 'properties', {
    filterCriteria: filters,
    resultCount: properties.length
  });

  return NextResponse.json({ 
    properties,
    total: properties.length,
    accessibleProperties: context.accessibleProperties.length
  });
}

export const GET = withServerPermissions(handleGetProperties, {
  permissions: ['properties.read', 'properties.view_all', 'properties.view_own'],
  anyPermission: true, // User needs any of the above permissions
  auditAction: 'VIEW_PROPERTIES',
  auditResource: 'properties',
  logRequest: true
});

/**
 * POST /api/properties
 * Create a new property
 */
async function handleCreateProperty(request: NextRequest, context: SecureApiContext) {
  const body = await request.json();
  
  // Validate required fields
  if (!body.name || !body.propertyCode || !body.propertyType) {
    return NextResponse.json(
      { 
        error: "Validation failed",
        details: "Missing required fields: name, propertyCode, propertyType"
      },
      { status: 400 }
    );
  }

  // Validate owner assignment (only super admins can assign other owners)
  if (body.ownerId && body.ownerId !== context.userId) {
    const canAssignOwner = await context.canAccess('properties', 'assign_owner');
    if (!canAssignOwner) {
      return NextResponse.json(
        { error: "Cannot assign property to another owner" },
        { status: 403 }
      );
    }
  }

  try {
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
      ownerId: body.ownerId || context.userId, // Default to current user as owner
      managerId: body.managerId,
    });

    // Log the creation
    await context.auditLog('CREATE_PROPERTY', 'property', {
      propertyId: property.id,
      propertyCode: body.propertyCode,
      propertyName: body.name,
      ownerId: body.ownerId || context.userId
    });

    return NextResponse.json({ property }, { status: 201 });
    
  } catch (error) {
    console.error("Error creating property:", error);
    
    // Log the failed attempt
    await context.auditLog('CREATE_PROPERTY_FAILED', 'property', {
      error: error instanceof Error ? error.message : 'Unknown error',
      attemptedData: {
        name: body.name,
        propertyCode: body.propertyCode,
        propertyType: body.propertyType
      }
    });
    
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

export const POST = withServerPermissions(handleCreateProperty, {
  permissions: ['properties.create'],
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // Max 10 property creations per minute
  },
  auditAction: 'CREATE_PROPERTY',
  auditResource: 'property',
  logRequest: true
});