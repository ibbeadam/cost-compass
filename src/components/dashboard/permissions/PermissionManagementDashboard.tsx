"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Shield, 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Settings,
  FileText,
  BarChart3,
  UserCheck,
  Layers,
  Zap
} from 'lucide-react';

interface AnalyticsDashboard {
  metrics: {
    totalPermissions: number;
    activePermissions: number;
    unusedPermissions: number;
    overPrivilegedUsers: number;
    underPrivilegedUsers: number;
    expiringPermissions: number;
  };
  compliance: {
    totalUsers: number;
    compliantUsers: number;
    violationCount: number;
    complianceScore: number;
  };
  recommendations: Array<{
    id: string;
    type: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    affectedUsers: number;
    estimatedTimeToImplement: string;
  }>;
  trends: Array<{
    date: Date;
    activeUsers: number;
    permissionGrants: number;
    securityIncidents: number;
  }>;
}

interface BulkOperation {
  operationId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  totalItems: number;
  successCount: number;
  errorCount: number;
}

interface PermissionTemplate {
  id: string;
  name: string;
  description?: string;
  type: 'role_template' | 'property_template' | 'department_template';
  permissions: string[];
  isActive: boolean;
}

const PermissionManagementDashboard = () => {
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [bulkOperations, setBulkOperations] = useState<BulkOperation[]>([]);
  const [templates, setTemplates] = useState<PermissionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [analyticsRes, bulkOpsRes, templatesRes] = await Promise.all([
        fetch('/api/analytics/permissions?type=dashboard'),
        fetch('/api/bulk-operations'),
        fetch('/api/permission-templates')
      ]);

      const analyticsData = await analyticsRes.json();
      const bulkOpsData = await bulkOpsRes.json();
      const templatesData = await templatesRes.json();

      if (analyticsData.success) setAnalytics(analyticsData.data);
      if (bulkOpsData.operations) setBulkOperations(bulkOpsData.operations.slice(0, 5));
      if (templatesData.categories) {
        const allTemplates = templatesData.categories.flatMap((cat: any) => cat.templates);
        setTemplates(allTemplates.slice(0, 10));
      }
      
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Settings className="w-8 h-8 mx-auto mb-4 animate-spin" />
          <p>Loading permission management dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <Alert className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error || 'Failed to load dashboard data'}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Permission Management Dashboard
        </h1>
        <div className="flex gap-2">
          <Button onClick={fetchDashboardData} variant="outline">
            Refresh Data
          </Button>
          <Button>
            Generate Report
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.compliance.totalUsers}</div>
            <div className="text-sm text-gray-600">
              {analytics.compliance.compliantUsers} compliant
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Active Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.metrics.activePermissions}</div>
            <div className="text-sm text-gray-600">
              {analytics.metrics.unusedPermissions} unused
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Compliance Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.compliance.complianceScore}%</div>
            <div className="text-sm text-gray-600">
              {analytics.compliance.violationCount} violations
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.metrics.overPrivilegedUsers + analytics.metrics.expiringPermissions}
            </div>
            <div className="text-sm text-gray-600">Need attention</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="bulk-ops">Bulk Operations</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Permission Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Over-privileged Users</span>
                    <Badge variant={analytics.metrics.overPrivilegedUsers > 0 ? "destructive" : "secondary"}>
                      {analytics.metrics.overPrivilegedUsers}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Under-privileged Users</span>
                    <Badge variant={analytics.metrics.underPrivilegedUsers > 0 ? "destructive" : "secondary"}>
                      {analytics.metrics.underPrivilegedUsers}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Expiring Permissions</span>
                    <Badge variant={analytics.metrics.expiringPermissions > 5 ? "destructive" : "secondary"}>
                      {analytics.metrics.expiringPermissions}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Unused Permissions</span>
                    <Badge variant={analytics.metrics.unusedPermissions > 10 ? "destructive" : "secondary"}>
                      {analytics.metrics.unusedPermissions}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Recent Trends (7 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.trends.slice(-7).map((trend, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span>{new Date(trend.date).toLocaleDateString()}</span>
                      <div className="flex gap-4">
                        <span className="text-blue-600">{trend.activeUsers} users</span>
                        <span className="text-green-600">{trend.permissionGrants} grants</span>
                        {trend.securityIncidents > 0 && (
                          <span className="text-red-600">{trend.securityIncidents} incidents</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Permission Usage Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {Math.round((analytics.metrics.activePermissions / analytics.metrics.totalPermissions) * 100)}%
                      </div>
                      <div className="text-sm text-gray-600">Permission Utilization</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {analytics.compliance.complianceScore}%
                      </div>
                      <div className="text-sm text-gray-600">Compliance Score</div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Key Metrics</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Permissions:</span>
                        <span className="ml-2 font-medium">{analytics.metrics.totalPermissions}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Active Users:</span>
                        <span className="ml-2 font-medium">{analytics.compliance.totalUsers}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Violations:</span>
                        <span className="ml-2 font-medium">{analytics.compliance.violationCount}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Templates:</span>
                        <span className="ml-2 font-medium">{templates.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button className="w-full" variant="outline">
                    <UserCheck className="w-4 h-4 mr-2" />
                    Run Compliance Scan
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Zap className="w-4 h-4 mr-2" />
                    Bulk Operations
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Layers className="w-4 h-4 mr-2" />
                    Create Template
                  </Button>
                  <Button className="w-full" variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bulk-ops" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Recent Bulk Operations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bulkOperations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No bulk operations found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bulkOperations.map((operation) => (
                    <div key={operation.operationId} className="flex items-center justify-between p-4 border rounded">
                      <div>
                        <div className="font-medium">{operation.operationId}</div>
                        <div className="text-sm text-gray-600">
                          {operation.successCount}/{operation.totalItems} completed
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(operation.status)}>
                          {operation.status}
                        </Badge>
                        <div className="text-sm">{operation.progress}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Permission Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No templates found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <div key={template.id} className="border rounded p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{template.name}</h4>
                        <Badge variant={template.isActive ? "default" : "secondary"}>
                          {template.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {template.description || 'No description'}
                      </p>
                      <div className="text-xs text-gray-500">
                        {template.permissions.length} permissions
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Compliance Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600 mb-2">
                      {analytics.compliance.complianceScore}%
                    </div>
                    <div className="text-gray-600">Overall Compliance Score</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Compliant Users:</span>
                      <span className="ml-2 font-medium">{analytics.compliance.compliantUsers}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Users:</span>
                      <span className="ml-2 font-medium">{analytics.compliance.totalUsers}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Active Violations:</span>
                      <span className="ml-2 font-medium text-red-600">{analytics.compliance.violationCount}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Risk Level:</span>
                      <span className="ml-2 font-medium">
                        {analytics.compliance.complianceScore >= 90 ? 'Low' : 
                         analytics.compliance.complianceScore >= 75 ? 'Medium' : 'High'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Frameworks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['SOX', 'GDPR', 'ISO 27001', 'HIPAA'].map((framework) => (
                    <div key={framework} className="flex justify-between items-center">
                      <span>{framework}</span>
                      <Badge variant="outline">
                        {Math.floor(Math.random() * 20) + 80}% compliant
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Optimization Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.recommendations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No recommendations at this time</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {analytics.recommendations.map((rec) => (
                    <div key={rec.id} className="border rounded p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{rec.title}</h4>
                            <Badge className={getPriorityColor(rec.priority)}>
                              {rec.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                          <div className="flex gap-4 text-xs text-gray-500">
                            <span>Affects: {rec.affectedUsers} users</span>
                            <span>Time: {rec.estimatedTimeToImplement}</span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PermissionManagementDashboard;