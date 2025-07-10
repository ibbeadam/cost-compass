/**
 * Advanced DDoS Protection System
 * Multi-layered protection against distributed denial-of-service attacks
 */

import { NextRequest } from "next/server";
import { rateLimiter, keyGenerators } from "./rate-limiting";
import type { User } from "@/types";

// Threat detection patterns
interface ThreatPattern {
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  check: (request: NextRequest, user?: User) => Promise<ThreatDetectionResult>;
}

interface ThreatDetectionResult {
  detected: boolean;
  confidence: number; // 0-1
  reason?: string;
  metadata?: Record<string, any>;
}

interface DDoSProtectionResult {
  allowed: boolean;
  blocked: boolean;
  threats: ThreatDetectionResult[];
  score: number; // Overall threat score 0-1
  reason?: string;
  action: 'allow' | 'rate_limit' | 'block' | 'captcha';
  headers: Record<string, string>;
}

/**
 * IP reputation tracking
 */
class IPReputationTracker {
  private static instance: IPReputationTracker;
  private reputationStore = new Map<string, {
    score: number;
    lastUpdate: number;
    violations: number;
    blockUntil?: number;
  }>();

  static getInstance(): IPReputationTracker {
    if (!this.instance) {
      this.instance = new IPReputationTracker();
    }
    return this.instance;
  }

  async getReputation(ip: string): Promise<number> {
    const entry = this.reputationStore.get(ip);
    if (!entry) {
      return 1.0; // Default good reputation
    }

    // Reputation improves over time if no violations
    const hoursSinceUpdate = (Date.now() - entry.lastUpdate) / (1000 * 60 * 60);
    const improvedScore = Math.min(1.0, entry.score + (hoursSinceUpdate * 0.01));
    
    return improvedScore;
  }

  async recordViolation(ip: string, severity: number): Promise<void> {
    const current = this.reputationStore.get(ip) || {
      score: 1.0,
      lastUpdate: Date.now(),
      violations: 0
    };

    current.violations += 1;
    current.score = Math.max(0, current.score - severity);
    current.lastUpdate = Date.now();

    // Block IP if reputation is very low
    if (current.score < 0.1) {
      current.blockUntil = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    }

    this.reputationStore.set(ip, current);
  }

  async isBlocked(ip: string): Promise<boolean> {
    const entry = this.reputationStore.get(ip);
    if (!entry?.blockUntil) {
      return false;
    }

    if (Date.now() > entry.blockUntil) {
      delete entry.blockUntil;
      return false;
    }

    return true;
  }

  async getBlockTimeRemaining(ip: string): Promise<number> {
    const entry = this.reputationStore.get(ip);
    if (!entry?.blockUntil) {
      return 0;
    }

    return Math.max(0, entry.blockUntil - Date.now());
  }
}

/**
 * Behavioral analysis for bot detection
 */
class BehaviorAnalyzer {
  private requestPatterns = new Map<string, {
    timestamps: number[];
    userAgents: Set<string>;
    endpoints: Set<string>;
    methods: Set<string>;
  }>();

  analyzeRequest(request: NextRequest, ip: string): ThreatDetectionResult {
    const now = Date.now();
    const pattern = this.requestPatterns.get(ip) || {
      timestamps: [],
      userAgents: new Set(),
      endpoints: new Set(),
      methods: new Set()
    };

    // Update pattern
    pattern.timestamps.push(now);
    pattern.userAgents.add(request.headers.get('user-agent') || 'unknown');
    pattern.endpoints.add(request.nextUrl.pathname);
    pattern.methods.add(request.method);

    // Keep only last 5 minutes of data
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    pattern.timestamps = pattern.timestamps.filter(t => t > fiveMinutesAgo);

    this.requestPatterns.set(ip, pattern);

    // Analyze for bot-like behavior
    let botScore = 0;
    const reasons: string[] = [];

    // Check request frequency
    if (pattern.timestamps.length > 60) { // More than 60 requests in 5 minutes
      botScore += 0.3;
      reasons.push('High request frequency');
    }

    // Check for missing or suspicious user agent
    const userAgent = request.headers.get('user-agent') || '';
    if (!userAgent || userAgent.length < 10) {
      botScore += 0.4;
      reasons.push('Missing or suspicious user agent');
    }

    // Check for automated patterns (too regular intervals)
    if (pattern.timestamps.length >= 10) {
      const intervals = [];
      for (let i = 1; i < pattern.timestamps.length; i++) {
        intervals.push(pattern.timestamps[i] - pattern.timestamps[i - 1]);
      }
      
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, interval) => {
        return sum + Math.pow(interval - avgInterval, 2);
      }, 0) / intervals.length;
      
      if (variance < 1000) { // Very regular timing (variance < 1 second)
        botScore += 0.5;
        reasons.push('Automated request timing pattern');
      }
    }

    // Check for endpoint scanning
    if (pattern.endpoints.size > 20) { // Accessing many different endpoints
      botScore += 0.3;
      reasons.push('Endpoint scanning behavior');
    }

    return {
      detected: botScore > 0.5,
      confidence: Math.min(1, botScore),
      reason: reasons.join(', '),
      metadata: {
        requestCount: pattern.timestamps.length,
        uniqueEndpoints: pattern.endpoints.size,
        uniqueUserAgents: pattern.userAgents.size,
        botScore
      }
    };
  }
}

/**
 * Geographic analysis for anomaly detection
 */
class GeographicAnalyzer {
  private knownCountries = new Map<string, Set<string>>(); // userId -> countries

  async analyzeLocation(request: NextRequest, user?: User): Promise<ThreatDetectionResult> {
    // Extract country from headers (if behind CDN like Cloudflare)
    const country = request.headers.get('cf-ipcountry') || 
                   request.headers.get('x-country-code') ||
                   'unknown';

    if (!user || country === 'unknown') {
      return { detected: false, confidence: 0 };
    }

    const userCountries = this.knownCountries.get(user.id.toString()) || new Set();
    
    // If this is a new country for the user
    if (!userCountries.has(country) && userCountries.size > 0) {
      // Check if it's a significant geographic jump
      const isSignificantJump = this.isSignificantGeographicJump(
        Array.from(userCountries), 
        country
      );

      if (isSignificantJump) {
        return {
          detected: true,
          confidence: 0.7,
          reason: `Access from new geographic location: ${country}`,
          metadata: {
            newCountry: country,
            knownCountries: Array.from(userCountries)
          }
        };
      }
    }

    // Add country to known locations
    userCountries.add(country);
    this.knownCountries.set(user.id.toString(), userCountries);

    return { detected: false, confidence: 0 };
  }

  private isSignificantGeographicJump(knownCountries: string[], newCountry: string): boolean {
    // Simplified logic - in production, use actual geographic distance
    const highRiskCountries = ['CN', 'RU', 'KP', 'IR']; // Example list
    const westernCountries = ['US', 'CA', 'GB', 'DE', 'FR', 'AU', 'NL'];

    const hasWesternHistory = knownCountries.some(c => westernCountries.includes(c));
    const isHighRiskCountry = highRiskCountries.includes(newCountry);

    return hasWesternHistory && isHighRiskCountry;
  }
}

/**
 * Main DDoS Protection System
 */
export class DDoSProtection {
  private static instance: DDoSProtection;
  private ipReputationTracker = IPReputationTracker.getInstance();
  private behaviorAnalyzer = new BehaviorAnalyzer();
  private geographicAnalyzer = new GeographicAnalyzer();

  static getInstance(): DDoSProtection {
    if (!this.instance) {
      this.instance = new DDoSProtection();
    }
    return this.instance;
  }

  /**
   * Comprehensive DDoS protection check
   */
  async protect(request: NextRequest, user?: User): Promise<DDoSProtectionResult> {
    const ip = this.extractIP(request);
    const threats: ThreatDetectionResult[] = [];
    let overallScore = 0;

    // 1. Check IP reputation
    const reputation = await this.ipReputationTracker.getReputation(ip);
    if (reputation < 0.5) {
      threats.push({
        detected: true,
        confidence: 1 - reputation,
        reason: 'Poor IP reputation',
        metadata: { reputation }
      });
    }

    // 2. Check if IP is blocked
    const isBlocked = await this.ipReputationTracker.isBlocked(ip);
    if (isBlocked) {
      const timeRemaining = await this.ipReputationTracker.getBlockTimeRemaining(ip);
      return {
        allowed: false,
        blocked: true,
        threats: [{
          detected: true,
          confidence: 1,
          reason: 'IP is blocked',
          metadata: { timeRemaining }
        }],
        score: 1,
        reason: 'IP blocked due to previous violations',
        action: 'block',
        headers: {
          'X-Blocked-Until': new Date(Date.now() + timeRemaining).toISOString(),
          'Retry-After': Math.ceil(timeRemaining / 1000).toString()
        }
      };
    }

    // 3. Rate limiting checks
    const rateLimitChecks = await this.performRateLimitChecks(request, user, ip);
    threats.push(...rateLimitChecks.threats);

    // 4. Behavioral analysis
    const behaviorThreat = this.behaviorAnalyzer.analyzeRequest(request, ip);
    if (behaviorThreat.detected) {
      threats.push(behaviorThreat);
    }

    // 5. Geographic analysis
    const geoThreat = await this.geographicAnalyzer.analyzeLocation(request, user);
    if (geoThreat.detected) {
      threats.push(geoThreat);
    }

    // 6. Request pattern analysis
    const patternThreat = await this.analyzeRequestPatterns(request, ip);
    if (patternThreat.detected) {
      threats.push(patternThreat);
    }

    // Calculate overall threat score
    if (threats.length > 0) {
      overallScore = threats.reduce((sum, threat) => {
        return sum + (threat.confidence || 0);
      }, 0) / threats.length;
    }

    // Determine action based on score and threat types
    const action = this.determineAction(overallScore, threats, reputation);
    const allowed = action === 'allow' || action === 'rate_limit';

    // Record violations for persistent bad actors
    if (overallScore > 0.7) {
      await this.ipReputationTracker.recordViolation(ip, overallScore * 0.2);
    }

    return {
      allowed,
      blocked: action === 'block',
      threats,
      score: overallScore,
      reason: threats.length > 0 ? threats.map(t => t.reason).join('; ') : undefined,
      action,
      headers: this.generateHeaders(threats, overallScore, action)
    };
  }

  private async performRateLimitChecks(
    request: NextRequest, 
    user: User | undefined, 
    ip: string
  ): Promise<{ threats: ThreatDetectionResult[] }> {
    const threats: ThreatDetectionResult[] = [];

    // Aggressive IP-based rate limiting
    const ipResult = await rateLimiter.checkLimit(`ddos:aggressive:${ip}`, {
      windowMs: 60 * 1000,  // 1 minute
      maxRequests: 200      // 200 requests per minute max
    });

    if (!ipResult.allowed) {
      threats.push({
        detected: true,
        confidence: 0.8,
        reason: 'Aggressive rate limit exceeded',
        metadata: { remaining: ipResult.remaining, resetTime: ipResult.resetTime }
      });
    }

    // Burst detection
    const burstResult = await rateLimiter.checkLimit(`ddos:burst:${ip}`, {
      windowMs: 10 * 1000,  // 10 seconds
      maxRequests: 50       // 50 requests per 10 seconds max
    });

    if (!burstResult.allowed) {
      threats.push({
        detected: true,
        confidence: 0.9,
        reason: 'Request burst detected',
        metadata: { remaining: burstResult.remaining, resetTime: burstResult.resetTime }
      });
    }

    return { threats };
  }

  private async analyzeRequestPatterns(request: NextRequest, ip: string): Promise<ThreatDetectionResult> {
    const suspicious = [];

    // Check for common attack patterns in URL
    const url = request.nextUrl.pathname + request.nextUrl.search;
    const attackPatterns = [
      /\.\./,                    // Directory traversal
      /<script/i,                // XSS attempts
      /union.*select/i,          // SQL injection
      /\bor\s+1=1/i,            // SQL injection
      /exec\s*\(/i,             // Code injection
      /javascript:/i,            // JavaScript injection
      /data:text\/html/i,        // Data URI attacks
    ];

    for (const pattern of attackPatterns) {
      if (pattern.test(url)) {
        suspicious.push('Malicious URL pattern detected');
        break;
      }
    }

    // Check request headers for anomalies
    const userAgent = request.headers.get('user-agent') || '';
    if (userAgent.length > 1000) {
      suspicious.push('Abnormally long User-Agent header');
    }

    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB
      suspicious.push('Abnormally large request body');
    }

    return {
      detected: suspicious.length > 0,
      confidence: Math.min(1, suspicious.length * 0.4),
      reason: suspicious.join(', '),
      metadata: { patterns: suspicious }
    };
  }

  private determineAction(
    score: number, 
    threats: ThreatDetectionResult[], 
    reputation: number
  ): 'allow' | 'rate_limit' | 'block' | 'captcha' {
    // Critical threats always block
    const hasCriticalThreat = threats.some(t => 
      t.reason?.includes('blocked') || 
      t.reason?.includes('Malicious') ||
      t.confidence > 0.9
    );

    if (hasCriticalThreat) {
      return 'block';
    }

    // Poor reputation + high score = block
    if (reputation < 0.3 && score > 0.7) {
      return 'block';
    }

    // High score = captcha verification
    if (score > 0.6) {
      return 'captcha';
    }

    // Medium score = rate limiting
    if (score > 0.3) {
      return 'rate_limit';
    }

    return 'allow';
  }

  private generateHeaders(
    threats: ThreatDetectionResult[], 
    score: number, 
    action: string
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'X-DDoS-Protection': 'enabled',
      'X-Threat-Score': score.toFixed(2),
      'X-Protection-Action': action
    };

    if (threats.length > 0) {
      headers['X-Threats-Detected'] = threats.length.toString();
      headers['X-Threat-Details'] = threats.map(t => t.reason).join('; ');
    }

    if (action === 'block') {
      headers['X-Block-Reason'] = threats.map(t => t.reason).join('; ');
    }

    return headers;
  }

  private extractIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
           request.headers.get('x-real-ip') ||
           request.headers.get('cf-connecting-ip') ||
           request.ip ||
           '127.0.0.1';
  }

  /**
   * Reset protection state for an IP (admin function)
   */
  async resetIPProtection(ip: string): Promise<void> {
    await this.ipReputationTracker.recordViolation(ip, -1); // Improve reputation
    await rateLimiter.resetLimit(`ddos:aggressive:${ip}`);
    await rateLimiter.resetLimit(`ddos:burst:${ip}`);
  }

  /**
   * Get protection status for an IP
   */
  async getProtectionStatus(ip: string): Promise<{
    reputation: number;
    isBlocked: boolean;
    blockTimeRemaining: number;
    recentViolations: number;
  }> {
    const reputation = await this.ipReputationTracker.getReputation(ip);
    const isBlocked = await this.ipReputationTracker.isBlocked(ip);
    const blockTimeRemaining = await this.ipReputationTracker.getBlockTimeRemaining(ip);

    return {
      reputation,
      isBlocked,
      blockTimeRemaining,
      recentViolations: 0 // Would need to implement violation tracking
    };
  }
}

// Export singleton instance
export const ddosProtection = DDoSProtection.getInstance();