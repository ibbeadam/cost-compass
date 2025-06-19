// Dynamically map category names to emojis or icons
// Extend this as needed for your categories
const CATEGORY_ICON_MAP: Record<string, string> = {
  // Food
  "Dairy Products": "🧀",
  Chicken: "🍗",
  Beef: "🥩",
  Vegetables: "🥦",
  Fruits: "🍎",
  Seafood: "🦐",
  Bakery: "🥖",
  // Beverage
  Champagne: "🍾",
  "White Wine": "🍷",
  "Red Wine": "🍷",
  "Soft Drinks": "🥤",
  Coffee: "☕",
  Tea: "🍵",
  Beer: "🍺",
  // Add more as needed
};

export function getCategoryIcon(categoryName: string, fallback: string = "🍽️") {
  // Try exact match, then case-insensitive, then fallback
  if (CATEGORY_ICON_MAP[categoryName]) return CATEGORY_ICON_MAP[categoryName];
  const lower = Object.keys(CATEGORY_ICON_MAP).find(
    (key) => key.toLowerCase() === categoryName.toLowerCase()
  );
  if (lower) return CATEGORY_ICON_MAP[lower];
  // Try partial match
  const partial = Object.keys(CATEGORY_ICON_MAP).find((key) =>
    categoryName.toLowerCase().includes(key.toLowerCase())
  );
  if (partial) return CATEGORY_ICON_MAP[partial];
  return fallback;
}
