/**
 * Security Event Correlator
 * Analyzes patterns and relationships between security events to detect complex attacks
 */

import { prisma } from '@/lib/prisma';
import type { 
  SecurityEvent, 
  ThreatIndicator,
  CorrelatedEvent,
  EventCorrelation,
  CorrelationRule,
  CorrelationPattern
} from './advanced-security-types';

export class SecurityEventCorrelator {
  private static correlationRules: CorrelationRule[] = [
    // Coordinated brute force attack
    {
      id: 'coordinated_brute_force',
      name: 'Coordinated Brute Force Attack',
      description: 'Multiple failed logins from different IPs targeting same user',
      timeWindow: 900000, // 15 minutes
      minEvents: 5,
      maxEvents: 100,
      conditions: [
        { field: 'action', operator: 'equals', value: 'FAILED_LOGIN' },
        { field: 'userId', operator: 'equals', value: 'SAME' },
        { field: 'ipAddress', operator: 'not_equals', value: 'SAME' }
      ],
      riskMultiplier: 2.5,
      confidence: 85,
      priority: 1,
      enabled: true
    },

    // Privilege escalation chain
    {
      id: 'privilege_escalation_chain',
      name: 'Privilege Escalation Chain',
      description: 'Sequential permission changes leading to higher privileges',
      timeWindow: 1800000, // 30 minutes
      minEvents: 3,
      maxEvents: 10,
      conditions: [
        { field: 'action', operator: 'contains', value: 'PERMISSION' },
        { field: 'userId', operator: 'equals', value: 'SAME' }
      ],
      riskMultiplier: 3.0,
      confidence: 90,
      priority: 1,
      enabled: true
    },

    // Data exfiltration pattern
    {
      id: 'data_exfiltration_pattern',
      name: 'Data Exfiltration Pattern',
      description: 'Multiple data exports/downloads in short timeframe',
      timeWindow: 3600000, // 1 hour
      minEvents: 10,
      maxEvents: 50,
      conditions: [
        { field: 'action', operator: 'in', value: ['EXPORT', 'DOWNLOAD'] },
        { field: 'userId', operator: 'equals', value: 'SAME' }
      ],
      riskMultiplier: 2.0,
      confidence: 80,
      priority: 2,
      enabled: true
    },

    // Lateral movement
    {
      id: 'lateral_movement',
      name: 'Lateral Movement',
      description: 'Access to multiple properties/systems in sequence',
      timeWindow: 1800000, // 30 minutes
      minEvents: 5,
      maxEvents: 20,
      conditions: [
        { field: 'action', operator: 'contains', value: 'ACCESS' },
        { field: 'userId', operator: 'equals', value: 'SAME' },
        { field: 'propertyId', operator: 'not_equals', value: 'SAME' }
      ],
      riskMultiplier: 1.8,
      confidence: 75,
      priority: 3,
      enabled: true
    },

    // Reconnaissance activity
    {
      id: 'reconnaissance_activity',
      name: 'Reconnaissance Activity',
      description: 'Systematic probing of system features and data',
      timeWindow: 2700000, // 45 minutes
      minEvents: 15,
      maxEvents: 100,
      conditions: [
        { field: 'action', operator: 'in', value: ['VIEW', 'LIST', 'SEARCH'] },
        { field: 'userId', operator: 'equals', value: 'SAME' }
      ],
      riskMultiplier: 1.5,
      confidence: 70,
      priority: 4,
      enabled: true
    },

    // Session manipulation
    {
      id: 'session_manipulation',
      name: 'Session Manipulation',
      description: 'Unusual session creation/destruction patterns',
      timeWindow: 1200000, // 20 minutes
      minEvents: 8,
      maxEvents: 30,
      conditions: [
        { field: 'action', operator: 'in', value: ['LOGIN', 'LOGOUT', 'SESSION'] },
        { field: 'userId', operator: 'equals', value: 'SAME' }
      ],
      riskMultiplier: 1.7,
      confidence: 65,
      priority: 4,
      enabled: true
    }
  ];

  /**
   * Correlate recent security events
   */
  static async correlateRecentEvents(timeWindowMs: number = 1800000): Promise<EventCorrelation[]> {
    try {
      const since = new Date(Date.now() - timeWindowMs);
      
      // Get recent security events
      const recentEvents = await prisma.auditLog.findMany({
        where: {
          timestamp: { gte: since },
          OR: [
            { action: { contains: 'SECURITY' } },
            { action: { contains: 'LOGIN' } },
            { action: { contains: 'PERMISSION' } },
            { action: { contains: 'ACCESS' } },
            { action: { contains: 'EXPORT' } },
            { action: { contains: 'DOWNLOAD' } }
          ]
        },
        orderBy: { timestamp: 'asc' },
        take: 1000 // Limit to prevent performance issues
      });

      const correlations: EventCorrelation[] = [];

      // Apply each correlation rule
      for (const rule of this.correlationRules) {
        if (!rule.enabled) continue;

        const ruleCorrelations = await this.applyCorrelationRule(rule, recentEvents);
        correlations.push(...ruleCorrelations);
      }

      // Sort by risk score and return top correlations
      return correlations
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, 20); // Top 20 correlations

    } catch (error) {
      console.error('Event correlation failed:', error);
      return [];
    }
  }

  /**
   * Apply a correlation rule to events
   */
  private static async applyCorrelationRule(
    rule: CorrelationRule, 
    events: any[]
  ): Promise<EventCorrelation[]> {
    const correlations: EventCorrelation[] = [];

    try {
      // Filter events matching the rule conditions
      const matchingEvents = events.filter(event => 
        this.eventMatchesRuleConditions(event, rule.conditions)
      );

      if (matchingEvents.length < rule.minEvents) {
        return correlations;
      }

      // Group events by correlation key (e.g., userId, ipAddress)
      const groupedEvents = this.groupEventsByCorrelationKey(matchingEvents, rule);

      // Analyze each group for correlations
      for (const [groupKey, groupEvents] of Object.entries(groupedEvents)) {
        if (groupEvents.length >= rule.minEvents && groupEvents.length <= rule.maxEvents) {
          const correlation = this.createEventCorrelation(rule, groupEvents as any[], groupKey);
          if (correlation) {
            correlations.push(correlation);
          }
        }
      }

      return correlations;

    } catch (error) {
      console.error(`Failed to apply correlation rule ${rule.id}:`, error);
      return correlations;
    }
  }

  /**
   * Check if event matches rule conditions
   */
  private static eventMatchesRuleConditions(event: any, conditions: any[]): boolean {
    return conditions.every(condition => {
      const fieldValue = this.getEventFieldValue(event, condition.field);
      
      switch (condition.operator) {
        case 'equals':
          return condition.value === 'SAME' || fieldValue === condition.value;
        case 'not_equals':
          return condition.value === 'SAME' || fieldValue !== condition.value;
        case 'contains':
          return typeof fieldValue === 'string' && fieldValue.includes(condition.value);
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(fieldValue);
        case 'regex':
          return typeof fieldValue === 'string' && new RegExp(condition.value).test(fieldValue);
        default:
          return false;
      }
    });
  }

  /**
   * Get field value from event
   */
  private static getEventFieldValue(event: any, field: string): any {
    const fieldMap: Record<string, any> = {
      'action': event.action,
      'userId': event.userId,
      'propertyId': event.propertyId,
      'ipAddress': event.ipAddress,
      'timestamp': event.timestamp,
      'resource': event.resource,
      'resourceId': event.resourceId
    };

    return fieldMap[field];
  }

  /**
   * Group events by correlation key
   */
  private static groupEventsByCorrelationKey(events: any[], rule: CorrelationRule): Record<string, any[]> {
    const groups: Record<string, any[]> = {};

    // Determine correlation key based on rule conditions
    const correlationFields = this.getCorrelationFields(rule);

    for (const event of events) {
      const key = correlationFields
        .map(field => this.getEventFieldValue(event, field))
        .filter(value => value !== null && value !== undefined)
        .join('|');

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(event);
    }

    return groups;
  }

  /**
   * Get correlation fields from rule conditions
   */
  private static getCorrelationFields(rule: CorrelationRule): string[] {
    const fields = new Set<string>();
    
    for (const condition of rule.conditions) {
      if (condition.value === 'SAME' || condition.operator === 'equals') {
        fields.add(condition.field);
      }
    }

    return Array.from(fields);
  }

  /**
   * Create event correlation object
   */
  private static createEventCorrelation(
    rule: CorrelationRule, 
    events: any[], 
    correlationKey: string
  ): EventCorrelation | null {
    try {
      // Calculate time span
      const sortedEvents = events.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const firstEvent = sortedEvents[0];
      const lastEvent = sortedEvents[sortedEvents.length - 1];
      const timeSpan = new Date(lastEvent.timestamp).getTime() - new Date(firstEvent.timestamp).getTime();

      // Check if events fall within rule time window
      if (timeSpan > rule.timeWindow) {
        return null;
      }

      // Calculate base risk score
      const baseRiskScore = this.calculateBaseRiskScore(events, rule);
      const riskScore = Math.min(100, baseRiskScore * rule.riskMultiplier);

      // Extract unique indicators
      const indicators = this.extractCorrelationIndicators(events, rule);

      // Determine affected resources
      const affectedResources = this.getAffectedResources(events);

      // Create correlation pattern
      const pattern: CorrelationPattern = {
        ruleId: rule.id,
        eventCount: events.length,
        timeSpan,
        frequency: events.length / (timeSpan / 1000), // events per second
        uniqueIPs: new Set(events.map(e => e.ipAddress).filter(Boolean)).size,
        uniqueUsers: new Set(events.map(e => e.userId).filter(Boolean)).size,
        uniqueProperties: new Set(events.map(e => e.propertyId).filter(Boolean)).size
      };

      const correlation: EventCorrelation = {
        id: `correlation_${rule.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ruleId: rule.id,
        ruleName: rule.name,
        description: rule.description,
        events: events.map(e => this.convertToCorrelatedEvent(e)),
        riskScore,
        confidence: rule.confidence,
        indicators,
        affectedResources,
        pattern,
        correlationKey,
        detectedAt: new Date(),
        timeWindow: rule.timeWindow,
        priority: rule.priority
      };

      return correlation;

    } catch (error) {
      console.error('Failed to create event correlation:', error);
      return null;
    }
  }

  /**
   * Calculate base risk score for events
   */
  private static calculateBaseRiskScore(events: any[], rule: CorrelationRule): number {
    // Base score based on event count
    const eventCountScore = Math.min(50, (events.length / rule.minEvents) * 25);

    // Time density score (more events in shorter time = higher risk)
    const sortedEvents = events.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const timeSpan = new Date(sortedEvents[sortedEvents.length - 1].timestamp).getTime() - 
                    new Date(sortedEvents[0].timestamp).getTime();
    const densityScore = timeSpan > 0 ? Math.min(30, (events.length * 60000) / timeSpan) : 30;

    // Pattern complexity score
    const uniqueActions = new Set(events.map(e => e.action)).size;
    const complexityScore = Math.min(20, uniqueActions * 4);

    return eventCountScore + densityScore + complexityScore;
  }

  /**
   * Extract correlation indicators
   */
  private static extractCorrelationIndicators(events: any[], rule: CorrelationRule): ThreatIndicator[] {
    const indicators: ThreatIndicator[] = [];

    // IP indicators
    const uniqueIPs = [...new Set(events.map(e => e.ipAddress).filter(Boolean))];
    for (const ip of uniqueIPs) {
      const occurrences = events.filter(e => e.ipAddress === ip).length;
      indicators.push({
        type: 'ip',
        value: ip,
        confidence: Math.min(95, occurrences * 10),
        firstSeen: new Date(Math.min(...events.filter(e => e.ipAddress === ip).map(e => new Date(e.timestamp).getTime()))),
        lastSeen: new Date(Math.max(...events.filter(e => e.ipAddress === ip).map(e => new Date(e.timestamp).getTime()))),
        occurrences
      });
    }

    // User indicators
    const uniqueUsers = [...new Set(events.map(e => e.userId).filter(Boolean))];
    for (const userId of uniqueUsers) {
      const occurrences = events.filter(e => e.userId === userId).length;
      indicators.push({
        type: 'user',
        value: userId.toString(),
        confidence: Math.min(95, occurrences * 15),
        firstSeen: new Date(Math.min(...events.filter(e => e.userId === userId).map(e => new Date(e.timestamp).getTime()))),
        lastSeen: new Date(Math.max(...events.filter(e => e.userId === userId).map(e => new Date(e.timestamp).getTime()))),
        occurrences
      });
    }

    // Pattern indicators
    const uniqueActions = [...new Set(events.map(e => e.action))];
    if (uniqueActions.length > 1) {
      indicators.push({
        type: 'pattern',
        value: `multi_action_${uniqueActions.length}`,
        confidence: 80,
        firstSeen: new Date(events[0].timestamp),
        lastSeen: new Date(events[events.length - 1].timestamp),
        occurrences: events.length
      });
    }

    return indicators;
  }

  /**
   * Get affected resources from events
   */
  private static getAffectedResources(events: any[]): string[] {
    const resources = new Set<string>();

    for (const event of events) {
      if (event.userId) {
        resources.add(`user_${event.userId}`);
      }
      if (event.propertyId) {
        resources.add(`property_${event.propertyId}`);
      }
      if (event.resourceId) {
        resources.add(`${event.resource}_${event.resourceId}`);
      }
    }

    return Array.from(resources);
  }

  /**
   * Convert audit log to correlated event
   */
  private static convertToCorrelatedEvent(event: any): CorrelatedEvent {
    return {
      id: event.id.toString(),
      timestamp: new Date(event.timestamp),
      action: event.action,
      userId: event.userId,
      propertyId: event.propertyId,
      ipAddress: event.ipAddress,
      resource: event.resource,
      resourceId: event.resourceId,
      details: event.details || {},
      severity: this.determineSeverity(event.action),
      description: this.generateEventDescription(event)
    };
  }

  /**
   * Determine event severity
   */
  private static determineSeverity(action: string): any {
    const severityMap: Record<string, any> = {
      'FAILED_LOGIN': 'medium',
      'UNAUTHORIZED_ACCESS': 'high',
      'PERMISSION_DENIED': 'medium',
      'SECURITY_THREAT': 'high',
      'EXPORT': 'medium',
      'DOWNLOAD': 'low',
      'LOGIN': 'info',
      'LOGOUT': 'info'
    };

    return severityMap[action] || 'low';
  }

  /**
   * Generate event description
   */
  private static generateEventDescription(event: any): string {
    const actionDescriptions: Record<string, string> = {
      'LOGIN': 'User login',
      'LOGOUT': 'User logout',
      'FAILED_LOGIN': 'Failed login attempt',
      'UNAUTHORIZED_ACCESS': 'Unauthorized access attempt',
      'PERMISSION_DENIED': 'Permission denied',
      'EXPORT': 'Data export',
      'DOWNLOAD': 'File download',
      'ACCESS': 'Resource access',
      'VIEW': 'Resource view',
      'LIST': 'Resource listing',
      'SEARCH': 'Search operation'
    };

    const baseDescription = actionDescriptions[event.action] || event.action;
    const userPart = event.userId ? ` by user ${event.userId}` : '';
    const propertyPart = event.propertyId ? ` on property ${event.propertyId}` : '';
    
    return `${baseDescription}${userPart}${propertyPart}`;
  }

  /**
   * Get correlation rules
   */
  static getCorrelationRules(): CorrelationRule[] {
    return this.correlationRules;
  }

  /**
   * Add correlation rule
   */
  static addCorrelationRule(rule: CorrelationRule): void {
    this.correlationRules.push(rule);
  }

  /**
   * Update correlation rule
   */
  static updateCorrelationRule(ruleId: string, updates: Partial<CorrelationRule>): boolean {
    const ruleIndex = this.correlationRules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return false;

    this.correlationRules[ruleIndex] = { ...this.correlationRules[ruleIndex], ...updates };
    return true;
  }

  /**
   * Delete correlation rule
   */
  static deleteCorrelationRule(ruleId: string): boolean {
    const ruleIndex = this.correlationRules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return false;

    this.correlationRules.splice(ruleIndex, 1);
    return true;
  }

  /**
   * Analyze correlation effectiveness
   */
  static async analyzeCorrelationEffectiveness(days: number = 7): Promise<{
    totalCorrelations: number;
    truePositives: number;
    falsePositives: number;
    effectiveness: number;
    topRules: Array<{ ruleId: string; correlations: number; effectiveness: number }>;
  }> {
    try {
      // This would analyze historical correlation data to measure effectiveness
      // For now, return sample data
      return {
        totalCorrelations: 45,
        truePositives: 38,
        falsePositives: 7,
        effectiveness: 84.4,
        topRules: [
          { ruleId: 'coordinated_brute_force', correlations: 15, effectiveness: 93.3 },
          { ruleId: 'privilege_escalation_chain', correlations: 8, effectiveness: 87.5 },
          { ruleId: 'data_exfiltration_pattern', correlations: 12, effectiveness: 75.0 },
          { ruleId: 'lateral_movement', correlations: 6, effectiveness: 83.3 },
          { ruleId: 'reconnaissance_activity', correlations: 4, effectiveness: 50.0 }
        ]
      };
    } catch (error) {
      console.error('Failed to analyze correlation effectiveness:', error);
      throw error;
    }
  }
}