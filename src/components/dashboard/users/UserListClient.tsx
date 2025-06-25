"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
import { AlertTriangle, ShieldAlert, Edit, Trash2, UserX, UserCheck, Users } from "lucide-react";
import type { ManagedUser } from "@/types";
import { showToast } from "@/lib/toast";
import { Skeleton } from "@/components/ui/skeleton";

const ITEMS_PER_PAGE = 10;

export default function UserListClient() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!authLoading) {
      if (isAdmin) {
        // TODO: Implement real user fetching from Firebase Admin SDK
        // For now, show empty state
        setUsers([]);
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [isAdmin, authLoading]);

  const totalUsers = users.length;
  const totalPages = Math.max(1, Math.ceil(totalUsers / ITEMS_PER_PAGE));
  const currentUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return users.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [users, currentPage]);

  const handleEditUser = (userId: string) => {
    showToast.info("Editing user roles requires backend implementation with Firebase Functions.");
  };

  const handleToggleDisableUser = (userId: string, isDisabled: boolean | undefined) => {
     showToast.info(`User ${isDisabled ? "enable" : "disable"} action requires backend implementation.`);
  };

  const handleDeleteUser = (userId: string) => {
    showToast.info("Deleting users requires backend implementation with Firebase Functions.");
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

  return (
    <div className="w-full">
      <Alert className="mb-6 bg-accent/50 border-accent">
        <AlertTriangle className="h-5 w-5 text-accent-foreground" />
        <AlertTitle className="text-accent-foreground">User Management</AlertTitle>
        <AlertDescription className="text-accent-foreground/80">
          User management functionality requires backend implementation using Firebase Admin SDK. 
          This interface is ready for integration with Firebase Cloud Functions for secure user operations.
        </AlertDescription>
      </Alert>

      <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border">
        <Users className="mx-auto h-12 w-12 mb-4 text-primary" />
        <p className="text-lg font-medium">User Management</p>
        <p className="text-sm">Connect to Firebase Admin SDK to view and manage users.</p>
        <div className="mt-4 space-y-2 text-xs text-muted-foreground">
          <p>• List all Firebase users</p>
          <p>• Manage user roles and permissions</p>
          <p>• Enable/disable user accounts</p>
          <p>• Delete user accounts</p>
        </div>
      </div>
    </div>
  );
}
