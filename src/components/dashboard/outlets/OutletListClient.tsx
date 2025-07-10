"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  PlusCircle,
  Edit,
  Trash2,
  AlertTriangle,
  Building,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Outlet } from "@/types";
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
import { OutletForm } from "./OutletForm";
import { showToast } from "@/lib/toast";
import { getAllOutletsAction, getOutletsByPropertyAccessAction, deleteOutletAction } from "@/actions/prismaOutletActions";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPropertyAccess } from "@/hooks/useUserPropertyAccess";
import { RecordsPerPageSelector } from "@/components/ui/records-per-page-selector";
import { PermissionGate } from "@/components/auth/PermissionGate";

export default function OutletListClient() {
  const [allOutlets, setAllOutlets] = useState<Outlet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { userProfile } = useAuth();
  const { isSuperAdmin } = useUserPropertyAccess();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOutlets, setTotalOutlets] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const fetchOutlets = useCallback(async () => {
    setIsLoading(true);
    try {
      let fetchedOutlets;
      
      // Try property-aware action first for non-super admins
      if (userProfile?.email && userProfile.role !== "super_admin") {
        try {
          fetchedOutlets = await getOutletsByPropertyAccessAction(userProfile.email);
        } catch (propertyError) {
          console.warn("Property-aware outlet fetch failed, falling back to all outlets:", propertyError);
          // Fallback to all outlets if property access fails
          fetchedOutlets = await getAllOutletsAction();
          showToast.warning("Property access not configured properly. Showing all outlets temporarily.");
        }
      } else {
        // Super admins or no user profile - use all outlets
        fetchedOutlets = await getAllOutletsAction();
      }
      
      const sortedOutlets = fetchedOutlets.sort((a, b) => a.name.localeCompare(b.name));
      setAllOutlets(sortedOutlets as unknown as Outlet[]);
      setTotalOutlets(sortedOutlets.length);
      setCurrentPage(1);
    } catch (error) {
      console.error("Error fetching outlets:", error);
      showToast.error("Could not load outlets from the database.");
    } finally {
      setIsLoading(false);
    }
  }, [userProfile?.email, userProfile?.role]);

  useEffect(() => {
    fetchOutlets();
  }, [fetchOutlets]);

  const handleAddNew = () => {
    setEditingOutlet(null);
    setIsFormOpen(true);
  };

  const handleEdit = (outlet: Outlet) => {
    setEditingOutlet(outlet);
    setIsFormOpen(true);
  };

  const handleDelete = async (outletId: number) => {
    try {
      await deleteOutletAction(outletId);
      showToast.success("The outlet has been successfully deleted.");
      fetchOutlets(); // Refresh the list
    } catch (error) {
      console.error("Error deleting outlet:", error);
      showToast.error((error as Error).message || "Could not delete the outlet.");
    }
  };

  const onFormSuccess = () => {
    setIsFormOpen(false);
    fetchOutlets(); // Refresh the list
  };

  const onFormCancel = () => {
    setIsFormOpen(false);
    setEditingOutlet(null);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const totalPages = Math.max(1, Math.ceil(totalOutlets / itemsPerPage));
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return allOutlets.slice(startIndex, startIndex + itemsPerPage);
  }, [allOutlets, currentPage, itemsPerPage]);

  const startIndexDisplay =
    totalOutlets > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndexDisplay =
    totalOutlets > 0 ? Math.min(currentPage * itemsPerPage, totalOutlets) : 0;

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
      <div>
        <div className="flex justify-end mb-4">
          {" "}
          <Skeleton className="h-10 w-32 bg-muted" />{" "}
        </div>
        <div className="rounded-lg border overflow-hidden shadow-md bg-card">
          <Skeleton className="h-12 w-full bg-muted/50" />
          {[...Array(itemsPerPage)].map((_, i) => (
            <div key={i} className="flex items-center p-4 border-b">
              <Skeleton className="h-6 flex-grow bg-muted mr-4" />
              <Skeleton className="h-6 w-24 bg-muted mr-4" />
              {isSuperAdmin && <Skeleton className="h-6 w-32 bg-muted mr-4" />}
              <Skeleton className="h-8 w-8 bg-muted mr-2" />
              <Skeleton className="h-8 w-8 bg-muted" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4 px-2">
          <Skeleton className="h-6 w-1/3 bg-muted" />
          <div className="flex items-center space-x-1">
            <Skeleton className="h-9 w-9 bg-muted rounded-md" />
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-9 w-9 bg-muted rounded-md" />
            ))}
            <Skeleton className="h-9 w-9 bg-muted rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <PermissionGate permissions={["outlets.create"]}>
          <Button onClick={handleAddNew}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Outlet
          </Button>
        </PermissionGate>
      </div>

      {allOutlets.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border">
          <Building className="mx-auto h-12 w-12 mb-4 text-primary" />
          <p className="text-lg font-medium">No outlets found.</p>
          <p>Click "Add New Outlet" to get started.</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border overflow-hidden shadow-md bg-card">
            <Table className="whitespace-nowrap">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-headline whitespace-nowrap">
                    Outlet Name
                  </TableHead>
                  <TableHead className="font-headline whitespace-nowrap">
                    Outlet Code
                  </TableHead>
                  {isSuperAdmin && (
                    <TableHead className="font-headline whitespace-nowrap">
                      Property Code
                    </TableHead>
                  )}
                  <TableHead className="font-headline w-[120px] text-right whitespace-nowrap">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.map((outlet) => (
                  <TableRow key={outlet.id}>
                    <TableCell className="whitespace-nowrap">
                      {outlet.name}
                    </TableCell>
                    <TableCell className="font-code whitespace-nowrap">
                      {outlet.outletCode}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="font-code whitespace-nowrap">
                        {outlet.property?.propertyCode || "N/A"}
                      </TableCell>
                    )}
                    <TableCell className="text-right whitespace-nowrap">
                      <PermissionGate permissions={["outlets.update"]}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(outlet)}
                          className="mr-2 hover:text-primary"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit Outlet</span>
                        </Button>
                      </PermissionGate>
                      <PermissionGate permissions={["outlets.delete"]}>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete Outlet</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center">
                                <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
                                Are you sure?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will
                                permanently delete the outlet "{outlet.name}" (ID:{" "}
                                {outlet.id}) and all associated data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(outlet.id)}
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </PermissionGate>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4 px-2">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndexDisplay} to {endIndexDisplay} of{" "}
                {totalOutlets} results
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

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditingOutlet(null);
          }
          setIsFormOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[425px] bg-card">
          <DialogHeader>
            <DialogTitle className="font-headline">
              {editingOutlet ? "Edit Outlet" : "Add New Outlet"}
            </DialogTitle>
            <DialogDescription>
              {editingOutlet
                ? "Update the details for this outlet."
                : "Enter the details for the new outlet."}
            </DialogDescription>
          </DialogHeader>
          <OutletForm
            key={editingOutlet ? editingOutlet.id : "new-outlet"}
            outlet={editingOutlet}
            onSuccess={onFormSuccess}
            onCancel={onFormCancel}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
