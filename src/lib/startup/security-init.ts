/**
 * Security System Initialization
 * Initializes security monitoring and other security services at application startup
 */

import { SecurityMonitor } from "@/lib/security/security-monitor";
import { PermissionCache } from "@/lib/cache/permission-cache";
import { SessionManager } from "@/lib/session/enhanced-session-manager";

export class SecurityInitializer {
  private static initialized = false;
  private static startupTime: Date;

  /**
   * Initialize all security systems
   */
  static async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('Security systems already initialized');
      return;
    }

    this.startupTime = new Date();
    
    try {
      console.log('🔒 Initializing security systems...');

      // Initialize permission cache
      await PermissionCache.initialize();
      console.log('✅ Permission cache initialized');

      // Initialize session manager
      await SessionManager.initialize();
      console.log('✅ Session manager initialized');

      // Start security monitoring
      SecurityMonitor.startMonitoring();
      console.log('✅ Security monitoring started');

      // Log successful initialization
      console.log('🔒 Security systems initialized successfully');
      
      this.initialized = true;

      // Log startup in audit trail
      await this.logStartup();

    } catch (error) {
      console.error('❌ Security initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get initialization status
   */
  static getStatus(): {
    initialized: boolean;
    startupTime: Date | null;
    uptime: number | null;
  } {
    return {
      initialized: this.initialized,
      startupTime: this.startupTime || null,
      uptime: this.startupTime ? Date.now() - this.startupTime.getTime() : null
    };
  }

  /**
   * Log startup event
   */
  private static async logStartup(): Promise<void> {
    try {
      const { prisma } = await import('@/lib/prisma');
      
      await prisma.auditLog.create({
        data: {
          userId: 0, // System user
          action: 'SECURITY_SYSTEM_STARTUP',
          resource: 'security',
          resourceId: 'system',
          details: {
            startupTime: this.startupTime.toISOString(),
            environment: process.env.NODE_ENV || 'development',
            version: process.env.npm_package_version || 'unknown'
          }
        }
      });
    } catch (error) {
      console.error('Failed to log security startup:', error);
    }
  }

  /**
   * Graceful shutdown
   */
  static async shutdown(): Promise<void> {
    if (!this.initialized) return;

    try {
      console.log('🔒 Shutting down security systems...');

      // Log shutdown
      const { prisma } = await import('@/lib/prisma');
      await prisma.auditLog.create({
        data: {
          userId: 0,
          action: 'SECURITY_SYSTEM_SHUTDOWN',
          resource: 'security',
          resourceId: 'system',
          details: {
            shutdownTime: new Date().toISOString(),
            uptime: Date.now() - this.startupTime.getTime()
          }
        }
      });

      this.initialized = false;
      console.log('✅ Security systems shut down');

    } catch (error) {
      console.error('Error during security shutdown:', error);
    }
  }
}