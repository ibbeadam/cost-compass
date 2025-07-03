"use client";

import { useState, useEffect, useCallback } from "react";
import { PlusCircle, Edit, Trash2, AlertTriangle, User as UserIcon, Shield, Eye, EyeOff, Mail, Phone, Building, MapPin, Plus, X, ChevronLeft, ChevronRight, Key, Lock, LockOpen, Timer } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

import type { User, CreateUserData, UpdateUserData, Property, PropertyAccessLevel } from "@/types";
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
  getAllUsersAction, 
  createUserAction, 
  updateUserAction, 
  deleteUserAction 
} from "@/actions/prismaUserActions";
import { PasswordResetDialog } from "./PasswordResetDialog";
import { getPropertiesAction } from "@/actions/propertyActions";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { RecordsPerPageSelector } from "@/components/ui/records-per-page-selector";

export default function UserManagementClient() {
  const { userProfile, loading } = useAuth();
  
  // ALL HOOKS MUST BE CALLED EVERY TIME - no early returns before hooks
  const [users, setUsers] = useState<User[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedUserForReset, setSelectedUserForReset] = useState<User | null>(null);
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    // Only fetch if user is super admin and not loading
    if (loading || !userProfile || userProfile.role !== "super_admin") {
      return;
    }
    
    setIsLoading(true);
    try {
      const [fetchedUsers, fetchedProperties] = await Promise.all([
        getAllUsersAction(),
        getPropertiesAction()
      ]);
      
      // Fix: Ensure role is cast to the correct type and transform permissions
      setUsers(
        fetchedUsers.map((user) => ({
          ...user,
          role: user.role as User["role"],
          permissions: user.userPermissions?.map(up => up.permission.name) || [],
        }))
      );
      setProperties(fetchedProperties);
    } catch (error) {
      showToast.error((error as Error).message || "Could not load users.");
    } finally {
      setIsLoading(false);
    }
  }, [loading, userProfile]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAddNew = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleResetPassword = (user: User) => {
    setSelectedUserForReset(user);
    setIsPasswordResetOpen(true);
  };

  const handlePasswordResetComplete = () => {
    // Refresh the user list to get updated data
    fetchUsers();
  };

  const isUserLocked = (user: User): boolean => {
    // Check if user is locked until a future date
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return true;
    }
    // Check if user has too many login attempts
    if (user.loginAttempts && user.loginAttempts >= 5) {
      return true;
    }
    return false;
  };

  const getUserLockReason = (user: User): string | null => {
    if (!isUserLocked(user)) return null;
    
    const now = new Date();
    const isLockedByTime = user.lockedUntil && new Date(user.lockedUntil) > now;
    
    if (isLockedByTime && user.loginAttempts && user.loginAttempts >= 999) {
      return "Manually locked by administrator";
    } else if (isLockedByTime) {
      return "Locked due to failed login attempts";
    } else if (user.loginAttempts && user.loginAttempts >= 5) {
      return "Too many failed login attempts";
    }
    return "Account locked";
  };

  const handleUnlockUser = async (user: User) => {
    try {
      const response = await fetch(`/api/users/${user.id}/lock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locked: false,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast.success(`User ${user.name || user.email} has been unlocked successfully`);
        fetchUsers(); // Refresh the user list
      } else {
        showToast.error(data.error || "Failed to unlock user");
      }
    } catch (error) {
      console.error("Error unlocking user:", error);
      showToast.error("Failed to unlock user");
    }
  };

  const handleDelete = async (userId: number) => {
    try {
      await deleteUserAction(userId);
      fetchUsers();
      showToast.success("The user has been deleted successfully.");
    } catch (error) {
      showToast.error((error as Error).message || "Could not delete user.");
    }
  };

  const handleToggleActive = async (userId: number) => {
    try {
      const user = users.find(u => u.id === userId);
      if (user) {
        await updateUserAction(userId, { isActive: !user.isActive });
        fetchUsers();
        showToast.success("User status has been updated.");
      }
    } catch (error) {
      showToast.error((error as Error).message || "Could not update user status.");
    }
  };

  const handleSubmit = async (formData: CreateUserData | UpdateUserData) => {
    setIsSubmitting(true);
    try {
      if (editingUser) {
        await updateUserAction(editingUser.id, formData as UpdateUserData);
        showToast.success("User has been updated successfully.");
      } else {
        await createUserAction(formData as CreateUserData);
        showToast.success("User has been created successfully. A password reset email has been sent.");
      }
      setIsFormOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      showToast.error((error as Error).message || "Could not save user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'destructive';
      case 'property_owner': return 'destructive';
      case 'property_admin': return 'default';
      case 'regional_manager': return 'default';
      case 'property_manager': return 'secondary';
      case 'supervisor': return 'secondary';
      case 'user': return 'outline';
      case 'readonly': return 'outline';
      // Legacy support
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      default: return 'outline';
    }
  };
  
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'property_owner': return 'Property Owner';
      case 'property_admin': return 'Property Admin';
      case 'regional_manager': return 'Regional Manager';
      case 'property_manager': return 'Property Manager';
      case 'supervisor': return 'Supervisor';
      case 'user': return 'User';
      case 'readonly': return 'Read Only';
      // Legacy support
      case 'admin': return 'Admin';
      case 'manager': return 'Manager';
      default: return role;
    }
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const totalUsers = users.length;
  const totalPages = Math.max(1, Math.ceil(totalUsers / itemsPerPage));
  const currentItems = users.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const startIndexDisplay = totalUsers > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndexDisplay = totalUsers > 0 ? Math.min(currentPage * itemsPerPage, totalUsers) : 0;

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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return <Shield className="h-4 w-4" />;
      case 'property_owner': return <Shield className="h-4 w-4" />;
      case 'property_admin': return <Shield className="h-4 w-4" />;
      case 'regional_manager': return <Building className="h-4 w-4" />;
      case 'property_manager': return <Building className="h-4 w-4" />;
      case 'supervisor': return <UserIcon className="h-4 w-4" />;
      case 'user': return <UserIcon className="h-4 w-4" />;
      case 'readonly': return <Eye className="h-4 w-4" />;
      // Legacy support
      case 'admin': return <Shield className="h-4 w-4" />;
      case 'manager': return <UserIcon className="h-4 w-4" />;
      default: return <UserIcon className="h-4 w-4" />;
    }
  };

  // Show loading state while user data is being fetched
  if (loading || !userProfile) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Skeleton className="h-12 w-12 mx-auto mb-4 rounded-full" />
          <Skeleton className="h-5 w-32 mx-auto mb-2" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </div>
    );
  }

  // Check if user is super admin AFTER loading is complete
  if (userProfile.role !== "super_admin") {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Access Restricted</h3>
          <p className="text-sm text-muted-foreground">
            You don't have permission to access user management. Only super administrators can manage users.
          </p>
        </div>
      </div>
    );
  }

  // Show component loading state
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
          Add New User
        </Button>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border">
          <UserIcon className="mx-auto h-12 w-12 mb-4 text-primary" />
          <p className="text-lg font-medium">No users found.</p>
          <p>Click "Add New User" to get started.</p>
        </div>
      ) : (
        <>
          <div className="w-full border rounded-lg shadow-md bg-card">
            <div className="overflow-x-auto">
              <Table className="min-w-[1000px]">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-headline">Name</TableHead>
                    <TableHead className="font-headline">Email</TableHead>
                    <TableHead className="font-headline">Role</TableHead>
                    <TableHead className="font-headline">Department</TableHead>
                    <TableHead className="font-headline">Properties</TableHead>
                    <TableHead className="font-headline">Status</TableHead>
                    <TableHead className="font-headline">Created</TableHead>
                    <TableHead className="font-headline w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {user.name || "No Name"}
                          {user.phoneNumber && (
                            <Phone className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center gap-1 w-fit">
                          {getRoleIcon(user.role)}
                          {getRoleDisplayName(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.department ? (
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3 text-muted-foreground" />
                            {user.department}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.propertyAccess && user.propertyAccess.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.propertyAccess.slice(0, 2).map((access, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                <Building className="h-3 w-3 mr-1" />
                                {properties.find(p => p.id === access.propertyId)?.propertyCode || access.propertyId}
                              </Badge>
                            ))}
                            {user.propertyAccess.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{user.propertyAccess.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No access</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={user.isActive ? "default" : "secondary"}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                          {isUserLocked(user) && (
                            <div className="flex items-center gap-1">
                              <Badge variant="destructive" className="text-xs flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                Locked
                              </Badge>
                              {user.lockedUntil && new Date(user.lockedUntil) > new Date() && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Timer className="h-3 w-3" />
                                  Until {format(new Date(user.lockedUntil), "MMM d, HH:mm")}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.createdAt instanceof Date ? format(user.createdAt, "MMM d, yyyy") : "Unknown"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(Number(user.id))}
                            className="h-8 w-8"
                            title={user.isActive ? "Deactivate User" : "Activate User"}
                          >
                            {user.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(user)}
                            className="h-8 w-8 hover:text-primary"
                            title="Edit User"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleResetPassword(user)}
                            className="h-8 w-8 hover:text-blue-600"
                            title="Reset User Password"
                          >
                            <Key className="h-5 w-5 text-blue-600" />
                          </Button>
                          {isUserLocked(user) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleUnlockUser(user)}
                              className="h-8 w-8 hover:text-green-600"
                              title={`Unlock User - ${getUserLockReason(user)}`}
                            >
                              <LockOpen className="h-5 w-5 text-amber-600" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:text-destructive"
                                title="Delete User"
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
                                  This will permanently delete the user account for {user.email}. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(Number(user.id))}
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
                Showing {startIndexDisplay} to {endIndexDisplay} of {totalUsers} results
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

      <UserFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        user={editingUser}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
      
      {/* Password Reset Dialog */}
      <PasswordResetDialog
        user={selectedUserForReset}
        open={isPasswordResetOpen}
        onOpenChange={setIsPasswordResetOpen}
        onPasswordReset={handlePasswordResetComplete}
      />
    </div>
  );
}

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSubmit: (data: CreateUserData | UpdateUserData) => Promise<void>;
  isSubmitting: boolean;
}

function UserFormDialog({ open, onOpenChange, user, onSubmit, isSubmitting }: UserFormDialogProps) {
  const [formData, setFormData] = useState<CreateUserData>({
    email: "",
    name: "",
    password: "",
    role: "user",
    department: "",
    phoneNumber: "",
    permissions: [],
    propertyAccess: [],
  });
  const [properties, setProperties] = useState<Property[]>([]);
  
  // Fetch properties when dialog opens
  useEffect(() => {
    if (open) {
      getPropertiesAction().then(setProperties).catch(console.error);
    }
  }, [open]);

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        name: user.name || "",
        password: "", // Don't pre-fill password for security
        role: user.role,
        department: user.department || "",
        phoneNumber: user.phoneNumber || "",
        permissions: user.permissions || [],
        propertyAccess: user.propertyAccess?.map(pa => ({
          propertyId: pa.propertyId,
          accessLevel: pa.accessLevel
        })) || [],
      });
    } else {
      setFormData({
        email: "",
        name: "",
        password: "",
        role: "user",
        department: "",
        phoneNumber: "",
        permissions: [],
        propertyAccess: [],
      });
    }
  }, [user]);
  
  const addPropertyAccess = () => {
    if (properties.length > 0) {
      setFormData({
        ...formData,
        propertyAccess: [
          ...(formData.propertyAccess || []),
          {
            propertyId: properties[0].id,
            accessLevel: "read_only" as PropertyAccessLevel
          }
        ]
      });
    }
  };
  
  const removePropertyAccess = (index: number) => {
    const newPropertyAccess = [...(formData.propertyAccess || [])];
    newPropertyAccess.splice(index, 1);
    setFormData({ ...formData, propertyAccess: newPropertyAccess });
  };
  
  const updatePropertyAccess = (index: number, field: 'propertyId' | 'accessLevel', value: number | PropertyAccessLevel) => {
    const newPropertyAccess = [...(formData.propertyAccess || [])];
    newPropertyAccess[index] = {
      ...newPropertyAccess[index],
      [field]: value
    };
    setFormData({ ...formData, propertyAccess: newPropertyAccess });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl">
            {user ? "Edit User" : "Add New User"}
          </DialogTitle>
          <DialogDescription>
            {user 
              ? `Update user information for ${user.email}.`
              : "Create a new user account. A password reset email will be sent to set their password."
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!!user} // Can't change email for existing users
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">
              Password {user ? "(leave blank to keep current)" : "*"}
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!user}
              placeholder={user ? "Leave blank to keep current password" : "Enter password"}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'super_admin' | 'property_owner' | 'property_admin' | 'regional_manager' | 'property_manager' | 'supervisor' | 'user' | 'readonly') => 
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="readonly">Read Only</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="property_manager">Property Manager</SelectItem>
                  <SelectItem value="regional_manager">Regional Manager</SelectItem>
                  <SelectItem value="property_admin">Property Admin</SelectItem>
                  <SelectItem value="property_owner">Property Owner</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            />
          </div>

          {/* Property Access Management */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Property Access</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPropertyAccess}
                disabled={properties.length === 0}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Property
              </Button>
            </div>
            
            {formData.propertyAccess && formData.propertyAccess.length > 0 ? (
              <div className="space-y-2">
                {formData.propertyAccess.map((access, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
                    <div className="flex-1">
                      <Select
                        value={access.propertyId.toString()}
                        onValueChange={(value) => updatePropertyAccess(index, 'propertyId', parseInt(value))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {properties.map((property) => (
                            <SelectItem key={property.id} value={property.id.toString()}>
                              <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-muted-foreground" />
                                {property.name} ({property.propertyCode})
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Select
                        value={access.accessLevel}
                        onValueChange={(value: PropertyAccessLevel) => updatePropertyAccess(index, 'accessLevel', value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="read_only">Read Only</SelectItem>
                          <SelectItem value="data_entry">Data Entry</SelectItem>
                          <SelectItem value="management">Management</SelectItem>
                          <SelectItem value="full_control">Full Control</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePropertyAccess(index)}
                      className="text-destructive hover:text-destructive/90"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground border-2 border-dashed rounded-md">
                <Building className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm">No property access configured</p>
                <p className="text-xs">Click "Add Property" to assign property access</p>
              </div>
            )}
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
              {isSubmitting ? "Saving..." : user ? "Update User" : "Create User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 