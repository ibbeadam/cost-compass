"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAccessibleProperties } from "@/hooks/usePermissions";
import type { Property, PropertyAccessLevel } from "@/types";
import Cookies from "js-cookie";

interface PropertyContextType {
  // Current selected property
  selectedPropertyId: number | null;
  selectedProperty: Property | null;
  
  // Available properties
  accessibleProperties: Property[];
  isLoadingProperties: boolean;
  
  // Property selection
  selectProperty: (propertyId: number | null) => void;
  canSelectAllProperties: boolean;
  
  // Property access
  hasPropertyAccess: (propertyId: number, accessLevel?: PropertyAccessLevel) => boolean;
  getPropertyAccessLevel: (propertyId: number) => PropertyAccessLevel | null;
  
  // Utility functions
  isMultiPropertyMode: boolean;
  refreshProperties: () => void;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

interface PropertyProviderProps {
  children: ReactNode;
  initialPropertyId?: number | null;
  defaultAccessLevel?: PropertyAccessLevel;
}

/**
 * Property Context Provider
 * Manages property selection and access across the application
 */
export function PropertyProvider({ 
  children, 
  initialPropertyId,
  defaultAccessLevel = "read_only"
}: PropertyProviderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { properties, isLoading, hasAnyProperties } = useAccessibleProperties(defaultAccessLevel);
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);

  // Initialize selected property from various sources
  useEffect(() => {
    let targetPropertyId: number | null = null;

    // Priority 1: Explicitly passed initial property ID
    if (initialPropertyId !== undefined) {
      targetPropertyId = initialPropertyId;
    }
    // Priority 2: URL parameter
    else if (searchParams.get('propertyId')) {
      const urlPropertyId = parseInt(searchParams.get('propertyId')!);
      if (!isNaN(urlPropertyId)) {
        targetPropertyId = urlPropertyId;
      }
    }
    // Priority 3: Cookie
    else {
      const cookiePropertyId = Cookies.get('selectedProperty');
      if (cookiePropertyId) {
        const parsedId = parseInt(cookiePropertyId);
        if (!isNaN(parsedId)) {
          targetPropertyId = parsedId;
        }
      }
    }

    // Priority 4: First available property
    if (targetPropertyId === null && properties.length > 0) {
      targetPropertyId = properties[0].id;
    }

    // Validate that the property is accessible
    if (targetPropertyId && properties.length > 0) {
      const isAccessible = properties.some(p => p.id === targetPropertyId);
      if (!isAccessible) {
        targetPropertyId = properties.length > 0 ? properties[0].id : null;
      }
    }

    setSelectedPropertyId(targetPropertyId);

    // Save to cookie if we have a valid property
    if (targetPropertyId) {
      Cookies.set('selectedProperty', targetPropertyId.toString(), { expires: 30 });
    }
  }, [initialPropertyId, searchParams, properties]);

  // Get currently selected property object
  const selectedProperty = selectedPropertyId 
    ? properties.find(p => p.id === selectedPropertyId) || null
    : null;

  // Select a property and update all relevant state
  const selectProperty = (propertyId: number | null) => {
    setSelectedPropertyId(propertyId);

    // Update cookie
    if (propertyId) {
      Cookies.set('selectedProperty', propertyId.toString(), { expires: 30 });
    } else {
      Cookies.remove('selectedProperty');
    }

    // Update URL if property ID should be in URL
    const newSearchParams = new URLSearchParams(searchParams.toString());
    if (propertyId) {
      newSearchParams.set('propertyId', propertyId.toString());
    } else {
      newSearchParams.delete('propertyId');
    }
    
    // Only update URL if it actually changed
    const newUrl = `${window.location.pathname}?${newSearchParams.toString()}`;
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (newUrl !== currentUrl) {
      router.replace(newUrl);
    }
  };

  // Check if user has access to a specific property
  const hasPropertyAccess = (propertyId: number, accessLevel: PropertyAccessLevel = "read_only"): boolean => {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return false;

    // Check access level hierarchy
    const accessLevels: PropertyAccessLevel[] = [
      'read_only', 'data_entry', 'management', 'full_control', 'owner'
    ];
    
    const userLevel = property.accessLevel || 'read_only';
    const userLevelIndex = accessLevels.indexOf(userLevel);
    const requiredLevelIndex = accessLevels.indexOf(accessLevel);
    
    return userLevelIndex >= requiredLevelIndex;
  };

  // Get user's access level for a property
  const getPropertyAccessLevel = (propertyId: number): PropertyAccessLevel | null => {
    const property = properties.find(p => p.id === propertyId);
    return property?.accessLevel || null;
  };

  // Refresh properties (useful after permission changes)
  const refreshProperties = () => {
    // This would trigger a refetch of properties
    // For now, we'll just refresh the page as a simple implementation
    window.location.reload();
  };

  // Determine if user can select "all properties" view
  const canSelectAllProperties = properties.length > 1; // Simplified logic

  // Check if we're in multi-property mode
  const isMultiPropertyMode = properties.length > 1;

  const contextValue: PropertyContextType = {
    selectedPropertyId,
    selectedProperty,
    accessibleProperties: properties,
    isLoadingProperties: isLoading,
    selectProperty,
    canSelectAllProperties,
    hasPropertyAccess,
    getPropertyAccessLevel,
    isMultiPropertyMode,
    refreshProperties,
  };

  return (
    <PropertyContext.Provider value={contextValue}>
      {children}
    </PropertyContext.Provider>
  );
}

/**
 * Hook to use property context
 */
export function usePropertyContext() {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error('usePropertyContext must be used within a PropertyProvider');
  }
  return context;
}

/**
 * Hook for property-specific operations
 */
export function useCurrentProperty() {
  const context = usePropertyContext();
  
  return {
    property: context.selectedProperty,
    propertyId: context.selectedPropertyId,
    hasAccess: (accessLevel: PropertyAccessLevel = "read_only") => 
      context.selectedPropertyId ? context.hasPropertyAccess(context.selectedPropertyId, accessLevel) : false,
    accessLevel: context.selectedPropertyId ? context.getPropertyAccessLevel(context.selectedPropertyId) : null,
    isSelected: (propertyId: number) => context.selectedPropertyId === propertyId,
    select: context.selectProperty,
  };
}

/**
 * Higher-order component to provide property context
 */
export function withPropertyContext<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    defaultAccessLevel?: PropertyAccessLevel;
  }
) {
  return function PropertyWrappedComponent(props: P) {
    return (
      <PropertyProvider defaultAccessLevel={options?.defaultAccessLevel}>
        <Component {...props} />
      </PropertyProvider>
    );
  };
}

/**
 * Property Guard Component
 * Only renders children if user has access to current property
 */
interface PropertyGuardProps {
  children: ReactNode;
  requiredAccessLevel?: PropertyAccessLevel;
  fallback?: ReactNode;
  propertyId?: number; // Optional specific property to check
}

export function PropertyGuard({ 
  children, 
  requiredAccessLevel = "read_only",
  fallback = null,
  propertyId 
}: PropertyGuardProps) {
  const { selectedPropertyId, hasPropertyAccess } = usePropertyContext();
  
  const targetPropertyId = propertyId || selectedPropertyId;
  
  if (!targetPropertyId) {
    return <>{fallback}</>;
  }
  
  const hasAccess = hasPropertyAccess(targetPropertyId, requiredAccessLevel);
  
  if (!hasAccess) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}