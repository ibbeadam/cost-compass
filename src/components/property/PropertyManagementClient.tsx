"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  Building, 
  Shield, 
  Eye, 
  EyeOff, 
  Mail, 
  Phone, 
  MapPin, 
  Plus, 
  X,
  Users,
  Store,
  Upload,
  ImageIcon
} from "lucide-react";
import { format } from "date-fns";

import type { Property, CreatePropertyData, UpdatePropertyData, PropertyType, User } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/lib/toast";
// Using API routes instead of server actions for better auth handling
// import { 
//   getPropertiesAction, 
//   createPropertyAction, 
//   updatePropertyAction, 
//   deletePropertyAction 
// } from "@/actions/propertyActions";
import { getAllUsersAction } from "@/actions/prismaUserActions";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { RecordsPerPageSelector } from "@/components/ui/records-per-page-selector";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CURRENCIES, DEFAULT_CURRENCY, getCurrencyDisplayName, type Currency } from "@/lib/currency";

// Helper functions moved outside components to be accessible by all
const getPropertyTypeBadgeVariant = (type: PropertyType) => {
  switch (type) {
    case 'hotel': return 'default';
    case 'restaurant': return 'secondary';
    case 'cafe': return 'outline';
    case 'bar': return 'destructive';
    case 'catering': return 'default';
    case 'franchise': return 'secondary';
    case 'chain': return 'outline';
    default: return 'outline';
  }
};

const getPropertyTypeDisplayName = (type: PropertyType) => {
  switch (type) {
    case 'hotel': return 'Hotel';
    case 'restaurant': return 'Restaurant';
    case 'cafe': return 'Cafe';
    case 'bar': return 'Bar';
    case 'catering': return 'Catering';
    case 'franchise': return 'Franchise';
    case 'chain': return 'Chain';
    default: return type;
  }
};

export default function PropertyManagementClient() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>(CURRENCIES); // Start with fallback
  const [currencyMap, setCurrencyMap] = useState<{[key: string]: number}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingProperty, setViewingProperty] = useState<Property | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchProperties = useCallback(async () => {
    setIsLoading(true);
    try {
      const [propertiesResponse, usersResponse, currenciesResponse] = await Promise.all([
        fetch('/api/properties'),
        getAllUsersAction(),
        fetch('/api/currencies/manage')
      ]);
      
      if (!propertiesResponse.ok) {
        throw new Error('Failed to fetch properties');
      }
      
      if (!currenciesResponse.ok) {
        console.warn('Failed to fetch currencies, using fallback');
      }
      
      const { properties } = await propertiesResponse.json();
      const currenciesData = currenciesResponse.ok 
        ? (await currenciesResponse.json()).currencies 
        : CURRENCIES; // Fallback to hardcoded currencies
      
      // Create a mapping from currency code to ID
      const codeToIdMap: {[key: string]: number} = {};
      if (currenciesResponse.ok) {
        currenciesData.forEach((currency: any) => {
          codeToIdMap[currency.code] = currency.id;
        });
      }
      
      setProperties(properties);
      setUsers(usersResponse);
      setCurrencies(currenciesData);
      setCurrencyMap(codeToIdMap);
    } catch (error) {
      showToast.error((error as Error).message || "Could not load properties.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handleAddNew = () => {
    setEditingProperty(null);
    setIsFormOpen(true);
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setIsFormOpen(true);
  };

  const handleView = (property: Property) => {
    setViewingProperty(property);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (propertyId: number) => {
    try {
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete property');
      }
      
      fetchProperties();
      showToast.success("The property has been deleted successfully.");
    } catch (error) {
      showToast.error((error as Error).message || "Could not delete property.");
    }
  };

  const handleSubmit = async (formData: CreatePropertyData | UpdatePropertyData, logoFile?: File | null) => {
    setIsSubmitting(true);
    let property: Property | null = null;
    let propertyCreated = false;
    
    // Clean up formData to remove undefined values
    const cleanedFormData = Object.fromEntries(
      Object.entries(formData).filter(([_, value]) => value !== undefined && value !== "")
    );
    
    try {
      if (editingProperty) {
        // Update existing property
        console.log("Updating property:", { 
          id: editingProperty.id, 
          originalFormData: formData,
          cleanedFormData: cleanedFormData
        });
        
        const response = await fetch(`/api/properties/${editingProperty.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cleanedFormData),
        });
        
        console.log("Update response:", { 
          status: response.status, 
          ok: response.ok 
        });
        
        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (jsonError) {
            console.error("Failed to parse error response JSON:", jsonError);
            const responseText = await response.text();
            console.error("Raw response:", responseText);
            throw new Error(`Server error (${response.status}): ${responseText || 'Unknown error'}`);
          }
          
          console.error("Update failed:", {
            status: response.status,
            errorData: errorData
          });
          throw new Error(errorData.error || 'Failed to update property');
        }
        
        let result;
        try {
          result = await response.json();
        } catch (jsonError) {
          console.error("Failed to parse success response JSON:", jsonError);
          const responseText = await response.text();
          console.error("Raw success response:", responseText);
          throw new Error(`Server returned invalid JSON response: ${responseText}`);
        }
        
        property = result.property;
        propertyCreated = true;
        
        // Upload logo if there's a new file
        if (logoFile) {
          try {
            await handleLogoUpload(property.id, logoFile);
            // Refresh properties after successful logo upload
            await fetchProperties();
            // Update editingProperty with fresh data to show the logo in the edit form
            if (editingProperty) {
              const updatedProperties = await fetch('/api/properties').then(res => res.json());
              const updatedProperty = updatedProperties.properties.find((p: Property) => p.id === editingProperty.id);
              if (updatedProperty) {
                setEditingProperty(updatedProperty);
              }
            }
            showToast.success("Property and logo have been updated successfully.");
          } catch (logoError) {
            showToast.warning("Property was updated, but logo upload failed: " + (logoError as Error).message);
          }
        } else {
          showToast.success("Property has been updated successfully.");
        }
      } else {
        // Create new property
        console.log("Creating property:", {
          originalFormData: formData,
          cleanedFormData: cleanedFormData
        });
        
        const response = await fetch('/api/properties', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cleanedFormData),
        });
        
        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (jsonError) {
            console.error("Failed to parse create error response JSON:", jsonError);
            const responseText = await response.text();
            console.error("Raw create error response:", responseText);
            throw new Error(`Server error (${response.status}): ${responseText || 'Unknown error'}`);
          }
          throw new Error(errorData.error || 'Failed to create property');
        }
        
        let result;
        try {
          result = await response.json();
        } catch (jsonError) {
          console.error("Failed to parse create success response JSON:", jsonError);
          const responseText = await response.text();
          console.error("Raw create success response:", responseText);
          throw new Error(`Server returned invalid JSON response: ${responseText}`);
        }
        
        property = result.property;
        propertyCreated = true;
        
        // Upload logo if there's a file
        if (logoFile) {
          try {
            await handleLogoUpload(property.id, logoFile);
            // Refresh properties after successful logo upload
            await fetchProperties();
            showToast.success("Property and logo have been created successfully.");
          } catch (logoError) {
            showToast.warning("Property was created, but logo upload failed: " + (logoError as Error).message);
          }
        } else {
          showToast.success("Property has been created successfully.");
        }
      }
      
      setIsFormOpen(false);
      setEditingProperty(null);
      fetchProperties();
    } catch (error) {
      if (propertyCreated && property) {
        showToast.error("Property was saved but there was an issue with the logo upload: " + (error as Error).message);
      } else {
        const action = editingProperty ? "update" : "create";
        showToast.error(`Failed to ${action} property: ` + (error as Error).message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoUpload = async (propertyId: number, file: File) => {
    try {
      // Validate file before upload
      if (!file || !(file instanceof File)) {
        throw new Error('Invalid file object provided');
      }
      
      if (file.size === 0) {
        throw new Error('File is empty');
      }
      
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size exceeds 5MB limit');
      }
      
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`File type ${file.type} not allowed. Allowed types: ${allowedTypes.join(', ')}`);
      }
      
      console.log("Starting logo upload:", {
        propertyId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        lastModified: file.lastModified
      });
      
      const formData = new FormData();
      formData.append('logo', file);
      formData.append('propertyId', propertyId.toString());
      
      console.log("FormData created, entries:", Array.from(formData.entries()).map(([key, value]) => [key, value instanceof File ? `File: ${value.name}` : value]));

      console.log("Making fetch request to /api/property/logo...");

      let response;
      try {
        response = await fetch('/api/property/logo', {
          method: 'POST',
          body: formData,
        });
        console.log("Fetch completed successfully");
      } catch (fetchError) {
        console.error("Fetch request failed:", {
          error: fetchError.message,
          stack: fetchError.stack,
          type: fetchError.constructor.name
        });
        throw new Error(`Network error: ${fetchError.message}`);
      }

      console.log("Received response object:", response);
      console.log("Response constructor:", response.constructor.name);
      console.log("Response type:", typeof response);
      
      // Try to extract all possible information from the response
      const responseInfo = {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        redirected: response.redirected,
        type: response.type,
        url: response.url,
        headers: {},
        headersIterable: response.headers ? 'yes' : 'no'
      };

      // Safely extract headers
      try {
        responseInfo.headers = Object.fromEntries(response.headers.entries());
      } catch (headerError) {
        console.error("Failed to read headers:", headerError);
        responseInfo.headers = { error: 'Failed to read headers' };
      }

      console.log("Logo upload response details:", responseInfo);

      if (!response.ok) {
        let errorData;
        let responseText = '';
        
        try {
          console.log("Attempting to read response.text()...");
          
          // Check if response has a body to read
          if (!response.body) {
            console.warn("Response has no body");
            responseText = '';
          } else {
            console.log("Response body exists, reading text...");
            responseText = await response.text();
          }
          
          console.log("Raw error response text:", {
            text: responseText,
            length: responseText.length,
            trimmed: responseText.trim(),
            type: typeof responseText
          });
          
          // Try to parse as JSON
          if (responseText.trim()) {
            console.log("Attempting to parse response as JSON...");
            errorData = JSON.parse(responseText);
            console.log("Parsed error data:", errorData);
          } else {
            console.log("Response text is empty, creating default error");
            errorData = { error: 'Empty response from server' };
          }
        } catch (jsonError) {
          console.error("Failed to parse logo error response JSON:", {
            error: jsonError.message,
            responseText: responseText,
            responseLength: responseText.length
          });
          throw new Error(`Server error (${response.status}): ${responseText || 'Empty response'}`);
        }
        
        console.error("Logo upload failed - Full analysis:", {
          responseInfo: responseInfo,
          errorData: errorData,
          responseText: responseText,
          errorDataType: typeof errorData,
          errorDataKeys: errorData ? Object.keys(errorData) : 'No keys'
        });
        
        const errorMessage = errorData?.error || errorData?.details || errorData?.message || 'Failed to upload logo';
        throw new Error(errorMessage);
      }

      let result;
      let responseText = '';
      
      try {
        responseText = await response.text();
        console.log("Raw success response text:", responseText);
        
        if (responseText.trim()) {
          result = JSON.parse(responseText);
        } else {
          throw new Error('Empty success response from server');
        }
      } catch (jsonError) {
        console.error("Failed to parse logo success response JSON:", jsonError);
        console.error("Raw logo success response:", responseText);
        throw new Error(`Server returned invalid JSON response: ${responseText || 'Empty response'}`);
      }

      console.log("Logo upload successful:", result.logoUrl);
      return result.logoUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      // Don't show toast here - let the caller handle the error display
      throw error;
    }
  };

  // Helper functions moved outside the component

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const totalProperties = properties.length;
  const totalPages = Math.max(1, Math.ceil(totalProperties / itemsPerPage));
  const currentItems = properties.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const startIndexDisplay = totalProperties > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndexDisplay = totalProperties > 0 ? Math.min(currentPage * itemsPerPage, totalProperties) : 0;

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    let startPage, endPage;

    if (totalPages <= maxPagesToShow) {
      startPage = 1;
      endPage = totalPages;
    } else {
      if (currentPage <= Math.ceil(maxPagesToShow / 2)) {
        startPage = 1;
        endPage = maxPagesToShow;
      } else if (currentPage + Math.floor(maxPagesToShow / 2) >= totalPages) {
        startPage = totalPages - maxPagesToShow + 1;
        endPage = totalPages;
      } else {
        startPage = currentPage - Math.floor(maxPagesToShow / 2);
        endPage = currentPage + Math.floor(maxPagesToShow / 2);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <Button
          key={i}
          variant={currentPage === i ? "default" : "outline"}
          size="icon"
          className="h-9 w-9"
          onClick={() => setCurrentPage(i)}
          disabled={isLoading}
        >
          {i}
        </Button>
      );
    }
    return pageNumbers;
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="flex justify-end mb-4">
          <Skeleton className="h-10 w-40 bg-muted" />
        </div>
        <div className="w-full border rounded-lg shadow-md bg-card">
          <div className="overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  {[...Array(7)].map((_, i) => (
                    <th key={i} className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      <Skeleton className="h-6 w-full bg-muted/50" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(itemsPerPage)].map((_, i) => (
                  <tr key={i} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="p-4 align-middle">
                        <Skeleton className="h-6 w-full bg-muted" />
                      </td>
                    ))}
                    <td className="p-4 align-middle">
                      <div className="flex justify-end gap-1">
                        <Skeleton className="h-8 w-8 bg-muted rounded-md" />
                        <Skeleton className="h-8 w-8 bg-muted rounded-md" />
                        <Skeleton className="h-8 w-8 bg-muted rounded-md" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col">
      <div className="flex justify-end mb-4">
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Property
        </Button>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border">
          <Building className="mx-auto h-12 w-12 mb-4 text-primary" />
          <p className="text-lg font-medium">No properties found.</p>
          <p>Click "Add New Property" to get started.</p>
        </div>
      ) : (
        <>
          <div className="w-full border rounded-lg shadow-md bg-card">
            <div className="overflow-x-auto">
              <Table className="min-w-[1000px]">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-headline">Logo</TableHead>
                    <TableHead className="font-headline">Property</TableHead>
                    <TableHead className="font-headline">Code</TableHead>
                    <TableHead className="font-headline">Type</TableHead>
                    <TableHead className="font-headline">Location</TableHead>
                    <TableHead className="font-headline">Owner</TableHead>
                    <TableHead className="font-headline">Outlets</TableHead>
                    <TableHead className="font-headline">Status</TableHead>
                    <TableHead className="font-headline">Created</TableHead>
                    <TableHead className="font-headline w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.map((property) => (
                    <TableRow key={property.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center justify-center">
                          {property.logoUrl ? (
                            <img
                              src={property.logoUrl}
                              alt={`${property.name} logo`}
                              className="w-8 h-8 object-cover rounded border"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-muted rounded border flex items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          {property.name}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{property.propertyCode}</TableCell>
                      <TableCell>
                        <Badge variant={getPropertyTypeBadgeVariant(property.propertyType)} className="flex items-center gap-1 w-fit">
                          {getPropertyTypeDisplayName(property.propertyType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {property.city || property.address ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {property.city ? `${property.city}${property.state ? `, ${property.state}` : ''}` : property.address}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {property.owner ? (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            {property.owner.name || property.owner.email}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No owner</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Store className="h-3 w-3 text-muted-foreground" />
                          {property._count?.outlets || 0} outlets
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={property.isActive ? "default" : "secondary"}>
                          {property.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {property.createdAt ? format(new Date(property.createdAt), "MMM d, yyyy") : "Unknown"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleView(property)}
                            className="h-8 w-8 hover:text-blue-600"
                            title="View Property Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(property)}
                            className="h-8 w-8 hover:text-primary"
                            title="Edit Property"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:text-destructive"
                                title="Delete Property"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center">
                                  <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
                                  Are you sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will delete the property "{property.name}". If the property has outlets or financial data, it will be marked as inactive instead of being permanently deleted. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(Number(property.id))}
                                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4 px-2">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndexDisplay} to {endIndexDisplay} of {totalProperties} results
              </div>
              <RecordsPerPageSelector
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
                disabled={isLoading}
              />
            </div>
            {totalPages > 1 && (
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1 || isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous Page</span>
                </Button>
                {renderPageNumbers()}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages || isLoading}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next Page</span>
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      <PropertyFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        property={editingProperty}
        users={users}
        currencies={currencies}
        currencyMap={currencyMap}
        onSubmit={(formData, logoFile) => handleSubmit(formData, logoFile)}
        isSubmitting={isSubmitting}
      />
      
      <PropertyViewDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        property={viewingProperty}
        users={users}
      />
    </div>
  );
}

interface PropertyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property | null;
  users: User[];
  currencies: Currency[];
  currencyMap: {[key: string]: number};
  onSubmit: (data: CreatePropertyData | UpdatePropertyData, logoFile?: File | null) => Promise<void>;
  isSubmitting: boolean;
}

function PropertyFormDialog({ open, onOpenChange, property, users, currencies, currencyMap, onSubmit, isSubmitting }: PropertyFormDialogProps) {
  const [formData, setFormData] = useState<CreatePropertyData>({
    name: "",
    propertyCode: "",
    propertyType: "restaurant",
    address: "",
    city: "",
    state: "",
    country: "",
    timeZone: "UTC",
    currencyId: currencyMap['USD'] || 1, // Default to USD
    logoUrl: "",
    ownerId: undefined,
    managerId: undefined,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (property) {
      setFormData({
        name: property.name,
        propertyCode: property.propertyCode,
        propertyType: property.propertyType,
        address: property.address || "",
        city: property.city || "",
        state: property.state || "",
        country: property.country || "",
        timeZone: property.timeZone || "UTC",
        currencyId: property.currencyId || 1, // Default to USD (ID 1)
        logoUrl: property.logoUrl || "",
        ownerId: property.ownerId || undefined,
        managerId: property.managerId || undefined,
      });
      setLogoPreview(property.logoUrl || null);
    } else {
      setFormData({
        name: "",
        propertyCode: "",
        propertyType: "restaurant",
        address: "",
        city: "",
        state: "",
        country: "",
        timeZone: "UTC",
        currencyId: currencyMap['USD'] || 1, // Default to USD
        logoUrl: "",
        ownerId: undefined,
        managerId: undefined,
      });
      setLogoPreview(null);
    }
    setLogoFile(null);
  }, [property]);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setFormData({ ...formData, logoUrl: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData, logoFile);
  };

  const propertyOwners = users.filter(user => 
    ['super_admin', 'property_owner', 'property_admin'].includes(user.role)
  );

  const propertyManagers = users.filter(user => 
    ['super_admin', 'property_owner', 'property_admin', 'regional_manager', 'property_manager'].includes(user.role)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl">
            {property ? "Edit Property" : "Add New Property"}
          </DialogTitle>
          <DialogDescription>
            {property 
              ? `Update property information for ${property.name}.`
              : "Create a new property. You can assign outlets to this property later."
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Property Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Downtown Hotel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="propertyCode">Property Code *</Label>
              <Input
                id="propertyCode"
                value={formData.propertyCode}
                onChange={(e) => setFormData({ ...formData, propertyCode: e.target.value.toUpperCase() })}
                required
                placeholder="e.g., DTH001"
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="propertyType">Property Type *</Label>
              <Select
                value={formData.propertyType}
                onValueChange={(value: PropertyType) => 
                  setFormData({ ...formData, propertyType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="cafe">Cafe</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="catering">Catering</SelectItem>
                  <SelectItem value="franchise">Franchise</SelectItem>
                  <SelectItem value="chain">Chain</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currencyId?.toString() || "1"}
                onValueChange={(value) => setFormData({ ...formData, currencyId: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {currencies.map((currency: any) => (
                    <SelectItem key={currency.code} value={currency.id?.toString() || currencyMap[currency.code]?.toString() || "1"}>
                      {currency.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Logo Upload Section */}
          <div className="space-y-2">
            <Label>Property Logo</Label>
            <div className="flex items-start gap-4">
              {/* Logo Preview */}
              <div className="flex-shrink-0">
                {logoPreview ? (
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Property logo preview"
                      className="w-20 h-20 object-cover rounded-lg border-2 border-muted"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={handleRemoveLogo}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-20 h-20 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center bg-muted/20">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              
              {/* Upload Controls */}
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="relative"
                    disabled={isSubmitting}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {logoPreview ? 'Change Logo' : 'Upload Logo'}
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleLogoFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isSubmitting}
                    />
                  </Button>
                  {logoPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLogo}
                      disabled={isSubmitting}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Accepted formats: JPEG, PNG, WebP. Max size: 5MB.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street address"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State/Province</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="Country"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ownerId">Property Owner</Label>
              <Select
                value={formData.ownerId?.toString() || "none"}
                onValueChange={(value) => setFormData({ 
                  ...formData, 
                  ownerId: value && value !== "none" ? parseInt(value) : undefined 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No owner</SelectItem>
                  {propertyOwners.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="managerId">Property Manager</Label>
              <Select
                value={formData.managerId?.toString() || "none"}
                onValueChange={(value) => setFormData({ 
                  ...formData, 
                  managerId: value && value !== "none" ? parseInt(value) : undefined 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No manager</SelectItem>
                  {propertyManagers.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : property ? "Update Property" : "Create Property"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface PropertyViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property | null;
  users: User[];
}

function PropertyViewDialog({ open, onOpenChange, property, users }: PropertyViewDialogProps) {
  if (!property) return null;

  const owner = property.ownerId ? users.find(u => u.id === property.ownerId) : null;
  const manager = property.managerId ? users.find(u => u.id === property.managerId) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Property Details
          </DialogTitle>
          <DialogDescription>
            View complete information for {property.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header Section with Logo */}
          <div className="flex items-start gap-4 p-4 bg-muted/20 rounded-lg">
            <div className="flex-shrink-0">
              {property.logoUrl ? (
                <img
                  src={property.logoUrl}
                  alt={`${property.name} logo`}
                  className="w-16 h-16 object-cover rounded-lg border-2 border-muted"
                />
              ) : (
                <div className="w-16 h-16 bg-muted rounded-lg border-2 border-muted flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">{property.name}</h3>
              <div className="flex flex-wrap items-center gap-4">
                <Badge variant={getPropertyTypeBadgeVariant(property.propertyType)} className="flex items-center gap-1">
                  {getPropertyTypeDisplayName(property.propertyType)}
                </Badge>
                <Badge variant={property.isActive ? "default" : "secondary"}>
                  {property.isActive ? "Active" : "Inactive"}
                </Badge>
                <span className="text-sm text-muted-foreground font-mono">
                  {property.propertyCode}
                </span>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <Building className="h-4 w-4" />
                Basic Information
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Property Name:</span>
                  <span className="font-medium">{property.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Property Code:</span>
                  <span className="font-mono">{property.propertyCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">{getPropertyTypeDisplayName(property.propertyType)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Currency:</span>
                  <span className="font-medium">{property.currency?.displayName || 'USD ($)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time Zone:</span>
                  <span className="font-medium">{property.timeZone || 'UTC'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={property.isActive ? "default" : "secondary"}>
                    {property.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium">
                    {property.createdAt ? format(new Date(property.createdAt), "MMM d, yyyy 'at' h:mm a") : "Unknown"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location & Management
              </h4>
              <div className="space-y-3">
                {property.address && (
                  <div>
                    <span className="text-muted-foreground block mb-1">Address:</span>
                    <span className="font-medium">{property.address}</span>
                  </div>
                )}
                {(property.city || property.state) && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">City/State:</span>
                    <span className="font-medium">
                      {property.city ? `${property.city}${property.state ? `, ${property.state}` : ''}` : property.state}
                    </span>
                  </div>
                )}
                {property.country && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Country:</span>
                    <span className="font-medium">{property.country}</span>
                  </div>
                )}
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Owner:</span>
                    <span className="font-medium">
                      {owner ? (owner.name || owner.email) : 'No owner assigned'}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Manager:</span>
                  <span className="font-medium">
                    {manager ? (manager.name || manager.email) : 'No manager assigned'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Outlets Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <Store className="h-4 w-4" />
              Outlets
            </h4>
            <div className="p-4 bg-muted/20 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Outlets:</span>
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-lg">{property._count?.outlets || 0}</span>
                </div>
              </div>
              {(property._count?.outlets || 0) > 0 ? (
                <p className="text-sm text-muted-foreground mt-2">
                  This property has {property._count?.outlets} outlet{(property._count?.outlets || 0) !== 1 ? 's' : ''} assigned to it.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">
                  No outlets are currently assigned to this property.
                </p>
              )}
            </div>
          </div>

          {/* Additional Details */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <Shield className="h-4 w-4" />
              System Information
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Property ID:</span>
                <span className="font-mono">{property.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="font-medium">
                  {property.updatedAt instanceof Date ? format(property.updatedAt, "MMM d, yyyy") : "Unknown"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}