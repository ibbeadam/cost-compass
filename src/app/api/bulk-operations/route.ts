/**
 * Bulk Operations API
 * Handles bulk user creation, permission management, and administrative operations
 */

import { NextRequest, NextResponse } from "next/server";
import { withServerPermissions, SecureApiContext } from "@/lib/permissions/server-middleware";
import { BulkOperationsService } from "@/lib/bulk-management/bulk-operations";

/**
 * POST /api/bulk-operations - Create a new bulk operation
 */
async function handleCreateBulkOperation(request: NextRequest, context: SecureApiContext) {
  const body = await request.json();
  const { type, data } = body;

  try {
    let result;

    switch (type) {
      case 'user_creation':
        result = await BulkOperationsService.bulkCreateUsers(data, context.userId);
        break;

      case 'permission_grant':
      case 'permission_revoke':
        result = await BulkOperationsService.bulkPermissionOperation(
          { ...data, operation: type.split('_')[1] },
          context.userId
        );
        break;

      case 'role_assignment':
        result = await BulkOperationsService.bulkAssignRoles(data, context.userId);
        break;

      case 'property_access':
        result = await BulkOperationsService.bulkPropertyAccess(data, context.userId);
        break;

      default:
        return NextResponse.json(
          { error: "Invalid bulk operation type" },
          { status: 400 }
        );
    }

    await context.auditLog('BULK_OPERATION_CREATED', 'bulk_operation', {
      operationId: result.operationId,
      type,
      totalItems: result.totalItems
    });

    return NextResponse.json({
      success: true,
      operationId: result.operationId,
      status: result.status,
      totalItems: result.totalItems,
      message: `Bulk ${type} operation initiated successfully`
    });

  } catch (error) {
    console.error('Bulk operation error:', error);
    
    await context.auditLog('BULK_OPERATION_FAILED', 'bulk_operation', {
      type,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: "Failed to create bulk operation" },
      { status: 500 }
    );
  }
}

export const POST = withServerPermissions(handleCreateBulkOperation, {
  roles: ['super_admin'],
  rateLimit: {
    windowMs: 60 * 1000,
    maxRequests: 5, // Max 5 bulk operations per minute
  },
  auditAction: 'CREATE_BULK_OPERATION',
  auditResource: 'bulk_operation',
  logRequest: true
});

/**
 * GET /api/bulk-operations - Get bulk operations history or status
 */
async function handleGetBulkOperations(request: NextRequest, context: SecureApiContext) {
  const searchParams = request.nextUrl.searchParams;
  const operationId = searchParams.get('operationId');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    if (operationId) {
      // Get specific operation status
      const operation = await BulkOperationsService.getBulkOperationStatus(operationId);
      
      if (!operation) {
        return NextResponse.json(
          { error: "Operation not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(operation);
    } else {
      // Get operations history
      const history = await BulkOperationsService.getBulkOperationsHistory(
        context.userId,
        limit,
        offset
      );

      return NextResponse.json(history);
    }

  } catch (error) {
    console.error('Error getting bulk operations:', error);
    return NextResponse.json(
      { error: "Failed to retrieve bulk operations" },
      { status: 500 }
    );
  }
}

export const GET = withServerPermissions(handleGetBulkOperations, {
  roles: ['super_admin', 'property_admin'],
  auditAction: 'VIEW_BULK_OPERATIONS',
  auditResource: 'bulk_operation',
  logRequest: true
});

/**
 * DELETE /api/bulk-operations - Cancel a bulk operation
 */
async function handleCancelBulkOperation(request: NextRequest, context: SecureApiContext) {
  const searchParams = request.nextUrl.searchParams;
  const operationId = searchParams.get('operationId');

  if (!operationId) {
    return NextResponse.json(
      { error: "Operation ID is required" },
      { status: 400 }
    );
  }

  try {
    const cancelled = await BulkOperationsService.cancelBulkOperation(operationId, context.userId);

    if (!cancelled) {
      return NextResponse.json(
        { error: "Failed to cancel operation" },
        { status: 500 }
      );
    }

    await context.auditLog('BULK_OPERATION_CANCELLED', 'bulk_operation', {
      operationId,
      cancelledBy: context.userId
    });

    return NextResponse.json({
      success: true,
      message: 'Operation cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling bulk operation:', error);
    return NextResponse.json(
      { error: "Failed to cancel operation" },
      { status: 500 }
    );
  }
}

export const DELETE = withServerPermissions(handleCancelBulkOperation, {
  roles: ['super_admin'],
  auditAction: 'CANCEL_BULK_OPERATION',
  auditResource: 'bulk_operation',
  logRequest: true
});