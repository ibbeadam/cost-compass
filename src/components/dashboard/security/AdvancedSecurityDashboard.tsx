"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Users,
  Building,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  LineChart,
  PieChart,
  Target,
  Zap,
  Lock,
  Unlock,
  FileText,
  Download,
  Settings,
  Filter,
  RefreshCw
} from 'lucide-react';
import { getAdvancedSecurityDataAction, resolveAdvancedThreatAction, acknowledgeSecurityAlertAction, getSecurityTrendsAction } from '@/actions/advancedSecurityActions';
import { showToast } from '@/lib/toast';
import type { AdvancedSecurityData, ThreatIntelligence, SecurityAlert } from '@/actions/advancedSecurityActions';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, BarChart as RechartsBarChart, Bar } from 'recharts';

const AdvancedSecurityDashboard = () => {
  const [data, setData] = useState<AdvancedSecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'1h' | '24h' | '7d'>('24h');
  const [selectedThreat, setSelectedThreat] = useState<ThreatIntelligence | null>(null);
  const [resolvingThreat, setResolvingThreat] = useState<string | null>(null);
  const [acknowledgingAlert, setAcknowledgingAlert] = useState<string | null>(null);
  const [trendsData, setTrendsData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      const result = await getAdvancedSecurityDataAction(timeframe);
      setData(result);
      setError(null);
    } catch (err) {
      console.error('Advanced security data fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      showToast.error(err instanceof Error ? err.message : 'Failed to fetch security data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendsData = async () => {
    try {
      const trends = await getSecurityTrendsAction(timeframe === '1h' ? '24h' : timeframe);
      setTrendsData(trends);
    } catch (err) {
      console.error('Trends data fetch error:', err);
    }
  };

  const resolveThreat = async (threatId: string, resolution: string) => {
    setResolvingThreat(threatId);
    try {
      const result = await resolveAdvancedThreatAction(threatId, resolution, ['Manual resolution']);
      
      if (result.success) {
        showToast.success(result.message);
        await fetchSecurityData();
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      console.error('Threat resolution error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to resolve threat';
      setError(errorMessage);
      showToast.error(errorMessage);
    } finally {
      setResolvingThreat(null);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    setAcknowledgingAlert(alertId);
    try {
      const result = await acknowledgeSecurityAlertAction(alertId, 'Acknowledged from dashboard');
      
      if (result.success) {
        showToast.success(result.message);
        await fetchSecurityData();
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      console.error('Alert acknowledgment error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to acknowledge alert';
      setError(errorMessage);
      showToast.error(errorMessage);
    } finally {
      setAcknowledgingAlert(null);
    }
  };

  useEffect(() => {
    fetchSecurityData();
    fetchTrendsData();
    const interval = setInterval(() => {
      fetchSecurityData();
      fetchTrendsData();
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [timeframe]);

  const getThreatLevelColor = (riskScore: number) => {
    if (riskScore >= 90) return 'bg-red-500';
    if (riskScore >= 75) return 'bg-orange-500';
    if (riskScore >= 50) return 'bg-yellow-500';
    if (riskScore >= 25) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getThreatLevelIcon = (riskScore: number) => {
    if (riskScore >= 90) return <XCircle className="w-4 h-4" />;
    if (riskScore >= 75) return <AlertTriangle className="w-4 h-4" />;
    if (riskScore >= 50) return <AlertCircle className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  const getSeverityLabel = (riskScore: number) => {
    if (riskScore >= 90) return 'Critical';
    if (riskScore >= 75) return 'High';
    if (riskScore >= 50) return 'Medium';
    if (riskScore >= 25) return 'Low';
    return 'Info';
  };

  const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString();
  };

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#10b981'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-8 h-8 mx-auto mb-4 animate-spin" />
          <p>Loading advanced security dashboard...</p>
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

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Advanced Security Dashboard
        </h1>
        <div className="flex gap-2">
          <select 
            value={timeframe} 
            onChange={(e) => setTimeframe(e.target.value as '1h' | '24h' | '7d')}
            className="px-3 py-2 border rounded"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <Button onClick={fetchSecurityData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Real-time Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Active Threats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.realTimeStats.activeThreats}</div>
            <div className="text-sm text-gray-600">Immediate attention required</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Blocked Attacks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.realTimeStats.blockedAttacks}</div>
            <div className="text-sm text-gray-600">Successfully prevented</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Monitored Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data.realTimeStats.monitoredUsers}</div>
            <div className="text-sm text-gray-600">Under active monitoring</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Alerts (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{data.realTimeStats.alertsLast24h}</div>
            <div className="text-sm text-gray-600">Recent security alerts</div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Compliance Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{data.complianceStatus.score}%</div>
              <div className="text-sm text-gray-600">Compliance Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{data.complianceStatus.criticalFindings}</div>
              <div className="text-sm text-gray-600">Critical Findings</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Last Assessment</div>
              <div className="text-sm font-medium">{formatDateTime(data.complianceStatus.lastAssessment)}</div>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-medium mb-2">Recommendations:</h4>
            <ul className="text-sm space-y-1">
              {data.complianceStatus.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="threats">Threat Intelligence</TabsTrigger>
          <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Risk Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Risk Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={data.riskTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString()} />
                    <YAxis />
                    <Tooltip labelFormatter={(date) => new Date(date).toLocaleDateString()} />
                    <Legend />
                    <Line type="monotone" dataKey="riskScore" stroke="#ef4444" strokeWidth={2} name="Risk Score" />
                    <Line type="monotone" dataKey="threatCount" stroke="#3b82f6" strokeWidth={2} name="Threat Count" />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Security Metrics Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Threat Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={Object.entries(data.securityMetrics.severityDistribution).map(([key, value]) => ({
                          name: key,
                          value,
                          color: COLORS[['critical', 'high', 'medium', 'low', 'info'].indexOf(key)]
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.entries(data.securityMetrics.severityDistribution).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Security Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Events</span>
                    <span className="font-medium">{data.securityMetrics.totalEvents}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Compliance Score</span>
                    <span className="font-medium">{data.securityMetrics.complianceScore}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">False Positive Rate</span>
                    <span className="font-medium">{data.securityMetrics.falsePositiveRate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Blocking Efficiency</span>
                    <span className="font-medium">{data.securityMetrics.blockingEfficiency}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="threats" className="space-y-6">
          {/* Active Threats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Active Threat Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.threatIntelligence.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4" />
                  <p>No active threats detected</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.threatIntelligence.map((threat) => (
                    <div key={threat.threatId} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getThreatLevelColor(threat.riskScore)}>
                              {getThreatLevelIcon(threat.riskScore)}
                              {getSeverityLabel(threat.riskScore)}
                            </Badge>
                            <span className="text-sm font-medium">{threat.threatType.replace(/_/g, ' ').toUpperCase()}</span>
                            <span className="text-xs text-gray-500">
                              Risk Score: {threat.riskScore}/100
                            </span>
                            <span className="text-xs text-gray-500">
                              Confidence: {threat.confidence}%
                            </span>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="text-sm text-gray-600">
                              <strong>Indicators:</strong> {threat.indicators.length} detected
                            </div>
                            <div className="text-sm text-gray-600">
                              <strong>Affected Resources:</strong> {threat.affectedResources.join(', ')}
                            </div>
                            <div className="text-sm text-gray-600">
                              <strong>Status:</strong> {threat.status}
                            </div>
                            <div className="text-sm text-gray-600">
                              <strong>Timeline:</strong> {threat.timeline.length} events
                            </div>
                          </div>

                          {threat.mitigation.length > 0 && (
                            <div className="mt-3">
                              <div className="text-sm font-medium mb-1">Recommended Actions:</div>
                              <ul className="text-sm space-y-1">
                                {threat.mitigation.map((action, index) => (
                                  <li key={index} className="flex items-center gap-2">
                                    {action.executed ? (
                                      <CheckCircle className="w-3 h-3 text-green-500" />
                                    ) : (
                                      <Clock className="w-3 h-3 text-orange-500" />
                                    )}
                                    {action.action.replace(/_/g, ' ')}: {action.details?.reason || 'No details'}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <div className="ml-4 flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedThreat(threat)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Details
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => resolveThreat(threat.threatId, 'Manually resolved by admin')}
                            disabled={resolvingThreat === threat.threatId}
                          >
                            {resolvingThreat === threat.threatId ? 'Resolving...' : 'Resolve'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          {/* Security Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Security Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recentAlerts.map((alert) => (
                  <div key={alert.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={alert.alertLevel === 'critical' ? 'destructive' : 'secondary'}>
                            {alert.alertLevel.toUpperCase()}
                          </Badge>
                          <span className="font-medium">{alert.title}</span>
                          {alert.escalated && (
                            <Badge variant="outline" className="text-red-600">
                              ESCALATED
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
                        <div className="text-xs text-gray-500">
                          Sent: {alert.sentAt ? formatDateTime(alert.sentAt) : 'Pending'}
                          {alert.acknowledged && (
                            <span className="ml-4">
                              Acknowledged: {alert.acknowledgedAt ? formatDateTime(alert.acknowledgedAt) : 'Yes'}
                            </span>
                          )}
                        </div>
                        {alert.actionsTaken.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs font-medium">Actions Taken:</div>
                            <ul className="text-xs text-gray-600 mt-1">
                              {alert.actionsTaken.map((action, index) => (
                                <li key={index} className="flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                  {action}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        {!alert.acknowledged && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acknowledgeAlert(alert.id)}
                            disabled={acknowledgingAlert === alert.id}
                          >
                            {acknowledgingAlert === alert.id ? 'Acknowledging...' : 'Acknowledge'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Security Analytics */}
          {trendsData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="w-5 h-5" />
                    User Activity Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={trendsData.userActivityTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString()} />
                        <YAxis />
                        <Tooltip labelFormatter={(date) => new Date(date).toLocaleDateString()} />
                        <Legend />
                        <Line type="monotone" dataKey="logins" stroke="#10b981" strokeWidth={2} name="Successful Logins" />
                        <Line type="monotone" dataKey="failures" stroke="#ef4444" strokeWidth={2} name="Failed Logins" />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Property Access Patterns
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={trendsData.propertyAccessTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="propertyId" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="accessCount" fill="#3b82f6" name="Access Count" />
                        <Bar dataKey="violations" fill="#ef4444" name="Violations" />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedSecurityDashboard;