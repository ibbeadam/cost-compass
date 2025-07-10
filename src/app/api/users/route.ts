import { NextRequest, NextResponse } from "next/server";
import { getAllUsersAction, createUserAction } from "@/actions/prismaUserActions";
import { withServerPermissions, SecureApiContext } from "@/lib/permissions/server-middleware";
import { PropertyDataFilter } from "@/lib/permissions/data-isolation";
import type { CreateUserData } from "@/types";

/**
 * GET /api/users
 * Get all users (with filtering)
 */
async function handleGetUsers(request: NextRequest, context: SecureApiContext) {
  // Get query parameters for filtering
  const searchParams = request.nextUrl.searchParams;
  const filters = {
    isActive: searchParams.get('isActive') === 'true' ? true : 
              searchParams.get('isActive') === 'false' ? false : undefined,
    role: searchParams.get('role') as any || undefined,
    searchTerm: searchParams.get('search') || undefined,
    propertyId: context.propertyId,
  };

  // Apply property-based user filtering for security
  const userFilter = await PropertyDataFilter.users(context.userId, context.propertyId);
  
  // Get users with security filters applied
  const users = await getAllUsersAction({
    ...filters,
    ...userFilter // Ensures users only see users they have permission to manage
  });

  // Additional permission-based filtering
  let filteredUsers = users;
  
  // Apply role-based visibility restrictions
  if (!context.permissions.includes('users.view_all')) {
    // Non-admin users can only see users in their accessible properties
    filteredUsers = users.filter(user => {
      // Always allow viewing self
      if (user.id === context.userId) return true;
      
      // For property-based access, this is already handled by userFilter
      // Additional business logic can be added here
      return user.isActive;
    });
  }

  // Log the access
  await context.auditLog('VIEW_USERS', 'users', {
    filterCriteria: filters,
    resultCount: filteredUsers.length,
    viewedUserIds: filteredUsers.map(u => u.id)
  });

  return NextResponse.json({ 
    users: filteredUsers,
    total: filteredUsers.length,
    filters: filters,
    accessLevel: context.permissions.includes('users.view_all') ? 'all' : 'restricted'
  });
}

export const GET = withServerPermissions(handleGetUsers, {
  permissions: ['users.read', 'users.view_all', 'users.view_managed'],
  requireAllPermissions: false, // Any of the above permissions
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 user list requests per minute
  },
  auditAction: 'VIEW_USERS',
  auditResource: 'users',
  logRequest: true
});

/**
 * POST /api/users
 * Create a new user
 */
async function handleCreateUser(request: NextRequest, context: SecureApiContext) {
  const body = await request.json();
  
  // Validate required fields
  if (!body.email) {
    return NextResponse.json(
      { error: "Email is required" },
      { status: 400 }
    );
  }

  // Prepare user data
  const userData: CreateUserData = {
    email: body.email,
    name: body.name,
    password: body.password,
    role: body.role || 'user',
    department: body.department,
    phoneNumber: body.phoneNumber,
    permissions: body.permissions,
    propertyAccess: body.propertyAccess,
  };

  // Enhanced role hierarchy validation
  const roleHierarchy = {
    'super_admin': 7,
    'property_owner': 6,
    'property_admin': 5,
    'regional_manager': 4,
    'property_manager': 3,
    'supervisor': 2,
    'user': 1,
    'readonly': 0
  };

  const currentUserLevel = roleHierarchy[context.user.role] || 0;
  const newUserLevel = roleHierarchy[userData.role] || 0;

  // Role assignment validation
  if (userData.role !== 'user') {
    const canManageRoles = await context.canAccess('users', 'manage_roles');
    
    if (!canManageRoles) {
      return NextResponse.json(
        { error: "Insufficient permissions to assign roles" },
        { status: 403 }
      );
    }

    // Can't create users with equal or higher role level
    if (newUserLevel >= currentUserLevel) {
      return NextResponse.json(
        { error: "Cannot create user with equal or higher role level" },
        { status: 403 }
      );
    }
  }

  // Property access validation
  if (userData.propertyAccess && userData.propertyAccess.length > 0) {
    for (const access of userData.propertyAccess) {
      const canGrantAccess = await context.requireProperty(access.propertyId, 'management');
      
      if (!canGrantAccess) {
        return NextResponse.json(
          { error: `Cannot grant access to property ${access.propertyId}` },
          { status: 403 }
        );
      }
    }
  }

  try {
    // Create the user
    const user = await createUserAction(userData);

    // Log the creation with comprehensive details
    await context.auditLog('CREATE_USER', 'user', {
      newUserId: user.id,
      userEmail: body.email,
      assignedRole: userData.role,
      propertyAccess: userData.propertyAccess || [],
      createdBy: context.userId
    });

    return NextResponse.json({ 
      user,
      message: "User created successfully"
    }, { status: 201 });
    
  } catch (error) {
    console.error("Error creating user:", error);
    
    // Log failed attempt
    await context.auditLog('CREATE_USER_FAILED', 'user', {
      attemptedEmail: body.email,
      attemptedRole: userData.role,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    if (error instanceof Error) {
      if (error.message.includes("already exists")) {
        return NextResponse.json(
          { error: "User with this email already exists" },
          { status: 409 }
        );
      }
      
      if (error.message.includes("Password validation failed")) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

export const POST = withServerPermissions(handleCreateUser, {
  permissions: ['users.create'],
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // Max 5 user creations per minute (more restrictive)
  },
  auditAction: 'CREATE_USER',
  auditResource: 'user',
  logRequest: true
});