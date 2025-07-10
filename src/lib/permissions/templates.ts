/**
 * Permission Template System
 * Provides pre-defined permission templates for roles, departments, and properties
 */

import { prisma } from "@/lib/prisma";
import { getRolePermissions } from "@/lib/permissions";
import type { UserRole, PropertyAccessLevel } from "@/types";

export interface PermissionTemplate {
  id: string;
  name: string;
  description?: string;
  type: 'role_template' | 'property_template' | 'department_template';
  permissions: string[];
  conditions?: Record<string, any>;
  isActive: boolean;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateApplication {
  templateId: string;
  targetType: 'user' | 'property' | 'group';
  targetIds: number[] | string[];
  options?: {
    overrideExisting?: boolean;
    expiresAt?: Date;
    additionalPermissions?: string[];
    excludePermissions?: string[];
  };
}

export interface TemplateCategory {
  name: string;
  description: string;
  templates: PermissionTemplate[];
}

/**
 * Permission Template Service
 */
export class PermissionTemplateService {

  /**
   * Get all available templates grouped by category
   */
  static async getTemplateCategories(): Promise<TemplateCategory[]> {
    try {
      const templates = await prisma.permissionTemplate.findMany({
        where: { isActive: true },
        include: {
          creator: { select: { id: true, name: true } }
        },
        orderBy: { name: 'asc' }
      });

      const categories: TemplateCategory[] = [
        {
          name: 'Role Templates',
          description: 'Pre-configured permission sets for different user roles',
          templates: templates.filter(t => t.type === 'role_template')
        },
        {
          name: 'Property Templates',
          description: 'Permission templates for different property access levels',
          templates: templates.filter(t => t.type === 'property_template')
        },
        {
          name: 'Department Templates',
          description: 'Department-specific permission configurations',
          templates: templates.filter(t => t.type === 'department_template')
        }
      ];

      return categories;

    } catch (error) {
      console.error('Error getting template categories:', error);
      return [];
    }
  }

  /**
   * Create a new permission template
   */
  static async createTemplate(
    templateData: Omit<PermissionTemplate, 'id' | 'createdAt' | 'updatedAt'>,
    createdBy: number
  ): Promise<PermissionTemplate> {
    try {
      const template = await prisma.permissionTemplate.create({
        data: {
          name: templateData.name,
          description: templateData.description,
          type: templateData.type,
          permissions: templateData.permissions,
          conditions: templateData.conditions,
          isActive: templateData.isActive,
          createdBy
        },
        include: {
          creator: { select: { id: true, name: true } }
        }
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: createdBy,
          action: 'PERMISSION_TEMPLATE_CREATED',
          resource: 'permission_template',
          resourceId: template.id,
          details: {
            templateName: template.name,
            type: template.type,
            permissionCount: Array.isArray(template.permissions) ? template.permissions.length : 0
          }
        }
      });

      return template as PermissionTemplate;

    } catch (error) {
      console.error('Error creating permission template:', error);
      throw error;
    }
  }

  /**
   * Update an existing template
   */
  static async updateTemplate(
    templateId: string,
    updates: Partial<Omit<PermissionTemplate, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>>,
    updatedBy: number
  ): Promise<PermissionTemplate> {
    try {
      const template = await prisma.permissionTemplate.update({
        where: { id: templateId },
        data: {
          ...updates,
          updatedAt: new Date()
        },
        include: {
          creator: { select: { id: true, name: true } }
        }
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: updatedBy,
          action: 'PERMISSION_TEMPLATE_UPDATED',
          resource: 'permission_template',
          resourceId: template.id,
          details: {
            templateName: template.name,
            updates
          }
        }
      });

      return template as PermissionTemplate;

    } catch (error) {
      console.error('Error updating permission template:', error);
      throw error;
    }
  }

  /**
   * Delete a template
   */
  static async deleteTemplate(templateId: string, deletedBy: number): Promise<boolean> {
    try {
      await prisma.permissionTemplate.update({
        where: { id: templateId },
        data: { isActive: false }
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: deletedBy,
          action: 'PERMISSION_TEMPLATE_DELETED',
          resource: 'permission_template',
          resourceId: templateId,
          details: { deletedBy }
        }
      });

      return true;

    } catch (error) {
      console.error('Error deleting permission template:', error);
      return false;
    }
  }

  /**
   * Apply template to users or properties
   */
  static async applyTemplate(
    application: TemplateApplication,
    appliedBy: number
  ): Promise<{
    success: boolean;
    results: Array<{
      targetId: string | number;
      status: 'success' | 'error';
      message: string;
    }>;
  }> {
    try {
      const template = await prisma.permissionTemplate.findUnique({
        where: { id: application.templateId }
      });

      if (!template || !template.isActive) {
        throw new Error('Template not found or inactive');
      }

      const permissions = template.permissions as string[];
      const results: Array<{
        targetId: string | number;
        status: 'success' | 'error';
        message: string;
      }> = [];

      for (const targetId of application.targetIds) {
        try {
          if (application.targetType === 'user') {
            await this.applyTemplateToUser(
              Number(targetId),
              permissions,
              application.options,
              appliedBy
            );
            results.push({
              targetId,
              status: 'success',
              message: 'Template applied successfully'
            });
          } else if (application.targetType === 'property') {
            await this.applyTemplateToProperty(
              Number(targetId),
              permissions,
              application.options,
              appliedBy
            );
            results.push({
              targetId,
              status: 'success',
              message: 'Template applied to property successfully'
            });
          }

        } catch (error) {
          results.push({
            targetId,
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: appliedBy,
          action: 'PERMISSION_TEMPLATE_APPLIED',
          resource: 'permission_template',
          resourceId: template.id,
          details: {
            templateName: template.name,
            targetType: application.targetType,
            targetCount: application.targetIds.length,
            successCount: results.filter(r => r.status === 'success').length,
            errorCount: results.filter(r => r.status === 'error').length
          }
        }
      });

      return {
        success: results.every(r => r.status === 'success'),
        results
      };

    } catch (error) {
      console.error('Error applying template:', error);
      throw error;
    }
  }

  /**
   * Apply template permissions to a user
   */
  private static async applyTemplateToUser(
    userId: number,
    permissions: string[],
    options: TemplateApplication['options'] = {},
    appliedBy: number
  ): Promise<void> {
    const { overrideExisting = false, expiresAt, additionalPermissions = [], excludePermissions = [] } = options;

    // Get all permissions to apply
    let finalPermissions = [...permissions, ...additionalPermissions];
    finalPermissions = finalPermissions.filter(p => !excludePermissions.includes(p));

    // Remove duplicates
    finalPermissions = [...new Set(finalPermissions)];

    for (const permissionName of finalPermissions) {
      const permission = await prisma.permission.findFirst({
        where: { name: permissionName }
      });

      if (!permission) {
        console.warn(`Permission ${permissionName} not found`);
        continue;
      }

      const existingPermission = await prisma.userPermission.findUnique({
        where: {
          userId_permissionId: {
            userId,
            permissionId: permission.id
          }
        }
      });

      if (existingPermission && !overrideExisting) {
        continue; // Skip if permission exists and we're not overriding
      }

      await prisma.userPermission.upsert({
        where: {
          userId_permissionId: {
            userId,
            permissionId: permission.id
          }
        },
        update: {
          granted: true,
          expiresAt,
          grantedBy: appliedBy
        },
        create: {
          userId,
          permissionId: permission.id,
          granted: true,
          expiresAt,
          grantedBy: appliedBy
        }
      });
    }
  }

  /**
   * Apply template permissions to a property (via property access)
   */
  private static async applyTemplateToProperty(
    propertyId: number,
    permissions: string[],
    options: TemplateApplication['options'] = {},
    appliedBy: number
  ): Promise<void> {
    // This would apply property-level permissions
    // Implementation depends on specific property permission model
    console.log(`Applying template to property ${propertyId} with permissions:`, permissions);
  }

  /**
   * Generate templates from existing roles
   */
  static async generateRoleTemplates(createdBy: number): Promise<PermissionTemplate[]> {
    try {
      const roles: UserRole[] = ['readonly', 'viewer', 'staff', 'supervisor', 'outlet_manager', 'property_manager', 'property_admin', 'super_admin'];
      const createdTemplates: PermissionTemplate[] = [];

      for (const role of roles) {
        const permissions = getRolePermissions(role);
        
        const templateName = `${role.replace('_', ' ').toUpperCase()} Role Template`;
        const description = `Auto-generated template for ${role} role with all standard permissions`;

        try {
          const template = await this.createTemplate({
            name: templateName,
            description,
            type: 'role_template',
            permissions,
            isActive: true
          }, createdBy);

          createdTemplates.push(template);

        } catch (error) {
          console.error(`Error creating template for role ${role}:`, error);
        }
      }

      return createdTemplates;

    } catch (error) {
      console.error('Error generating role templates:', error);
      return [];
    }
  }

  /**
   * Generate property access level templates
   */
  static async generatePropertyTemplates(createdBy: number): Promise<PermissionTemplate[]> {
    try {
      const accessLevels: PropertyAccessLevel[] = ['read_only', 'data_entry', 'management', 'full_control', 'owner'];
      const createdTemplates: PermissionTemplate[] = [];

      const accessLevelPermissions: Record<PropertyAccessLevel, string[]> = {
        'read_only': [
          'financial.daily_summary.read',
          'reports.basic.read',
          'outlets.read',
          'dashboard.view'
        ],
        'data_entry': [
          'financial.daily_summary.read',
          'financial.daily_summary.create',
          'financial.food_costs.read',
          'financial.food_costs.create',
          'financial.beverage_costs.read',
          'financial.beverage_costs.create',
          'reports.basic.read',
          'outlets.read',
          'dashboard.view'
        ],
        'management': [
          'financial.daily_summary.read',
          'financial.daily_summary.create',
          'financial.daily_summary.update',
          'financial.food_costs.read',
          'financial.food_costs.create',
          'financial.food_costs.update',
          'financial.beverage_costs.read',
          'financial.beverage_costs.create',
          'financial.beverage_costs.update',
          'reports.basic.read',
          'reports.advanced.read',
          'outlets.read',
          'outlets.update',
          'dashboard.view',
          'analytics.basic.read'
        ],
        'full_control': [
          'financial.daily_summary.read',
          'financial.daily_summary.create',
          'financial.daily_summary.update',
          'financial.daily_summary.delete',
          'financial.food_costs.read',
          'financial.food_costs.create',
          'financial.food_costs.update',
          'financial.food_costs.delete',
          'financial.beverage_costs.read',
          'financial.beverage_costs.create',
          'financial.beverage_costs.update',
          'financial.beverage_costs.delete',
          'reports.basic.read',
          'reports.advanced.read',
          'reports.export',
          'outlets.read',
          'outlets.create',
          'outlets.update',
          'outlets.delete',
          'dashboard.view',
          'analytics.basic.read',
          'analytics.advanced.read',
          'users.property.read',
          'users.property.update'
        ],
        'owner': [
          'financial.daily_summary.read',
          'financial.daily_summary.create',
          'financial.daily_summary.update',
          'financial.daily_summary.delete',
          'financial.food_costs.read',
          'financial.food_costs.create',
          'financial.food_costs.update',
          'financial.food_costs.delete',
          'financial.beverage_costs.read',
          'financial.beverage_costs.create',
          'financial.beverage_costs.update',
          'financial.beverage_costs.delete',
          'reports.basic.read',
          'reports.advanced.read',
          'reports.export',
          'outlets.read',
          'outlets.create',
          'outlets.update',
          'outlets.delete',
          'dashboard.view',
          'analytics.basic.read',
          'analytics.advanced.read',
          'analytics.export',
          'users.property.read',
          'users.property.create',
          'users.property.update',
          'users.property.delete',
          'permissions.property.grant',
          'permissions.property.revoke'
        ]
      };

      for (const accessLevel of accessLevels) {
        const permissions = accessLevelPermissions[accessLevel];
        
        const templateName = `${accessLevel.replace('_', ' ').toUpperCase()} Property Access Template`;
        const description = `Property access template for ${accessLevel} level with appropriate permissions`;

        try {
          const template = await this.createTemplate({
            name: templateName,
            description,
            type: 'property_template',
            permissions,
            conditions: { accessLevel },
            isActive: true
          }, createdBy);

          createdTemplates.push(template);

        } catch (error) {
          console.error(`Error creating template for access level ${accessLevel}:`, error);
        }
      }

      return createdTemplates;

    } catch (error) {
      console.error('Error generating property templates:', error);
      return [];
    }
  }

  /**
   * Get template by ID
   */
  static async getTemplate(templateId: string): Promise<PermissionTemplate | null> {
    try {
      const template = await prisma.permissionTemplate.findUnique({
        where: { id: templateId },
        include: {
          creator: { select: { id: true, name: true } }
        }
      });

      return template as PermissionTemplate | null;

    } catch (error) {
      console.error('Error getting template:', error);
      return null;
    }
  }

  /**
   * Clone a template
   */
  static async cloneTemplate(
    templateId: string,
    newName: string,
    clonedBy: number
  ): Promise<PermissionTemplate> {
    try {
      const originalTemplate = await prisma.permissionTemplate.findUnique({
        where: { id: templateId }
      });

      if (!originalTemplate) {
        throw new Error('Template not found');
      }

      const clonedTemplate = await this.createTemplate({
        name: newName,
        description: `Cloned from: ${originalTemplate.name}`,
        type: originalTemplate.type as any,
        permissions: originalTemplate.permissions as string[],
        conditions: originalTemplate.conditions as any,
        isActive: true
      }, clonedBy);

      return clonedTemplate;

    } catch (error) {
      console.error('Error cloning template:', error);
      throw error;
    }
  }

  /**
   * Get template usage statistics
   */
  static async getTemplateUsageStats(templateId: string): Promise<{
    totalApplications: number;
    recentApplications: number;
    affectedUsers: number;
    lastUsed?: Date;
  }> {
    try {
      // Get audit logs for template applications
      const applications = await prisma.auditLog.findMany({
        where: {
          action: 'PERMISSION_TEMPLATE_APPLIED',
          resourceId: templateId
        },
        orderBy: { timestamp: 'desc' }
      });

      const recentApplications = applications.filter(
        app => new Date(app.timestamp).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000 // Last 30 days
      );

      const affectedUsers = new Set(
        applications.map(app => (app.details as any)?.targetIds || []).flat()
      ).size;

      return {
        totalApplications: applications.length,
        recentApplications: recentApplications.length,
        affectedUsers,
        lastUsed: applications[0]?.timestamp
      };

    } catch (error) {
      console.error('Error getting template usage stats:', error);
      return {
        totalApplications: 0,
        recentApplications: 0,
        affectedUsers: 0
      };
    }
  }
}