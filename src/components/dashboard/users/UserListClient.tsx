"use client";

import { useState, useEffect, useMemo } from "react";
import { useNextAuth } from "@/hooks/useNextAuth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ShieldAlert, Edit, Trash2, UserX, UserCheck, Users, Key } from "lucide-react";
import type { User } from "@/types";
import { getAllUsersAction, updateUserAction, deleteUserAction } from "@/actions/prismaUserActions";
import { PasswordResetDialog } from "./PasswordResetDialog";
import { showToast } from "@/lib/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { RecordsPerPageSelector } from "@/components/ui/records-per-page-selector";

export default function UserListClient() {
  const { user, isAdmin, loading: authLoading } = useNextAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedUserForReset, setSelectedUserForReset] = useState<User | null>(null);
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!authLoading && isAdmin) {
        try {
          setIsLoading(true);
          const fetchedUsers = await getAllUsersAction();
          setUsers(fetchedUsers);
        } catch (error) {
          showToast.error("Failed to load users");
        } finally {
          setIsLoading(false);
        }
      } else if (!authLoading) {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [isAdmin, authLoading]);

  const totalUsers = users.length;
  const totalPages = Math.max(1, Math.ceil(totalUsers / itemsPerPage));
  const currentUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return users.slice(startIndex, startIndex + itemsPerPage);
  }, [users, currentPage, itemsPerPage]);

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const startIndexDisplay = totalUsers > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndexDisplay = totalUsers > 0 ? Math.min(currentPage * itemsPerPage, totalUsers) : 0;

  const handleEditUser = (userId: string) => {
    showToast.info("User editing dialog will be implemented.");
  };

  const handleResetPassword = (user: User) => {
    setSelectedUserForReset(user);
    setIsPasswordResetOpen(true);
  };

  const handlePasswordResetComplete = () => {
    // Refresh the user list to get updated data
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const fetchedUsers = await getAllUsersAction();
        setUsers(fetchedUsers);
      } catch (error) {
        showToast.error("Failed to refresh users");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  };

  const handleToggleDisableUser = async (userId: string, isActive: boolean) => {
    try {
      await updateUserAction(userId, { isActive });
      setUsers(users.map(u => u.id === userId ? { ...u, isActive } : u));
      showToast.success(`User ${isActive ? "activated" : "deactivated"} successfully`);
    } catch (error) {
      showToast.error(`Failed to ${isActive ? "activate" : "deactivate"} user`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUserAction(userId);
        setUsers(users.filter(u => u.id !== userId));
        showToast.success("User deleted successfully");
      } catch (error) {
        showToast.error("Failed to delete user");
      }
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/4 bg-muted mb-4" />
        <div className="rounded-lg border overflow-hidden shadow-md bg-card">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                {[...Array(5)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-full bg-muted" /></TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(4)].map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full bg-muted" /></TableCell>)}
                  <TableCell className="text-right"><div className="flex justify-end space-x-2"><Skeleton className="h-8 w-8 bg-muted" /><Skeleton className="h-8 w-8 bg-muted" /></div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Alert variant="destructive" className="max-w-lg mx-auto">
        <ShieldAlert className="h-5 w-5" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You do not have permission to view or manage users. Please contact an administrator if you believe this is an error.
        </AlertDescription>
      </Alert>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border">
        <Users className="mx-auto h-12 w-12 mb-4 text-primary" />
        <p className="text-lg font-medium">No users found</p>
        <p className="text-sm">No users have been created yet.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="rounded-lg border overflow-hidden shadow-md bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.name || "No Name"}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === "admin" ? "destructive" : "default"}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "default" : "secondary"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditUser(user.id)}
                      className="h-8 w-8"
                      title="Edit User"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleResetPassword(user)}
                      className="h-8 w-8"
                      title="Reset User Password"
                    >
                      <Key className="h-5 w-5 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleDisableUser(user.id, !user.isActive)}
                      className="h-8 w-8"
                      title={user.isActive ? "Deactivate User" : "Activate User"}
                    >
                      {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteUser(user.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      title="Delete User"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
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
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || isLoading}
            >
              Previous
            </Button>
            <span className="flex items-center px-4 text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || isLoading}
            >
              Next
            </Button>
          </div>
        )}
      </div>

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
