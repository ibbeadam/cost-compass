/**
 * Enhanced Middleware with Multi-Property Access Control
 * Protects routes based on permissions and property access
 */

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ROUTE_PERMISSIONS, canAccessRoute } from "@/lib/permission-utils";
import type { User } from "@/types";

/**
 * Enhanced middleware with property-based access control
 */
export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Skip middleware for public routes
    if (isPublicRoute(pathname)) {
      return NextResponse.next();
    }

    if (!token) {
      console.log('No token found, redirecting to login');
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Construct user object from token
    const user: User = {
      id: parseInt(token.sub!),
      email: token.email!,
      name: token.name || undefined,
      role: token.role,
      department: token.department || undefined,
      phoneNumber: token.phoneNumber || undefined,
      isActive: true, // Assume active if logged in
      permissions: token.permissions || [],
      lastLoginAt: token.lastLoginAt ? new Date(token.lastLoginAt) : undefined,
      twoFactorEnabled: token.twoFactorEnabled || false,
      createdAt: new Date(), // Placeholder
      updatedAt: new Date(), // Placeholder
    };

    // Handle password expiration
    if (token.passwordExpired && !pathname.includes('/change-password')) {
      return NextResponse.redirect(new URL("/dashboard/change-password", req.url));
    }

    // Extract property ID from URL or query params
    const propertyId = extractPropertyId(req);

    // Check route access permissions
    const hasAccess = await canAccessRoute(user, pathname, propertyId);
    
    if (!hasAccess) {
      console.log('Access denied for route:', pathname);
      
      // Log unauthorized access attempt
      await logUnauthorizedAccess(user, pathname, propertyId, req);
      
      return NextResponse.redirect(new URL("/dashboard/unauthorized", req.url));
    }

    // Set user context headers for API routes
    const response = NextResponse.next();
    response.headers.set('x-user-id', user.id.toString());
    response.headers.set('x-user-role', user.role);
    if (propertyId) {
      response.headers.set('x-property-id', propertyId.toString());
    }

    // Log successful page access (sampling to reduce logs)
    if (Math.random() < 0.1) { // Log 10% of successful accesses
      await logPageAccess(user, pathname, propertyId, req);
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // This callback runs first and determines if middleware should run
        // Return true to run the middleware function above
        return !!token;
      },
    },
  }
);

/**
 * Check if route is public and doesn't require authentication
 */
function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    '/',
    '/login',
    '/signup', 
    '/forgot-password',
    '/reset-password',
    '/api/auth',
    '/api/health',
    '/_next',
    '/favicon.ico',
    '/public'
  ];

  return publicRoutes.some(route => pathname.startsWith(route));
}

/**
 * Extract property ID from request URL or query parameters
 */
function extractPropertyId(req: NextRequest): number | undefined {
  // Try to get from query parameter
  const propertyIdParam = req.nextUrl.searchParams.get('propertyId');
  if (propertyIdParam) {
    return parseInt(propertyIdParam);
  }

  // Try to get from URL path (e.g., /dashboard/property/123/...)
  const pathMatch = req.nextUrl.pathname.match(/\/property\/(\d+)/);
  if (pathMatch) {
    return parseInt(pathMatch[1]);
  }

  // Try to get from cookies (for persistent property selection)
  const selectedProperty = req.cookies.get('selectedProperty')?.value;
  if (selectedProperty) {
    return parseInt(selectedProperty);
  }

  return undefined;
}

/**
 * Log unauthorized access attempt
 */
async function logUnauthorizedAccess(
  user: User,
  pathname: string, 
  propertyId: number | undefined,
  req: NextRequest
): Promise<void> {
  try {
    // TODO: Replace with actual prisma call when database is updated
    /*
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        propertyId,
        action: 'ACCESS_DENIED',
        resource: 'route',
        resourceId: pathname,
        details: { 
          reason: 'insufficient_permissions',
          userRole: user.role,
          userPermissions: user.permissions
        },
        ipAddress: req.headers.get('x-forwarded-for') || 
                   req.headers.get('x-real-ip') || 
                   'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
      }
    });
    */
    
    console.log('Unauthorized access attempt:', {
      userId: user.id,
      pathname,
      propertyId,
      role: user.role,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging unauthorized access:', error);
  }
}

/**
 * Log successful page access
 */
async function logPageAccess(
  user: User,
  pathname: string,
  propertyId: number | undefined, 
  req: NextRequest
): Promise<void> {
  try {
    // TODO: Replace with actual prisma call when database is updated
    /*
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        propertyId,
        action: 'PAGE_ACCESS',
        resource: 'route',
        resourceId: pathname,
        ipAddress: req.headers.get('x-forwarded-for') || 
                   req.headers.get('x-real-ip') || 
                   'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
      }
    });
    */
    
    console.log('Page access:', {
      userId: user.id,
      pathname,
      propertyId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging page access:', error);
  }
}

/**
 * Middleware configuration
 * Defines which routes should be protected
 */
export const config = {
  matcher: [
    // Protected dashboard routes
    "/dashboard/:path*",
    
    // Protected API routes
    "/api/dashboard/:path*",
    "/api/users/:path*",
    "/api/properties/:path*",
    "/api/outlets/:path*",
    "/api/financial/:path*",
    "/api/reports/:path*",
    
    // Exclude public API routes
    "/((?!api/auth|api/health|_next/static|_next/image|favicon.ico|public).*)",
  ],
};

/**
 * Helper function to get user from request headers (for API routes)
 */
export function getUserFromHeaders(req: NextRequest): {
  userId?: number;
  role?: string;
  propertyId?: number;
} {
  return {
    userId: req.headers.get('x-user-id') ? parseInt(req.headers.get('x-user-id')!) : undefined,
    role: req.headers.get('x-user-role') || undefined,
    propertyId: req.headers.get('x-property-id') ? parseInt(req.headers.get('x-property-id')!) : undefined,
  };
}

/**
 * Rate limiting helper (basic implementation)
 */
export function createRateLimiter(windowMs: number, maxRequests: number) {
  const requests = new Map<string, number[]>();

  return (identifier: string): boolean => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!requests.has(identifier)) {
      requests.set(identifier, []);
    }
    
    const userRequests = requests.get(identifier)!;
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => time > windowStart);
    
    if (validRequests.length >= maxRequests) {
      return false; // Rate limit exceeded
    }
    
    validRequests.push(now);
    requests.set(identifier, validRequests);
    
    return true; // Request allowed
  };
}

// Create rate limiter instances
export const loginRateLimiter = createRateLimiter(15 * 60 * 1000, 5); // 5 attempts per 15 minutes
export const apiRateLimiter = createRateLimiter(60 * 1000, 100); // 100 requests per minute