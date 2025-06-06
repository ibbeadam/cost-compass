
import CategoryListClient from "@/components/dashboard/settings/categories/CategoryListClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Manage Categories | Cost Compass",
};

function CategoryListSkeleton() {
  return (
    <div>
      <div className="flex justify-end mb-4">
        <Skeleton className="h-10 w-40 bg-muted" /> {/* Adjusted for "Add New Category" */}
      </div>
      <div className="rounded-lg border overflow-hidden shadow-md bg-card">
        <Skeleton className="h-12 w-full bg-muted/50" /> {/* Header */}
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center p-4 border-b">
            <Skeleton className="h-6 w-1/3 bg-muted mr-4" /> {/* Name */}
            <Skeleton className="h-6 w-1/3 bg-muted mr-4" /> {/* Type */}
            <Skeleton className="h-6 flex-grow bg-muted mr-4" /> {/* Description/Actions */}
            <Skeleton className="h-8 w-8 bg-muted mr-2" /> {/* Edit */}
            <Skeleton className="h-8 w-8 bg-muted" /> {/* Delete */}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ManageCategoriesPage() {
  return (
    <div className="flex flex-col flex-grow w-full">
      <Card className="shadow-lg bg-card w-full">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Manage Item Categories</CardTitle>
          <CardDescription>
            Define and manage categories for food and beverage items. These categories will be used for cost tracking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<CategoryListSkeleton />}>
            <CategoryListClient />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
