import { NextRequest, NextResponse } from 'next/server';
import { 
  getRealTimeMetricsAction,
  getRealTimeAlertsAction,
  getMetricsSummaryAction,
  forceMetricsUpdateAction,
  initializeRealTimeMetricsAction,
  stopRealTimeMetricsAction,
  getRealTimeSecurityDashboardAction,
  getSecurityMetricsHistoryAction
} from '@/actions/realTimeMetricsActions';

/**
 * GET /api/security/real-time-metrics
 * Get current real-time security metrics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'metrics';
    const limit = parseInt(searchParams.get('limit') || '10');
    const hours = parseInt(searchParams.get('hours') || '24');

    switch (type) {
      case 'metrics':
        const metrics = await getRealTimeMetricsAction();
        return NextResponse.json(metrics);

      case 'alerts':
        const alerts = await getRealTimeAlertsAction(limit);
        return NextResponse.json(alerts);

      case 'summary':
        const summary = await getMetricsSummaryAction();
        return NextResponse.json(summary);

      case 'dashboard':
        const dashboard = await getRealTimeSecurityDashboardAction();
        return NextResponse.json(dashboard);

      case 'history':
        const history = await getSecurityMetricsHistoryAction(hours);
        return NextResponse.json(history);

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid type parameter' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in real-time metrics API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/security/real-time-metrics
 * Control real-time metrics monitoring
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'initialize':
        const initResult = await initializeRealTimeMetricsAction();
        return NextResponse.json(initResult);

      case 'stop':
        const stopResult = await stopRealTimeMetricsAction();
        return NextResponse.json(stopResult);

      case 'force-update':
        const updateResult = await forceMetricsUpdateAction();
        return NextResponse.json(updateResult);

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in real-time metrics control API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}