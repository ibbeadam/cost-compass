"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccessibleProperties, usePermissions } from "@/hooks/usePermissions";
import type { Property, PropertyAccessLevel } from "@/types";
import { Building2, Check, Settings, Globe } from "lucide-react";
import Cookies from "js-cookie";

interface PropertySelectorProps {
  selectedPropertyId?: number;
  onPropertyChange?: (propertyId: number | null) => void;
  className?: string;
  showAllOption?: boolean;
  requiredAccessLevel?: PropertyAccessLevel;
  variant?: "select" | "card" | "minimal";
}

/**
 * Property Selector Component
 * Allows users to select from their accessible properties
 */
export function PropertySelector({
  selectedPropertyId,
  onPropertyChange,
  className,
  showAllOption = false,
  requiredAccessLevel = "read_only",
  variant = "select"
}: PropertySelectorProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSuperAdmin, canViewCrossPropertyReports } = usePermissions();
  const { properties, isLoading } = useAccessibleProperties(requiredAccessLevel);

  const [currentPropertyId, setCurrentPropertyId] = useState<number | null>(null);

  // Initialize selected property from various sources
  useEffect(() => {
    if (selectedPropertyId) {
      setCurrentPropertyId(selectedPropertyId);
      return;
    }

    // Try to get from URL params
    const urlPropertyId = searchParams.get('propertyId');
    if (urlPropertyId) {
      setCurrentPropertyId(parseInt(urlPropertyId));
      return;
    }

    // Try to get from cookies
    const cookiePropertyId = Cookies.get('selectedProperty');
    if (cookiePropertyId) {
      setCurrentPropertyId(parseInt(cookiePropertyId));
      return;
    }

    // Default to first available property
    if (properties.length > 0) {
      setCurrentPropertyId(properties[0].id);
    }
  }, [selectedPropertyId, searchParams, properties]);

  // Handle property selection
  const handlePropertyChange = (value: string) => {
    const propertyId = value === "all" ? null : parseInt(value);
    setCurrentPropertyId(propertyId);

    // Save to cookies
    if (propertyId) {
      Cookies.set('selectedProperty', propertyId.toString(), { expires: 30 });
    } else {
      Cookies.remove('selectedProperty');
    }

    // Call callback if provided
    if (onPropertyChange) {
      onPropertyChange(propertyId);
    }

    // Update URL if not controlled externally
    if (!selectedPropertyId) {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      if (propertyId) {
        newSearchParams.set('propertyId', propertyId.toString());
      } else {
        newSearchParams.delete('propertyId');
      }
      router.push(`?${newSearchParams.toString()}`);
    }
  };

  // Get access level for a property
  const getPropertyAccessLevel = (property: any): PropertyAccessLevel => {
    return property.accessLevel || "read_only";
  };

  // Get access level badge variant
  const getAccessBadgeVariant = (accessLevel: PropertyAccessLevel) => {
    switch (accessLevel) {
      case "owner": return "default";
      case "full_control": return "secondary";
      case "management": return "outline";
      case "data_entry": return "outline";
      case "read_only": return "outline";
      default: return "outline";
    }
  };

  // Show all properties option for super admin and cross-property viewers
  const showAllProperties = showAllOption && (isSuperAdmin() || canViewCrossPropertyReports());

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        {variant === "select" && (
          <div className="h-10 bg-gray-200 rounded-md"></div>
        )}
        {variant === "card" && (
          <Card>
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-100 rounded w-1/2"></div>
            </CardHeader>
          </Card>
        )}
        {variant === "minimal" && (
          <div className="h-8 bg-gray-200 rounded w-32"></div>
        )}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm">No Properties Available</CardTitle>
          <CardDescription>
            You don't have access to any properties. Contact your administrator for access.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Select variant
  if (variant === "select") {
    return (
      <Select 
        value={currentPropertyId?.toString() || (showAllProperties ? "all" : "")} 
        onValueChange={handlePropertyChange}
      >
        <SelectTrigger className={className}>
          <SelectValue placeholder="Select a property">
            {currentPropertyId ? (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {properties.find(p => p.id === currentPropertyId)?.name}
              </div>
            ) : showAllProperties ? (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                All Properties
              </div>
            ) : (
              "Select a property"
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {showAllProperties && (
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span>All Properties</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  Cross-Property
                </Badge>
              </div>
            </SelectItem>
          )}
          {properties.map((property) => (
            <SelectItem key={property.id} value={property.id.toString()}>
              <div className="flex items-center gap-2 w-full">
                <Building2 className="h-4 w-4" />
                <div className="flex-1">
                  <div className="font-medium">{property.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {property.propertyCode}
                  </div>
                </div>
                <Badge 
                  variant={getAccessBadgeVariant(getPropertyAccessLevel(property))}
                  className="text-xs"
                >
                  {getPropertyAccessLevel(property).replace('_', ' ')}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Card variant
  if (variant === "card") {
    return (
      <div className={`space-y-3 ${className}`}>
        {showAllProperties && (
          <Card 
            className={`cursor-pointer transition-colors ${
              currentPropertyId === null ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
            }`}
            onClick={() => handlePropertyChange("all")}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold">All Properties</h3>
                    <p className="text-sm text-muted-foreground">Cross-property view</p>
                  </div>
                </div>
                {currentPropertyId === null && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        {properties.map((property) => (
          <Card
            key={property.id}
            className={`cursor-pointer transition-colors ${
              currentPropertyId === property.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
            }`}
            onClick={() => handlePropertyChange(property.id.toString())}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold">{property.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {property.propertyCode} • {property.propertyType}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getAccessBadgeVariant(getPropertyAccessLevel(property))}>
                    {getPropertyAccessLevel(property).replace('_', ' ')}
                  </Badge>
                  {currentPropertyId === property.id && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Minimal variant
  if (variant === "minimal") {
    const selectedProperty = properties.find(p => p.id === currentPropertyId);
    
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <Select 
          value={currentPropertyId?.toString() || (showAllProperties ? "all" : "")} 
          onValueChange={handlePropertyChange}
        >
          <SelectTrigger className="border-none shadow-none p-0 h-auto">
            <SelectValue>
              {currentPropertyId && selectedProperty ? (
                <span className="font-medium">{selectedProperty.name}</span>
              ) : showAllProperties ? (
                <span className="font-medium">All Properties</span>
              ) : (
                <span className="text-muted-foreground">Select property</span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {showAllProperties && (
              <SelectItem value="all">All Properties</SelectItem>
            )}
            {properties.map((property) => (
              <SelectItem key={property.id} value={property.id.toString()}>
                {property.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return null;
}

/**
 * Property Context Display
 * Shows current property context with quick access to property settings
 */
export function PropertyContextDisplay({ 
  propertyId, 
  showSettings = false 
}: { 
  propertyId?: number | null;
  showSettings?: boolean;
}) {
  const { properties } = useAccessibleProperties();
  const { canManageProperties } = usePermissions();
  
  if (propertyId === null || propertyId === undefined) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Globe className="h-4 w-4" />
        <span>All Properties</span>
      </div>
    );
  }

  const property = properties.find(p => p.id === propertyId);
  
  if (!property) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <Building2 className="h-4 w-4" />
        <span>Property not found</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 text-sm">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{property.name}</span>
        <span className="text-muted-foreground">({property.propertyCode})</span>
      </div>
      
      {showSettings && canManageProperties() && (
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Settings className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}