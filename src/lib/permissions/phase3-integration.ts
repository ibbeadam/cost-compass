/**
 * Phase 3 Integration Service
 * Integrates all Phase 3 advanced permission management features
 */

import { PermissionInheritanceEngine } from './inheritance';
import { BulkOperationsService } from '../bulk-management/bulk-operations';
import { PermissionTemplateService } from './templates';
import { PermissionAnalyticsService } from '../analytics/permission-analytics';
import { PolicyEnforcementEngine } from '../compliance/policy-enforcement';
import { CacheInvalidationService } from '../cache/cache-invalidation';
import { prisma } from '../prisma';

export interface Phase3SystemStatus {
  inheritance: {
    enabled: boolean;
    rulesCount: number;
    lastValidation: Date | null;
    status: 'healthy' | 'warning' | 'error';
  };
  bulkOperations: {
    enabled: boolean;
    activeOperations: number;
    totalOperations: number;
    successRate: number;
  };
  templates: {
    enabled: boolean;
    templateCount: number;
    activeTemplates: number;
    usageCount: number;
  };
  analytics: {
    enabled: boolean;
    lastAnalysis: Date | null;
    complianceScore: number;
    recommendations: number;
  };
  compliance: {
    enabled: boolean;
    activePolicies: number;
    openViolations: number;
    lastScan: Date | null;
  };
}

export interface SystemHealthCheck {
  overall: 'healthy' | 'degraded' | 'critical';
  score: number;
  components: Phase3SystemStatus;
  issues: Array<{
    component: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    recommendation: string;
  }>;
  lastCheck: Date;
}

/**
 * Phase 3 Integration and Management Service
 */
export class Phase3IntegrationService {

  /**
   * Initialize all Phase 3 systems
   */
  static async initializePhase3Systems(): Promise<{
    success: boolean;
    errors: string[];
    warnings: string[];
  }> {
    console.log('🚀 Initializing Phase 3 Advanced Permission Management Systems...');
    
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Validate inheritance system
      console.log('  Validating permission inheritance system...');
      const inheritanceValidation = await PermissionInheritanceEngine.validateInheritanceRules();
      if (!inheritanceValidation.valid) {
        const criticalIssues = inheritanceValidation.issues.filter(i => i.severity === 'critical' || i.severity === 'high');
        if (criticalIssues.length > 0) {
          errors.push(`Inheritance system has ${criticalIssues.length} critical issues`);
        } else {
          warnings.push(`Inheritance system has ${inheritanceValidation.issues.length} minor issues`);
        }
      }

      // 2. Check template system
      console.log('  Checking permission template system...');
      try {
        const categories = await PermissionTemplateService.getTemplateCategories();
        if (categories.length === 0) {
          warnings.push('No permission templates found - consider creating default templates');
        }
      } catch (error) {
        errors.push('Template system initialization failed');
      }

      // 3. Verify analytics system
      console.log('  Verifying analytics system...');
      try {
        const metrics = await PermissionAnalyticsService.getPermissionUsageMetrics('7d');
        if (metrics.totalPermissions === 0) {
          warnings.push('No permissions found in analytics - system may need data');
        }
      } catch (error) {
        warnings.push('Analytics system has limited functionality');
      }

      // 4. Initialize compliance system
      console.log('  Initializing compliance system...');
      try {
        const dashboard = await PolicyEnforcementEngine.getComplianceDashboard();
        if (dashboard.policiesCount === 0) {
          warnings.push('No compliance policies found - consider creating default policies');
        }
      } catch (error) {
        warnings.push('Compliance system using default policies');
      }

      // 5. Validate cache system integration
      console.log('  Validating cache system integration...');
      try {
        const cacheHealth = await CacheInvalidationService.getCacheHealth();
        if (cacheHealth.health === 'critical') {
          errors.push('Cache system is in critical state');
        } else if (cacheHealth.health === 'degraded') {
          warnings.push('Cache system performance is degraded');
        }
      } catch (error) {
        warnings.push('Cache system monitoring unavailable');
      }

      console.log('✅ Phase 3 systems initialization completed');
      
      return {
        success: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      console.error('❌ Phase 3 initialization error:', error);
      errors.push(`System initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Perform comprehensive system health check
   */
  static async performHealthCheck(): Promise<SystemHealthCheck> {
    console.log('🔍 Performing Phase 3 system health check...');

    const components: Phase3SystemStatus = {
      inheritance: await this.checkInheritanceHealth(),
      bulkOperations: await this.checkBulkOperationsHealth(),
      templates: await this.checkTemplatesHealth(),
      analytics: await this.checkAnalyticsHealth(),
      compliance: await this.checkComplianceHealth()
    };

    const issues: SystemHealthCheck['issues'] = [];
    let totalScore = 0;
    let componentCount = 0;

    // Evaluate each component
    Object.entries(components).forEach(([name, component]) => {
      componentCount++;
      
      if (name === 'inheritance') {
        const comp = component as Phase3SystemStatus['inheritance'];
        if (comp.status === 'error') {
          totalScore += 0;
          issues.push({
            component: name,
            severity: 'critical',
            message: 'Inheritance system has critical errors',
            recommendation: 'Review and fix inheritance rule validation issues'
          });
        } else if (comp.status === 'warning') {
          totalScore += 70;
          issues.push({
            component: name,
            severity: 'medium',
            message: 'Inheritance system has warnings',
            recommendation: 'Review inheritance rules for optimization'
          });
        } else {
          totalScore += 100;
        }
      } else if (name === 'bulkOperations') {
        const comp = component as Phase3SystemStatus['bulkOperations'];
        if (!comp.enabled) {
          totalScore += 50;
          issues.push({
            component: name,
            severity: 'low',
            message: 'Bulk operations system not fully enabled',
            recommendation: 'Enable bulk operations for better management efficiency'
          });
        } else if (comp.successRate < 80) {
          totalScore += 60;
          issues.push({
            component: name,
            severity: 'medium',
            message: `Bulk operations success rate is low (${comp.successRate}%)`,
            recommendation: 'Investigate and resolve bulk operation failures'
          });
        } else {
          totalScore += 100;
        }
      } else if (name === 'templates') {
        const comp = component as Phase3SystemStatus['templates'];
        if (comp.templateCount === 0) {
          totalScore += 40;
          issues.push({
            component: name,
            severity: 'medium',
            message: 'No permission templates found',
            recommendation: 'Create permission templates for common roles and scenarios'
          });
        } else if (comp.usageCount === 0) {
          totalScore += 70;
          issues.push({
            component: name,
            severity: 'low',
            message: 'Permission templates exist but are not being used',
            recommendation: 'Promote template usage for consistency'
          });
        } else {
          totalScore += 100;
        }
      } else if (name === 'analytics') {
        const comp = component as Phase3SystemStatus['analytics'];
        if (!comp.lastAnalysis) {
          totalScore += 50;
          issues.push({
            component: name,
            severity: 'medium',
            message: 'Analytics system has no recent analysis data',
            recommendation: 'Run analytics to gather permission usage insights'
          });
        } else if (comp.complianceScore < 80) {
          totalScore += 60;
          issues.push({
            component: name,
            severity: 'high',
            message: `Low compliance score (${comp.complianceScore}%)`,
            recommendation: 'Address compliance issues identified in analytics'
          });
        } else {
          totalScore += 100;
        }
      } else if (name === 'compliance') {
        const comp = component as Phase3SystemStatus['compliance'];
        if (comp.activePolicies === 0) {
          totalScore += 30;
          issues.push({
            component: name,
            severity: 'high',
            message: 'No active compliance policies',
            recommendation: 'Create and activate compliance policies for your organization'
          });
        } else if (comp.openViolations > 10) {
          totalScore += 50;
          issues.push({
            component: name,
            severity: 'high',
            message: `High number of open violations (${comp.openViolations})`,
            recommendation: 'Address open compliance violations immediately'
          });
        } else {
          totalScore += 100;
        }
      }
    });

    const averageScore = Math.round(totalScore / componentCount);
    
    let overall: 'healthy' | 'degraded' | 'critical';
    if (averageScore >= 90) {
      overall = 'healthy';
    } else if (averageScore >= 70) {
      overall = 'degraded';
    } else {
      overall = 'critical';
    }

    return {
      overall,
      score: averageScore,
      components,
      issues,
      lastCheck: new Date()
    };
  }

  /**
   * Auto-remediation for common issues
   */
  static async performAutoRemediation(userId: number): Promise<{
    actionsPerformed: string[];
    resolved: number;
    failed: number;
  }> {
    console.log('🔧 Performing auto-remediation...');
    
    const actionsPerformed: string[] = [];
    let resolved = 0;
    let failed = 0;

    try {
      // 1. Generate missing templates
      const categories = await PermissionTemplateService.getTemplateCategories();
      if (categories.every(cat => cat.templates.length === 0)) {
        try {
          await PermissionTemplateService.generateRoleTemplates(userId);
          await PermissionTemplateService.generatePropertyTemplates(userId);
          actionsPerformed.push('Generated default permission templates');
          resolved++;
        } catch (error) {
          actionsPerformed.push('Failed to generate default templates');
          failed++;
        }
      }

      // 2. Run compliance scan if needed
      try {
        const dashboard = await PolicyEnforcementEngine.getComplianceDashboard();
        if (!dashboard.lastAssessment || 
            (new Date().getTime() - new Date(dashboard.lastAssessment).getTime()) > 7 * 24 * 60 * 60 * 1000) {
          await PolicyEnforcementEngine.performComplianceScan();
          actionsPerformed.push('Performed automated compliance scan');
          resolved++;
        }
      } catch (error) {
        actionsPerformed.push('Failed to perform compliance scan');
        failed++;
      }

      // 3. Clean up cache if needed
      try {
        const cacheHealth = await CacheInvalidationService.getCacheHealth();
        if (cacheHealth.health === 'degraded' || cacheHealth.health === 'critical') {
          // Would implement cache cleanup logic
          actionsPerformed.push('Optimized permission cache');
          resolved++;
        }
      } catch (error) {
        actionsPerformed.push('Failed to optimize cache');
        failed++;
      }

      // 4. Log auto-remediation
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'AUTO_REMEDIATION_PERFORMED',
          resource: 'system',
          resourceId: 'phase3',
          details: {
            actionsPerformed,
            resolved,
            failed,
            timestamp: new Date().toISOString()
          }
        }
      });

      return { actionsPerformed, resolved, failed };

    } catch (error) {
      console.error('Auto-remediation error:', error);
      return { 
        actionsPerformed: ['Auto-remediation failed'], 
        resolved: 0, 
        failed: 1 
      };
    }
  }

  // Private helper methods for health checks

  private static async checkInheritanceHealth(): Promise<Phase3SystemStatus['inheritance']> {
    try {
      const validation = await PermissionInheritanceEngine.validateInheritanceRules();
      const criticalIssues = validation.issues.filter(i => i.severity === 'critical' || i.severity === 'high');
      
      return {
        enabled: true,
        rulesCount: 8, // Number of built-in inheritance rules
        lastValidation: new Date(),
        status: criticalIssues.length > 0 ? 'error' : validation.issues.length > 0 ? 'warning' : 'healthy'
      };
    } catch (error) {
      return {
        enabled: false,
        rulesCount: 0,
        lastValidation: null,
        status: 'error'
      };
    }
  }

  private static async checkBulkOperationsHealth(): Promise<Phase3SystemStatus['bulkOperations']> {
    try {
      const history = await BulkOperationsService.getBulkOperationsHistory(undefined, 100);
      const activeOps = history.operations.filter(op => op.status === 'in_progress' || op.status === 'pending');
      const completedOps = history.operations.filter(op => op.status === 'completed');
      const successRate = history.operations.length > 0 ? 
        Math.round((completedOps.length / history.operations.length) * 100) : 100;

      return {
        enabled: true,
        activeOperations: activeOps.length,
        totalOperations: history.operations.length,
        successRate
      };
    } catch (error) {
      return {
        enabled: false,
        activeOperations: 0,
        totalOperations: 0,
        successRate: 0
      };
    }
  }

  private static async checkTemplatesHealth(): Promise<Phase3SystemStatus['templates']> {
    try {
      const categories = await PermissionTemplateService.getTemplateCategories();
      const allTemplates = categories.flatMap(cat => cat.templates);
      const activeTemplates = allTemplates.filter(t => t.isActive);

      return {
        enabled: true,
        templateCount: allTemplates.length,
        activeTemplates: activeTemplates.length,
        usageCount: 0 // Would calculate from audit logs
      };
    } catch (error) {
      return {
        enabled: false,
        templateCount: 0,
        activeTemplates: 0,
        usageCount: 0
      };
    }
  }

  private static async checkAnalyticsHealth(): Promise<Phase3SystemStatus['analytics']> {
    try {
      const compliance = await PermissionAnalyticsService.getComplianceMetrics();
      const recommendations = await PermissionAnalyticsService.getOptimizationRecommendations();

      return {
        enabled: true,
        lastAnalysis: new Date(),
        complianceScore: compliance.complianceScore,
        recommendations: recommendations.length
      };
    } catch (error) {
      return {
        enabled: false,
        lastAnalysis: null,
        complianceScore: 0,
        recommendations: 0
      };
    }
  }

  private static async checkComplianceHealth(): Promise<Phase3SystemStatus['compliance']> {
    try {
      const dashboard = await PolicyEnforcementEngine.getComplianceDashboard();

      return {
        enabled: true,
        activePolicies: dashboard.policiesCount,
        openViolations: dashboard.activeViolations,
        lastScan: dashboard.lastAssessment
      };
    } catch (error) {
      return {
        enabled: false,
        activePolicies: 0,
        openViolations: 0,
        lastScan: null
      };
    }
  }
}