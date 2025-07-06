import NextAuth from "next-auth";
import { JWT } from "next-auth/jwt";
import type { UserRole, PropertyAccessLevel } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: UserRole;
      department?: string;
      phoneNumber?: string;
      profileImage?: string | null;
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
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: UserRole;
    department?: string;
    phoneNumber?: string;
    profileImage?: string | null;
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
    permissions?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    department?: string;
    phoneNumber?: string;
    profileImage?: string | null;
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