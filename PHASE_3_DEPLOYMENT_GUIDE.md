# Phase 3 Deployment Guide: Multi-Property RBAC Database Integration

## 🚀 **Overview**

This guide walks you through deploying Phase 3 of the Cost Compass multi-property RBAC system, which integrates the enhanced database schema and removes mock implementations.

## ⚠️ **CRITICAL PRE-DEPLOYMENT CHECKLIST**

### **BEFORE YOU BEGIN**
- [ ] **BACKUP YOUR DATABASE** - This is absolutely critical
- [ ] Stop all application instances
- [ ] Notify all users of planned downtime
- [ ] Ensure you have database admin access
- [ ] Verify all dependencies are installed
- [ ] Have a rollback plan ready

### **Prerequisites**
- Node.js 18+ installed
- Database access (MySQL/PostgreSQL)
- Prisma CLI installed globally: `npm install -g prisma`
- TSX for running TypeScript files: `npm install -g tsx`

## 📋 **Phase 3 Implementation Steps**

### **Step 1: Install Dependencies**

```bash
# Install any missing dependencies
npm install

# Verify Prisma client is generated
npx prisma generate
```

### **Step 2: Database Schema Migration**

The enhanced schema is already in place at `prisma/schema.prisma`. Now apply it:

```bash
# Generate and apply the migration
npx prisma migrate dev --name "multi-property-rbac-enhancement"

# Alternative: Push schema directly (for development)
npx prisma db push
```

### **Step 3: Seed Permissions and Roles**

```bash
# Run the comprehensive seeder
npm run db:seed

# Or run directly
npx tsx prisma/seed.ts
```

This will create:
- **50+ granular permissions** across 8 categories
- **Role-permission mappings** for all 8 user roles
- **Initial categories** (food and beverage)
- **Default property** for migration

### **Step 4: Run Data Migration (RECOMMENDED)**

For existing installations with data:

```bash
# Run the comprehensive migration script
npm run db:migrate-multi-property

# Or run directly
node scripts/migrate-to-multi-property.js
```

This interactive script will:
- Perform pre-migration checks
- Create database backup guidance
- Migrate existing outlets to properties
- Update financial data with property references
- Set up user permissions and property access
- Verify migration success

### **Step 5: Verify Migration**

```bash
# Check database with Prisma Studio
npm run db:studio

# Verify application starts
npm run dev
```

## 🔧 **Manual Migration Steps (Alternative)**

If you prefer manual control:

### **1. Create Initial Property**

```sql
INSERT INTO properties (name, propertyCode, propertyType, currency, isActive, createdAt, updatedAt)
VALUES ('Main Restaurant', 'MAIN-001', 'restaurant', 'USD', true, NOW(), NOW());
```

### **2. Update Existing Outlets**

```sql
UPDATE outlets 
SET propertyId = (SELECT id FROM properties WHERE propertyCode = 'MAIN-001' LIMIT 1)
WHERE propertyId IS NULL;
```

### **3. Update Financial Data**

```sql
-- Update food cost entries
UPDATE food_cost_entries 
SET propertyId = (SELECT id FROM properties WHERE propertyCode = 'MAIN-001' LIMIT 1)
WHERE propertyId IS NULL;

-- Update beverage cost entries  
UPDATE beverage_cost_entries
SET propertyId = (SELECT id FROM properties WHERE propertyCode = 'MAIN-001' LIMIT 1)
WHERE propertyId IS NULL;

-- Update daily financial summaries
UPDATE daily_financial_summaries
SET propertyId = (SELECT id FROM properties WHERE propertyCode = 'MAIN-001' LIMIT 1)
WHERE propertyId IS NULL;
```

### **4. Grant Property Access to Existing Users**

```sql
INSERT INTO property_access (userId, propertyId, accessLevel, grantedBy, grantedAt)
SELECT 
  u.id,
  p.id,
  CASE 
    WHEN u.role = 'super_admin' THEN 'owner'
    WHEN u.role IN ('property_owner', 'property_admin') THEN 'full_control'
    ELSE 'management'
  END,
  u.id,
  NOW()
FROM users u
CROSS JOIN properties p
WHERE p.propertyCode = 'MAIN-001';
```

## 🎯 **What Changes After Deployment**

### **Database Structure**
- **Enhanced User model** with security fields and role hierarchy
- **Property model** replacing simple outlets with full property management
- **Granular permissions** with 50+ specific permissions
- **Property access control** with 5 access levels
- **Comprehensive audit logging** for all actions

### **Application Features**
- **Multi-property selector** in navigation (when user has multiple properties)
- **Property-aware permissions** throughout the application
- **Enhanced user management** with role-based capabilities
- **Property access management** for granting/revoking access
- **Audit trail** for all administrative actions

### **User Experience**
- **Backward compatible** - existing functionality works unchanged
- **Progressive enhancement** - new features available based on permissions
- **Property context** - all data operations are now property-aware
- **Enhanced security** - account lockout, password policies, 2FA ready

## 🔍 **Post-Deployment Verification**

### **1. Test Authentication**
```bash
# Test login with existing users
# Verify session includes property access
# Check permission-based navigation
```

### **2. Test Core Functionality**
```bash
# Food cost entry (should work with property context)
# Beverage cost entry (should work with property context) 
# Daily financial summary (should work with property context)
# Reports (should show property-filtered data)
```

### **3. Test New Features**
```bash
# Property management (if user has permissions)
# User management (role-based access)
# Property access granting/revoking
# Multi-property navigation (if applicable)
```

### **4. Verify Data Integrity**
```sql
-- Check all outlets have propertyId
SELECT COUNT(*) FROM outlets WHERE propertyId IS NULL;

-- Check all financial data has propertyId  
SELECT COUNT(*) FROM food_cost_entries WHERE propertyId IS NULL;
SELECT COUNT(*) FROM beverage_cost_entries WHERE propertyId IS NULL;
SELECT COUNT(*) FROM daily_financial_summaries WHERE propertyId IS NULL;

-- Check permissions are loaded
SELECT COUNT(*) FROM permissions;
SELECT COUNT(*) FROM role_permissions;

-- Check property access is set up
SELECT COUNT(*) FROM property_access;
```

## 🚨 **Rollback Procedure**

If issues occur:

### **1. Database Rollback**
```bash
# Restore from backup
# Or reset and reseed
npm run db:reset
npx prisma db seed
```

### **2. Code Rollback**
```bash
# Revert to previous git commit
git checkout HEAD~1

# Or restore from backup
```

### **3. Emergency Fixes**
```bash
# Disable new features in environment
export DISABLE_MULTI_PROPERTY=true

# Run in compatibility mode
npm run dev
```

## 📊 **Monitoring & Troubleshooting**

### **Common Issues**

**1. Permission Denied Errors**
- Check user has appropriate property access
- Verify permissions are loaded correctly
- Check session includes property context

**2. Property Not Found Errors**  
- Verify property migration completed
- Check outlets have valid propertyId
- Ensure user has access to the property

**3. Financial Data Not Loading**
- Check financial entries have propertyId
- Verify property context is being passed
- Check API endpoints are property-aware

### **Debug Commands**
```bash
# Check user permissions
npx prisma studio

# View logs
npm run dev (check console)

# Test API endpoints
curl -X GET "http://localhost:9002/api/properties"
curl -X GET "http://localhost:9002/api/users"
```

## ✅ **Success Criteria**

**Deployment is successful when:**
- [ ] All existing users can log in
- [ ] All existing functionality works unchanged
- [ ] New property features are available to authorized users
- [ ] Multi-property navigation works (when applicable)
- [ ] Permission-based access control is enforced
- [ ] Audit logging is capturing actions
- [ ] No data integrity issues

## 🎉 **Next Steps After Successful Deployment**

1. **User Training** - Train users on new multi-property features
2. **Property Setup** - Create additional properties as needed
3. **Permission Review** - Adjust user roles and permissions
4. **Access Management** - Set up property access for users
5. **Monitoring** - Monitor system performance and user feedback

## 🆘 **Support & Contact**

If you encounter issues during deployment:

1. **Check the logs** - Application and database logs
2. **Review this guide** - Ensure all steps were followed
3. **Test rollback** - If needed, use the rollback procedure
4. **Document issues** - For future improvements

---

**🔥 Phase 3 transforms Cost Compass into a true enterprise-grade multi-property management platform! 🔥**