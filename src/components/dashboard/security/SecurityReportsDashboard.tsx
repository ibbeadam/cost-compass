"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Download, 
  Calendar, 
  Clock, 
  BarChart3, 
  TrendingUp, 
  Shield, 
  Users, 
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Filter,
  Search,
  Settings,
  Eye,
  Edit,
  Trash2,
  Plus,
  Send,
  Archive,
  Star,
  PieChart,
  LineChart,
  Database,
  Globe,
  Target,
  Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { 
  getSecurityReportsDashboard,
  generateSecurityReport,
  scheduleSecurityReport,
  createReportTemplate,
  getScheduledReports
} from '@/actions/securityReportsActions';

interface SecurityReportsDashboardProps {
  className?: string;
}

const SecurityReportsDashboard: React.FC<SecurityReportsDashboardProps> = ({ className = "" }) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'reports' | 'scheduled' | 'templates'>('generate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real data state
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [reportTypes, setReportTypes] = useState<any[]>([]);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [scheduledReports, setScheduledReports] = useState<any[]>([]);
  const [reportTemplates, setReportTemplates] = useState<any[]>([]);
  const [reportMetrics, setReportMetrics] = useState<any[]>([]);

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await getSecurityReportsDashboard();
        
        if (result.success) {
          setDashboardData(result.data);
          setReportTypes(result.data.reportTypes);
          setRecentReports(result.data.recentReports);
          setScheduledReports(result.data.scheduledReports);
          setReportTemplates(result.data.reportTemplates);
          setReportMetrics(result.data.reportMetrics);
        } else {
          setError(result.error || 'Failed to load security reports data');
        }
      } catch (err) {
        setError('Failed to load security reports data');
        console.error('Error loading security reports data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const result = await getSecurityReportsDashboard();
        if (result.success) {
          setDashboardData(result.data);
          setReportTypes(result.data.reportTypes);
          setRecentReports(result.data.recentReports);
          setScheduledReports(result.data.scheduledReports);
          setReportTemplates(result.data.reportTemplates);
          setReportMetrics(result.data.reportMetrics);
        }
      } catch (err) {
        console.error('Error refreshing security reports data:', err);
      }
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Legacy mock data removed - using real data from state variables

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleGenerateReport = async (reportType: string) => {
    try {
      setIsGenerating(true);
      setError(null);

      const result = await generateSecurityReport({
        type: reportType,
        timeframe: selectedTimeframe,
        format: 'pdf',
        sections: ['Executive Summary', 'Analysis', 'Recommendations']
      });

      if (result.success) {
        // Refresh dashboard data to show new report
        const dashboardResult = await getSecurityReportsDashboard();
        if (dashboardResult.success) {
          setDashboardData(dashboardResult.data);
          setRecentReports(dashboardResult.data.recentReports);
          setReportMetrics(dashboardResult.data.reportMetrics);
        }
      } else {
        setError(result.error || 'Failed to generate report');
      }
    } catch (err) {
      setError('Failed to generate report');
      console.error('Error generating report:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const GenerateReportsTab = () => {
    if (isLoading) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-2 text-lg">Loading reports data...</span>
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

    return (
      <div className="space-y-6">
        {/* Report Generation Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Report Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Timeframe:</label>
                <select 
                  value={selectedTimeframe} 
                  onChange={(e) => setSelectedTimeframe(e.target.value)}
                  className="border rounded px-3 py-1 text-sm"
                >
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                </select>
              </div>
              <Button disabled={isGenerating} className="ml-auto">
                {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                {isGenerating ? 'Generating...' : 'Generate All Reports'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportTypes.map((reportType) => {
            const IconComponent = reportType.icon === 'Shield' ? Shield : 
                                reportType.icon === 'Users' ? Users :
                                reportType.icon === 'CheckCircle' ? CheckCircle :
                                reportType.icon === 'AlertTriangle' ? AlertTriangle :
                                reportType.icon === 'TrendingUp' ? TrendingUp :
                                BarChart3;

            return (
              <Card key={reportType.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${reportType.color}`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-lg mb-2">{reportType.name}</h3>
                      <p className="text-sm text-gray-600 mb-4">{reportType.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{reportType.estimatedTime}</span>
                        <Button 
                          onClick={() => handleGenerateReport(reportType.id)}
                          disabled={isGenerating}
                          size="sm"
                        >
                          Generate
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Report Generation Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {reportMetrics.map((metric, index) => (
              <div key={index} className="text-center">
                <p className={`text-2xl font-bold ${metric.color}`}>{metric.value}</p>
                <p className="text-sm text-gray-600">{metric.name}</p>
                <p className="text-xs text-green-600">{metric.trend}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

  const ReportsLibraryTab = () => (
    <div className="space-y-6">
      {/* Reports Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Reports Library
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
              </div>
            </div>
            <select className="border rounded px-3 py-2">
              <option>All Types</option>
              <option>Threat Landscape</option>
              <option>Risk Assessment</option>
              <option>Compliance</option>
              <option>Incident Analysis</option>
            </select>
            <select className="border rounded px-3 py-2">
              <option>All Status</option>
              <option>Published</option>
              <option>Draft</option>
              <option>Review</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4 font-medium">Report Name</th>
                  <th className="text-left p-4 font-medium">Type</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Generated</th>
                  <th className="text-left p-4 font-medium">By</th>
                  <th className="text-left p-4 font-medium">Size</th>
                  <th className="text-left p-4 font-medium">Downloads</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentReports.map((report) => (
                  <tr key={report.id} className="border-t hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{report.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline">{report.type.replace('_', ' ')}</Badge>
                    </td>
                    <td className="p-4">
                      <Badge className={getStatusColor(report.status)}>
                        {report.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <div>{new Date(report.generatedAt).toLocaleDateString()}</div>
                        <div className="text-gray-500">{new Date(report.generatedAt).toLocaleTimeString()}</div>
                      </div>
                    </td>
                    <td className="p-4">{report.generatedBy}</td>
                    <td className="p-4">{report.size}</td>
                    <td className="p-4">{report.downloads}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Archive className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const ScheduledReportsTab = () => (
    <div className="space-y-6">
      {/* Scheduled Reports List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Scheduled Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {scheduledReports.map((schedule) => (
              <div key={schedule.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${schedule.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div>
                    <p className="font-medium">{schedule.name}</p>
                    <p className="text-sm text-gray-600">
                      {schedule.type.replace('_', ' ')} • {schedule.frequency}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">Next Run</p>
                    <p className="text-xs text-gray-600">
                      {new Date(schedule.nextRun).toLocaleDateString()} at {new Date(schedule.nextRun).toLocaleTimeString()}
                    </p>
                  </div>
                  <Badge className={getStatusColor(schedule.status)}>
                    {schedule.status}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Schedule New Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Schedule New Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Report Type</label>
              <select className="w-full border rounded px-3 py-2">
                <option>Threat Landscape</option>
                <option>Risk Assessment</option>
                <option>Compliance</option>
                <option>Incident Analysis</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Frequency</label>
              <select className="w-full border rounded px-3 py-2">
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
                <option>Quarterly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Time</label>
              <input type="time" className="w-full border rounded px-3 py-2" />
            </div>
            <div className="flex items-end">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Schedule
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const TemplatesTab = () => (
    <div className="space-y-6">
      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-medium text-lg mb-2">{template.name}</h3>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </div>
                <Star className="w-5 h-5 text-yellow-500" />
              </div>
              
              <div className="space-y-2 mb-4">
                <p className="text-sm font-medium">Sections:</p>
                <div className="flex flex-wrap gap-1">
                  {template.sections.map((section, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {section}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>Used {template.usageCount} times</span>
                <span>Modified {new Date(template.lastModified).toLocaleDateString()}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Use Template
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create New Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create New Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Template Name</label>
              <input type="text" className="w-full border rounded px-3 py-2" placeholder="Enter template name" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <input type="text" className="w-full border rounded px-3 py-2" placeholder="Enter template description" />
            </div>
          </div>
          <div className="mt-4">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
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
            <FileText className="w-6 h-6" />
            Security Reports & Analytics
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Generate, manage, and schedule comprehensive security reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Report
          </Button>
        </div>
      </div>

      {/* Status Alert */}
      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Report generation system error: {error}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <Activity className="w-4 h-4" />
          <AlertDescription>
            Report generation system is operational. {isGenerating ? 'Currently generating reports...' : 'Ready to generate reports.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="generate">Generate Reports</TabsTrigger>
          <TabsTrigger value="reports">Reports Library</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <GenerateReportsTab />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsLibraryTab />
        </TabsContent>

        <TabsContent value="scheduled">
          <ScheduledReportsTab />
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityReportsDashboard;