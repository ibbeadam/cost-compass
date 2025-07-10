"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Settings,
  BarChart3,
  Brain,
  Eye,
  Zap
} from 'lucide-react';
import SecurityOperationsDashboard from './SecurityOperationsDashboard';
import SecurityIntelligenceDashboard from './SecurityIntelligenceDashboard';
import SecurityReportsDashboard from './SecurityReportsDashboard';

const SecurityDashboardContainer = () => {
  const [activeView, setActiveView] = useState<'operations' | 'intelligence' | 'reports'>('operations');

  return (
    <div className="space-y-6">
      {/* Dashboard Header with Mode Selector */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6" />
              <div>
                <CardTitle className="text-xl">Security Command Center</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Comprehensive security operations, intelligence, and reporting
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-purple-600 border-purple-600">
                All Phases Active
              </Badge>
              <Button
                variant={activeView === 'operations' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveView('operations')}
                className="flex items-center gap-2"
              >
                <Shield className="w-4 h-4" />
                Operations
              </Button>
              <Button
                variant={activeView === 'intelligence' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveView('intelligence')}
                className="flex items-center gap-2"
              >
                <Brain className="w-4 h-4" />
                Intelligence
              </Button>
              <Button
                variant={activeView === 'reports' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveView('reports')}
                className="flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Reports
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Shield className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-medium text-blue-900">Security Operations</div>
                <div className="text-sm text-blue-600">Day-to-day security monitoring & response</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <Brain className="w-5 h-5 text-purple-600" />
              <div>
                <div className="font-medium text-purple-900">Security Intelligence</div>
                <div className="text-sm text-purple-600">Advanced analytics & threat modeling</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <BarChart3 className="w-5 h-5 text-green-600" />
              <div>
                <div className="font-medium text-green-900">Security Reports</div>
                <div className="text-sm text-green-600">Comprehensive security reporting</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Content */}
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'operations' | 'intelligence' | 'reports')}>
        <TabsList className="hidden">
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-6">
          <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium text-blue-900">Security Operations Center</h3>
              <Badge className="bg-blue-100 text-blue-700 text-xs">
                Phases 1 & 2 Combined
              </Badge>
            </div>
            <p className="text-sm text-blue-700 mb-3">
              Day-to-day security operations including threat detection, real-time monitoring, and automated response.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-700">Threat Detection</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-700">Real-time Monitoring</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-700">Automated Response</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-700">Event Correlation</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-700">Incident Management</span>
              </div>
            </div>
          </div>
          <SecurityOperationsDashboard />
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-6">
          <div className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-5 h-5 text-purple-600" />
              <h3 className="font-medium text-purple-900">Security Intelligence Platform</h3>
              <Badge className="bg-purple-100 text-purple-700 text-xs">
                Phase 3 Implementation
              </Badge>
            </div>
            <p className="text-sm text-purple-700 mb-3">
              Advanced ML-powered threat detection, behavioral analytics, predictive modeling, and strategic security intelligence.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-700">ML Anomaly Detection</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-700">Behavioral Analytics</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-700">Predictive Modeling</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-700">Threat Hunting</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-700">External Intelligence</span>
              </div>
            </div>
          </div>
          <SecurityIntelligenceDashboard />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="border rounded-lg p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              <h3 className="font-medium text-green-900">Security Reports & Analytics</h3>
              <Badge className="bg-green-100 text-green-700 text-xs">
                Comprehensive Reporting
              </Badge>
            </div>
            <p className="text-sm text-green-700 mb-3">
              Generate, schedule, and manage comprehensive security reports for compliance, analysis, and executive briefings.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-700">Threat Landscape</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-700">Risk Assessment</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-700">Compliance Reports</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-700">Executive Dashboards</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-700">Scheduled Reports</span>
              </div>
            </div>
          </div>
          <SecurityReportsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityDashboardContainer;