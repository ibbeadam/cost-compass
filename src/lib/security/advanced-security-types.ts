/**
 * Advanced Security Types for Enhanced Threat Detection
 */

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  userId?: number;
  propertyId?: number;
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  source: SecurityEventSource;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  location?: GeoLocation;
  sessionId?: string;
}

export type SecurityEventType = 
  | 'login_attempt'
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'data_access'
  | 'data_export'
  | 'permission_change'
  | 'property_access'
  | 'unusual_activity'
  | 'api_call'
  | 'file_upload'
  | 'file_download'
  | 'password_change'
  | 'account_lock'
  | 'session_start'
  | 'session_end';

export type SecuritySeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type SecurityEventSource = 'web' | 'api' | 'mobile' | 'system' | 'external';

export interface GeoLocation {
  country?: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
  timezone?: string;
}

export interface UserBehaviorProfile {
  userId: number;
  normalLoginHours: { start: number; end: number };
  commonLocations: GeoLocation[];
  averageSessionDuration: number;
  commonDevices: string[];
  normalActivityPatterns: ActivityPattern[];
  riskScore: number;
  lastUpdated: Date;
}

export interface ActivityPattern {
  action: string;
  frequency: number;
  timeOfDay: number[];
  daysOfWeek: number[];
  duration: number;
}

export interface ThreatIntelligence {
  threatId: string;
  threatType: AdvancedThreatType;
  riskScore: number;
  confidence: number;
  indicators: ThreatIndicator[];
  mitigation: MitigationAction[];
  timeline: ThreatEvent[];
  affectedResources: string[];
  status: ThreatStatus;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export type AdvancedThreatType = 
  | 'financial_data_exfiltration'
  | 'property_access_violation'
  | 'privilege_escalation'
  | 'credential_stuffing'
  | 'insider_threat'
  | 'api_abuse'
  | 'data_manipulation'
  | 'unauthorized_export'
  | 'session_hijacking'
  | 'brute_force_advanced'
  | 'social_engineering'
  | 'malware_detection';

export interface ThreatIndicator {
  type: 'ip' | 'user' | 'device' | 'pattern' | 'behavior';
  value: string;
  confidence: number;
  firstSeen: Date;
  lastSeen: Date;
  occurrences: number;
}

export interface MitigationAction {
  action: 'block_ip' | 'lock_account' | 'require_mfa' | 'monitor' | 'alert' | 'restrict_access';
  automated: boolean;
  executed: boolean;
  executedAt?: Date;
  details: any;
}

export interface ThreatEvent {
  timestamp: Date;
  event: string;
  details: any;
  severity: SecuritySeverity;
}

export type ThreatStatus = 'active' | 'investigating' | 'contained' | 'resolved' | 'false_positive';

export interface SecurityMetrics {
  totalEvents: number;
  threatsByType: Record<AdvancedThreatType, number>;
  severityDistribution: Record<SecuritySeverity, number>;
  topAttackedProperties: Array<{ propertyId: number; count: number; name?: string }>;
  topAttackedUsers: Array<{ userId: number; count: number; name?: string }>;
  averageResponseTime: number;
  falsePositiveRate: number;
  blockingEfficiency: number;
  complianceScore: number;
  riskTrends: Array<{ date: Date; riskScore: number }>;
}

export interface SecurityAlert {
  id: string;
  threatId: string;
  alertLevel: SecuritySeverity;
  title: string;
  message: string;
  details: any;
  channels: AlertChannel[];
  recipients: number[];
  sent: boolean;
  sentAt?: Date;
  acknowledged: boolean;
  acknowledgedBy?: number;
  acknowledgedAt?: Date;
  actionRequired: boolean;
  actionsTaken: string[];
  escalated: boolean;
  escalatedTo?: number;
  escalatedAt?: Date;
}

export type AlertChannel = 'email' | 'sms' | 'push' | 'dashboard' | 'webhook' | 'slack';

export interface SecurityRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  triggeredCount: number;
  lastTriggered?: Date;
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'regex';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface RuleAction {
  type: 'alert' | 'block' | 'log' | 'notify' | 'escalate' | 'restrict';
  parameters: any;
  delay?: number;
}

export interface ComplianceReport {
  id: string;
  reportType: 'SOX' | 'GDPR' | 'PCI_DSS' | 'ISO_27001' | 'CUSTOM';
  generatedAt: Date;
  periodStart: Date;
  periodEnd: Date;
  totalEvents: number;
  securityIncidents: number;
  dataBreaches: number;
  accessViolations: number;
  complianceScore: number;
  recommendations: string[];
  findings: ComplianceFinding[];
  status: 'draft' | 'final' | 'submitted';
}

export interface ComplianceFinding {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  evidence: string[];
  remediation: string;
  dueDate?: Date;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted_risk';
}

export interface SecurityDashboardConfig {
  refreshInterval: number;
  alertThresholds: Record<SecuritySeverity, number>;
  retentionPeriod: number;
  enabledFeatures: string[];
  dashboardLayout: DashboardWidget[];
  customMetrics: CustomMetric[];
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'alert' | 'map' | 'timeline';
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: any;
  permissions: string[];
}

export interface CustomMetric {
  id: string;
  name: string;
  description: string;
  query: string;
  type: 'count' | 'sum' | 'average' | 'percentage';
  refreshInterval: number;
  alertThreshold?: number;
}

// Phase 2: Real-time Monitoring & Automated Response Types

export interface SecurityMonitorConfig {
  monitoringIntervalMs: number;
  threatDetectionIntervalMs: number;
  correlationIntervalMs: number;
  maxEventsPerBatch: number;
  alertThresholds: Record<SecuritySeverity, number>;
  autoResponseEnabled: boolean;
  maxAutoResponsesPerHour: number;
  enableBehavioralAnalysis: boolean;
  enableThreatIntelligence: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

export interface RealTimeMonitoringStats {
  startTime: Date;
  eventsProcessed: number;
  threatsDetected: number;
  autoResponsesTriggered: number;
  alertsSent: number;
  lastCheck: Date;
  systemStatus: 'stopped' | 'starting' | 'running' | 'stopping' | 'error';
  averageResponseTime: number;
  falsePositiveRate: number;
  uptime?: number;
}

export interface SecurityIncident {
  id: string;
  threatId: string;
  severity: SecuritySeverity;
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  title: string;
  description: string;
  affectedResources: string[];
  createdAt: Date;
  updatedAt: Date;
  assignedTo: number | null;
  escalated: boolean;
  timeline: ThreatEvent[];
  evidence: Array<{
    type: string;
    value: string;
    timestamp: Date;
    confidence: number;
  }>;
  responseActions: ResponseAction[];
  resolution: string | null;
}

export interface AutomatedResponseResult {
  success: boolean;
  message: string;
  actionsExecuted: ResponseAction[];
  executionTime: number;
  errors?: string[];
}

export interface ResponseAction {
  type: 'alert' | 'block' | 'lock' | 'restrict' | 'notify' | 'log';
  parameters?: any;
  executedAt?: Date;
  success?: boolean;
  message?: string;
  details?: any;
}

export interface ResponseRule {
  id: string;
  name: string;
  description: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number;
  enabled: boolean;
  autoExecute: boolean;
}

// Event Correlation Types
export interface CorrelatedEvent {
  id: string;
  timestamp: Date;
  action: string;
  userId: number | null;
  propertyId: number | null;
  ipAddress: string | null;
  resource: string | null;
  resourceId: string | null;
  details: any;
  severity: SecuritySeverity;
  description: string;
}

export interface EventCorrelation {
  id: string;
  ruleId: string;
  ruleName: string;
  description: string;
  events: CorrelatedEvent[];
  riskScore: number;
  confidence: number;
  indicators: ThreatIndicator[];
  affectedResources: string[];
  pattern: CorrelationPattern;
  correlationKey: string;
  detectedAt: Date;
  timeWindow: number;
  priority: number;
}

export interface CorrelationPattern {
  ruleId: string;
  eventCount: number;
  timeSpan: number;
  frequency: number;
  uniqueIPs: number;
  uniqueUsers: number;
  uniqueProperties: number;
}

export interface CorrelationRule {
  id: string;
  name: string;
  description: string;
  timeWindow: number;
  minEvents: number;
  maxEvents: number;
  conditions: RuleCondition[];
  riskMultiplier: number;
  confidence: number;
  priority: number;
  enabled: boolean;
}

// Threat Intelligence Types
export interface ThreatIntelligenceSource {
  id: string;
  name: string;
  type: 'internal' | 'external' | 'commercial' | 'open_source' | 'static';
  enabled: boolean;
  priority: number;
  reliability: number;
  url?: string;
  apiKey?: string;
  updateInterval?: number;
}

export interface ThreatIntelligenceIndicator {
  id: string;
  type: IOCType;
  value: string;
  severity: SecuritySeverity;
  confidence: number;
  description: string;
  firstSeen: Date;
  lastSeen: Date;
  threatTypes: string[];
  tags: string[];
  sources: ThreatIntelligenceSource[];
  mitigation: string[];
  addedAt: Date;
  lastUpdated: Date;
  expiresAt?: Date;
}

export interface ThreatIntelligenceFeedConfig {
  enabled: boolean;
  updateIntervalMs: number;
  sources: ThreatIntelligenceSource[];
  indicatorTypes: IOCType[];
  maxAge: number;
  autoEnrichment: boolean;
}

export interface ExternalThreatData {
  indicators: ThreatIntelligenceIndicator[];
  threatActors: ThreatActor[];
  attackPatterns: AttackPattern[];
  lastUpdated: Date;
  source: ThreatIntelligenceSource;
}

export interface ThreatEnrichmentResult {
  indicator: ThreatIntelligenceIndicator;
  confidence: number;
  severity: SecuritySeverity;
  sources: ThreatIntelligenceSource[];
  firstSeen: Date;
  lastSeen: Date;
  threatTypes: string[];
  tags: string[];
  description: string;
  mitigation: string[];
}

export type IOCType = 'ip' | 'domain' | 'url' | 'hash' | 'email' | 'pattern';

export interface ThreatActor {
  id: string;
  name: string;
  description: string;
  motivation: 'financial' | 'political' | 'espionage' | 'terrorism' | 'unknown';
  sophistication: 'low' | 'medium' | 'high' | 'expert';
  techniques: string[];
  indicators: string[];
  firstSeen: Date;
  lastActivity: Date;
  aliases: string[];
  confidence: number;
}

export interface AttackPattern {
  id: string;
  name: string;
  description: string;
  tactics: string[];
  techniques: string[];
  indicators: string[];
  mitigation: string[];
  severity: SecuritySeverity;
  confidence: number;
}

// Phase 3: Advanced Security Intelligence Platform Types

export interface AnomalyDetectionResult {
  eventId: string;
  timestamp: Date;
  anomalies: BehavioralAnomaly[];
  overallScore: number;
  confidence: number;
  recommendations: string[];
}

export interface BehavioralAnomaly {
  type: AnomalyType;
  score: number;
  confidence: number;
  description: string;
  evidence: any;
  severity: SecuritySeverity;
  recommendations: string[];
}

export type AnomalyType = 
  | 'unusual_time_access'
  | 'unusual_action_frequency'
  | 'unusual_geographic_access'
  | 'unusual_weekend_access'
  | 'after_hours_access'
  | 'suspicious_ip_access'
  | 'new_ip_access'
  | 'rapid_successive_access'
  | 'sensitive_resource_access'
  | 'unusual_data_volume'
  | 'high_failure_rate';

export interface FeatureVector {
  hour: number;
  dayOfWeek: number;
  isWeekend: boolean;
  hourDeviation: number;
  userActionFrequency: number;
  sessionCount: number;
  ipReputation: number;
  geoDistance: number;
  actionRarity: number;
  resourceSensitivity: number;
  recentActionCount: number;
  dataVolumeIndicator: number;
  deviceFingerprint: string;
  userAgentAnomaly: number;
  failureRate: number;
  escalationIndicator: number;
}

export interface TrainingData {
  features: FeatureVector;
  label: number; // 0 = normal, 1 = anomaly
  timestamp: Date;
  eventId: string;
}

export interface MLModel {
  id: string;
  name: string;
  type: 'isolation_forest' | 'lstm_autoencoder' | 'one_class_svm' | 'gaussian_mixture' | 'statistical_threshold';
  version: string;
  features: string[];
  hyperparameters: any;
  trainingData: TrainingData[];
  performance: ModelPerformanceMetrics;
  lastTrained: Date;
  isActive: boolean;
}

export interface ModelPerformanceMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  falsePositiveRate: number;
}

export interface AnomalyScore {
  score: number;
  threshold: number;
  isAnomalous: boolean;
  confidence: number;
}

export interface BehavioralRiskAssessment {
  userId: number;
  timeframe: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  patterns: BehavioralPattern[];
  riskFactors: RiskFactor[];
  insights: BehavioralInsight[];
  peerComparison: PeerComparisonResult;
  alerts: BehavioralAlert[];
  recommendations: string[];
  lastAnalyzed: Date;
  confidence: number;
}

export interface BehavioralPattern {
  type: 'temporal' | 'volume' | 'access' | 'geographic' | 'device';
  name: string;
  description: string;
  confidence: number;
  frequency: number;
  impact: 'low' | 'medium' | 'high';
  evidence: any;
}

export interface RiskFactor {
  type: string;
  severity: SecuritySeverity;
  score: number;
  description: string;
  impact: string;
  evidence: any;
  recommendations: string[];
}

export interface BehavioralBaseline {
  userId: number;
  dailyActivityAverage: number;
  dailyActivityStdDev: number;
  hourlyActivityPattern: Record<number, number>;
  actionFrequencies: Record<string, number>;
  peakActivityHours: number[];
  baselineRiskScore: number;
  calculatedAt: Date;
  validUntil: Date;
}

export interface UserActivitySummary {
  userId: number;
  timeframe: string;
  totalActivities: number;
  uniqueDays: number;
  averageSessionDuration: number;
  totalSessions: number;
  peakActivityHours: number[];
  mostCommonActions: Array<{ action: string; count: number }>;
  accessPatterns: any;
  temporalPatterns: any;
  riskIndicators: string[];
  activityTrends: any;
  generatedAt: Date;
}

export interface BehavioralInsight {
  type: 'temporal_analysis' | 'volume_analysis' | 'access_analysis' | 'risk_assessment' | 'anomaly_detection';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  actionable: boolean;
  recommendations: string[];
  evidence: string[];
}

export interface RiskTrend {
  date: Date;
  riskScore: number;
  activityCount: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  primaryRiskFactors: string[];
}

export interface PeerComparisonResult {
  userId: number;
  peerGroup: string;
  peerCount: number;
  comparison: any;
  percentileRank: number;
  outlierStatus: 'normal' | 'mild_outlier' | 'extreme_outlier';
  recommendations: string[];
  lastUpdated: Date;
}

export interface BehavioralAlert {
  id: string;
  userId: number;
  type: string;
  severity: SecuritySeverity;
  title: string;
  description: string;
  riskFactors: string[];
  createdAt: Date;
  acknowledged: boolean;
  actionRequired: boolean;
}

export interface ThreatHuntingQuery {
  id: string;
  name: string;
  description: string;
  query: string;
  type: 'sql' | 'kql' | 'lucene' | 'regex';
  category: 'malware' | 'persistence' | 'lateral_movement' | 'exfiltration' | 'command_control';
  severity: SecuritySeverity;
  author: string;
  createdAt: Date;
  lastRun: Date;
  hitCount: number;
  falsePositiveRate: number;
  enabled: boolean;
}

export interface ThreatHuntingResult {
  queryId: string;
  executionId: string;
  results: any[];
  hitCount: number;
  executionTime: number;
  confidence: number;
  falsePositives: number;
  recommendations: string[];
  executedAt: Date;
  executedBy: number;
}

export interface PredictiveThreatModel {
  id: string;
  name: string;
  description: string;
  type: 'time_series' | 'classification' | 'clustering' | 'regression';
  features: string[];
  targetVariable: string;
  accuracy: number;
  precision: number;
  recall: number;
  trainingData: any[];
  lastTrained: Date;
  predictions: PredictiveThreatPrediction[];
  isActive: boolean;
}

export interface PredictiveThreatPrediction {
  id: string;
  modelId: string;
  predictionType: 'threat_probability' | 'attack_timeline' | 'risk_score' | 'anomaly_likelihood';
  targetDate: Date;
  confidence: number;
  value: number;
  threshold: number;
  isAlert: boolean;
  factors: string[];
  createdAt: Date;
}

export interface SecurityIntelligenceReport {
  id: string;
  title: string;
  type: 'threat_landscape' | 'risk_assessment' | 'compliance' | 'incident_analysis' | 'predictive_analysis';
  timeframe: string;
  executiveSummary: string;
  keyFindings: string[];
  recommendations: string[];
  riskScore: number;
  threatLevel: SecuritySeverity;
  metrics: any;
  charts: any[];
  appendices: any[];
  generatedAt: Date;
  generatedBy: number;
  approvedBy?: number;
  status: 'draft' | 'review' | 'approved' | 'published';
}

export interface ExternalThreatFeed {
  id: string;
  name: string;
  provider: string;
  type: 'commercial' | 'open_source' | 'government' | 'community';
  dataTypes: string[];
  updateFrequency: number;
  lastUpdate: Date;
  reliability: number;
  coverage: string[];
  apiEndpoint?: string;
  apiKey?: string;
  enabled: boolean;
  statistics: {
    totalIndicators: number;
    newIndicators: number;
    expiredIndicators: number;
    accuracyRate: number;
  };
}