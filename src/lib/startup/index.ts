/**
 * Application Startup Module
 * Initializes all critical systems when the application starts
 */

import { SecurityInitializer } from './security-init';

export class ApplicationStartup {
  private static initialized = false;

  /**
   * Initialize all application systems
   */
  static async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('Application systems already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing application systems...');

      // Initialize security systems
      await SecurityInitializer.initialize();

      this.initialized = true;
      console.log('✅ Application systems initialized successfully');

    } catch (error) {
      console.error('❌ Application initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get initialization status
   */
  static isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Graceful shutdown
   */
  static async shutdown(): Promise<void> {
    if (!this.initialized) return;

    try {
      console.log('🛑 Shutting down application systems...');

      // Shutdown security systems
      await SecurityInitializer.shutdown();

      this.initialized = false;
      console.log('✅ Application systems shut down successfully');

    } catch (error) {
      console.error('❌ Application shutdown error:', error);
    }
  }
}

// Initialize when this module is imported (for server-side)
if (typeof window === 'undefined') {
  ApplicationStartup.initialize().catch(console.error);
}