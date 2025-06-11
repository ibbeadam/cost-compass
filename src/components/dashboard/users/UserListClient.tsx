
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
import { AlertTriangle, ShieldAlert, Edit, Trash2, UserX, UserCheck } from "lucide-react";
import type { ManagedUser } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const ITEMS_PER_PAGE = 10;

// Mock data - in a real app, this would come from a backend API call
const mockUsers: ManagedUser[] = [
  { uid: "user1", email: "testuser1@example.com", displayName: "Test User One", role: "user", disabled: false, creationTime: "2023-01-15", lastSignInTime: "2024-05-20" },
  { uid: "adminUser", email: "admin@example.com", displayName: "Admin User", role: "admin", disabled: false, creationTime: "2023-01-10", lastSignInTime: "2024-05-21" },
  { uid: "user2", email: "another.user@example.com", displayName: "Another User", role: "user", disabled: true, creationTime: "2023-02-20", lastSignInTime: "2024-04-10" },
  { uid: "user3", email: "jane.doe@example.com", displayName: "Jane Doe", role: "user", disabled: false, creationTime: "2023-03-01", lastSignInTime: "2024-05-19" },
];


export default function UserListClient() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading) {
      if (isAdmin) {
        // Simulate fetching users
        setTimeout(() => {
          setUsers(mockUsers);
          setIsLoading(false);
        }, 1000);
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
    toast({ title: "Action Required", description: "Editing user roles requires backend implementation with Firebase Functions." });
  };

  const handleToggleDisableUser = (userId: string, isDisabled: boolean | undefined) => {
     toast({ title: "Action Required", description: `User ${isDisabled ? "enable" : "disable"} action requires backend implementation.` });
  };

  const handleDeleteUser = (userId: string) => {
    toast({ title: "Action Required", description: "Deleting users requires backend implementation with Firebase Functions." });
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
        <AlertTitle className="text-accent-foreground">Developer Note</AlertTitle>
        <AlertDescription className="text-accent-foreground/80">
          This user management interface is a placeholder. Listing all Firebase users and performing administrative actions
          (like changing roles, disabling, or deleting users) requires backend logic using the Firebase Admin SDK
          (e.g., via Firebase Cloud Functions) for security and proper functionality. The data shown here is mock data.
        </AlertDescription>
      </Alert>

      {currentUsers.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border">
          <Users className="mx-auto h-12 w-12 mb-4 text-primary" />
          <p className="text-lg font-medium">No users to display.</p>
          <p>(Mock data is empty or filtered out)</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden shadow-md bg-card">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-headline">Display Name</TableHead>
                <TableHead className="font-headline">Email</TableHead>
                <TableHead className="font-headline">Role</TableHead>
                <TableHead className="font-headline">Status</TableHead>
                <TableHead className="font-headline text-right w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentUsers.map((managedUser) => (
                <TableRow key={managedUser.uid}>
                  <TableCell>{managedUser.displayName || "-"}</TableCell>
                  <TableCell className="font-code">{managedUser.email}</TableCell>
                  <TableCell>
                    <Badge variant={managedUser.role === 'admin' ? "destructive" : "secondary"} className="capitalize">
                      {managedUser.role || "user"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={managedUser.disabled ? "outline" : "default"} className={managedUser.disabled ? "border-destructive text-destructive" : "bg-green-600 hover:bg-green-700"}>
                      {managedUser.disabled ? <UserX className="h-3.5 w-3.5 mr-1.5" /> : <UserCheck className="h-3.5 w-3.5 mr-1.5" />}
                      {managedUser.disabled ? "Disabled" : "Enabled"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEditUser(managedUser.uid)} className="mr-1 hover:text-primary" title="Edit Role (Placeholder)">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleToggleDisableUser(managedUser.uid, managedUser.disabled)} className="mr-1 hover:text-orange-500" title={managedUser.disabled ? "Enable User (Placeholder)" : "Disable User (Placeholder)"}>
                      {managedUser.disabled ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(managedUser.uid)} className="hover:text-destructive" title="Delete User (Placeholder)">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {/* Pagination would go here if implemented for real data */}
    </div>
  );
}
