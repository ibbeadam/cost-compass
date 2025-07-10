/**
 * External Threat Feed Integration System
 * Integrates with external threat intelligence sources and processes threat data
 */

import { prisma } from '@/lib/prisma';
import type { 
  ExternalThreatFeed,
  ThreatIntelligenceIndicator,
  ThreatIntelligenceSource,
  ExternalThreatData,
  ThreatEnrichmentResult,
  IOCType,
  ThreatActor,
  AttackPattern,
  SecuritySeverity
} from './advanced-security-types';

export class ExternalThreatFeedManager {
  private static feeds = new Map<string, ExternalThreatFeed>();
  private static indicators = new Map<string, ThreatIntelligenceIndicator>();
  private static threatActors = new Map<string, ThreatActor>();
  private static attackPatterns = new Map<string, AttackPattern>();
  private static isInitialized = false;
  private static updateIntervals = new Map<string, NodeJS.Timeout>();

  /**
   * Initialize external threat feed system
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('External Threat Feed Manager already initialized');
      return;
    }

    try {
      console.log('Initializing External Threat Feed Manager...');

      // Initialize threat feed sources
      await this.initializeThreatFeeds();

      // Load existing indicators
      await this.loadExistingIndicators();

      // Start feed update cycles
      this.startFeedUpdateCycles();

      // Perform initial data sync
      await this.performInitialSync();

      this.isInitialized = true;
      console.log('External Threat Feed Manager initialized successfully');

    } catch (error) {
      console.error('Failed to initialize External Threat Feed Manager:', error);
      throw error;
    }
  }

  /**
   * Update threat feeds from external sources
   */
  static async updateThreatFeeds(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log('Updating external threat feeds...');

      const updatePromises: Promise<void>[] = [];
      
      for (const [feedId, feed] of this.feeds) {
        if (feed.enabled && this.shouldUpdateFeed(feed)) {
          updatePromises.push(this.updateFeed(feed));
        }
      }

      await Promise.all(updatePromises);
      console.log('External threat feeds updated successfully');

    } catch (error) {
      console.error('Failed to update threat feeds:', error);
    }
  }

  /**
   * Update individual threat feed
   */
  private static async updateFeed(feed: ExternalThreatFeed): Promise<void> {
    try {
      console.log(`Updating feed: ${feed.name}`);

      const externalData = await this.fetchExternalData(feed);
      if (externalData) {
        await this.processExternalData(feed, externalData);
        
        // Update feed statistics
        feed.lastUpdate = new Date();
        feed.statistics.newIndicators = externalData.indicators.length;
        feed.statistics.totalIndicators += externalData.indicators.length;
        
        console.log(`Feed ${feed.name} updated: ${externalData.indicators.length} new indicators`);
      }

    } catch (error) {
      console.error(`Failed to update feed ${feed.name}:`, error);
    }
  }

  /**
   * Fetch data from external threat source
   */
  private static async fetchExternalData(feed: ExternalThreatFeed): Promise<ExternalThreatData | null> {
    try {
      // Simulate external API call based on feed type
      switch (feed.type) {
        case 'commercial':
          return await this.fetchCommercialThreatData(feed);
        case 'open_source':
          return await this.fetchOpenSourceThreatData(feed);
        case 'government':
          return await this.fetchGovernmentThreatData(feed);
        case 'community':
          return await this.fetchCommunityThreatData(feed);
        default:
          return null;
      }
    } catch (error) {
      console.error(`Failed to fetch data from ${feed.name}:`, error);
      return null;
    }
  }

  /**
   * Process external threat data
   */
  private static async processExternalData(feed: ExternalThreatFeed, data: ExternalThreatData): Promise<void> {
    try {
      // Process threat indicators
      for (const indicator of data.indicators) {
        await this.processIndicator(indicator, feed);
      }

      // Process threat actors
      for (const actor of data.threatActors) {
        await this.processThreatActor(actor, feed);
      }

      // Process attack patterns
      for (const pattern of data.attackPatterns) {
        await this.processAttackPattern(pattern, feed);
      }

      // Clean up expired indicators
      await this.cleanupExpiredIndicators();

    } catch (error) {
      console.error(`Failed to process data from ${feed.name}:`, error);
    }
  }

  /**
   * Process threat indicator
   */
  private static async processIndicator(indicator: ThreatIntelligenceIndicator, feed: ExternalThreatFeed): Promise<void> {
    try {
      // Check if indicator already exists
      const existingIndicator = this.indicators.get(indicator.id);
      
      if (existingIndicator) {
        // Update existing indicator
        existingIndicator.lastSeen = new Date();
        existingIndicator.lastUpdated = new Date();
        
        // Merge sources
        const sourceExists = existingIndicator.sources.some(s => s.id === feed.id);
        if (!sourceExists) {
          existingIndicator.sources.push(this.createThreatSource(feed));
        }
      } else {
        // Add new indicator
        const newIndicator: ThreatIntelligenceIndicator = {
          ...indicator,
          sources: [this.createThreatSource(feed)],
          addedAt: new Date(),
          lastUpdated: new Date()
        };
        
        this.indicators.set(indicator.id, newIndicator);
      }

      // Log indicator for audit
      await this.logIndicatorActivity(indicator, feed, existingIndicator ? 'updated' : 'added');

    } catch (error) {
      console.error(`Failed to process indicator ${indicator.id}:`, error);
    }
  }

  /**
   * Process threat actor
   */
  private static async processThreatActor(actor: ThreatActor, feed: ExternalThreatFeed): Promise<void> {
    try {
      const existingActor = this.threatActors.get(actor.id);
      
      if (existingActor) {
        // Update existing actor
        existingActor.lastActivity = new Date();
        existingActor.techniques = [...new Set([...existingActor.techniques, ...actor.techniques])];
        existingActor.indicators = [...new Set([...existingActor.indicators, ...actor.indicators])];
      } else {
        // Add new actor
        this.threatActors.set(actor.id, actor);
      }

    } catch (error) {
      console.error(`Failed to process threat actor ${actor.id}:`, error);
    }
  }

  /**
   * Process attack pattern
   */
  private static async processAttackPattern(pattern: AttackPattern, feed: ExternalThreatFeed): Promise<void> {
    try {
      const existingPattern = this.attackPatterns.get(pattern.id);
      
      if (existingPattern) {
        // Update existing pattern
        existingPattern.techniques = [...new Set([...existingPattern.techniques, ...pattern.techniques])];
        existingPattern.indicators = [...new Set([...existingPattern.indicators, ...pattern.indicators])];
      } else {
        // Add new pattern
        this.attackPatterns.set(pattern.id, pattern);
      }

    } catch (error) {
      console.error(`Failed to process attack pattern ${pattern.id}:`, error);
    }
  }

  /**
   * Enrich security event with threat intelligence
   */
  static async enrichSecurityEvent(event: any): Promise<ThreatEnrichmentResult[]> {
    const enrichmentResults: ThreatEnrichmentResult[] = [];

    try {
      // Extract IOCs from event
      const iocs = this.extractIOCs(event);

      // Check each IOC against threat indicators
      for (const ioc of iocs) {
        const matchingIndicators = this.findMatchingIndicators(ioc);
        
        for (const indicator of matchingIndicators) {
          enrichmentResults.push({
            indicator,
            confidence: this.calculateEnrichmentConfidence(ioc, indicator),
            severity: indicator.severity,
            sources: indicator.sources,
            firstSeen: indicator.firstSeen,
            lastSeen: indicator.lastSeen,
            threatTypes: indicator.threatTypes,
            tags: indicator.tags,
            description: indicator.description,
            mitigation: indicator.mitigation
          });
        }
      }

      return enrichmentResults;

    } catch (error) {
      console.error('Failed to enrich security event:', error);
      return [];
    }
  }

  /**
   * Get threat intelligence for specific IOC
   */
  static async getThreatIntelligence(iocType: IOCType, iocValue: string): Promise<ThreatIntelligenceIndicator | null> {
    try {
      for (const [, indicator] of this.indicators) {
        if (indicator.type === iocType && indicator.value === iocValue) {
          return indicator;
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to get threat intelligence:', error);
      return null;
    }
  }

  /**
   * Initialize threat feeds
   */
  private static async initializeThreatFeeds(): Promise<void> {
    const feeds: ExternalThreatFeed[] = [
      {
        id: 'misp_feed',
        name: 'MISP Threat Intelligence Feed',
        provider: 'MISP Community',
        type: 'community',
        dataTypes: ['ip', 'domain', 'hash', 'url'],
        updateFrequency: 3600000, // 1 hour
        lastUpdate: new Date(0),
        reliability: 85,
        coverage: ['malware', 'phishing', 'botnet'],
        apiEndpoint: 'https://misp.example.com/api',
        enabled: true,
        statistics: {
          totalIndicators: 0,
          newIndicators: 0,
          expiredIndicators: 0,
          accuracyRate: 0.85
        }
      },
      {
        id: 'otx_feed',
        name: 'AlienVault OTX Feed',
        provider: 'AlienVault',
        type: 'open_source',
        dataTypes: ['ip', 'domain', 'hash', 'url', 'email'],
        updateFrequency: 1800000, // 30 minutes
        lastUpdate: new Date(0),
        reliability: 80,
        coverage: ['malware', 'phishing', 'apt'],
        apiEndpoint: 'https://otx.alienvault.com/api',
        enabled: true,
        statistics: {
          totalIndicators: 0,
          newIndicators: 0,
          expiredIndicators: 0,
          accuracyRate: 0.80
        }
      },
      {
        id: 'commercial_feed',
        name: 'Commercial Threat Intelligence',
        provider: 'ThreatConnect',
        type: 'commercial',
        dataTypes: ['ip', 'domain', 'hash', 'url', 'email', 'pattern'],
        updateFrequency: 900000, // 15 minutes
        lastUpdate: new Date(0),
        reliability: 95,
        coverage: ['apt', 'malware', 'phishing', 'ransomware'],
        apiEndpoint: 'https://api.threatconnect.com',
        enabled: true,
        statistics: {
          totalIndicators: 0,
          newIndicators: 0,
          expiredIndicators: 0,
          accuracyRate: 0.95
        }
      },
      {
        id: 'government_feed',
        name: 'Government Threat Feed',
        provider: 'CISA',
        type: 'government',
        dataTypes: ['ip', 'domain', 'hash', 'pattern'],
        updateFrequency: 7200000, // 2 hours
        lastUpdate: new Date(0),
        reliability: 98,
        coverage: ['nation_state', 'critical_infrastructure'],
        apiEndpoint: 'https://cisa.gov/api/threat-intel',
        enabled: true,
        statistics: {
          totalIndicators: 0,
          newIndicators: 0,
          expiredIndicators: 0,
          accuracyRate: 0.98
        }
      }
    ];

    for (const feed of feeds) {
      this.feeds.set(feed.id, feed);
    }

    console.log(`Initialized ${feeds.length} threat feeds`);
  }

  /**
   * Load existing indicators from database
   */
  private static async loadExistingIndicators(): Promise<void> {
    // In a real implementation, this would load from database
    console.log('Loading existing threat indicators...');
  }

  /**
   * Start feed update cycles
   */
  private static startFeedUpdateCycles(): void {
    for (const [feedId, feed] of this.feeds) {
      if (feed.enabled) {
        const interval = setInterval(async () => {
          await this.updateFeed(feed);
        }, feed.updateFrequency);
        
        this.updateIntervals.set(feedId, interval);
      }
    }
  }

  /**
   * Perform initial sync
   */
  private static async performInitialSync(): Promise<void> {
    console.log('Performing initial threat feed sync...');
    await this.updateThreatFeeds();
  }

  /**
   * Check if feed should be updated
   */
  private static shouldUpdateFeed(feed: ExternalThreatFeed): boolean {
    const timeSinceLastUpdate = Date.now() - feed.lastUpdate.getTime();
    return timeSinceLastUpdate >= feed.updateFrequency;
  }

  /**
   * Fetch commercial threat data
   */
  private static async fetchCommercialThreatData(feed: ExternalThreatFeed): Promise<ExternalThreatData> {
    // Simulate commercial API call
    return {
      indicators: this.generateSampleIndicators(10, 'commercial'),
      threatActors: this.generateSampleThreatActors(2),
      attackPatterns: this.generateSampleAttackPatterns(3),
      lastUpdated: new Date(),
      source: this.createThreatSource(feed)
    };
  }

  /**
   * Fetch open source threat data
   */
  private static async fetchOpenSourceThreatData(feed: ExternalThreatFeed): Promise<ExternalThreatData> {
    // Simulate open source API call
    return {
      indicators: this.generateSampleIndicators(15, 'open_source'),
      threatActors: this.generateSampleThreatActors(3),
      attackPatterns: this.generateSampleAttackPatterns(5),
      lastUpdated: new Date(),
      source: this.createThreatSource(feed)
    };
  }

  /**
   * Fetch government threat data
   */
  private static async fetchGovernmentThreatData(feed: ExternalThreatFeed): Promise<ExternalThreatData> {
    // Simulate government API call
    return {
      indicators: this.generateSampleIndicators(5, 'government'),
      threatActors: this.generateSampleThreatActors(1),
      attackPatterns: this.generateSampleAttackPatterns(2),
      lastUpdated: new Date(),
      source: this.createThreatSource(feed)
    };
  }

  /**
   * Fetch community threat data
   */
  private static async fetchCommunityThreatData(feed: ExternalThreatFeed): Promise<ExternalThreatData> {
    // Simulate community API call
    return {
      indicators: this.generateSampleIndicators(20, 'community'),
      threatActors: this.generateSampleThreatActors(4),
      attackPatterns: this.generateSampleAttackPatterns(6),
      lastUpdated: new Date(),
      source: this.createThreatSource(feed)
    };
  }

  /**
   * Generate sample indicators for testing
   */
  private static generateSampleIndicators(count: number, source: string): ThreatIntelligenceIndicator[] {
    const indicators: ThreatIntelligenceIndicator[] = [];

    for (let i = 0; i < count; i++) {
      const types: IOCType[] = ['ip', 'domain', 'hash', 'url', 'email'];
      const type = types[Math.floor(Math.random() * types.length)];
      const severities: SecuritySeverity[] = ['low', 'medium', 'high', 'critical'];
      const severity = severities[Math.floor(Math.random() * severities.length)];

      indicators.push({
        id: `indicator_${source}_${Date.now()}_${i}`,
        type,
        value: this.generateIOCValue(type),
        severity,
        confidence: Math.floor(Math.random() * 40) + 60,
        description: `${type.toUpperCase()} indicator from ${source}`,
        firstSeen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        lastSeen: new Date(),
        threatTypes: ['malware', 'phishing'],
        tags: [source, type],
        sources: [],
        mitigation: [`Block ${type}`, 'Monitor for related activity'],
        addedAt: new Date(),
        lastUpdated: new Date()
      });
    }

    return indicators;
  }

  /**
   * Generate sample threat actors
   */
  private static generateSampleThreatActors(count: number): ThreatActor[] {
    const actors: ThreatActor[] = [];

    for (let i = 0; i < count; i++) {
      actors.push({
        id: `actor_${Date.now()}_${i}`,
        name: `APT-${Math.floor(Math.random() * 100)}`,
        description: 'Advanced Persistent Threat actor',
        motivation: 'espionage',
        sophistication: 'high',
        techniques: ['spear_phishing', 'lateral_movement', 'persistence'],
        indicators: [],
        firstSeen: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        lastActivity: new Date(),
        aliases: [],
        confidence: Math.floor(Math.random() * 30) + 70
      });
    }

    return actors;
  }

  /**
   * Generate sample attack patterns
   */
  private static generateSampleAttackPatterns(count: number): AttackPattern[] {
    const patterns: AttackPattern[] = [];

    for (let i = 0; i < count; i++) {
      patterns.push({
        id: `pattern_${Date.now()}_${i}`,
        name: `Attack Pattern ${i + 1}`,
        description: 'Common attack pattern',
        tactics: ['initial_access', 'persistence', 'privilege_escalation'],
        techniques: ['phishing', 'malware', 'exploitation'],
        indicators: [],
        mitigation: ['User training', 'System patching', 'Network monitoring'],
        severity: 'high',
        confidence: Math.floor(Math.random() * 20) + 80
      });
    }

    return patterns;
  }

  /**
   * Helper methods
   */
  private static createThreatSource(feed: ExternalThreatFeed): ThreatIntelligenceSource {
    return {
      id: feed.id,
      name: feed.name,
      type: feed.type,
      enabled: feed.enabled,
      priority: feed.reliability,
      reliability: feed.reliability,
      url: feed.apiEndpoint
    };
  }

  private static generateIOCValue(type: IOCType): string {
    switch (type) {
      case 'ip':
        return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
      case 'domain':
        return `malicious${Math.floor(Math.random() * 1000)}.example.com`;
      case 'hash':
        return Math.random().toString(36).substring(2, 34);
      case 'url':
        return `https://malicious${Math.floor(Math.random() * 1000)}.example.com/path`;
      case 'email':
        return `attacker${Math.floor(Math.random() * 1000)}@malicious.example.com`;
      default:
        return 'unknown';
    }
  }

  private static extractIOCs(event: any): Array<{ type: IOCType; value: string }> {
    const iocs: Array<{ type: IOCType; value: string }> = [];

    if (event.ipAddress) {
      iocs.push({ type: 'ip', value: event.ipAddress });
    }

    if (event.details?.url) {
      iocs.push({ type: 'url', value: event.details.url });
    }

    if (event.details?.domain) {
      iocs.push({ type: 'domain', value: event.details.domain });
    }

    return iocs;
  }

  private static findMatchingIndicators(ioc: { type: IOCType; value: string }): ThreatIntelligenceIndicator[] {
    const matches: ThreatIntelligenceIndicator[] = [];

    for (const [, indicator] of this.indicators) {
      if (indicator.type === ioc.type && indicator.value === ioc.value) {
        matches.push(indicator);
      }
    }

    return matches;
  }

  private static calculateEnrichmentConfidence(ioc: any, indicator: ThreatIntelligenceIndicator): number {
    // Base confidence on indicator confidence and source reliability
    const sourceReliability = indicator.sources.reduce((sum, source) => sum + source.reliability, 0) / indicator.sources.length;
    return Math.round((indicator.confidence + sourceReliability) / 2);
  }

  private static async logIndicatorActivity(indicator: ThreatIntelligenceIndicator, feed: ExternalThreatFeed, action: string): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: 0, // System user
          action: `THREAT_INDICATOR_${action.toUpperCase()}`,
          resource: 'threat_intelligence',
          resourceId: indicator.id,
          details: {
            indicatorType: indicator.type,
            indicatorValue: indicator.value,
            feedSource: feed.name,
            severity: indicator.severity,
            confidence: indicator.confidence
          }
        }
      });
    } catch (error) {
      console.error('Failed to log indicator activity:', error);
    }
  }

  private static async cleanupExpiredIndicators(): Promise<void> {
    const now = Date.now();
    const expiredIndicators: string[] = [];

    for (const [indicatorId, indicator] of this.indicators) {
      if (indicator.expiresAt && indicator.expiresAt.getTime() < now) {
        expiredIndicators.push(indicatorId);
      }
    }

    for (const indicatorId of expiredIndicators) {
      this.indicators.delete(indicatorId);
    }

    if (expiredIndicators.length > 0) {
      console.log(`Cleaned up ${expiredIndicators.length} expired indicators`);
    }
  }

  /**
   * Get feed statistics
   */
  static getFeedStatistics(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [feedId, feed] of this.feeds) {
      stats[feedId] = {
        name: feed.name,
        enabled: feed.enabled,
        lastUpdate: feed.lastUpdate,
        statistics: feed.statistics,
        reliability: feed.reliability
      };
    }

    return stats;
  }

  /**
   * Get threat intelligence summary
   */
  static getThreatIntelligenceSummary(): any {
    return {
      totalIndicators: this.indicators.size,
      totalThreatActors: this.threatActors.size,
      totalAttackPatterns: this.attackPatterns.size,
      feedCount: this.feeds.size,
      activeFeedCount: Array.from(this.feeds.values()).filter(f => f.enabled).length,
      lastUpdate: new Date()
    };
  }
}