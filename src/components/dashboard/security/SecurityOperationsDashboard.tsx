"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Activity, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle,
  Zap,
  TrendingUp,
  Settings,
  Play,
  Pause,
  BarChart3,
  LineChart,
  PieChart,
  RefreshCw,
  Bell,
  Target,
  Layers,
  Radio,
  Radar
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { getSecurityOperationsData, getSecurityEventStream, toggleSecurityMonitoring } from '@/actions/securityOperationsActions';

interface SecurityOperationsDashboardProps {
  className?: string;
}

const SecurityOperationsDashboard: React.FC<SecurityOperationsDashboardProps> = ({ className = "" }) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'detection' | 'monitoring' | 'response'>('overview');
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [operationsData, setOperationsData] = useState<any>(null);
  const [eventStream, setEventStream] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load real security operations data
  useEffect(() => {
    const loadOperationsData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const [operationsResult, eventsResult] = await Promise.all([
          getSecurityOperationsData(),
          getSecurityEventStream(20)
        ]);

        if (operationsResult.success) {
          setOperationsData(operationsResult.data);
          setLastUpdate(new Date(operationsResult.data.lastUpdated));
        } else {
          setError(operationsResult.error || 'Failed to load operations data');
        }

        if (eventsResult.success) {
          setEventStream(eventsResult.data);
        }
      } catch (err) {
        setError('Failed to load security operations data');
        console.error('Error loading security operations data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadOperationsData();
  }, []);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (isMonitoring) {
        try {
          const [operationsResult, eventsResult] = await Promise.all([
            getSecurityOperationsData(),
            getSecurityEventStream(20)
          ]);

          if (operationsResult.success) {
            setOperationsData(operationsResult.data);
            setLastUpdate(new Date(operationsResult.data.lastUpdated));
          }

          if (eventsResult.success) {
            setEventStream(eventsResult.data);
          }
        } catch (err) {
          console.error('Error refreshing security operations data:', err);
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isMonitoring]);

  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [operationsResult, eventsResult] = await Promise.all([
        getSecurityOperationsData(),
        getSecurityEventStream(20)
      ]);

      if (operationsResult.success) {
        setOperationsData(operationsResult.data);
        setLastUpdate(new Date(operationsResult.data.lastUpdated));
      } else {
        setError(operationsResult.error || 'Failed to refresh operations data');
      }

      if (eventsResult.success) {
        setEventStream(eventsResult.data);
      }
    } catch (err) {
      setError('Failed to refresh security operations data');
      console.error('Error refreshing security operations data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMonitoring = async () => {
    try {
      const newState = !isMonitoring;
      const result = await toggleSecurityMonitoring(newState);
      
      if (result.success) {
        setIsMonitoring(newState);
        // Refresh data after toggling
        handleRefresh();
      } else {
        setError(result.error || 'Failed to toggle monitoring');
      }
    } catch (err) {
      setError('Failed to toggle monitoring');
      console.error('Error toggling monitoring:', err);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const OverviewSection = () => {
    if (isLoading) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-2 text-lg">Loading security operations data...</span>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      );
    }

    if (!operationsData) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-center h-64">
            <span className="text-lg text-gray-500">No security operations data available</span>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Real-time Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Threat Level</p>
                  <p className="text-xl font-bold text-yellow-600">{operationsData.realTimeStatus.threatLevel}</p>
                </div>
                <Shield className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Threats</p>
                  <p className="text-xl font-bold text-red-600">{operationsData.realTimeStatus.activeThreats}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Events Processed</p>
                  <p className="text-xl font-bold text-blue-600">{operationsData.realTimeStatus.eventsProcessed.toLocaleString()}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Response Time</p>
                  <p className="text-xl font-bold text-green-600">{operationsData.realTimeStatus.responseTime}</p>
                </div>
                <Clock className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">System Status</p>
                  <p className="text-xl font-bold text-green-600">{operationsData.realTimeStatus.systemStatus}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Threat Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Threat Activity Trends (Last 24 Hours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={operationsData.trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="threats" stroke="#ef4444" strokeWidth={2} name="Threats" />
                  <Line type="monotone" dataKey="blocked" stroke="#22c55e" strokeWidth={2} name="Blocked" />
                  <Line type="monotone" dataKey="investigated" stroke="#3b82f6" strokeWidth={2} name="Investigated" />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* System Components Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              System Components Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {operationsData.systemComponents.map((component, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${component.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <div>
                      <p className="font-medium">{component.name}</p>
                      <p className="text-sm text-gray-600">Last check: {component.lastCheck}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{component.performance}%</p>
                    <Progress value={component.performance} className="w-20 h-2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const DetectionSection = () => {
    if (isLoading || !operationsData) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-2 text-lg">Loading detection data...</span>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Detection Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{operationsData.detectionMetrics.totalDetections}</p>
              <p className="text-sm text-gray-600">Total Detections</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{operationsData.detectionMetrics.criticalThreats}</p>
              <p className="text-sm text-gray-600">Critical</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{operationsData.detectionMetrics.highThreats}</p>
              <p className="text-sm text-gray-600">High</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{operationsData.detectionMetrics.mediumThreats}</p>
              <p className="text-sm text-gray-600">Medium</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{operationsData.detectionMetrics.lowThreats}</p>
              <p className="text-sm text-gray-600">Low</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-600">{operationsData.detectionMetrics.falsePositives}</p>
              <p className="text-sm text-gray-600">False Positives</p>
            </CardContent>
          </Card>
        </div>

        {/* Threat Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Threat Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={operationsData.threatDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {operationsData.threatDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
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
                <Bell className="w-5 h-5" />
                Recent Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {operationsData.recentAlerts.map((alert) => (
                  <div key={alert.id} className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{alert.message}</p>
                        <p className="text-sm opacity-75">{alert.time}</p>
                      </div>
                      <Badge variant={alert.severity === 'critical' ? 'destructive' : 'outline'}>
                        {alert.action}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const MonitoringSection = () => {
    if (isLoading || !operationsData) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-2 text-lg">Loading monitoring data...</span>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Monitoring Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="w-5 h-5" />
              Real-time Monitoring Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleToggleMonitoring}
                  variant={isMonitoring ? 'default' : 'outline'}
                  className="flex items-center gap-2"
                  disabled={isLoading}
                >
                  {isMonitoring ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isMonitoring ? 'Pause' : 'Start'} Monitoring
                </Button>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm">Status: {isMonitoring ? 'Active' : 'Paused'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isLoading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Configure
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monitoring Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Uptime</p>
                  <p className="text-xl font-bold text-green-600">{operationsData.monitoringStats.uptime}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Events/Second</p>
                  <p className="text-xl font-bold text-blue-600">{operationsData.monitoringStats.eventsPerSecond}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Alerts Sent</p>
                  <p className="text-xl font-bold text-orange-600">{operationsData.monitoringStats.alertsSent}</p>
                </div>
                <Bell className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Auto Responses</p>
                  <p className="text-xl font-bold text-purple-600">{operationsData.monitoringStats.autoResponses}</p>
                </div>
                <Zap className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Real-time Event Stream */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Real-time Event Stream
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {eventStream.length > 0 ? (
                eventStream.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <span className="text-gray-600">{new Date(event.timestamp).toLocaleTimeString()}</span>
                    <span className="flex-1 mx-2">{event.message}</span>
                    <Badge variant="outline" className="text-xs">
                      {event.severity}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No recent events to display
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const ResponseSection = () => {
    if (isLoading || !operationsData) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-2 text-lg">Loading response data...</span>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Active Incidents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Active Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {operationsData.activeIncidents.length > 0 ? (
                operationsData.activeIncidents.map((incident) => (
                  <div key={incident.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${
                        incident.severity === 'Critical' ? 'bg-red-500' : 
                        incident.severity === 'High' ? 'bg-orange-500' : 'bg-yellow-500'
                      }`}></div>
                      <div>
                        <p className="font-medium">{incident.type}</p>
                        <p className="text-sm text-gray-600">{incident.id} • {incident.created}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <Badge variant={incident.severity === 'Critical' ? 'destructive' : 'outline'}>
                          {incident.severity}
                        </Badge>
                        <p className="text-sm text-gray-600 mt-1">{incident.assignee}</p>
                      </div>
                      <Badge variant="secondary">{incident.status}</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No active incidents
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      {/* Response Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Automated Response Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="font-medium text-green-900">IP Blocked</p>
              </div>
              <p className="text-sm text-green-700">12 malicious IPs automatically blocked</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <p className="font-medium text-blue-900">Accounts Locked</p>
              </div>
              <p className="text-sm text-blue-700">5 suspicious accounts temporarily locked</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-5 h-5 text-purple-600" />
                <p className="font-medium text-purple-900">Alerts Sent</p>
              </div>
              <p className="text-sm text-purple-700">18 security alerts sent to SOC team</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Response Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Response Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">98.5%</p>
              <p className="text-sm text-gray-600">Response Success Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">1.2s</p>
              <p className="text-sm text-gray-600">Average Response Time</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">45</p>
              <p className="text-sm text-gray-600">Auto-resolved Incidents</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">12</p>
              <p className="text-sm text-gray-600">Manual Interventions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Status Alert */}
      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Security Operations Center error: {error}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <Radar className="w-4 h-4" />
          <AlertDescription>
            Security Operations Center is fully operational. Real-time monitoring {isMonitoring ? 'active' : 'paused'}. Last update: {lastUpdate.toLocaleTimeString()}
          </AlertDescription>
        </Alert>
      )}

      {/* Operations Navigation */}
      <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detection">Detection</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="response">Response</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewSection />
        </TabsContent>

        <TabsContent value="detection">
          <DetectionSection />
        </TabsContent>

        <TabsContent value="monitoring">
          <MonitoringSection />
        </TabsContent>

        <TabsContent value="response">
          <ResponseSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityOperationsDashboard;