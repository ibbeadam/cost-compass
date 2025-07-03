/**
 * PermissionGate Component
 * Conditionally renders content based on user permissions and property access
 */

"use client";

import { useSession } from "next-auth/react";
import { usePermissions } from "@/hooks/usePermissions";
import type { ReactNode } from "react";
import type { UserRole, PropertyAccessLevel } from "@/types";

interface PermissionGateProps {
  children: ReactNode;
  
  // Permission-based access
  permission?: string;
  permissions?: string[];
  requireAll?: boolean; // For multiple permissions: true = AND, false = OR
  
  // Role-based access
  role?: UserRole;
  roles?: UserRole[];
  
  // Property-based access
  propertyId?: number;
  requiredAccessLevel?: PropertyAccessLevel;
  
  // Fallback content
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  
  // Additional options
  showFallbackOnLoading?: boolean;
}

/**
 * PermissionGate component that conditionally renders children based on user permissions
 */
export function PermissionGate({
  children,
  permission,
  permissions = [],
  requireAll = false,
  role,
  roles = [],
  propertyId,
  requiredAccessLevel,
  fallback = null,
  loadingFallback = null,
  showFallbackOnLoading = false,
}: PermissionGateProps) {
  const { data: session, status } = useSession();
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    canAccessProperty,
    isLoading
  } = usePermissions();

  // Show loading state
  if (status === "loading" || isLoading) {
    return showFallbackOnLoading ? <>{fallback}</> : <>{loadingFallback}</>;
  }

  // No session means no access
  if (!session?.user) {
    return <>{fallback}</>;
  }

  // Single permission check
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  // Multiple permissions check
  if (permissions.length > 0) {
    const hasRequiredPermissions = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
    
    if (!hasRequiredPermissions) {
      return <>{fallback}</>;
    }
  }

  // Single role check
  if (role && !hasRole(role)) {
    return <>{fallback}</>;
  }

  // Multiple roles check
  if (roles.length > 0 && !hasAnyRole(roles)) {
    return <>{fallback}</>;
  }

  // Property access check
  if (propertyId && requiredAccessLevel) {
    if (!canAccessProperty(propertyId, requiredAccessLevel)) {
      return <>{fallback}</>;
    }
  }

  // All checks passed, render children
  return <>{children}</>;
}

/**
 * Specialized components for common use cases
 */

interface AdminOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
  return (
    <PermissionGate
      roles={["super_admin", "property_admin"]}
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  );
}

interface SuperAdminOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function SuperAdminOnly({ children, fallback = null }: SuperAdminOnlyProps) {
  return (
    <PermissionGate
      roles={["super_admin"]}
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  );
}

interface OwnerOnlyProps {
  children: ReactNode;
  propertyId?: number;
  fallback?: ReactNode;
}

export function OwnerOnly({ children, propertyId, fallback = null }: OwnerOnlyProps) {
  return (
    <PermissionGate
      roles={["super_admin", "property_owner"]}
      propertyId={propertyId}
      requiredAccessLevel="owner"
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  );
}

interface ManagerOnlyProps {
  children: ReactNode;
  propertyId?: number;
  fallback?: ReactNode;
}

export function ManagerOnly({ children, propertyId, fallback = null }: ManagerOnlyProps) {
  return (
    <PermissionGate
      roles={["super_admin", "property_owner", "property_admin", "regional_manager", "property_manager"]}
      propertyId={propertyId}
      requiredAccessLevel="management"
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  );
}

interface CanManageUsersProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function CanManageUsers({ children, fallback = null }: CanManageUsersProps) {
  return (
    <PermissionGate
      permissions={["users.create", "users.update", "users.delete"]}
      requireAll={false}
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  );
}

interface CanEditFinancialDataProps {
  children: ReactNode;
  propertyId?: number;
  fallback?: ReactNode;
}

export function CanEditFinancialData({ children, propertyId, fallback = null }: CanEditFinancialDataProps) {
  return (
    <PermissionGate
      permissions={[
        "financial.food_costs.create",
        "financial.food_costs.update",
        "financial.beverage_costs.create", 
        "financial.beverage_costs.update",
        "financial.daily_summary.create",
        "financial.daily_summary.update"
      ]}
      requireAll={false}
      propertyId={propertyId}
      requiredAccessLevel="data_entry"
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  );
}

interface CanViewReportsProps {
  children: ReactNode;
  propertyId?: number;
  crossProperty?: boolean;
  fallback?: ReactNode;
}

export function CanViewReports({ 
  children, 
  propertyId, 
  crossProperty = false, 
  fallback = null 
}: CanViewReportsProps) {
  const permissions = crossProperty 
    ? ["reports.cross_property.read"]
    : ["reports.basic.read", "reports.detailed.read", "reports.financial.read"];

  return (
    <PermissionGate
      permissions={permissions}
      requireAll={false}
      propertyId={propertyId}
      requiredAccessLevel="read_only"
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  );
}

interface CanExportDataProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function CanExportData({ children, fallback = null }: CanExportDataProps) {
  return (
    <PermissionGate
      permission="reports.export"
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  );
}

/**
 * Higher-order component version for class components or complex logic
 */
interface WithPermissionsOptions {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  role?: UserRole;
  roles?: UserRole[];
  propertyId?: number;
  requiredAccessLevel?: PropertyAccessLevel;
  fallback?: ReactNode;
}

export function withPermissions<P extends object>(
  Component: React.ComponentType<P>,
  options: WithPermissionsOptions
) {
  return function PermissionWrappedComponent(props: P) {
    return (
      <PermissionGate {...options}>
        <Component {...props} />
      </PermissionGate>
    );
  };
}

/**
 * Hook to get permission checking functions
 */
export function usePermissionGate() {
  const { data: session } = useSession();
  const permissions = usePermissions();

  const checkAccess = (options: Omit<PermissionGateProps, 'children' | 'fallback'>) => {
    if (!session?.user) return false;

    // Single permission check
    if (options.permission && !permissions.hasPermission(options.permission)) {
      return false;
    }

    // Multiple permissions check
    if (options.permissions && options.permissions.length > 0) {
      const hasRequiredPermissions = options.requireAll 
        ? permissions.hasAllPermissions(options.permissions)
        : permissions.hasAnyPermission(options.permissions);
      
      if (!hasRequiredPermissions) {
        return false;
      }
    }

    // Single role check
    if (options.role && !permissions.hasRole(options.role)) {
      return false;
    }

    // Multiple roles check
    if (options.roles && options.roles.length > 0 && !permissions.hasAnyRole(options.roles)) {
      return false;
    }

    // Property access check
    if (options.propertyId && options.requiredAccessLevel) {
      if (!permissions.canAccessProperty(options.propertyId, options.requiredAccessLevel)) {
        return false;
      }
    }

    return true;
  };

  return { checkAccess };
}