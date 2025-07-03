/**
 * Enhanced Authentication Configuration
 * Supports multi-property access control with security features
 */

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { User, UserRole } from "@/types";
import { PermissionService } from "@/lib/permission-utils";
// import { prisma } from "@/lib/prisma"; // TODO: Uncomment when prisma is set up

// Security constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 30 * 60 * 1000; // 30 minutes in milliseconds
const SESSION_MAX_AGE = 8 * 60 * 60; // 8 hours in seconds

/**
 * Enhanced NextAuth configuration with multi-property support
 */
export const enhancedAuthOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // TODO: Replace with actual prisma call when database is updated
        /*
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            ownedProperties: true,
            managedProperties: true,
            propertyAccess: {
              include: { property: true },
              where: {
                OR: [
                  { expiresAt: null },
                  { expiresAt: { gt: new Date() } }
                ]
              }
            }
          }
        });

        if (!user || !user.isActive) {
          throw new Error("Invalid credentials or account disabled");
        }

        // Check account lockout
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          const lockTimeRemaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
          throw new Error(`Account locked. Try again in ${lockTimeRemaining} minutes.`);
        }

        // Verify password
        if (!user.password) {
          throw new Error("Account not properly configured");
        }

        const passwordMatch = await bcrypt.compare(credentials.password, user.password);
        
        if (!passwordMatch) {
          // Increment login attempts
          await prisma.user.update({
            where: { id: user.id },
            data: {
              loginAttempts: user.loginAttempts + 1,
              lockedUntil: user.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS 
                ? new Date(Date.now() + LOCK_TIME) 
                : null
            }
          });

          // Log failed login attempt
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              action: 'LOGIN_FAILED',
              resource: 'authentication',
              details: { reason: 'invalid_password' },
              ipAddress: req.headers?.['x-forwarded-for'] as string || 'unknown',
              userAgent: req.headers?.['user-agent'] || 'unknown',
            }
          });

          throw new Error("Invalid credentials");
        }

        // Check if password needs to be changed (optional feature)
        const passwordAge = user.passwordChangedAt 
          ? Date.now() - user.passwordChangedAt.getTime()
          : null;
        const maxPasswordAge = 90 * 24 * 60 * 60 * 1000; // 90 days
        
        const passwordExpired = passwordAge && passwordAge > maxPasswordAge;

        // Reset login attempts on successful login
        await prisma.user.update({
          where: { id: user.id },
          data: {
            loginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date()
          }
        });

        // Log successful login
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'LOGIN_SUCCESS',
            resource: 'authentication',
            details: { 
              passwordExpired,
              propertiesAccess: user.propertyAccess.length,
              ownedProperties: user.ownedProperties.length,
              managedProperties: user.managedProperties.length
            },
            ipAddress: req.headers?.['x-forwarded-for'] as string || 'unknown',
            userAgent: req.headers?.['user-agent'] || 'unknown',
          }
        });

        // Prepare accessible properties data
        const accessibleProperties = [
          ...user.ownedProperties.map(p => ({ ...p, accessLevel: 'owner' as const })),
          ...user.managedProperties.map(p => ({ ...p, accessLevel: 'full_control' as const })),
          ...user.propertyAccess.map(pa => ({ ...pa.property, accessLevel: pa.accessLevel }))
        ];

        // Remove duplicate properties
        const uniqueProperties = accessibleProperties.filter(
          (property, index, self) => 
            index === self.findIndex(p => p.id === property.id)
        );

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
          phoneNumber: user.phoneNumber,
          lastLoginAt: user.lastLoginAt?.toISOString(),
          twoFactorEnabled: user.twoFactorEnabled,
          passwordExpired,
          accessibleProperties: uniqueProperties,
        };
        */

        // Mock implementation for development
        console.log('Enhanced auth - login attempt for:', credentials.email);
        
        // Mock user data for development
        const mockUser = {
          id: "1",
          email: credentials.email,
          name: "Test User",
          role: "user" as UserRole,
          department: "Development",
          phoneNumber: null,
          lastLoginAt: new Date().toISOString(),
          twoFactorEnabled: false,
          passwordExpired: false,
          accessibleProperties: []
        };

        return mockUser;
      }
    })
  ],
  
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },
  
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // On sign in
      if (user) {
        token.role = user.role;
        token.department = user.department;
        token.phoneNumber = user.phoneNumber;
        token.lastLoginAt = user.lastLoginAt;
        token.twoFactorEnabled = user.twoFactorEnabled;
        token.passwordExpired = user.passwordExpired;
        token.accessibleProperties = user.accessibleProperties;
        
        // Load user permissions
        const permissions = PermissionService.getUserPermissions(user as User);
        token.permissions = permissions;
      }

      // On session update
      if (trigger === "update" && session) {
        // Update token with new session data
        if (session.user) {
          token.name = session.user.name;
          token.role = session.user.role;
          token.department = session.user.department;
          token.phoneNumber = session.user.phoneNumber;
        }
      }

      return token;
    },
    
    async session({ session, token }) {
      if (token && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role as UserRole;
        session.user.department = token.department as string;
        session.user.phoneNumber = token.phoneNumber as string;
        session.user.permissions = token.permissions as string[];
        session.user.lastLoginAt = token.lastLoginAt as string;
        session.user.twoFactorEnabled = token.twoFactorEnabled as boolean;
        session.user.passwordExpired = token.passwordExpired as boolean;
        session.user.accessibleProperties = token.accessibleProperties as any[];
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    }
  },
  
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login", // Error code passed in query string as ?error=
  },
  
  events: {
    async signOut({ session, token }) {
      // TODO: Replace with actual prisma call when database is updated
      /*
      if (token?.sub) {
        await prisma.auditLog.create({
          data: {
            userId: parseInt(token.sub),
            action: 'LOGOUT',
            resource: 'authentication',
            details: { 
              sessionDuration: session?.expires 
                ? new Date(session.expires).getTime() - Date.now() 
                : null 
            }
          }
        });
      }
      */
      console.log('User signed out:', token?.sub);
    },

    async session({ session, token }) {
      // Optional: Log session access for security monitoring
      // This runs on every session check, so use sparingly
      if (token?.sub && Math.random() < 0.01) { // Log 1% of session checks
        console.log('Session accessed:', {
          userId: token.sub,
          role: token.role,
          timestamp: new Date().toISOString()
        });
      }
    }
  },

  // Security settings
  useSecureCookies: process.env.NODE_ENV === "production",
  
  // JWT settings
  jwt: {
    maxAge: SESSION_MAX_AGE,
  },

  // Debug settings
  debug: process.env.NODE_ENV === "development",
};

/**
 * Password validation rules
 */
export const PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxLength: 128,
  preventCommonPasswords: true,
};

/**
 * Validate password against security rules
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < PASSWORD_RULES.minLength) {
    errors.push(`Password must be at least ${PASSWORD_RULES.minLength} characters long`);
  }

  if (password.length > PASSWORD_RULES.maxLength) {
    errors.push(`Password must be no more than ${PASSWORD_RULES.maxLength} characters long`);
  }

  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (PASSWORD_RULES.requireNumbers && !/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (PASSWORD_RULES.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  // Common passwords check (basic implementation)
  const commonPasswords = [
    "password", "123456", "123456789", "12345678", "12345", "1234567",
    "qwerty", "abc123", "password123", "admin", "letmein"
  ];

  if (PASSWORD_RULES.preventCommonPasswords && 
      commonPasswords.includes(password.toLowerCase())) {
    errors.push("Password is too common. Please choose a stronger password");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}