/**
 * Property Access Control Service
 * Handles multi-property access control and permission checking
 */

import type { 
  User, 
  Property, 
  PropertyAccess, 
  PropertyAccessLevel, 
  UserRole 
} from "@/types";
import { 
  ROLE_PERMISSIONS, 
  ACCESS_LEVEL_PERMISSIONS, 
  getRolePermissions,
  getAccessLevelPermissions 
} from "@/lib/permissions";

import { prisma } from "@/lib/prisma";
import { CachedPermissionService, PermissionCache } from "@/lib/cache/permission-cache";
import { CacheInvalidationService } from "@/lib/cache/cache-invalidation";

/**
 * Property Access Control Service
 * Provides methods for checking property-based permissions and access levels
 */
export class PropertyAccessService {
  
  /**
   * Get all accessible properties for a user
   */
  static async getUserAccessibleProperties(userId: number): Promise<Property[]> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          ownedProperties: true,
          managedProperties: true,
          propertyAccess: {
            include: { property: true },
            where: {
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } }
              ]
            }
          }
        }
      });

      if (!user) return [];

      // Super admin has access to all properties
      if (user.role === 'super_admin') {
        return await prisma.property.findMany({
          where: { isActive: true }
        });
      }

      const accessibleProperties: Property[] = [];
      
      // Add owned properties
      if (user.ownedProperties) {
        accessibleProperties.push(...user.ownedProperties);
      }
      
      // Add managed properties
      if (user.managedProperties) {
        accessibleProperties.push(...user.managedProperties);
      }
      
      // Add properties from PropertyAccess
      if (user.propertyAccess) {
        const accessProperties = user.propertyAccess
          .map(access => access.property)
          .filter(Boolean) as Property[];
        accessibleProperties.push(...accessProperties);
      }
      
      // Remove duplicates and filter active properties
      const uniqueProperties = accessibleProperties
        .filter((property, index, self) => 
          index === self.findIndex(p => p.id === property.id)
        )
        .filter(property => property.isActive);
      
      return uniqueProperties;
    } catch (error) {
      console.error('Error fetching user accessible properties:', error);
      return [];
    }
  }

  /**
   * Check if user can access a specific property
   */
  static async canAccessProperty(
    userId: number, 
    propertyId: number, 
    requiredLevel: PropertyAccessLevel = 'read_only'
  ): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          ownedProperties: { where: { id: propertyId, isActive: true } },
          managedProperties: { where: { id: propertyId, isActive: true } },
          propertyAccess: { 
            where: { 
              propertyId,
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } }
              ]
            }
          }
        }
      });

      if (!user || !user.isActive) return false;

      // Super admin has access to all properties
      if (user.role === 'super_admin') return true;

      // Check if user owns the property
      if (user.ownedProperties && user.ownedProperties.length > 0) {
        return this.hasRequiredAccessLevel('owner', requiredLevel);
      }

      // Check if user manages the property
      if (user.managedProperties && user.managedProperties.length > 0) {
        return this.hasRequiredAccessLevel('full_control', requiredLevel);
      }

      // Check PropertyAccess entries
      if (user.propertyAccess && user.propertyAccess.length > 0) {
        const access = user.propertyAccess[0];
        return this.hasRequiredAccessLevel(access.accessLevel, requiredLevel);
      }

      return false;
    } catch (error) {
      console.error('Error checking property access:', error);
      return false;
    }
  }

  /**
   * Get user's access level for a specific property
   */
  static async getUserPropertyAccessLevel(
    userId: number, 
    propertyId: number
  ): Promise<PropertyAccessLevel | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          ownedProperties: { where: { id: propertyId, isActive: true } },
          managedProperties: { where: { id: propertyId, isActive: true } },
          propertyAccess: { 
            where: { 
              propertyId,
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } }
              ]
            }
          }
        }
      });

      if (!user || !user.isActive) return null;

      // Super admin has owner level access
      if (user.role === 'super_admin') return 'owner';

      // Check if user owns the property
      if (user.ownedProperties && user.ownedProperties.length > 0) {
        return 'owner';
      }

      // Check if user manages the property
      if (user.managedProperties && user.managedProperties.length > 0) {
        return 'full_control';
      }

      // Check PropertyAccess entries
      if (user.propertyAccess && user.propertyAccess.length > 0) {
        return user.propertyAccess[0].accessLevel;
      }

      return null;
    } catch (error) {
      console.error('Error getting user property access level:', error);
      return null;
    }
  }

  /**
   * Get all user permissions for a specific property (with caching)
   */
  static async getUserPropertyPermissions(
    userId: number, 
    propertyId: number
  ): Promise<string[]> {
    // Use cached version for better performance
    return await CachedPermissionService.getUserPropertyPermissions(userId, propertyId);
  }

  /**
   * Get all user permissions for a specific property (direct database access)
   * Used by the cache service when cache misses occur
   */
  static async getUserPropertyPermissionsDirect(
    userId: number, 
    propertyId: number
  ): Promise<string[]> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userPermissions: {
            include: { permission: true },
            where: {
              granted: true,
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } }
              ]
            }
          }
        }
      });

      if (!user || !user.isActive) return [];

      // Get base permissions from role
      const rolePermissions = getRolePermissions(user.role);

      // Get property-specific access level permissions
      const accessLevel = await this.getUserPropertyAccessLevel(userId, propertyId);
      const accessPermissions = accessLevel ? getAccessLevelPermissions(accessLevel) : [];

      // Get user-specific permission overrides
      const userSpecificPermissions = user.userPermissions
        .map(up => `${up.permission.resource}.${up.permission.action}`);

      // Combine all permissions and remove duplicates
      const allPermissions = [
        ...rolePermissions,
        ...accessPermissions,
        ...userSpecificPermissions
      ];

      return [...new Set(allPermissions)];
    } catch (error) {
      console.error('Error getting user property permissions:', error);
      return [];
    }
  }

  /**
   * Check if user has a specific permission for a property
   */
  static async hasPropertyPermission(
    userId: number, 
    propertyId: number, 
    permission: string
  ): Promise<boolean> {
    const userPermissions = await this.getUserPropertyPermissions(userId, propertyId);
    return userPermissions.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions for a property
   */
  static async hasAnyPropertyPermission(
    userId: number, 
    propertyId: number, 
    permissions: string[]
  ): Promise<boolean> {
    const userPermissions = await this.getUserPropertyPermissions(userId, propertyId);
    return permissions.some(permission => userPermissions.includes(permission));
  }

  /**
   * Check if user has all of the specified permissions for a property
   */
  static async hasAllPropertyPermissions(
    userId: number, 
    propertyId: number, 
    permissions: string[]
  ): Promise<boolean> {
    const userPermissions = await this.getUserPropertyPermissions(userId, propertyId);
    return permissions.every(permission => userPermissions.includes(permission));
  }

  /**
   * Grant property access to a user
   */
  static async grantPropertyAccess(
    userId: number,
    propertyId: number,
    accessLevel: PropertyAccessLevel,
    grantedBy: number,
    expiresAt?: Date
  ): Promise<PropertyAccess | null> {
    try {
      const propertyAccess = await prisma.propertyAccess.upsert({
        where: {
          userId_propertyId: { userId, propertyId }
        },
        update: {
          accessLevel,
          grantedBy,
          expiresAt,
          grantedAt: new Date()
        },
        create: {
          userId,
          propertyId,
          accessLevel,
          grantedBy,
          expiresAt,
          grantedAt: new Date()
        }
      });

      // Log the access grant
      await prisma.auditLog.create({
        data: {
          userId: grantedBy,
          propertyId,
          action: 'GRANT_PROPERTY_ACCESS',
          resource: 'property_access',
          resourceId: `${userId}-${propertyId}`,
          details: { 
            targetUserId: userId, 
            accessLevel,
            expiresAt 
          }
        }
      });

      // Invalidate cache for the affected user and property
      await CacheInvalidationService.invalidate('property_access_granted', {
        userId,
        propertyId,
        reason: 'Property access granted'
      });

      return propertyAccess;
    } catch (error) {
      console.error('Error granting property access:', error);
      return null;
    }
  }

  /**
   * Revoke property access from a user
   */
  static async revokePropertyAccess(
    userId: number,
    propertyId: number,
    revokedBy: number
  ): Promise<boolean> {
    try {
      await prisma.propertyAccess.delete({
        where: {
          userId_propertyId: { userId, propertyId }
        }
      });

      // Log the access revocation
      await prisma.auditLog.create({
        data: {
          userId: revokedBy,
          propertyId,
          action: 'REVOKE_PROPERTY_ACCESS',
          resource: 'property_access',
          resourceId: `${userId}-${propertyId}`,
          details: { 
            targetUserId: userId 
          }
        }
      });

      // Invalidate cache for the affected user and property
      await CacheInvalidationService.invalidate('property_access_revoked', {
        userId,
        propertyId,
        reason: 'Property access revoked'
      });

      return true;
    } catch (error) {
      console.error('Error revoking property access:', error);
      return false;
    }
  }

  /**
   * Check if one access level has the required level or higher
   */
  private static hasRequiredAccessLevel(
    userLevel: PropertyAccessLevel, 
    requiredLevel: PropertyAccessLevel
  ): boolean {
    const accessLevels: PropertyAccessLevel[] = [
      'read_only', 'data_entry', 'management', 'full_control', 'owner'
    ];
    
    const userLevelIndex = accessLevels.indexOf(userLevel);
    const requiredLevelIndex = accessLevels.indexOf(requiredLevel);
    
    return userLevelIndex >= requiredLevelIndex;
  }

  /**
   * Get properties that a user can manage (has management level access or higher)
   */
  static async getUserManageableProperties(userId: number): Promise<Property[]> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          ownedProperties: { where: { isActive: true } },
          managedProperties: { where: { isActive: true } },
          propertyAccess: {
            include: { property: true },
            where: {
              accessLevel: { in: ['management', 'full_control', 'owner'] },
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } }
              ]
            }
          }
        }
      });

      if (!user || !user.isActive) return [];

      // Super admin can manage all properties
      if (user.role === 'super_admin') {
        return await prisma.property.findMany({
          where: { isActive: true }
        });
      }

      const manageableProperties: Property[] = [];
      
      // Add owned properties
      if (user.ownedProperties) {
        manageableProperties.push(...user.ownedProperties);
      }
      
      // Add managed properties
      if (user.managedProperties) {
        manageableProperties.push(...user.managedProperties);
      }
      
      // Add properties from PropertyAccess with management level or higher
      if (user.propertyAccess) {
        const accessProperties = user.propertyAccess
          .map(access => access.property)
          .filter(Boolean) as Property[];
        manageableProperties.push(...accessProperties);
      }
      
      // Remove duplicates
      const uniqueProperties = manageableProperties.filter(
        (property, index, self) => 
          index === self.findIndex(p => p.id === property.id)
      );
      
      return uniqueProperties;
    } catch (error) {
      console.error('Error fetching user manageable properties:', error);
      return [];
    }
  }

  /**
   * Check if user can manage other users within a property
   */
  static async canManagePropertyUsers(
    userId: number, 
    propertyId: number
  ): Promise<boolean> {
    const accessLevel = await this.getUserPropertyAccessLevel(userId, propertyId);
    return accessLevel ? this.hasRequiredAccessLevel(accessLevel, 'management') : false;
  }
}