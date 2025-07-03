# Multi-Property RBAC Implementation Guide

## Phase 1: Core Framework Implementation ✅ COMPLETED

This guide outlines the implementation of a comprehensive role-based access control (RBAC) system with multi-property support for the Cost Compass application.

## What Has Been Implemented

### 1. Enhanced Type System (`/src/types/index.ts`)
- **Updated User interface** with security fields and property relations
- **New UserRole enum** with 8 hierarchical roles (super_admin → readonly)
- **Property and PropertyAccess interfaces** for multi-property support
- **PropertyType and PropertyAccessLevel enums** for granular control

### 2. Permission System (`/src/lib/permissions.ts`)
- **Comprehensive permission definitions** organized by category
- **Role-permission matrix** mapping roles to specific permissions
- **Property access level permissions** for granular control
- **Helper functions** for permission validation

### 3. Property Access Control (`/src/lib/property-access.ts`)
- **PropertyAccessService class** for managing property-specific access
- **Methods for checking property permissions** and access levels
- **Grant/revoke property access** functionality
- **Mock implementations** ready for database integration

### 4. Permission Utilities (`/src/lib/permission-utils.ts`)
- **PermissionService** for basic role and permission checks
- **PropertyPermissionService** for property-aware permissions
- **Route permission mapping** for URL-based access control
- **Utility functions** for common permission scenarios

### 5. Enhanced Authentication (`/src/lib/auth-enhanced.ts`)
- **NextAuth configuration** with security features
- **Account lockout** and failed login tracking
- **Password validation** with complexity requirements
- **Session management** with property context
- **Audit logging** integration points

### 6. Enhanced Middleware (`/src/middleware-enhanced.ts`)
- **Property-aware route protection**
- **Automatic property ID extraction** from URLs
- **Comprehensive audit logging**
- **Rate limiting** helpers
- **User context injection** for API routes

### 7. UI Components (`/src/components/auth/PermissionGate.tsx`)
- **PermissionGate component** for conditional rendering
- **Specialized components** (AdminOnly, OwnerOnly, ManagerOnly, etc.)
- **Higher-order components** for complex scenarios
- **Property-specific permission checking**

### 8. React Hooks (`/src/hooks/usePermissions.ts`)
- **usePermissions hook** for permission checking in components
- **usePropertyPermissions hook** for property-specific scenarios
- **useAccessibleProperties hook** for filtering user properties
- **Comprehensive permission utilities**

### 9. Type Definitions (`/src/types/next-auth-enhanced.d.ts`)
- **Extended NextAuth types** for multi-property support
- **Session enhancement** with property access information
- **JWT token extensions** with permission data

### 10. Database Schema (`/prisma/schema-enhanced.prisma`)
- **Enhanced multi-property schema** with comprehensive RBAC
- **Property hierarchy** with outlets as sub-locations
- **Granular permission system** with user overrides
- **Comprehensive audit logging** structure

## Role Hierarchy

```
super_admin       → Platform-wide access across all properties
property_owner    → Owner of one or more properties  
property_admin    → Admin access to specific properties
regional_manager  → Manager across multiple properties in a region
property_manager  → Manager of a specific property
supervisor        → Supervisor level access within properties
user              → Basic user access
readonly          → Read-only access
```

## Property Access Levels

```
owner         → Full ownership control
full_control  → Administrative control
management    → Management operations
data_entry    → Data input and basic operations
read_only     → View-only access
```

## Usage Examples

### Basic Permission Checking
```typescript
import { usePermissions } from '@/hooks/usePermissions';

function MyComponent() {
  const { hasPermission, canAccessProperty } = usePermissions();
  
  if (hasPermission('financial.food_costs.create')) {
    // Show create button
  }
  
  if (canAccessProperty(propertyId, 'management')) {
    // Show management options
  }
}
```

### Conditional Rendering
```typescript
import { PermissionGate, CanEditFinancialData } from '@/components/auth/PermissionGate';

function FinancialPage({ propertyId }) {
  return (
    <div>
      <PermissionGate permission="financial.food_costs.read" propertyId={propertyId}>
        <FoodCostTable />
      </PermissionGate>
      
      <CanEditFinancialData propertyId={propertyId}>
        <AddFoodCostButton />
      </CanEditFinancialData>
    </div>
  );
}
```

### Property-Specific Hooks
```typescript
import { usePropertyPermissions } from '@/hooks/usePermissions';

function PropertyDashboard({ propertyId }) {
  const { canAccess, canManageUsers, canEditFinancialData } = usePropertyPermissions(propertyId);
  
  if (!canAccess('read_only')) {
    return <AccessDenied />;
  }
  
  return (
    <div>
      {canManageUsers() && <UserManagement />}
      {canEditFinancialData() && <FinancialInputs />}
    </div>
  );
}
```

## Next Steps (Phase 2)

### Immediate Implementation Tasks:
1. **Database Migration**: Apply the enhanced schema to your database
2. **Update Existing Components**: Replace hardcoded role checks with permission-based logic
3. **API Route Protection**: Secure all API endpoints with proper authorization
4. **Testing**: Implement comprehensive tests for the permission system

### Configuration Steps:
1. **Update NextAuth**: Replace existing auth configuration with enhanced version
2. **Apply Middleware**: Update middleware configuration to use enhanced version
3. **Update Components**: Wrap sensitive UI elements with PermissionGate
4. **Database Setup**: Run migrations for the enhanced schema

### Development Mode:
- All services include mock implementations for immediate development
- Database calls are commented out with TODO markers
- Components will work with basic session data until database is updated

## Security Features Included

✅ **Account Lockout** - Prevents brute force attacks
✅ **Password Policies** - Enforces strong passwords  
✅ **Session Management** - Secure session handling
✅ **Audit Logging** - Comprehensive activity tracking
✅ **Rate Limiting** - Prevents abuse
✅ **Property Isolation** - Data segregation by property
✅ **Granular Permissions** - Fine-grained access control
✅ **Role Hierarchy** - Structured access levels

## Benefits

- **Scalable**: Supports unlimited properties and users
- **Secure**: Industry-standard security practices
- **Flexible**: Granular permission control
- **Maintainable**: Clean, organized code structure
- **Developer-Friendly**: Comprehensive hooks and utilities
- **Audit-Ready**: Built-in logging and compliance features

This implementation provides a solid foundation for transforming your single-outlet application into a comprehensive multi-property management system with enterprise-grade security and access control.