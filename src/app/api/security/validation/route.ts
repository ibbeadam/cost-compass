import { NextRequest, NextResponse } from 'next/server';
import {
  runSecurityAnalyticsValidationAction,
  getValidationHistoryAction,
  getSecurityAnalyticsHealthScoreAction,
  scheduleAutomatedValidationAction,
  getSecurityAnalyticsSummaryAction
} from '@/actions/securityValidationActions';

/**
 * GET /api/security/validation
 * Get security analytics validation data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'summary';
    const limit = parseInt(searchParams.get('limit') || '10');

    switch (type) {
      case 'run':
        const validationReport = await runSecurityAnalyticsValidationAction();
        return NextResponse.json(validationReport);

      case 'history':
        const history = await getValidationHistoryAction(limit);
        return NextResponse.json(history);

      case 'health-score':
        const healthScore = await getSecurityAnalyticsHealthScoreAction();
        return NextResponse.json(healthScore);

      case 'summary':
        const summary = await getSecurityAnalyticsSummaryAction();
        return NextResponse.json(summary);

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid type parameter' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in security validation API:', error);
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
 * POST /api/security/validation
 * Schedule automated validation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, schedule } = body;

    switch (action) {
      case 'schedule':
        if (!schedule || !['daily', 'weekly', 'monthly'].includes(schedule)) {
          return NextResponse.json(
            { success: false, error: 'Invalid schedule parameter' },
            { status: 400 }
          );
        }
        
        const scheduleResult = await scheduleAutomatedValidationAction(schedule);
        return NextResponse.json(scheduleResult);

      case 'run':
        const runResult = await runSecurityAnalyticsValidationAction();
        return NextResponse.json(runResult);

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in security validation control API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}