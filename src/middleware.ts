import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { User, UserRole } from "@/types";
import { rateLimitMiddleware } from "@/lib/security/rate-limit-middleware";

/**
 * Enhanced middleware with multi-property access control
 * Gradually enhanced while maintaining backward compatibility
 */
export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;
    
    console.log(`🔍 Middleware processing: ${pathname} for user ${token?.sub} (${token?.role})`);

    // 1. Apply rate limiting and DDoS protection first
    try {
      const rateLimitResponse = await rateLimitMiddleware(req);
      if (rateLimitResponse) {
        return rateLimitResponse;
      }
    } catch (error) {
      console.error('Rate limiting middleware error:', error);
      // Continue with normal flow if rate limiting fails
    }

    // 2. Skip authentication for public routes
    if (isPublicRoute(pathname)) {
      const response = NextResponse.next();
      // Add security headers even for public routes
      addSecurityHeaders(response);
      return response;
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
      console.log('❌ Middleware Access denied for route:', pathname, 'Role:', token.role);
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

    // Add comprehensive security headers
    addSecurityHeaders(response);

    // Log access in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔓 Middleware Access granted:', {
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
 * Add comprehensive security headers to response
 */
function addSecurityHeaders(response: NextResponse): void {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy (restrict potentially dangerous features)
  response.headers.set('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()');
  
  // Content Security Policy
  response.headers.set('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: https: blob:; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "connect-src 'self' https://api.openai.com; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';"
  );

  // HSTS (HTTP Strict Transport Security) - only in production with HTTPS
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Security-related custom headers
  response.headers.set('X-Rate-Limit-Applied', 'true');
  response.headers.set('X-Security-Headers', 'enabled');
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