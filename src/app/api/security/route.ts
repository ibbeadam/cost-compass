/**
 * Security Monitoring API
 * Provides endpoints for security threat management and monitoring
 */

import { NextRequest, NextResponse } from "next/server";
import { withServerPermissions, SecureApiContext } from "@/lib/permissions/server-middleware";
import { SecurityMonitor } from "@/lib/security/security-monitor";

/**
 * GET /api/security - Get security metrics and active threats
 */
async function handleGetSecurityInfo(request: NextRequest, context: SecureApiContext) {
  const searchParams = request.nextUrl.searchParams;
  const timeframe = searchParams.get('timeframe') as '1h' | '24h' | '7d' || '24h';
  const includeResolved = searchParams.get('includeResolved') === 'true';

  try {
    // Get security metrics
    const metrics = await SecurityMonitor.getSecurityMetrics(timeframe);
    
    // Get active threats
    const activeThreats = SecurityMonitor.getActiveThreats();
    
    // Get recent alerts
    const recentAlerts = SecurityMonitor.getAlertHistory()
      .slice(-50) // Last 50 alerts
      .sort((a, b) => new Date(b.sentAt || 0).getTime() - new Date(a.sentAt || 0).getTime());

    // Log security dashboard access
    await context.auditLog('VIEW_SECURITY_DASHBOARD', 'security', {
      timeframe,
      activeThreatsCount: activeThreats.length,
      requestedBy: context.userId
    });

    return NextResponse.json({
      metrics,
      activeThreats: includeResolved ? activeThreats : activeThreats.filter(t => !t.resolved),
      recentAlerts,
      summary: {
        totalActiveThreats: activeThreats.filter(t => !t.resolved).length,
        criticalThreats: activeThreats.filter(t => t.level === 'critical' && !t.resolved).length,
        highThreats: activeThreats.filter(t => t.level === 'high' && !t.resolved).length,
        lastAlertTime: recentAlerts[0]?.sentAt || null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Security info error:', error);
    
    await context.auditLog('SECURITY_INFO_ERROR', 'security', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: "Failed to fetch security information" },
      { status: 500 }
    );
  }
}

export const GET = withServerPermissions(handleGetSecurityInfo, {
  roles: ['super_admin', 'property_admin'],
  auditAction: 'VIEW_SECURITY_INFO',
  auditResource: 'security',
  logRequest: true
});

/**
 * POST /api/security/resolve - Resolve a security threat
 */
async function handleResolveThreat(request: NextRequest, context: SecureApiContext) {
  const body = await request.json();
  const { threatId, resolution } = body;

  if (!threatId || !resolution) {
    return NextResponse.json(
      { error: "threatId and resolution are required" },
      { status: 400 }
    );
  }

  try {
    const resolved = await SecurityMonitor.resolveThreat(threatId, context.userId, resolution);
    
    if (!resolved) {
      return NextResponse.json(
        { error: "Threat not found or already resolved" },
        { status: 404 }
      );
    }

    // Log the threat resolution
    await context.auditLog('SECURITY_THREAT_RESOLVED', 'security', {
      threatId,
      resolution,
      resolvedBy: context.userId,
      resolvedAt: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Threat resolved successfully',
      threatId,
      resolvedBy: context.userId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Threat resolution error:', error);
    
    await context.auditLog('THREAT_RESOLUTION_ERROR', 'security', {
      threatId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: "Failed to resolve threat" },
      { status: 500 }
    );
  }
}

export const POST = withServerPermissions(handleResolveThreat, {
  roles: ['super_admin'],
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // Max 20 threat resolutions per minute
  },
  auditAction: 'RESOLVE_SECURITY_THREAT',
  auditResource: 'security',
  logRequest: true
});

/**
 * PUT /api/security/monitoring - Start/stop security monitoring
 */
async function handleMonitoringControl(request: NextRequest, context: SecureApiContext) {
  const body = await request.json();
  const { action } = body; // 'start' or 'stop'

  if (!action || !['start', 'stop'].includes(action)) {
    return NextResponse.json(
      { error: "Action must be 'start' or 'stop'" },
      { status: 400 }
    );
  }

  try {
    if (action === 'start') {
      SecurityMonitor.startMonitoring();
      
      await context.auditLog('SECURITY_MONITORING_STARTED', 'security', {
        startedBy: context.userId,
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        message: 'Security monitoring started',
        status: 'active',
        timestamp: new Date().toISOString()
      });
    } else {
      // Note: In a real implementation, you'd need to track and stop the intervals
      // For now, we'll just log the stop request
      await context.auditLog('SECURITY_MONITORING_STOP_REQUESTED', 'security', {
        requestedBy: context.userId,
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        message: 'Security monitoring stop requested',
        status: 'stop_requested',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Monitoring control error:', error);
    
    await context.auditLog('MONITORING_CONTROL_ERROR', 'security', {
      action,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: "Failed to control monitoring" },
      { status: 500 }
    );
  }
}

export const PUT = withServerPermissions(handleMonitoringControl, {
  roles: ['super_admin'],
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // Max 5 monitoring control actions per minute
  },
  auditAction: 'CONTROL_SECURITY_MONITORING',
  auditResource: 'security',
  logRequest: true
});

/**
 * DELETE /api/security/threats - Clear resolved threats
 */
async function handleClearResolvedThreats(request: NextRequest, context: SecureApiContext) {
  const searchParams = request.nextUrl.searchParams;
  const olderThanDays = parseInt(searchParams.get('olderThanDays') || '7');

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // Clear resolved threats from audit logs
    const deletedCount = await context.prisma?.auditLog.deleteMany({
      where: {
        action: 'SECURITY_THREAT_RESOLVED',
        timestamp: {
          lt: cutoffDate
        }
      }
    });

    await context.auditLog('SECURITY_THREATS_CLEARED', 'security', {
      olderThanDays,
      deletedCount: deletedCount?.count || 0,
      clearedBy: context.userId
    });

    return NextResponse.json({
      success: true,
      message: `Cleared ${deletedCount?.count || 0} resolved threats older than ${olderThanDays} days`,
      deletedCount: deletedCount?.count || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Clear threats error:', error);
    
    await context.auditLog('CLEAR_THREATS_ERROR', 'security', {
      olderThanDays,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: "Failed to clear threats" },
      { status: 500 }
    );
  }
}

export const DELETE = withServerPermissions(handleClearResolvedThreats, {
  roles: ['super_admin'],
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 2, // Max 2 clear operations per minute
  },
  auditAction: 'CLEAR_SECURITY_THREATS',
  auditResource: 'security',
  logRequest: true
});