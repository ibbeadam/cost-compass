import { NextRequest, NextResponse } from 'next/server';
import { withServerPermissions } from '@/lib/permissions/server-middleware';
import { getCategoryByIdAction, updateCategoryAction, deleteCategoryAction } from '@/actions/categoryActions';
import { SecureApiContext } from '@/lib/permissions/server-middleware';

async function handleGetCategory(
  request: NextRequest,
  context: SecureApiContext & { params: { id: string } }
) {
  try {
    const category = await getCategoryByIdAction(context.params.id);
    
    if (!category) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Category not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch category' 
      },
      { status: 500 }
    );
  }
}

async function handleUpdateCategory(
  request: NextRequest,
  context: SecureApiContext & { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, description, type } = body;

    if (type && !['Food', 'Beverage'].includes(type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Type must be Food or Beverage' 
        },
        { status: 400 }
      );
    }

    await updateCategoryAction(context.params.id, name, description, type);

    return NextResponse.json({
      success: true,
      message: 'Category updated successfully'
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update category' 
      },
      { status: 500 }
    );
  }
}

async function handleDeleteCategory(
  request: NextRequest,
  context: SecureApiContext & { params: { id: string } }
) {
  try {
    await deleteCategoryAction(context.params.id);

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete category' 
      },
      { status: 500 }
    );
  }
}

export const GET = withServerPermissions(handleGetCategory, {
  permissions: ['categories.read'],
  requireAllPermissions: true,
  rateLimit: { windowMs: 60000, maxRequests: 100 },
  auditAction: 'VIEW_CATEGORY',
  auditResource: 'categories',
  logRequest: true
});

export const PUT = withServerPermissions(handleUpdateCategory, {
  permissions: ['categories.update'],
  requireAllPermissions: true,
  rateLimit: { windowMs: 60000, maxRequests: 20 },
  auditAction: 'UPDATE_CATEGORY',
  auditResource: 'categories',
  logRequest: true
});

export const DELETE = withServerPermissions(handleDeleteCategory, {
  permissions: ['categories.delete'],
  requireAllPermissions: true,
  rateLimit: { windowMs: 60000, maxRequests: 10 },
  auditAction: 'DELETE_CATEGORY',
  auditResource: 'categories',
  logRequest: true
});