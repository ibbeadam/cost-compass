# Role & Permission Management System

## Overview

The Role & Permission Management System allows super admins to assign specific permissions to roles in your Cost Compass application. This provides granular control over what each role can access and perform in the system.

## Features

### 🎯 Core Functionality
- **Role-based Permission Assignment**: Assign individual permissions to any role
- **Visual Permission Management**: Easy-to-use interface with role and category filtering
- **Bulk Operations**: Assign or remove multiple permissions at once
- **Permission Copying**: Copy all permissions from one role to another
- **Real-time Statistics**: View permission coverage and usage analytics

### 📊 Dashboard Features
- **Role Overview**: See permission coverage for each role at a glance
- **Category Breakdown**: Permissions organized by categories (System Admin, User Management, etc.)
- **Advanced Filtering**: Filter by category, search permissions, show only assigned
- **Expandable Categories**: Collapsible permission groups for better organization

### 🔧 Management Tools
- **Individual Permission Toggle**: Turn permissions on/off with a single click
- **Bulk Selection**: Select multiple permissions for batch operations
- **Permission Templates**: Copy permissions between roles with overwrite options
- **Audit Trail**: All permission changes are logged for security compliance

## How to Use

### Accessing the System
1. Login as a **Super Admin** user
2. Navigate to **Admin > Role & Permission Assignment** in the sidebar
3. The dashboard will load with current role and permission data

### Managing Role Permissions

#### 1. Select a Role
- Use the role dropdown to select which role you want to manage
- The dropdown shows current permission counts for each role

#### 2. View and Filter Permissions
- **Search**: Use the search box to find specific permissions
- **Category Filter**: Filter by permission categories (System Admin, Financial Data, etc.)
- **Assigned Only**: Toggle to show only currently assigned permissions
- **Expand Categories**: Click on category headers to expand/collapse permission lists

#### 3. Assign/Remove Individual Permissions
- Click the **Assign** button to add a permission to the role
- Click the **Remove** button to remove a permission from the role
- Changes are applied immediately and logged in the audit trail

#### 4. Bulk Operations
- **Select Permissions**: Use checkboxes to select multiple permissions
- **Bulk Actions**: Click "Bulk Actions" button when permissions are selected
- **Assign All**: Add all selected permissions to the role
- **Remove All**: Remove all selected permissions from the role

#### 5. Copy Permissions Between Roles
- Click the **Copy Permissions** button in the top-right
- Select **Source Role** (role to copy from)
- Select **Target Role** (role to copy to)
- Choose **Overwrite**: Whether to replace existing permissions or add to them
- Click **Copy Permissions** to complete the operation

### Understanding the Interface

#### Permission Table Columns
- **Permission**: The permission name (e.g., "users.create", "financial.daily_summary.read")
- **Resource**: The system resource the permission applies to
- **Action**: The action type (CREATE, READ, UPDATE, DELETE, etc.)
- **Description**: Human-readable description of what the permission allows
- **Assigned**: Visual indicator (✓ or ✗) showing if the permission is assigned
- **Actions**: Assign/Remove buttons for individual permission management

#### Role Statistics
- **Permission Count**: Number of permissions assigned to each role
- **Coverage Percentage**: What percentage of total permissions are assigned
- **Category Breakdown**: Permission distribution across different categories

## Permission Structure

### Categories
- **SYSTEM_ADMIN**: Core system administration functions
- **USER_MANAGEMENT**: User creation, editing, and management
- **PROPERTY_MANAGEMENT**: Property and outlet management
- **FINANCIAL_DATA**: Financial summary and cost data management
- **REPORTING**: Report generation and access
- **OUTLET_MANAGEMENT**: Outlet-specific operations
- **COST_INPUT**: Food and beverage cost entry
- **DASHBOARD_ACCESS**: Dashboard viewing capabilities

### Actions
- **CREATE**: Create new records
- **READ**: View existing records
- **UPDATE**: Modify existing records
- **DELETE**: Remove records
- **APPROVE**: Approve pending items
- **EXPORT**: Export data
- **IMPORT**: Import data
- **MANAGE**: Full management capabilities
- **VIEW_ALL**: View all records regardless of ownership
- **VIEW_OWN**: View only owned records

## Best Practices

### Role Configuration
1. **Start with Templates**: Use the copy function to base new roles on existing ones
2. **Principle of Least Privilege**: Only assign permissions that are absolutely necessary
3. **Regular Reviews**: Periodically review role permissions to ensure they're still appropriate
4. **Document Changes**: Use the audit trail to track who made what changes and when

### Security Considerations
1. **Super Admin Access**: Only trusted users should have super admin role
2. **Permission Auditing**: Regularly review the audit logs for permission changes
3. **Role Separation**: Avoid giving users multiple conflicting roles
4. **Testing**: Test role permissions in a staging environment before applying to production

## API Endpoints

The system provides RESTful API endpoints for integration:

- `GET /api/roles-permissions` - Fetch roles with permissions
- `GET /api/roles-permissions?action=stats` - Get permission statistics
- `POST /api/roles-permissions` - Assign permissions or perform bulk operations
- `DELETE /api/roles-permissions` - Remove permissions or perform bulk removals

### Example API Usage

```javascript
// Assign a permission to a role
fetch('/api/roles-permissions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'assign',
    role: 'property_manager',
    permissionId: 15
  })
});

// Bulk assign permissions
fetch('/api/roles-permissions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'bulk-assign',
    role: 'supervisor',
    permissionIds: [1, 2, 3, 4, 5]
  })
});

// Copy permissions between roles
fetch('/api/roles-permissions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'copy',
    sourceRole: 'property_manager',
    targetRole: 'supervisor',
    overwrite: false
  })
});
```

## Database Tables

The system uses the following database tables:

- **permissions**: Core permission definitions (53 permissions)
- **role_permissions**: Maps roles to permissions (currently has 9 roles)
- **user_permissions**: Individual user permission overrides (currently empty)

## Troubleshooting

### Common Issues

1. **"Access Denied" Error**
   - Ensure you're logged in as a super admin
   - Check that your session hasn't expired

2. **Permissions Not Updating**
   - Refresh the page to see latest data
   - Check the browser console for any JavaScript errors

3. **Performance Issues**
   - The system handles large numbers of permissions efficiently
   - If experiencing slowness, try filtering by category

### Support

For technical support or questions about the permission system:
1. Check the audit logs for recent changes
2. Review the browser console for error messages
3. Verify database connectivity and permissions

## Future Enhancements

Planned improvements include:
- **Permission Templates**: Pre-configured permission sets for common roles
- **Time-based Permissions**: Permissions that expire automatically
- **Advanced Reporting**: More detailed analytics and reporting capabilities
- **Permission Dependencies**: Automatic assignment of prerequisite permissions

---

**Security Note**: This system provides powerful capabilities for managing user access. Always follow security best practices and regularly audit permission assignments to maintain system security.