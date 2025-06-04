
import FoodCostEntryListClient from "@/components/dashboard/food-cost/FoodCostEntryListClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Food Cost Entries | Cost Compass",
};

function FoodCostEntryListSkeleton() {
  return (
    <div>
      <div className="flex justify-end mb-4">
        <Skeleton className="h-10 w-40 bg-muted" /> {/* Adjusted width for "Add New Food Entry" */}
      </div>
      <div className="rounded-lg border overflow-hidden shadow-md bg-card">
        <Skeleton className="h-12 w-full bg-muted/50" /> {/* Header */}
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center p-4 border-b">
            <Skeleton className="h-6 w-1/3 bg-muted mr-4" /> {/* Date */}
            <Skeleton className="h-6 w-1/3 bg-muted mr-4" /> {/* Hotel Net Sales */}
            <Skeleton className="h-6 w-1/4 bg-muted mr-4" /> {/* Budget Food Cost % */}
            <Skeleton className="h-6 flex-grow bg-muted mr-4" /> {/* Placeholder for more or actions column width */}
            <Skeleton className="h-8 w-8 bg-muted mr-2" /> {/* Edit */}
            <Skeleton className="h-8 w-8 bg-muted" /> {/* Delete */}
          </div>
        ))}
      </div>
    </div>
  );
}


export default function FoodCostEntriesPage() {
  return (
    <div className="flex flex-col flex-grow w-full">
        <Card className="shadow-lg bg-card w-full">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Hotel Food Cost Entries</CardTitle>
            <CardDescription>
              View, add, or edit daily food cost financial records for the hotel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<FoodCostEntryListSkeleton />}>
              <FoodCostEntryListClient />
            </Suspense>
          </CardContent>
        </Card>
    </div>
  );
}
