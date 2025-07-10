/**
 * Bulk Operations Management System
 * Handles bulk user creation, permission management, and administrative operations
 */

import { prisma } from "@/lib/prisma";
import { PermissionInheritanceEngine } from "@/lib/permissions/inheritance";
import { CacheInvalidationService } from "@/lib/cache/cache-invalidation";
import type { UserRole, PropertyAccessLevel } from "@/types";

export interface BulkUserCreationData {
  users: Array<{
    name: string;
    email: string;
    role: UserRole;
    department?: string;
    phoneNumber?: string;
    propertyAccess?: Array<{
      propertyId: number;
      accessLevel: PropertyAccessLevel;
    }>;
    permissions?: string[];
    groupIds?: string[];
  }>;
  sendNotifications?: boolean;
  generatePasswords?: boolean;
  enforcePasswordChange?: boolean;
}

export interface BulkPermissionOperation {
  targetUserIds: number[];
  operation: 'grant' | 'revoke';
  permissions: string[];
  propertyId?: number;
  expiresAt?: Date;
  reason?: string;
}

export interface BulkRoleAssignment {
  userIds: number[];
  role: UserRole;
  reason?: string;
}

export interface BulkPropertyAccessOperation {
  userIds: number[];
  propertyId: number;
  accessLevel: PropertyAccessLevel;
  operation: 'grant' | 'revoke';
  expiresAt?: Date;
}

export interface BulkOperationResult {
  operationId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  totalItems: number;
  successCount: number;
  errorCount: number;
  results: Array<{
    targetId: string | number;
    status: 'success' | 'error';
    message?: string;
    data?: any;
  }>;
  errors: Array<{
    targetId: string | number;
    error: string;
    details?: any;
  }>;
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Bulk Operations Service
 */
export class BulkOperationsService {
  
  /**
   * Create multiple users with permissions and property access
   */
  static async bulkCreateUsers(
    data: BulkUserCreationData,
    initiatedBy: number
  ): Promise<BulkOperationResult> {
    const operationId = `bulk_user_creation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Create bulk operation record
      const bulkOperation = await prisma.bulkOperation.create({
        data: {
          id: operationId,
          type: 'user_creation',
          targetType: 'users',
          targetIds: [],
          operation: data,
          status: 'in_progress',
          totalItems: data.users.length,
          initiatedBy
        }
      });

      const result: BulkOperationResult = {
        operationId,
        status: 'in_progress',
        progress: 0,
        totalItems: data.users.length,
        successCount: 0,
        errorCount: 0,
        results: [],
        errors: [],
        startedAt: new Date()
      };

      // Process users in batches
      const batchSize = 10;
      for (let i = 0; i < data.users.length; i += batchSize) {
        const batch = data.users.slice(i, i + batchSize);
        
        for (const userData of batch) {
          try {
            // Create user
            const user = await prisma.user.create({
              data: {
                name: userData.name,
                email: userData.email,
                role: userData.role,
                department: userData.department,
                phoneNumber: userData.phoneNumber,
                password: data.generatePasswords ? this.generatePassword() : undefined,
                passwordChangedAt: data.enforcePasswordChange ? null : new Date(),
                isActive: true
              }
            });

            // Grant property access
            if (userData.propertyAccess) {
              for (const access of userData.propertyAccess) {
                await prisma.propertyAccess.create({
                  data: {
                    userId: user.id,
                    propertyId: access.propertyId,
                    accessLevel: access.accessLevel,
                    grantedBy: initiatedBy
                  }
                });
              }
            }

            // Grant specific permissions
            if (userData.permissions) {
              for (const permissionName of userData.permissions) {
                const permission = await prisma.permission.findFirst({
                  where: { name: permissionName }
                });
                
                if (permission) {
                  await prisma.userPermission.create({
                    data: {
                      userId: user.id,
                      permissionId: permission.id,
                      granted: true,
                      grantedBy: initiatedBy
                    }
                  });
                }
              }
            }

            // Add to groups
            if (userData.groupIds) {
              for (const groupId of userData.groupIds) {
                await prisma.userGroupMembership.create({
                  data: {
                    userId: user.id,
                    groupId,
                    addedBy: initiatedBy
                  }
                });
              }
            }

            result.results.push({
              targetId: userData.email,
              status: 'success',
              message: `User created successfully`,
              data: { userId: user.id, email: user.email }
            });
            result.successCount++;

            // Audit log
            await prisma.auditLog.create({
              data: {
                userId: initiatedBy,
                action: 'BULK_USER_CREATED',
                resource: 'user',
                resourceId: user.id.toString(),
                details: {
                  bulkOperationId: operationId,
                  createdUser: {
                    id: user.id,
                    email: user.email,
                    role: user.role
                  }
                }
              }
            });

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            result.errors.push({
              targetId: userData.email,
              error: errorMessage,
              details: userData
            });
            result.errorCount++;
          }

          // Update progress
          result.progress = Math.round(((result.successCount + result.errorCount) / result.totalItems) * 100);
        }

        // Update database record
        await prisma.bulkOperation.update({
          where: { id: operationId },
          data: {
            progress: result.progress,
            results: result,
            status: result.progress === 100 ? 'completed' : 'in_progress'
          }
        });
      }

      // Finalize operation
      result.status = 'completed';
      result.completedAt = new Date();

      await prisma.bulkOperation.update({
        where: { id: operationId },
        data: {
          status: 'completed',
          completedAt: result.completedAt,
          results: result
        }
      });

      return result;

    } catch (error) {
      console.error('Bulk user creation error:', error);
      
      // Update operation as failed
      await prisma.bulkOperation.update({
        where: { id: operationId },
        data: { status: 'failed' }
      });

      throw error;
    }
  }

  /**
   * Bulk grant or revoke permissions
   */
  static async bulkPermissionOperation(
    operation: BulkPermissionOperation,
    initiatedBy: number
  ): Promise<BulkOperationResult> {
    const operationId = `bulk_permission_${operation.operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const bulkOperation = await prisma.bulkOperation.create({
        data: {
          id: operationId,
          type: operation.operation === 'grant' ? 'permission_grant' : 'permission_revoke',
          targetType: 'permissions',
          targetIds: operation.targetUserIds,
          operation: operation,
          status: 'in_progress',
          totalItems: operation.targetUserIds.length * operation.permissions.length,
          initiatedBy
        }
      });

      const result: BulkOperationResult = {
        operationId,
        status: 'in_progress',
        progress: 0,
        totalItems: operation.targetUserIds.length * operation.permissions.length,
        successCount: 0,
        errorCount: 0,
        results: [],
        errors: [],
        startedAt: new Date()
      };

      let processedItems = 0;

      for (const userId of operation.targetUserIds) {
        for (const permissionName of operation.permissions) {
          try {
            const permission = await prisma.permission.findFirst({
              where: { name: permissionName }
            });

            if (!permission) {
              result.errors.push({
                targetId: `${userId}:${permissionName}`,
                error: `Permission ${permissionName} not found`
              });
              result.errorCount++;
              processedItems++;
              continue;
            }

            if (operation.operation === 'grant') {
              await prisma.userPermission.upsert({
                where: {
                  userId_permissionId: {
                    userId,
                    permissionId: permission.id
                  }
                },
                update: {
                  granted: true,
                  expiresAt: operation.expiresAt,
                  grantedBy: initiatedBy
                },
                create: {
                  userId,
                  permissionId: permission.id,
                  granted: true,
                  expiresAt: operation.expiresAt,
                  grantedBy: initiatedBy
                }
              });
            } else {
              await prisma.userPermission.upsert({
                where: {
                  userId_permissionId: {
                    userId,
                    permissionId: permission.id
                  }
                },
                update: {
                  granted: false
                },
                create: {
                  userId,
                  permissionId: permission.id,
                  granted: false,
                  grantedBy: initiatedBy
                }
              });
            }

            // Invalidate cache
            await PermissionInheritanceEngine.invalidateInheritanceCache(userId, operation.propertyId);

            result.results.push({
              targetId: `${userId}:${permissionName}`,
              status: 'success',
              message: `Permission ${operation.operation}ed successfully`
            });
            result.successCount++;

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            result.errors.push({
              targetId: `${userId}:${permissionName}`,
              error: errorMessage
            });
            result.errorCount++;
          }

          processedItems++;
          result.progress = Math.round((processedItems / result.totalItems) * 100);
        }
      }

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: initiatedBy,
          propertyId: operation.propertyId,
          action: `BULK_PERMISSION_${operation.operation.toUpperCase()}`,
          resource: 'permission',
          resourceId: operationId,
          details: {
            operation,
            result: {
              successCount: result.successCount,
              errorCount: result.errorCount
            }
          }
        }
      });

      result.status = 'completed';
      result.completedAt = new Date();

      await prisma.bulkOperation.update({
        where: { id: operationId },
        data: {
          status: 'completed',
          completedAt: result.completedAt,
          results: result
        }
      });

      return result;

    } catch (error) {
      console.error('Bulk permission operation error:', error);
      
      await prisma.bulkOperation.update({
        where: { id: operationId },
        data: { status: 'failed' }
      });

      throw error;
    }
  }

  /**
   * Bulk role assignment
   */
  static async bulkAssignRoles(
    operation: BulkRoleAssignment,
    initiatedBy: number
  ): Promise<BulkOperationResult> {
    const operationId = `bulk_role_assignment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const bulkOperation = await prisma.bulkOperation.create({
        data: {
          id: operationId,
          type: 'role_assignment',
          targetType: 'users',
          targetIds: operation.userIds,
          operation: operation,
          status: 'in_progress',
          totalItems: operation.userIds.length,
          initiatedBy
        }
      });

      const result: BulkOperationResult = {
        operationId,
        status: 'in_progress',
        progress: 0,
        totalItems: operation.userIds.length,
        successCount: 0,
        errorCount: 0,
        results: [],
        errors: [],
        startedAt: new Date()
      };

      for (const userId of operation.userIds) {
        try {
          const oldUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, email: true }
          });

          if (!oldUser) {
            result.errors.push({
              targetId: userId,
              error: 'User not found'
            });
            result.errorCount++;
            continue;
          }

          await prisma.user.update({
            where: { id: userId },
            data: { role: operation.role }
          });

          // Invalidate inheritance cache
          await PermissionInheritanceEngine.invalidateInheritanceCache(userId);

          // Invalidate cache for role change
          await CacheInvalidationService.invalidate('user_role_changed', {
            userId,
            role: operation.role,
            reason: operation.reason || 'Bulk role assignment'
          });

          result.results.push({
            targetId: userId,
            status: 'success',
            message: `Role changed from ${oldUser.role} to ${operation.role}`,
            data: { 
              userId, 
              email: oldUser.email,
              oldRole: oldUser.role, 
              newRole: operation.role 
            }
          });
          result.successCount++;

          // Audit log
          await prisma.auditLog.create({
            data: {
              userId: initiatedBy,
              action: 'BULK_ROLE_ASSIGNED',
              resource: 'user',
              resourceId: userId.toString(),
              details: {
                bulkOperationId: operationId,
                targetUserId: userId,
                oldRole: oldUser.role,
                newRole: operation.role,
                reason: operation.reason
              }
            }
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push({
            targetId: userId,
            error: errorMessage
          });
          result.errorCount++;
        }

        result.progress = Math.round(((result.successCount + result.errorCount) / result.totalItems) * 100);
      }

      result.status = 'completed';
      result.completedAt = new Date();

      await prisma.bulkOperation.update({
        where: { id: operationId },
        data: {
          status: 'completed',
          completedAt: result.completedAt,
          results: result
        }
      });

      return result;

    } catch (error) {
      console.error('Bulk role assignment error:', error);
      
      await prisma.bulkOperation.update({
        where: { id: operationId },
        data: { status: 'failed' }
      });

      throw error;
    }
  }

  /**
   * Bulk property access management
   */
  static async bulkPropertyAccess(
    operation: BulkPropertyAccessOperation,
    initiatedBy: number
  ): Promise<BulkOperationResult> {
    const operationId = `bulk_property_access_${operation.operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const bulkOperation = await prisma.bulkOperation.create({
        data: {
          id: operationId,
          type: 'permission_grant',
          targetType: 'properties',
          targetIds: operation.userIds,
          operation: operation,
          status: 'in_progress',
          totalItems: operation.userIds.length,
          initiatedBy
        }
      });

      const result: BulkOperationResult = {
        operationId,
        status: 'in_progress',
        progress: 0,
        totalItems: operation.userIds.length,
        successCount: 0,
        errorCount: 0,
        results: [],
        errors: [],
        startedAt: new Date()
      };

      for (const userId of operation.userIds) {
        try {
          if (operation.operation === 'grant') {
            await prisma.propertyAccess.upsert({
              where: {
                userId_propertyId: {
                  userId,
                  propertyId: operation.propertyId
                }
              },
              update: {
                accessLevel: operation.accessLevel,
                grantedBy: initiatedBy,
                grantedAt: new Date(),
                expiresAt: operation.expiresAt
              },
              create: {
                userId,
                propertyId: operation.propertyId,
                accessLevel: operation.accessLevel,
                grantedBy: initiatedBy,
                expiresAt: operation.expiresAt
              }
            });
          } else {
            await prisma.propertyAccess.delete({
              where: {
                userId_propertyId: {
                  userId,
                  propertyId: operation.propertyId
                }
              }
            });
          }

          // Invalidate cache
          await PermissionInheritanceEngine.invalidateInheritanceCache(userId, operation.propertyId);
          
          result.results.push({
            targetId: userId,
            status: 'success',
            message: `Property access ${operation.operation}ed successfully`
          });
          result.successCount++;

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push({
            targetId: userId,
            error: errorMessage
          });
          result.errorCount++;
        }

        result.progress = Math.round(((result.successCount + result.errorCount) / result.totalItems) * 100);
      }

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: initiatedBy,
          propertyId: operation.propertyId,
          action: `BULK_PROPERTY_ACCESS_${operation.operation.toUpperCase()}`,
          resource: 'property_access',
          resourceId: operationId,
          details: {
            operation,
            result: {
              successCount: result.successCount,
              errorCount: result.errorCount
            }
          }
        }
      });

      result.status = 'completed';
      result.completedAt = new Date();

      await prisma.bulkOperation.update({
        where: { id: operationId },
        data: {
          status: 'completed',
          completedAt: result.completedAt,
          results: result
        }
      });

      return result;

    } catch (error) {
      console.error('Bulk property access error:', error);
      
      await prisma.bulkOperation.update({
        where: { id: operationId },
        data: { status: 'failed' }
      });

      throw error;
    }
  }

  /**
   * Get bulk operation status
   */
  static async getBulkOperationStatus(operationId: string): Promise<BulkOperationResult | null> {
    try {
      const operation = await prisma.bulkOperation.findUnique({
        where: { id: operationId },
        include: {
          initiator: { select: { id: true, name: true, email: true } }
        }
      });

      if (!operation) return null;

      return {
        operationId: operation.id,
        status: operation.status as any,
        progress: operation.progress,
        totalItems: operation.totalItems,
        successCount: 0, // Would be calculated from results
        errorCount: 0, // Would be calculated from results
        results: (operation.results as any)?.results || [],
        errors: (operation.results as any)?.errors || [],
        startedAt: operation.initiatedAt,
        completedAt: operation.completedAt || undefined
      };

    } catch (error) {
      console.error('Error getting bulk operation status:', error);
      return null;
    }
  }

  /**
   * Cancel bulk operation
   */
  static async cancelBulkOperation(operationId: string, cancelledBy: number): Promise<boolean> {
    try {
      await prisma.bulkOperation.update({
        where: { id: operationId },
        data: { status: 'cancelled' }
      });

      await prisma.auditLog.create({
        data: {
          userId: cancelledBy,
          action: 'BULK_OPERATION_CANCELLED',
          resource: 'bulk_operation',
          resourceId: operationId,
          details: { cancelledBy }
        }
      });

      return true;
    } catch (error) {
      console.error('Error cancelling bulk operation:', error);
      return false;
    }
  }

  /**
   * Get bulk operations history
   */
  static async getBulkOperationsHistory(
    initiatedBy?: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    operations: any[];
    total: number;
  }> {
    try {
      const where = initiatedBy ? { initiatedBy } : {};

      const [operations, total] = await Promise.all([
        prisma.bulkOperation.findMany({
          where,
          include: {
            initiator: { select: { id: true, name: true, email: true } }
          },
          orderBy: { initiatedAt: 'desc' },
          take: limit,
          skip: offset
        }),
        prisma.bulkOperation.count({ where })
      ]);

      return { operations, total };

    } catch (error) {
      console.error('Error getting bulk operations history:', error);
      return { operations: [], total: 0 };
    }
  }

  /**
   * Generate random password
   */
  private static generatePassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }
}