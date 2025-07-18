// prisma/seeds/permissions.ts
import { PrismaClient, PermissionCategory, PermissionAction, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

// Define comprehensive permission structure for multi-property RBAC
export const PERMISSIONS = [
  // SYSTEM_ADMIN permissions
  {
    name: 'system.admin.full_access',
    description: 'Full system administration access',
    category: 'SYSTEM_ADMIN' as PermissionCategory,
    resource: 'system',
    action: 'MANAGE' as PermissionAction,
  },
  {
    name: 'system.logs.view',
    description: 'View system audit logs',
    category: 'SYSTEM_ADMIN' as PermissionCategory,
    resource: 'audit_logs',
    action: 'READ' as PermissionAction,
  },
  {
    name: 'system.settings.manage',
    description: 'Manage system-wide settings',
    category: 'SYSTEM_ADMIN' as PermissionCategory,
    resource: 'settings',
    action: 'MANAGE' as PermissionAction,
  },
  {
    name: 'system.roles.read',
    description: 'View system roles and permissions',
    category: 'SYSTEM_ADMIN' as PermissionCategory,
    resource: 'roles',
    action: 'READ' as PermissionAction,
  },
  {
    name: 'system.roles.update',
    description: 'Manage system roles and permissions',
    category: 'SYSTEM_ADMIN' as PermissionCategory,
    resource: 'roles',
    action: 'UPDATE' as PermissionAction,
  },
  {
    name: 'system.currencies.read',
    description: 'View system currencies',
    category: 'SYSTEM_ADMIN' as PermissionCategory,
    resource: 'currencies',
    action: 'READ' as PermissionAction,
  },
  {
    name: 'system.currencies.create',
    description: 'Create system currencies',
    category: 'SYSTEM_ADMIN' as PermissionCategory,
    resource: 'currencies',
    action: 'CREATE' as PermissionAction,
  },
  {
    name: 'system.currencies.update',
    description: 'Update system currencies',
    category: 'SYSTEM_ADMIN' as PermissionCategory,
    resource: 'currencies',
    action: 'UPDATE' as PermissionAction,
  },
  {
    name: 'system.currencies.delete',
    description: 'Delete system currencies',
    category: 'SYSTEM_ADMIN' as PermissionCategory,
    resource: 'currencies',
    action: 'DELETE' as PermissionAction,
  },

  // USER_MANAGEMENT permissions
  {
    name: 'users.create',
    description: 'Create new users',
    category: 'USER_MANAGEMENT' as PermissionCategory,
    resource: 'users',
    action: 'CREATE' as PermissionAction,
  },
  {
    name: 'users.read',
    description: 'View user information',
    category: 'USER_MANAGEMENT' as PermissionCategory,
    resource: 'users',
    action: 'READ' as PermissionAction,
  },
  {
    name: 'users.update',
    description: 'Update user information',
    category: 'USER_MANAGEMENT' as PermissionCategory,
    resource: 'users',
    action: 'UPDATE' as PermissionAction,
  },
  {
    name: 'users.delete',
    description: 'Delete users',
    category: 'USER_MANAGEMENT' as PermissionCategory,
    resource: 'users',
    action: 'DELETE' as PermissionAction,
  },
  {
    name: 'users.view_all',
    description: 'View all users across all properties',
    category: 'USER_MANAGEMENT' as PermissionCategory,
    resource: 'users',
    action: 'VIEW_ALL' as PermissionAction,
  },
  {
    name: 'users.view_own',
    description: 'View users within own properties only',
    category: 'USER_MANAGEMENT' as PermissionCategory,
    resource: 'users',
    action: 'VIEW_OWN' as PermissionAction,
  },
  {
    name: 'users.roles.manage',
    description: 'Manage user roles and permissions',
    category: 'USER_MANAGEMENT' as PermissionCategory,
    resource: 'user_roles',
    action: 'MANAGE' as PermissionAction,
  },
  {
    name: 'users.permissions.grant',
    description: 'Grant additional permissions to users',
    category: 'USER_MANAGEMENT' as PermissionCategory,
    resource: 'user_permissions',
    action: 'CREATE' as PermissionAction,
  },
  {
    name: 'users.permissions.revoke',
    description: 'Revoke permissions from users',
    category: 'USER_MANAGEMENT' as PermissionCategory,
    resource: 'user_permissions',
    action: 'DELETE' as PermissionAction,
  },

  // PROPERTY_MANAGEMENT permissions
  {
    name: 'properties.create',
    description: 'Create new properties',
    category: 'PROPERTY_MANAGEMENT' as PermissionCategory,
    resource: 'properties',
    action: 'CREATE' as PermissionAction,
  },
  {
    name: 'properties.read',
    description: 'View property information',
    category: 'PROPERTY_MANAGEMENT' as PermissionCategory,
    resource: 'properties',
    action: 'READ' as PermissionAction,
  },
  {
    name: 'properties.update',
    description: 'Update property information',
    category: 'PROPERTY_MANAGEMENT' as PermissionCategory,
    resource: 'properties',
    action: 'UPDATE' as PermissionAction,
  },
  {
    name: 'properties.delete',
    description: 'Delete properties',
    category: 'PROPERTY_MANAGEMENT' as PermissionCategory,
    resource: 'properties',
    action: 'DELETE' as PermissionAction,
  },
  {
    name: 'properties.view_all',
    description: 'View all properties in the system',
    category: 'PROPERTY_MANAGEMENT' as PermissionCategory,
    resource: 'properties',
    action: 'VIEW_ALL' as PermissionAction,
  },
  {
    name: 'properties.view_own',
    description: 'View only owned properties',
    category: 'PROPERTY_MANAGEMENT' as PermissionCategory,
    resource: 'properties',
    action: 'VIEW_OWN' as PermissionAction,
  },
  {
    name: 'properties.transfer',
    description: 'Transfer property ownership',
    category: 'PROPERTY_MANAGEMENT' as PermissionCategory,
    resource: 'properties',
    action: 'MANAGE' as PermissionAction,
  },
  {
    name: 'properties.access.grant',
    description: 'Grant property access to users',
    category: 'PROPERTY_MANAGEMENT' as PermissionCategory,
    resource: 'property_access',
    action: 'CREATE' as PermissionAction,
  },
  {
    name: 'properties.access.revoke',
    description: 'Revoke property access from users',
    category: 'PROPERTY_MANAGEMENT' as PermissionCategory,
    resource: 'property_access',
    action: 'DELETE' as PermissionAction,
  },

  // FINANCIAL_DATA permissions
  {
    name: 'financial.daily_summary.create',
    description: 'Create daily financial summaries',
    category: 'FINANCIAL_DATA' as PermissionCategory,
    resource: 'daily_financial_summary',
    action: 'CREATE' as PermissionAction,
  },
  {
    name: 'financial.daily_summary.read',
    description: 'View daily financial summaries',
    category: 'FINANCIAL_DATA' as PermissionCategory,
    resource: 'daily_financial_summary',
    action: 'READ' as PermissionAction,
  },
  {
    name: 'financial.daily_summary.update',
    description: 'Update daily financial summaries',
    category: 'FINANCIAL_DATA' as PermissionCategory,
    resource: 'daily_financial_summary',
    action: 'UPDATE' as PermissionAction,
  },
  {
    name: 'financial.daily_summary.delete',
    description: 'Delete daily financial summaries',
    category: 'FINANCIAL_DATA' as PermissionCategory,
    resource: 'daily_financial_summary',
    action: 'DELETE' as PermissionAction,
  },
  {
    name: 'financial.food_costs.create',
    description: 'Create food cost entries',
    category: 'FINANCIAL_DATA' as PermissionCategory,
    resource: 'food_costs',
    action: 'CREATE' as PermissionAction,
  },
  {
    name: 'financial.food_costs.read',
    description: 'View food cost entries',
    category: 'FINANCIAL_DATA' as PermissionCategory,
    resource: 'food_costs',
    action: 'READ' as PermissionAction,
  },
  {
    name: 'financial.food_costs.update',
    description: 'Update food cost entries',
    category: 'FINANCIAL_DATA' as PermissionCategory,
    resource: 'food_costs',
    action: 'UPDATE' as PermissionAction,
  },
  {
    name: 'financial.food_costs.delete',
    description: 'Delete food cost entries',
    category: 'FINANCIAL_DATA' as PermissionCategory,
    resource: 'food_costs',
    action: 'DELETE' as PermissionAction,
  },
  {
    name: 'financial.beverage_costs.create',
    description: 'Create beverage cost entries',
    category: 'FINANCIAL_DATA' as PermissionCategory,
    resource: 'beverage_costs',
    action: 'CREATE' as PermissionAction,
  },
  {
    name: 'financial.beverage_costs.read',
    description: 'View beverage cost entries',
    category: 'FINANCIAL_DATA' as PermissionCategory,
    resource: 'beverage_costs',
    action: 'READ' as PermissionAction,
  },
  {
    name: 'financial.beverage_costs.update',
    description: 'Update beverage cost entries',
    category: 'FINANCIAL_DATA' as PermissionCategory,
    resource: 'beverage_costs',
    action: 'UPDATE' as PermissionAction,
  },
  {
    name: 'financial.beverage_costs.delete',
    description: 'Delete beverage cost entries',
    category: 'FINANCIAL_DATA' as PermissionCategory,
    resource: 'beverage_costs',
    action: 'DELETE' as PermissionAction,
  },
  {
    name: 'financial.approve',
    description: 'Approve financial entries',
    category: 'FINANCIAL_DATA' as PermissionCategory,
    resource: 'financial_data',
    action: 'APPROVE' as PermissionAction,
  },

  // REPORTING permissions
  {
    name: 'reports.basic.read',
    description: 'View basic reports',
    category: 'REPORTING' as PermissionCategory,
    resource: 'reports',
    action: 'READ' as PermissionAction,
  },
  {
    name: 'reports.advanced.read',
    description: 'View advanced reports',
    category: 'REPORTING' as PermissionCategory,
    resource: 'advanced_reports',
    action: 'READ' as PermissionAction,
  },
  {
    name: 'reports.financial.read',
    description: 'View financial reports',
    category: 'REPORTING' as PermissionCategory,
    resource: 'financial_reports',
    action: 'READ' as PermissionAction,
  },
  {
    name: 'reports.cross_property.read',
    description: 'View cross-property reports',
    category: 'REPORTING' as PermissionCategory,
    resource: 'cross_property_reports',
    action: 'READ' as PermissionAction,
  },
  {
    name: 'reports.export',
    description: 'Export reports to various formats',
    category: 'REPORTING' as PermissionCategory,
    resource: 'reports',
    action: 'EXPORT' as PermissionAction,
  },
  {
    name: 'reports.cost_variance.read',
    description: 'View cost variance reports',
    category: 'REPORTING' as PermissionCategory,
    resource: 'cost_variance_reports',
    action: 'READ' as PermissionAction,
  },
  {
    name: 'reports.category_trends.read',
    description: 'View category trends reports',
    category: 'REPORTING' as PermissionCategory,
    resource: 'category_trends_reports',
    action: 'READ' as PermissionAction,
  },
  {
    name: 'reports.predictive_analytics.read',
    description: 'View predictive analytics reports',
    category: 'REPORTING' as PermissionCategory,
    resource: 'predictive_analytics_reports',
    action: 'READ' as PermissionAction,
  },
  {
    name: 'reports.profit_loss.read',
    description: 'View profit loss reports',
    category: 'REPORTING' as PermissionCategory,
    resource: 'profit_loss_reports',
    action: 'READ' as PermissionAction,
  },

  // OUTLET_MANAGEMENT permissions
  {
    name: 'outlets.create',
    description: 'Create new outlets',
    category: 'OUTLET_MANAGEMENT' as PermissionCategory,
    resource: 'outlets',
    action: 'CREATE' as PermissionAction,
  },
  {
    name: 'outlets.read',
    description: 'View outlet information',
    category: 'OUTLET_MANAGEMENT' as PermissionCategory,
    resource: 'outlets',
    action: 'READ' as PermissionAction,
  },
  {
    name: 'outlets.update',
    description: 'Update outlet information',
    category: 'OUTLET_MANAGEMENT' as PermissionCategory,
    resource: 'outlets',
    action: 'UPDATE' as PermissionAction,
  },
  {
    name: 'outlets.delete',
    description: 'Delete outlets',
    category: 'OUTLET_MANAGEMENT' as PermissionCategory,
    resource: 'outlets',
    action: 'DELETE' as PermissionAction,
  },
  {
    name: 'categories.create',
    description: 'Create new categories',
    category: 'OUTLET_MANAGEMENT' as PermissionCategory,
    resource: 'categories',
    action: 'CREATE' as PermissionAction,
  },
  {
    name: 'categories.read',
    description: 'View categories',
    category: 'OUTLET_MANAGEMENT' as PermissionCategory,
    resource: 'categories',
    action: 'READ' as PermissionAction,
  },
  {
    name: 'categories.update',
    description: 'Update categories',
    category: 'OUTLET_MANAGEMENT' as PermissionCategory,
    resource: 'categories',
    action: 'UPDATE' as PermissionAction,
  },
  {
    name: 'categories.delete',
    description: 'Delete categories',
    category: 'OUTLET_MANAGEMENT' as PermissionCategory,
    resource: 'categories',
    action: 'DELETE' as PermissionAction,
  },

  // COST_INPUT permissions (bulk import only - individual cost entries use financial.* pattern)
  {
    name: 'financial.bulk.import',
    description: 'Import bulk cost data',
    category: 'FINANCIAL_DATA' as PermissionCategory,
    resource: 'cost_data',
    action: 'IMPORT' as PermissionAction,
  },

  // DASHBOARD_ACCESS permissions
  {
    name: 'dashboard.view',
    description: 'Access main dashboard',
    category: 'DASHBOARD_ACCESS' as PermissionCategory,
    resource: 'dashboard',
    action: 'READ' as PermissionAction,
  },
  {
    name: 'dashboard.analytics.view',
    description: 'View dashboard analytics',
    category: 'DASHBOARD_ACCESS' as PermissionCategory,
    resource: 'dashboard_analytics',
    action: 'READ' as PermissionAction,
  },
  {
    name: 'dashboard.kpi.view',
    description: 'View KPI dashboard',
    category: 'DASHBOARD_ACCESS' as PermissionCategory,
    resource: 'kpi_dashboard',
    action: 'READ' as PermissionAction,
  },
  {
    name: 'dashboard.charts.financial',
    description: 'View financial charts on dashboard',
    category: 'DASHBOARD_ACCESS' as PermissionCategory,
    resource: 'dashboard_charts',
    action: 'READ' as PermissionAction,
  },
  {
    name: 'dashboard.analytics.costs',
    description: 'View cost analytics on dashboard',
    category: 'DASHBOARD_ACCESS' as PermissionCategory,
    resource: 'dashboard_analytics',
    action: 'READ' as PermissionAction,
  },
  {
    name: 'dashboard.property.compare',
    description: 'View property comparison on dashboard',
    category: 'DASHBOARD_ACCESS' as PermissionCategory,
    resource: 'dashboard_comparison',
    action: 'READ' as PermissionAction,
  },
  {
    name: 'dashboard.trends.view',
    description: 'View trend analysis on dashboard',
    category: 'DASHBOARD_ACCESS' as PermissionCategory,
    resource: 'dashboard_trends',
    action: 'READ' as PermissionAction,
  },
  {
    name: 'dashboard.categories.breakdown',
    description: 'View category breakdown on dashboard',
    category: 'DASHBOARD_ACCESS' as PermissionCategory,
    resource: 'dashboard_categories',
    action: 'READ' as PermissionAction,
  },
  {
    name: 'dashboard.outlets.performance',
    description: 'View outlet performance on dashboard',
    category: 'DASHBOARD_ACCESS' as PermissionCategory,
    resource: 'dashboard_outlets',
    action: 'READ' as PermissionAction,
  },
  {
    name: 'dashboard.export',
    description: 'Export dashboard data',
    category: 'DASHBOARD_ACCESS' as PermissionCategory,
    resource: 'dashboard',
    action: 'EXPORT' as PermissionAction,
  },
];

// Define role-permission mappings based on the 8-tier hierarchy
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: [
    // Full system access
    'system.admin.full_access',
    'system.logs.view',
    'system.settings.manage',
    'system.roles.read',
    'system.roles.update',
    'system.currencies.read',
    'system.currencies.create',
    'system.currencies.update',
    'system.currencies.delete',
    
    // Full user management
    'users.create',
    'users.read',
    'users.update',
    'users.delete',
    'users.view_all',
    'users.roles.manage',
    'users.permissions.grant',
    'users.permissions.revoke',
    
    // Full property management
    'properties.create',
    'properties.read',
    'properties.update',
    'properties.delete',
    'properties.view_all',
    'properties.transfer',
    'properties.access.grant',
    'properties.access.revoke',
    
    // Full financial data access
    'financial.daily_summary.create',
    'financial.daily_summary.read',
    'financial.daily_summary.update',
    'financial.daily_summary.delete',
    'financial.food_costs.create',
    'financial.food_costs.read',
    'financial.food_costs.update',
    'financial.food_costs.delete',
    'financial.beverage_costs.create',
    'financial.beverage_costs.read',
    'financial.beverage_costs.update',
    'financial.beverage_costs.delete',
    'financial.approve',
    
    // Full reporting access
    'reports.basic.read',
    'reports.advanced.read',
    'reports.financial.read',
    'reports.cross_property.read',
    'reports.cost_variance.read',
    'reports.category_trends.read',
    'reports.predictive_analytics.read',
    'reports.profit_loss.read',
    'reports.export',
    
    // Full outlet management
    'outlets.create',
    'outlets.read',
    'outlets.update',
    'outlets.delete',
    'categories.create',
    'categories.read',
    'categories.update',
    'categories.delete',
    
    // Full bulk import access
    'financial.bulk.import',
    
    // Full dashboard access
    'dashboard.view',
    'dashboard.analytics.view',
    'dashboard.kpi.view',
  ],
  
  property_owner: [
    // Limited user management within owned properties
    'users.create',
    'users.read',
    'users.update',
    'users.view_own',
    'users.permissions.grant',
    'users.permissions.revoke',
    
    // Property management for owned properties
    'properties.read',
    'properties.update',
    'properties.view_own',
    'properties.access.grant',
    'properties.access.revoke',
    
    // Full financial data access for owned properties
    'financial.daily_summary.create',
    'financial.daily_summary.read',
    'financial.daily_summary.update',
    'financial.daily_summary.delete',
    'financial.food_costs.create',
    'financial.food_costs.read',
    'financial.food_costs.update',
    'financial.food_costs.delete',
    'financial.beverage_costs.create',
    'financial.beverage_costs.read',
    'financial.beverage_costs.update',
    'financial.beverage_costs.delete',
    'financial.approve',
    
    // Advanced reporting
    'reports.basic.read',
    'reports.advanced.read',
    'reports.financial.read',
    'reports.cost_variance.read',
    'reports.category_trends.read',
    'reports.predictive_analytics.read',
    'reports.profit_loss.read',
    'reports.export',
    
    // Outlet management
    'outlets.create',
    'outlets.read',
    'outlets.update',
    'outlets.delete',
    'categories.create',
    'categories.read',
    'categories.update',
    'categories.delete',
    
    // Bulk import access
    'financial.bulk.import',
    
    // Dashboard access
    'dashboard.view',
    'dashboard.analytics.view',
    'dashboard.kpi.view',
    'dashboard.charts.financial',
    'dashboard.analytics.costs',
    'dashboard.property.compare',
    'dashboard.trends.view',
    'dashboard.categories.breakdown',
    'dashboard.outlets.performance',
    'dashboard.export',
  ],
  
  property_admin: [
    // User management within property
    'users.create',
    'users.read',
    'users.update',
    'users.view_own',
    'users.permissions.grant',
    
    // Property administration
    'properties.read',
    'properties.update',
    'properties.view_own',
    'properties.access.grant',
    
    // Financial data management
    'financial.daily_summary.create',
    'financial.daily_summary.read',
    'financial.daily_summary.update',
    'financial.food_costs.create',
    'financial.food_costs.read',
    'financial.food_costs.update',
    'financial.beverage_costs.create',
    'financial.beverage_costs.read',
    'financial.beverage_costs.update',
    'financial.approve',
    
    // Advanced reporting
    'reports.basic.read',
    'reports.advanced.read',
    'reports.financial.read',
    'reports.cost_variance.read',
    'reports.category_trends.read',
    'reports.predictive_analytics.read',
    'reports.profit_loss.read',
    'reports.export',
    
    // Outlet management
    'outlets.create',
    'outlets.read',
    'outlets.update',
    'outlets.delete',
    'categories.create',
    'categories.read',
    'categories.update',
    'categories.delete',
    
    // Bulk import access
    'financial.bulk.import',
    
    // Dashboard access
    'dashboard.view',
    'dashboard.analytics.view',
    'dashboard.kpi.view',
    'dashboard.charts.financial',
    'dashboard.analytics.costs',
    'dashboard.property.compare',
    'dashboard.trends.view',
    'dashboard.categories.breakdown',
    'dashboard.outlets.performance',
    'dashboard.export',
  ],
  
  regional_manager: [
    // Limited user management
    'users.read',
    'users.view_own',
    
    // Property viewing
    'properties.read',
    'properties.view_own',
    
    // Financial data access
    'financial.daily_summary.read',
    'financial.food_costs.read',
    'financial.beverage_costs.read',
    
    // Advanced reporting across region
    'reports.basic.read',
    'reports.advanced.read',
    'reports.financial.read',
    'reports.cross_property.read',
    'reports.cost_variance.read',
    'reports.category_trends.read',
    'reports.predictive_analytics.read',
    'reports.profit_loss.read',
    'reports.export',
    
    // Outlet viewing
    'outlets.read',
    'categories.read',
    
    // Dashboard access
    'dashboard.view',
    'dashboard.analytics.view',
    'dashboard.kpi.view',
    'dashboard.charts.financial',
    'dashboard.analytics.costs',
    'dashboard.property.compare',
    'dashboard.trends.view',
    'dashboard.categories.breakdown',
    'dashboard.outlets.performance',
    'dashboard.export',
  ],
  
  property_manager: [
    // Limited user viewing
    'users.read',
    'users.view_own',
    
    // Property management
    'properties.read',
    'properties.update',
    'properties.view_own',
    
    // Financial data management
    'financial.daily_summary.create',
    'financial.daily_summary.read',
    'financial.daily_summary.update',
    'financial.food_costs.create',
    'financial.food_costs.read',
    'financial.food_costs.update',
    'financial.beverage_costs.create',
    'financial.beverage_costs.read',
    'financial.beverage_costs.update',
    
    // Basic and financial reporting
    'reports.basic.read',
    'reports.financial.read',
    'reports.cost_variance.read',
    'reports.category_trends.read',
    'reports.predictive_analytics.read',
    'reports.profit_loss.read',
    'reports.export',
    
    // Outlet management
    'outlets.create',
    'outlets.read',
    'outlets.update',
    'categories.create',
    'categories.read',
    'categories.update',
    
    
    // Dashboard access
    'dashboard.view',
    'dashboard.analytics.view',
    'dashboard.kpi.view',
    'dashboard.charts.financial',
    'dashboard.analytics.costs',
    'dashboard.property.compare',
    'dashboard.trends.view',
    'dashboard.categories.breakdown',
    'dashboard.outlets.performance',
    'dashboard.export',
  ],
  
  supervisor: [
    // Financial data entry and viewing
    'financial.daily_summary.create',
    'financial.daily_summary.read',
    'financial.food_costs.create',
    'financial.food_costs.read',
    'financial.beverage_costs.create',
    'financial.beverage_costs.read',
    
    // Basic reporting
    'reports.basic.read',
    
    // Outlet viewing and categories
    'outlets.read',
    'categories.read',
    'categories.create',
    'categories.update',
    
    
    // Dashboard access
    'dashboard.view',
    'dashboard.analytics.view',
  ],
  
  user: [
    // Basic financial data entry
    'financial.daily_summary.create',
    'financial.daily_summary.read',
    'financial.food_costs.create',
    'financial.food_costs.read',
    'financial.beverage_costs.create',
    'financial.beverage_costs.read',
    
    // Basic reporting
    'reports.basic.read',
    
    // Basic outlet viewing
    'outlets.read',
    'categories.read',
    
    // Bulk import access
    'financial.bulk.import',
    
    // Dashboard access
    'dashboard.view',
  ],
  
  readonly: [
    // Read-only access to financial data
    'financial.daily_summary.read',
    'financial.food_costs.read',
    'financial.beverage_costs.read',
    
    // Basic reporting
    'reports.basic.read',
    
    // Read-only outlet access
    'outlets.read',
    'categories.read',
    
    // Dashboard viewing
    'dashboard.view',
    'dashboard.kpi.view',
    'dashboard.charts.financial',
    'dashboard.analytics.costs',
    'dashboard.trends.view',
    'dashboard.categories.breakdown',
    'dashboard.outlets.performance',
  ],
};

export async function seedPermissions() {
  console.log('🌱 Seeding permissions...');
  
  try {
    // Create permissions (upsert to handle existing permissions)
    for (const permission of PERMISSIONS) {
      await prisma.permission.upsert({
        where: { name: permission.name },
        update: permission,
        create: permission,
      });
    }
    
    console.log(`✅ Created ${PERMISSIONS.length} permissions`);
    
    // Create role-permission mappings (upsert to handle existing mappings)
    for (const [role, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
      for (const permissionName of permissionNames) {
        const permission = await prisma.permission.findUnique({
          where: { name: permissionName },
        });
        
        if (permission) {
          await prisma.rolePermission.upsert({
            where: {
              role_permissionId: {
                role: role as UserRole,
                permissionId: permission.id,
              }
            },
            update: {},
            create: {
              role: role as UserRole,
              permissionId: permission.id,
            },
          });
        }
      }
    }
    
    console.log('✅ Created role-permission mappings');
    console.log('🎉 Permission seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding permissions:', error);
    throw error;
  }
}

export default seedPermissions;