/**
 * Secure API Route Template
 * Use this template for creating new secure API routes with comprehensive protection
 */

import { NextRequest, NextResponse } from "next/server";
import { withServerPermissions, SecureApiContext } from "@/lib/permissions/server-middleware";
import { PropertyDataFilter, validatePropertyOwnership } from "@/lib/permissions/data-isolation";

/**
 * GET Handler Template
 * For data retrieval with property-based filtering
 */
async function handleGetData(request: NextRequest, context: SecureApiContext) {
  // 1. Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const filters = {
    isActive: searchParams.get('isActive') === 'true' ? true : 
              searchParams.get('isActive') === 'false' ? false : undefined,
    propertyId: searchParams.get('propertyId') ? parseInt(searchParams.get('propertyId')!) : context.propertyId,
    searchTerm: searchParams.get('search') || undefined,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
    offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
  };

  // 2. Apply property-based data filtering for security
  const dataFilter = await PropertyDataFilter.financialData(
    context.userId, 
    filters.propertyId, 
    'read_only'
  );
  
  // 3. Fetch data with security filters applied
  // const data = await getYourDataAction({
  //   ...filters,
  //   ...dataFilter
  // });

  // 4. Log the access for audit purposes
  await context.auditLog('VIEW_DATA', 'your_resource', {
    filterCriteria: filters,
    // resultCount: data.length
  });

  // 5. Return secure response
  return NextResponse.json({ 
    // data,
    // total: data.length,
    filters,
    accessLevel: context.permissions.includes('resource.view_all') ? 'all' : 'restricted'
  });
}

// Secure GET endpoint configuration
export const GET = withServerPermissions(handleGetData, {
  permissions: ['resource.read', 'resource.view_all'],
  requireAllPermissions: false, // Any of the permissions
  requirePropertyAccess: {
    level: 'read_only',
    autoExtract: true // Automatically extract property ID from request
  },
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200, // 200 read requests per minute
  },
  auditAction: 'VIEW_DATA',
  auditResource: 'your_resource',
  logRequest: true
});

/**
 * POST Handler Template
 * For creating new data with property ownership validation
 */
async function handleCreateData(request: NextRequest, context: SecureApiContext) {
  // 1. Parse and validate request body
  const body = await request.json();
  
  if (!body.requiredField) {
    return NextResponse.json(
      { error: "Required field is missing" },
      { status: 400 }
    );
  }

  // 2. Extract property ID for validation
  const propertyId = body.propertyId || context.propertyId;
  
  if (!propertyId) {
    return NextResponse.json(
      { error: "Property ID is required" },
      { status: 400 }
    );
  }

  // 3. Validate property access for data creation
  const canCreate = await context.requireProperty(propertyId, 'data_entry');
  
  if (!canCreate) {
    return NextResponse.json(
      { error: "Insufficient property access for data creation" },
      { status: 403 }
    );
  }

  try {
    // 4. Create the data
    // const newData = await createYourDataAction({
    //   ...body,
    //   propertyId,
    //   createdBy: context.userId
    // });

    // 5. Log successful creation
    await context.auditLog('CREATE_DATA', 'your_resource', {
      // resourceId: newData.id,
      propertyId,
      createdData: body
    });

    return NextResponse.json({ 
      // data: newData,
      message: "Data created successfully"
    }, { status: 201 });
    
  } catch (error) {
    console.error("Error creating data:", error);
    
    // Log failed attempt
    await context.auditLog('CREATE_DATA_FAILED', 'your_resource', {
      propertyId,
      error: error instanceof Error ? error.message : 'Unknown error',
      attemptedData: body
    });
    
    return NextResponse.json(
      { error: "Failed to create data" },
      { status: 500 }
    );
  }
}

export const POST = withServerPermissions(handleCreateData, {
  permissions: ['resource.create'],
  requirePropertyAccess: {
    level: 'data_entry',
    autoExtract: true
  },
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 creations per minute
  },
  auditAction: 'CREATE_DATA',
  auditResource: 'your_resource',
  logRequest: true
});

/**
 * PUT Handler Template
 * For updating existing data with ownership validation
 */
async function handleUpdateData(request: NextRequest, context: SecureApiContext) {
  const body = await request.json();
  const resourceId = body.id;
  
  if (!resourceId) {
    return NextResponse.json(
      { error: "Resource ID is required" },
      { status: 400 }
    );
  }

  // Validate property ownership for the resource
  const ownershipValidation = await validatePropertyOwnership(
    context.userId,
    'your_resource_type',
    resourceId,
    'data_entry'
  );

  if (!ownershipValidation.allowed) {
    return NextResponse.json(
      { error: ownershipValidation.error || "Access denied" },
      { status: 403 }
    );
  }

  try {
    // Update the data
    // const updatedData = await updateYourDataAction(resourceId, {
    //   ...body,
    //   updatedBy: context.userId
    // });

    // Log the update
    await context.auditLog('UPDATE_DATA', 'your_resource', {
      resourceId,
      propertyId: ownershipValidation.propertyId,
      updatedFields: Object.keys(body)
    });

    return NextResponse.json({ 
      // data: updatedData,
      message: "Data updated successfully"
    });
    
  } catch (error) {
    console.error("Error updating data:", error);
    
    await context.auditLog('UPDATE_DATA_FAILED', 'your_resource', {
      resourceId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json(
      { error: "Failed to update data" },
      { status: 500 }
    );
  }
}

export const PUT = withServerPermissions(handleUpdateData, {
  permissions: ['resource.update'],
  rateLimit: {
    windowMs: 60 * 1000,
    maxRequests: 30, // 30 updates per minute
  },
  auditAction: 'UPDATE_DATA',
  auditResource: 'your_resource',
  logRequest: true
});

/**
 * DELETE Handler Template
 * For deleting data with strict ownership validation
 */
async function handleDeleteData(request: NextRequest, context: SecureApiContext) {
  const searchParams = request.nextUrl.searchParams;
  const resourceId = searchParams.get('id');
  
  if (!resourceId) {
    return NextResponse.json(
      { error: "Resource ID is required" },
      { status: 400 }
    );
  }

  // Validate property ownership with higher access level for deletion
  const ownershipValidation = await validatePropertyOwnership(
    context.userId,
    'your_resource_type',
    parseInt(resourceId),
    'management' // Higher level required for deletion
  );

  if (!ownershipValidation.allowed) {
    return NextResponse.json(
      { error: ownershipValidation.error || "Access denied" },
      { status: 403 }
    );
  }

  try {
    // Delete the data
    // await deleteYourDataAction(parseInt(resourceId));

    // Log the deletion
    await context.auditLog('DELETE_DATA', 'your_resource', {
      resourceId: parseInt(resourceId),
      propertyId: ownershipValidation.propertyId,
      deletedBy: context.userId
    });

    return NextResponse.json({ 
      message: "Data deleted successfully"
    });
    
  } catch (error) {
    console.error("Error deleting data:", error);
    
    await context.auditLog('DELETE_DATA_FAILED', 'your_resource', {
      resourceId: parseInt(resourceId),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json(
      { error: "Failed to delete data" },
      { status: 500 }
    );
  }
}

export const DELETE = withServerPermissions(handleDeleteData, {
  permissions: ['resource.delete'],
  rateLimit: {
    windowMs: 60 * 1000,
    maxRequests: 10, // 10 deletions per minute (most restrictive)
  },
  auditAction: 'DELETE_DATA',
  auditResource: 'your_resource',
  logRequest: true
});

/**
 * Permission-based route configuration examples:
 */

// Super admin only route
export const ADMIN_ONLY_GET = withServerPermissions(handleGetData, {
  roles: ['super_admin'],
  logRequest: true
});

// Property-specific route with strict validation
export const PROPERTY_SPECIFIC_POST = withServerPermissions(handleCreateData, {
  permissions: ['resource.create'],
  requirePropertyAccess: {
    level: 'management',
    autoExtract: true
  },
  rateLimit: {
    windowMs: 300 * 1000, // 5 minutes
    maxRequests: 5,
    keyGenerator: (req, user) => `${user?.id}-property-creation` // Custom rate limit key
  }
});

// Multi-permission route with audit
export const MULTI_PERMISSION_GET = withServerPermissions(handleGetData, {
  permissions: ['resource.read', 'resource.admin', 'resource.view_all'],
  requireAllPermissions: false, // Any permission is sufficient
  auditAction: 'SENSITIVE_DATA_ACCESS',
  auditResource: 'sensitive_resource',
  logRequest: true,
  allowCrossPropertyAccess: false
});