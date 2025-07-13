/**
 * Enhanced Server-Side Permission Middleware
 * Provides comprehensive permission validation for API routes with property isolation
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PropertyAccessService } from "@/lib/property-access";
import { PermissionService } from "@/lib/permission-utils";
import { prisma } from "@/lib/prisma";
import { rateLimiter, ddosProtection, rateLimitConfigs } from "@/lib/security/rate-limiting";
import { ddosProtection as ddos } from "@/lib/security/ddos-protection";
import type { User, UserRole, PropertyAccessLevel } from "@/types";

export interface SecureApiContext {
  user: User;
  userId: number;
  propertyId?: number;
  accessibleProperties: number[];
  permissions: string[];
  canAccess: (resource: string, action: string, propertyId?: number) => Promise<boolean>;
  requireProperty: (propertyId: number, level?: PropertyAccessLevel) => Promise<boolean>;
  auditLog: (action: string, resource: string, details?: any) => Promise<void>;
}

export interface PermissionMiddlewareOptions {
  // Authentication requirements
  requireAuth?: boolean;
  allowInactiveUser?: boolean;
  
  // Permission requirements
  permissions?: string[];
  requireAllPermissions?: boolean; // default: false (any permission)
  roles?: UserRole[];
  
  // Property access requirements
  requirePropertyAccess?: {
    level: PropertyAccessLevel;
    autoExtract?: boolean;
    propertyIdParam?: string; // custom parameter name
  };
  
  // Rate limiting
  rateLimiting?: {
    windowMs: number;
    maxRequests: number;
    keyGenerator?: (req: NextRequest, user?: User) => string;
    tier?: keyof typeof rateLimitConfigs;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
  };
  
  // Audit logging
  auditAction?: string;
  auditResource?: string;
  logRequest?: boolean;
  
  // Data filtering
  autoFilterByProperty?: boolean;
  allowCrossPropertyAccess?: boolean;
}

/**
 * Extract property ID from various sources in the request
 */
export function extractPropertyId(
  request: NextRequest, 
  paramName: string = 'propertyId'
): number | null {
  // 1. Try URL path parameters (e.g., /api/properties/123/...)
  const pathPatterns = [
    /\/properties\/(\d+)/,
    /\/property\/(\d+)/,
    new RegExp(`\\/${paramName}\\/(\\d+)`)
  ];
  
  for (const pattern of pathPatterns) {
    const match = request.nextUrl.pathname.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }

  // 2. Try query parameters
  const queryValue = request.nextUrl.searchParams.get(paramName) || 
                    request.nextUrl.searchParams.get('property_id') ||
                    request.nextUrl.searchParams.get('propertyId');
  
  if (queryValue) {
    const parsed = parseInt(queryValue);
    return isNaN(parsed) ? null : parsed;
  }

  // 3. Try headers
  const headerValue = request.headers.get(`x-${paramName}`) || 
                     request.headers.get('x-property-id');
  
  if (headerValue) {
    const parsed = parseInt(headerValue);
    return isNaN(parsed) ? null : parsed;
  }

  return null;
}

/**
 * Get user's accessible property IDs for data filtering
 */
async function getUserAccessiblePropertyIds(userId: number): Promise<number[]> {
  try {
    const properties = await PropertyAccessService.getUserAccessibleProperties(userId);
    return properties.map(p => p.id);
  } catch (error) {
    console.error('Error fetching accessible properties:', error);
    return [];
  }
}

/**
 * Create comprehensive audit log entry
 */
async function createAuditLog(
  userId: number,
  action: string,
  resource: string,
  details: any = {},
  request: NextRequest,
  propertyId?: number
): Promise<void> {
  try {
    const ip = request.ip || 
               request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    await prisma.auditLog.create({
      data: {
        userId,
        propertyId,
        action,
        resource,
        resourceId: details.resourceId || 'unknown',
        details: {
          ...details,
          method: request.method,
          url: request.url,
          ip,
          userAgent,
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break the API
  }
}

/**
 * Rate limiting with enhanced tracking
 */
class EnhancedRateLimiter {
  private requests = new Map<string, { times: number[], blocked: boolean }>();

  constructor(
    private windowMs: number,
    private maxRequests: number
  ) {}

  check(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, { times: [], blocked: false });
    }
    
    const userData = this.requests.get(identifier)!;
    
    // Remove old requests outside the window
    userData.times = userData.times.filter(time => time > windowStart);
    
    const remaining = Math.max(0, this.maxRequests - userData.times.length);
    const resetTime = userData.times.length > 0 ? userData.times[0] + this.windowMs : now + this.windowMs;
    
    if (userData.times.length >= this.maxRequests) {
      userData.blocked = true;
      return { allowed: false, remaining: 0, resetTime };
    }
    
    userData.times.push(now);
    userData.blocked = false;
    
    return { 
      allowed: true, 
      remaining: remaining - 1, 
      resetTime 
    };
  }
}

/**
 * Main permission middleware wrapper
 */
export function withServerPermissions(
  handler: (request: NextRequest, context: SecureApiContext) => Promise<NextResponse>,
  options: PermissionMiddlewareOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    let user: User | null = null;
    
    try {
      // 0. DDoS Protection Check (before authentication)
      const ddosResult = await ddos.protect(request);
      if (!ddosResult.allowed) {
        return NextResponse.json(
          { 
            error: "Request blocked", 
            code: "DDOS_PROTECTION",
            reason: ddosResult.reason
          },
          { 
            status: ddosResult.blocked ? 403 : 429,
            headers: ddosResult.headers
          }
        );
      }
      // 1. Authentication check
      if (options.requireAuth !== false) {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
          return NextResponse.json(
            { error: "Authentication required", code: "AUTH_REQUIRED" },
            { status: 401 }
          );
        }

        // Get full user data from database
        const user = await prisma.user.findUnique({
          where: { id: parseInt(session.user.id) },
          include: {
            userPermissions: {
              include: { permission: true },
              where: {
                granted: true,
                OR: [
                  { expiresAt: null },
                  { expiresAt: { gt: new Date() } }
                ]
              }
            }
          }
        });

        if (!user) {
          return NextResponse.json(
            { error: "User not found", code: "USER_NOT_FOUND" },
            { status: 401 }
          );
        }

        // Check if user is active
        if (!options.allowInactiveUser && !user.isActive) {
          return NextResponse.json(
            { error: "Account is disabled", code: "ACCOUNT_DISABLED" },
            { status: 403 }
          );
        }

        // 2. Enhanced Rate limiting check (skip for super_admin in development)
        if (options.rateLimiting && user.role !== 'super_admin') {
          const rateLimitConfig = options.rateLimiting.tier ? 
            rateLimitConfigs[options.rateLimiting.tier] : 
            {
              windowMs: options.rateLimiting.windowMs,
              maxRequests: options.rateLimiting.maxRequests,
              keyGenerator: options.rateLimiting.keyGenerator
            };
          
          const rateLimitResult = await rateLimiter.applyLimit(request, rateLimitConfig, user);
          
          if (!rateLimitResult.allowed) {
            // Log rate limit violation
            await createAuditLog(
              user.id,
              'RATE_LIMIT_EXCEEDED',
              'api_request',
              { 
                endpoint: request.nextUrl.pathname,
                limit: rateLimitConfig.maxRequests,
                window: rateLimitConfig.windowMs,
                retryAfter: rateLimitResult.retryAfter
              },
              request
            );
            
            return NextResponse.json(
              { 
                error: "Rate limit exceeded", 
                code: "RATE_LIMIT_EXCEEDED",
                retryAfter: rateLimitResult.retryAfter
              },
              { 
                status: 429,
                headers: rateLimitResult.headers
              }
            );
          }
        }

        // 3. Role validation
        if (options.roles && options.roles.length > 0) {
          if (!options.roles.includes(user.role)) {
            await createAuditLog(
              user.id,
              'ROLE_ACCESS_DENIED',
              'api_request',
              { 
                userRole: user.role,
                requiredRoles: options.roles,
                endpoint: request.nextUrl.pathname
              },
              request
            );
            
            return NextResponse.json(
              { 
                error: "Insufficient role privileges", 
                code: "INSUFFICIENT_ROLE",
                required: options.roles
              },
              { status: 403 }
            );
          }
        }

        // 4. Permission validation
        if (options.permissions && options.permissions.length > 0) {
          // For super_admin, always grant access if they have the role
          if (user.role === 'super_admin') {
            // Super admin has all permissions, skip permission check
          } else {
            const userPermissions = await PropertyAccessService.getUserPropertyPermissions(
              user.id, 
              0 // Default to global permissions
            );
            
            const hasRequiredPermissions = options.requireAllPermissions
              ? options.permissions.every(permission => userPermissions.includes(permission))
              : options.permissions.some(permission => userPermissions.includes(permission));
            
            if (!hasRequiredPermissions) {
              await createAuditLog(
                user.id,
                'PERMISSION_ACCESS_DENIED',
                'api_request',
                { 
                  userPermissions,
                  requiredPermissions: options.permissions,
                  requireAll: options.requireAllPermissions,
                  endpoint: request.nextUrl.pathname
                },
                request
              );
              
              return NextResponse.json(
                { 
                  error: "Insufficient permissions", 
                  code: "INSUFFICIENT_PERMISSIONS",
                  required: options.permissions,
                  requireAll: options.requireAllPermissions
                },
                { status: 403 }
              );
            }
          }
        }

        // 5. Property access validation
        let propertyId: number | undefined;
        if (options.requirePropertyAccess) {
          propertyId = extractPropertyId(
            request, 
            options.requirePropertyAccess.propertyIdParam || 'propertyId'
          ) || undefined;
          
          if (options.requirePropertyAccess.autoExtract && !propertyId) {
            return NextResponse.json(
              { 
                error: "Property ID is required", 
                code: "PROPERTY_ID_REQUIRED"
              },
              { status: 400 }
            );
          }
          
          if (propertyId) {
            const hasAccess = await PropertyAccessService.canAccessProperty(
              user.id,
              propertyId,
              options.requirePropertyAccess.level
            );
            
            if (!hasAccess) {
              await createAuditLog(
                user.id,
                'PROPERTY_ACCESS_DENIED',
                'api_request',
                { 
                  propertyId,
                  requiredLevel: options.requirePropertyAccess.level,
                  endpoint: request.nextUrl.pathname
                },
                request,
                propertyId
              );
              
              return NextResponse.json(
                { 
                  error: "Property access denied", 
                  code: "PROPERTY_ACCESS_DENIED",
                  propertyId,
                  requiredLevel: options.requirePropertyAccess.level
                },
                { status: 403 }
              );
            }
          }
        }

        // 6. Get accessible properties for data filtering
        const accessibleProperties = await getUserAccessiblePropertyIds(user.id);
        
        // 7. Get all user permissions for this property
        let permissions: string[];
        if (user.role === 'super_admin') {
          // Super admin gets all permissions - ensure they have the required ones
          const allPermissions = await PropertyAccessService.getUserPropertyPermissions(user.id, 0);
          const requiredPermissions = ['system.admin.full_access', 'system.roles.read', 'system.roles.update', 'users.roles.manage'];
          permissions = [...new Set([...allPermissions, ...requiredPermissions])];
        } else {
          permissions = propertyId 
            ? await PropertyAccessService.getUserPropertyPermissions(user.id, propertyId)
            : await PropertyAccessService.getUserPropertyPermissions(user.id, 0);
        }

        // 8. Create secure API context
        const context: SecureApiContext = {
          user,
          userId: user.id,
          propertyId,
          accessibleProperties,
          permissions,
          
          canAccess: async (resource: string, action: string, targetPropertyId?: number) => {
            const permission = `${resource}.${action}`;
            if (targetPropertyId) {
              return await PropertyAccessService.hasPropertyPermission(user.id, targetPropertyId, permission);
            }
            return permissions.includes(permission);
          },
          
          requireProperty: async (targetPropertyId: number, level: PropertyAccessLevel = 'read_only') => {
            return await PropertyAccessService.canAccessProperty(user.id, targetPropertyId, level);
          },
          
          auditLog: async (action: string, resource: string, details: any = {}) => {
            await createAuditLog(user.id, action, resource, details, request, propertyId);
          }
        };

        // 9. Log successful request if required
        if (options.logRequest) {
          await context.auditLog(
            options.auditAction || 'API_REQUEST',
            options.auditResource || 'api_endpoint',
            {
              endpoint: request.nextUrl.pathname,
              method: request.method,
              processingTime: Date.now() - startTime
            }
          );
        }

        // 10. Call the handler
        const response = await handler(request, context);
        
        // 11. Add security headers
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('X-Frame-Options', 'DENY');
        response.headers.set('X-XSS-Protection', '1; mode=block');
        response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        
        return response;
        
      } else {
        // Handle unauthenticated requests (if allowed)
        const context: SecureApiContext = {
          user: null as any,
          userId: 0,
          accessibleProperties: [],
          permissions: [],
          canAccess: async () => false,
          requireProperty: async () => false,
          auditLog: async () => {},
        };
        
        return await handler(request, context);
      }
      
    } catch (error) {
      console.error('Permission middleware error:', error);
      
      // Log the error if we have user context
      if (error instanceof Error) {
        try {
          const session = await getServerSession(authOptions);
          if (session?.user) {
            await createAuditLog(
              parseInt(session.user.id),
              'MIDDLEWARE_ERROR',
              'api_request',
              { 
                error: error.message,
                stack: error.stack,
                endpoint: request.nextUrl.pathname
              },
              request
            );
          }
        } catch (auditError) {
          console.error('Failed to log middleware error:', auditError);
        }
      }
      
      return NextResponse.json(
        { 
          error: "Internal server error", 
          code: "INTERNAL_ERROR"
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Convenience wrappers for common permission scenarios
 */

// Super admin only
export const requireSuperAdmin = (handler: any) => 
  withServerPermissions(handler, { roles: ['super_admin'] });

// Property-specific access
export const requirePropertyAccess = (level: PropertyAccessLevel) => (handler: any) =>
  withServerPermissions(handler, {
    requirePropertyAccess: { level, autoExtract: true }
  });

// Specific permissions
export const requirePermissions = (permissions: string[], requireAll = false) => (handler: any) =>
  withServerPermissions(handler, { permissions, requireAllPermissions: requireAll });

// Combined role and permission check
export const requireRoleAndPermissions = (roles: UserRole[], permissions: string[]) => (handler: any) =>
  withServerPermissions(handler, { roles, permissions });