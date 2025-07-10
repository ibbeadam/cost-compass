/**
 * Real-time Security Monitoring Service
 * Provides continuous threat monitoring with automated response capabilities
 */

import { EventEmitter } from 'events';
import { prisma } from '@/lib/prisma';
import { AdvancedThreatDetector } from './advanced-threat-detector';
import { AutomatedResponseEngine } from './automated-response-engine';
import { SecurityEventCorrelator } from './security-event-correlator';
import { ThreatIntelligenceFeed } from './threat-intelligence-feed';
import type { 
  SecurityEvent, 
  ThreatIntelligence, 
  SecurityAlert,
  SecurityMonitorConfig,
  RealTimeMonitoringStats,
  SecurityIncident
} from './advanced-security-types';

export interface RealTimeSecurityMonitor {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  getStats(): RealTimeMonitoringStats;
  forceCheck(): Promise<void>;
  updateConfig(config: Partial<SecurityMonitorConfig>): void;
}

export class RealTimeSecurityMonitorService extends EventEmitter implements RealTimeSecurityMonitor {
  private isActive = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private threatDetectionInterval: NodeJS.Timeout | null = null;
  private correlationInterval: NodeJS.Timeout | null = null;
  private config: SecurityMonitorConfig;
  private stats: RealTimeMonitoringStats;
  private lastEventId = 0;

  constructor(config?: Partial<SecurityMonitorConfig>) {
    super();
    
    this.config = {
      monitoringIntervalMs: 5000, // Check every 5 seconds
      threatDetectionIntervalMs: 10000, // Deep threat analysis every 10 seconds
      correlationIntervalMs: 15000, // Event correlation every 15 seconds
      maxEventsPerBatch: 100,
      alertThresholds: {
        critical: 1,
        high: 3,
        medium: 5,
        low: 10,
        info: 20
      },
      autoResponseEnabled: true,
      maxAutoResponsesPerHour: 50,
      enableBehavioralAnalysis: true,
      enableThreatIntelligence: true,
      logLevel: 'info',
      ...config
    };

    this.stats = {
      startTime: new Date(),
      eventsProcessed: 0,
      threatsDetected: 0,
      autoResponsesTriggered: 0,
      alertsSent: 0,
      lastCheck: new Date(),
      systemStatus: 'stopped',
      averageResponseTime: 0,
      falsePositiveRate: 0
    };
  }

  /**
   * Start real-time monitoring
   */
  async start(): Promise<void> {
    if (this.isActive) {
      console.log('Real-time security monitor is already running');
      return;
    }

    console.log('Starting real-time security monitoring...');
    this.isActive = true;
    this.stats.startTime = new Date();
    this.stats.systemStatus = 'starting';

    try {
      // Initialize threat intelligence feed
      if (this.config.enableThreatIntelligence) {
        await ThreatIntelligenceFeed.initialize();
      }

      // Start monitoring intervals
      this.startMonitoringIntervals();

      this.stats.systemStatus = 'running';
      this.emit('started');
      
      console.log('Real-time security monitoring started successfully');
    } catch (error) {
      console.error('Failed to start real-time security monitoring:', error);
      this.stats.systemStatus = 'error';
      this.isActive = false;
      throw error;
    }
  }

  /**
   * Stop real-time monitoring
   */
  async stop(): Promise<void> {
    if (!this.isActive) {
      console.log('Real-time security monitor is not running');
      return;
    }

    console.log('Stopping real-time security monitoring...');
    this.isActive = false;
    this.stats.systemStatus = 'stopping';

    // Clear all intervals
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.threatDetectionInterval) {
      clearInterval(this.threatDetectionInterval);
      this.threatDetectionInterval = null;
    }

    if (this.correlationInterval) {
      clearInterval(this.correlationInterval);
      this.correlationInterval = null;
    }

    this.stats.systemStatus = 'stopped';
    this.emit('stopped');
    
    console.log('Real-time security monitoring stopped');
  }

  /**
   * Check if monitoring is running
   */
  isRunning(): boolean {
    return this.isActive && this.stats.systemStatus === 'running';
  }

  /**
   * Get current monitoring statistics
   */
  getStats(): RealTimeMonitoringStats {
    return {
      ...this.stats,
      uptime: this.isActive ? Date.now() - this.stats.startTime.getTime() : 0
    };
  }

  /**
   * Force an immediate security check
   */
  async forceCheck(): Promise<void> {
    if (!this.isActive) {
      throw new Error('Monitor is not running');
    }

    console.log('Forcing immediate security check...');
    await this.performSecurityCheck();
    await this.performThreatDetection();
    await this.performEventCorrelation();
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(newConfig: Partial<SecurityMonitorConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    this.emit('configUpdated', { oldConfig, newConfig: this.config });
    
    // Restart intervals if timing changed
    if (this.isActive && (
      newConfig.monitoringIntervalMs || 
      newConfig.threatDetectionIntervalMs || 
      newConfig.correlationIntervalMs
    )) {
      this.restartMonitoringIntervals();
    }
  }

  /**
   * Start all monitoring intervals
   */
  private startMonitoringIntervals(): void {
    // Main security monitoring
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performSecurityCheck();
      } catch (error) {
        console.error('Error in security check:', error);
        this.emit('error', error);
      }
    }, this.config.monitoringIntervalMs);

    // Deep threat detection
    this.threatDetectionInterval = setInterval(async () => {
      try {
        await this.performThreatDetection();
      } catch (error) {
        console.error('Error in threat detection:', error);
        this.emit('error', error);
      }
    }, this.config.threatDetectionIntervalMs);

    // Event correlation
    this.correlationInterval = setInterval(async () => {
      try {
        await this.performEventCorrelation();
      } catch (error) {
        console.error('Error in event correlation:', error);
        this.emit('error', error);
      }
    }, this.config.correlationIntervalMs);
  }

  /**
   * Restart monitoring intervals with new timing
   */
  private restartMonitoringIntervals(): void {
    // Stop current intervals
    if (this.monitoringInterval) clearInterval(this.monitoringInterval);
    if (this.threatDetectionInterval) clearInterval(this.threatDetectionInterval);
    if (this.correlationInterval) clearInterval(this.correlationInterval);

    // Start with new timing
    this.startMonitoringIntervals();
  }

  /**
   * Perform main security check
   */
  private async performSecurityCheck(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Get new security events since last check
      const newEvents = await this.getNewSecurityEvents();
      
      if (newEvents.length > 0) {
        this.stats.eventsProcessed += newEvents.length;
        
        // Process each event
        for (const event of newEvents) {
          await this.processSecurityEvent(event);
        }
      }

      this.stats.lastCheck = new Date();
      this.stats.averageResponseTime = Date.now() - startTime;
      
    } catch (error) {
      console.error('Security check failed:', error);
      throw error;
    }
  }

  /**
   * Perform advanced threat detection
   */
  private async performThreatDetection(): Promise<void> {
    try {
      // Get recent audit logs for analysis
      const recentLogs = await prisma.auditLog.findMany({
        where: {
          timestamp: {
            gte: new Date(Date.now() - this.config.threatDetectionIntervalMs * 2)
          }
        },
        orderBy: { timestamp: 'desc' },
        take: this.config.maxEventsPerBatch
      });

      // Convert audit logs to security events and analyze
      for (const log of recentLogs) {
        const securityEvent = this.convertAuditLogToSecurityEvent(log);
        if (securityEvent) {
          const threats = await AdvancedThreatDetector.analyzeSecurityEvent(securityEvent);
          
          if (threats.length > 0) {
            this.stats.threatsDetected += threats.length;
            
            for (const threat of threats) {
              await this.handleDetectedThreat(threat);
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Threat detection failed:', error);
      throw error;
    }
  }

  /**
   * Perform event correlation analysis
   */
  private async performEventCorrelation(): Promise<void> {
    try {
      const correlatedEvents = await SecurityEventCorrelator.correlateRecentEvents(
        this.config.correlationIntervalMs
      );

      for (const correlation of correlatedEvents) {
        if (correlation.riskScore >= 70) {
          await this.handleCorrelatedThreat(correlation);
        }
      }
      
    } catch (error) {
      console.error('Event correlation failed:', error);
      throw error;
    }
  }

  /**
   * Get new security events since last check
   */
  private async getNewSecurityEvents(): Promise<SecurityEvent[]> {
    try {
      const newLogs = await prisma.auditLog.findMany({
        where: {
          id: { gt: this.lastEventId },
          OR: [
            { action: { contains: 'SECURITY' } },
            { action: { contains: 'LOGIN' } },
            { action: { contains: 'LOGOUT' } },
            { action: 'UNAUTHORIZED_ACCESS' },
            { action: 'PERMISSION_DENIED' },
            { action: 'FAILED_LOGIN' }
          ]
        },
        orderBy: { id: 'asc' },
        take: this.config.maxEventsPerBatch
      });

      const events: SecurityEvent[] = [];
      for (const log of newLogs) {
        const event = this.convertAuditLogToSecurityEvent(log);
        if (event) {
          events.push(event);
        }
        this.lastEventId = Math.max(this.lastEventId, log.id);
      }

      return events;
    } catch (error) {
      console.error('Failed to get new security events:', error);
      return [];
    }
  }

  /**
   * Convert audit log to security event
   */
  private convertAuditLogToSecurityEvent(log: any): SecurityEvent | null {
    try {
      const eventType = this.mapActionToEventType(log.action);
      if (!eventType) return null;

      return {
        id: `event_${log.id}`,
        timestamp: log.timestamp,
        userId: log.userId,
        propertyId: log.propertyId,
        eventType,
        severity: this.determineSeverity(log.action),
        source: 'system',
        details: log.details || {},
        ipAddress: log.ipAddress
      };
    } catch (error) {
      console.error('Failed to convert audit log to security event:', error);
      return null;
    }
  }

  /**
   * Map audit action to security event type
   */
  private mapActionToEventType(action: string): any {
    const mappings: Record<string, any> = {
      'LOGIN': 'login_success',
      'FAILED_LOGIN': 'login_failure',
      'LOGOUT': 'logout',
      'UNAUTHORIZED_ACCESS': 'unusual_activity',
      'PERMISSION_DENIED': 'unusual_activity',
      'EXPORT': 'data_export',
      'DOWNLOAD': 'file_download'
    };

    return mappings[action] || 'unusual_activity';
  }

  /**
   * Determine event severity
   */
  private determineSeverity(action: string): any {
    const severityMap: Record<string, any> = {
      'FAILED_LOGIN': 'medium',
      'UNAUTHORIZED_ACCESS': 'high',
      'PERMISSION_DENIED': 'medium',
      'SECURITY_THREAT': 'high',
      'LOGIN': 'info',
      'LOGOUT': 'info'
    };

    return severityMap[action] || 'low';
  }

  /**
   * Process a security event
   */
  private async processSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      this.emit('securityEvent', event);

      // Analyze for threats
      const threats = await AdvancedThreatDetector.analyzeSecurityEvent(event);
      
      if (threats.length > 0) {
        for (const threat of threats) {
          await this.handleDetectedThreat(threat);
        }
      }

    } catch (error) {
      console.error('Failed to process security event:', error);
    }
  }

  /**
   * Handle a detected threat
   */
  private async handleDetectedThreat(threat: ThreatIntelligence): Promise<void> {
    try {
      this.emit('threatDetected', threat);

      // Create security incident
      const incident = await this.createSecurityIncident(threat);

      // Trigger automated response if enabled
      if (this.config.autoResponseEnabled && this.shouldTriggerAutoResponse(threat)) {
        await this.triggerAutomatedResponse(threat, incident);
      }

      // Send alerts
      await this.sendSecurityAlert(threat, incident);

    } catch (error) {
      console.error('Failed to handle detected threat:', error);
    }
  }

  /**
   * Handle correlated threat
   */
  private async handleCorrelatedThreat(correlation: any): Promise<void> {
    try {
      this.emit('correlatedThreat', correlation);
      
      // Create composite threat intelligence
      const threat: ThreatIntelligence = {
        threatId: `correlated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        threatType: 'coordinated_attack',
        riskScore: correlation.riskScore,
        confidence: correlation.confidence,
        indicators: correlation.indicators,
        mitigation: [],
        timeline: correlation.events.map((e: any) => ({
          timestamp: e.timestamp,
          event: e.description,
          details: e.details,
          severity: e.severity
        })),
        affectedResources: correlation.affectedResources,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.handleDetectedThreat(threat);

    } catch (error) {
      console.error('Failed to handle correlated threat:', error);
    }
  }

  /**
   * Create security incident
   */
  private async createSecurityIncident(threat: ThreatIntelligence): Promise<SecurityIncident> {
    const incident: SecurityIncident = {
      id: `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      threatId: threat.threatId,
      severity: threat.riskScore >= 90 ? 'critical' : 
                threat.riskScore >= 75 ? 'high' :
                threat.riskScore >= 50 ? 'medium' : 'low',
      status: 'open',
      title: `Security Incident: ${threat.threatType.replace(/_/g, ' ').toUpperCase()}`,
      description: `Threat detected with risk score ${threat.riskScore}/100`,
      affectedResources: threat.affectedResources,
      createdAt: new Date(),
      updatedAt: new Date(),
      assignedTo: null,
      escalated: threat.riskScore >= 90,
      timeline: [...threat.timeline],
      evidence: threat.indicators.map(i => ({
        type: i.type,
        value: i.value,
        timestamp: i.firstSeen,
        confidence: i.confidence
      })),
      responseActions: [],
      resolution: null
    };

    this.emit('incidentCreated', incident);
    return incident;
  }

  /**
   * Check if automated response should be triggered
   */
  private shouldTriggerAutoResponse(threat: ThreatIntelligence): boolean {
    // Check rate limiting
    if (this.stats.autoResponsesTriggered >= this.config.maxAutoResponsesPerHour) {
      return false;
    }

    // Check threat severity
    if (threat.riskScore < 60) {
      return false;
    }

    return true;
  }

  /**
   * Trigger automated response
   */
  private async triggerAutomatedResponse(threat: ThreatIntelligence, incident: SecurityIncident): Promise<void> {
    try {
      const response = await AutomatedResponseEngine.executeResponse(threat, incident);
      
      if (response.success) {
        this.stats.autoResponsesTriggered++;
        this.emit('autoResponseTriggered', { threat, incident, response });
      }

    } catch (error) {
      console.error('Automated response failed:', error);
      this.emit('autoResponseFailed', { threat, incident, error });
    }
  }

  /**
   * Send security alert
   */
  private async sendSecurityAlert(threat: ThreatIntelligence, incident: SecurityIncident): Promise<void> {
    try {
      const alert: SecurityAlert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        threatId: threat.threatId,
        alertLevel: threat.riskScore >= 90 ? 'critical' : 
                   threat.riskScore >= 75 ? 'high' :
                   threat.riskScore >= 50 ? 'medium' : 'low',
        title: `Security Alert: ${threat.threatType.replace(/_/g, ' ').toUpperCase()}`,
        message: `Risk Score: ${threat.riskScore}/100 - ${threat.affectedResources.join(', ')}`,
        details: {
          incidentId: incident.id,
          confidence: threat.confidence,
          indicators: threat.indicators.length,
          mitigation: threat.mitigation.length
        },
        channels: this.determineAlertChannels(threat.riskScore),
        recipients: [], // Would be populated with actual recipients
        sent: true,
        sentAt: new Date(),
        acknowledged: false,
        actionRequired: threat.riskScore >= 75,
        actionsTaken: [],
        escalated: threat.riskScore >= 90
      };

      this.stats.alertsSent++;
      this.emit('alertSent', alert);

    } catch (error) {
      console.error('Failed to send security alert:', error);
    }
  }

  /**
   * Determine alert channels based on threat severity
   */
  private determineAlertChannels(riskScore: number): Array<'email' | 'sms' | 'push' | 'dashboard' | 'webhook' | 'slack'> {
    if (riskScore >= 90) {
      return ['email', 'sms', 'push', 'dashboard', 'webhook'];
    } else if (riskScore >= 75) {
      return ['email', 'push', 'dashboard', 'webhook'];
    } else if (riskScore >= 50) {
      return ['dashboard', 'webhook'];
    } else {
      return ['dashboard'];
    }
  }
}

// Singleton instance
export const RealTimeSecurityMonitor = new RealTimeSecurityMonitorService();