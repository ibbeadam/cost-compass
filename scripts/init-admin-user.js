const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');
const { createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail } = require('firebase/auth');
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

async function createAdminUser() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'adamsibbe@gmail.com';
    const adminDisplayName = process.env.ADMIN_DISPLAY_NAME || 'System Administrator';
    
    console.log('Creating admin user...');
    console.log('Email:', adminEmail);
    console.log('Display Name:', adminDisplayName);
    
    // Create Firebase Auth user with temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    console.log('Temporary password:', tempPassword);
    
    const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, tempPassword);
    console.log('Firebase Auth user created:', userCredential.user.uid);
    
    // Create user document in Firestore
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
    console.log('Firestore user document created:', docRef.id);
    
    // Send password reset email
    await sendPasswordResetEmail(auth, adminEmail);
    console.log('Password reset email sent to:', adminEmail);
    
    console.log('\n✅ Admin user created successfully!');
    console.log('The user will receive a password reset email to set their password.');
    console.log('You can now log in with the email:', adminEmail);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      console.log('User already exists in Firebase Auth. Checking Firestore...');
      
      // Check if user exists in Firestore
      const { getDocs, query, where } = require('firebase/firestore');
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', process.env.ADMIN_EMAIL || 'adamsibbe@gmail.com'));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        console.log('✅ User already exists in both Firebase Auth and Firestore');
      } else {
        console.log('⚠️  User exists in Firebase Auth but not in Firestore. Creating Firestore document...');
        
        const userDoc = {
          email: process.env.ADMIN_EMAIL || 'adamsibbe@gmail.com',
          displayName: process.env.ADMIN_DISPLAY_NAME || 'System Administrator',
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
    }
  }
}

// Run the script
createAdminUser().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
}); 