import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { 
  getPropertyByIdAction, 
  updatePropertyAction, 
  deletePropertyAction 
} from "@/actions/propertyActions";
import { PermissionService } from "@/lib/permission-utils";

interface RouteParams {
  params: { id: string }
}

/**
 * GET /api/properties/[id]
 * Get a specific property by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const propertyId = parseInt(params.id);
    
    if (isNaN(propertyId)) {
      return NextResponse.json({ error: "Invalid property ID" }, { status: 400 });
    }

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

    // Get the property
    const property = await getPropertyByIdAction(propertyId);
    
    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Check if user can access this specific property
    // TODO: Implement property-specific access check when database is updated
    /*
    const canAccessProperty = await PropertyAccessService.canAccessProperty(
      user.id, 
      propertyId, 
      'read_only'
    );
    
    if (!canAccessProperty && !PermissionService.hasPermission(user, 'properties.view_all')) {
      return NextResponse.json({ error: "Access denied to this property" }, { status: 403 });
    }
    */

    return NextResponse.json({ property });
  } catch (error) {
    console.error("Error fetching property:", error);
    return NextResponse.json(
      { error: "Failed to fetch property" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/properties/[id]
 * Update a specific property
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const propertyId = parseInt(params.id);
    
    if (isNaN(propertyId)) {
      return NextResponse.json({ error: "Invalid property ID" }, { status: 400 });
    }

    // Check if user has permission to update properties
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

    const canUpdateProperties = PermissionService.hasPermission(user, 'properties.update');

    if (!canUpdateProperties) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // TODO: Check property-specific access when database is updated
    /*
    const canAccessProperty = await PropertyAccessService.canAccessProperty(
      user.id, 
      propertyId, 
      'management'
    );
    
    if (!canAccessProperty && !PermissionService.hasPermission(user, 'properties.view_all')) {
      return NextResponse.json({ error: "Access denied to this property" }, { status: 403 });
    }
    */

    const body = await request.json();
    
    // Update the property
    const property = await updatePropertyAction(propertyId, body);

    return NextResponse.json({ property });
  } catch (error) {
    console.error("Error updating property:", error);
    
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }
    
    if (error instanceof Error && error.message.includes("already exists")) {
      return NextResponse.json(
        { error: "Property code already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update property" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/properties/[id]
 * Delete a specific property
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const propertyId = parseInt(params.id);
    
    if (isNaN(propertyId)) {
      return NextResponse.json({ error: "Invalid property ID" }, { status: 400 });
    }

    // Check if user has permission to delete properties
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

    const canDeleteProperties = PermissionService.hasPermission(user, 'properties.delete');

    if (!canDeleteProperties) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // TODO: Check property-specific access when database is updated
    /*
    const canAccessProperty = await PropertyAccessService.canAccessProperty(
      user.id, 
      propertyId, 
      'owner'
    );
    
    if (!canAccessProperty && !PermissionService.isSuperAdmin(user)) {
      return NextResponse.json({ error: "Access denied to this property" }, { status: 403 });
    }
    */

    // Delete the property
    await deletePropertyAction(propertyId);

    return NextResponse.json({ message: "Property deleted successfully" });
  } catch (error) {
    console.error("Error deleting property:", error);
    
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }
    
    return NextResponse.json(
      { error: "Failed to delete property" },
      { status: 500 }
    );
  }
}