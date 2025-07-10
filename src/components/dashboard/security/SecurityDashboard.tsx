"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Activity,
  Users,
  Building,
  Clock,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { getSecurityDataAction, resolveSecurityThreatAction, startSecurityMonitoringAction } from '@/actions/securityActions';
import { showToast } from '@/lib/toast';
import type { SecurityData } from '@/actions/securityActions';

// Types are now imported from actions

const SecurityDashboard = () => {
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'1h' | '24h' | '7d'>('24h');
  const [resolvingThreat, setResolvingThreat] = useState<string | null>(null);
  const [startingMonitoring, setStartingMonitoring] = useState(false);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      const result = await getSecurityDataAction(timeframe);
      setData(result);
      setError(null);
    } catch (err) {
      console.error('Security data fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      showToast.error(err instanceof Error ? err.message : 'Failed to fetch security data');
    } finally {
      setLoading(false);
    }
  };

  const resolveThreat = async (threatId: string, resolution: string) => {
    setResolvingThreat(threatId);
    try {
      const result = await resolveSecurityThreatAction(threatId, resolution);
      
      if (result.success) {
        showToast.success(result.message);
        // Refresh data after resolution
        await fetchSecurityData();
      } else {
        throw new Error('Failed to resolve threat');
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

  const startMonitoring = async () => {
    setStartingMonitoring(true);
    try {
      const result = await startSecurityMonitoringAction();
      
      if (result.success) {
        showToast.success(result.message);
        // Refresh data after starting monitoring
        await fetchSecurityData();
      } else {
        throw new Error('Failed to start monitoring');
      }
    } catch (err) {
      console.error('Start monitoring error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start monitoring';
      setError(errorMessage);
      showToast.error(errorMessage);
    } finally {
      setStartingMonitoring(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
    const interval = setInterval(fetchSecurityData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [timeframe]);

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getThreatLevelIcon = (level: string) => {
    switch (level) {
      case 'critical': return <XCircle className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <AlertCircle className="w-4 h-4" />;
      case 'low': return <Activity className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-8 h-8 mx-auto mb-4 animate-spin" />
          <p>Loading security dashboard...</p>
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
          Security Dashboard
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
          <Button 
            onClick={startMonitoring} 
            variant="default"
            disabled={startingMonitoring}
          >
            {startingMonitoring ? 'Starting...' : 'Start Monitoring'}
          </Button>
          <Button onClick={fetchSecurityData} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Threats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.metrics.totalThreats}</div>
            <div className="text-sm text-gray-600">
              {data.summary.totalActiveThreats} active
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical Threats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {data.summary.criticalThreats}
            </div>
            <div className="text-sm text-gray-600">Immediate attention required</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {data.summary.highThreats}
            </div>
            <div className="text-sm text-gray-600">Review required</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Alert</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {data.summary.lastAlertTime ? (
                <div>
                  <Clock className="w-4 h-4 inline mr-1" />
                  {formatDateTime(data.summary.lastAlertTime)}
                </div>
              ) : (
                <span className="text-gray-500">No recent alerts</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Threats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Active Threats
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.activeThreats.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-4" />
              <p>No active threats detected</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.activeThreats.map((threat) => (
                <div key={threat.id} className="border rounded p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getThreatLevelColor(threat.level)}>
                          {getThreatLevelIcon(threat.level)}
                          {threat.level.toUpperCase()}
                        </Badge>
                        <span className="text-sm font-medium">{threat.type}</span>
                        <span className="text-xs text-gray-500">
                          {formatDateTime(threat.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm">{threat.description}</p>
                      {threat.details && (
                        <div className="mt-3">
                          <div className="bg-gray-50 border rounded-lg">
                            <div className="px-3 py-2 border-b bg-gray-100 rounded-t-lg">
                              <h4 className="font-medium text-gray-700 text-sm">Threat Details</h4>
                            </div>
                            <div className="p-3">
                              <div className="grid grid-cols-1 gap-2">
                                {Object.entries(threat.details).map(([key, value]) => (
                                  <div key={key} className="flex items-start py-1">
                                    <div className="font-medium text-gray-600 min-w-[130px] text-sm capitalize">
                                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                    </div>
                                    <div className="text-gray-800 flex-1 text-sm">
                                      {Array.isArray(value) ? (
                                        <ul className="list-disc list-inside ml-2 space-y-1">
                                          {value.map((item, index) => (
                                            <li key={index} className="text-sm">{String(item)}</li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <span>{String(value)}</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <Button
                        size="sm"
                        onClick={() => resolveThreat(threat.id, 'Manually resolved by admin')}
                        disabled={resolvingThreat === threat.id}
                      >
                        {resolvingThreat === threat.id ? 'Resolving...' : 'Resolve'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Threat Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Threats by Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.metrics.activeThreatsByLevel).map(([level, count]) => (
                <div key={level} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getThreatLevelColor(level)}`} />
                    <span className="capitalize">{level}</span>
                  </div>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Top Targeted Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.metrics.topTargetedUsers.slice(0, 5).map((user) => (
                <div key={user.userId} className="flex justify-between items-center">
                  <span>User {user.userId}</span>
                  <Badge variant="outline">{user.threatCount} threats</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Security Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.recentAlerts.slice(0, 10).map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  <Badge variant={alert.alertLevel === 'critical' ? 'destructive' : 'secondary'}>
                    {alert.alertLevel}
                  </Badge>
                  <span className="text-sm">{alert.message}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {alert.sentAt ? formatDateTime(alert.sentAt) : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityDashboard;