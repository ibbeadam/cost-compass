import { NextRequest, NextResponse } from 'next/server';
import { withServerPermissions } from '@/lib/permissions/server-middleware';
import { resolveSecurityThreatAction } from '@/actions/securityActions';

export const POST = withServerPermissions(
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      const { threatId, resolution } = body;

      if (!threatId || !resolution) {
        return NextResponse.json(
          { error: 'threatId and resolution are required' },
          { status: 400 }
        );
      }

      const result = await resolveSecurityThreatAction(threatId, resolution);
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: result.message,
          threatId,
          timestamp: new Date().toISOString()
        });
      } else {
        return NextResponse.json(
          { error: 'Failed to resolve threat' },
          { status: 500 }
        );
      }

    } catch (error) {
      console.error('Security threat resolution error:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to resolve threat' },
        { status: 500 }
      );
    }
  },
  {
    permissions: ["security.threats.resolve"],
    auditAction: "UPDATE",
    auditResource: "security_threat",
    rateLimiting: {
      maxRequests: 10,
      windowMs: 60000
    }
  }
);