# Complete Setup Guide: Firebase Authentication + User Management

## 🎯 **Overview**

This guide will help you set up a complete authentication and user management system for your Next.js app with Firebase. The system includes:

- ✅ Firebase Authentication (Email/Password)
- ✅ Firestore User Management with Roles
- ✅ Role-Based Access Control
- ✅ Automatic User Profile Creation
- ✅ Admin User Management Interface

## 📋 **Step-by-Step Setup**

### **Step 1: Update Firestore Security Rules**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Firestore Database** → **Rules**
4. **Replace** the existing rules with the content from `firestore.rules`
5. Click **"Publish"**

### **Step 2: Set Up First Admin User**

Run the setup script:

```bash
node scripts/setup-first-admin.js
```

This script will:
- Create the admin user in Firebase Auth (if not exists)
- Create the admin user document in Firestore
- Set the user role as 'admin'

### **Step 3: Set Admin Password**

1. Go to **Firebase Console** → **Authentication** → **Users**
2. Find your admin user (default: `adamsibbe@gmail.com`)
3. Click **"Reset password"** to set a new password
4. Check your email for the password reset link

### **Step 4: Test the System**

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Log in to your app** with the admin email and password

3. **Verify admin access:**
   - You should see "Manage Users" in the sidebar
   - Navigate to the user management interface
   - Create additional users with different roles

## 🔧 **How the System Works**

### **Authentication Flow**

1. **User logs in** → Firebase Auth authenticates
2. **AuthContext checks** → Looks for user profile in Firestore
3. **If profile exists** → Loads user data and role
4. **If profile doesn't exist** → Creates default user profile with 'user' role
5. **Role-based access** → Navigation and features filtered by role

### **User Roles**

- **Admin**: Full access to all features including user management
- **Manager**: Access to reports and operational data
- **User**: Basic access to input data and view reports

### **Security Rules Logic**

The Firestore rules use helper functions:

- `isAdmin()`: Checks if user has admin role
- `isUserActive()`: Checks if user account is active
- `isManagerOrAdmin()`: Checks if user is manager or admin

## 🚨 **Important Security Notes**

### **Development vs Production**

**For Development:**
- Rules allow authenticated users to access most data
- Automatic user profile creation enabled
- Less restrictive for easier development

**For Production:**
- More restrictive rules
- Manual user creation by admins only
- Stricter role-based access control

### **User Profile Creation**

- **New users** automatically get a default profile with 'user' role
- **Admins** can change user roles through the management interface
- **Inactive users** cannot access the system

## 🐛 **Troubleshooting**

### **Common Issues**

1. **"Failed to fetch user by email"**
   - Check Firestore rules are published
   - Verify user exists in both Firebase Auth and Firestore
   - Check browser console for specific errors

2. **Admin features not showing**
   - Verify user has `role: "admin"` in Firestore
   - Check user is active (`isActive: true`)
   - Restart development server

3. **Can't create users**
   - Ensure you're logged in as admin
   - Check Firestore rules allow admin operations
   - Verify Firebase Auth is properly configured

4. **Permission denied errors**
   - Update Firestore rules in Firebase Console
   - Check user authentication status
   - Verify user profile exists in Firestore

### **Debug Steps**

1. **Check browser console** for specific error messages
2. **Verify Firebase config** in `.env.local`
3. **Test Firestore rules** in Firebase Console
4. **Check user documents** in Firestore Database

## 📚 **API Reference**

### **User Management Actions**

```typescript
// Get all users
getAllUsersAction(): Promise<User[]>

// Get user by email
getUserByEmailAction(email: string): Promise<User | null>

// Create new user
createUserAction(userData: CreateUserData): Promise<User>

// Update user
updateUserAction(userId: string, userData: UpdateUserData): Promise<User>

// Delete user
deleteUserAction(userId: string): Promise<void>

// Toggle user active status
toggleUserActiveStatusAction(userId: string): Promise<User>
```

### **Auth Context**

```typescript
const { user, loading, isAdmin, userProfile, signOut } = useAuth();
```

## 🔄 **Migration from Development to Production**

1. **Update Firestore rules** to production version
2. **Disable automatic user creation** in AuthContext
3. **Set up proper user onboarding** workflow
4. **Test all role-based access** thoroughly
5. **Deploy with secure configuration**

## 📞 **Support**

If you encounter issues:

1. Check the troubleshooting section above
2. Review browser console for error messages
3. Verify Firebase project configuration
4. Test with the development rules first

## 🎉 **Success Indicators**

You'll know the system is working when:

- ✅ Admin user can log in successfully
- ✅ "Manage Users" appears in sidebar for admin
- ✅ User management interface loads without errors
- ✅ New users can be created through the interface
- ✅ Role-based access control works properly
- ✅ All existing modules work with authentication 