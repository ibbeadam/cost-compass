"use client";

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { Property } from "@/types";

export function useUserPropertyAccess() {
  const { userProfile } = useAuth();

  const userPropertyIds = useMemo(() => {
    if (!userProfile) return [];

    // Super admins have access to all properties
    if (userProfile.role === "super_admin") {
      return "all";
    }

    // Collect property IDs from various sources
    const propertyIds: number[] = [];

    // From owned properties
    if (userProfile.ownedProperties) {
      propertyIds.push(...userProfile.ownedProperties.map(p => p.id));
    }

    // From managed properties
    if (userProfile.managedProperties) {
      propertyIds.push(...userProfile.managedProperties.map(p => p.id));
    }

    // From property access
    if (userProfile.propertyAccess) {
      propertyIds.push(...userProfile.propertyAccess.map(pa => pa.propertyId));
    }

    // Remove duplicates
    return [...new Set(propertyIds)];
  }, [userProfile]);

  const isSuperAdmin = useMemo(() => {
    return userProfile?.role === "super_admin";
  }, [userProfile]);

  const hasPropertyAccess = useMemo(() => {
    return isSuperAdmin || (Array.isArray(userPropertyIds) && userPropertyIds.length > 0);
  }, [isSuperAdmin, userPropertyIds]);

  const canAccessProperty = useMemo(() => {
    return (propertyId: number) => {
      if (isSuperAdmin) return true;
      if (userPropertyIds === "all") return true;
      return Array.isArray(userPropertyIds) && userPropertyIds.includes(propertyId);
    };
  }, [isSuperAdmin, userPropertyIds]);

  const filterPropertiesByAccess = useMemo(() => {
    return (properties: Property[]) => {
      if (isSuperAdmin) return properties;
      if (Array.isArray(userPropertyIds)) {
        return properties.filter(p => userPropertyIds.includes(p.id));
      }
      return [];
    };
  }, [isSuperAdmin, userPropertyIds]);

  const getDefaultPropertyId = useMemo(() => {
    if (isSuperAdmin) return undefined;
    if (Array.isArray(userPropertyIds) && userPropertyIds.length === 1) {
      return userPropertyIds[0];
    }
    return undefined;
  }, [isSuperAdmin, userPropertyIds]);

  return {
    userPropertyIds,
    isSuperAdmin,
    hasPropertyAccess,
    canAccessProperty,
    filterPropertiesByAccess,
    getDefaultPropertyId,
    userProfile,
  };
}