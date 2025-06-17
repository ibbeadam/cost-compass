const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, where } = require('firebase/firestore');
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

const foodCategories = [
  { name: "Meat & Poultry", description: "Beef, chicken, pork, lamb, etc.", type: "Food" },
  { name: "Seafood", description: "Fish, shrimp, shellfish, etc.", type: "Food" },
  { name: "Vegetables", description: "Fresh and frozen vegetables", type: "Food" },
  { name: "Fruits", description: "Fresh and frozen fruits", type: "Food" },
  { name: "Dairy & Eggs", description: "Milk, cheese, eggs, yogurt, etc.", type: "Food" },
  { name: "Grains & Bread", description: "Rice, pasta, bread, flour, etc.", type: "Food" },
  { name: "Herbs & Spices", description: "Fresh herbs, dried spices, seasonings", type: "Food" },
  { name: "Oils & Fats", description: "Cooking oils, butter, margarine", type: "Food" },
  { name: "Canned Goods", description: "Canned vegetables, fruits, beans", type: "Food" },
  { name: "Frozen Foods", description: "Frozen meals, vegetables, meats", type: "Food" },
  { name: "Condiments", description: "Sauces, dressings, spreads", type: "Food" },
  { name: "Bakery", description: "Pastries, cakes, desserts", type: "Food" }
];

const beverageCategories = [
  { name: "Soft Drinks", description: "Cola, lemonade, fruit juices", type: "Beverage" },
  { name: "Coffee & Tea", description: "Coffee beans, tea leaves, instant coffee", type: "Beverage" },
  { name: "Alcoholic Beverages", description: "Beer, wine, spirits", type: "Beverage" },
  { name: "Dairy Drinks", description: "Milk, milkshakes, smoothies", type: "Beverage" },
  { name: "Energy Drinks", description: "Sports drinks, energy beverages", type: "Beverage" },
  { name: "Water", description: "Bottled water, sparkling water", type: "Beverage" },
  { name: "Syrups & Mixers", description: "Cocktail mixers, flavored syrups", type: "Beverage" }
];

async function checkExistingCategories() {
  try {
    console.log("🔍 Checking for existing categories...");
    const categoriesSnapshot = await getDocs(collection(db, "categories"));
    
    if (!categoriesSnapshot.empty) {
      console.log(`⚠️ Found ${categoriesSnapshot.size} existing categories.`);
      console.log("Categories will not be created if they already exist.");
      return categoriesSnapshot.size;
    } else {
      console.log("✅ No existing categories found. Proceeding with initialization...");
      return 0;
    }
  } catch (error) {
    console.error("❌ Error checking existing categories:", error);
    throw error;
  }
}

async function createCategories() {
  try {
    console.log("🚀 Starting category initialization...");
    
    const existingCount = await checkExistingCategories();
    
    let createdCount = 0;
    
    // Create food categories
    console.log("\n🍽️ Creating food categories...");
    for (const category of foodCategories) {
      try {
        // Check if category already exists
        const existingQuery = query(
          collection(db, "categories"),
          where("name", "==", category.name),
          where("type", "==", category.type)
        );
        const existingSnapshot = await getDocs(existingQuery);
        
        if (existingSnapshot.empty) {
          await addDoc(collection(db, "categories"), {
            ...category,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          console.log(`✅ Created: ${category.name}`);
          createdCount++;
        } else {
          console.log(`⏭️ Skipped (exists): ${category.name}`);
        }
      } catch (error) {
        console.error(`❌ Failed to create ${category.name}:`, error.message);
      }
    }
    
    // Create beverage categories
    console.log("\n🥤 Creating beverage categories...");
    for (const category of beverageCategories) {
      try {
        // Check if category already exists
        const existingQuery = query(
          collection(db, "categories"),
          where("name", "==", category.name),
          where("type", "==", category.type)
        );
        const existingSnapshot = await getDocs(existingQuery);
        
        if (existingSnapshot.empty) {
          await addDoc(collection(db, "categories"), {
            ...category,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          console.log(`✅ Created: ${category.name}`);
          createdCount++;
        } else {
          console.log(`⏭️ Skipped (exists): ${category.name}`);
        }
      } catch (error) {
        console.error(`❌ Failed to create ${category.name}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Category initialization complete!`);
    console.log(`📊 Created ${createdCount} new categories`);
    console.log(`📊 Total categories in database: ${existingCount + createdCount}`);
    
    return { created: createdCount, total: existingCount + createdCount };
    
  } catch (error) {
    console.error("❌ Error during category initialization:", error);
    throw error;
  }
}

// Run the initialization
if (require.main === module) {
  createCategories()
    .then((result) => {
      console.log("\n✅ Category initialization completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Category initialization failed:", error);
      process.exit(1);
    });
}

module.exports = { createCategories }; 