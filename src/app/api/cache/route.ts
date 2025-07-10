/**
 * Cache Management API
 * Provides endpoints for cache administration and monitoring
 */

import { NextRequest, NextResponse } from "next/server";
import { withServerPermissions, SecureApiContext } from "@/lib/permissions/server-middleware";
import { PermissionCache } from "@/lib/cache/permission-cache";
import { CacheInvalidationService } from "@/lib/cache/cache-invalidation";

/**
 * GET /api/cache - Get cache statistics and health
 */
async function handleGetCacheInfo(request: NextRequest, context: SecureApiContext) {
  // Get cache statistics
  const stats = await PermissionCache.getCacheStats();
  const health = await CacheInvalidationService.getCacheHealth();

  // Log cache access
  await context.auditLog('VIEW_CACHE_STATS', 'cache', {
    stats,
    requestedBy: context.userId
  });

  return NextResponse.json({
    stats,
    health: health.health,
    recommendations: health.recommendations,
    timestamp: new Date().toISOString()
  });
}

export const GET = withServerPermissions(handleGetCacheInfo, {
  roles: ['super_admin'],
  auditAction: 'VIEW_CACHE_INFO',
  auditResource: 'cache',
  logRequest: true
});

/**
 * DELETE /api/cache - Clear specific or all caches
 */
async function handleClearCache(request: NextRequest, context: SecureApiContext) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action'); // 'user', 'property', 'role', 'all'
  const targetId = searchParams.get('id');

  let clearResult = { cleared: false, message: '', type: '' };

  try {
    switch (action) {
      case 'user':
        if (!targetId) {
          return NextResponse.json(
            { error: "User ID required for user cache clear" },
            { status: 400 }
          );
        }
        await PermissionCache.invalidateUserCache(parseInt(targetId));
        clearResult = { cleared: true, message: `User cache cleared for user ${targetId}`, type: 'user' };
        break;

      case 'property':
        if (!targetId) {
          return NextResponse.json(
            { error: "Property ID required for property cache clear" },
            { status: 400 }
          );
        }
        await PermissionCache.invalidatePropertyCache(parseInt(targetId));
        clearResult = { cleared: true, message: `Property cache cleared for property ${targetId}`, type: 'property' };
        break;

      case 'role':
        if (!targetId) {
          return NextResponse.json(
            { error: "Role required for role cache clear" },
            { status: 400 }
          );
        }
        await PermissionCache.invalidateRoleCache(targetId as any);
        clearResult = { cleared: true, message: `Role cache cleared for role ${targetId}`, type: 'role' };
        break;

      case 'all':
        await PermissionCache.clearAllCache();
        clearResult = { cleared: true, message: 'All caches cleared', type: 'all' };
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action. Use 'user', 'property', 'role', or 'all'" },
          { status: 400 }
        );
    }

    // Log the cache clear operation
    await context.auditLog('CACHE_CLEARED', 'cache', {
      action,
      targetId,
      clearedBy: context.userId,
      result: clearResult
    });

    return NextResponse.json({
      success: true,
      ...clearResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cache clear error:', error);
    
    await context.auditLog('CACHE_CLEAR_FAILED', 'cache', {
      action,
      targetId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: "Failed to clear cache" },
      { status: 500 }
    );
  }
}

export const DELETE = withServerPermissions(handleClearCache, {
  roles: ['super_admin'],
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // Max 10 cache operations per minute
  },
  auditAction: 'CLEAR_CACHE',
  auditResource: 'cache',
  logRequest: true
});

/**
 * POST /api/cache/warm - Warm cache for specific users or properties
 */
async function handleWarmCache(request: NextRequest, context: SecureApiContext) {
  const body = await request.json();
  const { userIds, propertyIds, warmAll } = body;

  if (!userIds && !warmAll) {
    return NextResponse.json(
      { error: "userIds array or warmAll flag required" },
      { status: 400 }
    );
  }

  try {
    const warmResults = [];

    if (warmAll) {
      // Warm cache for all active users with their accessible properties
      const activeUsers = await context.prisma?.user.findMany({
        where: { isActive: true },
        select: { id: true },
        take: 100 // Limit to prevent overwhelming
      }) || [];

      for (const user of activeUsers) {
        await CacheInvalidationService.warmCache(user.id, propertyIds);
        warmResults.push({ userId: user.id, status: 'warmed' });
      }
    } else {
      // Warm cache for specific users
      for (const userId of userIds) {
        try {
          await CacheInvalidationService.warmCache(userId, propertyIds);
          warmResults.push({ userId, status: 'warmed' });
        } catch (error) {
          warmResults.push({ 
            userId, 
            status: 'failed', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
    }

    // Log the cache warming operation
    await context.auditLog('CACHE_WARMED', 'cache', {
      userIds: warmAll ? 'all_active' : userIds,
      propertyIds,
      results: warmResults,
      warmedBy: context.userId
    });

    return NextResponse.json({
      success: true,
      message: 'Cache warming completed',
      results: warmResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cache warming error:', error);
    
    await context.auditLog('CACHE_WARM_FAILED', 'cache', {
      userIds,
      propertyIds,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: "Failed to warm cache" },
      { status: 500 }
    );
  }
}

export const POST = withServerPermissions(handleWarmCache, {
  roles: ['super_admin'],
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // Max 5 warming operations per minute
  },
  auditAction: 'WARM_CACHE',
  auditResource: 'cache',
  logRequest: true
});