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
  Store
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
import { 
  getPropertiesAction, 
  createPropertyAction, 
  updatePropertyAction, 
  deletePropertyAction 
} from "@/actions/propertyActions";
import { getAllUsersAction } from "@/actions/prismaUserActions";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { RecordsPerPageSelector } from "@/components/ui/records-per-page-selector";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function PropertyManagementClient() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchProperties = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedProperties, fetchedUsers] = await Promise.all([
        getPropertiesAction(),
        getAllUsersAction()
      ]);
      
      setProperties(fetchedProperties);
      setUsers(fetchedUsers);
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

  const handleDelete = async (propertyId: number) => {
    try {
      await deletePropertyAction(propertyId);
      fetchProperties();
      showToast.success("The property has been deleted successfully.");
    } catch (error) {
      showToast.error((error as Error).message || "Could not delete property.");
    }
  };

  const handleSubmit = async (formData: CreatePropertyData | UpdatePropertyData) => {
    setIsSubmitting(true);
    try {
      if (editingProperty) {
        await updatePropertyAction(editingProperty.id, formData as UpdatePropertyData);
        showToast.success("Property has been updated successfully.");
      } else {
        await createPropertyAction(formData as CreatePropertyData);
        showToast.success("Property has been created successfully.");
      }
      setIsFormOpen(false);
      setEditingProperty(null);
      fetchProperties();
    } catch (error) {
      showToast.error((error as Error).message || "Could not save property.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
                        {property.createdAt instanceof Date ? format(property.createdAt, "MMM d, yyyy") : "Unknown"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
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
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

interface PropertyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property | null;
  users: User[];
  onSubmit: (data: CreatePropertyData | UpdatePropertyData) => Promise<void>;
  isSubmitting: boolean;
}

function PropertyFormDialog({ open, onOpenChange, property, users, onSubmit, isSubmitting }: PropertyFormDialogProps) {
  const [formData, setFormData] = useState<CreatePropertyData>({
    name: "",
    propertyCode: "",
    propertyType: "restaurant",
    address: "",
    city: "",
    state: "",
    country: "",
    timeZone: "UTC",
    currency: "USD",
    ownerId: undefined,
    managerId: undefined,
  });

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
        currency: property.currency || "USD",
        ownerId: property.ownerId || undefined,
        managerId: property.managerId || undefined,
      });
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
        currency: "USD",
        ownerId: undefined,
        managerId: undefined,
      });
    }
  }, [property]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
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
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="JPY">JPY (¥)</SelectItem>
                  <SelectItem value="AUD">AUD (A$)</SelectItem>
                  <SelectItem value="CAD">CAD (C$)</SelectItem>
                </SelectContent>
              </Select>
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