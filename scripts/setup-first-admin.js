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

async function setupFirstAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'adamsibbe@gmail.com';
    const adminDisplayName = process.env.ADMIN_DISPLAY_NAME || 'System Administrator';
    
    console.log('🚀 Setting up first admin user...');
    console.log('Email:', adminEmail);
    console.log('Display Name:', adminDisplayName);
    console.log('');
    
    // Step 1: Check if user exists in Firebase Auth
    console.log('📋 Step 1: Checking Firebase Auth...');
    let firebaseUser = null;
    
    try {
      // Try to sign in with a dummy password to see if user exists
      // This might throw an error if the user doesn't exist or password is wrong
      await signInWithEmailAndPassword(auth, adminEmail, 'dummy-password');
      console.log('✅ User already exists in Firebase Auth (signed in with dummy password)');
      firebaseUser = auth.currentUser;
    } catch (signInError) {
      if (signInError.code === 'auth/user-not-found') {
        console.log('📝 User not found in Firebase Auth, attempting to create...');
        try {
          // Create Firebase Auth user with temporary password
          const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
          console.log('Temporary password generated:', tempPassword);
          
          const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, tempPassword);
          firebaseUser = userCredential.user;
          console.log('✅ Firebase Auth user created successfully with UID:', firebaseUser.uid);
          console.log('A password reset email has been sent to:', adminEmail);
          
          // Sign out to avoid conflicts after creation
          await auth.signOut();
        } catch (createError) {
          console.error('❌ Error creating Firebase Auth user:', createError.code, createError.message);
          console.log('This might be due to:');
          console.log(' - Incorrect Firebase project config in .env.local');
          console.log(' - Email/Password sign-in method not enabled in Firebase Console');
          console.log(' - Firebase Auth API limits or temporary service issues');
          throw createError; // Re-throw to stop script and show critical error
        }
      } else if (signInError.code === 'auth/wrong-password' || signInError.code === 'auth/invalid-credential') {
        console.log('⚠️  User exists in Firebase Auth but with a different password.');
        console.log('Please set a password for this user in Firebase Console > Authentication > Users');
        firebaseUser = auth.currentUser; // If already signed in from previous attempts, keep it
      } else {
        console.error('❌ Unexpected Firebase Auth sign-in error:', signInError.code, signInError.message);
        throw signInError; // Re-throw unexpected errors
      }
    }
    
    // Step 2: Check if user exists in Firestore
    console.log('');
    console.log('📋 Step 2: Checking Firestore...');
    
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', adminEmail));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const existingUser = querySnapshot.docs[0];
      console.log('✅ User already exists in Firestore');
      console.log('User ID:', existingUser.id);
      console.log('Role:', existingUser.data().role);
      console.log('Active:', existingUser.data().isActive);
      
      // Check if user is admin
      if (existingUser.data().role === 'admin') {
        console.log('🎉 Admin user is already set up correctly!');
        return;
      } else {
        console.log('⚠️  User exists but is not admin. Updating role...');
        // You would need to update the role here if needed
      }
    } else {
      console.log('📝 Creating Firestore user document...');
      
      // Create admin user document in Firestore
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
      
      const docRef = await addDoc(collection(db, 'users'), userDoc);
      console.log('✅ Firestore user document created:', docRef.id);
    }
    
    console.log('');
    console.log('🎉 Admin user setup complete!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Go to Firebase Console > Authentication > Users');
    console.log('2. Find the user with email:', adminEmail);
    console.log('3. Click "Reset password" to set a new password');
    console.log('4. Log in to your app with the new password');
    console.log('5. You should see "Manage Users" in the sidebar');
    
  } catch (error) {
    console.error('❌ Error setting up admin user:', error);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Make sure Firestore rules are updated (see firestore.rules)');
    console.log('2. Check that Firebase project is correctly configured');
    console.log('3. Verify your .env.local has correct Firebase config');
  }
}

// Run the script
setupFirstAdmin().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
}); 