# Quick Setup Guide for User Management

## The Issue
You're getting "Missing or insufficient permissions" because Firestore security rules are blocking access to the `users` collection.

## Quick Fix (Development)

### Step 1: Update Firestore Security Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Firestore Database** → **Rules**
4. Replace the existing rules with this simple version for development:

```javascript
rules_version = "2";
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow all authenticated users to read/write all documents
    // This is less secure but easier for development
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

5. Click **"Publish"**

### Step 2: Create Admin User

Now run the setup script:

```bash
node scripts/setup-firestore-rules.js
```

### Step 3: Set Admin Password

1. Go to **Firebase Console** → **Authentication** → **Users**
2. Find your admin user (default: `adamsibbe@gmail.com`)
3. Click **"Reset password"** to set a new password
4. Check your email for the password reset link

### Step 4: Test the System

1. Log in to your app with the admin email and new password
2. You should see "Manage Users" in the sidebar
3. Access the user management interface

## Production Security (Later)

When you're ready for production, use the more secure rules from `firestore.rules`:

1. Go to **Firestore Database** → **Rules**
2. Replace with the production rules (uncomment the secure rules in `firestore.rules`)
3. Test thoroughly before deploying

## Alternative: Manual User Creation

If the script still fails, you can create the admin user manually:

### Option A: Firebase Console
1. Go to **Authentication** → **Users** → **Add User**
2. Enter email: `adamsibbe@gmail.com`
3. Set a password
4. Go to **Firestore Database** → **Start collection**
5. Collection ID: `users`
6. Document ID: (auto-generated)
7. Add these fields:
   - `email`: `adamsibbe@gmail.com`
   - `displayName`: `System Administrator`
   - `role`: `admin`
   - `isActive`: `true`
   - `department`: `IT`
   - `permissions`: `["all"]`
   - `createdAt`: (current timestamp)
   - `updatedAt`: (current timestamp)

### Option B: Use the App
1. Update Firestore rules first (Step 1 above)
2. Log in to your app
3. Go to **Manage Users** (if visible)
4. Create the admin user through the interface

## Troubleshooting

### Still getting permission errors?
- Make sure you're signed in to Firebase Console with the correct account
- Check that your Firebase project is correctly configured
- Verify your `.env.local` has the correct Firebase config

### Admin features not showing?
- Check that the user document has `role: "admin"`
- Verify the user is active (`isActive: true`)
- Check browser console for any errors

### Can't log in?
- Make sure the user exists in both Firebase Auth and Firestore
- Check that the password was set correctly
- Verify the user is active in Firestore

## Next Steps

Once the admin user is working:
1. Log in as admin
2. Go to **Manage Users**
3. Create additional users for your team
4. Test different roles and permissions
5. Set up proper security rules for production 