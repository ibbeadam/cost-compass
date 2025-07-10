"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Play,
  Square,
  Settings,
  Zap,
  Clock,
  Shield,
  Eye,
  Target,
  BarChart3,
  LineChart,
  TrendingUp,
  Users,
  Globe,
  RefreshCw,
  AlertCircle,
  Brain,
  Bot
} from 'lucide-react';
import { 
  getRealTimeMonitoringStatusAction,
  startRealTimeMonitoringAction,
  stopRealTimeMonitoringAction,
  updateMonitoringConfigAction,
  forceSecurityCheckAction,
  getEventCorrelationsAction,
  getResponseRulesAction,
  getThreatIntelligenceStatsAction,
  getSecurityIncidentsAction,
  getAutomatedResponseHistoryAction
} from '@/actions/realTimeSecurityActions';
import { showToast } from '@/lib/toast';
import type { 
  RealTimeMonitoringStats,
  EventCorrelation,
  ResponseRule,
  SecurityIncident
} from '@/lib/security/advanced-security-types';

const RealTimeMonitoringDashboard = () => {
  const [monitoringStatus, setMonitoringStatus] = useState<{
    isRunning: boolean;
    stats: RealTimeMonitoringStats;
  } | null>(null);
  const [correlations, setCorrelations] = useState<EventCorrelation[]>([]);
  const [responseRules, setResponseRules] = useState<ResponseRule[]>([]);
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [responseHistory, setResponseHistory] = useState<any[]>([]);
  const [threatIntelStats, setThreatIntelStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Configuration states
  const [autoResponseEnabled, setAutoResponseEnabled] = useState(true);
  const [monitoringInterval, setMonitoringInterval] = useState([5]);
  const [threatDetectionInterval, setThreatDetectionInterval] = useState([10]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        statusResult,
        correlationsResult,
        rulesResult,
        incidentsResult,
        historyResult,
        statsResult
      ] = await Promise.all([
        getRealTimeMonitoringStatusAction(),
        getEventCorrelationsAction(),
        getResponseRulesAction(),
        getSecurityIncidentsAction(),
        getAutomatedResponseHistoryAction(),
        getThreatIntelligenceStatsAction()
      ]);

      setMonitoringStatus(statusResult);
      setCorrelations(correlationsResult);
      setResponseRules(rulesResult);
      setIncidents(incidentsResult);
      setResponseHistory(historyResult);
      setThreatIntelStats(statsResult);

    } catch (err) {
      console.error('Failed to fetch real-time monitoring data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      showToast.error(err instanceof Error ? err.message : 'Failed to fetch monitoring data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartMonitoring = async () => {
    setActionLoading('start');
    try {
      const result = await startRealTimeMonitoringAction();
      if (result.success) {
        showToast.success(result.message);
        await fetchData();
      }
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to start monitoring');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopMonitoring = async () => {
    setActionLoading('stop');
    try {
      const result = await stopRealTimeMonitoringAction();
      if (result.success) {
        showToast.success(result.message);
        await fetchData();
      }
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to stop monitoring');
    } finally {
      setActionLoading(null);
    }
  };

  const handleForceCheck = async () => {
    setActionLoading('check');
    try {
      const result = await forceSecurityCheckAction();
      if (result.success) {
        showToast.success(result.message);
        await fetchData();
      }
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to perform security check');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfigUpdate = async () => {
    setActionLoading('config');
    try {
      const result = await updateMonitoringConfigAction({
        autoResponseEnabled,
        monitoringIntervalMs: monitoringInterval[0] * 1000,
        threatDetectionIntervalMs: threatDetectionInterval[0] * 1000
      });
      if (result.success) {
        showToast.success(result.message);
        await fetchData();
      }
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to update configuration');
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (uptime: number) => {
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-600 bg-green-100';
      case 'stopped': return 'text-gray-600 bg-gray-100';
      case 'starting': return 'text-blue-600 bg-blue-100';
      case 'stopping': return 'text-orange-600 bg-orange-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="w-8 h-8 mx-auto mb-4 animate-spin" />
          <p>Loading real-time monitoring dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6" />
              <div>
                <CardTitle className="text-xl">Real-time Security Monitoring</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Phase 2: Advanced threat detection with automated response
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(monitoringStatus?.stats.systemStatus || 'stopped')}>
                {monitoringStatus?.stats.systemStatus || 'Unknown'}
              </Badge>
              {monitoringStatus?.isRunning ? (
                <Button 
                  onClick={handleStopMonitoring}
                  variant="destructive"
                  size="sm"
                  disabled={actionLoading === 'stop'}
                >
                  <Square className="w-4 h-4 mr-2" />
                  {actionLoading === 'stop' ? 'Stopping...' : 'Stop'}
                </Button>
              ) : (
                <Button 
                  onClick={handleStartMonitoring}
                  variant="default"
                  size="sm"
                  disabled={actionLoading === 'start'}
                >
                  <Play className="w-4 h-4 mr-2" />
                  {actionLoading === 'start' ? 'Starting...' : 'Start'}
                </Button>
              )}
              <Button 
                onClick={handleForceCheck}
                variant="outline"
                size="sm"
                disabled={!monitoringStatus?.isRunning || actionLoading === 'check'}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {actionLoading === 'check' ? 'Checking...' : 'Force Check'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {monitoringStatus && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{monitoringStatus.stats.eventsProcessed}</div>
                <div className="text-sm text-gray-600">Events Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{monitoringStatus.stats.threatsDetected}</div>
                <div className="text-sm text-gray-600">Threats Detected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{monitoringStatus.stats.autoResponsesTriggered}</div>
                <div className="text-sm text-gray-600">Auto Responses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{monitoringStatus.stats.alertsSent}</div>
                <div className="text-sm text-gray-600">Alerts Sent</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">
                  {monitoringStatus.stats.uptime ? formatUptime(monitoringStatus.stats.uptime) : 'N/A'}
                </div>
                <div className="text-sm text-gray-600">Uptime</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="correlations">Event Correlations</TabsTrigger>
          <TabsTrigger value="responses">Automated Responses</TabsTrigger>
          <TabsTrigger value="incidents">Security Incidents</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Threat Intelligence Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Threat Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent>
                {threatIntelStats && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Indicators</span>
                      <span className="font-medium">{threatIntelStats.totalIndicators}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Active Indicators</span>
                      <span className="font-medium text-green-600">{threatIntelStats.activeIndicators}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Expired Indicators</span>
                      <span className="font-medium text-gray-600">{threatIntelStats.expiredIndicators}</span>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">By Type:</h4>
                      <div className="space-y-1">
                        {Object.entries(threatIntelStats.indicatorsByType).map(([type, count]) => (
                          <div key={type} className="flex justify-between text-sm">
                            <span className="capitalize">{type}</span>
                            <span>{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Recent Correlations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {correlations.slice(0, 5).map((correlation) => (
                    <div key={correlation.id} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={correlation.riskScore >= 80 ? 'destructive' : 'secondary'}>
                          Risk: {correlation.riskScore}
                        </Badge>
                        <span className="text-sm font-medium">{correlation.ruleName}</span>
                      </div>
                      <p className="text-sm text-gray-600">{correlation.description}</p>
                      <div className="text-xs text-gray-500 mt-1">
                        {correlation.events.length} events • Confidence: {correlation.confidence}%
                      </div>
                    </div>
                  ))}
                  {correlations.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-4" />
                      <p>No recent event correlations</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    {monitoringStatus?.stats.averageResponseTime}ms
                  </div>
                  <div className="text-sm text-gray-600">Avg Response Time</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    {monitoringStatus?.stats.falsePositiveRate}%
                  </div>
                  <div className="text-sm text-gray-600">False Positive Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    {responseHistory.filter(r => r.successfulActions > 0).length}
                  </div>
                  <div className="text-sm text-gray-600">Successful Responses</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    {incidents.filter(i => i.status === 'open').length}
                  </div>
                  <div className="text-sm text-gray-600">Open Incidents</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correlations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Event Correlations ({correlations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {correlations.map((correlation) => (
                  <div key={correlation.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={correlation.riskScore >= 80 ? 'destructive' : 'secondary'}>
                            Risk Score: {correlation.riskScore}
                          </Badge>
                          <Badge variant="outline">
                            Confidence: {correlation.confidence}%
                          </Badge>
                          <Badge variant="outline">
                            Priority: {correlation.priority}
                          </Badge>
                        </div>
                        <h4 className="font-medium">{correlation.ruleName}</h4>
                        <p className="text-sm text-gray-600">{correlation.description}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm">
                        <strong>Events:</strong> {correlation.events.length} events over {Math.round(correlation.pattern.timeSpan / 1000)}s
                      </div>
                      <div className="text-sm">
                        <strong>Affected Resources:</strong> {correlation.affectedResources.join(', ')}
                      </div>
                      <div className="text-sm">
                        <strong>Pattern:</strong> {correlation.pattern.uniqueIPs} unique IPs, {correlation.pattern.uniqueUsers} unique users
                      </div>
                      <div className="text-xs text-gray-500">
                        Detected: {correlation.detectedAt.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
                {correlations.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4" />
                    <p>No event correlations detected</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responses" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Response Rules ({responseRules.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {responseRules.map((rule) => (
                    <div key={rule.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{rule.name}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                            {rule.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                          <Badge variant="outline">
                            Priority: {rule.priority}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                      <div className="text-xs text-gray-500">
                        {rule.conditions.length} conditions • {rule.actions.length} actions
                        {rule.autoExecute && ' • Auto-execute'}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Responses ({responseHistory.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {responseHistory.slice(0, 10).map((response) => (
                    <div key={response.id} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={response.successfulActions > 0 ? 'default' : 'destructive'}>
                          {response.successfulActions}/{response.actionsExecuted} Actions
                        </Badge>
                        <span className="text-sm font-medium">{response.threatType}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Risk Score: {response.riskScore} • Execution: {response.executionTime}ms
                      </div>
                      <div className="text-xs text-gray-500">
                        {response.timestamp.toLocaleString()}
                      </div>
                    </div>
                  ))}
                  {responseHistory.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-4" />
                      <p>No automated responses yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="incidents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Security Incidents ({incidents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {incidents.map((incident) => (
                  <div key={incident.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={incident.severity === 'critical' ? 'destructive' : 'secondary'}>
                            {incident.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">
                            {incident.status.toUpperCase()}
                          </Badge>
                          {incident.escalated && (
                            <Badge variant="destructive">ESCALATED</Badge>
                          )}
                        </div>
                        <h4 className="font-medium">{incident.title}</h4>
                        <p className="text-sm text-gray-600">{incident.description}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm">
                        <strong>Affected Resources:</strong> {incident.affectedResources.join(', ')}
                      </div>
                      <div className="text-sm">
                        <strong>Evidence:</strong> {incident.evidence.length} items
                      </div>
                      <div className="text-sm">
                        <strong>Response Actions:</strong> {incident.responseActions.length} executed
                      </div>
                      <div className="text-xs text-gray-500">
                        Created: {incident.createdAt.toLocaleString()} • 
                        Updated: {incident.updatedAt.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
                {incidents.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4" />
                    <p>No security incidents</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Monitoring Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Automated Response</h4>
                    <p className="text-sm text-gray-600">Enable automatic threat response actions</p>
                  </div>
                  <Switch 
                    checked={autoResponseEnabled}
                    onCheckedChange={setAutoResponseEnabled}
                  />
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Monitoring Interval</h4>
                  <p className="text-sm text-gray-600">How often to check for new security events (seconds)</p>
                  <Slider
                    value={monitoringInterval}
                    onValueChange={setMonitoringInterval}
                    max={60}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-500">Current: {monitoringInterval[0]} seconds</div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Threat Detection Interval</h4>
                  <p className="text-sm text-gray-600">How often to run deep threat analysis (seconds)</p>
                  <Slider
                    value={threatDetectionInterval}
                    onValueChange={setThreatDetectionInterval}
                    max={120}
                    min={5}
                    step={5}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-500">Current: {threatDetectionInterval[0]} seconds</div>
                </div>

                <Button 
                  onClick={handleConfigUpdate}
                  disabled={actionLoading === 'config'}
                >
                  {actionLoading === 'config' ? 'Updating...' : 'Update Configuration'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RealTimeMonitoringDashboard;