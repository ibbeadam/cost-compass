# Firebase to MySQL Migration Guide

This guide will help you migrate your Cost Compass application from Firebase Firestore to MySQL with NextAuth.js.

## Prerequisites

1. MySQL database server running
2. Node.js and npm installed
3. Firebase project access (for data export)

## Step 1: Environment Setup

1. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your MySQL connection string:
   ```
   DATABASE_URL="mysql://username:password@localhost:3306/cost_compass"
   NEXTAUTH_SECRET="your-secret-key-here"
   NEXTAUTH_URL="http://localhost:3000"
   ```

## Step 2: Database Setup

1. Create the MySQL database:
   ```sql
   CREATE DATABASE cost_compass;
   ```

2. Run Prisma migrations to create the database schema:
   ```bash
   npx prisma migrate dev --name init
   ```

3. Generate the Prisma client:
   ```bash
   npx prisma generate
   ```

## Step 3: Data Migration

1. Download your Firebase service account key from the Firebase console
2. Either:
   - Set the `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable with the JSON content
   - Or place the key file in the `scripts/` directory as `firebase-service-account.json` (make sure it's in .gitignore)
3. Update the Firebase project URL in `scripts/migrate-firebase-to-mysql.js`
4. Run the migration script:
   ```bash
   node scripts/migrate-firebase-to-mysql.js
   ```

## Step 4: Update Components

The migration includes new action files that use Prisma instead of Firestore:

- `src/actions/prismaUserActions.ts` - User management
- `src/actions/prismaOutletActions.ts` - Outlet management  
- `src/actions/prismaCategoryActions.ts` - Category management

### Updating Components

1. **User Management**: Replace imports from `@/actions/userActions` with `@/actions/prismaUserActions`
2. **Outlet Management**: Replace imports from `@/actions/outletActions` with `@/actions/prismaOutletActions`
3. **Category Management**: Replace imports from `@/actions/categoryActions` with `@/actions/prismaCategoryActions`

### Authentication Updates

1. Replace `useAuth()` with `useNextAuth()` in components
2. Update login/logout logic to use NextAuth.js
3. Update session management

## Step 5: Testing

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Test the following functionalities:
   - User login/logout
   - User management (CRUD operations)
   - Outlet management
   - Category management
   - Data persistence

## Step 6: Additional Considerations

### Password Management
- The current setup uses credentials provider without password hashing
- For production, implement proper password hashing with bcrypt
- Consider adding password reset functionality

### Session Management
- NextAuth.js uses JWT tokens by default
- Sessions are handled automatically
- Configure session timeout as needed

### Database Relationships
- All foreign key relationships are preserved
- Cascade deletes are configured where appropriate
- Indexes are created for performance

## Rollback Plan

If you need to rollback to Firebase:

1. Revert the layout changes in `src/app/layout.tsx`
2. Remove NextAuth provider imports
3. Continue using original Firebase actions
4. Update environment variables

## Performance Considerations

- MySQL connections are pooled automatically by Prisma
- Consider adding database indexes for frequently queried fields
- Monitor query performance and optimize as needed

## Security Notes

- Ensure DATABASE_URL is not exposed in client-side code
- Use environment variables for all sensitive configuration
- Implement proper input validation and sanitization
- Consider implementing rate limiting for authentication

## Support

If you encounter issues during migration:

1. Check the Prisma logs for database connection issues
2. Verify your environment variables are correctly set
3. Ensure the MySQL server is running and accessible
4. Check the migration script logs for data import issues

## Next Steps

After successful migration:

1. Implement additional Prisma actions for remaining data models
2. Add proper error handling and validation
3. Implement audit logging
4. Set up database backups
5. Configure production database with proper security measures