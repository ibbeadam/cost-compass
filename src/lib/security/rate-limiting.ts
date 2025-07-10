/**
 * Advanced Rate Limiting System
 * Prevents abuse and DoS attacks with multiple layers of protection
 */

import { NextRequest } from "next/server";
import type { User } from "@/types";

// Rate limiting store interface
interface RateLimitStore {
  get(key: string): Promise<number | null>;
  set(key: string, value: number, ttl: number): Promise<void>;
  increment(key: string, ttl: number): Promise<number>;
  reset(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// In-memory store for development/fallback
class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, { value: number; expires: number }>();

  async get(key: string): Promise<number | null> {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.expires) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: number, ttl: number): Promise<void> {
    this.store.set(key, {
      value,
      expires: Date.now() + ttl * 1000
    });
  }

  async increment(key: string, ttl: number): Promise<number> {
    const current = await this.get(key);
    const newValue = (current || 0) + 1;
    await this.set(key, newValue, ttl);
    return newValue;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  // Cleanup expired entries periodically
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expires) {
        this.store.delete(key);
      }
    }
  }
}

// Redis-based store for production
class RedisRateLimitStore implements RateLimitStore {
  private redis: any;

  constructor() {
    try {
      // Try to import Redis if available
      const Redis = require('redis');
      this.redis = Redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      this.redis.connect().catch(() => {
        console.warn('Redis connection failed, falling back to memory store');
        this.redis = null;
      });
    } catch (error) {
      console.warn('Redis not available, using memory store');
      this.redis = null;
    }
  }

  private fallback = new MemoryRateLimitStore();

  async get(key: string): Promise<number | null> {
    if (!this.redis) return this.fallback.get(key);
    
    try {
      const value = await this.redis.get(key);
      return value ? parseInt(value) : null;
    } catch (error) {
      return this.fallback.get(key);
    }
  }

  async set(key: string, value: number, ttl: number): Promise<void> {
    if (!this.redis) return this.fallback.set(key, value, ttl);
    
    try {
      await this.redis.setEx(key, ttl, value.toString());
    } catch (error) {
      return this.fallback.set(key, value, ttl);
    }
  }

  async increment(key: string, ttl: number): Promise<number> {
    if (!this.redis) return this.fallback.increment(key, ttl);
    
    try {
      const pipeline = this.redis.multi();
      pipeline.incr(key);
      pipeline.expire(key, ttl);
      const results = await pipeline.exec();
      return results[0][1] || 1;
    } catch (error) {
      return this.fallback.increment(key, ttl);
    }
  }

  async reset(key: string): Promise<void> {
    if (!this.redis) return this.fallback.reset(key);
    
    try {
      await this.redis.del(key);
    } catch (error) {
      return this.fallback.reset(key);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.redis) return this.fallback.exists(key);
    
    try {
      return (await this.redis.exists(key)) === 1;
    } catch (error) {
      return this.fallback.exists(key);
    }
  }
}

// Rate limiting configuration
export interface RateLimitConfig {
  windowMs: number;          // Time window in milliseconds
  maxRequests: number;       // Maximum requests per window
  skipSuccessfulRequests?: boolean;  // Only count failed requests
  skipFailedRequests?: boolean;      // Only count successful requests
  keyGenerator?: (req: NextRequest, user?: User) => string;
  onLimitReached?: (req: NextRequest, user?: User) => void;
  enableBurst?: boolean;     // Allow burst requests
  burstLimit?: number;       // Maximum burst requests
}

// Predefined rate limit tiers
export const RATE_LIMIT_TIERS = {
  // Authentication endpoints
  AUTH: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 5,            // 5 attempts per window
    burstLimit: 2              // Allow 2 immediate retries
  },
  
  // File upload endpoints
  UPLOAD: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 5,            // 5 uploads per minute
    burstLimit: 1
  },
  
  // High-sensitivity operations (password reset, user management)
  HIGH_SECURITY: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 3,            // 3 operations per minute
    burstLimit: 1
  },
  
  // Medium-sensitivity operations (data modification)
  MEDIUM_SECURITY: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 10,           // 10 operations per minute
    burstLimit: 3
  },
  
  // Low-sensitivity operations (data reading)
  LOW_SECURITY: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 30,           // 30 operations per minute
    burstLimit: 10
  },
  
  // Public endpoints
  PUBLIC: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 50,           // 50 requests per minute
    burstLimit: 15
  },
  
  // Search and heavy operations
  SEARCH: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 20,           // 20 searches per minute
    burstLimit: 5
  }
} as const;

// Rate limiter class
export class RateLimiter {
  private store: RateLimitStore;
  private static instance: RateLimiter;

  constructor() {
    this.store = new RedisRateLimitStore();
    
    // Cleanup memory store every 5 minutes
    if (this.store instanceof MemoryRateLimitStore) {
      setInterval(() => {
        (this.store as MemoryRateLimitStore).cleanup();
      }, 5 * 60 * 1000);
    }
  }

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  /**
   * Check if request is within rate limit
   */
  async checkLimit(key: string, config: RateLimitConfig): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    const windowMs = config.windowMs;
    const maxRequests = config.maxRequests;
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const resetTime = windowStart + windowMs;

    // Increment request count
    const current = await this.store.increment(key, Math.ceil(windowMs / 1000));
    
    // Check burst limit if enabled
    if (config.enableBurst && config.burstLimit) {
      const burstKey = `${key}:burst`;
      const burstCurrent = await this.store.increment(burstKey, 10); // 10 second burst window
      
      if (burstCurrent > config.burstLimit) {
        return {
          allowed: false,
          remaining: 0,
          resetTime,
          retryAfter: 10 // Wait 10 seconds for burst reset
        };
      }
    }

    const remaining = Math.max(0, maxRequests - current);
    const allowed = current <= maxRequests;

    return {
      allowed,
      remaining,
      resetTime,
      retryAfter: allowed ? undefined : Math.ceil((resetTime - now) / 1000)
    };
  }

  /**
   * Apply rate limiting to a request
   */
  async applyLimit(
    request: NextRequest,
    config: RateLimitConfig,
    user?: User
  ): Promise<{
    allowed: boolean;
    headers: Record<string, string>;
    retryAfter?: number;
  }> {
    const key = config.keyGenerator 
      ? config.keyGenerator(request, user)
      : this.generateKey(request, user);

    const result = await this.checkLimit(key, config);

    const headers: Record<string, string> = {
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetTime.toString()
    };

    if (!result.allowed && result.retryAfter) {
      headers['Retry-After'] = result.retryAfter.toString();
    }

    // Call limit reached callback
    if (!result.allowed && config.onLimitReached) {
      config.onLimitReached(request, user);
    }

    return {
      allowed: result.allowed,
      headers,
      retryAfter: result.retryAfter
    };
  }

  /**
   * Generate rate limiting key
   */
  private generateKey(request: NextRequest, user?: User): string {
    const ip = this.getClientIP(request);
    const userId = user?.id;
    
    // Use user ID if authenticated, otherwise fall back to IP
    if (userId) {
      return `rate_limit:user:${userId}`;
    }
    
    return `rate_limit:ip:${ip}`;
  }

  /**
   * Extract client IP address
   */
  private getClientIP(request: NextRequest): string {
    // Check various headers for the real IP
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
      return realIP;
    }

    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    if (cfConnectingIP) {
      return cfConnectingIP;
    }

    // Fallback to connection remote address
    return request.ip || '127.0.0.1';
  }

  /**
   * Reset rate limit for a specific key
   */
  async resetLimit(key: string): Promise<void> {
    await this.store.reset(key);
  }

  /**
   * Get current usage for a key
   */
  async getUsage(key: string): Promise<number | null> {
    return await this.store.get(key);
  }
}

// Convenience functions for common rate limiting scenarios
export const rateLimiter = RateLimiter.getInstance();

/**
 * Create rate limit key generators
 */
export const keyGenerators = {
  // IP-based limiting
  byIP: (req: NextRequest) => {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
               req.headers.get('x-real-ip') || 
               req.ip || 
               '127.0.0.1';
    return `rate_limit:ip:${ip}`;
  },

  // User-based limiting
  byUser: (req: NextRequest, user?: User) => {
    if (user?.id) {
      return `rate_limit:user:${user.id}`;
    }
    return keyGenerators.byIP(req);
  },

  // Endpoint-specific limiting
  byEndpoint: (req: NextRequest, user?: User) => {
    const endpoint = req.nextUrl.pathname;
    const userId = user?.id || 'anonymous';
    return `rate_limit:endpoint:${endpoint}:user:${userId}`;
  },

  // Combined IP + User limiting
  byIPAndUser: (req: NextRequest, user?: User) => {
    const ip = keyGenerators.byIP(req).split(':')[2];
    const userId = user?.id || 'anonymous';
    return `rate_limit:combined:${ip}:${userId}`;
  }
};

/**
 * DDoS protection middleware
 */
export async function ddosProtection(
  request: NextRequest,
  user?: User
): Promise<{ allowed: boolean; reason?: string; headers: Record<string, string> }> {
  const ip = keyGenerators.byIP(request).split(':')[2];
  
  // Check for suspicious patterns
  const suspiciousChecks = [
    // Too many requests from single IP
    {
      key: `ddos:ip:${ip}`,
      config: {
        windowMs: 60 * 1000,     // 1 minute
        maxRequests: 100,        // 100 requests per minute max
      },
      reason: 'Too many requests from IP'
    },
    
    // Burst protection
    {
      key: `ddos:burst:${ip}`,
      config: {
        windowMs: 10 * 1000,     // 10 seconds
        maxRequests: 20,         // 20 requests per 10 seconds max
      },
      reason: 'Request burst detected'
    }
  ];

  for (const check of suspiciousChecks) {
    const result = await rateLimiter.checkLimit(check.key, check.config);
    if (!result.allowed) {
      return {
        allowed: false,
        reason: check.reason,
        headers: {
          'X-RateLimit-Limit': check.config.maxRequests.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime.toString(),
          'Retry-After': result.retryAfter?.toString() || '60'
        }
      };
    }
  }

  return { allowed: true, headers: {} };
}

/**
 * Export configured rate limiters for different use cases
 */
export const rateLimitConfigs = {
  // Authentication endpoints
  auth: {
    ...RATE_LIMIT_TIERS.AUTH,
    keyGenerator: keyGenerators.byIP,
    enableBurst: true
  },

  // File uploads
  upload: {
    ...RATE_LIMIT_TIERS.UPLOAD,
    keyGenerator: keyGenerators.byUser,
    enableBurst: false
  },

  // High security operations
  highSecurity: {
    ...RATE_LIMIT_TIERS.HIGH_SECURITY,
    keyGenerator: keyGenerators.byUser,
    enableBurst: false
  },

  // Medium security operations
  mediumSecurity: {
    ...RATE_LIMIT_TIERS.MEDIUM_SECURITY,
    keyGenerator: keyGenerators.byUser,
    enableBurst: true
  },

  // Low security operations
  lowSecurity: {
    ...RATE_LIMIT_TIERS.LOW_SECURITY,
    keyGenerator: keyGenerators.byUser,
    enableBurst: true
  },

  // Public endpoints
  public: {
    ...RATE_LIMIT_TIERS.PUBLIC,
    keyGenerator: keyGenerators.byIP,
    enableBurst: true
  },

  // Search operations
  search: {
    ...RATE_LIMIT_TIERS.SEARCH,
    keyGenerator: keyGenerators.byUser,
    enableBurst: true
  }
} as const;