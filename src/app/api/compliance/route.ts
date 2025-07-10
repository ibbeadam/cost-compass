/**
 * Compliance and Policy Enforcement API
 * Handles compliance policies, violations, and reporting
 */

import { NextRequest, NextResponse } from "next/server";
import { withServerPermissions, SecureApiContext } from "@/lib/permissions/server-middleware";
import { PolicyEnforcementEngine } from "@/lib/compliance/policy-enforcement";

/**
 * GET /api/compliance - Get compliance data
 */
async function handleGetComplianceData(request: NextRequest, context: SecureApiContext) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'dashboard';
  const framework = searchParams.get('framework');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    let data;

    switch (type) {
      case 'dashboard':
        data = await PolicyEnforcementEngine.getComplianceDashboard();
        break;

      case 'policies':
        // Would get all compliance policies
        data = { policies: [] }; // Placeholder
        break;

      case 'violations':
        // Would get compliance violations
        data = { violations: [] }; // Placeholder
        break;

      case 'scan':
        data = await PolicyEnforcementEngine.performComplianceScan();
        break;

      case 'report':
        if (!framework || !startDate || !endDate) {
          return NextResponse.json(
            { error: "Framework, start date, and end date are required for reports" },
            { status: 400 }
          );
        }
        
        data = await PolicyEnforcementEngine.generateComplianceReport(
          'compliance_dashboard',
          framework as any,
          new Date(startDate),
          new Date(endDate),
          context.userId
        );
        break;

      default:
        return NextResponse.json(
          { error: "Invalid compliance data type" },
          { status: 400 }
        );
    }

    await context.auditLog('VIEW_COMPLIANCE_DATA', 'compliance', {
      type,
      framework,
      period: startDate && endDate ? { startDate, endDate } : undefined
    });

    return NextResponse.json({
      success: true,
      data,
      type,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Compliance data error:', error);
    
    await context.auditLog('COMPLIANCE_DATA_ERROR', 'compliance', {
      type,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: "Failed to retrieve compliance data" },
      { status: 500 }
    );
  }
}

export const GET = withServerPermissions(handleGetComplianceData, {
  roles: ['super_admin', 'property_admin'],
  rateLimit: {
    windowMs: 60 * 1000,
    maxRequests: 20,
  },
  auditAction: 'VIEW_COMPLIANCE_DATA',
  auditResource: 'compliance',
  logRequest: true
});

/**
 * POST /api/compliance - Create policy or perform compliance actions
 */
async function handleComplianceActions(request: NextRequest, context: SecureApiContext) {
  const body = await request.json();
  const { action } = body;

  try {
    let result;

    switch (action) {
      case 'create_policy':
        const { policyData } = body;
        result = await PolicyEnforcementEngine.createPolicy(policyData, context.userId);
        
        await context.auditLog('COMPLIANCE_POLICY_CREATED', 'compliance_policy', {
          policyId: result.id,
          policyName: result.name,
          type: result.type,
          framework: result.framework
        });
        break;

      case 'evaluate_action':
        const { userId, actionName, resource, actionContext } = body;
        result = await PolicyEnforcementEngine.evaluateAction(
          userId,
          actionName,
          resource,
          actionContext || {}
        );
        
        await context.auditLog('POLICY_EVALUATION_PERFORMED', 'compliance', {
          evaluatedUserId: userId,
          action: actionName,
          resource,
          allowed: result.allowed,
          violationCount: result.violations.length
        });
        break;

      case 'generate_report':
        const { reportType, framework, startDate, endDate } = body;
        result = await PolicyEnforcementEngine.generateComplianceReport(
          reportType,
          framework,
          new Date(startDate),
          new Date(endDate),
          context.userId
        );
        
        await context.auditLog('COMPLIANCE_REPORT_GENERATED', 'compliance_report', {
          reportId: result.id,
          type: reportType,
          framework,
          period: { startDate, endDate }
        });
        break;

      case 'perform_scan':
        result = await PolicyEnforcementEngine.performComplianceScan();
        
        await context.auditLog('COMPLIANCE_SCAN_PERFORMED', 'compliance', {
          scannedUsers: result.scannedUsers,
          violationsFound: result.violationsFound,
          criticalIssues: result.criticalIssues
        });
        break;

      default:
        return NextResponse.json(
          { error: "Invalid compliance action" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Compliance ${action} completed successfully`
    });

  } catch (error) {
    console.error('Compliance action error:', error);
    
    await context.auditLog('COMPLIANCE_ACTION_FAILED', 'compliance', {
      action,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: "Compliance action failed" },
      { status: 500 }
    );
  }
}

export const POST = withServerPermissions(handleComplianceActions, {
  roles: ['super_admin'],
  rateLimit: {
    windowMs: 60 * 1000,
    maxRequests: 10,
  },
  auditAction: 'PERFORM_COMPLIANCE_ACTION',
  auditResource: 'compliance',
  logRequest: true
});

/**
 * PUT /api/compliance - Update compliance policies or resolve violations
 */
async function handleUpdateCompliance(request: NextRequest, context: SecureApiContext) {
  const body = await request.json();
  const { action, id } = body;

  try {
    let result;

    switch (action) {
      case 'resolve_violation':
        const { resolutionNotes } = body;
        // Would resolve a compliance violation
        result = { resolved: true, violationId: id };
        
        await context.auditLog('COMPLIANCE_VIOLATION_RESOLVED', 'compliance_violation', {
          violationId: id,
          resolvedBy: context.userId,
          resolutionNotes
        });
        break;

      case 'update_policy':
        const { updates } = body;
        // Would update a compliance policy
        result = { updated: true, policyId: id };
        
        await context.auditLog('COMPLIANCE_POLICY_UPDATED', 'compliance_policy', {
          policyId: id,
          updates
        });
        break;

      default:
        return NextResponse.json(
          { error: "Invalid update action" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Compliance ${action} completed successfully`
    });

  } catch (error) {
    console.error('Compliance update error:', error);
    return NextResponse.json(
      { error: "Compliance update failed" },
      { status: 500 }
    );
  }
}

export const PUT = withServerPermissions(handleUpdateCompliance, {
  roles: ['super_admin'],
  auditAction: 'UPDATE_COMPLIANCE',
  auditResource: 'compliance',
  logRequest: true
});