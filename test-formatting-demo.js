#!/usr/bin/env node

/**
 * Demo script to show how the new human-readable audit formatting works
 */

// Simulate the old vs new formatting for the example you provided

console.log('🎨 Human-Readable Audit Log Formatting Demo\n');

// Original raw data from your example
const originalData = {
  changes: {
    outlet: {
      from: {
        id: 3,
        name: "Main Kitchen",
        address: "Dh. Velavaru",
        isActive: true,
        createdAt: "2025-07-01T14:31:24.405Z",
        updatedAt: "2025-07-01T14:31:24.405Z",
        outletCode: "VE281",
        propertyId: 1
      },
      to: {
        id: 3,
        name: "Main Kitchen",
        address: "Dh. Velavaru",
        isActive: true,
        createdAt: "2025-07-01T14:31:24.405Z",
        updatedAt: "2025-07-01T14:31:24.405Z",
        outletCode: "VE281",
        propertyId: 1
      }
    },
    details: {
      from: [
        {
          id: 57,
          cost: 580,
          category: {
            id: 3,
            name: "Desserts",
            type: "Food",
            createdAt: "2025-07-01T08:30:40.404Z",
            updatedAt: "2025-07-01T08:30:40.404Z",
            description: "Sweet dishes and after-meal treats"
          },
          createdAt: "2025-07-03T14:32:48.417Z",
          createdBy: 4,
          updatedAt: "2025-07-03T14:32:48.417Z",
          updatedBy: 4,
          categoryId: 3,
          description: "",
          categoryName: "Desserts",
          foodCostEntryId: 1
        }
      ],
      to: [
        {
          id: 58,
          cost: 580,
          category: {
            id: 3,
            name: "Desserts",
            type: "Food",
            createdAt: "2025-07-01T08:30:40.404Z",
            updatedAt: "2025-07-01T08:30:40.404Z",
            description: "Sweet dishes and after-meal treats"
          },
          createdAt: "2025-07-03T14:50:48.743Z",
          createdBy: 4,
          updatedAt: "2025-07-03T14:50:48.743Z",
          updatedBy: 4,
          categoryId: 3,
          description: "",
          categoryName: "Desserts",
          foodCostEntryId: 1
        },
        {
          id: 59,
          cost: 20,
          category: {
            id: 5,
            name: "Vegetables",
            type: "Food",
            createdAt: "2025-07-01T08:30:40.413Z",
            updatedAt: "2025-07-01T08:30:40.413Z",
            description: "Fresh and cooked vegetables"
          },
          createdAt: "2025-07-03T14:50:48.743Z",
          createdBy: 4,
          updatedAt: "2025-07-03T14:50:48.743Z",
          updatedBy: 4,
          categoryId: 5,
          description: "",
          categoryName: "Vegetables",
          foodCostEntryId: 1
        }
      ]
    }
  }
};

console.log('📝 BEFORE (Raw JSON):');
console.log('=' .repeat(50));
console.log('Field Changes');
console.log('Outlet');
console.log('From:');
console.log(JSON.stringify(originalData.changes.outlet.from, null, 2));
console.log('To:');
console.log(JSON.stringify(originalData.changes.outlet.to, null, 2));
console.log('Details');
console.log('From:');
console.log(JSON.stringify(originalData.changes.details.from, null, 2));
console.log('To:');
console.log(JSON.stringify(originalData.changes.details.to, null, 2));

console.log('\n\n✨ AFTER (Human-Readable):');
console.log('=' .repeat(50));

console.log('📊 Field Changes (2)');
console.log('');

// Outlet change (object comparison)
console.log('🏢 Outlet');
console.log('   📝 Object unchanged');
console.log('   📍 From: Main Kitchen');
console.log('   📍 To: Main Kitchen');
console.log('');

// Details change (array comparison)
console.log('📋 Details');
console.log('   📊 Added 1 item (1 → 2)');
console.log('');
console.log('   Changes:');
console.log('   ➕ Added: Vegetables: $20.00');
console.log('');
console.log('   📍 From: 1 item');
console.log('   📍 To: 2 items');
console.log('');

console.log('🔍 Summary:');
console.log('   • Outlet: No changes detected');
console.log('   • Details: Added 1 new cost entry for Vegetables ($20.00)');
console.log('   • Total items increased from 1 to 2');
console.log('   • Previous item (Desserts: $580.00) remained unchanged');

console.log('\n💡 Benefits of the new format:');
console.log('   ✅ Shows what actually changed in plain English');
console.log('   ✅ Highlights additions, removals, and modifications clearly');
console.log('   ✅ Formats money values as currency');
console.log('   ✅ Groups related changes together');
console.log('   ✅ Provides context-aware summaries');
console.log('   ✅ Easy to understand at a glance');

console.log('\n🎯 Now your users will see:');
console.log('   "Added 1 item: Vegetables ($20.00)"');
console.log('   Instead of:');
console.log('   "[ { id: 59, cost: 20, category: { ... } } ]"');

console.log('\n🚀 Ready to test! Update any data in your app to see the new format in action.');