const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
require('dotenv').config({ path: '.env.local' });

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function verifyUserSetup() {
  try {
    console.log("🔍 Verifying Firebase Auth and Firestore user setup...");
    
    // Check if we have auth credentials in environment
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    
    if (!email || !password) {
      console.log("⚠️  ADMIN_EMAIL or ADMIN_PASSWORD not found in .env.local");
      console.log("   Please add these to your .env.local file:");
      console.log("   ADMIN_EMAIL=your-admin-email@example.com");
      console.log("   ADMIN_PASSWORD=your-admin-password");
      return;
    }
    
    console.log(`📧 Attempting to sign in with: ${email}`);
    
    // Sign in to Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log(`✅ Successfully signed in!`);
    console.log(`   Auth UID: ${user.uid}`);
    console.log(`   Email: ${user.email}`);
    
    // Check if Firestore user document exists
    console.log("\n🔍 Checking Firestore user document...");
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      console.log(`✅ Firestore user document found!`);
      console.log(`   Document ID: ${userDocSnap.id}`);
      console.log(`   Role: ${userData.role || 'MISSING'}`);
      console.log(`   Is Active: ${userData.isActive || 'MISSING'}`);
      console.log(`   Email: ${userData.email || 'MISSING'}`);
      console.log(`   Name: ${userData.name || 'MISSING'}`);
      
      // Check if user has admin role
      if (userData.role === 'admin' && userData.isActive === true) {
        console.log("\n🎉 User setup is correct! You should have full access.");
        
        // Test reading categories collection
        console.log("\n🧪 Testing categories collection access...");
        try {
          const { collection, getDocs, query, where } = require('firebase/firestore');
          const categoriesSnapshot = await getDocs(query(collection(db, "categories"), where("type", "==", "Food")));
          console.log(`✅ Successfully accessed categories collection!`);
          console.log(`   Found ${categoriesSnapshot.size} food categories`);
        } catch (error) {
          console.log(`❌ Failed to access categories: ${error.message}`);
        }
        
      } else {
        console.log("\n⚠️  ISSUE: User document exists but role/status is incorrect");
        console.log(`   Expected: role = "admin", isActive = true`);
        console.log(`   Found: role = "${userData.role}", isActive = ${userData.isActive}`);
        console.log("\n💡 SOLUTION: Update the Firestore user document");
      }
      
    } else {
      console.log(`❌ Firestore user document NOT found!`);
      console.log(`   Expected document ID: ${user.uid}`);
      console.log("\n💡 SOLUTION: Create a Firestore document in the 'users' collection");
      console.log("   with the following data:");
      console.log("   {");
      console.log(`     role: "admin",`);
      console.log(`     isActive: true,`);
      console.log(`     email: "${user.email}",`);
      console.log(`     name: "Admin User",`);
      console.log(`     createdAt: serverTimestamp(),`);
      console.log(`     updatedAt: serverTimestamp()`);
      console.log("   }");
    }
    
  } catch (error) {
    console.error("❌ Error during verification:", error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.log("\n💡 SOLUTION: Create the user in Firebase Authentication first");
    } else if (error.code === 'auth/wrong-password') {
      console.log("\n💡 SOLUTION: Check the ADMIN_PASSWORD in your .env.local file");
    } else if (error.code === 'permission-denied') {
      console.log("\n💡 SOLUTION: Check Firestore security rules");
    }
  }
}

// Run the verification
if (require.main === module) {
  verifyUserSetup()
    .then(() => {
      console.log("\n✅ User setup verification completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ User setup verification failed:", error);
      process.exit(1);
    });
}

module.exports = { verifyUserSetup }; 