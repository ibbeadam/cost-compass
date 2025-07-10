-- Migration: Add Permission Delegation System
-- This adds support for permission delegation and inheritance

-- Permission Delegation table
CREATE TABLE IF NOT EXISTS "PermissionDelegation" (
    "id" TEXT NOT NULL,
    "delegatedByUserId" INTEGER NOT NULL,
    "delegatedToUserId" INTEGER NOT NULL,
    "propertyId" INTEGER,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "conditions" JSONB,
    "reason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "delegatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermissionDelegation_pkey" PRIMARY KEY ("id")
);

-- Permission Templates table for bulk management
CREATE TABLE IF NOT EXISTS "PermissionTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL CHECK ("type" IN ('role_template', 'property_template', 'department_template')),
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "conditions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermissionTemplate_pkey" PRIMARY KEY ("id")
);

-- Permission Groups for bulk management
CREATE TABLE IF NOT EXISTS "PermissionGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentGroupId" TEXT,
    "properties" JSONB NOT NULL DEFAULT '[]',
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermissionGroup_pkey" PRIMARY KEY ("id")
);

-- User Groups for bulk management
CREATE TABLE IF NOT EXISTS "UserGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL CHECK ("type" IN ('department', 'team', 'role_group', 'property_group')),
    "parentGroupId" TEXT,
    "rules" JSONB NOT NULL DEFAULT '{}',
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGroup_pkey" PRIMARY KEY ("id")
);

-- User Group Memberships
CREATE TABLE IF NOT EXISTS "UserGroupMembership" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "groupId" TEXT NOT NULL,
    "role" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedBy" INTEGER NOT NULL,

    CONSTRAINT "UserGroupMembership_pkey" PRIMARY KEY ("id")
);

-- Bulk Operations Log
CREATE TABLE IF NOT EXISTS "BulkOperation" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL CHECK ("type" IN ('user_creation', 'permission_grant', 'permission_revoke', 'role_assignment', 'group_operation')),
    "targetType" TEXT NOT NULL CHECK ("targetType" IN ('users', 'permissions', 'properties', 'groups')),
    "targetIds" JSONB NOT NULL DEFAULT '[]',
    "operation" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "results" JSONB DEFAULT '{}',
    "errors" JSONB DEFAULT '[]',
    "initiatedBy" INTEGER NOT NULL,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BulkOperation_pkey" PRIMARY KEY ("id")
);

-- Add parent property support for inheritance
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "parentPropertyId" INTEGER;

-- Foreign Keys
ALTER TABLE "PermissionDelegation" ADD CONSTRAINT "PermissionDelegation_delegatedByUserId_fkey" FOREIGN KEY ("delegatedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PermissionDelegation" ADD CONSTRAINT "PermissionDelegation_delegatedToUserId_fkey" FOREIGN KEY ("delegatedToUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PermissionDelegation" ADD CONSTRAINT "PermissionDelegation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PermissionDelegation" ADD CONSTRAINT "PermissionDelegation_revokedBy_fkey" FOREIGN KEY ("revokedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PermissionTemplate" ADD CONSTRAINT "PermissionTemplate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PermissionGroup" ADD CONSTRAINT "PermissionGroup_parentGroupId_fkey" FOREIGN KEY ("parentGroupId") REFERENCES "PermissionGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PermissionGroup" ADD CONSTRAINT "PermissionGroup_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserGroup" ADD CONSTRAINT "UserGroup_parentGroupId_fkey" FOREIGN KEY ("parentGroupId") REFERENCES "UserGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserGroup" ADD CONSTRAINT "UserGroup_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserGroupMembership" ADD CONSTRAINT "UserGroupMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserGroupMembership" ADD CONSTRAINT "UserGroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "UserGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserGroupMembership" ADD CONSTRAINT "UserGroupMembership_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BulkOperation" ADD CONSTRAINT "BulkOperation_initiatedBy_fkey" FOREIGN KEY ("initiatedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Property" ADD CONSTRAINT "Property_parentPropertyId_fkey" FOREIGN KEY ("parentPropertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "PermissionDelegation_delegatedToUserId_idx" ON "PermissionDelegation"("delegatedToUserId");
CREATE INDEX IF NOT EXISTS "PermissionDelegation_propertyId_idx" ON "PermissionDelegation"("propertyId");
CREATE INDEX IF NOT EXISTS "PermissionDelegation_isActive_idx" ON "PermissionDelegation"("isActive");
CREATE INDEX IF NOT EXISTS "PermissionDelegation_expiresAt_idx" ON "PermissionDelegation"("expiresAt");

CREATE INDEX IF NOT EXISTS "PermissionTemplate_type_idx" ON "PermissionTemplate"("type");
CREATE INDEX IF NOT EXISTS "PermissionTemplate_isActive_idx" ON "PermissionTemplate"("isActive");

CREATE INDEX IF NOT EXISTS "UserGroup_type_idx" ON "UserGroup"("type");
CREATE INDEX IF NOT EXISTS "UserGroup_parentGroupId_idx" ON "UserGroup"("parentGroupId");

CREATE INDEX IF NOT EXISTS "UserGroupMembership_userId_idx" ON "UserGroupMembership"("userId");
CREATE INDEX IF NOT EXISTS "UserGroupMembership_groupId_idx" ON "UserGroupMembership"("groupId");

CREATE INDEX IF NOT EXISTS "BulkOperation_status_idx" ON "BulkOperation"("status");
CREATE INDEX IF NOT EXISTS "BulkOperation_initiatedBy_idx" ON "BulkOperation"("initiatedBy");
CREATE INDEX IF NOT EXISTS "BulkOperation_type_idx" ON "BulkOperation"("type");

CREATE INDEX IF NOT EXISTS "Property_parentPropertyId_idx" ON "Property"("parentPropertyId");

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "PermissionDelegation_unique_active" ON "PermissionDelegation"("delegatedByUserId", "delegatedToUserId", "propertyId") WHERE "isActive" = true;
CREATE UNIQUE INDEX IF NOT EXISTS "PermissionTemplate_name_unique" ON "PermissionTemplate"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "PermissionGroup_name_unique" ON "PermissionGroup"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "UserGroup_name_unique" ON "UserGroup"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "UserGroupMembership_unique" ON "UserGroupMembership"("userId", "groupId");