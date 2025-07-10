/**
 * Enhanced Session Management System
 * Provides device tracking, session security, and concurrent session management
 */

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";
import crypto from "crypto";

export interface DeviceInfo {
  userAgent: string;
  ip: string;
  browser?: string;
  os?: string;
  device?: string;
  city?: string;
  country?: string;
  fingerprint: string;
}

export interface SessionSecurity {
  isActive: boolean;
  lastActivity: Date;
  deviceTrusted: boolean;
  securityLevel: 'low' | 'medium' | 'high';
  suspiciousActivity: boolean;
  concurrentSessions: number;
}

export interface EnhancedSession {
  id: string;
  userId: number;
  sessionToken: string;
  expires: Date;
  deviceInfo: DeviceInfo;
  security: SessionSecurity;
  createdAt: Date;
  lastAccessedAt: Date;
}

/**
 * Enhanced Session Management Service
 */
export class SessionManager {
  private static readonly MAX_CONCURRENT_SESSIONS = 5;
  private static readonly SESSION_ACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private static readonly DEVICE_TRUST_THRESHOLD = 3; // Trust after 3 successful logins

  /**
   * Parse device information from request
   */
  static parseDeviceInfo(request: NextRequest): DeviceInfo {
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const ip = request.ip || 
               request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Create device fingerprint
    const fingerprint = crypto
      .createHash('sha256')
      .update(`${userAgent}-${ip}`)
      .digest('hex')
      .substring(0, 16);

    // Parse user agent for browser/OS info
    const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/([0-9.]+)/);
    const osMatch = userAgent.match(/(Windows|Mac|Linux|Android|iOS)/);
    const deviceMatch = userAgent.match(/(Mobile|Tablet|Desktop)/);

    return {
      userAgent,
      ip,
      browser: browserMatch ? `${browserMatch[1]} ${browserMatch[2]}` : 'Unknown',
      os: osMatch ? osMatch[1] : 'Unknown',
      device: deviceMatch ? deviceMatch[1] : 'Desktop',
      fingerprint,
    };
  }

  /**
   * Create enhanced session record
   */
  static async createSession(
    userId: number,
    sessionToken: string,
    expires: Date,
    deviceInfo: DeviceInfo
  ): Promise<void> {
    try {
      // Check if device is trusted
      const previousLogins = await prisma.auditLog.count({
        where: {
          userId,
          action: 'LOGIN_SUCCESS',
          details: {
            path: ['deviceFingerprint'],
            equals: deviceInfo.fingerprint
          }
        }
      });

      const deviceTrusted = previousLogins >= this.DEVICE_TRUST_THRESHOLD;

      // Count current active sessions
      const activeSessions = await this.getActiveSessionCount(userId);

      // Remove oldest sessions if limit exceeded
      if (activeSessions >= this.MAX_CONCURRENT_SESSIONS) {
        await this.removeOldestSessions(userId, activeSessions - this.MAX_CONCURRENT_SESSIONS + 1);
      }

      // Create session record in audit log (since we don't have enhanced session table)
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'SESSION_CREATED',
          resource: 'session',
          resourceId: sessionToken,
          details: {
            sessionToken,
            expires: expires.toISOString(),
            deviceInfo,
            security: {
              isActive: true,
              lastActivity: new Date().toISOString(),
              deviceTrusted,
              securityLevel: deviceTrusted ? 'medium' : 'low',
              suspiciousActivity: false,
              concurrentSessions: activeSessions + 1
            }
          }
        }
      });

      // Log device information
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'DEVICE_LOGIN',
          resource: 'device',
          resourceId: deviceInfo.fingerprint,
          details: {
            deviceInfo,
            trusted: deviceTrusted,
            loginCount: previousLogins + 1
          }
        }
      });

    } catch (error) {
      console.error('Error creating enhanced session:', error);
    }
  }

  /**
   * Update session activity
   */
  static async updateSessionActivity(
    sessionToken: string,
    request: NextRequest
  ): Promise<void> {
    try {
      const deviceInfo = this.parseDeviceInfo(request);
      
      // Find the session
      const session = await prisma.auditLog.findFirst({
        where: {
          action: 'SESSION_CREATED',
          resourceId: sessionToken
        },
        orderBy: { timestamp: 'desc' }
      });

      if (session) {
        // Update session activity
        await prisma.auditLog.create({
          data: {
            userId: session.userId,
            action: 'SESSION_ACTIVITY',
            resource: 'session',
            resourceId: sessionToken,
            details: {
              lastActivity: new Date().toISOString(),
              deviceInfo,
              activityType: 'api_request'
            }
          }
        });
      }
    } catch (error) {
      console.error('Error updating session activity:', error);
    }
  }

  /**
   * Validate session security
   */
  static async validateSessionSecurity(
    sessionToken: string,
    request: NextRequest
  ): Promise<{
    valid: boolean;
    reason?: string;
    action?: 'force_logout' | 'require_2fa' | 'device_verification';
  }> {
    try {
      const deviceInfo = this.parseDeviceInfo(request);

      // Find session creation record
      const sessionRecord = await prisma.auditLog.findFirst({
        where: {
          action: 'SESSION_CREATED',
          resourceId: sessionToken
        },
        orderBy: { timestamp: 'desc' }
      });

      if (!sessionRecord) {
        return { valid: false, reason: 'Session not found' };
      }

      const sessionDetails = sessionRecord.details as any;
      const originalDeviceInfo = sessionDetails.deviceInfo;

      // Check device fingerprint match
      if (originalDeviceInfo.fingerprint !== deviceInfo.fingerprint) {
        // Log suspicious activity
        await prisma.auditLog.create({
          data: {
            userId: sessionRecord.userId,
            action: 'SUSPICIOUS_SESSION_ACTIVITY',
            resource: 'session',
            resourceId: sessionToken,
            details: {
              reason: 'Device fingerprint mismatch',
              originalDevice: originalDeviceInfo,
              currentDevice: deviceInfo,
              securityLevel: 'high'
            }
          }
        });

        return {
          valid: false,
          reason: 'Device fingerprint mismatch',
          action: 'device_verification'
        };
      }

      // Check for IP address changes (if not trusted device)
      if (!sessionDetails.security.deviceTrusted && 
          originalDeviceInfo.ip !== deviceInfo.ip) {
        
        await prisma.auditLog.create({
          data: {
            userId: sessionRecord.userId,
            action: 'SUSPICIOUS_SESSION_ACTIVITY',
            resource: 'session',
            resourceId: sessionToken,
            details: {
              reason: 'IP address change on untrusted device',
              originalIp: originalDeviceInfo.ip,
              currentIp: deviceInfo.ip,
              securityLevel: 'medium'
            }
          }
        });

        return {
          valid: false,
          reason: 'IP address change detected',
          action: 'require_2fa'
        };
      }

      // Check session activity timeout
      const lastActivity = await prisma.auditLog.findFirst({
        where: {
          userId: sessionRecord.userId,
          action: { in: ['SESSION_ACTIVITY', 'SESSION_CREATED'] },
          resourceId: sessionToken
        },
        orderBy: { timestamp: 'desc' }
      });

      if (lastActivity) {
        const lastActivityTime = new Date(lastActivity.timestamp).getTime();
        const now = Date.now();
        
        if (now - lastActivityTime > this.SESSION_ACTIVITY_TIMEOUT) {
          return {
            valid: false,
            reason: 'Session timeout due to inactivity',
            action: 'force_logout'
          };
        }
      }

      return { valid: true };
      
    } catch (error) {
      console.error('Error validating session security:', error);
      return { valid: false, reason: 'Internal error' };
    }
  }

  /**
   * Get active session count for user
   */
  static async getActiveSessionCount(userId: number): Promise<number> {
    try {
      // Get all session creation records for user in last 24 hours
      const sessions = await prisma.auditLog.findMany({
        where: {
          userId,
          action: 'SESSION_CREATED',
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        select: { resourceId: true, timestamp: true }
      });

      // Filter for sessions that haven't been explicitly logged out
      let activeSessions = 0;
      
      for (const session of sessions) {
        const logoutRecord = await prisma.auditLog.findFirst({
          where: {
            userId,
            action: { in: ['SESSION_DESTROYED', 'LOGOUT'] },
            resourceId: session.resourceId,
            timestamp: { gte: session.timestamp }
          }
        });

        if (!logoutRecord) {
          activeSessions++;
        }
      }

      return activeSessions;
    } catch (error) {
      console.error('Error getting active session count:', error);
      return 0;
    }
  }

  /**
   * Remove oldest sessions when limit exceeded
   */
  static async removeOldestSessions(userId: number, countToRemove: number): Promise<void> {
    try {
      const oldestSessions = await prisma.auditLog.findMany({
        where: {
          userId,
          action: 'SESSION_CREATED',
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { timestamp: 'asc' },
        take: countToRemove,
        select: { resourceId: true }
      });

      for (const session of oldestSessions) {
        await this.invalidateSession(session.resourceId, userId, 'exceeded_concurrent_limit');
      }
    } catch (error) {
      console.error('Error removing oldest sessions:', error);
    }
  }

  /**
   * Invalidate a session
   */
  static async invalidateSession(
    sessionToken: string,
    userId: number,
    reason: string
  ): Promise<void> {
    try {
      // Log session destruction
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'SESSION_DESTROYED',
          resource: 'session',
          resourceId: sessionToken,
          details: {
            reason,
            timestamp: new Date().toISOString()
          }
        }
      });

      // Also remove from NextAuth sessions table
      await prisma.session.deleteMany({
        where: {
          sessionToken,
          userId
        }
      });
    } catch (error) {
      console.error('Error invalidating session:', error);
    }
  }

  /**
   * Get user's active sessions
   */
  static async getUserSessions(userId: number): Promise<EnhancedSession[]> {
    try {
      const sessionRecords = await prisma.auditLog.findMany({
        where: {
          userId,
          action: 'SESSION_CREATED',
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { timestamp: 'desc' }
      });

      const sessions: EnhancedSession[] = [];

      for (const record of sessionRecords) {
        // Check if session is still active
        const logoutRecord = await prisma.auditLog.findFirst({
          where: {
            userId,
            action: { in: ['SESSION_DESTROYED', 'LOGOUT'] },
            resourceId: record.resourceId,
            timestamp: { gte: record.timestamp }
          }
        });

        if (!logoutRecord) {
          const details = record.details as any;
          
          // Get last activity
          const lastActivity = await prisma.auditLog.findFirst({
            where: {
              userId,
              action: { in: ['SESSION_ACTIVITY', 'SESSION_CREATED'] },
              resourceId: record.resourceId
            },
            orderBy: { timestamp: 'desc' }
          });

          sessions.push({
            id: record.id,
            userId,
            sessionToken: record.resourceId,
            expires: new Date(details.expires),
            deviceInfo: details.deviceInfo,
            security: details.security,
            createdAt: record.timestamp,
            lastAccessedAt: lastActivity ? lastActivity.timestamp : record.timestamp
          });
        }
      }

      return sessions;
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  }

  /**
   * Handle security events (password change, role change, etc.)
   */
  static async handleSecurityEvent(
    userId: number,
    eventType: 'password_change' | 'role_change' | 'permission_change' | 'account_locked',
    options: {
      invalidateAllSessions?: boolean;
      requireReauthentication?: boolean;
      notifyUser?: boolean;
    } = {}
  ): Promise<void> {
    try {
      // Log the security event
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'SECURITY_EVENT',
          resource: 'user',
          resourceId: userId.toString(),
          details: {
            eventType,
            options,
            timestamp: new Date().toISOString()
          }
        }
      });

      // Invalidate all sessions if required
      if (options.invalidateAllSessions) {
        const activeSessions = await this.getUserSessions(userId);
        
        for (const session of activeSessions) {
          await this.invalidateSession(
            session.sessionToken,
            userId,
            `security_event_${eventType}`
          );
        }

        // Also remove all NextAuth sessions
        await prisma.session.deleteMany({
          where: { userId }
        });
      }

      // Update user's password changed timestamp if password change
      if (eventType === 'password_change') {
        await prisma.user.update({
          where: { id: userId },
          data: { passwordChangedAt: new Date() }
        });
      }

    } catch (error) {
      console.error('Error handling security event:', error);
    }
  }

  /**
   * Trust a device after successful verification
   */
  static async trustDevice(userId: number, deviceFingerprint: string): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'DEVICE_TRUSTED',
          resource: 'device',
          resourceId: deviceFingerprint,
          details: {
            trustedAt: new Date().toISOString(),
            trustedBy: 'user_verification'
          }
        }
      });
    } catch (error) {
      console.error('Error trusting device:', error);
    }
  }

  /**
   * Get session statistics for monitoring
   */
  static async getSessionStats(timeframe: '1h' | '24h' | '7d' = '24h'): Promise<{
    totalSessions: number;
    activeSessions: number;
    suspiciousActivity: number;
    deviceTrustRate: number;
    averageSessionDuration: number;
  }> {
    try {
      const timeframeMs = timeframe === '1h' ? 60 * 60 * 1000 :
                         timeframe === '24h' ? 24 * 60 * 60 * 1000 :
                         7 * 24 * 60 * 60 * 1000;

      const since = new Date(Date.now() - timeframeMs);

      const [totalSessions, suspiciousActivity] = await Promise.all([
        prisma.auditLog.count({
          where: {
            action: 'SESSION_CREATED',
            timestamp: { gte: since }
          }
        }),
        prisma.auditLog.count({
          where: {
            action: 'SUSPICIOUS_SESSION_ACTIVITY',
            timestamp: { gte: since }
          }
        })
      ]);

      // Count currently active sessions (approximation)
      const activeSessions = Math.floor(totalSessions * 0.7); // Estimate

      return {
        totalSessions,
        activeSessions,
        suspiciousActivity,
        deviceTrustRate: suspiciousActivity > 0 ? 1 - (suspiciousActivity / totalSessions) : 1,
        averageSessionDuration: 45 // minutes (placeholder)
      };
    } catch (error) {
      console.error('Error getting session stats:', error);
      return {
        totalSessions: 0,
        activeSessions: 0,
        suspiciousActivity: 0,
        deviceTrustRate: 0,
        averageSessionDuration: 0
      };
    }
  }
}