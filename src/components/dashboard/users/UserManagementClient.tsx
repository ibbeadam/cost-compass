"use client";

import { useState, useEffect, useCallback } from "react";
import { PlusCircle, Edit, Trash2, AlertTriangle, User as UserIcon, Shield, Eye, EyeOff, Mail, Phone, Building } from "lucide-react";
import { format } from "date-fns";

import type { User, CreateUserData, UpdateUserData } from "@/types";
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
import { useToast } from "@/hooks/use-toast";
import { 
  getAllUsersAction, 
  createUserAction, 
  updateUserAction, 
  deleteUserAction, 
  toggleUserActiveStatusAction 
} from "@/actions/userActions";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function UserManagementClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedUsers = await getAllUsersAction();
      setUsers(fetchedUsers);
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Error Fetching Users", 
        description: (error as Error).message || "Could not load users." 
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

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

  const handleDelete = async (userId: string) => {
    try {
      await deleteUserAction(userId);
      fetchUsers();
      toast({ title: "User Deleted", description: "The user has been deleted successfully." });
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Error Deleting User", 
        description: (error as Error).message || "Could not delete user." 
      });
    }
  };

  const handleToggleActive = async (userId: string) => {
    try {
      await toggleUserActiveStatusAction(userId);
      fetchUsers();
      toast({ title: "Status Updated", description: "User status has been updated." });
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Error Updating Status", 
        description: (error as Error).message || "Could not update user status." 
      });
    }
  };

  const handleSubmit = async (formData: CreateUserData | UpdateUserData) => {
    setIsSubmitting(true);
    try {
      if (editingUser) {
        await updateUserAction(editingUser.id, formData as UpdateUserData);
        toast({ title: "User Updated", description: "User has been updated successfully." });
      } else {
        await createUserAction(formData as CreateUserData);
        toast({ title: "User Created", description: "User has been created successfully. A password reset email has been sent." });
      }
      setIsFormOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: editingUser ? "Error Updating User" : "Error Creating User", 
        description: (error as Error).message || "Could not save user." 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      case 'user': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4" />;
      case 'manager': return <UserIcon className="h-4 w-4" />;
      case 'user': return <UserIcon className="h-4 w-4" />;
      default: return <UserIcon className="h-4 w-4" />;
    }
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
                {[...Array(5)].map((_, i) => (
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
        <div className="w-full border rounded-lg shadow-md bg-card">
          <div className="overflow-x-auto">
            <Table className="min-w-[1000px]">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-headline">Name</TableHead>
                  <TableHead className="font-headline">Email</TableHead>
                  <TableHead className="font-headline">Role</TableHead>
                  <TableHead className="font-headline">Department</TableHead>
                  <TableHead className="font-headline">Status</TableHead>
                  <TableHead className="font-headline">Created</TableHead>
                  <TableHead className="font-headline w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {user.displayName || "No Name"}
                        {user.phoneNumber && (
                          <Phone className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center gap-1 w-fit">
                        {getRoleIcon(user.role)}
                        {user.role}
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
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.createdAt instanceof Date ? format(user.createdAt, "MMM d, yyyy") : "Unknown"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(user.id)}
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
                                onClick={() => handleDelete(user.id)}
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
      )}

      <UserFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        user={editingUser}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
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
    displayName: "",
    role: "user",
    department: "",
    phoneNumber: "",
    permissions: [],
  });

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        displayName: user.displayName || "",
        role: user.role,
        department: user.department || "",
        phoneNumber: user.phoneNumber || "",
        permissions: user.permissions || [],
      });
    } else {
      setFormData({
        email: "",
        displayName: "",
        role: "user",
        department: "",
        phoneNumber: "",
        permissions: [],
      });
    }
  }, [user]);

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
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'admin' | 'manager' | 'user') => 
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
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