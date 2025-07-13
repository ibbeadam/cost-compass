import { NextRequest, NextResponse } from 'next/server';
import { withServerPermissions } from '@/lib/permissions/server-middleware';
import { getAllOutletsAction, createOutletAction } from '@/actions/outletActions';
import { SecureApiContext } from '@/lib/permissions/server-middleware';

async function handleGetOutlets(
  request: NextRequest,
  context: SecureApiContext
) {
  try {
    const outlets = await getAllOutletsAction();
    
    return NextResponse.json({
      success: true,
      data: outlets,
      count: outlets.length
    });
  } catch (error) {
    console.error('Error fetching outlets:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch outlets' 
      },
      { status: 500 }
    );
  }
}

async function handleCreateOutlet(
  request: NextRequest,
  context: SecureApiContext
) {
  try {
    const body = await request.json();
    const { name, outletCode, propertyId } = body;

    if (!name || !outletCode || !propertyId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Name, outlet code, and property ID are required' 
        },
        { status: 400 }
      );
    }

    const outlet = await createOutletAction({
      name,
      outletCode,
      propertyId: parseInt(propertyId)
    });

    return NextResponse.json({
      success: true,
      data: outlet,
      message: 'Outlet created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating outlet:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create outlet' 
      },
      { status: 500 }
    );
  }
}

export const GET = withServerPermissions(handleGetOutlets, {
  permissions: ['outlets.read'],
  requireAllPermissions: true,
  rateLimit: { windowMs: 60000, maxRequests: 100 },
  auditAction: 'VIEW_OUTLETS',
  auditResource: 'outlets',
  logRequest: true
});

export const POST = withServerPermissions(handleCreateOutlet, {
  permissions: ['outlets.create'],
  requireAllPermissions: true,
  rateLimit: { windowMs: 60000, maxRequests: 10 },
  auditAction: 'CREATE_OUTLET',
  auditResource: 'outlets',
  logRequest: true
});