/**
 * Property-Aware API Security Helpers
 * Provides middleware and utilities for securing API routes with property-based access control
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import type { User, UserRole, PropertyAccessLevel } from "@/types";
import { PermissionService, PropertyPermissionService } from "@/lib/permission-utils";
import { PropertyAccessService } from "@/lib/property-access";

export interface ApiUser extends User {
  // Add any API-specific user properties
}

export interface ApiContext {
  user: ApiUser;
  propertyId?: number;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  canAccessProperty: (propertyId: number, requiredLevel?: PropertyAccessLevel) => Promise<boolean>;
}

/**
 * Require authentication for API routes
 */
export async function requireAuth(request: NextRequest): Promise<ApiUser | NextResponse> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Convert session user to ApiUser
  const user: ApiUser = {
    id: parseInt(session.user.id),
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    department: session.user.department,
    phoneNumber: session.user.phoneNumber,
    isActive: true, // Assume active if logged in
    permissions: session.user.permissions || [],
    lastLoginAt: session.user.lastLoginAt ? new Date(session.user.lastLoginAt) : undefined,
    twoFactorEnabled: session.user.twoFactorEnabled || false,
    createdAt: new Date(), // Placeholder
    updatedAt: new Date(), // Placeholder
    accessibleProperties: session.user.accessibleProperties || [],
  };

  return user;
}

/**
 * Require specific permission for API routes
 */
export async function requirePermission(
  request: NextRequest, 
  permission: string
): Promise<ApiUser | NextResponse> {
  const userOrResponse = await requireAuth(request);
  
  if (userOrResponse instanceof NextResponse) {
    return userOrResponse; // Return error response
  }

  const user = userOrResponse;
  const hasPermission = PermissionService.hasPermission(user, permission);
  
  if (!hasPermission) {
    // Log unauthorized access attempt
    console.log('Permission denied:', {
      userId: user.id,
      permission,
      userRole: user.role,
      url: request.url,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  return user;
}

/**
 * Require any of the specified permissions
 */
export async function requireAnyPermission(
  request: NextRequest, 
  permissions: string[]
): Promise<ApiUser | NextResponse> {
  const userOrResponse = await requireAuth(request);
  
  if (userOrResponse instanceof NextResponse) {
    return userOrResponse; // Return error response
  }

  const user = userOrResponse;
  const hasAnyPermission = PermissionService.hasAnyPermission(user, permissions);
  
  if (!hasAnyPermission) {
    console.log('Permission denied - requires any of:', {
      userId: user.id,
      requiredPermissions: permissions,
      userPermissions: user.permissions,
      userRole: user.role,
      url: request.url,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({ 
      error: "Insufficient permissions",
      required: `Any of: ${permissions.join(', ')}`
    }, { status: 403 });
  }

  return user;
}

/**
 * Require all of the specified permissions
 */
export async function requireAllPermissions(
  request: NextRequest, 
  permissions: string[]
): Promise<ApiUser | NextResponse> {
  const userOrResponse = await requireAuth(request);
  
  if (userOrResponse instanceof NextResponse) {
    return userOrResponse; // Return error response
  }

  const user = userOrResponse;
  const hasAllPermissions = PermissionService.hasAllPermissions(user, permissions);
  
  if (!hasAllPermissions) {
    console.log('Permission denied - requires all of:', {
      userId: user.id,
      requiredPermissions: permissions,
      userPermissions: user.permissions,
      userRole: user.role,
      url: request.url,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({ 
      error: "Insufficient permissions",
      required: `All of: ${permissions.join(', ')}`
    }, { status: 403 });
  }

  return user;
}

/**
 * Require specific role for API routes
 */
export async function requireRole(
  request: NextRequest, 
  role: UserRole
): Promise<ApiUser | NextResponse> {
  const userOrResponse = await requireAuth(request);
  
  if (userOrResponse instanceof NextResponse) {
    return userOrResponse; // Return error response
  }

  const user = userOrResponse;
  
  if (user.role !== role) {
    console.log('Role access denied:', {
      userId: user.id,
      userRole: user.role,
      requiredRole: role,
      url: request.url,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({ 
      error: "Insufficient role",
      required: role
    }, { status: 403 });
  }

  return user;
}

/**
 * Require any of the specified roles
 */
export async function requireAnyRole(
  request: NextRequest, 
  roles: UserRole[]
): Promise<ApiUser | NextResponse> {
  const userOrResponse = await requireAuth(request);
  
  if (userOrResponse instanceof NextResponse) {
    return userOrResponse; // Return error response
  }

  const user = userOrResponse;
  
  if (!roles.includes(user.role)) {
    console.log('Role access denied - requires any of:', {
      userId: user.id,
      userRole: user.role,
      requiredRoles: roles,
      url: request.url,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({ 
      error: "Insufficient role",
      required: `Any of: ${roles.join(', ')}`
    }, { status: 403 });
  }

  return user;
}

/**
 * Require property access with specific level
 */
export async function requirePropertyAccess(
  request: NextRequest,
  propertyId: number,
  requiredLevel: PropertyAccessLevel = 'read_only'
): Promise<ApiUser | NextResponse> {
  const userOrResponse = await requireAuth(request);
  
  if (userOrResponse instanceof NextResponse) {
    return userOrResponse; // Return error response
  }

  const user = userOrResponse;
  
  // Super admin has access to all properties
  if (PermissionService.isSuperAdmin(user)) {
    return user;
  }

  // Check property access
  const hasAccess = await PropertyAccessService.canAccessProperty(user.id, propertyId, requiredLevel);
  
  if (!hasAccess) {
    console.log('Property access denied:', {
      userId: user.id,
      propertyId,
      requiredLevel,
      userRole: user.role,
      url: request.url,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({ 
      error: "Property access denied",
      propertyId,
      requiredLevel
    }, { status: 403 });
  }

  return user;
}

/**
 * Extract property ID from request
 */
export function extractPropertyId(request: NextRequest): number | null {
  // Try path parameter first (e.g., /api/properties/123/...)
  const pathMatch = request.nextUrl.pathname.match(/\/properties\/(\d+)/);
  if (pathMatch) {
    return parseInt(pathMatch[1]);
  }

  // Try query parameter
  const queryPropertyId = request.nextUrl.searchParams.get('propertyId');
  if (queryPropertyId) {
    const parsed = parseInt(queryPropertyId);
    return isNaN(parsed) ? null : parsed;
  }

  // Try request body (for POST/PUT requests)
  // Note: This would need to be handled differently since we can't read body here
  
  return null;
}

/**
 * Create API context with user and property information
 */
export async function createApiContext(
  request: NextRequest,
  options: {
    requireAuth?: boolean;
    propertyId?: number;
  } = {}
): Promise<ApiContext | NextResponse> {
  if (options.requireAuth !== false) {
    const userOrResponse = await requireAuth(request);
    
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const user = userOrResponse;
    const propertyId = options.propertyId || extractPropertyId(request);

    const context: ApiContext = {
      user,
      propertyId: propertyId || undefined,
      hasPermission: (permission: string) => PermissionService.hasPermission(user, permission),
      hasAnyPermission: (permissions: string[]) => PermissionService.hasAnyPermission(user, permissions),
      hasAllPermissions: (permissions: string[]) => PermissionService.hasAllPermissions(user, permissions),
      canAccessProperty: async (propId: number, requiredLevel?: PropertyAccessLevel) => 
        PropertyAccessService.canAccessProperty(user.id, propId, requiredLevel),
    };

    return context;
  }

  // Return minimal context without authentication
  const context: ApiContext = {
    user: null as any, // This should not be accessed
    propertyId: options.propertyId || extractPropertyId(request) || undefined,
    hasPermission: () => false,
    hasAnyPermission: () => false,
    hasAllPermissions: () => false,
    canAccessProperty: async () => false,
  };

  return context;
}

/**
 * Middleware wrapper for API routes
 */
export function withApiSecurity(
  handler: (request: NextRequest, context: ApiContext) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean;
    permissions?: string[];
    anyPermission?: boolean; // true = any of permissions, false = all permissions
    roles?: UserRole[];
    propertyAccess?: {
      requiredLevel: PropertyAccessLevel;
      autoExtract?: boolean; // Auto-extract property ID from request
    };
  } = {}
) {
  return async (request: NextRequest) => {
    try {
      // Create API context
      const contextOrResponse = await createApiContext(request, {
        requireAuth: options.requireAuth,
      });

      if (contextOrResponse instanceof NextResponse) {
        return contextOrResponse;
      }

      const context = contextOrResponse;

      // Check permissions if required
      if (options.permissions && options.permissions.length > 0) {
        const hasRequiredPermissions = options.anyPermission
          ? context.hasAnyPermission(options.permissions)
          : context.hasAllPermissions(options.permissions);

        if (!hasRequiredPermissions) {
          return NextResponse.json({
            error: "Insufficient permissions",
            required: options.anyPermission ? `Any of: ${options.permissions.join(', ')}` : `All of: ${options.permissions.join(', ')}`
          }, { status: 403 });
        }
      }

      // Check roles if required
      if (options.roles && options.roles.length > 0) {
        if (!options.roles.includes(context.user.role)) {
          return NextResponse.json({
            error: "Insufficient role",
            required: `Any of: ${options.roles.join(', ')}`
          }, { status: 403 });
        }
      }

      // Check property access if required
      if (options.propertyAccess) {
        let propertyId = context.propertyId;

        if (options.propertyAccess.autoExtract && !propertyId) {
          propertyId = extractPropertyId(request);
        }

        if (propertyId) {
          const hasAccess = await context.canAccessProperty(propertyId, options.propertyAccess.requiredLevel);
          if (!hasAccess) {
            return NextResponse.json({
              error: "Property access denied",
              propertyId,
              requiredLevel: options.propertyAccess.requiredLevel
            }, { status: 403 });
          }
          
          // Update context with verified property ID
          context.propertyId = propertyId;
        }
      }

      // Call the actual handler
      return await handler(request, context);
    } catch (error) {
      console.error('API security middleware error:', error);
      return NextResponse.json({
        error: "Internal server error"
      }, { status: 500 });
    }
  };
}

/**
 * Rate limiting helper for API routes
 */
export class ApiRateLimiter {
  private requests = new Map<string, number[]>();

  constructor(
    private windowMs: number,
    private maxRequests: number
  ) {}

  check(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }
    
    const userRequests = this.requests.get(identifier)!;
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => time > windowStart);
    
    if (validRequests.length >= this.maxRequests) {
      return false; // Rate limit exceeded
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true; // Request allowed
  }

  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(identifier)) {
      return this.maxRequests;
    }
    
    const validRequests = this.requests.get(identifier)!
      .filter(time => time > windowStart);
    
    return Math.max(0, this.maxRequests - validRequests.length);
  }

  getResetTime(identifier: string): number {
    if (!this.requests.has(identifier)) {
      return 0;
    }
    
    const userRequests = this.requests.get(identifier)!;
    if (userRequests.length === 0) {
      return 0;
    }
    
    return userRequests[0] + this.windowMs;
  }
}

// Create rate limiter instances
export const authRateLimiter = new ApiRateLimiter(15 * 60 * 1000, 5); // 5 attempts per 15 minutes
export const generalApiRateLimiter = new ApiRateLimiter(60 * 1000, 100); // 100 requests per minute
export const dataModificationRateLimiter = new ApiRateLimiter(60 * 1000, 20); // 20 modifications per minute