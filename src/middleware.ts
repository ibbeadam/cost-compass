import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { User, UserRole } from "@/types";

/**
 * Enhanced middleware with multi-property access control
 * Gradually enhanced while maintaining backward compatibility
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

    // Handle password expiration (when implemented)
    if (token.passwordExpired && !pathname.includes('/change-password')) {
      return NextResponse.redirect(new URL("/dashboard/change-password", req.url));
    }

    // Basic role-based access control
    const hasAccess = checkBasicAccess(token.role as UserRole, pathname);
    
    if (!hasAccess) {
      console.log('Access denied for route:', pathname, 'Role:', token.role);
      return NextResponse.redirect(new URL("/dashboard/unauthorized", req.url));
    }

    // Extract property ID from URL or query params
    const propertyId = extractPropertyId(req);

    // Set user context headers for API routes
    const response = NextResponse.next();
    response.headers.set('x-user-id', token.sub!);
    response.headers.set('x-user-role', token.role as string);
    if (propertyId) {
      response.headers.set('x-property-id', propertyId.toString());
    }

    // Log access in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Access granted:', {
        userId: token.sub,
        role: token.role,
        path: pathname,
        propertyId
      });
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // This callback runs first and determines if middleware should run
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
 * Basic access control based on user role
 * This will be enhanced with permission-based checks in future updates
 */
function checkBasicAccess(role: UserRole, pathname: string): boolean {
  // Super admin has access to everything
  if (role === 'super_admin') return true;

  // Basic route access rules (will be enhanced with permission system)
  const restrictedAdminRoutes = [
    '/dashboard/users',
    '/dashboard/settings',
    '/dashboard/system'
  ];

  const adminRoles: UserRole[] = ['super_admin', 'property_admin', 'property_owner'];
  
  // Check if route requires admin access
  if (restrictedAdminRoutes.some(route => pathname.startsWith(route))) {
    return adminRoles.includes(role);
  }

  // All authenticated users can access dashboard by default
  if (pathname.startsWith('/dashboard')) {
    return true;
  }

  return true; // Allow access by default
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
 * Enhanced middleware configuration
 */
export const config = {
  matcher: [
    // Protected dashboard routes
    "/dashboard/:path*",
    
    // Protected API routes (excluding auth)
    "/api/dashboard/:path*",
    "/api/users/:path*",
    "/api/properties/:path*",
    "/api/outlets/:path*",
    "/api/financial/:path*",
    "/api/reports/:path*",
    
    // Exclude public API routes and static files
    "/((?!api/auth|api/health|_next/static|_next/image|favicon.ico|public).*)",
  ],
};