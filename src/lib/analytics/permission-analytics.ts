/**
 * Permission Usage Analytics System
 * Provides insights into permission usage, optimization recommendations, and compliance metrics
 */

import { prisma } from "@/lib/prisma";
import type { UserRole, PropertyAccessLevel } from "@/types";

export interface PermissionUsageMetrics {
  totalPermissions: number;
  activePermissions: number;
  unusedPermissions: number;
  overPrivilegedUsers: number;
  underPrivilegedUsers: number;
  duplicatePermissions: number;
  expiringPermissions: number;
  lastAnalysis: Date;
}

export interface UserPermissionAnalysis {
  userId: number;
  userName: string;
  email: string;
  role: UserRole;
  totalPermissions: number;
  usedPermissions: number;
  unusedPermissions: string[];
  riskScore: number;
  lastActivity: Date | null;
  recommendations: string[];
}

export interface PermissionUsagePattern {
  permission: string;
  totalUsers: number;
  activeUsers: number;
  usageFrequency: number;
  lastUsed: Date | null;
  category: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface ComplianceMetrics {
  totalUsers: number;
  compliantUsers: number;
  violationCount: number;
  violations: Array<{
    type: 'excessive_permissions' | 'stale_access' | 'role_mismatch' | 'policy_violation';
    userId: number;
    userName: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    detectedAt: Date;
  }>;
  complianceScore: number;
}

export interface OptimizationRecommendation {
  id: string;
  type: 'permission_cleanup' | 'role_adjustment' | 'access_review' | 'template_creation';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  effort: 'minimal' | 'moderate' | 'significant';
  affectedUsers: number;
  potentialSavings: {
    securityImprovement: number;
    adminEffort: number;
    complianceScore: number;
  };
  actionItems: string[];
  estimatedTimeToImplement: string;
}

/**
 * Permission Analytics Service
 */
export class PermissionAnalyticsService {

  /**
   * Generate comprehensive permission usage metrics
   */
  static async getPermissionUsageMetrics(
    timeframe: '7d' | '30d' | '90d' = '30d'
  ): Promise<PermissionUsageMetrics> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - (timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90));

      // Get all permissions
      const totalPermissions = await prisma.permission.count();

      // Get active user permissions
      const activeUserPermissions = await prisma.userPermission.count({
        where: {
          granted: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      });

      // Get permissions that have been used (via audit logs)
      const usedPermissions = await prisma.auditLog.findMany({
        where: {
          timestamp: { gte: since },
          action: { not: { in: ['LOGIN_SUCCESS', 'LOGIN_FAILED'] } }
        },
        select: { userId: true },
        distinct: ['userId']
      });

      // Get expiring permissions (next 30 days)
      const expiringDate = new Date();
      expiringDate.setDate(expiringDate.getDate() + 30);
      
      const expiringPermissions = await prisma.userPermission.count({
        where: {
          granted: true,
          expiresAt: {
            gte: new Date(),
            lte: expiringDate
          }
        }
      });

      // Analyze privilege levels
      const users = await prisma.user.findMany({
        include: {
          userPermissions: {
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

      let overPrivilegedUsers = 0;
      let underPrivilegedUsers = 0;

      for (const user of users) {
        const permissionCount = user.userPermissions.length;
        const roleBasedExpectedPermissions = this.getExpectedPermissionCountForRole(user.role);
        
        if (permissionCount > roleBasedExpectedPermissions * 1.5) {
          overPrivilegedUsers++;
        } else if (permissionCount < roleBasedExpectedPermissions * 0.5) {
          underPrivilegedUsers++;
        }
      }

      return {
        totalPermissions,
        activePermissions: activeUserPermissions,
        unusedPermissions: totalPermissions - usedPermissions.length,
        overPrivilegedUsers,
        underPrivilegedUsers,
        duplicatePermissions: 0, // Would calculate actual duplicates
        expiringPermissions,
        lastAnalysis: new Date()
      };

    } catch (error) {
      console.error('Error getting permission usage metrics:', error);
      throw error;
    }
  }

  /**
   * Analyze individual user permissions
   */
  static async analyzeUserPermissions(userId: number): Promise<UserPermissionAnalysis> {
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
          },
          auditLogs: {
            where: {
              timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            },
            orderBy: { timestamp: 'desc' },
            take: 1
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const totalPermissions = user.userPermissions.length;
      
      // Get used permissions from audit logs
      const usedPermissionNames = await this.getUserUsedPermissions(userId, 30);
      const usedPermissions = usedPermissionNames.length;
      
      const allUserPermissionNames = user.userPermissions.map(up => 
        `${up.permission.resource}.${up.permission.action}`
      );
      
      const unusedPermissions = allUserPermissionNames.filter(
        perm => !usedPermissionNames.includes(perm)
      );

      // Calculate risk score based on various factors
      const riskScore = this.calculateUserRiskScore(user, unusedPermissions.length, totalPermissions);

      // Generate recommendations
      const recommendations = this.generateUserRecommendations(user, unusedPermissions, riskScore);

      return {
        userId: user.id,
        userName: user.name || 'Unknown',
        email: user.email,
        role: user.role,
        totalPermissions,
        usedPermissions,
        unusedPermissions,
        riskScore,
        lastActivity: user.auditLogs[0]?.timestamp || null,
        recommendations
      };

    } catch (error) {
      console.error('Error analyzing user permissions:', error);
      throw error;
    }
  }

  /**
   * Get permission usage patterns
   */
  static async getPermissionUsagePatterns(
    timeframe: '7d' | '30d' | '90d' = '30d'
  ): Promise<PermissionUsagePattern[]> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - (timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90));

      const permissions = await prisma.permission.findMany({
        include: {
          userPermissions: {
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

      const patterns: PermissionUsagePattern[] = [];

      for (const permission of permissions) {
        const permissionName = `${permission.resource}.${permission.action}`;
        const totalUsers = permission.userPermissions.length;
        
        // Get usage from audit logs
        const usageCount = await prisma.auditLog.count({
          where: {
            timestamp: { gte: since },
            details: {
              path: ['requiredPermission'],
              equals: permissionName
            }
          }
        });

        const lastUsage = await prisma.auditLog.findFirst({
          where: {
            details: {
              path: ['requiredPermission'],
              equals: permissionName
            }
          },
          orderBy: { timestamp: 'desc' }
        });

        // Estimate active users (those who have used this permission)
        const activeUsersCount = await prisma.auditLog.findMany({
          where: {
            timestamp: { gte: since },
            details: {
              path: ['requiredPermission'],
              equals: permissionName
            }
          },
          select: { userId: true },
          distinct: ['userId']
        });

        const usageFrequency = totalUsers > 0 ? (usageCount / totalUsers) : 0;
        const riskLevel = this.calculatePermissionRiskLevel(permission, usageFrequency, totalUsers);

        patterns.push({
          permission: permissionName,
          totalUsers,
          activeUsers: activeUsersCount.length,
          usageFrequency,
          lastUsed: lastUsage?.timestamp || null,
          category: permission.category,
          riskLevel
        });
      }

      return patterns.sort((a, b) => b.usageFrequency - a.usageFrequency);

    } catch (error) {
      console.error('Error getting permission usage patterns:', error);
      return [];
    }
  }

  /**
   * Generate compliance metrics
   */
  static async getComplianceMetrics(): Promise<ComplianceMetrics> {
    try {
      const totalUsers = await prisma.user.count({ where: { isActive: true } });
      
      const users = await prisma.user.findMany({
        where: { isActive: true },
        include: {
          userPermissions: {
            where: {
              granted: true,
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } }
              ]
            }
          },
          auditLogs: {
            where: {
              timestamp: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
            },
            take: 1,
            orderBy: { timestamp: 'desc' }
          }
        }
      });

      const violations: ComplianceMetrics['violations'] = [];
      let compliantUsers = 0;

      for (const user of users) {
        let userCompliant = true;
        
        // Check for excessive permissions
        const expectedPermissions = this.getExpectedPermissionCountForRole(user.role);
        if (user.userPermissions.length > expectedPermissions * 2) {
          violations.push({
            type: 'excessive_permissions',
            userId: user.id,
            userName: user.name || 'Unknown',
            description: `User has ${user.userPermissions.length} permissions, expected ~${expectedPermissions}`,
            severity: 'high',
            detectedAt: new Date()
          });
          userCompliant = false;
        }

        // Check for stale access (no activity in 90 days)
        if (!user.auditLogs.length) {
          violations.push({
            type: 'stale_access',
            userId: user.id,
            userName: user.name || 'Unknown',
            description: 'User has not been active in the last 90 days',
            severity: 'medium',
            detectedAt: new Date()
          });
          userCompliant = false;
        }

        // Check for role mismatches
        const hasAdminPermissions = user.userPermissions.some(up => 
          up.permission?.resource === 'users' && up.permission?.action === 'DELETE'
        );
        
        if (hasAdminPermissions && !['super_admin', 'property_admin'].includes(user.role)) {
          violations.push({
            type: 'role_mismatch',
            userId: user.id,
            userName: user.name || 'Unknown',
            description: `User has admin permissions but role is ${user.role}`,
            severity: 'critical',
            detectedAt: new Date()
          });
          userCompliant = false;
        }

        if (userCompliant) {
          compliantUsers++;
        }
      }

      const complianceScore = totalUsers > 0 ? Math.round((compliantUsers / totalUsers) * 100) : 100;

      return {
        totalUsers,
        compliantUsers,
        violationCount: violations.length,
        violations,
        complianceScore
      };

    } catch (error) {
      console.error('Error getting compliance metrics:', error);
      throw error;
    }
  }

  /**
   * Generate optimization recommendations
   */
  static async getOptimizationRecommendations(): Promise<OptimizationRecommendation[]> {
    try {
      const recommendations: OptimizationRecommendation[] = [];

      // Get metrics for analysis
      const metrics = await this.getPermissionUsageMetrics();
      const compliance = await this.getComplianceMetrics();
      const patterns = await this.getPermissionUsagePatterns();

      // Recommendation 1: Cleanup unused permissions
      if (metrics.unusedPermissions > 10) {
        recommendations.push({
          id: 'cleanup_unused_permissions',
          type: 'permission_cleanup',
          priority: 'high',
          title: 'Clean Up Unused Permissions',
          description: `${metrics.unusedPermissions} permissions are not being used by any active users`,
          impact: 'Reduces security surface area and improves system clarity',
          effort: 'minimal',
          affectedUsers: 0,
          potentialSavings: {
            securityImprovement: 15,
            adminEffort: 10,
            complianceScore: 5
          },
          actionItems: [
            'Review unused permission list',
            'Verify permissions are truly unnecessary',
            'Archive or remove unused permissions',
            'Update role templates if needed'
          ],
          estimatedTimeToImplement: '2-4 hours'
        });
      }

      // Recommendation 2: Address over-privileged users
      if (metrics.overPrivilegedUsers > 0) {
        recommendations.push({
          id: 'reduce_over_privileged_users',
          type: 'access_review',
          priority: 'critical',
          title: 'Review Over-Privileged Users',
          description: `${metrics.overPrivilegedUsers} users have significantly more permissions than typical for their role`,
          impact: 'Major reduction in security risk and compliance violations',
          effort: 'moderate',
          affectedUsers: metrics.overPrivilegedUsers,
          potentialSavings: {
            securityImprovement: 30,
            adminEffort: 5,
            complianceScore: 20
          },
          actionItems: [
            'Review each over-privileged user individually',
            'Justify additional permissions or remove them',
            'Consider role adjustments if appropriate',
            'Implement regular access reviews'
          ],
          estimatedTimeToImplement: '1-2 days'
        });
      }

      // Recommendation 3: Address expiring permissions
      if (metrics.expiringPermissions > 5) {
        recommendations.push({
          id: 'manage_expiring_permissions',
          type: 'access_review',
          priority: 'medium',
          title: 'Manage Expiring Permissions',
          description: `${metrics.expiringPermissions} permissions will expire in the next 30 days`,
          impact: 'Prevents access disruptions and maintains operational continuity',
          effort: 'minimal',
          affectedUsers: metrics.expiringPermissions,
          potentialSavings: {
            securityImprovement: 5,
            adminEffort: 15,
            complianceScore: 10
          },
          actionItems: [
            'Review expiring permissions list',
            'Extend permissions that are still needed',
            'Allow others to expire naturally',
            'Set up automated expiration notifications'
          ],
          estimatedTimeToImplement: '2-3 hours'
        });
      }

      // Recommendation 4: Create permission templates
      const hasLowUsagePatterns = patterns.filter(p => p.usageFrequency < 0.1).length > 10;
      if (hasLowUsagePatterns) {
        recommendations.push({
          id: 'create_permission_templates',
          type: 'template_creation',
          priority: 'medium',
          title: 'Create Permission Templates',
          description: 'Many permissions show low usage patterns, suggesting need for standardized templates',
          impact: 'Improves consistency and reduces administrative overhead',
          effort: 'moderate',
          affectedUsers: 0,
          potentialSavings: {
            securityImprovement: 10,
            adminEffort: 25,
            complianceScore: 15
          },
          actionItems: [
            'Analyze common permission patterns',
            'Create role-based templates',
            'Create department-based templates',
            'Train administrators on template usage'
          ],
          estimatedTimeToImplement: '1-2 weeks'
        });
      }

      // Sort by priority and potential impact
      return recommendations.sort((a, b) => {
        const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        const aPriority = priorityOrder[a.priority];
        const bPriority = priorityOrder[b.priority];
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        const aImpact = a.potentialSavings.securityImprovement + a.potentialSavings.complianceScore;
        const bImpact = b.potentialSavings.securityImprovement + b.potentialSavings.complianceScore;
        
        return bImpact - aImpact;
      });

    } catch (error) {
      console.error('Error generating optimization recommendations:', error);
      return [];
    }
  }

  /**
   * Get detailed analytics dashboard data
   */
  static async getAnalyticsDashboard(timeframe: '7d' | '30d' | '90d' = '30d'): Promise<{
    metrics: PermissionUsageMetrics;
    compliance: ComplianceMetrics;
    topPatterns: PermissionUsagePattern[];
    recommendations: OptimizationRecommendation[];
    trends: Array<{
      date: Date;
      activeUsers: number;
      permissionGrants: number;
      securityIncidents: number;
    }>;
  }> {
    try {
      const [metrics, compliance, patterns, recommendations] = await Promise.all([
        this.getPermissionUsageMetrics(timeframe),
        this.getComplianceMetrics(),
        this.getPermissionUsagePatterns(timeframe),
        this.getOptimizationRecommendations()
      ]);

      // Generate trend data
      const trends = await this.generateTrendData(timeframe);

      return {
        metrics,
        compliance,
        topPatterns: patterns.slice(0, 10),
        recommendations: recommendations.slice(0, 5),
        trends
      };

    } catch (error) {
      console.error('Error getting analytics dashboard:', error);
      throw error;
    }
  }

  // Helper methods

  private static getExpectedPermissionCountForRole(role: UserRole): number {
    const rolePermissionCounts: Record<UserRole, number> = {
      'readonly': 5,
      'viewer': 10,
      'staff': 15,
      'supervisor': 25,
      'outlet_manager': 40,
      'property_manager': 60,
      'property_admin': 80,
      'super_admin': 100
    };

    return rolePermissionCounts[role] || 15;
  }

  private static async getUserUsedPermissions(userId: number, days: number): Promise<string[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        userId,
        timestamp: { gte: since }
      },
      select: { details: true }
    });

    const usedPermissions = new Set<string>();
    
    auditLogs.forEach(log => {
      const details = log.details as any;
      if (details?.requiredPermission) {
        usedPermissions.add(details.requiredPermission);
      }
    });

    return Array.from(usedPermissions);
  }

  private static calculateUserRiskScore(user: any, unusedCount: number, totalCount: number): number {
    let riskScore = 0;
    
    // Base risk from role
    const roleRisk = { 'super_admin': 40, 'property_admin': 30, 'property_manager': 20 };
    riskScore += roleRisk[user.role as keyof typeof roleRisk] || 10;
    
    // Risk from unused permissions
    if (totalCount > 0) {
      riskScore += (unusedCount / totalCount) * 30;
    }
    
    // Risk from inactivity
    if (user.auditLogs.length === 0) {
      riskScore += 20;
    }
    
    // Risk from excessive permissions
    const expected = this.getExpectedPermissionCountForRole(user.role);
    if (totalCount > expected * 1.5) {
      riskScore += 20;
    }

    return Math.min(Math.round(riskScore), 100);
  }

  private static generateUserRecommendations(user: any, unusedPermissions: string[], riskScore: number): string[] {
    const recommendations: string[] = [];
    
    if (unusedPermissions.length > 5) {
      recommendations.push(`Review and remove ${unusedPermissions.length} unused permissions`);
    }
    
    if (riskScore > 70) {
      recommendations.push('High risk user - requires immediate review');
    }
    
    if (user.auditLogs.length === 0) {
      recommendations.push('User appears inactive - consider access review');
    }
    
    const totalPermissions = user.userPermissions.length;
    const expected = this.getExpectedPermissionCountForRole(user.role);
    
    if (totalPermissions > expected * 1.5) {
      recommendations.push(`Consider role adjustment - has ${totalPermissions} permissions vs expected ${expected}`);
    }

    return recommendations;
  }

  private static calculatePermissionRiskLevel(
    permission: any, 
    usageFrequency: number, 
    totalUsers: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (permission.category === 'SYSTEM_ADMIN' && usageFrequency < 0.1) {
      return 'critical';
    }
    
    if (totalUsers > 50 && usageFrequency < 0.05) {
      return 'high';
    }
    
    if (totalUsers > 20 && usageFrequency < 0.1) {
      return 'medium';
    }
    
    return 'low';
  }

  private static async generateTrendData(timeframe: '7d' | '30d' | '90d'): Promise<Array<{
    date: Date;
    activeUsers: number;
    permissionGrants: number;
    securityIncidents: number;
  }>> {
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const trends: Array<{
      date: Date;
      activeUsers: number;
      permissionGrants: number;
      securityIncidents: number;
    }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      // Get active users for the day
      const activeUsers = await prisma.auditLog.findMany({
        where: {
          timestamp: { gte: date, lt: nextDate }
        },
        select: { userId: true },
        distinct: ['userId']
      });

      // Get permission grants for the day
      const permissionGrants = await prisma.auditLog.count({
        where: {
          timestamp: { gte: date, lt: nextDate },
          action: { in: ['PERMISSION_GRANTED', 'BULK_PERMISSION_GRANT'] }
        }
      });

      // Get security incidents for the day
      const securityIncidents = await prisma.auditLog.count({
        where: {
          timestamp: { gte: date, lt: nextDate },
          action: 'SECURITY_THREAT_DETECTED'
        }
      });

      trends.push({
        date,
        activeUsers: activeUsers.length,
        permissionGrants,
        securityIncidents
      });
    }

    return trends;
  }
}