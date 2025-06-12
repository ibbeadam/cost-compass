const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, where } = require('firebase/firestore');
const { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } = require('firebase/auth');
require('dotenv').config({ path: '.env.local' });

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function setupFirestoreRules() {
  console.log('🔧 Setting up Firestore security rules...');
  console.log('');
  console.log('You need to update your Firestore security rules in the Firebase Console.');
  console.log('');
  console.log('1. Go to Firebase Console: https://console.firebase.google.com/');
  console.log('2. Select your project');
  console.log('3. Go to Firestore Database > Rules');
  console.log('4. Replace the existing rules with the following:');
  console.log('');
  console.log('==========================================');
  console.log('rules_version = "2";');
  console.log('service cloud.firestore {');
  console.log('  match /databases/{database}/documents {');
  console.log('    // Allow users to read their own profile');
  console.log('    match /users/{userId} {');
  console.log('      allow read: if request.auth != null && (request.auth.uid == userId || request.auth.token.email == resource.data.email);');
  console.log('      allow write: if request.auth != null && request.auth.token.email == resource.data.email;');
  console.log('    }');
  console.log('    ');
  console.log('    // Allow admins to read all users');
  console.log('    match /users/{userId} {');
  console.log('      allow read, write: if request.auth != null && exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";');
  console.log('    }');
  console.log('    ');
  console.log('    // Allow authenticated users to create their own profile (for initial setup)');
  console.log('    match /users/{userId} {');
  console.log('      allow create: if request.auth != null && request.auth.uid == userId;');
  console.log('    }');
  console.log('    ');
  console.log('    // Allow access to other collections (adjust as needed)');
  console.log('    match /{document=**} {');
  console.log('      allow read, write: if request.auth != null;');
  console.log('    }');
  console.log('  }');
  console.log('}');
  console.log('==========================================');
  console.log('');
  console.log('5. Click "Publish" to save the rules');
  console.log('');
  console.log('⚠️  Note: These rules allow full access to authenticated users for development.');
  console.log('   For production, you should implement more restrictive rules.');
  console.log('');
}

async function createInitialAdminUser() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'adamsibbe@gmail.com';
    const adminDisplayName = process.env.ADMIN_DISPLAY_NAME || 'System Administrator';
    
    console.log('👤 Creating initial admin user...');
    console.log('Email:', adminEmail);
    
    // First, try to sign in to see if user exists
    try {
      // This will fail if user doesn't exist, which is what we want
      await signInWithEmailAndPassword(auth, adminEmail, 'temporary-password');
      console.log('✅ User already exists in Firebase Auth');
    } catch (signInError) {
      if (signInError.code === 'auth/user-not-found') {
        console.log('📝 Creating new Firebase Auth user...');
        
        // Create Firebase Auth user with temporary password
        const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        console.log('Temporary password:', tempPassword);
        
        const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, tempPassword);
        console.log('✅ Firebase Auth user created:', userCredential.user.uid);
        
        // Sign out to avoid conflicts
        await auth.signOut();
      } else {
        console.log('⚠️  User exists but password is different');
      }
    }
    
    // Now try to create the Firestore document
    console.log('📄 Creating Firestore user document...');
    
    // Sign in with the admin email (you'll need to set a password manually in Firebase Console)
    console.log('⚠️  IMPORTANT: You need to set a password for the admin user in Firebase Console:');
    console.log('   1. Go to Firebase Console > Authentication > Users');
    console.log('   2. Find the user with email:', adminEmail);
    console.log('   3. Click "Reset password" to set a new password');
    console.log('   4. Or use the password reset email if it was sent');
    console.log('');
    
    // For now, let's try to create the document without authentication
    // This will work if the rules allow it
    const userDoc = {
      email: adminEmail,
      displayName: adminDisplayName,
      role: 'admin',
      isActive: true,
      department: 'IT',
      phoneNumber: '',
      permissions: ['all'],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    try {
      const docRef = await addDoc(collection(db, 'users'), userDoc);
      console.log('✅ Firestore user document created:', docRef.id);
      console.log('');
      console.log('🎉 Admin user setup complete!');
      console.log('You can now log in with:', adminEmail);
    } catch (firestoreError) {
      console.log('❌ Firestore error:', firestoreError.message);
      console.log('');
      console.log('🔧 This is likely due to security rules. Please:');
      console.log('   1. Update your Firestore security rules (see above)');
      console.log('   2. Run this script again');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function main() {
  console.log('🚀 Cost Compass User Management Setup');
  console.log('=====================================');
  console.log('');
  
  await setupFirestoreRules();
  
  console.log('Press Enter to continue with user creation...');
  // In a real script, you might want to wait for user input
  // For now, we'll proceed automatically
  
  await createInitialAdminUser();
  
  console.log('');
  console.log('📚 Next steps:');
  console.log('   1. Update Firestore security rules in Firebase Console');
  console.log('   2. Set a password for the admin user in Firebase Console');
  console.log('   3. Test the login in your application');
  console.log('   4. Access the user management interface as an admin');
}

// Run the script
main().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
}); 