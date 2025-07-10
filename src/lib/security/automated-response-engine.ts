/**
 * Automated Response Engine
 * Provides intelligent automated responses to security threats
 */

import { prisma } from '@/lib/prisma';
import type { 
  ThreatIntelligence, 
  SecurityIncident, 
  MitigationAction,
  AutomatedResponseResult,
  ResponseAction,
  ResponseRule
} from './advanced-security-types';

export class AutomatedResponseEngine {
  private static responseRules: ResponseRule[] = [
    // Critical threat rules
    {
      id: 'critical_brute_force',
      name: 'Critical Brute Force Response',
      conditions: [
        { field: 'threatType', operator: 'equals', value: 'brute_force_advanced' },
        { field: 'riskScore', operator: 'greater_than', value: 90 }
      ],
      actions: [
        { type: 'block', parameters: { target: 'ip', duration: 3600 } },
        { type: 'lock', parameters: { target: 'account', duration: 1800 } },
        { type: 'alert', parameters: { level: 'critical', immediate: true } },
        { type: 'notify', parameters: { channels: ['email', 'sms'], escalate: true } }
      ],
      priority: 1,
      enabled: true,
      autoExecute: true
    },
    
    // High threat rules
    {
      id: 'high_privilege_escalation',
      name: 'High Privilege Escalation Response',
      conditions: [
        { field: 'threatType', operator: 'equals', value: 'privilege_escalation' },
        { field: 'riskScore', operator: 'greater_than', value: 75 }
      ],
      actions: [
        { type: 'restrict', parameters: { target: 'permissions', immediate: true } },
        { type: 'alert', parameters: { level: 'high', immediate: true } },
        { type: 'log', parameters: { detailed: true, preserve: true } },
        { type: 'notify', parameters: { channels: ['email'], escalate: false } }
      ],
      priority: 2,
      enabled: true,
      autoExecute: true
    },

    // Data exfiltration rules
    {
      id: 'data_exfiltration_response',
      name: 'Data Exfiltration Response',
      conditions: [
        { field: 'threatType', operator: 'equals', value: 'financial_data_exfiltration' }
      ],
      actions: [
        { type: 'restrict', parameters: { target: 'data_access', immediate: true } },
        { type: 'block', parameters: { target: 'user_session', duration: 1800 } },
        { type: 'alert', parameters: { level: 'high', immediate: true } },
        { type: 'log', parameters: { detailed: true, forensic: true } }
      ],
      priority: 1,
      enabled: true,
      autoExecute: true
    },

    // Property access violation rules
    {
      id: 'property_access_violation',
      name: 'Property Access Violation Response',
      conditions: [
        { field: 'threatType', operator: 'equals', value: 'property_access_violation' }
      ],
      actions: [
        { type: 'block', parameters: { target: 'property_access', duration: 600 } },
        { type: 'alert', parameters: { level: 'medium', immediate: false } },
        { type: 'log', parameters: { detailed: true } }
      ],
      priority: 3,
      enabled: true,
      autoExecute: true
    },

    // Session anomaly rules
    {
      id: 'session_anomaly_response',
      name: 'Session Anomaly Response',
      conditions: [
        { field: 'threatType', operator: 'equals', value: 'session_hijacking' },
        { field: 'riskScore', operator: 'greater_than', value: 50 }
      ],
      actions: [
        { type: 'restrict', parameters: { target: 'concurrent_sessions', limit: 1 } },
        { type: 'alert', parameters: { level: 'medium' } },
        { type: 'log', parameters: { session_details: true } }
      ],
      priority: 4,
      enabled: true,
      autoExecute: true
    }
  ];

  /**
   * Execute automated response for a threat
   */
  static async executeResponse(
    threat: ThreatIntelligence, 
    incident: SecurityIncident
  ): Promise<AutomatedResponseResult> {
    try {
      console.log(`Executing automated response for threat: ${threat.threatId}`);

      // Find matching response rules
      const matchingRules = this.findMatchingRules(threat);
      
      if (matchingRules.length === 0) {
        return {
          success: false,
          message: 'No matching response rules found',
          actionsExecuted: [],
          executionTime: 0
        };
      }

      const startTime = Date.now();
      const executedActions: ResponseAction[] = [];
      const errors: string[] = [];

      // Execute rules in priority order
      const sortedRules = matchingRules.sort((a, b) => a.priority - b.priority);

      for (const rule of sortedRules) {
        if (!rule.enabled || !rule.autoExecute) continue;

        try {
          const ruleActions = await this.executeRule(rule, threat, incident);
          executedActions.push(...ruleActions);
        } catch (error) {
          const errorMsg = `Failed to execute rule ${rule.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      const executionTime = Date.now() - startTime;

      // Log the automated response
      await this.logAutomatedResponse(threat, incident, executedActions, executionTime);

      return {
        success: errors.length === 0,
        message: errors.length > 0 ? `Partial success: ${errors.join('; ')}` : 'All responses executed successfully',
        actionsExecuted: executedActions,
        executionTime,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      console.error('Automated response execution failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        actionsExecuted: [],
        executionTime: 0
      };
    }
  }

  /**
   * Find rules that match the threat
   */
  private static findMatchingRules(threat: ThreatIntelligence): ResponseRule[] {
    return this.responseRules.filter(rule => {
      return rule.conditions.every(condition => {
        return this.evaluateCondition(condition, threat);
      });
    });
  }

  /**
   * Evaluate a single rule condition
   */
  private static evaluateCondition(condition: any, threat: ThreatIntelligence): boolean {
    const fieldValue = this.getFieldValue(condition.field, threat);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'greater_than':
        return typeof fieldValue === 'number' && fieldValue > condition.value;
      case 'less_than':
        return typeof fieldValue === 'number' && fieldValue < condition.value;
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      case 'regex':
        return typeof fieldValue === 'string' && new RegExp(condition.value).test(fieldValue);
      default:
        return false;
    }
  }

  /**
   * Get field value from threat object
   */
  private static getFieldValue(field: string, threat: ThreatIntelligence): any {
    const fieldMap: Record<string, any> = {
      'threatType': threat.threatType,
      'riskScore': threat.riskScore,
      'confidence': threat.confidence,
      'status': threat.status,
      'affectedResources': threat.affectedResources,
      'indicatorCount': threat.indicators.length,
      'mitigationCount': threat.mitigation.length
    };

    return fieldMap[field];
  }

  /**
   * Execute a response rule
   */
  private static async executeRule(
    rule: ResponseRule, 
    threat: ThreatIntelligence, 
    incident: SecurityIncident
  ): Promise<ResponseAction[]> {
    const executedActions: ResponseAction[] = [];

    for (const action of rule.actions) {
      try {
        const result = await this.executeAction(action, threat, incident);
        executedActions.push({
          ...action,
          executedAt: new Date(),
          success: result.success,
          message: result.message,
          details: result.details
        });
      } catch (error) {
        executedActions.push({
          ...action,
          executedAt: new Date(),
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return executedActions;
  }

  /**
   * Execute a single response action
   */
  private static async executeAction(
    action: any, 
    threat: ThreatIntelligence, 
    incident: SecurityIncident
  ): Promise<{ success: boolean; message: string; details?: any }> {
    switch (action.type) {
      case 'block':
        return await this.executeBlockAction(action.parameters, threat);
      
      case 'lock':
        return await this.executeLockAction(action.parameters, threat);
      
      case 'restrict':
        return await this.executeRestrictAction(action.parameters, threat);
      
      case 'alert':
        return await this.executeAlertAction(action.parameters, threat, incident);
      
      case 'notify':
        return await this.executeNotifyAction(action.parameters, threat, incident);
      
      case 'log':
        return await this.executeLogAction(action.parameters, threat, incident);
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Execute block action (IP, user, session)
   */
  private static async executeBlockAction(
    parameters: any, 
    threat: ThreatIntelligence
  ): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const target = parameters.target;
      const duration = parameters.duration || 3600; // 1 hour default

      switch (target) {
        case 'ip':
          await this.blockIP(threat, duration);
          return { success: true, message: `IP blocked for ${duration} seconds` };
        
        case 'user_session':
          await this.blockUserSessions(threat, duration);
          return { success: true, message: `User sessions blocked for ${duration} seconds` };
        
        case 'property_access':
          await this.blockPropertyAccess(threat, duration);
          return { success: true, message: `Property access blocked for ${duration} seconds` };
        
        default:
          throw new Error(`Unknown block target: ${target}`);
      }
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Block action failed' 
      };
    }
  }

  /**
   * Execute lock action (account, permissions)
   */
  private static async executeLockAction(
    parameters: any, 
    threat: ThreatIntelligence
  ): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const target = parameters.target;
      const duration = parameters.duration || 1800; // 30 minutes default

      switch (target) {
        case 'account':
          await this.lockUserAccount(threat, duration);
          return { success: true, message: `Account locked for ${duration} seconds` };
        
        default:
          throw new Error(`Unknown lock target: ${target}`);
      }
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Lock action failed' 
      };
    }
  }

  /**
   * Execute restrict action (permissions, access)
   */
  private static async executeRestrictAction(
    parameters: any, 
    threat: ThreatIntelligence
  ): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const target = parameters.target;

      switch (target) {
        case 'permissions':
          await this.restrictPermissions(threat);
          return { success: true, message: 'Permissions restricted' };
        
        case 'data_access':
          await this.restrictDataAccess(threat);
          return { success: true, message: 'Data access restricted' };
        
        case 'concurrent_sessions':
          await this.restrictConcurrentSessions(threat, parameters.limit || 1);
          return { success: true, message: `Concurrent sessions limited to ${parameters.limit || 1}` };
        
        default:
          throw new Error(`Unknown restrict target: ${target}`);
      }
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Restrict action failed' 
      };
    }
  }

  /**
   * Execute alert action
   */
  private static async executeAlertAction(
    parameters: any, 
    threat: ThreatIntelligence, 
    incident: SecurityIncident
  ): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      // This would integrate with your alerting system
      console.log(`SECURITY ALERT [${parameters.level?.toUpperCase()}]: Threat ${threat.threatId} - ${threat.threatType}`);
      
      return { 
        success: true, 
        message: `Alert sent with level ${parameters.level}`,
        details: { level: parameters.level, immediate: parameters.immediate }
      };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Alert action failed' 
      };
    }
  }

  /**
   * Execute notify action
   */
  private static async executeNotifyAction(
    parameters: any, 
    threat: ThreatIntelligence, 
    incident: SecurityIncident
  ): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const channels = parameters.channels || ['email'];
      
      // This would integrate with your notification system
      console.log(`SECURITY NOTIFICATION: Threat ${threat.threatId} via channels: ${channels.join(', ')}`);
      
      return { 
        success: true, 
        message: `Notification sent via ${channels.length} channels`,
        details: { channels, escalate: parameters.escalate }
      };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Notify action failed' 
      };
    }
  }

  /**
   * Execute log action
   */
  private static async executeLogAction(
    parameters: any, 
    threat: ThreatIntelligence, 
    incident: SecurityIncident
  ): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: null,
          action: 'AUTOMATED_SECURITY_RESPONSE',
          resource: 'security',
          resourceId: threat.threatId,
          details: {
            incidentId: incident.id,
            threatType: threat.threatType,
            riskScore: threat.riskScore,
            confidence: threat.confidence,
            detailed: parameters.detailed || false,
            forensic: parameters.forensic || false,
            sessionDetails: parameters.session_details || false,
            preserve: parameters.preserve || false
          }
        }
      });

      return { 
        success: true, 
        message: 'Security response logged',
        details: parameters
      };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Log action failed' 
      };
    }
  }

  /**
   * Block IP address
   */
  private static async blockIP(threat: ThreatIntelligence, duration: number): Promise<void> {
    // Extract IP from threat indicators
    const ipIndicator = threat.indicators.find(i => i.type === 'ip');
    if (!ipIndicator) {
      throw new Error('No IP indicator found in threat');
    }

    // This would integrate with your IP blocking system (firewall, load balancer, etc.)
    console.log(`BLOCKING IP: ${ipIndicator.value} for ${duration} seconds`);
    
    // Log the IP block
    await prisma.auditLog.create({
      data: {
        userId: null,
        action: 'AUTOMATED_IP_BLOCK',
        resource: 'security',
        resourceId: threat.threatId,
        details: {
          ipAddress: ipIndicator.value,
          duration,
          reason: `Automated response to threat ${threat.threatId}`,
          expiresAt: new Date(Date.now() + duration * 1000).toISOString()
        }
      }
    });
  }

  /**
   * Block user sessions
   */
  private static async blockUserSessions(threat: ThreatIntelligence, duration: number): Promise<void> {
    // Extract user from affected resources
    const userResource = threat.affectedResources.find(r => r.startsWith('user_'));
    if (!userResource) {
      throw new Error('No user resource found in threat');
    }

    const userId = parseInt(userResource.replace('user_', ''));
    
    // This would integrate with your session management system
    console.log(`BLOCKING USER SESSIONS: User ${userId} for ${duration} seconds`);
    
    // Log the session block
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'AUTOMATED_SESSION_BLOCK',
        resource: 'security',
        resourceId: threat.threatId,
        details: {
          duration,
          reason: `Automated response to threat ${threat.threatId}`,
          expiresAt: new Date(Date.now() + duration * 1000).toISOString()
        }
      }
    });
  }

  /**
   * Block property access
   */
  private static async blockPropertyAccess(threat: ThreatIntelligence, duration: number): Promise<void> {
    const propertyResource = threat.affectedResources.find(r => r.startsWith('property_'));
    if (!propertyResource) {
      throw new Error('No property resource found in threat');
    }

    const propertyId = parseInt(propertyResource.replace('property_', ''));
    
    console.log(`BLOCKING PROPERTY ACCESS: Property ${propertyId} for ${duration} seconds`);
    
    await prisma.auditLog.create({
      data: {
        userId: null,
        propertyId,
        action: 'AUTOMATED_PROPERTY_ACCESS_BLOCK',
        resource: 'security',
        resourceId: threat.threatId,
        details: {
          duration,
          reason: `Automated response to threat ${threat.threatId}`,
          expiresAt: new Date(Date.now() + duration * 1000).toISOString()
        }
      }
    });
  }

  /**
   * Lock user account
   */
  private static async lockUserAccount(threat: ThreatIntelligence, duration: number): Promise<void> {
    const userResource = threat.affectedResources.find(r => r.startsWith('user_'));
    if (!userResource) {
      throw new Error('No user resource found in threat');
    }

    const userId = parseInt(userResource.replace('user_', ''));
    
    console.log(`LOCKING USER ACCOUNT: User ${userId} for ${duration} seconds`);
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'AUTOMATED_ACCOUNT_LOCK',
        resource: 'security',
        resourceId: threat.threatId,
        details: {
          duration,
          reason: `Automated response to threat ${threat.threatId}`,
          expiresAt: new Date(Date.now() + duration * 1000).toISOString()
        }
      }
    });
  }

  /**
   * Restrict permissions
   */
  private static async restrictPermissions(threat: ThreatIntelligence): Promise<void> {
    const userResource = threat.affectedResources.find(r => r.startsWith('user_'));
    if (!userResource) {
      throw new Error('No user resource found in threat');
    }

    const userId = parseInt(userResource.replace('user_', ''));
    
    console.log(`RESTRICTING PERMISSIONS: User ${userId}`);
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'AUTOMATED_PERMISSION_RESTRICTION',
        resource: 'security',
        resourceId: threat.threatId,
        details: {
          reason: `Automated response to threat ${threat.threatId}`,
          restrictionLevel: 'high'
        }
      }
    });
  }

  /**
   * Restrict data access
   */
  private static async restrictDataAccess(threat: ThreatIntelligence): Promise<void> {
    const userResource = threat.affectedResources.find(r => r.startsWith('user_'));
    if (!userResource) {
      throw new Error('No user resource found in threat');
    }

    const userId = parseInt(userResource.replace('user_', ''));
    
    console.log(`RESTRICTING DATA ACCESS: User ${userId}`);
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'AUTOMATED_DATA_ACCESS_RESTRICTION',
        resource: 'security',
        resourceId: threat.threatId,
        details: {
          reason: `Automated response to threat ${threat.threatId}`,
          dataTypes: ['financial', 'sensitive']
        }
      }
    });
  }

  /**
   * Restrict concurrent sessions
   */
  private static async restrictConcurrentSessions(threat: ThreatIntelligence, limit: number): Promise<void> {
    const userResource = threat.affectedResources.find(r => r.startsWith('user_'));
    if (!userResource) {
      throw new Error('No user resource found in threat');
    }

    const userId = parseInt(userResource.replace('user_', ''));
    
    console.log(`RESTRICTING CONCURRENT SESSIONS: User ${userId} to ${limit} sessions`);
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'AUTOMATED_SESSION_LIMIT',
        resource: 'security',
        resourceId: threat.threatId,
        details: {
          reason: `Automated response to threat ${threat.threatId}`,
          sessionLimit: limit
        }
      }
    });
  }

  /**
   * Log automated response execution
   */
  private static async logAutomatedResponse(
    threat: ThreatIntelligence,
    incident: SecurityIncident,
    actions: ResponseAction[],
    executionTime: number
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: null,
          action: 'AUTOMATED_RESPONSE_EXECUTED',
          resource: 'security',
          resourceId: threat.threatId,
          details: {
            incidentId: incident.id,
            threatType: threat.threatType,
            riskScore: threat.riskScore,
            actionsCount: actions.length,
            successfulActions: actions.filter(a => a.success).length,
            failedActions: actions.filter(a => !a.success).length,
            executionTimeMs: executionTime,
            actions: actions.map(a => ({
              type: a.type,
              success: a.success,
              message: a.message
            }))
          }
        }
      });
    } catch (error) {
      console.error('Failed to log automated response:', error);
    }
  }

  /**
   * Get response rules
   */
  static getResponseRules(): ResponseRule[] {
    return this.responseRules;
  }

  /**
   * Add new response rule
   */
  static addResponseRule(rule: ResponseRule): void {
    this.responseRules.push(rule);
  }

  /**
   * Update response rule
   */
  static updateResponseRule(ruleId: string, updates: Partial<ResponseRule>): boolean {
    const ruleIndex = this.responseRules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return false;

    this.responseRules[ruleIndex] = { ...this.responseRules[ruleIndex], ...updates };
    return true;
  }

  /**
   * Delete response rule
   */
  static deleteResponseRule(ruleId: string): boolean {
    const ruleIndex = this.responseRules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return false;

    this.responseRules.splice(ruleIndex, 1);
    return true;
  }
}