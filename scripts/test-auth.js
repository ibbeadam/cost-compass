const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');
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

async function testCollections() {
  console.log("🧪 Testing Firestore collection access...");
  
  const collections = [
    'categories',
    'outlets', 
    'dailyFinancialSummaries',
    'foodCostEntries',
    'beverageCostEntries'
  ];
  
  for (const collectionName of collections) {
    try {
      console.log(`\n📊 Testing ${collectionName}...`);
      const snapshot = await getDocs(collection(db, collectionName));
      console.log(`✅ ${collectionName}: ${snapshot.size} documents found`);
      
      // For categories, also test the specific query that's failing
      if (collectionName === 'categories') {
        try {
          const foodQuery = query(collection(db, collectionName), where("type", "==", "Food"));
          const foodSnapshot = await getDocs(foodQuery);
          console.log(`✅ Food categories query: ${foodSnapshot.size} documents found`);
        } catch (error) {
          console.log(`❌ Food categories query failed: ${error.message}`);
        }
      }
      
    } catch (error) {
      console.log(`❌ ${collectionName}: ${error.message}`);
    }
  }
}

// Run the test
if (require.main === module) {
  testCollections()
    .then(() => {
      console.log("\n✅ Collection access test completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Collection access test failed:", error);
      process.exit(1);
    });
}

module.exports = { testCollections }; 