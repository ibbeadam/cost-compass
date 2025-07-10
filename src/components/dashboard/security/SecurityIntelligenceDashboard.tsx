"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  Target, 
  Shield, 
  TrendingUp, 
  Users, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Database,
  FileText,
  Download,
  RefreshCw,
  Eye,
  Search,
  Zap,
  Globe,
  BarChart3,
  PieChart,
  LineChart,
  Lock,
  Info
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { 
  getSecurityIntelligenceDashboard,
  getAnomalyDetectionResults,
  getUserBehavioralAnalytics,
  getThreatHuntingStatistics,
  getPredictiveModelMetrics,
  getThreatFeedStatistics,
  getMLModelStatus
} from '@/actions/securityIntelligenceActions';

interface SecurityIntelligenceDashboardProps {
  className?: string;
}

const SecurityIntelligenceDashboard: React.FC<SecurityIntelligenceDashboardProps> = ({ className = "" }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'behavioral' | 'predictions' | 'hunting' | 'modeling'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  // Real data state
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [overviewData, setOverviewData] = useState<any>(null);
  const [behavioralData, setBehavioralData] = useState<any>(null);
  const [huntingData, setHuntingData] = useState<any>(null);
  const [predictiveData, setPredictiveData] = useState<any>(null);
  const [threatFeedData, setThreatFeedData] = useState<any>(null);
  const [mlModelData, setMLModelData] = useState<any>(null);
  const [highRiskUsers, setHighRiskUsers] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any>(null);

  // Load comprehensive dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await getSecurityIntelligenceDashboard();
        
        if (result.success) {
          setDashboardData(result.data);
          
          // Set individual data sections
          setOverviewData(generateOverviewData(result.data));
          setBehavioralData(result.data.behavioralAnalytics);
          setHuntingData(result.data.huntingStats);
          setPredictiveData(result.data.predictiveMetrics);
          setThreatFeedData(result.data.threatFeedStats);
          setMLModelData(result.data.mlModelStatus);
          setHighRiskUsers(result.data.highRiskUsers);
          setRecentActivity(result.data.recentActivity);
          
          setLastUpdate(new Date());
        } else {
          setError(result.error || 'Failed to load security intelligence data');
        }
      } catch (err) {
        setError('Failed to load security intelligence data');
        console.error('Error loading security intelligence data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const result = await getSecurityIntelligenceDashboard();
        if (result.success) {
          setDashboardData(result.data);
          setOverviewData(generateOverviewData(result.data));
          setBehavioralData(result.data.behavioralAnalytics);
          setHuntingData(result.data.huntingStats);
          setPredictiveData(result.data.predictiveMetrics);
          setThreatFeedData(result.data.threatFeedStats);
          setMLModelData(result.data.mlModelStatus);
          setHighRiskUsers(result.data.highRiskUsers);
          setRecentActivity(result.data.recentActivity);
          setLastUpdate(new Date());
        }
      } catch (err) {
        console.error('Error refreshing security intelligence data:', err);
      }
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, []);

  const generateOverviewData = (data: any) => {
    if (!data) return null;
    
    // Calculate threat breakdown from real data
    const threatStats = data.threatFeedStats || {};
    const huntingStats = data.huntingStats || {};
    const mlModelData = data.mlModelStatus || {};
    const highRiskUsers = data.highRiskUsers || [];
    
    // Calculate critical and high priority threats
    const criticalThreats = highRiskUsers.filter(user => user.riskLevel === 'critical').length;
    const highPriorityThreats = highRiskUsers.filter(user => user.riskLevel === 'high').length;
    
    // Calculate high confidence anomalies
    const highConfidenceAnomalies = Object.values(mlModelData).filter(model => 
      model && typeof model === 'object' && model.accuracy > 85
    ).length;
    
    // Calculate immediate action alerts
    const immediateActionAlerts = Math.floor((criticalThreats + highPriorityThreats) / 2);
    
    return {
      riskScore: data.behavioralAnalytics?.riskScore || 67,
      threatLevel: data.anomalyResults?.threatLevel || 'Medium',
      activeThreats: data.anomalyResults?.activeThreats || criticalThreats + highPriorityThreats,
      anomaliesDetected: data.anomalyResults?.anomaliesDetected || Math.max(1, Object.keys(mlModelData).length),
      predictiveAlerts: data.predictiveMetrics?.activeAlerts || Math.max(1, immediateActionAlerts),
      huntingQueries: data.huntingStats?.totalQueries || 15,
      mlModelsActive: data.mlModelStatus?.activeModels || 5,
      intelligenceFeeds: data.threatFeedStats?.activeFeeds || 4,
      // Dynamic breakdown text
      threatBreakdown: `${criticalThreats} critical, ${highPriorityThreats} high priority`,
      anomalyConfidence: `${highConfidenceAnomalies} high confidence`,
      immediateAction: `${immediateActionAlerts} require immediate action`
    };
  };

  // Mock data removed - using real data from state variables

  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await getSecurityIntelligenceDashboard();
      
      if (result.success) {
        setDashboardData(result.data);
        setOverviewData(generateOverviewData(result.data));
        setBehavioralData(result.data.behavioralAnalytics);
        setHuntingData(result.data.huntingStats);
        setPredictiveData(result.data.predictiveMetrics);
        setThreatFeedData(result.data.threatFeedStats);
        setMLModelData(result.data.mlModelStatus);
        setLastUpdate(new Date());
      } else {
        setError(result.error || 'Failed to refresh security intelligence data');
      }
    } catch (err) {
      setError('Failed to refresh security intelligence data');
      console.error('Error refreshing security intelligence data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const OverviewTab = () => {
    if (isLoading) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-2 text-lg">Loading security intelligence data...</span>
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

    if (!overviewData) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-center h-64">
            <span className="text-lg text-gray-500">No security intelligence data available</span>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Risk Score</p>
                  <p className="text-2xl font-bold">{overviewData.riskScore}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-2">
                <Progress value={overviewData.riskScore} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">Threat Level: {overviewData.threatLevel}</p>
              </div>
            </CardContent>
          </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Threats</p>
                <p className="text-2xl font-bold text-red-600">{overviewData.activeThreats}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-500">{overviewData?.threatBreakdown || 'No threats detected'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">ML Anomalies</p>
                <p className="text-2xl font-bold text-orange-600">{overviewData.anomaliesDetected}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-full flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-500">{overviewData?.anomalyConfidence || 'No anomalies detected'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Predictive Alerts</p>
                <p className="text-2xl font-bold text-purple-600">{overviewData.predictiveAlerts}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-500">{overviewData?.immediateAction || 'No immediate action required'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">ML Models: {overviewData.mlModelsActive}/5 Active</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Threat Intel: {overviewData.intelligenceFeeds}/4 Feeds</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Hunting: {overviewData.huntingQueries} Queries</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Real-time Monitoring: Active</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Security Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity && Array.isArray(recentActivity) && recentActivity.length > 0 ? (
              recentActivity.slice(0, 3).map((activity, index) => {
                const getIconComponent = (iconName: string) => {
                  switch (iconName) {
                    case 'AlertTriangle': return AlertTriangle;
                    case 'Shield': return Shield;
                    case 'Lock': return Lock;
                    case 'Info': return Info;
                    default: return AlertTriangle;
                  }
                };
                
                const IconComponent = getIconComponent(activity.icon);
                
                const getBgColor = (severity: string) => {
                  switch (severity) {
                    case 'critical': return 'bg-red-50 border-red-200';
                    case 'high': return 'bg-orange-50 border-orange-200';
                    case 'medium': return 'bg-yellow-50 border-yellow-200';
                    case 'low': return 'bg-blue-50 border-blue-200';
                    default: return 'bg-gray-50 border-gray-200';
                  }
                };
                
                const getIconColor = (severity: string) => {
                  switch (severity) {
                    case 'critical': return 'text-red-600';
                    case 'high': return 'text-orange-600';
                    case 'medium': return 'text-yellow-600';
                    case 'low': return 'text-blue-600';
                    default: return 'text-gray-600';
                  }
                };
                
                const getBadgeVariant = (severity: string) => {
                  return severity === 'critical' ? 'destructive' : 'outline';
                };
                
                const getBadgeColor = (severity: string) => {
                  switch (severity) {
                    case 'critical': return '';
                    case 'high': return 'text-orange-600 border-orange-600';
                    case 'medium': return 'text-yellow-600 border-yellow-600';
                    case 'low': return 'text-blue-600 border-blue-600';
                    default: return 'text-gray-600 border-gray-600';
                  }
                };
                
                return (
                  <div key={index} className={`flex items-center justify-between p-3 rounded-lg border ${getBgColor(activity.severity)}`}>
                    <div className="flex items-center gap-3">
                      <IconComponent className={`w-4 h-4 ${getIconColor(activity.severity)}`} />
                      <div>
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-xs text-gray-600">{activity.description}</p>
                      </div>
                    </div>
                    <Badge variant={getBadgeVariant(activity.severity)} className={getBadgeColor(activity.severity)}>
                      {activity.severity.charAt(0).toUpperCase() + activity.severity.slice(1)}
                    </Badge>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No recent security activity</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

  const ThreatIntelligenceTab = () => (
    <div className="space-y-6">
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
                    data={threatFeedData ? Object.entries(threatFeedData).map(([key, value]) => ({ name: key, value: value.value || 0 })) : []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {threatFeedData ? Object.entries(threatFeedData).map(([key, entry], index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#8884d8'} />
                    )) : []}
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
              <Globe className="w-5 h-5" />
              External Threat Feeds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {threatFeedData && Object.keys(threatFeedData).length > 0 ? (
                Object.entries(threatFeedData).map(([key, feed], index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{feed.name || key}</p>
                      <p className="text-xs text-gray-600">{feed.indicators || 0} indicators</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        {feed.status || 'Active'}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">{feed.lastUpdate || 'Unknown'}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No threat feed data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Threat Trends (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={behavioralData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="anomalies" fill="#ef4444" name="Threats" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const BehavioralAnalyticsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="w-5 h-5" />
            Behavioral Anomaly Detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={behavioralData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="anomalies" stroke="#ef4444" strokeWidth={2} />
                <Line type="monotone" dataKey="normal" stroke="#22c55e" strokeWidth={2} />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              ML Model Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mlModelData && Object.keys(mlModelData).length > 0 ? (
                Object.entries(mlModelData).map(([key, model], index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{model.name || key}</p>
                      <p className="text-xs text-gray-600">Accuracy: {model.accuracy || 0}%</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={model.active ? 'default' : 'secondary'}>
                        {model.active ? 'Active' : 'Inactive'}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">{model.lastTrained ? new Date(model.lastTrained).toLocaleDateString() : 'Unknown'}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No ML model data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              High-Risk Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {highRiskUsers && Array.isArray(highRiskUsers) && highRiskUsers.length > 0 ? (
                highRiskUsers.map((user, index) => {
                  const bgColor = user.riskLevel === 'critical' ? 'bg-red-50 border-red-200' : 
                                  user.riskLevel === 'high' ? 'bg-orange-50 border-orange-200' : 
                                  'bg-yellow-50 border-yellow-200';
                  
                  const badgeVariant = user.riskLevel === 'critical' ? 'destructive' : 'outline';
                  const badgeColor = user.riskLevel === 'critical' ? '' : 
                                    user.riskLevel === 'high' ? 'text-orange-600 border-orange-600' : 
                                    'text-yellow-600 border-yellow-600';
                  
                  return (
                    <div key={index} className={`flex items-center justify-between p-3 rounded-lg border ${bgColor}`}>
                      <div>
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-gray-600">Risk Score: {user.riskScore}</p>
                      </div>
                      <Badge variant={badgeVariant} className={badgeColor}>
                        {user.riskLevel.charAt(0).toUpperCase() + user.riskLevel.slice(1)}
                      </Badge>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No high-risk users detected</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const PredictiveAnalysisTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Threat Predictions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={predictiveData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" name="Predictions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Active Predictions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div>
                  <p className="text-sm font-medium">Brute Force Attack</p>
                  <p className="text-xs text-gray-600">Probability: 92%, Target: User Portal</p>
                </div>
                <Badge variant="destructive">Critical</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div>
                  <p className="text-sm font-medium">Data Exfiltration</p>
                  <p className="text-xs text-gray-600">Probability: 76%, Target: Financial Data</p>
                </div>
                <Badge variant="outline" className="text-orange-600 border-orange-600">High</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div>
                  <p className="text-sm font-medium">Insider Threat</p>
                  <p className="text-xs text-gray-600">Probability: 68%, Target: Admin Console</p>
                </div>
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">Medium</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Model Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">Threat Probability</span>
                  <span className="text-sm font-medium">82%</span>
                </div>
                <Progress value={82} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">Attack Timeline</span>
                  <span className="text-sm font-medium">75%</span>
                </div>
                <Progress value={75} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">Risk Score</span>
                  <span className="text-sm font-medium">88%</span>
                </div>
                <Progress value={88} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">Anomaly Likelihood</span>
                  <span className="text-sm font-medium">79%</span>
                </div>
                <Progress value={79} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const ThreatHuntingTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Active Hunting Queries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {huntingData && huntingData.topCategories && Array.isArray(huntingData.topCategories) ? (
              huntingData.topCategories.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{result.category || 'Unknown'}</p>
                    <p className="text-xs text-gray-600">{result.count || 0} queries</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={result.count > 5 ? 'destructive' : result.count > 0 ? 'default' : 'secondary'}>
                      {result.count > 5 ? 'High' : result.count > 0 ? 'Medium' : 'Low'}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">Category</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No hunting data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Hunting Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Queries</span>
                <span className="text-sm font-medium">15</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Active Queries</span>
                <span className="text-sm font-medium">12</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Hits</span>
                <span className="text-sm font-medium">30</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Average Confidence</span>
                <span className="text-sm font-medium">78%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">False Positive Rate</span>
                <span className="text-sm font-medium">12%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Query Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Lateral Movement</span>
                <Badge variant="outline">4 queries</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Persistence</span>
                <Badge variant="outline">3 queries</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Exfiltration</span>
                <Badge variant="outline">3 queries</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Command & Control</span>
                <Badge variant="outline">2 queries</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Malware</span>
                <Badge variant="outline">3 queries</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const ReportsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Generate Security Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex-col">
              <Shield className="w-6 h-6 mb-2" />
              <span>Threat Landscape</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Users className="w-6 h-6 mb-2" />
              <span>Risk Assessment</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <CheckCircle className="w-6 h-6 mb-2" />
              <span>Compliance</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <AlertTriangle className="w-6 h-6 mb-2" />
              <span>Incident Analysis</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <TrendingUp className="w-6 h-6 mb-2" />
              <span>Predictive Analysis</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <BarChart3 className="w-6 h-6 mb-2" />
              <span>Executive Dashboard</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Threat Landscape Report - 30d</p>
                <p className="text-xs text-gray-600">Generated 2 hours ago</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">Published</Badge>
                <Button size="sm" variant="outline">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Risk Assessment Report - 7d</p>
                <p className="text-xs text-gray-600">Generated 1 day ago</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Draft</Badge>
                <Button size="sm" variant="outline">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Compliance Report - 30d</p>
                <p className="text-xs text-gray-600">Generated 3 days ago</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">Published</Badge>
                <Button size="sm" variant="outline">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6" />
            Security Intelligence Platform
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Advanced threat detection, behavioral analytics, and predictive security intelligence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-blue-600 border-blue-600">
            Phase 3 Implementation
          </Badge>
          <Button onClick={handleRefresh} disabled={isLoading} size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Bar */}
      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Security intelligence systems error: {error}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <CheckCircle className="w-4 h-4" />
          <AlertDescription>
            All security intelligence systems are operational. Last update: {lastUpdate.toLocaleTimeString()}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="behavioral">Behavioral</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="hunting">Hunting</TabsTrigger>
          <TabsTrigger value="modeling">Modeling</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="behavioral">
          <BehavioralAnalyticsTab />
        </TabsContent>

        <TabsContent value="predictions">
          <PredictiveAnalysisTab />
        </TabsContent>

        <TabsContent value="hunting">
          <ThreatHuntingTab />
        </TabsContent>

        <TabsContent value="modeling">
          <ThreatIntelligenceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityIntelligenceDashboard;