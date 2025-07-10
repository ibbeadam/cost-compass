/**
 * Threat Intelligence Feed Processor
 * Integrates external threat intelligence sources and enriches security events
 */

import { prisma } from '@/lib/prisma';
import type { 
  ThreatIntelligenceSource,
  ThreatIntelligenceIndicator,
  ThreatIntelligenceFeedConfig,
  ExternalThreatData,
  ThreatEnrichmentResult,
  IOCType,
  ThreatActor,
  AttackPattern
} from './advanced-security-types';

export class ThreatIntelligenceFeed {
  private static config: ThreatIntelligenceFeedConfig = {
    enabled: true,
    updateIntervalMs: 3600000, // 1 hour
    sources: [
      {
        id: 'internal_blocklist',
        name: 'Internal Blocklist',
        type: 'internal',
        enabled: true,
        priority: 1,
        reliability: 95
      },
      {
        id: 'known_bad_ips',
        name: 'Known Bad IPs',
        type: 'static',
        enabled: true,
        priority: 2,
        reliability: 85
      },
      {
        id: 'malware_domains',
        name: 'Malware Domains',
        type: 'static',
        enabled: true,
        priority: 3,
        reliability: 80
      }
    ],
    indicatorTypes: ['ip', 'domain', 'url', 'hash', 'email'],
    maxAge: 2592000000, // 30 days
    autoEnrichment: true
  };

  private static indicators = new Map<string, ThreatIntelligenceIndicator>();
  private static threatActors = new Map<string, ThreatActor>();
  private static attackPatterns = new Map<string, AttackPattern>();
  private static isInitialized = false;
  private static updateInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize threat intelligence feed
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Threat intelligence feed already initialized');
      return;
    }

    try {
      console.log('Initializing threat intelligence feed...');

      // Load initial threat intelligence data
      await this.loadInternalThreatData();
      await this.loadStaticThreatData();

      // Start periodic updates
      if (this.config.enabled) {
        this.startPeriodicUpdates();
      }

      this.isInitialized = true;
      console.log('Threat intelligence feed initialized successfully');

    } catch (error) {
      console.error('Failed to initialize threat intelligence feed:', error);
      throw error;
    }
  }

  /**
   * Stop threat intelligence feed
   */
  static async stop(): Promise<void> {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isInitialized = false;
    console.log('Threat intelligence feed stopped');
  }

  /**
   * Check if an indicator is malicious
   */
  static async checkIndicator(
    value: string, 
    type: IOCType
  ): Promise<ThreatEnrichmentResult | null> {
    try {
      const indicator = this.indicators.get(`${type}:${value}`);
      
      if (!indicator) {
        return null;
      }

      // Check if indicator is still valid (not expired)
      const now = Date.now();
      if (indicator.expiresAt && indicator.expiresAt.getTime() < now) {
        this.indicators.delete(`${type}:${value}`);
        return null;
      }

      return {
        indicator,
        confidence: indicator.confidence,
        severity: indicator.severity,
        sources: indicator.sources,
        firstSeen: indicator.firstSeen,
        lastSeen: indicator.lastSeen,
        threatTypes: indicator.threatTypes,
        tags: indicator.tags,
        description: indicator.description,
        mitigation: indicator.mitigation
      };

    } catch (error) {
      console.error('Failed to check threat indicator:', error);
      return null;
    }
  }

  /**
   * Enrich security event with threat intelligence
   */
  static async enrichSecurityEvent(event: any): Promise<any> {
    try {
      const enrichedEvent = { ...event };
      const enrichments: ThreatEnrichmentResult[] = [];

      // Check IP address
      if (event.ipAddress) {
        const ipEnrichment = await this.checkIndicator(event.ipAddress, 'ip');
        if (ipEnrichment) {
          enrichments.push(ipEnrichment);
        }
      }

      // Check user agent for known bad patterns
      if (event.userAgent) {
        const uaEnrichment = await this.checkUserAgent(event.userAgent);
        if (uaEnrichment) {
          enrichments.push(uaEnrichment);
        }
      }

      // Check for known attack patterns
      const patternEnrichment = await this.checkAttackPatterns(event);
      if (patternEnrichment) {
        enrichments.push(patternEnrichment);
      }

      if (enrichments.length > 0) {
        enrichedEvent.threatIntelligence = {
          enrichments,
          riskIncrease: this.calculateRiskIncrease(enrichments),
          confidence: Math.max(...enrichments.map(e => e.confidence)),
          sources: [...new Set(enrichments.flatMap(e => e.sources.map(s => s.id)))]
        };
      }

      return enrichedEvent;

    } catch (error) {
      console.error('Failed to enrich security event:', error);
      return event;
    }
  }

  /**
   * Add threat indicator
   */
  static async addThreatIndicator(indicator: Omit<ThreatIntelligenceIndicator, 'id'>): Promise<string> {
    try {
      const id = `${indicator.type}:${indicator.value}`;
      const fullIndicator: ThreatIntelligenceIndicator = {
        id,
        ...indicator,
        addedAt: new Date(),
        lastUpdated: new Date()
      };

      this.indicators.set(id, fullIndicator);

      // Log the addition
      await prisma.auditLog.create({
        data: {
          userId: null,
          action: 'THREAT_INDICATOR_ADDED',
          resource: 'security',
          resourceId: id,
          details: {
            type: indicator.type,
            value: indicator.value,
            severity: indicator.severity,
            confidence: indicator.confidence,
            sources: indicator.sources.map(s => s.id)
          }
        }
      });

      return id;

    } catch (error) {
      console.error('Failed to add threat indicator:', error);
      throw error;
    }
  }

  /**
   * Remove threat indicator
   */
  static async removeThreatIndicator(type: IOCType, value: string): Promise<boolean> {
    try {
      const id = `${type}:${value}`;
      const existed = this.indicators.has(id);
      
      if (existed) {
        this.indicators.delete(id);

        // Log the removal
        await prisma.auditLog.create({
          data: {
            userId: null,
            action: 'THREAT_INDICATOR_REMOVED',
            resource: 'security',
            resourceId: id,
            details: {
              type,
              value,
              removedAt: new Date().toISOString()
            }
          }
        });
      }

      return existed;

    } catch (error) {
      console.error('Failed to remove threat indicator:', error);
      return false;
    }
  }

  /**
   * Get threat statistics
   */
  static getThreatStatistics(): {
    totalIndicators: number;
    indicatorsByType: Record<IOCType, number>;
    indicatorsBySeverity: Record<string, number>;
    activeIndicators: number;
    expiredIndicators: number;
  } {
    const now = Date.now();
    const allIndicators = Array.from(this.indicators.values());
    
    const stats = {
      totalIndicators: allIndicators.length,
      indicatorsByType: {} as Record<IOCType, number>,
      indicatorsBySeverity: {} as Record<string, number>,
      activeIndicators: 0,
      expiredIndicators: 0
    };

    for (const indicator of allIndicators) {
      // Count by type
      stats.indicatorsByType[indicator.type] = (stats.indicatorsByType[indicator.type] || 0) + 1;
      
      // Count by severity
      stats.indicatorsBySeverity[indicator.severity] = (stats.indicatorsBySeverity[indicator.severity] || 0) + 1;
      
      // Count active vs expired
      if (indicator.expiresAt && indicator.expiresAt.getTime() < now) {
        stats.expiredIndicators++;
      } else {
        stats.activeIndicators++;
      }
    }

    return stats;
  }

  /**
   * Load internal threat data from database
   */
  private static async loadInternalThreatData(): Promise<void> {
    try {
      // Load blocked IPs from audit logs
      const blockedIPs = await prisma.auditLog.findMany({
        where: {
          action: { in: ['AUTOMATED_IP_BLOCK', 'IP_BLOCKED'] },
          timestamp: { gte: new Date(Date.now() - this.config.maxAge) }
        },
        select: {
          details: true,
          timestamp: true
        }
      });

      for (const log of blockedIPs) {
        if (log.details && typeof log.details === 'object' && 'ipAddress' in log.details) {
          const ipAddress = log.details.ipAddress as string;
          await this.addInternalIndicator({
            type: 'ip',
            value: ipAddress,
            severity: 'high',
            confidence: 90,
            description: 'Automatically blocked IP address',
            firstSeen: new Date(log.timestamp),
            lastSeen: new Date(log.timestamp),
            threatTypes: ['automated_attack'],
            tags: ['blocked', 'internal'],
            mitigation: ['ip_block']
          });
        }
      }

      console.log(`Loaded ${blockedIPs.length} internal threat indicators`);

    } catch (error) {
      console.error('Failed to load internal threat data:', error);
    }
  }

  /**
   * Load static threat data
   */
  private static async loadStaticThreatData(): Promise<void> {
    try {
      // Sample static threat data - in production, this would come from external feeds
      const staticIndicators = [
        // Known bad IPs
        { type: 'ip' as IOCType, value: '192.168.999.999', severity: 'critical', confidence: 95, description: 'Known botnet C&C', threatTypes: ['botnet'] },
        { type: 'ip' as IOCType, value: '10.0.999.999', severity: 'high', confidence: 85, description: 'Malware distribution', threatTypes: ['malware'] },
        
        // Malicious domains
        { type: 'domain' as IOCType, value: 'malicious-example.com', severity: 'high', confidence: 90, description: 'Phishing domain', threatTypes: ['phishing'] },
        { type: 'domain' as IOCType, value: 'bad-actor.net', severity: 'medium', confidence: 75, description: 'Suspicious domain', threatTypes: ['suspicious'] },

        // Known malware hashes
        { type: 'hash' as IOCType, value: 'd41d8cd98f00b204e9800998ecf8427e', severity: 'critical', confidence: 100, description: 'Known malware hash', threatTypes: ['malware'] }
      ];

      for (const indicator of staticIndicators) {
        await this.addStaticIndicator({
          ...indicator,
          firstSeen: new Date(),
          lastSeen: new Date(),
          tags: ['static', 'external'],
          mitigation: ['block', 'alert']
        });
      }

      // Load threat actors
      await this.loadThreatActors();

      // Load attack patterns
      await this.loadAttackPatterns();

      console.log(`Loaded ${staticIndicators.length} static threat indicators`);

    } catch (error) {
      console.error('Failed to load static threat data:', error);
    }
  }

  /**
   * Load threat actors
   */
  private static async loadThreatActors(): Promise<void> {
    const threatActors: ThreatActor[] = [
      {
        id: 'apt_financial_1',
        name: 'Financial Sector APT Group',
        description: 'Advanced persistent threat group targeting financial institutions',
        motivation: 'financial',
        sophistication: 'high',
        techniques: ['spear_phishing', 'privilege_escalation', 'data_exfiltration'],
        indicators: ['custom_malware', 'specific_ips'],
        firstSeen: new Date('2023-01-01'),
        lastActivity: new Date('2024-12-01'),
        aliases: ['FinancialAPT', 'MoneyHunters'],
        confidence: 85
      },
      {
        id: 'insider_threat_profile',
        name: 'Insider Threat Profile',
        description: 'Pattern matching insider threat behavior',
        motivation: 'financial',
        sophistication: 'medium',
        techniques: ['data_exfiltration', 'privilege_abuse'],
        indicators: ['unusual_access_patterns', 'large_data_exports'],
        firstSeen: new Date('2024-01-01'),
        lastActivity: new Date(),
        aliases: ['InsiderThreat'],
        confidence: 70
      }
    ];

    for (const actor of threatActors) {
      this.threatActors.set(actor.id, actor);
    }
  }

  /**
   * Load attack patterns
   */
  private static async loadAttackPatterns(): Promise<void> {
    const attackPatterns: AttackPattern[] = [
      {
        id: 'credential_stuffing_pattern',
        name: 'Credential Stuffing Attack',
        description: 'Automated credential validation using stolen username/password pairs',
        tactics: ['initial_access'],
        techniques: ['brute_force'],
        indicators: ['multiple_failed_logins', 'automated_behavior'],
        mitigation: ['rate_limiting', 'account_lockout', 'captcha'],
        severity: 'high',
        confidence: 90
      },
      {
        id: 'privilege_escalation_chain',
        name: 'Privilege Escalation Chain',
        description: 'Sequential privilege escalation to gain administrative access',
        tactics: ['privilege_escalation'],
        techniques: ['permission_abuse', 'role_escalation'],
        indicators: ['sequential_permission_changes', 'unusual_role_assignments'],
        mitigation: ['least_privilege', 'approval_workflow', 'monitoring'],
        severity: 'critical',
        confidence: 95
      },
      {
        id: 'data_exfiltration_pattern',
        name: 'Data Exfiltration Pattern',
        description: 'Systematic extraction of sensitive data',
        tactics: ['exfiltration'],
        techniques: ['data_export', 'bulk_download'],
        indicators: ['large_data_transfers', 'unusual_export_activity'],
        mitigation: ['dlp', 'access_controls', 'monitoring'],
        severity: 'critical',
        confidence: 85
      }
    ];

    for (const pattern of attackPatterns) {
      this.attackPatterns.set(pattern.id, pattern);
    }
  }

  /**
   * Add internal indicator
   */
  private static async addInternalIndicator(indicator: Omit<ThreatIntelligenceIndicator, 'id' | 'sources' | 'addedAt' | 'lastUpdated'>): Promise<void> {
    const source = this.config.sources.find(s => s.id === 'internal_blocklist')!;
    const fullIndicator: ThreatIntelligenceIndicator = {
      id: `${indicator.type}:${indicator.value}`,
      ...indicator,
      sources: [source],
      addedAt: new Date(),
      lastUpdated: new Date(),
      expiresAt: new Date(Date.now() + this.config.maxAge)
    };

    this.indicators.set(fullIndicator.id, fullIndicator);
  }

  /**
   * Add static indicator
   */
  private static async addStaticIndicator(indicator: Omit<ThreatIntelligenceIndicator, 'id' | 'sources' | 'addedAt' | 'lastUpdated'>): Promise<void> {
    const source = this.config.sources.find(s => s.type === 'static')!;
    const fullIndicator: ThreatIntelligenceIndicator = {
      id: `${indicator.type}:${indicator.value}`,
      ...indicator,
      sources: [source],
      addedAt: new Date(),
      lastUpdated: new Date(),
      expiresAt: new Date(Date.now() + this.config.maxAge)
    };

    this.indicators.set(fullIndicator.id, fullIndicator);
  }

  /**
   * Check user agent for threats
   */
  private static async checkUserAgent(userAgent: string): Promise<ThreatEnrichmentResult | null> {
    // Check for known malicious user agents
    const maliciousPatterns = [
      /sqlmap/i,
      /nikto/i,
      /nessus/i,
      /burp/i,
      /wget/i,
      /curl/i
    ];

    for (const pattern of maliciousPatterns) {
      if (pattern.test(userAgent)) {
        return {
          indicator: {
            id: `user_agent:${userAgent}`,
            type: 'pattern',
            value: userAgent,
            severity: 'medium',
            confidence: 80,
            description: 'Suspicious user agent pattern',
            firstSeen: new Date(),
            lastSeen: new Date(),
            threatTypes: ['reconnaissance', 'scanning'],
            tags: ['user_agent', 'suspicious'],
            sources: [this.config.sources.find(s => s.id === 'internal_blocklist')!],
            mitigation: ['block', 'monitor'],
            addedAt: new Date(),
            lastUpdated: new Date()
          },
          confidence: 80,
          severity: 'medium',
          sources: [this.config.sources.find(s => s.id === 'internal_blocklist')!],
          firstSeen: new Date(),
          lastSeen: new Date(),
          threatTypes: ['reconnaissance', 'scanning'],
          tags: ['user_agent', 'suspicious'],
          description: 'Suspicious user agent pattern detected',
          mitigation: ['block', 'monitor']
        };
      }
    }

    return null;
  }

  /**
   * Check for attack patterns in event
   */
  private static async checkAttackPatterns(event: any): Promise<ThreatEnrichmentResult | null> {
    // Check for rapid successive actions (potential automation)
    if (event.details && event.details.rapid_actions) {
      const pattern = this.attackPatterns.get('credential_stuffing_pattern');
      if (pattern) {
        return {
          indicator: {
            id: `pattern:rapid_actions`,
            type: 'pattern',
            value: 'rapid_successive_actions',
            severity: pattern.severity,
            confidence: pattern.confidence,
            description: pattern.description,
            firstSeen: new Date(),
            lastSeen: new Date(),
            threatTypes: ['automated_attack'],
            tags: ['pattern', 'automation'],
            sources: [this.config.sources.find(s => s.id === 'internal_blocklist')!],
            mitigation: pattern.mitigation,
            addedAt: new Date(),
            lastUpdated: new Date()
          },
          confidence: pattern.confidence,
          severity: pattern.severity,
          sources: [this.config.sources.find(s => s.id === 'internal_blocklist')!],
          firstSeen: new Date(),
          lastSeen: new Date(),
          threatTypes: ['automated_attack'],
          tags: ['pattern', 'automation'],
          description: pattern.description,
          mitigation: pattern.mitigation
        };
      }
    }

    return null;
  }

  /**
   * Calculate risk increase from enrichments
   */
  private static calculateRiskIncrease(enrichments: ThreatEnrichmentResult[]): number {
    let totalIncrease = 0;

    for (const enrichment of enrichments) {
      const severityMultiplier = {
        'info': 0.1,
        'low': 0.25,
        'medium': 0.5,
        'high': 0.75,
        'critical': 1.0
      }[enrichment.severity] || 0.1;

      const confidenceMultiplier = enrichment.confidence / 100;
      totalIncrease += 20 * severityMultiplier * confidenceMultiplier;
    }

    return Math.min(50, totalIncrease); // Cap at 50 point increase
  }

  /**
   * Start periodic updates
   */
  private static startPeriodicUpdates(): void {
    this.updateInterval = setInterval(async () => {
      try {
        await this.updateThreatData();
      } catch (error) {
        console.error('Periodic threat intelligence update failed:', error);
      }
    }, this.config.updateIntervalMs);
  }

  /**
   * Update threat data
   */
  private static async updateThreatData(): Promise<void> {
    try {
      console.log('Updating threat intelligence data...');

      // Clean expired indicators
      await this.cleanExpiredIndicators();

      // Reload internal data
      await this.loadInternalThreatData();

      console.log('Threat intelligence data updated successfully');

    } catch (error) {
      console.error('Failed to update threat intelligence data:', error);
    }
  }

  /**
   * Clean expired indicators
   */
  private static async cleanExpiredIndicators(): Promise<void> {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, indicator] of this.indicators) {
      if (indicator.expiresAt && indicator.expiresAt.getTime() < now) {
        this.indicators.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned ${cleanedCount} expired threat indicators`);
    }
  }

  /**
   * Get configuration
   */
  static getConfig(): ThreatIntelligenceFeedConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  static updateConfig(updates: Partial<ThreatIntelligenceFeedConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // Restart updates if interval changed
    if (this.updateInterval && updates.updateIntervalMs) {
      clearInterval(this.updateInterval);
      this.startPeriodicUpdates();
    }
  }
}