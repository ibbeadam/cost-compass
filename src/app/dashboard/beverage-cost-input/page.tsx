
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import BeverageCostEntryListClient from "@/components/dashboard/beverage-cost-input/BeverageCostEntryListClient";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionGate } from "@/components/auth/PermissionGate";

export const metadata = {
  title: "Beverage Cost Input | Cost Compass",
};

function BeverageCostInputSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-10 w-full bg-muted" /> {/* Date Picker */}
        <Skeleton className="h-10 w-full bg-muted" /> {/* Outlet Select */}
      </div>
      <Skeleton className="h-12 w-1/4 bg-muted mb-2" /> {/* "Add Item" Button or Title */}
      
      {[...Array(2)].map((_, i) => (
        <div key={i} className="flex items-end gap-4 p-4 border rounded-md">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/4 bg-muted" /> {/* Label */}
            <Skeleton className="h-10 w-full bg-muted" /> {/* Input/Select */}
          </div>
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/4 bg-muted" /> {/* Label */}
            <Skeleton className="h-10 w-full bg-muted" /> {/* Input */}
          </div>
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3 bg-muted" /> {/* Label */}
            <Skeleton className="h-10 w-full bg-muted" /> {/* Input */}
          </div>
          <Skeleton className="h-10 w-10 bg-muted" /> {/* Delete button */}
        </div>
      ))}
      <div className="flex justify-between items-center mt-4">
        <Skeleton className="h-8 w-1/3 bg-muted" /> {/* Total Cost */}
        <Skeleton className="h-10 w-28 bg-muted" /> {/* Save Button */}
      </div>
    </div>
  );
}

export default function BeverageCostInputPage() {
  return (
    <PermissionGate 
      permissions={["financial.beverage_costs.read", "financial.beverage_costs.create"]}
      requireAll={false}
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-muted-foreground">Access Denied</h2>
            <p className="text-sm text-muted-foreground mt-2">
              You don't have permission to access beverage cost input.
            </p>
          </div>
        </div>
      }
    >
      <div className="flex flex-col flex-grow w-full">
        <Card className="shadow-lg bg-card w-full">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Beverage Cost Input</CardTitle>
            <CardDescription>
              Enter detailed beverage costs for a specific date and outlet. Add items by category and cost.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<BeverageCostInputSkeleton />}>
              <BeverageCostEntryListClient />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
}
