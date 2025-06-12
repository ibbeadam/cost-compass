# User Management System

## Overview

The Cost Compass application includes a comprehensive user management system built with Firebase Authentication and Firestore. This system allows administrators to create, edit, delete, and manage user accounts with different roles and permissions.

## Features

### User Roles
- **Admin**: Full system access, can manage all users and settings
- **Manager**: Can view reports and manage operational data
- **User**: Basic access to input data and view assigned reports

### User Management Features
- ✅ Create new users with email/password authentication
- ✅ Edit user profiles (name, role, department, phone)
- ✅ Activate/deactivate user accounts
- ✅ Delete user accounts
- ✅ Role-based access control
- ✅ Automatic password reset emails for new users
- ✅ User activity tracking (last login)
- ✅ Department and contact information management

## Setup Instructions

### 1. Initialize Admin User

Run the initialization script to create the first admin user:

```bash
node scripts/init-admin-user.js
```

This script will:
- Create a Firebase Auth user account
- Create a corresponding Firestore user document
- Send a password reset email to set the initial password
- Set the user role as 'admin'

### 2. Environment Variables

Add these optional environment variables to your `.env.local`:

```env
# Optional: Custom admin user details
ADMIN_EMAIL=your-admin@example.com
ADMIN_DISPLAY_NAME=Your Name
```

If not set, the script will use default values:
- Email: `adamsibbe@gmail.com`
- Display Name: `System Administrator`

### 3. Access User Management

Once logged in as an admin:
1. Navigate to the dashboard
2. Click "Manage Users" in the sidebar (only visible to admins)
3. Use the interface to manage user accounts

## User Management Interface

### User List
- Displays all users in a table format
- Shows: Name, Email, Role, Department, Status, Created Date
- Actions: Activate/Deactivate, Edit, Delete

### Add New User
- Click "Add New User" button
- Fill in user details (email, name, role, department, phone)
- System automatically:
  - Creates Firebase Auth account with temporary password
  - Sends password reset email to the user
  - Creates Firestore user document

### Edit User
- Click the edit icon next to any user
- Modify user details
- Cannot change email address (Firebase Auth limitation)
- Can change role, department, contact info

### User Status Management
- Toggle user active/inactive status
- Inactive users cannot log in
- Status is visually indicated with badges

## Security Features

### Role-Based Access Control
- Admin users can access all features
- Manager users have limited access
- Regular users have basic access
- Navigation items are filtered based on user role

### Authentication Security
- Firebase Authentication handles password security
- Password reset emails for new users
- Session management with automatic logout
- Inactivity timeout (30 minutes)

### Data Security
- Firestore security rules protect user data
- Server-side validation for all user operations
- Audit trail with creation and update timestamps

## Database Schema

### Users Collection (`users`)
```typescript
interface User {
  id: string;                    // Firestore document ID
  email: string;                 // User email (unique)
  displayName?: string;          // User's display name
  role: 'admin' | 'manager' | 'user';
  isActive: boolean;             // Account status
  createdAt: Date | Timestamp;   // Account creation date
  updatedAt: Date | Timestamp;   // Last update date
  lastLoginAt?: Date | Timestamp; // Last login timestamp
  permissions?: string[];        // Custom permissions array
  department?: string;           // User's department
  phoneNumber?: string;          // Contact phone number
}
```

## API Actions

### User Management Actions (`src/actions/userActions.ts`)

- `getAllUsersAction()` - Fetch all users
- `getUserByIdAction(userId)` - Get user by ID
- `getUserByEmailAction(email)` - Get user by email
- `createUserAction(userData)` - Create new user
- `updateUserAction(userId, userData)` - Update user
- `deleteUserAction(userId)` - Delete user
- `toggleUserActiveStatusAction(userId)` - Toggle user status
- `updateUserLastLoginAction(userId)` - Update last login

## Integration with Auth Context

The user management system integrates with the application's authentication context:

- `AuthContext` now fetches user profile from Firestore
- Admin status is determined by user role in Firestore
- User profile data is available throughout the app
- Navigation automatically shows/hides admin features

## Troubleshooting

### Common Issues

1. **User can't log in**
   - Check if user account is active (`isActive: true`)
   - Verify user exists in both Firebase Auth and Firestore
   - Check if password reset email was received

2. **Admin features not visible**
   - Ensure user has `role: 'admin'` in Firestore
   - Check if user profile was fetched correctly
   - Verify AuthContext is working properly

3. **Password reset emails not received**
   - Check Firebase Auth email settings
   - Verify email address is correct
   - Check spam/junk folders

### Debugging

Enable debug logging in the browser console:
```javascript
// Check current user profile
console.log('User Profile:', userProfile);

// Check admin status
console.log('Is Admin:', isAdmin);

// Check all users
getAllUsersAction().then(users => console.log('All Users:', users));
```

## Future Enhancements

- [ ] User groups and team management
- [ ] Advanced permission system
- [ ] User activity logs and audit trails
- [ ] Bulk user operations
- [ ] User import/export functionality
- [ ] Two-factor authentication
- [ ] SSO integration
- [ ] User onboarding workflows 