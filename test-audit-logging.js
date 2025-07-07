#!/usr/bin/env node

/**
 * Test script to verify the comprehensive audit logging system
 * Run with: node test-audit-logging.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAuditLogging() {
  console.log('🔍 Testing Comprehensive Audit Logging System\n');

  try {
    // Test 1: Check if audit log table exists and has recent entries
    console.log('✅ Test 1: Checking audit log table...');
    const recentLogs = await prisma.auditLog.findMany({
      take: 5,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: { name: true, email: true, role: true }
        }
      }
    });

    if (recentLogs.length > 0) {
      console.log(`   Found ${recentLogs.length} recent audit log entries`);
      recentLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. ${log.timestamp.toISOString()} - ${log.user?.name || 'System'} performed ${log.action} on ${log.resource}`);
      });
    } else {
      console.log('   No audit log entries found - system is ready for logging');
    }

    // Test 2: Check audit log coverage by action type
    console.log('\n✅ Test 2: Checking action type coverage...');
    const actionStats = await prisma.auditLog.groupBy({
      by: ['action'],
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } }
    });

    if (actionStats.length > 0) {
      console.log('   Action distribution:');
      actionStats.forEach(stat => {
        console.log(`   - ${stat.action}: ${stat._count.action} entries`);
      });
    } else {
      console.log('   No action statistics available yet');
    }

    // Test 3: Check resource coverage
    console.log('\n✅ Test 3: Checking resource coverage...');
    const resourceStats = await prisma.auditLog.groupBy({
      by: ['resource'],
      _count: { resource: true },
      orderBy: { _count: { resource: 'desc' } }
    });

    if (resourceStats.length > 0) {
      console.log('   Resource distribution:');
      resourceStats.forEach(stat => {
        console.log(`   - ${stat.resource}: ${stat._count.resource} entries`);
      });
    } else {
      console.log('   No resource statistics available yet');
    }

    // Test 4: Check recent activity by user
    console.log('\n✅ Test 4: Checking user activity distribution...');
    const userStats = await prisma.auditLog.groupBy({
      by: ['userId'],
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 5
    });

    if (userStats.length > 0) {
      console.log('   Top active users:');
      for (const stat of userStats) {
        if (stat.userId) {
          const user = await prisma.user.findUnique({
            where: { id: stat.userId },
            select: { name: true, email: true, role: true }
          });
          console.log(`   - ${user?.name || 'Unknown'} (${user?.email}): ${stat._count.userId} actions`);
        } else {
          console.log(`   - System: ${stat._count.userId} actions`);
        }
      }
    } else {
      console.log('   No user activity statistics available yet');
    }

    // Test 5: Check if all expected resources are being tracked
    console.log('\n✅ Test 5: Verifying comprehensive module coverage...');
    const expectedResources = [
      'user', 'property', 'outlet', 'category', 
      'food_cost_entry', 'beverage_cost_entry', 
      'daily_financial_summary', 'property_access', 
      'report', 'audit_log'
    ];

    const trackedResources = new Set(resourceStats.map(r => r.resource));
    const missingResources = expectedResources.filter(r => !trackedResources.has(r));

    if (missingResources.length === 0) {
      console.log('   ✅ All expected resources are being tracked!');
    } else {
      console.log('   ⚠️  Resources not yet tracked (will appear when used):');
      missingResources.forEach(resource => {
        console.log(`   - ${resource}`);
      });
    }

    // Test 6: Verify audit data integrity
    console.log('\n✅ Test 6: Checking audit data integrity...');
    const logsWithMissingUsers = await prisma.auditLog.count({
      where: {
        userId: { not: null },
        user: null
      }
    });

    if (logsWithMissingUsers === 0) {
      console.log('   ✅ All audit logs have valid user references');
    } else {
      console.log(`   ⚠️  Found ${logsWithMissingUsers} audit logs with invalid user references`);
    }

    console.log('\n🎉 Audit Logging System Test Complete!');
    console.log('\n📊 Summary:');
    console.log(`   - Total audit entries: ${recentLogs.length > 0 ? 'Available' : 'Ready for logging'}`);
    console.log(`   - Action types tracked: ${actionStats.length}`);
    console.log(`   - Resource types tracked: ${resourceStats.length}`);
    console.log(`   - Active users: ${userStats.length}`);
    console.log(`   - Data integrity: ${logsWithMissingUsers === 0 ? '✅ Clean' : '⚠️  Issues found'}`);

    console.log('\n🔍 How to test logging:');
    console.log('   1. Log into the application');
    console.log('   2. Create, update, or delete any data (categories, outlets, etc.)');
    console.log('   3. View reports or export data');
    console.log('   4. Check the Activity Log page in the dashboard');
    console.log('   5. Re-run this test to see new entries');

  } catch (error) {
    console.error('❌ Error testing audit logging:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure the database is running');
    console.log('   2. Run: npx prisma generate');
    console.log('   3. Run: npx prisma db push');
    console.log('   4. Check database connection settings');
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testAuditLogging().catch(console.error);