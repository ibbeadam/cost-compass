/**
 * Threat Hunting Engine
 * Provides advanced threat hunting capabilities with custom queries and automated hunts
 */

import { prisma } from '@/lib/prisma';
import type { 
  ThreatHuntingQuery,
  ThreatHuntingResult,
  SecurityEvent,
  ThreatIntelligence,
  SecuritySeverity
} from './advanced-security-types';

export class ThreatHuntingEngine {
  private static huntingQueries = new Map<string, ThreatHuntingQuery>();
  private static huntingResults = new Map<string, ThreatHuntingResult[]>();
  private static isInitialized = false;

  /**
   * Initialize threat hunting engine
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Threat Hunting Engine already initialized');
      return;
    }

    try {
      console.log('Initializing Threat Hunting Engine...');

      // Load predefined hunting queries
      await this.loadPredefinedQueries();

      // Load custom hunting queries
      await this.loadCustomQueries();

      // Schedule automated hunts
      this.scheduleAutomatedHunts();

      this.isInitialized = true;
      console.log('Threat Hunting Engine initialized successfully');

    } catch (error) {
      console.error('Failed to initialize Threat Hunting Engine:', error);
      throw error;
    }
  }

  /**
   * Execute threat hunting query
   */
  static async executeHuntingQuery(
    queryId: string,
    timeframe: '1h' | '24h' | '7d' | '30d' = '24h',
    executedBy: number
  ): Promise<ThreatHuntingResult> {
    try {
      const query = this.huntingQueries.get(queryId);
      if (!query) {
        throw new Error(`Hunting query not found: ${queryId}`);
      }

      const executionId = `hunt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const startTime = Date.now();

      // Execute the query based on its type
      const results = await this.executeQuery(query, timeframe);

      // Analyze results for threats
      const analyzedResults = await this.analyzeHuntingResults(results, query);

      // Calculate confidence and false positives
      const confidence = this.calculateHuntingConfidence(analyzedResults, query);
      const falsePositives = this.estimateFalsePositives(analyzedResults, query);

      const huntingResult: ThreatHuntingResult = {
        queryId,
        executionId,
        results: analyzedResults,
        hitCount: analyzedResults.length,
        executionTime: Date.now() - startTime,
        confidence,
        falsePositives,
        recommendations: this.generateHuntingRecommendations(analyzedResults, query),
        executedAt: new Date(),
        executedBy
      };

      // Store result
      if (!this.huntingResults.has(queryId)) {
        this.huntingResults.set(queryId, []);
      }
      this.huntingResults.get(queryId)!.push(huntingResult);

      // Update query statistics
      await this.updateQueryStatistics(queryId, huntingResult);

      return huntingResult;

    } catch (error) {
      console.error('Hunting query execution failed:', error);
      throw error;
    }
  }

  /**
   * Create custom hunting query
   */
  static async createCustomQuery(
    query: Omit<ThreatHuntingQuery, 'id' | 'createdAt' | 'lastRun' | 'hitCount' | 'falsePositiveRate'>,
    createdBy: number
  ): Promise<string> {
    try {
      const queryId = `custom_hunt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const huntingQuery: ThreatHuntingQuery = {
        id: queryId,
        ...query,
        createdAt: new Date(),
        lastRun: new Date(0),
        hitCount: 0,
        falsePositiveRate: 0,
        enabled: true
      };

      this.huntingQueries.set(queryId, huntingQuery);

      // Log query creation
      await prisma.auditLog.create({
        data: {
          userId: createdBy,
          action: 'THREAT_HUNTING_QUERY_CREATED',
          resource: 'security',
          resourceId: queryId,
          details: {
            queryName: query.name,
            queryType: query.type,
            category: query.category,
            severity: query.severity,
            createdBy
          }
        }
      });

      return queryId;

    } catch (error) {
      console.error('Failed to create custom hunting query:', error);
      throw error;
    }
  }

  /**
   * Get threat hunting queries
   */
  static getHuntingQueries(category?: string): ThreatHuntingQuery[] {
    const queries = Array.from(this.huntingQueries.values());
    
    if (category) {
      return queries.filter(q => q.category === category);
    }
    
    return queries;
  }

  /**
   * Get hunting results for a query
   */
  static getHuntingResults(queryId: string, limit: number = 10): ThreatHuntingResult[] {
    const results = this.huntingResults.get(queryId) || [];
    return results.slice(-limit).reverse(); // Most recent first
  }

  /**
   * Run automated threat hunts
   */
  static async runAutomatedHunts(executedBy: number): Promise<ThreatHuntingResult[]> {
    try {
      console.log('Running automated threat hunts...');
      
      const automatedQueries = Array.from(this.huntingQueries.values())
        .filter(q => q.enabled && this.shouldRunAutomatedHunt(q));

      const results: ThreatHuntingResult[] = [];

      for (const query of automatedQueries) {
        try {
          const result = await this.executeHuntingQuery(query.id, '24h', executedBy);
          results.push(result);
        } catch (error) {
          console.error(`Failed to run automated hunt for query ${query.id}:`, error);
        }
      }

      console.log(`Completed ${results.length} automated hunts`);
      return results;

    } catch (error) {
      console.error('Automated threat hunting failed:', error);
      return [];
    }
  }

  /**
   * Load predefined hunting queries
   */
  private static async loadPredefinedQueries(): Promise<void> {
    const predefinedQueries: Omit<ThreatHuntingQuery, 'id' | 'createdAt' | 'lastRun' | 'hitCount' | 'falsePositiveRate'>[] = [
      {
        name: 'Brute Force Detection',
        description: 'Detect potential brute force attacks based on failed login patterns',
        query: `
          SELECT userId, ipAddress, COUNT(*) as attempt_count, 
                 MIN(timestamp) as first_attempt, MAX(timestamp) as last_attempt
          FROM audit_logs 
          WHERE action = 'FAILED_LOGIN' 
            AND timestamp >= NOW() - INTERVAL '{{timeframe}}'
          GROUP BY userId, ipAddress
          HAVING COUNT(*) >= 5
          ORDER BY attempt_count DESC
        `,
        type: 'sql',
        category: 'lateral_movement',
        severity: 'high',
        author: 'system',
        enabled: true
      },
      {
        name: 'Privilege Escalation Hunt',
        description: 'Hunt for privilege escalation attempts',
        query: `
          SELECT userId, action, resource, resourceId, 
                 LAG(action) OVER (PARTITION BY userId ORDER BY timestamp) as prev_action,
                 timestamp
          FROM audit_logs
          WHERE action LIKE '%PERMISSION%' OR action LIKE '%ROLE%'
            AND timestamp >= NOW() - INTERVAL '{{timeframe}}'
          ORDER BY userId, timestamp
        `,
        type: 'sql',
        category: 'persistence',
        severity: 'critical',
        author: 'system',
        enabled: true
      },
      {
        name: 'Data Exfiltration Hunt',
        description: 'Detect potential data exfiltration through exports and downloads',
        query: `
          SELECT userId, action, COUNT(*) as export_count,
                 SUM(CASE WHEN details->>'size' IS NOT NULL 
                     THEN CAST(details->>'size' AS INTEGER) 
                     ELSE 0 END) as total_size
          FROM audit_logs
          WHERE (action = 'EXPORT' OR action = 'DOWNLOAD')
            AND timestamp >= NOW() - INTERVAL '{{timeframe}}'
          GROUP BY userId, action
          HAVING COUNT(*) >= 10 OR SUM(CASE WHEN details->>'size' IS NOT NULL 
                                        THEN CAST(details->>'size' AS INTEGER) 
                                        ELSE 0 END) >= 1000000
        `,
        type: 'sql',
        category: 'exfiltration',
        severity: 'high',
        author: 'system',
        enabled: true
      },
      {
        name: 'Lateral Movement Detection',
        description: 'Detect lateral movement through property access patterns',
        query: `
          SELECT userId, COUNT(DISTINCT propertyId) as unique_properties,
                 COUNT(*) as total_accesses,
                 array_agg(DISTINCT propertyId) as accessed_properties
          FROM audit_logs
          WHERE action LIKE '%ACCESS%' 
            AND propertyId IS NOT NULL
            AND timestamp >= NOW() - INTERVAL '{{timeframe}}'
          GROUP BY userId
          HAVING COUNT(DISTINCT propertyId) >= 5
          ORDER BY unique_properties DESC
        `,
        type: 'sql',
        category: 'lateral_movement',
        severity: 'medium',
        author: 'system',
        enabled: true
      },
      {
        name: 'Command & Control Hunt',
        description: 'Hunt for command and control communications',
        query: `
          SELECT userId, ipAddress, userAgent, COUNT(*) as request_count,
                 AVG(EXTRACT(EPOCH FROM (timestamp - LAG(timestamp) OVER (
                   PARTITION BY userId ORDER BY timestamp)))) as avg_interval
          FROM audit_logs
          WHERE action = 'API_CALL'
            AND timestamp >= NOW() - INTERVAL '{{timeframe}}'
          GROUP BY userId, ipAddress, userAgent
          HAVING COUNT(*) >= 100 
             AND AVG(EXTRACT(EPOCH FROM (timestamp - LAG(timestamp) OVER (
               PARTITION BY userId ORDER BY timestamp)))) < 10
        `,
        type: 'sql',
        category: 'command_control',
        severity: 'high',
        author: 'system',
        enabled: true
      },
      {
        name: 'Persistence Mechanism Hunt',
        description: 'Hunt for persistence mechanisms through scheduled tasks or startup modifications',
        query: `
          SELECT userId, action, resource, details,
                 COUNT(*) OVER (PARTITION BY userId) as user_persistence_count
          FROM audit_logs
          WHERE (action LIKE '%SCHEDULE%' OR action LIKE '%STARTUP%' OR action LIKE '%AUTORUN%')
            AND timestamp >= NOW() - INTERVAL '{{timeframe}}'
          ORDER BY timestamp DESC
        `,
        type: 'sql',
        category: 'persistence',
        severity: 'medium',
        author: 'system',
        enabled: true
      },
      {
        name: 'Suspicious User Agent Hunt',
        description: 'Hunt for suspicious user agents indicating automated tools',
        query: '/bot|crawler|scanner|automated|script|tool/i',
        type: 'regex',
        category: 'malware',
        severity: 'medium',
        author: 'system',
        enabled: true
      },
      {
        name: 'Anomalous Login Times',
        description: 'Detect logins at unusual times',
        query: `
          SELECT userId, 
                 EXTRACT(HOUR FROM timestamp) as login_hour,
                 COUNT(*) as login_count,
                 AVG(EXTRACT(HOUR FROM timestamp)) OVER (PARTITION BY userId) as avg_hour
          FROM audit_logs
          WHERE action = 'LOGIN'
            AND timestamp >= NOW() - INTERVAL '{{timeframe}}'
          GROUP BY userId, EXTRACT(HOUR FROM timestamp)
          HAVING ABS(EXTRACT(HOUR FROM timestamp) - 
                    AVG(EXTRACT(HOUR FROM timestamp)) OVER (PARTITION BY userId)) > 6
        `,
        type: 'sql',
        category: 'lateral_movement',
        severity: 'medium',
        author: 'system',
        enabled: true
      }
    ];

    for (const queryDef of predefinedQueries) {
      const queryId = `predefined_${queryDef.name.toLowerCase().replace(/\s+/g, '_')}`;
      
      const query: ThreatHuntingQuery = {
        id: queryId,
        ...queryDef,
        createdAt: new Date(),
        lastRun: new Date(0),
        hitCount: 0,
        falsePositiveRate: 0
      };

      this.huntingQueries.set(queryId, query);
    }

    console.log(`Loaded ${predefinedQueries.length} predefined hunting queries`);
  }

  /**
   * Load custom hunting queries from database
   */
  private static async loadCustomQueries(): Promise<void> {
    try {
      // In a real implementation, this would load from a database table
      // For now, we'll use a placeholder
      console.log('Custom hunting queries loaded');
    } catch (error) {
      console.error('Failed to load custom hunting queries:', error);
    }
  }

  /**
   * Execute query based on type
   */
  private static async executeQuery(query: ThreatHuntingQuery, timeframe: string): Promise<any[]> {
    try {
      switch (query.type) {
        case 'sql':
          return await this.executeSQLQuery(query.query, timeframe);
        case 'regex':
          return await this.executeRegexQuery(query.query, timeframe);
        case 'kql':
          return await this.executeKQLQuery(query.query, timeframe);
        case 'lucene':
          return await this.executeLuceneQuery(query.query, timeframe);
        default:
          throw new Error(`Unsupported query type: ${query.type}`);
      }
    } catch (error) {
      console.error('Query execution failed:', error);
      return [];
    }
  }

  /**
   * Execute SQL hunting query
   */
  private static async executeSQLQuery(sqlQuery: string, timeframe: string): Promise<any[]> {
    try {
      // Replace timeframe placeholder
      const processedQuery = sqlQuery.replace(/\{\{timeframe\}\}/g, timeframe);
      
      // Convert timeframe to milliseconds for the query
      const timeframeMs = this.getTimeframeMs(timeframe);
      const since = new Date(Date.now() - timeframeMs);

      // For demonstration, we'll execute a simplified version of the query
      // In production, this would use a proper query engine
      
      if (processedQuery.includes('FAILED_LOGIN')) {
        return await this.huntBruteForce(since);
      } else if (processedQuery.includes('PERMISSION') || processedQuery.includes('ROLE')) {
        return await this.huntPrivilegeEscalation(since);
      } else if (processedQuery.includes('EXPORT') || processedQuery.includes('DOWNLOAD')) {
        return await this.huntDataExfiltration(since);
      } else if (processedQuery.includes('propertyId')) {
        return await this.huntLateralMovement(since);
      } else if (processedQuery.includes('API_CALL')) {
        return await this.huntCommandControl(since);
      } else if (processedQuery.includes('SCHEDULE') || processedQuery.includes('STARTUP')) {
        return await this.huntPersistence(since);
      } else if (processedQuery.includes('login_hour')) {
        return await this.huntAnomalousLogins(since);
      }

      return [];

    } catch (error) {
      console.error('SQL query execution failed:', error);
      return [];
    }
  }

  /**
   * Execute regex hunting query
   */
  private static async executeRegexQuery(regexPattern: string, timeframe: string): Promise<any[]> {
    try {
      const timeframeMs = this.getTimeframeMs(timeframe);
      const since = new Date(Date.now() - timeframeMs);

      // Search in audit logs for the regex pattern
      const logs = await prisma.auditLog.findMany({
        where: {
          timestamp: { gte: since }
        },
        select: {
          id: true,
          userId: true,
          action: true,
          details: true,
          timestamp: true,
          ipAddress: true
        }
      });

      const regex = new RegExp(regexPattern.slice(1, -2), regexPattern.slice(-1)); // Remove /pattern/flags format
      const results: any[] = [];

      for (const log of logs) {
        const searchText = JSON.stringify(log.details) + log.action;
        if (regex.test(searchText)) {
          results.push({
            logId: log.id,
            userId: log.userId,
            action: log.action,
            timestamp: log.timestamp,
            ipAddress: log.ipAddress,
            matchedText: searchText.match(regex)?.[0] || '',
            details: log.details
          });
        }
      }

      return results;

    } catch (error) {
      console.error('Regex query execution failed:', error);
      return [];
    }
  }

  /**
   * Execute KQL hunting query (simplified)
   */
  private static async executeKQLQuery(kqlQuery: string, timeframe: string): Promise<any[]> {
    // KQL execution would be implemented here
    // For now, return empty results
    return [];
  }

  /**
   * Execute Lucene hunting query (simplified)
   */
  private static async executeLuceneQuery(luceneQuery: string, timeframe: string): Promise<any[]> {
    // Lucene execution would be implemented here
    // For now, return empty results
    return [];
  }

  /**
   * Hunt for brute force attacks
   */
  private static async huntBruteForce(since: Date): Promise<any[]> {
    const failedLogins = await prisma.auditLog.findMany({
      where: {
        action: 'FAILED_LOGIN',
        timestamp: { gte: since }
      },
      select: {
        userId: true,
        ipAddress: true,
        timestamp: true
      }
    });

    // Group by user and IP
    const groups = new Map<string, any[]>();
    failedLogins.forEach(login => {
      const key = `${login.userId || 'unknown'}_${login.ipAddress || 'unknown'}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(login);
    });

    const results: any[] = [];
    groups.forEach((attempts, key) => {
      if (attempts.length >= 5) {
        const [userId, ipAddress] = key.split('_');
        results.push({
          userId: userId !== 'unknown' ? parseInt(userId) : null,
          ipAddress: ipAddress !== 'unknown' ? ipAddress : null,
          attempt_count: attempts.length,
          first_attempt: attempts[0].timestamp,
          last_attempt: attempts[attempts.length - 1].timestamp,
          threat_level: attempts.length >= 20 ? 'critical' : attempts.length >= 10 ? 'high' : 'medium'
        });
      }
    });

    return results;
  }

  /**
   * Hunt for privilege escalation
   */
  private static async huntPrivilegeEscalation(since: Date): Promise<any[]> {
    const permissionLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { action: { contains: 'PERMISSION' } },
          { action: { contains: 'ROLE' } }
        ],
        timestamp: { gte: since }
      },
      orderBy: { timestamp: 'asc' }
    });

    const results: any[] = [];
    const userSequences = new Map<number, any[]>();

    // Group by user
    permissionLogs.forEach(log => {
      if (log.userId) {
        if (!userSequences.has(log.userId)) {
          userSequences.set(log.userId, []);
        }
        userSequences.get(log.userId)!.push(log);
      }
    });

    // Look for escalation patterns
    userSequences.forEach((sequence, userId) => {
      if (sequence.length >= 3) {
        const suspiciousSequence = sequence.filter(log => 
          log.action.includes('ADMIN') || log.action.includes('SUPER')
        );
        
        if (suspiciousSequence.length >= 2) {
          results.push({
            userId,
            escalation_events: suspiciousSequence.length,
            first_event: suspiciousSequence[0].timestamp,
            last_event: suspiciousSequence[suspiciousSequence.length - 1].timestamp,
            actions: suspiciousSequence.map(s => s.action),
            threat_level: 'high'
          });
        }
      }
    });

    return results;
  }

  /**
   * Hunt for data exfiltration
   */
  private static async huntDataExfiltration(since: Date): Promise<any[]> {
    const exportLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { action: 'EXPORT' },
          { action: 'DOWNLOAD' }
        ],
        timestamp: { gte: since }
      }
    });

    const userExports = new Map<number, any[]>();
    exportLogs.forEach(log => {
      if (log.userId) {
        if (!userExports.has(log.userId)) {
          userExports.set(log.userId, []);
        }
        userExports.get(log.userId)!.push(log);
      }
    });

    const results: any[] = [];
    userExports.forEach((exports, userId) => {
      if (exports.length >= 10) {
        const totalSize = exports.reduce((sum, exp) => {
          const size = exp.details?.size || 0;
          return sum + (typeof size === 'number' ? size : 0);
        }, 0);

        results.push({
          userId,
          export_count: exports.length,
          total_size: totalSize,
          actions: exports.map(e => e.action),
          threat_level: exports.length >= 50 ? 'critical' : 'high'
        });
      }
    });

    return results;
  }

  /**
   * Hunt for lateral movement
   */
  private static async huntLateralMovement(since: Date): Promise<any[]> {
    const accessLogs = await prisma.auditLog.findMany({
      where: {
        action: { contains: 'ACCESS' },
        propertyId: { not: null },
        timestamp: { gte: since }
      }
    });

    const userAccesses = new Map<number, Set<number>>();
    accessLogs.forEach(log => {
      if (log.userId && log.propertyId) {
        if (!userAccesses.has(log.userId)) {
          userAccesses.set(log.userId, new Set());
        }
        userAccesses.get(log.userId)!.add(log.propertyId);
      }
    });

    const results: any[] = [];
    userAccesses.forEach((properties, userId) => {
      if (properties.size >= 5) {
        results.push({
          userId,
          unique_properties: properties.size,
          accessed_properties: Array.from(properties),
          threat_level: properties.size >= 10 ? 'high' : 'medium'
        });
      }
    });

    return results;
  }

  /**
   * Hunt for command and control
   */
  private static async huntCommandControl(since: Date): Promise<any[]> {
    const apiLogs = await prisma.auditLog.findMany({
      where: {
        action: 'API_CALL',
        timestamp: { gte: since }
      },
      orderBy: { timestamp: 'asc' }
    });

    const userSessions = new Map<string, any[]>();
    apiLogs.forEach(log => {
      const key = `${log.userId}_${log.ipAddress}`;
      if (!userSessions.has(key)) {
        userSessions.set(key, []);
      }
      userSessions.get(key)!.push(log);
    });

    const results: any[] = [];
    userSessions.forEach((calls, key) => {
      if (calls.length >= 100) {
        const [userId, ipAddress] = key.split('_');
        
        // Calculate average interval
        let totalInterval = 0;
        let intervalCount = 0;
        for (let i = 1; i < calls.length; i++) {
          const interval = (calls[i].timestamp.getTime() - calls[i-1].timestamp.getTime()) / 1000;
          totalInterval += interval;
          intervalCount++;
        }
        
        const avgInterval = intervalCount > 0 ? totalInterval / intervalCount : 0;
        
        if (avgInterval < 10) {
          results.push({
            userId: parseInt(userId),
            ipAddress,
            request_count: calls.length,
            avg_interval: avgInterval,
            threat_level: avgInterval < 5 ? 'critical' : 'high'
          });
        }
      }
    });

    return results;
  }

  /**
   * Hunt for persistence mechanisms
   */
  private static async huntPersistence(since: Date): Promise<any[]> {
    const persistenceLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { action: { contains: 'SCHEDULE' } },
          { action: { contains: 'STARTUP' } },
          { action: { contains: 'AUTORUN' } }
        ],
        timestamp: { gte: since }
      }
    });

    return persistenceLogs.map(log => ({
      userId: log.userId,
      action: log.action,
      resource: log.resource,
      details: log.details,
      timestamp: log.timestamp,
      threat_level: 'medium'
    }));
  }

  /**
   * Hunt for anomalous logins
   */
  private static async huntAnomalousLogins(since: Date): Promise<any[]> {
    const logins = await prisma.auditLog.findMany({
      where: {
        action: 'LOGIN',
        timestamp: { gte: since }
      }
    });

    const userHours = new Map<number, number[]>();
    logins.forEach(login => {
      if (login.userId) {
        const hour = login.timestamp.getHours();
        if (!userHours.has(login.userId)) {
          userHours.set(login.userId, []);
        }
        userHours.get(login.userId)!.push(hour);
      }
    });

    const results: any[] = [];
    userHours.forEach((hours, userId) => {
      const avgHour = hours.reduce((sum, h) => sum + h, 0) / hours.length;
      const anomalousHours = hours.filter(h => Math.abs(h - avgHour) > 6);
      
      if (anomalousHours.length > 0) {
        results.push({
          userId,
          anomalous_hours: anomalousHours,
          avg_hour: avgHour,
          anomaly_count: anomalousHours.length,
          threat_level: 'medium'
        });
      }
    });

    return results;
  }

  /**
   * Analyze hunting results
   */
  private static async analyzeHuntingResults(results: any[], query: ThreatHuntingQuery): Promise<any[]> {
    // Add threat scoring and categorization
    return results.map(result => ({
      ...result,
      query_id: query.id,
      query_name: query.name,
      threat_score: this.calculateThreatScore(result, query),
      confidence: this.calculateResultConfidence(result, query),
      analyzed_at: new Date()
    }));
  }

  /**
   * Calculate threat score for hunting result
   */
  private static calculateThreatScore(result: any, query: ThreatHuntingQuery): number {
    let score = 0;

    // Base score from query severity
    const severityScores = { info: 10, low: 25, medium: 50, high: 75, critical: 90 };
    score += severityScores[query.severity];

    // Additional scoring based on result data
    if (result.threat_level) {
      score += severityScores[result.threat_level] * 0.5;
    }

    if (result.attempt_count && result.attempt_count > 20) {
      score += 20;
    }

    if (result.export_count && result.export_count > 50) {
      score += 25;
    }

    return Math.min(100, score);
  }

  /**
   * Calculate result confidence
   */
  private static calculateResultConfidence(result: any, query: ThreatHuntingQuery): number {
    let confidence = 60; // Base confidence

    // Increase confidence based on data quality
    if (result.userId) confidence += 10;
    if (result.ipAddress) confidence += 10;
    if (result.timestamp) confidence += 10;

    // Adjust based on query type
    if (query.type === 'sql') confidence += 10;
    if (query.type === 'regex') confidence += 5;

    return Math.min(100, confidence);
  }

  /**
   * Calculate hunting confidence
   */
  private static calculateHuntingConfidence(results: any[], query: ThreatHuntingQuery): number {
    if (results.length === 0) return 0;

    const avgResultConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    const dataQuality = Math.min(100, results.length * 10); // More results = higher confidence
    
    return Math.round((avgResultConfidence + dataQuality) / 2);
  }

  /**
   * Estimate false positives
   */
  private static estimateFalsePositives(results: any[], query: ThreatHuntingQuery): number {
    // Use historical false positive rate if available
    const historicalRate = query.falsePositiveRate || 0.1; // 10% default
    
    return Math.round(results.length * historicalRate);
  }

  /**
   * Generate hunting recommendations
   */
  private static generateHuntingRecommendations(results: any[], query: ThreatHuntingQuery): string[] {
    const recommendations: string[] = [];

    if (results.length === 0) {
      recommendations.push('No threats detected - consider expanding search criteria');
      return recommendations;
    }

    // Category-specific recommendations
    switch (query.category) {
      case 'lateral_movement':
        recommendations.push('Investigate user access patterns');
        recommendations.push('Review property access permissions');
        break;
      case 'exfiltration':
        recommendations.push('Verify data export authorizations');
        recommendations.push('Implement data loss prevention controls');
        break;
      case 'persistence':
        recommendations.push('Check for unauthorized scheduled tasks');
        recommendations.push('Review system startup configurations');
        break;
      default:
        recommendations.push('Investigate findings for false positives');
        recommendations.push('Consider correlating with other security events');
    }

    if (results.length > 10) {
      recommendations.push('High number of hits - prioritize by threat score');
    }

    return recommendations;
  }

  /**
   * Update query statistics
   */
  private static async updateQueryStatistics(queryId: string, result: ThreatHuntingResult): Promise<void> {
    const query = this.huntingQueries.get(queryId);
    if (!query) return;

    query.lastRun = result.executedAt;
    query.hitCount += result.hitCount;
    
    // Update false positive rate based on feedback (simplified)
    if (result.falsePositives > 0) {
      query.falsePositiveRate = result.falsePositives / result.hitCount;
    }
  }

  /**
   * Check if automated hunt should run
   */
  private static shouldRunAutomatedHunt(query: ThreatHuntingQuery): boolean {
    const timeSinceLastRun = Date.now() - query.lastRun.getTime();
    const runInterval = 24 * 60 * 60 * 1000; // 24 hours
    
    return timeSinceLastRun >= runInterval;
  }

  /**
   * Schedule automated hunts
   */
  private static scheduleAutomatedHunts(): void {
    setInterval(async () => {
      try {
        await this.runAutomatedHunts(0); // System user
      } catch (error) {
        console.error('Automated hunt scheduling failed:', error);
      }
    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Helper method to convert timeframe to milliseconds
   */
  private static getTimeframeMs(timeframe: string): number {
    switch (timeframe) {
      case '1h': return 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Get threat hunting statistics
   */
  static getHuntingStatistics(): {
    totalQueries: number;
    activeQueries: number;
    totalExecutions: number;
    averageHitRate: number;
    topCategories: Array<{ category: string; count: number }>;
  } {
    const queries = Array.from(this.huntingQueries.values());
    const totalQueries = queries.length;
    const activeQueries = queries.filter(q => q.enabled).length;
    const totalExecutions = queries.reduce((sum, q) => sum + q.hitCount, 0);
    const averageHitRate = totalExecutions > 0 ? totalExecutions / totalQueries : 0;

    // Count queries by category
    const categoryCounts = new Map<string, number>();
    queries.forEach(q => {
      categoryCounts.set(q.category, (categoryCounts.get(q.category) || 0) + 1);
    });

    const topCategories = Array.from(categoryCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalQueries,
      activeQueries,
      totalExecutions,
      averageHitRate,
      topCategories
    };
  }
}