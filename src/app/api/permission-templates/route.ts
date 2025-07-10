/**
 * Permission Templates API
 * Handles CRUD operations for permission templates and template applications
 */

import { NextRequest, NextResponse } from "next/server";
import { withServerPermissions, SecureApiContext } from "@/lib/permissions/server-middleware";
import { PermissionTemplateService } from "@/lib/permissions/templates";

/**
 * GET /api/permission-templates - Get all templates or specific template
 */
async function handleGetTemplates(request: NextRequest, context: SecureApiContext) {
  const searchParams = request.nextUrl.searchParams;
  const templateId = searchParams.get('id');
  const includeUsage = searchParams.get('includeUsage') === 'true';

  try {
    if (templateId) {
      const template = await PermissionTemplateService.getTemplate(templateId);
      
      if (!template) {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 }
        );
      }

      let usage = undefined;
      if (includeUsage) {
        usage = await PermissionTemplateService.getTemplateUsageStats(templateId);
      }

      return NextResponse.json({ template, usage });
    } else {
      const categories = await PermissionTemplateService.getTemplateCategories();
      return NextResponse.json({ categories });
    }

  } catch (error) {
    console.error('Error getting templates:', error);
    return NextResponse.json(
      { error: "Failed to retrieve templates" },
      { status: 500 }
    );
  }
}

export const GET = withServerPermissions(handleGetTemplates, {
  roles: ['super_admin', 'property_admin'],
  auditAction: 'VIEW_PERMISSION_TEMPLATES',
  auditResource: 'permission_template',
  logRequest: true
});

/**
 * POST /api/permission-templates - Create template or apply template
 */
async function handleCreateOrApplyTemplate(request: NextRequest, context: SecureApiContext) {
  const body = await request.json();
  const { action } = body;

  try {
    if (action === 'create') {
      const { templateData } = body;
      const template = await PermissionTemplateService.createTemplate(templateData, context.userId);
      
      await context.auditLog('PERMISSION_TEMPLATE_CREATED', 'permission_template', {
        templateId: template.id,
        templateName: template.name,
        type: template.type
      });

      return NextResponse.json({
        success: true,
        template,
        message: 'Template created successfully'
      });

    } else if (action === 'apply') {
      const { application } = body;
      const result = await PermissionTemplateService.applyTemplate(application, context.userId);
      
      await context.auditLog('PERMISSION_TEMPLATE_APPLIED', 'permission_template', {
        templateId: application.templateId,
        targetType: application.targetType,
        targetCount: application.targetIds.length,
        successCount: result.results.filter(r => r.status === 'success').length
      });

      return NextResponse.json({
        success: result.success,
        results: result.results,
        message: `Template applied to ${result.results.filter(r => r.status === 'success').length} targets`
      });

    } else if (action === 'generate_role_templates') {
      const templates = await PermissionTemplateService.generateRoleTemplates(context.userId);
      
      await context.auditLog('ROLE_TEMPLATES_GENERATED', 'permission_template', {
        generatedCount: templates.length
      });

      return NextResponse.json({
        success: true,
        templates,
        message: `Generated ${templates.length} role templates`
      });

    } else if (action === 'generate_property_templates') {
      const templates = await PermissionTemplateService.generatePropertyTemplates(context.userId);
      
      await context.auditLog('PROPERTY_TEMPLATES_GENERATED', 'permission_template', {
        generatedCount: templates.length
      });

      return NextResponse.json({
        success: true,
        templates,
        message: `Generated ${templates.length} property templates`
      });

    } else if (action === 'clone') {
      const { templateId, newName } = body;
      const clonedTemplate = await PermissionTemplateService.cloneTemplate(
        templateId,
        newName,
        context.userId
      );
      
      await context.auditLog('PERMISSION_TEMPLATE_CLONED', 'permission_template', {
        originalTemplateId: templateId,
        clonedTemplateId: clonedTemplate.id,
        newName
      });

      return NextResponse.json({
        success: true,
        template: clonedTemplate,
        message: 'Template cloned successfully'
      });

    } else {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Template operation error:', error);
    
    await context.auditLog('TEMPLATE_OPERATION_FAILED', 'permission_template', {
      action,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: "Template operation failed" },
      { status: 500 }
    );
  }
}

export const POST = withServerPermissions(handleCreateOrApplyTemplate, {
  roles: ['super_admin'],
  rateLimit: {
    windowMs: 60 * 1000,
    maxRequests: 20,
  },
  auditAction: 'MANAGE_PERMISSION_TEMPLATE',
  auditResource: 'permission_template',
  logRequest: true
});

/**
 * PUT /api/permission-templates - Update template
 */
async function handleUpdateTemplate(request: NextRequest, context: SecureApiContext) {
  const body = await request.json();
  const { templateId, updates } = body;

  if (!templateId) {
    return NextResponse.json(
      { error: "Template ID is required" },
      { status: 400 }
    );
  }

  try {
    const template = await PermissionTemplateService.updateTemplate(
      templateId,
      updates,
      context.userId
    );

    await context.auditLog('PERMISSION_TEMPLATE_UPDATED', 'permission_template', {
      templateId,
      updates
    });

    return NextResponse.json({
      success: true,
      template,
      message: 'Template updated successfully'
    });

  } catch (error) {
    console.error('Template update error:', error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

export const PUT = withServerPermissions(handleUpdateTemplate, {
  roles: ['super_admin'],
  auditAction: 'UPDATE_PERMISSION_TEMPLATE',
  auditResource: 'permission_template',
  logRequest: true
});

/**
 * DELETE /api/permission-templates - Delete template
 */
async function handleDeleteTemplate(request: NextRequest, context: SecureApiContext) {
  const searchParams = request.nextUrl.searchParams;
  const templateId = searchParams.get('id');

  if (!templateId) {
    return NextResponse.json(
      { error: "Template ID is required" },
      { status: 400 }
    );
  }

  try {
    const deleted = await PermissionTemplateService.deleteTemplate(templateId, context.userId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Failed to delete template" },
        { status: 500 }
      );
    }

    await context.auditLog('PERMISSION_TEMPLATE_DELETED', 'permission_template', {
      templateId
    });

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('Template deletion error:', error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}

export const DELETE = withServerPermissions(handleDeleteTemplate, {
  roles: ['super_admin'],
  auditAction: 'DELETE_PERMISSION_TEMPLATE',
  auditResource: 'permission_template',
  logRequest: true
});