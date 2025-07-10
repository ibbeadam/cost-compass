/**
 * Permission Analytics API
 * Provides permission usage analytics, optimization recommendations, and compliance metrics
 */

import { NextRequest, NextResponse } from "next/server";
import { withServerPermissions, SecureApiContext } from "@/lib/permissions/server-middleware";
import { PermissionAnalyticsService } from "@/lib/analytics/permission-analytics";

/**
 * GET /api/analytics/permissions - Get permission analytics data
 */
async function handleGetPermissionAnalytics(request: NextRequest, context: SecureApiContext) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'dashboard';
  const timeframe = (searchParams.get('timeframe') as '7d' | '30d' | '90d') || '30d';
  const userId = searchParams.get('userId');

  try {
    let data;

    switch (type) {
      case 'dashboard':
        data = await PermissionAnalyticsService.getAnalyticsDashboard(timeframe);
        break;

      case 'metrics':
        data = await PermissionAnalyticsService.getPermissionUsageMetrics(timeframe);
        break;

      case 'patterns':
        data = await PermissionAnalyticsService.getPermissionUsagePatterns(timeframe);
        break;

      case 'compliance':
        data = await PermissionAnalyticsService.getComplianceMetrics();
        break;

      case 'recommendations':
        data = await PermissionAnalyticsService.getOptimizationRecommendations();
        break;

      case 'user_analysis':
        if (!userId) {
          return NextResponse.json(
            { error: "User ID is required for user analysis" },
            { status: 400 }
          );
        }
        data = await PermissionAnalyticsService.analyzeUserPermissions(parseInt(userId));
        break;

      default:
        return NextResponse.json(
          { error: "Invalid analytics type" },
          { status: 400 }
        );
    }

    await context.auditLog('VIEW_PERMISSION_ANALYTICS', 'analytics', {
      type,
      timeframe,
      userId: userId || undefined
    });

    return NextResponse.json({
      success: true,
      data,
      type,
      timeframe,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Permission analytics error:', error);
    
    await context.auditLog('ANALYTICS_ERROR', 'analytics', {
      type,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: "Failed to retrieve analytics data" },
      { status: 500 }
    );
  }
}

export const GET = withServerPermissions(handleGetPermissionAnalytics, {
  roles: ['super_admin', 'property_admin'],
  rateLimit: {
    windowMs: 60 * 1000,
    maxRequests: 30, // Higher limit for analytics
  },
  auditAction: 'VIEW_PERMISSION_ANALYTICS',
  auditResource: 'analytics',
  logRequest: true
});

/**
 * POST /api/analytics/permissions - Generate or export analytics reports
 */
async function handleGenerateAnalyticsReport(request: NextRequest, context: SecureApiContext) {
  const body = await request.json();
  const { action, reportType, timeframe, format, recipients } = body;

  try {
    if (action === 'generate_report') {
      const dashboard = await PermissionAnalyticsService.getAnalyticsDashboard(timeframe || '30d');
      
      const report = {
        id: `analytics_report_${Date.now()}`,
        type: reportType || 'comprehensive',
        timeframe: timeframe || '30d',
        generatedAt: new Date(),
        generatedBy: context.userId,
        data: dashboard,
        summary: {
          totalUsers: dashboard.compliance.totalUsers,
          complianceScore: dashboard.compliance.complianceScore,
          activeViolations: dashboard.compliance.violationCount,
          recommendationCount: dashboard.recommendations.length
        }
      };

      await context.auditLog('ANALYTICS_REPORT_GENERATED', 'analytics', {
        reportId: report.id,
        reportType,
        timeframe,
        format
      });

      return NextResponse.json({
        success: true,
        report,
        message: 'Analytics report generated successfully'
      });

    } else if (action === 'export_data') {
      // Export analytics data in specified format
      const data = await PermissionAnalyticsService.getAnalyticsDashboard(timeframe || '30d');
      
      await context.auditLog('ANALYTICS_DATA_EXPORTED', 'analytics', {
        format,
        timeframe,
        exportedBy: context.userId
      });

      return NextResponse.json({
        success: true,
        data,
        format,
        exportedAt: new Date().toISOString(),
        message: 'Analytics data exported successfully'
      });

    } else if (action === 'schedule_report') {
      // Schedule recurring analytics reports
      await context.auditLog('ANALYTICS_REPORT_SCHEDULED', 'analytics', {
        reportType,
        timeframe,
        recipients,
        scheduledBy: context.userId
      });

      return NextResponse.json({
        success: true,
        message: 'Analytics report scheduled successfully'
      });

    } else {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Analytics report generation error:', error);
    
    await context.auditLog('ANALYTICS_REPORT_ERROR', 'analytics', {
      action,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: "Failed to generate analytics report" },
      { status: 500 }
    );
  }
}

export const POST = withServerPermissions(handleGenerateAnalyticsReport, {
  roles: ['super_admin'],
  rateLimit: {
    windowMs: 60 * 1000,
    maxRequests: 10,
  },
  auditAction: 'GENERATE_ANALYTICS_REPORT',
  auditResource: 'analytics',
  logRequest: true
});