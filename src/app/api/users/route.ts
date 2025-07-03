import { NextRequest, NextResponse } from "next/server";
import { getAllUsersAction, createUserAction } from "@/actions/prismaUserActions";
import { withApiSecurity, generalApiRateLimiter } from "@/lib/api-security";
import type { CreateUserData } from "@/types";

/**
 * GET /api/users
 * Get all users (with filtering)
 */
export const GET = withApiSecurity(
  async (request: NextRequest, context) => {
    try {
      // Check rate limiting
      const clientId = context.user.id.toString();
      if (!generalApiRateLimiter.check(clientId)) {
        return NextResponse.json(
          { error: "Rate limit exceeded" },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Remaining': generalApiRateLimiter.getRemainingRequests(clientId).toString(),
              'X-RateLimit-Reset': new Date(generalApiRateLimiter.getResetTime(clientId)).toISOString(),
            }
          }
        );
      }

      // Get query parameters for filtering
      const searchParams = request.nextUrl.searchParams;
      const filters = {
        isActive: searchParams.get('isActive') === 'true' ? true : 
                  searchParams.get('isActive') === 'false' ? false : undefined,
        role: searchParams.get('role') as any || undefined,
        searchTerm: searchParams.get('search') || undefined,
        propertyId: context.propertyId,
      };

      // Get users with filters
      const users = await getAllUsersAction(filters);

      // Filter users based on permissions
      let filteredUsers = users;
      
      // If user can't view all users, filter to only users they can manage
      if (!context.hasPermission('users.view_all')) {
        // For now, show all users but this could be enhanced with property-specific filtering
        // TODO: Implement property-specific user filtering when schema is updated
        filteredUsers = users.filter(user => user.isActive);
      }

      return NextResponse.json({ 
        users: filteredUsers,
        total: filteredUsers.length,
        filters: filters
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }
  },
  {
    requireAuth: true,
    permissions: ['users.read'],
    anyPermission: false,
  }
);

/**
 * POST /api/users
 * Create a new user
 */
export const POST = withApiSecurity(
  async (request: NextRequest, context) => {
    try {
      // Check rate limiting for data modifications
      const clientId = context.user.id.toString();
      if (!generalApiRateLimiter.check(clientId)) {
        return NextResponse.json(
          { error: "Rate limit exceeded" },
          { status: 429 }
        );
      }

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

      // Additional validation based on user permissions
      if (userData.role && !context.hasPermission('users.roles.manage')) {
        // Only allow creating users with same or lower role
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

        if (newUserLevel >= currentUserLevel) {
          return NextResponse.json(
            { error: "Cannot create user with equal or higher role" },
            { status: 403 }
          );
        }
      }

      // Create the user
      const user = await createUserAction(userData);

      return NextResponse.json({ 
        user,
        message: "User created successfully"
      }, { status: 201 });
    } catch (error) {
      console.error("Error creating user:", error);
      
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
  },
  {
    requireAuth: true,
    permissions: ['users.create'],
    anyPermission: false,
  }
);