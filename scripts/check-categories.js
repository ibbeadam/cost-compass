const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
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

async function checkCategories() {
  try {
    console.log("🔍 Checking existing categories in Firestore...");
    
    const categoriesSnapshot = await getDocs(collection(db, "categories"));
    
    if (categoriesSnapshot.empty) {
      console.log("❌ No categories found in the collection.");
      return;
    }
    
    console.log(`\n📊 Found ${categoriesSnapshot.size} categories:`);
    console.log("=" .repeat(60));
    
    let foodCount = 0;
    let beverageCount = 0;
    let noTypeCount = 0;
    
    categoriesSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`\n📄 Document ID: ${doc.id}`);
      console.log(`   Name: ${data.name || 'MISSING'}`);
      console.log(`   Type: ${data.type || 'MISSING'}`);
      console.log(`   Description: ${data.description || 'MISSING'}`);
      console.log(`   Created: ${data.createdAt ? 'Yes' : 'No'}`);
      console.log(`   Updated: ${data.updatedAt ? 'Yes' : 'No'}`);
      
      if (data.type === 'Food') {
        foodCount++;
      } else if (data.type === 'Beverage') {
        beverageCount++;
      } else {
        noTypeCount++;
      }
    });
    
    console.log("\n" + "=" .repeat(60));
    console.log("📈 SUMMARY:");
    console.log(`   Food categories: ${foodCount}`);
    console.log(`   Beverage categories: ${beverageCount}`);
    console.log(`   Categories without type: ${noTypeCount}`);
    console.log(`   Total: ${categoriesSnapshot.size}`);
    
    if (noTypeCount > 0) {
      console.log("\n⚠️  ISSUE DETECTED:");
      console.log("   Some categories are missing the 'type' field.");
      console.log("   The dashboard expects categories to have type: 'Food' or 'Beverage'.");
      console.log("\n💡 SOLUTION:");
      console.log("   You need to update your existing categories to include the 'type' field.");
      console.log("   Run: node scripts/fix-categories.js");
    } else if (foodCount === 0) {
      console.log("\n⚠️  ISSUE DETECTED:");
      console.log("   No food categories found. The dashboard needs categories with type: 'Food'.");
    } else {
      console.log("\n✅ Categories look good!");
    }
    
  } catch (error) {
    console.error("❌ Error checking categories:", error);
  }
}

// Run the check
if (require.main === module) {
  checkCategories()
    .then(() => {
      console.log("\n✅ Category check completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Category check failed:", error);
      process.exit(1);
    });
}

module.exports = { checkCategories }; 