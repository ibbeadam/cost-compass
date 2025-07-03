/**
 * Enhanced NextAuth Type Definitions
 * Extends NextAuth types to support multi-property access control
 */

import NextAuth from "next-auth";
import { JWT } from "next-auth/jwt";
import type { UserRole, PropertyAccessLevel } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      role: UserRole;
      department?: string;
      phoneNumber?: string;
      permissions: string[];
      lastLoginAt?: string;
      twoFactorEnabled?: boolean;
      passwordExpired?: boolean;
      accessibleProperties: Array<{
        id: number;
        name: string;
        propertyCode: string;
        propertyType: string;
        accessLevel: PropertyAccessLevel;
      }>;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    name?: string;
    role: UserRole;
    department?: string;
    phoneNumber?: string;
    lastLoginAt?: string;
    twoFactorEnabled?: boolean;
    passwordExpired?: boolean;
    accessibleProperties?: Array<{
      id: number;
      name: string;
      propertyCode: string;
      propertyType: string;
      accessLevel: PropertyAccessLevel;
    }>;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    department?: string;
    phoneNumber?: string;
    permissions: string[];
    lastLoginAt?: string;
    twoFactorEnabled?: boolean;
    passwordExpired?: boolean;
    accessibleProperties?: Array<{
      id: number;
      name: string;
      propertyCode: string;
      propertyType: string;
      accessLevel: PropertyAccessLevel;
    }>;
  }
}