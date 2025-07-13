import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/types";
import { PermissionService } from "@/lib/permission-utils";

// Security constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 30 * 60 * 1000; // 30 minutes in milliseconds
const SESSION_MAX_AGE = 8 * 60 * 60; // 8 hours in seconds

export const authOptions: NextAuthOptions = {
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

        try {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            }
          });

          if (!user || !user.isActive) {
            throw new Error("Invalid credentials or account disabled");
          }

          // Check account lockout (if fields exist in current schema)
          const now = new Date();
          if (user.lockedUntil && user.lockedUntil > now) {
            const lockTimeRemaining = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60000);
            throw new Error(`Account locked. Try again in ${lockTimeRemaining} minutes.`);
          }

          // Check password
          if (!user.password) {
            throw new Error("Account not properly configured");
          }

          const passwordMatch = await bcrypt.compare(credentials.password, user.password);
          
          if (!passwordMatch) {
            // Increment login attempts if field exists
            try {
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  loginAttempts: (user.loginAttempts || 0) + 1,
                  lockedUntil: (user.loginAttempts || 0) + 1 >= MAX_LOGIN_ATTEMPTS 
                    ? new Date(Date.now() + LOCK_TIME) 
                    : user.lockedUntil
                }
              });
            } catch (error) {
              // Field might not exist in current schema - continue without error
              console.log('Login attempt tracking not available in current schema');
            }

            throw new Error("Invalid credentials");
          }

          // Reset login attempts on successful login
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                loginAttempts: 0,
                lockedUntil: null,
                lastLoginAt: new Date()
              }
            });
          } catch (error) {
            // Fields might not exist in current schema - continue without error
            console.log('Login tracking fields not available in current schema');
          }

          // Log successful login
          try {
            const { auditAuthAction } = await import("@/lib/audit-middleware");
            await auditAuthAction(user.id, "LOGIN", {
              email: user.email,
              loginTime: new Date(),
              userAgent: req.headers?.["user-agent"],
            });
          } catch (error) {
            console.error("Failed to log login activity:", error);
          }

          // Get user permissions from database (dynamic)
          const mockUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role as UserRole,
            department: user.department,
            phoneNumber: user.phoneNumber,
            isActive: user.isActive,
            permissions: user.permissions ? JSON.parse(JSON.stringify(user.permissions)) : [],
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          };

          const permissions = await PermissionService.getUserPermissions(mockUser);

          // TODO: Load accessible properties when schema is updated
          /*
          const accessibleProperties = await prisma.user.findUnique({
            where: { id: user.id },
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
          */

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            role: user.role as UserRole,
            department: user.department,
            phoneNumber: user.phoneNumber,
            profileImage: user.profileImage,
            lastLoginAt: user.lastLoginAt?.toISOString(),
            twoFactorEnabled: user.twoFactorEnabled || false,
            passwordExpired: false, // TODO: Implement password age checking
            accessibleProperties: [], // TODO: Load from database when schema is updated
            permissions,
          };
        } catch (error) {
          console.error('Authentication error:', error);
          throw error;
        }
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
        token.profileImage = user.profileImage;
        token.lastLoginAt = user.lastLoginAt;
        token.twoFactorEnabled = user.twoFactorEnabled;
        token.passwordExpired = user.passwordExpired;
        token.accessibleProperties = user.accessibleProperties;
        token.permissions = user.permissions;
      }

      // On session update
      if (trigger === "update" && session) {
        if (session.user) {
          token.name = session.user.name;
          token.role = session.user.role;
          token.department = session.user.department;
          token.phoneNumber = session.user.phoneNumber;
          token.profileImage = session.user.profileImage;
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
        session.user.profileImage = token.profileImage as string;
        session.user.permissions = token.permissions as string[] || [];
        session.user.lastLoginAt = token.lastLoginAt as string;
        session.user.twoFactorEnabled = token.twoFactorEnabled as boolean || false;
        session.user.passwordExpired = token.passwordExpired as boolean || false;
        session.user.accessibleProperties = token.accessibleProperties as any[] || [];
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
    error: "/login",
  },
  
  events: {
    async signOut({ session, token }) {
      console.log('User signed out:', token?.sub);
      // Log successful logout
      if (token?.sub) {
        try {
          const { auditAuthAction } = await import("@/lib/audit-middleware");
          await auditAuthAction(parseInt(token.sub), "LOGOUT", {
            email: token.email,
            logoutTime: new Date(),
          });
        } catch (error) {
          console.error("Failed to log logout activity:", error);
        }
      }
    },
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