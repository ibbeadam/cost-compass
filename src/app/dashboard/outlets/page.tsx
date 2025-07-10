
import OutletListClient from "@/components/dashboard/outlets/OutletListClient";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionGate } from "@/components/auth/PermissionGate";


export const metadata = {
  title: "Manage Outlets | Cost Compass",
};

export default function ManageOutletsPage() {
  return (
    <PermissionGate
      permissions={["outlets.read"]}
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-muted-foreground">Access Denied</h2>
            <p className="text-sm text-muted-foreground mt-2">
              You don't have permission to access this page.
            </p>
          </div>
        </div>
      }
    >
      <Card className="shadow-lg bg-card">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Manage Outlets</CardTitle>
          <CardDescription>
              Define and manage outlets for food and beverage cost. These outlets will be used for cost tracking.
            </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<OutletListSkeleton />}>
            <OutletListClient />
          </Suspense>
        </CardContent>
      </Card>
    </PermissionGate>
  );
}


function OutletListSkeleton() {
  return (
    <div>
      <div className="flex justify-end mb-4">
        <Skeleton className="h-10 w-32 bg-muted" />
      </div>
      <div className="rounded-lg border overflow-hidden shadow-md bg-card">
        <Skeleton className="h-12 w-full bg-muted/50" /> {/* Header */}
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center p-4 border-b">
            <Skeleton className="h-6 flex-grow bg-muted mr-4" />
            <Skeleton className="h-8 w-8 bg-muted mr-2" />
            <Skeleton className="h-8 w-8 bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
