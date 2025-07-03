/**
 * Multi-Property Permission System
 * Defines granular permissions for property-based access control
 */

import type { UserRole, PropertyAccessLevel } from "@/types";

// Permission Categories
export enum PermissionCategory {
  SYSTEM_ADMIN = "SYSTEM_ADMIN",
  USER_MANAGEMENT = "USER_MANAGEMENT", 
  PROPERTY_MANAGEMENT = "PROPERTY_MANAGEMENT",
  FINANCIAL_DATA = "FINANCIAL_DATA",
  REPORTING = "REPORTING",
  OUTLET_MANAGEMENT = "OUTLET_MANAGEMENT",
  COST_INPUT = "COST_INPUT",
  DASHBOARD_ACCESS = "DASHBOARD_ACCESS",
}

// Permission Actions
export enum PermissionAction {
  CREATE = "CREATE",
  READ = "READ",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  APPROVE = "APPROVE",
  EXPORT = "EXPORT",
  IMPORT = "IMPORT",
  MANAGE = "MANAGE",
  VIEW_ALL = "VIEW_ALL",      // View across all properties
  VIEW_OWN = "VIEW_OWN",      // View only owned properties
}

// Permission Definitions
export const PERMISSIONS = {
  // System Administration
  SYSTEM_ADMIN: {
    MANAGE_SYSTEM: 'system.manage',
    VIEW_AUDIT_LOGS: 'system.audit.read',
    MANAGE_BACKUPS: 'system.backup.manage',
    PLATFORM_SETTINGS: 'system.settings.manage',
  },
  
  // User Management
  USER_MANAGEMENT: {
    CREATE_USERS: 'users.create',
    READ_USERS: 'users.read',
    UPDATE_USERS: 'users.update',
    DELETE_USERS: 'users.delete',
    MANAGE_ROLES: 'users.roles.manage',
    RESET_PASSWORDS: 'users.password.reset',
    MANAGE_PERMISSIONS: 'users.permissions.manage',
    VIEW_ALL_USERS: 'users.view_all',
    VIEW_PROPERTY_USERS: 'users.view_property',
  },
  
  // Property Management
  PROPERTY_MANAGEMENT: {
    CREATE_PROPERTIES: 'properties.create',
    READ_PROPERTIES: 'properties.read',
    UPDATE_PROPERTIES: 'properties.update',
    DELETE_PROPERTIES: 'properties.delete',
    MANAGE_PROPERTY_ACCESS: 'properties.access.manage',
    TRANSFER_OWNERSHIP: 'properties.ownership.transfer',
    VIEW_ALL_PROPERTIES: 'properties.view_all',
    VIEW_OWN_PROPERTIES: 'properties.view_own',
    MANAGE_PROPERTY_SETTINGS: 'properties.settings.manage',
  },
  
  // Financial Data
  FINANCIAL_DATA: {
    CREATE_FOOD_COSTS: 'financial.food_costs.create',
    READ_FOOD_COSTS: 'financial.food_costs.read',
    UPDATE_FOOD_COSTS: 'financial.food_costs.update',
    DELETE_FOOD_COSTS: 'financial.food_costs.delete',
    CREATE_BEVERAGE_COSTS: 'financial.beverage_costs.create',
    READ_BEVERAGE_COSTS: 'financial.beverage_costs.read',
    UPDATE_BEVERAGE_COSTS: 'financial.beverage_costs.update',
    DELETE_BEVERAGE_COSTS: 'financial.beverage_costs.delete',
    APPROVE_COSTS: 'financial.costs.approve',
    CREATE_DAILY_SUMMARY: 'financial.daily_summary.create',
    READ_DAILY_SUMMARY: 'financial.daily_summary.read',
    UPDATE_DAILY_SUMMARY: 'financial.daily_summary.update',
    DELETE_DAILY_SUMMARY: 'financial.daily_summary.delete',
  },
  
  // Reporting
  REPORTING: {
    VIEW_BASIC_REPORTS: 'reports.basic.read',
    VIEW_DETAILED_REPORTS: 'reports.detailed.read',
    VIEW_FINANCIAL_REPORTS: 'reports.financial.read',
    VIEW_CROSS_PROPERTY_REPORTS: 'reports.cross_property.read',
    EXPORT_REPORTS: 'reports.export',
    CREATE_CUSTOM_REPORTS: 'reports.custom.create',
    SCHEDULE_REPORTS: 'reports.schedule.manage',
  },
  
  // Outlet Management
  OUTLET_MANAGEMENT: {
    CREATE_OUTLETS: 'outlets.create',
    READ_OUTLETS: 'outlets.read',
    UPDATE_OUTLETS: 'outlets.update',
    DELETE_OUTLETS: 'outlets.delete',
    MANAGE_OUTLET_USERS: 'outlets.users.manage',
  },
  
  // Dashboard Access
  DASHBOARD_ACCESS: {
    VIEW_DASHBOARD: 'dashboard.view',
    VIEW_PROPERTY_DASHBOARD: 'dashboard.property.view',
    VIEW_CROSS_PROPERTY_DASHBOARD: 'dashboard.cross_property.view',
    MANAGE_DASHBOARD_SETTINGS: 'dashboard.settings.manage',
  },
} as const;

// Flatten all permissions for easy access
export const ALL_PERMISSIONS = Object.values(PERMISSIONS).flatMap(category => Object.values(category));

// Role-Permission Matrix for Multi-Property System
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: ALL_PERMISSIONS,
  
  property_owner: [
    // System access
    PERMISSIONS.SYSTEM_ADMIN.VIEW_AUDIT_LOGS,
    
    // User management for owned properties
    PERMISSIONS.USER_MANAGEMENT.CREATE_USERS,
    PERMISSIONS.USER_MANAGEMENT.READ_USERS,
    PERMISSIONS.USER_MANAGEMENT.UPDATE_USERS,
    PERMISSIONS.USER_MANAGEMENT.DELETE_USERS,
    PERMISSIONS.USER_MANAGEMENT.RESET_PASSWORDS,
    PERMISSIONS.USER_MANAGEMENT.VIEW_PROPERTY_USERS,
    
    // Full property management for owned properties
    ...Object.values(PERMISSIONS.PROPERTY_MANAGEMENT),
    
    // Full financial data access
    ...Object.values(PERMISSIONS.FINANCIAL_DATA),
    
    // All reporting capabilities
    ...Object.values(PERMISSIONS.REPORTING),
    
    // Outlet management
    ...Object.values(PERMISSIONS.OUTLET_MANAGEMENT),
    
    // Dashboard access
    ...Object.values(PERMISSIONS.DASHBOARD_ACCESS),
  ],
  
  property_admin: [
    // Limited user management
    PERMISSIONS.USER_MANAGEMENT.READ_USERS,
    PERMISSIONS.USER_MANAGEMENT.UPDATE_USERS,
    PERMISSIONS.USER_MANAGEMENT.VIEW_PROPERTY_USERS,
    
    // Property management (no deletion/ownership transfer)
    PERMISSIONS.PROPERTY_MANAGEMENT.READ_PROPERTIES,
    PERMISSIONS.PROPERTY_MANAGEMENT.UPDATE_PROPERTIES,
    PERMISSIONS.PROPERTY_MANAGEMENT.MANAGE_PROPERTY_ACCESS,
    PERMISSIONS.PROPERTY_MANAGEMENT.VIEW_OWN_PROPERTIES,
    PERMISSIONS.PROPERTY_MANAGEMENT.MANAGE_PROPERTY_SETTINGS,
    
    // Financial data management
    ...Object.values(PERMISSIONS.FINANCIAL_DATA),
    
    // Reporting access
    PERMISSIONS.REPORTING.VIEW_BASIC_REPORTS,
    PERMISSIONS.REPORTING.VIEW_DETAILED_REPORTS,
    PERMISSIONS.REPORTING.VIEW_FINANCIAL_REPORTS,
    PERMISSIONS.REPORTING.EXPORT_REPORTS,
    
    // Outlet management
    ...Object.values(PERMISSIONS.OUTLET_MANAGEMENT),
    
    // Dashboard access
    PERMISSIONS.DASHBOARD_ACCESS.VIEW_DASHBOARD,
    PERMISSIONS.DASHBOARD_ACCESS.VIEW_PROPERTY_DASHBOARD,
    PERMISSIONS.DASHBOARD_ACCESS.MANAGE_DASHBOARD_SETTINGS,
  ],
  
  regional_manager: [
    // User viewing
    PERMISSIONS.USER_MANAGEMENT.READ_USERS,
    PERMISSIONS.USER_MANAGEMENT.VIEW_PROPERTY_USERS,
    
    // Property viewing and updating
    PERMISSIONS.PROPERTY_MANAGEMENT.READ_PROPERTIES,
    PERMISSIONS.PROPERTY_MANAGEMENT.UPDATE_PROPERTIES,
    PERMISSIONS.PROPERTY_MANAGEMENT.VIEW_OWN_PROPERTIES,
    
    // Financial data (no deletion)
    PERMISSIONS.FINANCIAL_DATA.CREATE_FOOD_COSTS,
    PERMISSIONS.FINANCIAL_DATA.READ_FOOD_COSTS,
    PERMISSIONS.FINANCIAL_DATA.UPDATE_FOOD_COSTS,
    PERMISSIONS.FINANCIAL_DATA.CREATE_BEVERAGE_COSTS,
    PERMISSIONS.FINANCIAL_DATA.READ_BEVERAGE_COSTS,
    PERMISSIONS.FINANCIAL_DATA.UPDATE_BEVERAGE_COSTS,
    PERMISSIONS.FINANCIAL_DATA.CREATE_DAILY_SUMMARY,
    PERMISSIONS.FINANCIAL_DATA.READ_DAILY_SUMMARY,
    PERMISSIONS.FINANCIAL_DATA.UPDATE_DAILY_SUMMARY,
    
    // Reporting
    PERMISSIONS.REPORTING.VIEW_BASIC_REPORTS,
    PERMISSIONS.REPORTING.VIEW_DETAILED_REPORTS,
    PERMISSIONS.REPORTING.VIEW_FINANCIAL_REPORTS,
    PERMISSIONS.REPORTING.VIEW_CROSS_PROPERTY_REPORTS,
    PERMISSIONS.REPORTING.EXPORT_REPORTS,
    
    // Outlet management
    PERMISSIONS.OUTLET_MANAGEMENT.READ_OUTLETS,
    PERMISSIONS.OUTLET_MANAGEMENT.UPDATE_OUTLETS,
    
    // Dashboard access
    PERMISSIONS.DASHBOARD_ACCESS.VIEW_DASHBOARD,
    PERMISSIONS.DASHBOARD_ACCESS.VIEW_PROPERTY_DASHBOARD,
    PERMISSIONS.DASHBOARD_ACCESS.VIEW_CROSS_PROPERTY_DASHBOARD,
  ],
  
  property_manager: [
    // User viewing
    PERMISSIONS.USER_MANAGEMENT.READ_USERS,
    PERMISSIONS.USER_MANAGEMENT.VIEW_PROPERTY_USERS,
    
    // Property viewing
    PERMISSIONS.PROPERTY_MANAGEMENT.READ_PROPERTIES,
    PERMISSIONS.PROPERTY_MANAGEMENT.VIEW_OWN_PROPERTIES,
    
    // Financial data management for managed property
    PERMISSIONS.FINANCIAL_DATA.CREATE_FOOD_COSTS,
    PERMISSIONS.FINANCIAL_DATA.READ_FOOD_COSTS,
    PERMISSIONS.FINANCIAL_DATA.UPDATE_FOOD_COSTS,
    PERMISSIONS.FINANCIAL_DATA.CREATE_BEVERAGE_COSTS,
    PERMISSIONS.FINANCIAL_DATA.READ_BEVERAGE_COSTS,
    PERMISSIONS.FINANCIAL_DATA.UPDATE_BEVERAGE_COSTS,
    PERMISSIONS.FINANCIAL_DATA.CREATE_DAILY_SUMMARY,
    PERMISSIONS.FINANCIAL_DATA.READ_DAILY_SUMMARY,
    PERMISSIONS.FINANCIAL_DATA.UPDATE_DAILY_SUMMARY,
    
    // Reporting
    PERMISSIONS.REPORTING.VIEW_BASIC_REPORTS,
    PERMISSIONS.REPORTING.VIEW_DETAILED_REPORTS,
    PERMISSIONS.REPORTING.VIEW_FINANCIAL_REPORTS,
    PERMISSIONS.REPORTING.EXPORT_REPORTS,
    
    // Outlet management
    PERMISSIONS.OUTLET_MANAGEMENT.READ_OUTLETS,
    PERMISSIONS.OUTLET_MANAGEMENT.UPDATE_OUTLETS,
    
    // Dashboard access
    PERMISSIONS.DASHBOARD_ACCESS.VIEW_DASHBOARD,
    PERMISSIONS.DASHBOARD_ACCESS.VIEW_PROPERTY_DASHBOARD,
  ],
  
  supervisor: [
    // Financial data entry
    PERMISSIONS.FINANCIAL_DATA.CREATE_FOOD_COSTS,
    PERMISSIONS.FINANCIAL_DATA.READ_FOOD_COSTS,
    PERMISSIONS.FINANCIAL_DATA.CREATE_BEVERAGE_COSTS,
    PERMISSIONS.FINANCIAL_DATA.READ_BEVERAGE_COSTS,
    PERMISSIONS.FINANCIAL_DATA.CREATE_DAILY_SUMMARY,
    PERMISSIONS.FINANCIAL_DATA.READ_DAILY_SUMMARY,
    
    // Basic reporting
    PERMISSIONS.REPORTING.VIEW_BASIC_REPORTS,
    
    // Dashboard viewing
    PERMISSIONS.DASHBOARD_ACCESS.VIEW_DASHBOARD,
    PERMISSIONS.DASHBOARD_ACCESS.VIEW_PROPERTY_DASHBOARD,
  ],
  
  user: [
    // Basic financial data viewing
    PERMISSIONS.FINANCIAL_DATA.READ_FOOD_COSTS,
    PERMISSIONS.FINANCIAL_DATA.READ_BEVERAGE_COSTS,
    PERMISSIONS.FINANCIAL_DATA.READ_DAILY_SUMMARY,
    
    // Basic reporting
    PERMISSIONS.REPORTING.VIEW_BASIC_REPORTS,
    
    // Dashboard viewing
    PERMISSIONS.DASHBOARD_ACCESS.VIEW_DASHBOARD,
  ],
  
  readonly: [
    // Read-only access to financial data
    PERMISSIONS.FINANCIAL_DATA.READ_FOOD_COSTS,
    PERMISSIONS.FINANCIAL_DATA.READ_BEVERAGE_COSTS,
    PERMISSIONS.FINANCIAL_DATA.READ_DAILY_SUMMARY,
    
    // Basic reporting
    PERMISSIONS.REPORTING.VIEW_BASIC_REPORTS,
    
    // Dashboard viewing
    PERMISSIONS.DASHBOARD_ACCESS.VIEW_DASHBOARD,
  ],
};

// Property Access Level Capabilities
export const ACCESS_LEVEL_PERMISSIONS: Record<PropertyAccessLevel, string[]> = {
  owner: ROLE_PERMISSIONS.property_owner,
  full_control: ROLE_PERMISSIONS.property_admin,
  management: ROLE_PERMISSIONS.property_manager,
  data_entry: ROLE_PERMISSIONS.supervisor,
  read_only: ROLE_PERMISSIONS.readonly,
};

// Helper function to get base permissions from role
export function getRolePermissions(role: UserRole): string[] {
  return ROLE_PERMISSIONS[role] || [];
}

// Helper function to get permissions from property access level
export function getAccessLevelPermissions(accessLevel: PropertyAccessLevel): string[] {
  return ACCESS_LEVEL_PERMISSIONS[accessLevel] || [];
}

// Helper function to check if a permission is valid
export function isValidPermission(permission: string): boolean {
  return ALL_PERMISSIONS.includes(permission);
}

// Helper function to get permission category
export function getPermissionCategory(permission: string): string | null {
  for (const [category, permissions] of Object.entries(PERMISSIONS)) {
    if (Object.values(permissions).includes(permission)) {
      return category;
    }
  }
  return null;
}