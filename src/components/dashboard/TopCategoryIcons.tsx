// Comprehensive dynamic mapping of category names to emojis or icons
// Based on actual database categories from init-categories.js and populate-initial-data.js
const CATEGORY_ICON_MAP: Record<string, string> = {
  // === FOOD CATEGORIES ===
  // Meat & Protein
  "Meat & Poultry": "🍗",
  "Meat and Poultry": "🍗", // Alternative naming
  "Chicken": "🍗",
  "Beef": "🥩",
  "Pork": "🥓",
  "Lamb": "🐑",
  "Turkey": "🦃",
  "Poultry": "🍗",
  
  // Seafood
  "Seafood": "🦐",
  "Fish": "🐟",
  "Shrimp": "🦐",
  "Shellfish": "🦀",
  "Salmon": "🐟",
  "Crab": "🦀",
  "Lobster": "🦞",
  
  // Vegetables & Produce
  "Vegetables": "🥦",
  "Fresh Vegetables": "🥦",
  "Frozen Vegetables": "🧊",
  "Leafy Greens": "🥬",
  "Root Vegetables": "🥕",
  "Tomatoes": "🍅",
  "Onions": "🧅",
  "Peppers": "🌶️",
  "Carrots": "🥕",
  "Broccoli": "🥦",
  
  // Fruits
  "Fruits": "🍎",
  "Fresh Fruits": "🍎",
  "Frozen Fruits": "🧊",
  "Apples": "🍎",
  "Bananas": "🍌",
  "Oranges": "🍊",
  "Berries": "🫐",
  "Citrus": "🍊",
  
  // Dairy & Eggs
  "Dairy & Eggs": "🧀",
  "Dairy and Eggs": "🧀", // Alternative naming
  "Dairy Products": "🧀",
  "Milk": "🥛",
  "Cheese": "🧀",
  "Eggs": "🥚",
  "Yogurt": "🍪", // Close approximation
  "Butter": "🧈",
  "Cream": "🥛",
  
  // Grains & Bread
  "Grains & Bread": "🍞",
  "Grains and Bread": "🍞", // Alternative naming
  "Bread": "🍞",
  "Rice": "🍚",
  "Pasta": "🍝",
  "Flour": "🌾",
  "Cereals": "🥣",
  "Noodles": "🍜",
  
  // Herbs & Spices
  "Herbs & Spices": "🌿",
  "Herbs and Spices": "🌿", // Alternative naming
  "Spices": "🌶️",
  "Herbs": "🌿",
  "Seasonings": "🧂",
  "Salt": "🧂",
  "Pepper": "⚫",
  
  // Oils & Fats
  "Oils & Fats": "🫒",
  "Oils and Fats": "🫒", // Alternative naming
  "Cooking Oil": "🫒",
  "Olive Oil": "🫒",
  "Vegetable Oil": "🫒",
  "Margarine": "🧈",
  
  // Packaged Foods
  "Canned Goods": "🥫",
  "Frozen Foods": "🧊",
  "Condiments": "🍯",
  "Sauces": "🍯",
  "Dressings": "🥗",
  "Spreads": "🍯",
  
  // Bakery & Desserts
  "Bakery": "🥖",
  "Pastries": "🥐",
  "Cakes": "🎂",
  "Desserts": "🍰",
  "Cookies": "🍪",
  "Muffins": "🧁",
  
  // === BEVERAGE CATEGORIES ===
  // Non-Alcoholic
  "Soft Drinks": "🥤",
  "Soda": "🥤",
  "Cola": "🥤",
  "Juice": "🧃",
  "Fruit Juices": "🧃",
  "Lemonade": "🍋",
  
  // Coffee & Tea
  "Coffee & Tea": "☕",
  "Coffee and Tea": "☕", // Alternative naming
  "Coffee": "☕",
  "Tea": "🍵",
  "Espresso": "☕",
  "Green Tea": "🍵",
  "Black Tea": "🍵",
  "Instant Coffee": "☕",
  
  // Alcoholic Beverages
  "Alcoholic Beverages": "🍺",
  "Alcohol": "🍺",
  "Beer": "🍺",
  "Wine": "🍷",
  "Red Wine": "🍷",
  "White Wine": "🍷",
  "Champagne": "🍾",
  "Spirits": "🥃",
  "Whiskey": "🥃",
  "Vodka": "🍸",
  "Rum": "🥃",
  "Cocktails": "🍸",
  
  // Specialty Drinks
  "Dairy Drinks": "🥛",
  "Milkshakes": "🥤",
  "Smoothies": "🥤",
  "Energy Drinks": "⚡",
  "Sports Drinks": "🥤",
  
  // Water & Mixers
  "Water": "💧",
  "Bottled Water": "💧",
  "Sparkling Water": "💧",
  "Syrups & Mixers": "🍯",
  "Syrups and Mixers": "🍯", // Alternative naming
  "Cocktail Mixers": "🍸",
  "Flavored Syrups": "🍯",
  
  // === FALLBACK PATTERNS ===
  // Common patterns for dynamic matching
  "Organic": "🌱",
  "Fresh": "✨",
  "Frozen": "🧊",
  "Canned": "🥫",
  "Dried": "🌾",
  "Local": "🏠",
  "Premium": "⭐",
};

// Enhanced intelligent matching patterns for dynamic icon selection
const KEYWORD_PATTERNS: Array<{ keywords: string[]; icon: string; priority: number }> = [
  // High priority exact matches
  { keywords: ["meat", "poultry", "chicken", "beef", "pork"], icon: "🍗", priority: 10 },
  { keywords: ["seafood", "fish", "shrimp", "crab", "lobster"], icon: "🦐", priority: 10 },
  { keywords: ["dairy", "milk", "cheese", "eggs"], icon: "🧀", priority: 10 },
  { keywords: ["vegetables", "veggie"], icon: "🥦", priority: 10 },
  { keywords: ["fruits", "fruit"], icon: "🍎", priority: 10 },
  { keywords: ["bread", "grain", "rice", "pasta"], icon: "🍞", priority: 10 },
  { keywords: ["coffee"], icon: "☕", priority: 10 },
  { keywords: ["tea"], icon: "🍵", priority: 10 },
  { keywords: ["beer"], icon: "🍺", priority: 10 },
  { keywords: ["wine"], icon: "🍷", priority: 10 },
  { keywords: ["water"], icon: "💧", priority: 10 },
  
  // Medium priority partial matches
  { keywords: ["soft", "soda", "cola", "drink"], icon: "🥤", priority: 8 },
  { keywords: ["alcohol", "spirit", "cocktail"], icon: "🍸", priority: 8 },
  { keywords: ["bakery", "cake", "dessert", "pastry"], icon: "🥖", priority: 8 },
  { keywords: ["oil", "fat", "butter"], icon: "🫒", priority: 8 },
  { keywords: ["herb", "spice", "seasoning"], icon: "🌿", priority: 8 },
  { keywords: ["sauce", "condiment", "dressing"], icon: "🍯", priority: 8 },
  { keywords: ["can", "canned"], icon: "🥫", priority: 7 },
  { keywords: ["frozen"], icon: "🧊", priority: 7 },
  
  // Lower priority general matches
  { keywords: ["fresh"], icon: "✨", priority: 5 },
  { keywords: ["organic"], icon: "🌱", priority: 5 },
  { keywords: ["premium"], icon: "⭐", priority: 5 },
  { keywords: ["local"], icon: "🏠", priority: 5 },
];

/**
 * Enhanced dynamic category icon selector with intelligent pattern matching
 * @param categoryName - The category name to find an icon for
 * @param fallback - Fallback icon if no match is found
 * @returns The appropriate emoji icon for the category
 */
export function getCategoryIcon(categoryName: string, fallback: string = "🍽️"): string {
  if (!categoryName || typeof categoryName !== 'string') {
    return fallback;
  }

  // Step 1: Try exact match (case-sensitive)
  if (CATEGORY_ICON_MAP[categoryName]) {
    return CATEGORY_ICON_MAP[categoryName];
  }

  // Step 2: Try exact match (case-insensitive)
  const exactMatch = Object.keys(CATEGORY_ICON_MAP).find(
    (key) => key.toLowerCase() === categoryName.toLowerCase()
  );
  if (exactMatch) {
    return CATEGORY_ICON_MAP[exactMatch];
  }

  // Step 3: Try partial match from static mapping
  const partialMatch = Object.keys(CATEGORY_ICON_MAP).find((key) =>
    categoryName.toLowerCase().includes(key.toLowerCase()) ||
    key.toLowerCase().includes(categoryName.toLowerCase())
  );
  if (partialMatch) {
    return CATEGORY_ICON_MAP[partialMatch];
  }

  // Step 4: Try intelligent keyword pattern matching
  const normalizedName = categoryName.toLowerCase().trim();
  
  // Find the best matching pattern based on keywords and priority
  let bestMatch = { icon: fallback, priority: 0 };
  
  for (const pattern of KEYWORD_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (normalizedName.includes(keyword.toLowerCase())) {
        if (pattern.priority > bestMatch.priority) {
          bestMatch = { icon: pattern.icon, priority: pattern.priority };
        }
      }
    }
  }
  
  if (bestMatch.priority > 0) {
    return bestMatch.icon;
  }

  // Step 5: Try smart word boundary matching for compound names
  const words = normalizedName.split(/[\s&\-_,]+/);
  for (const word of words) {
    if (word.length > 2) { // Only consider meaningful words
      for (const pattern of KEYWORD_PATTERNS) {
        for (const keyword of pattern.keywords) {
          if (word === keyword.toLowerCase() || keyword.toLowerCase().includes(word)) {
            if (pattern.priority > bestMatch.priority) {
              bestMatch = { icon: pattern.icon, priority: pattern.priority };
            }
          }
        }
      }
    }
  }
  
  if (bestMatch.priority > 0) {
    return bestMatch.icon;
  }

  // Step 6: Return appropriate fallback based on context
  return fallback;
}

/**
 * Get a contextual fallback icon based on item type
 * @param itemType - "Food" or "Beverage"
 * @returns Appropriate fallback icon
 */
export function getContextualFallback(itemType: "Food" | "Beverage"): string {
  return itemType === "Food" ? "🍽️" : "🥤";
}
