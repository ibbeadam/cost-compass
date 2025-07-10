/**
 * Standalone Rate Limiting Middleware
 * For use in Next.js middleware.ts file
 */

import { NextRequest, NextResponse } from "next/server";
import { rateLimiter, ddosProtection, rateLimitConfigs, keyGenerators } from "./rate-limiting";

// Global rate limits applied to all requests
const GLOBAL_RATE_LIMITS = {
  // Aggressive protection against rapid requests
  burst: {
    windowMs: 10 * 1000,    // 10 seconds
    maxRequests: 30,        // 30 requests per 10 seconds
    keyGenerator: keyGenerators.byIP
  },

  // Standard rate limiting
  standard: {
    windowMs: 60 * 1000,    // 1 minute
    maxRequests: 120,       // 120 requests per minute
    keyGenerator: keyGenerators.byIP
  },

  // Hourly limits to prevent sustained abuse
  hourly: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 1000,        // 1000 requests per hour
    keyGenerator: keyGenerators.byIP
  }
};

// Endpoint-specific rate limits
const ENDPOINT_RATE_LIMITS: Record<string, typeof GLOBAL_RATE_LIMITS.standard> = {
  // Authentication endpoints
  '/api/auth': {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 5,            // 5 login attempts
    keyGenerator: keyGenerators.byIP
  },

  // File upload endpoints
  '/api/user/profile-image': {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 3,            // 3 uploads per minute
    keyGenerator: keyGenerators.byIP
  },

  '/api/property/logo': {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 3,            // 3 uploads per minute
    keyGenerator: keyGenerators.byIP
  },

  // Password reset endpoints
  '/api/users/[id]/reset-password': {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 2,            // 2 password resets per minute
    keyGenerator: keyGenerators.byIP
  },

  // Security-sensitive endpoints
  '/api/security': {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 10,           // 10 security operations per minute
    keyGenerator: keyGenerators.byIP
  },

  '/api/roles-permissions': {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 20,           // 20 permission changes per minute
    keyGenerator: keyGenerators.byIP
  }
};

/**
 * Rate limiting middleware for Next.js middleware.ts
 */
export async function rateLimitMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname;

  try {
    // 1. DDoS Protection (highest priority)
    const ddosResult = await ddosProtection(request);
    if (!ddosResult.allowed) {
      console.warn(`DDoS protection blocked request from ${request.ip}: ${ddosResult.reason}`);
      
      return new NextResponse(
        JSON.stringify({
          error: "Request blocked by security system",
          code: "SECURITY_BLOCK",
          reason: ddosResult.reason
        }),
        {
          status: ddosResult.reason?.includes('blocked') ? 403 : 429,
          headers: {
            'Content-Type': 'application/json',
            ...ddosResult.headers
          }
        }
      );
    }

    // 2. Endpoint-specific rate limiting
    for (const [pattern, config] of Object.entries(ENDPOINT_RATE_LIMITS)) {
      if (pathname.startsWith(pattern) || matchesPattern(pathname, pattern)) {
        const result = await rateLimiter.applyLimit(request, config);
        
        if (!result.allowed) {
          console.warn(`Rate limit exceeded for ${pathname} from ${request.ip}`);
          
          return new NextResponse(
            JSON.stringify({
              error: "Rate limit exceeded",
              code: "RATE_LIMIT_EXCEEDED",
              retryAfter: result.retryAfter
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                ...result.headers
              }
            }
          );
        }
      }
    }

    // 3. Global rate limiting
    for (const [name, config] of Object.entries(GLOBAL_RATE_LIMITS)) {
      const result = await rateLimiter.applyLimit(request, config);
      
      if (!result.allowed) {
        console.warn(`Global ${name} rate limit exceeded from ${request.ip}`);
        
        return new NextResponse(
          JSON.stringify({
            error: "Global rate limit exceeded",
            code: "GLOBAL_RATE_LIMIT_EXCEEDED",
            limit: name,
            retryAfter: result.retryAfter
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              ...result.headers
            }
          }
        );
      }
    }

    // Add rate limit headers to successful responses
    const response = NextResponse.next();
    
    // Add security headers
    response.headers.set('X-Rate-Limit-Applied', 'true');
    response.headers.set('X-DDoS-Protection', 'enabled');
    
    return response;

  } catch (error) {
    console.error('Rate limiting middleware error:', error);
    // Don't block requests if rate limiting fails
    return NextResponse.next();
  }
}

/**
 * Helper function to match dynamic routes
 */
function matchesPattern(pathname: string, pattern: string): boolean {
  // Convert Next.js dynamic route pattern to regex
  const regexPattern = pattern
    .replace(/\[([^\]]+)\]/g, '([^/]+)')  // [id] -> ([^/]+)
    .replace(/\//g, '\\/');               // / -> \/
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(pathname);
}

/**
 * Configure rate limiting for specific endpoints
 */
export function configureEndpointRateLimit(
  pattern: string,
  config: {
    windowMs: number;
    maxRequests: number;
    keyGenerator?: (req: NextRequest) => string;
  }
): void {
  ENDPOINT_RATE_LIMITS[pattern] = {
    ...config,
    keyGenerator: config.keyGenerator || keyGenerators.byIP
  };
}

/**
 * Get current rate limit status for debugging
 */
export async function getRateLimitStatus(request: NextRequest): Promise<{
  ip: string;
  globalLimits: Record<string, { remaining: number; resetTime: number }>;
  endpointLimits: Record<string, { remaining: number; resetTime: number }>;
}> {
  const ip = keyGenerators.byIP(request);
  const pathname = request.nextUrl.pathname;
  
  const status = {
    ip,
    globalLimits: {} as Record<string, { remaining: number; resetTime: number }>,
    endpointLimits: {} as Record<string, { remaining: number; resetTime: number }>
  };

  // Check global limits
  for (const [name, config] of Object.entries(GLOBAL_RATE_LIMITS)) {
    const key = config.keyGenerator(request);
    const usage = await rateLimiter.getUsage(key) || 0;
    const remaining = Math.max(0, config.maxRequests - usage);
    const resetTime = Date.now() + config.windowMs;
    
    status.globalLimits[name] = { remaining, resetTime };
  }

  // Check endpoint limits
  for (const [pattern, config] of Object.entries(ENDPOINT_RATE_LIMITS)) {
    if (pathname.startsWith(pattern) || matchesPattern(pathname, pattern)) {
      const key = config.keyGenerator(request);
      const usage = await rateLimiter.getUsage(key) || 0;
      const remaining = Math.max(0, config.maxRequests - usage);
      const resetTime = Date.now() + config.windowMs;
      
      status.endpointLimits[pattern] = { remaining, resetTime };
    }
  }

  return status;
}

/**
 * Reset rate limits for an IP (admin function)
 */
export async function resetRateLimits(ip: string): Promise<void> {
  // Reset global limits
  for (const [name, config] of Object.entries(GLOBAL_RATE_LIMITS)) {
    const key = `rate_limit:ip:${ip}`;
    await rateLimiter.resetLimit(key);
  }

  // Reset endpoint limits
  for (const [pattern, config] of Object.entries(ENDPOINT_RATE_LIMITS)) {
    const key = `rate_limit:ip:${ip}`;
    await rateLimiter.resetLimit(key);
  }

  console.log(`Rate limits reset for IP: ${ip}`);
}

/**
 * Whitelist an IP from rate limiting (use with caution)
 */
const WHITELISTED_IPS = new Set<string>([
  '127.0.0.1',
  '::1',
  // Add trusted IPs here
]);

export function isWhitelisted(ip: string): boolean {
  return WHITELISTED_IPS.has(ip);
}

export function addToWhitelist(ip: string): void {
  WHITELISTED_IPS.add(ip);
  console.log(`IP ${ip} added to whitelist`);
}

export function removeFromWhitelist(ip: string): void {
  WHITELISTED_IPS.delete(ip);
  console.log(`IP ${ip} removed from whitelist`);
}