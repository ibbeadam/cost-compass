import UserManagementClient from "@/components/dashboard/users/UserManagementClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionGate } from "@/components/auth/PermissionGate";

export const metadata = {
  title: "User Management | Cost Compass",
};

function UserManagementSkeleton() {
  return (
    <div>
      <div className="flex justify-end mb-4">
        <Skeleton className="h-10 w-40 bg-muted" />
      </div>
      <div className="rounded-lg border overflow-hidden shadow-md bg-card">
        <Skeleton className="h-12 w-full bg-muted/50" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="grid grid-cols-7 items-center p-4 border-b gap-2">
            <Skeleton className="h-6 bg-muted" />
            <Skeleton className="h-6 bg-muted" />
            <Skeleton className="h-6 bg-muted" />
            <Skeleton className="h-6 bg-muted" />
            <Skeleton className="h-6 bg-muted" />
            <Skeleton className="h-6 bg-muted" />
            <div className="flex justify-end gap-1">
              <Skeleton className="h-8 w-8 bg-muted" />
              <Skeleton className="h-8 w-8 bg-muted" />
              <Skeleton className="h-8 w-8 bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function UserManagementPage() {
  return (
    <PermissionGate 
      permissions={["users.read", "users.view_all", "users.view_own"]}
      requireAll={false}
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-muted-foreground">Access Denied</h2>
            <p className="text-sm text-muted-foreground mt-2">
              You don't have permission to access user management.
            </p>
          </div>
        </div>
      }
    >
      <div className="flex flex-col flex-grow w-full">
        <Card className="shadow-lg bg-card w-full">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">User Management</CardTitle>
            <CardDescription>
              Manage system users, roles, and permissions. Create new users, edit existing ones, and control access levels.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-6">
              <Suspense fallback={<UserManagementSkeleton />}>
                <UserManagementClient />
              </Suspense>
            </div>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
}
