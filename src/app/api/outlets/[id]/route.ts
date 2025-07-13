import { NextRequest, NextResponse } from 'next/server';
import { withServerPermissions } from '@/lib/permissions/server-middleware';
import { getOutletByIdAction, updateOutletAction, deleteOutletAction } from '@/actions/outletActions';
import { SecureApiContext } from '@/lib/permissions/server-middleware';

async function handleGetOutlet(
  request: NextRequest,
  context: SecureApiContext & { params: { id: string } }
) {
  try {
    const outlet = await getOutletByIdAction(context.params.id);
    
    if (!outlet) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Outlet not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: outlet
    });
  } catch (error) {
    console.error('Error fetching outlet:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch outlet' 
      },
      { status: 500 }
    );
  }
}

async function handleUpdateOutlet(
  request: NextRequest,
  context: SecureApiContext & { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, outletCode, propertyId } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (outletCode !== undefined) updateData.outletCode = outletCode;
    if (propertyId !== undefined) updateData.propertyId = parseInt(propertyId);

    await updateOutletAction(context.params.id, updateData);

    return NextResponse.json({
      success: true,
      message: 'Outlet updated successfully'
    });
  } catch (error) {
    console.error('Error updating outlet:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update outlet' 
      },
      { status: 500 }
    );
  }
}

async function handleDeleteOutlet(
  request: NextRequest,
  context: SecureApiContext & { params: { id: string } }
) {
  try {
    await deleteOutletAction(context.params.id);

    return NextResponse.json({
      success: true,
      message: 'Outlet deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting outlet:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete outlet' 
      },
      { status: 500 }
    );
  }
}

export const GET = withServerPermissions(handleGetOutlet, {
  permissions: ['outlets.read'],
  requireAllPermissions: true,
  rateLimit: { windowMs: 60000, maxRequests: 100 },
  auditAction: 'VIEW_OUTLET',
  auditResource: 'outlets',
  logRequest: true
});

export const PUT = withServerPermissions(handleUpdateOutlet, {
  permissions: ['outlets.update'],
  requireAllPermissions: true,
  rateLimit: { windowMs: 60000, maxRequests: 20 },
  auditAction: 'UPDATE_OUTLET',
  auditResource: 'outlets',
  logRequest: true
});

export const DELETE = withServerPermissions(handleDeleteOutlet, {
  permissions: ['outlets.delete'],
  requireAllPermissions: true,
  rateLimit: { windowMs: 60000, maxRequests: 10 },
  auditAction: 'DELETE_OUTLET',
  auditResource: 'outlets',
  logRequest: true
});