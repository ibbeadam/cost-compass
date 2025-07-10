/**
 * Session Security Middleware
 * Integrates enhanced session management with NextAuth and API routes
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { SessionManager } from "./enhanced-session-manager";
import { prisma } from "@/lib/prisma";

export interface SessionSecurityOptions {
  requireDeviceVerification?: boolean;
  allowUntrustedDevices?: boolean;
  maxConcurrentSessions?: number;
  sessionTimeoutMs?: number;
  trackActivity?: boolean;
}

/**
 * Session security middleware wrapper
 */
export function withSessionSecurity(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: SessionSecurityOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Get current session
      const session = await getServerSession(authOptions);
      
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const userId = parseInt(session.user.id);
      const sessionToken = session.sessionToken;

      // Validate session security
      const securityValidation = await SessionManager.validateSessionSecurity(
        sessionToken,
        request
      );

      if (!securityValidation.valid) {
        // Handle security violations
        switch (securityValidation.action) {
          case 'force_logout':
            await SessionManager.invalidateSession(
              sessionToken,
              userId,
              securityValidation.reason || 'security_violation'
            );
            
            return NextResponse.json({
              error: "Session terminated",
              reason: securityValidation.reason,
              action: "force_logout"
            }, { status: 401 });

          case 'require_2fa':
            return NextResponse.json({
              error: "Two-factor authentication required",
              reason: securityValidation.reason,
              action: "require_2fa"
            }, { status: 403 });

          case 'device_verification':
            return NextResponse.json({
              error: "Device verification required",
              reason: securityValidation.reason,
              action: "device_verification"
            }, { status: 403 });

          default:
            return NextResponse.json({
              error: "Session security violation",
              reason: securityValidation.reason
            }, { status: 403 });
        }
      }

      // Update session activity if tracking enabled
      if (options.trackActivity !== false) {
        await SessionManager.updateSessionActivity(sessionToken, request);
      }

      // Check concurrent sessions limit
      if (options.maxConcurrentSessions) {
        const activeCount = await SessionManager.getActiveSessionCount(userId);
        if (activeCount > options.maxConcurrentSessions) {
          await SessionManager.handleSecurityEvent(userId, 'account_locked', {
            invalidateAllSessions: true
          });
          
          return NextResponse.json({
            error: "Too many concurrent sessions",
            action: "force_logout"
          }, { status: 403 });
        }
      }

      // Call the original handler
      const response = await handler(request);

      // Add session security headers
      response.headers.set('X-Session-Security', 'enhanced');
      response.headers.set('X-Device-Trusted', securityValidation.valid ? 'true' : 'false');
      
      return response;

    } catch (error) {
      console.error('Session security middleware error:', error);
      return NextResponse.json(
        { error: "Session security error" },
        { status: 500 }
      );
    }
  };
}

/**
 * Middleware for session management API endpoints
 */
export async function handleSessionManagement(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Get current session
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);

  try {
    switch (true) {
      // GET /api/sessions - List user's active sessions
      case pathname.endsWith('/sessions') && method === 'GET':
        const sessions = await SessionManager.getUserSessions(userId);
        return NextResponse.json({ sessions });

      // DELETE /api/sessions/{sessionId} - Terminate specific session
      case pathname.match(/\/sessions\/(.+)$/) && method === 'DELETE':
        const sessionIdMatch = pathname.match(/\/sessions\/(.+)$/);
        const sessionToDelete = sessionIdMatch?.[1];
        
        if (sessionToDelete) {
          await SessionManager.invalidateSession(
            sessionToDelete,
            userId,
            'user_terminated'
          );
          return NextResponse.json({ message: "Session terminated" });
        }
        break;

      // DELETE /api/sessions - Terminate all sessions
      case pathname.endsWith('/sessions') && method === 'DELETE':
        await SessionManager.handleSecurityEvent(userId, 'account_locked', {
          invalidateAllSessions: true
        });
        return NextResponse.json({ message: "All sessions terminated" });

      // POST /api/sessions/trust-device - Trust current device
      case pathname.endsWith('/sessions/trust-device') && method === 'POST':
        const deviceInfo = SessionManager.parseDeviceInfo(request);
        await SessionManager.trustDevice(userId, deviceInfo.fingerprint);
        return NextResponse.json({ message: "Device trusted" });

      // GET /api/sessions/stats - Get session statistics (admin only)
      case pathname.endsWith('/sessions/stats') && method === 'GET':
        // Check if user has admin permissions
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true }
        });
        
        if (user?.role !== 'super_admin') {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        
        const timeframe = request.nextUrl.searchParams.get('timeframe') as '1h' | '24h' | '7d' || '24h';
        const stats = await SessionManager.getSessionStats(timeframe);
        return NextResponse.json({ stats });

      default:
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } catch (error) {
    console.error('Session management error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Enhanced authentication callback for NextAuth
 */
export async function enhancedSignInCallback(
  user: any,
  account: any,
  profile: any,
  request: NextRequest
) {
  try {
    if (account && user) {
      const deviceInfo = SessionManager.parseDeviceInfo(request);
      
      // Log successful login
      await prisma.auditLog.create({
        data: {
          userId: parseInt(user.id),
          action: 'LOGIN_SUCCESS',
          resource: 'auth',
          resourceId: user.id,
          details: {
            provider: account.provider,
            deviceFingerprint: deviceInfo.fingerprint,
            deviceInfo,
            loginMethod: account.type
          }
        }
      });

      // Update user's last login timestamp
      await prisma.user.update({
        where: { id: parseInt(user.id) },
        data: { lastLoginAt: new Date() }
      });

      return true;
    }
    return false;
  } catch (error) {
    console.error('Enhanced sign in callback error:', error);
    return false;
  }
}

/**
 * Enhanced session callback for NextAuth
 */
export async function enhancedSessionCallback(
  session: any,
  token: any,
  request?: NextRequest
) {
  try {
    if (session?.user && token?.sub && request) {
      const userId = parseInt(token.sub);
      const sessionToken = session.sessionToken || token.sessionToken;

      // Create or update enhanced session tracking
      if (sessionToken) {
        const deviceInfo = SessionManager.parseDeviceInfo(request);
        
        await SessionManager.createSession(
          userId,
          sessionToken,
          session.expires,
          deviceInfo
        );
      }
    }
    return session;
  } catch (error) {
    console.error('Enhanced session callback error:', error);
    return session;
  }
}

/**
 * Handle user logout with session cleanup
 */
export async function handleLogout(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (session?.user) {
      const userId = parseInt(session.user.id);
      const sessionToken = session.sessionToken;

      // Invalidate the session
      if (sessionToken) {
        await SessionManager.invalidateSession(
          sessionToken,
          userId,
          'user_logout'
        );
      }

      // Log the logout
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'LOGOUT',
          resource: 'auth',
          resourceId: userId.toString(),
          details: {
            logoutMethod: 'user_initiated',
            sessionToken: sessionToken || 'unknown'
          }
        }
      });
    }

    return NextResponse.json({ message: "Logged out successfully" });
    
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}

/**
 * Security event handlers
 */
export class SecurityEventHandler {
  
  /**
   * Handle password change event
   */
  static async handlePasswordChange(userId: number, request: NextRequest) {
    await SessionManager.handleSecurityEvent(userId, 'password_change', {
      invalidateAllSessions: true,
      notifyUser: true
    });

    // Log the password change
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PASSWORD_CHANGED',
        resource: 'user',
        resourceId: userId.toString(),
        details: {
          triggeredBy: 'user',
          allSessionsInvalidated: true,
          deviceInfo: SessionManager.parseDeviceInfo(request)
        }
      }
    });
  }

  /**
   * Handle role change event
   */
  static async handleRoleChange(userId: number, oldRole: string, newRole: string, changedBy: number) {
    await SessionManager.handleSecurityEvent(userId, 'role_change', {
      invalidateAllSessions: true,
      requireReauthentication: true
    });

    await prisma.auditLog.create({
      data: {
        userId: changedBy,
        action: 'USER_ROLE_CHANGED',
        resource: 'user',
        resourceId: userId.toString(),
        details: {
          targetUserId: userId,
          oldRole,
          newRole,
          allSessionsInvalidated: true
        }
      }
    });
  }

  /**
   * Handle permission change event
   */
  static async handlePermissionChange(userId: number, changedBy: number, changes: any) {
    await SessionManager.handleSecurityEvent(userId, 'permission_change', {
      invalidateAllSessions: false,
      requireReauthentication: false
    });

    await prisma.auditLog.create({
      data: {
        userId: changedBy,
        action: 'USER_PERMISSIONS_CHANGED',
        resource: 'user',
        resourceId: userId.toString(),
        details: {
          targetUserId: userId,
          permissionChanges: changes
        }
      }
    });
  }
}

/**
 * Convenience wrappers for common session security scenarios
 */

// High security for admin operations
export const withHighSessionSecurity = (handler: any) =>
  withSessionSecurity(handler, {
    requireDeviceVerification: true,
    allowUntrustedDevices: false,
    maxConcurrentSessions: 2,
    sessionTimeoutMs: 15 * 60 * 1000, // 15 minutes
    trackActivity: true
  });

// Medium security for regular operations
export const withMediumSessionSecurity = (handler: any) =>
  withSessionSecurity(handler, {
    requireDeviceVerification: false,
    allowUntrustedDevices: true,
    maxConcurrentSessions: 5,
    sessionTimeoutMs: 30 * 60 * 1000, // 30 minutes
    trackActivity: true
  });

// Low security for public data
export const withLowSessionSecurity = (handler: any) =>
  withSessionSecurity(handler, {
    requireDeviceVerification: false,
    allowUntrustedDevices: true,
    maxConcurrentSessions: 10,
    sessionTimeoutMs: 60 * 60 * 1000, // 1 hour
    trackActivity: false
  });