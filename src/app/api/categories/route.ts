import { NextRequest, NextResponse } from 'next/server';
import { withServerPermissions } from '@/lib/permissions/server-middleware';
import { getAllCategoriesAction, createCategoryAction } from '@/actions/categoryActions';
import { SecureApiContext } from '@/lib/permissions/server-middleware';

async function handleGetCategories(
  request: NextRequest,
  context: SecureApiContext
) {
  try {
    const categories = await getAllCategoriesAction();
    
    return NextResponse.json({
      success: true,
      data: categories,
      count: categories.length
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch categories' 
      },
      { status: 500 }
    );
  }
}

async function handleCreateCategory(
  request: NextRequest,
  context: SecureApiContext
) {
  try {
    const body = await request.json();
    const { name, description, type } = body;

    if (!name || !type) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Name and type are required' 
        },
        { status: 400 }
      );
    }

    if (!['Food', 'Beverage'].includes(type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Type must be Food or Beverage' 
        },
        { status: 400 }
      );
    }

    const category = await createCategoryAction({
      name,
      description,
      type
    });

    return NextResponse.json({
      success: true,
      data: category,
      message: 'Category created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create category' 
      },
      { status: 500 }
    );
  }
}

export const GET = withServerPermissions(handleGetCategories, {
  permissions: ['categories.read'],
  requireAllPermissions: true,
  rateLimit: { windowMs: 60000, maxRequests: 100 },
  auditAction: 'VIEW_CATEGORIES',
  auditResource: 'categories',
  logRequest: true
});

export const POST = withServerPermissions(handleCreateCategory, {
  permissions: ['categories.create'],
  requireAllPermissions: true,
  rateLimit: { windowMs: 60000, maxRequests: 10 },
  auditAction: 'CREATE_CATEGORY',
  auditResource: 'categories',
  logRequest: true
});