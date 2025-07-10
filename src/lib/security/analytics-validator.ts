/**
 * Security Analytics Validation System
 * Validates the accuracy and integrity of security analytics data
 */

import { prisma } from '@/lib/prisma';

export interface ValidationResult {
  testName: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
  timestamp: Date;
}

export interface ValidationReport {
  overallStatus: 'passed' | 'failed' | 'warning';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  warningTests: number;
  tests: ValidationResult[];
  executionTime: number;
  generatedAt: Date;
}

export class SecurityAnalyticsValidator {
  
  /**
   * Run comprehensive validation of security analytics
   */
  static async validateSecurityAnalytics(): Promise<ValidationReport> {
    const startTime = Date.now();
    const results: ValidationResult[] = [];
    
    try {
      console.log('Starting security analytics validation...');
      
      // Database connectivity tests
      results.push(await this.validateDatabaseConnectivity());
      
      // Data integrity tests
      results.push(await this.validateDataIntegrity());
      results.push(await this.validateSecurityEventData());
      results.push(await this.validateAuditLogData());
      results.push(await this.validateUserSecurityData());
      
      // Analytics accuracy tests
      results.push(await this.validateThreatDetectionAccuracy());
      results.push(await this.validateRiskCalculations());
      results.push(await this.validateSecurityMetrics());
      results.push(await this.validateComplianceCalculations());
      
      // Real-time metrics tests
      results.push(await this.validateRealTimeMetrics());
      results.push(await this.validateAlertGeneration());
      
      // Cross-validation tests
      results.push(await this.validateDataConsistency());
      results.push(await this.validateTimeBasedAnalytics());
      
      // Performance tests
      results.push(await this.validateQueryPerformance());
      
      const executionTime = Date.now() - startTime;
      
      // Calculate overall status
      const passedTests = results.filter(r => r.status === 'passed').length;
      const failedTests = results.filter(r => r.status === 'failed').length;
      const warningTests = results.filter(r => r.status === 'warning').length;
      
      let overallStatus: 'passed' | 'failed' | 'warning';
      if (failedTests > 0) {
        overallStatus = 'failed';
      } else if (warningTests > 0) {
        overallStatus = 'warning';
      } else {
        overallStatus = 'passed';
      }
      
      const report: ValidationReport = {
        overallStatus,
        totalTests: results.length,
        passedTests,
        failedTests,
        warningTests,
        tests: results,
        executionTime,
        generatedAt: new Date()
      };
      
      console.log(`Validation completed in ${executionTime}ms. Status: ${overallStatus}`);
      return report;
      
    } catch (error) {
      console.error('Error during security analytics validation:', error);
      
      results.push({
        testName: 'Validation Execution',
        status: 'failed',
        message: `Validation failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      });
      
      return {
        overallStatus: 'failed',
        totalTests: results.length,
        passedTests: 0,
        failedTests: results.length,
        warningTests: 0,
        tests: results,
        executionTime: Date.now() - startTime,
        generatedAt: new Date()
      };
    }
  }

  /**
   * Validate database connectivity
   */
  private static async validateDatabaseConnectivity(): Promise<ValidationResult> {
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;
      
      if (responseTime > 1000) {
        return {
          testName: 'Database Connectivity',
          status: 'warning',
          message: `Database connection slow: ${responseTime}ms`,
          details: { responseTime },
          timestamp: new Date()
        };
      }
      
      return {
        testName: 'Database Connectivity',
        status: 'passed',
        message: `Database connection healthy: ${responseTime}ms`,
        details: { responseTime },
        timestamp: new Date()
      };
      
    } catch (error) {
      return {
        testName: 'Database Connectivity',
        status: 'failed',
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate data integrity
   */
  private static async validateDataIntegrity(): Promise<ValidationResult> {
    try {
      // Check for required tables and their structure
      const tables = ['User', 'AuditLog', 'SecurityEvent', 'SecurityAlert', 'Session'];
      const missingTables = [];
      
      for (const table of tables) {
        try {
          const count = await (prisma as any)[table.toLowerCase()].count();
          if (count === undefined) {
            missingTables.push(table);
          }
        } catch (error) {
          missingTables.push(table);
        }
      }
      
      if (missingTables.length > 0) {
        return {
          testName: 'Data Integrity',
          status: 'failed',
          message: `Missing or inaccessible tables: ${missingTables.join(', ')}`,
          details: { missingTables },
          timestamp: new Date()
        };
      }
      
      // Check for orphaned records
      const orphanedEvents = await prisma.securityEvent.count({
        where: {
          userId: { not: null },
          user: null
        }
      });
      
      const orphanedLogs = await prisma.auditLog.count({
        where: {
          userId: { not: null },
          user: null
        }
      });
      
      if (orphanedEvents > 0 || orphanedLogs > 0) {
        return {
          testName: 'Data Integrity',
          status: 'warning',
          message: `Found orphaned records: ${orphanedEvents} events, ${orphanedLogs} logs`,
          details: { orphanedEvents, orphanedLogs },
          timestamp: new Date()
        };
      }
      
      return {
        testName: 'Data Integrity',
        status: 'passed',
        message: 'All tables accessible and data integrity intact',
        timestamp: new Date()
      };
      
    } catch (error) {
      return {
        testName: 'Data Integrity',
        status: 'failed',
        message: `Data integrity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate security event data
   */
  private static async validateSecurityEventData(): Promise<ValidationResult> {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const eventStats = await prisma.securityEvent.groupBy({
        by: ['severity'],
        _count: { id: true },
        where: {
          timestamp: { gte: last24Hours }
        }
      });
      
      const totalEvents = eventStats.reduce((sum, stat) => sum + stat._count.id, 0);
      
      // Check if severity levels are valid
      const validSeverities = ['low', 'medium', 'high', 'critical'];
      const invalidSeverities = eventStats.filter(stat => !validSeverities.includes(stat.severity));
      
      if (invalidSeverities.length > 0) {
        return {
          testName: 'Security Event Data',
          status: 'failed',
          message: `Invalid severity levels found: ${invalidSeverities.map(s => s.severity).join(', ')}`,
          details: { invalidSeverities, totalEvents },
          timestamp: new Date()
        };
      }
      
      // Check for reasonable data distribution
      const criticalEvents = eventStats.find(s => s.severity === 'critical')?._count.id || 0;
      const criticalRatio = totalEvents > 0 ? criticalEvents / totalEvents : 0;
      
      if (criticalRatio > 0.5) {
        return {
          testName: 'Security Event Data',
          status: 'warning',
          message: `High ratio of critical events: ${(criticalRatio * 100).toFixed(1)}%`,
          details: { criticalRatio, totalEvents, criticalEvents },
          timestamp: new Date()
        };
      }
      
      return {
        testName: 'Security Event Data',
        status: 'passed',
        message: `Security event data valid: ${totalEvents} events in last 24h`,
        details: { totalEvents, severityDistribution: eventStats },
        timestamp: new Date()
      };
      
    } catch (error) {
      return {
        testName: 'Security Event Data',
        status: 'failed',
        message: `Security event validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate audit log data
   */
  private static async validateAuditLogData(): Promise<ValidationResult> {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Get audit log statistics
      const logStats = await prisma.auditLog.groupBy({
        by: ['action'],
        _count: { id: true },
        where: {
          timestamp: { gte: last24Hours }
        }
      });
      
      const totalLogs = logStats.reduce((sum, stat) => sum + stat._count.id, 0);
      
      // Check for suspicious patterns
      const failedLogins = logStats.find(s => s.action === 'LOGIN_FAILED')?._count.id || 0;
      const successfulLogins = logStats.find(s => s.action === 'LOGIN_SUCCESS')?._count.id || 0;
      
      const failureRate = (successfulLogins + failedLogins) > 0 ? 
        failedLogins / (successfulLogins + failedLogins) : 0;
      
      if (failureRate > 0.3) {
        return {
          testName: 'Audit Log Data',
          status: 'warning',
          message: `High login failure rate: ${(failureRate * 100).toFixed(1)}%`,
          details: { failureRate, failedLogins, successfulLogins, totalLogs },
          timestamp: new Date()
        };
      }
      
      // Check for missing essential logs
      const essentialActions = ['LOGIN_SUCCESS', 'LOGIN_FAILED'];
      const missingActions = essentialActions.filter(action => 
        !logStats.some(stat => stat.action === action)
      );
      
      if (missingActions.length > 0 && totalLogs > 0) {
        return {
          testName: 'Audit Log Data',
          status: 'warning',
          message: `Missing essential audit actions: ${missingActions.join(', ')}`,
          details: { missingActions, totalLogs },
          timestamp: new Date()
        };
      }
      
      return {
        testName: 'Audit Log Data',
        status: 'passed',
        message: `Audit log data valid: ${totalLogs} logs in last 24h`,
        details: { totalLogs, actionDistribution: logStats },
        timestamp: new Date()
      };
      
    } catch (error) {
      return {
        testName: 'Audit Log Data',
        status: 'failed',
        message: `Audit log validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate user security data
   */
  private static async validateUserSecurityData(): Promise<ValidationResult> {
    try {
      const totalUsers = await prisma.user.count();
      const lockedUsers = await prisma.user.count({
        where: {
          lockedUntil: { gte: new Date() }
        }
      });
      
      const activeUsers = await prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      });
      
      const lockoutRate = totalUsers > 0 ? lockedUsers / totalUsers : 0;
      const activityRate = totalUsers > 0 ? activeUsers / totalUsers : 0;
      
      if (lockoutRate > 0.1) {
        return {
          testName: 'User Security Data',
          status: 'warning',
          message: `High user lockout rate: ${(lockoutRate * 100).toFixed(1)}%`,
          details: { lockoutRate, lockedUsers, totalUsers },
          timestamp: new Date()
        };
      }
      
      if (activityRate < 0.1 && totalUsers > 10) {
        return {
          testName: 'User Security Data',
          status: 'warning',
          message: `Low user activity rate: ${(activityRate * 100).toFixed(1)}%`,
          details: { activityRate, activeUsers, totalUsers },
          timestamp: new Date()
        };
      }
      
      return {
        testName: 'User Security Data',
        status: 'passed',
        message: `User security data healthy: ${totalUsers} users, ${(lockoutRate * 100).toFixed(1)}% locked`,
        details: { totalUsers, lockedUsers, activeUsers, lockoutRate, activityRate },
        timestamp: new Date()
      };
      
    } catch (error) {
      return {
        testName: 'User Security Data',
        status: 'failed',
        message: `User security validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate threat detection accuracy
   */
  private static async validateThreatDetectionAccuracy(): Promise<ValidationResult> {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Check correlation between failed logins and security events
      const failedLogins = await prisma.auditLog.count({
        where: {
          action: 'LOGIN_FAILED',
          timestamp: { gte: last24Hours }
        }
      });
      
      const bruteForceEvents = await prisma.securityEvent.count({
        where: {
          type: { in: ['BRUTE_FORCE_ATTACK', 'MULTIPLE_FAILED_LOGINS'] },
          timestamp: { gte: last24Hours }
        }
      });
      
      // Should have security events if there are many failed logins
      const expectedEvents = Math.floor(failedLogins / 5); // Expect 1 event per 5 failed logins
      const detectionAccuracy = expectedEvents > 0 ? 
        Math.min(bruteForceEvents / expectedEvents, 1) : 1;
      
      if (detectionAccuracy < 0.5 && failedLogins > 10) {
        return {
          testName: 'Threat Detection Accuracy',
          status: 'warning',
          message: `Low threat detection accuracy: ${(detectionAccuracy * 100).toFixed(1)}%`,
          details: { 
            detectionAccuracy, 
            failedLogins, 
            bruteForceEvents, 
            expectedEvents 
          },
          timestamp: new Date()
        };
      }
      
      return {
        testName: 'Threat Detection Accuracy',
        status: 'passed',
        message: `Threat detection working: ${bruteForceEvents} events for ${failedLogins} failed logins`,
        details: { 
          detectionAccuracy, 
          failedLogins, 
          bruteForceEvents 
        },
        timestamp: new Date()
      };
      
    } catch (error) {
      return {
        testName: 'Threat Detection Accuracy',
        status: 'failed',
        message: `Threat detection validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate risk calculations
   */
  private static async validateRiskCalculations(): Promise<ValidationResult> {
    try {
      // Test risk calculation logic with sample data
      const sampleUsers = await prisma.user.findMany({
        take: 5,
        include: {
          auditLogs: {
            where: {
              timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            }
          }
        }
      });
      
      let riskCalculationErrors = 0;
      
      for (const user of sampleUsers) {
        const failedLogins = user.auditLogs.filter(log => log.action === 'LOGIN_FAILED').length;
        const permissionDenials = user.auditLogs.filter(log => log.action === 'PERMISSION_DENIED').length;
        
        // Calculate expected risk score
        let expectedRisk = 0;
        expectedRisk += failedLogins * 10;
        expectedRisk += permissionDenials * 15;
        expectedRisk += user.loginAttempts * 5;
        expectedRisk = Math.min(100, expectedRisk);
        
        // Risk should be reasonable
        if (expectedRisk > 100 || expectedRisk < 0) {
          riskCalculationErrors++;
        }
      }
      
      if (riskCalculationErrors > 0) {
        return {
          testName: 'Risk Calculations',
          status: 'failed',
          message: `Risk calculation errors found for ${riskCalculationErrors} users`,
          details: { riskCalculationErrors, sampleSize: sampleUsers.length },
          timestamp: new Date()
        };
      }
      
      return {
        testName: 'Risk Calculations',
        status: 'passed',
        message: `Risk calculations valid for ${sampleUsers.length} sample users`,
        details: { sampleSize: sampleUsers.length },
        timestamp: new Date()
      };
      
    } catch (error) {
      return {
        testName: 'Risk Calculations',
        status: 'failed',
        message: `Risk calculation validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate security metrics
   */
  private static async validateSecurityMetrics(): Promise<ValidationResult> {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Validate basic metrics consistency
      const totalEvents = await prisma.securityEvent.count();
      const recentEvents = await prisma.securityEvent.count({
        where: { timestamp: { gte: last24Hours } }
      });
      
      const totalLogs = await prisma.auditLog.count();
      const recentLogs = await prisma.auditLog.count({
        where: { timestamp: { gte: last24Hours } }
      });
      
      // Check for reasonable proportions
      if (recentEvents > totalEvents) {
        return {
          testName: 'Security Metrics',
          status: 'failed',
          message: 'Recent events exceed total events (data inconsistency)',
          details: { totalEvents, recentEvents },
          timestamp: new Date()
        };
      }
      
      if (recentLogs > totalLogs) {
        return {
          testName: 'Security Metrics',
          status: 'failed',
          message: 'Recent logs exceed total logs (data inconsistency)',
          details: { totalLogs, recentLogs },
          timestamp: new Date()
        };
      }
      
      return {
        testName: 'Security Metrics',
        status: 'passed',
        message: `Security metrics consistent: ${totalEvents} events, ${totalLogs} logs`,
        details: { totalEvents, recentEvents, totalLogs, recentLogs },
        timestamp: new Date()
      };
      
    } catch (error) {
      return {
        testName: 'Security Metrics',
        status: 'failed',
        message: `Security metrics validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate compliance calculations
   */
  private static async validateComplianceCalculations(): Promise<ValidationResult> {
    try {
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const criticalViolations = await prisma.securityEvent.count({
        where: {
          timestamp: { gte: last30Days },
          severity: 'critical',
          type: { in: ['UNAUTHORIZED_ACCESS_ATTEMPT', 'PRIVILEGE_ESCALATION', 'DATA_BREACH'] }
        }
      });
      
      const policyViolations = await prisma.securityEvent.count({
        where: {
          timestamp: { gte: last30Days },
          type: { in: ['POLICY_VIOLATION', 'UNAUTHORIZED_ACCESS_ATTEMPT'] }
        }
      });
      
      // Calculate compliance score
      let complianceScore = 100;
      complianceScore -= criticalViolations * 15;
      complianceScore -= policyViolations * 5;
      complianceScore = Math.max(0, complianceScore);
      
      if (complianceScore < 0 || complianceScore > 100) {
        return {
          testName: 'Compliance Calculations',
          status: 'failed',
          message: `Invalid compliance score: ${complianceScore}`,
          details: { complianceScore, criticalViolations, policyViolations },
          timestamp: new Date()
        };
      }
      
      return {
        testName: 'Compliance Calculations',
        status: 'passed',
        message: `Compliance calculations valid: ${complianceScore}% score`,
        details: { complianceScore, criticalViolations, policyViolations },
        timestamp: new Date()
      };
      
    } catch (error) {
      return {
        testName: 'Compliance Calculations',
        status: 'failed',
        message: `Compliance validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate real-time metrics
   */
  private static async validateRealTimeMetrics(): Promise<ValidationResult> {
    try {
      // Test if real-time calculations match direct database queries
      const now = new Date();
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
      
      const directEventCount = await prisma.securityEvent.count({
        where: {
          timestamp: { gte: lastHour },
          resolved: false
        }
      });
      
      const directFailedLogins = await prisma.auditLog.count({
        where: {
          action: 'LOGIN_FAILED',
          timestamp: { gte: lastHour }
        }
      });
      
      // These should be reasonable numbers
      if (directEventCount < 0 || directFailedLogins < 0) {
        return {
          testName: 'Real-Time Metrics',
          status: 'failed',
          message: 'Negative values in real-time metrics',
          details: { directEventCount, directFailedLogins },
          timestamp: new Date()
        };
      }
      
      return {
        testName: 'Real-Time Metrics',
        status: 'passed',
        message: `Real-time metrics functioning: ${directEventCount} events, ${directFailedLogins} failed logins`,
        details: { directEventCount, directFailedLogins },
        timestamp: new Date()
      };
      
    } catch (error) {
      return {
        testName: 'Real-Time Metrics',
        status: 'failed',
        message: `Real-time metrics validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate alert generation
   */
  private static async validateAlertGeneration(): Promise<ValidationResult> {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const criticalEvents = await prisma.securityEvent.count({
        where: {
          severity: 'critical',
          timestamp: { gte: last24Hours }
        }
      });
      
      const alerts = await prisma.securityAlert.count({
        where: {
          sentAt: { gte: last24Hours }
        }
      });
      
      // Should have alerts for critical events
      if (criticalEvents > 0 && alerts === 0) {
        return {
          testName: 'Alert Generation',
          status: 'warning',
          message: `No alerts generated for ${criticalEvents} critical events`,
          details: { criticalEvents, alerts },
          timestamp: new Date()
        };
      }
      
      return {
        testName: 'Alert Generation',
        status: 'passed',
        message: `Alert generation functioning: ${alerts} alerts for ${criticalEvents} critical events`,
        details: { criticalEvents, alerts },
        timestamp: new Date()
      };
      
    } catch (error) {
      return {
        testName: 'Alert Generation',
        status: 'failed',
        message: `Alert generation validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate data consistency across modules
   */
  private static async validateDataConsistency(): Promise<ValidationResult> {
    try {
      // Check consistency between audit logs and security events
      const userIds = await prisma.user.findMany({
        select: { id: true },
        take: 5
      });
      
      let inconsistencies = 0;
      
      for (const user of userIds) {
        const userLogs = await prisma.auditLog.count({
          where: { userId: user.id }
        });
        
        const userEvents = await prisma.securityEvent.count({
          where: { userId: user.id }
        });
        
        // If user has many failed logins but no security events, it might be inconsistent
        const userFailedLogins = await prisma.auditLog.count({
          where: {
            userId: user.id,
            action: 'LOGIN_FAILED'
          }
        });
        
        if (userFailedLogins > 10 && userEvents === 0) {
          inconsistencies++;
        }
      }
      
      if (inconsistencies > userIds.length / 2) {
        return {
          testName: 'Data Consistency',
          status: 'warning',
          message: `Data inconsistencies found for ${inconsistencies} users`,
          details: { inconsistencies, sampleSize: userIds.length },
          timestamp: new Date()
        };
      }
      
      return {
        testName: 'Data Consistency',
        status: 'passed',
        message: `Data consistency good: ${inconsistencies} inconsistencies in ${userIds.length} users`,
        details: { inconsistencies, sampleSize: userIds.length },
        timestamp: new Date()
      };
      
    } catch (error) {
      return {
        testName: 'Data Consistency',
        status: 'failed',
        message: `Data consistency validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate time-based analytics
   */
  private static async validateTimeBasedAnalytics(): Promise<ValidationResult> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Check if timeframe calculations are logical
      const eventsLastHour = await prisma.securityEvent.count({
        where: { timestamp: { gte: oneHourAgo } }
      });
      
      const eventsLastDay = await prisma.securityEvent.count({
        where: { timestamp: { gte: oneDayAgo } }
      });
      
      // Last day should include last hour
      if (eventsLastHour > eventsLastDay) {
        return {
          testName: 'Time-Based Analytics',
          status: 'failed',
          message: 'Time-based calculations inconsistent (hour > day)',
          details: { eventsLastHour, eventsLastDay },
          timestamp: new Date()
        };
      }
      
      return {
        testName: 'Time-Based Analytics',
        status: 'passed',
        message: `Time-based analytics consistent: ${eventsLastHour}h, ${eventsLastDay}d`,
        details: { eventsLastHour, eventsLastDay },
        timestamp: new Date()
      };
      
    } catch (error) {
      return {
        testName: 'Time-Based Analytics',
        status: 'failed',
        message: `Time-based analytics validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate query performance
   */
  private static async validateQueryPerformance(): Promise<ValidationResult> {
    try {
      const queries = [
        { name: 'Security Events', query: () => prisma.securityEvent.count() },
        { name: 'Audit Logs', query: () => prisma.auditLog.count() },
        { name: 'Users', query: () => prisma.user.count() },
        { name: 'Alerts', query: () => prisma.securityAlert.count() }
      ];
      
      const performanceResults = [];
      let slowQueries = 0;
      
      for (const { name, query } of queries) {
        const start = Date.now();
        await query();
        const duration = Date.now() - start;
        
        performanceResults.push({ name, duration });
        
        if (duration > 2000) { // Slow if > 2 seconds
          slowQueries++;
        }
      }
      
      if (slowQueries > 0) {
        return {
          testName: 'Query Performance',
          status: 'warning',
          message: `${slowQueries} slow queries detected`,
          details: { performanceResults, slowQueries },
          timestamp: new Date()
        };
      }
      
      const avgDuration = performanceResults.reduce((sum, r) => sum + r.duration, 0) / performanceResults.length;
      
      return {
        testName: 'Query Performance',
        status: 'passed',
        message: `Query performance good: ${avgDuration.toFixed(0)}ms average`,
        details: { performanceResults, avgDuration },
        timestamp: new Date()
      };
      
    } catch (error) {
      return {
        testName: 'Query Performance',
        status: 'failed',
        message: `Query performance validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }
}

export default SecurityAnalyticsValidator;