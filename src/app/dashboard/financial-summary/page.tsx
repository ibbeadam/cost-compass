
import DailyFinancialSummaryListClient from "@/components/dashboard/financial-summary/DailyFinancialSummaryListClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Daily Financial Summaries | Cost Compass",
};

function ListSkeleton() {
  return (
    <div>
      <div className="flex justify-end mb-4">
        <Skeleton className="h-10 w-52 bg-muted" /> {/* "Add New Summary" */}
      </div>
      <div className="rounded-lg border overflow-hidden shadow-md bg-card">
        <Skeleton className="h-12 w-full bg-muted/50" /> {/* Header */}
        {[...Array(3)].map((_, i) => (
          <div key={i} className="grid grid-cols-8 items-center p-4 border-b gap-2">
            <Skeleton className="h-6 bg-muted" /> {/* Date */}
            <Skeleton className="h-6 bg-muted" /> {/* Food Revenue */}
            <Skeleton className="h-6 bg-muted" /> {/* Budget Food % */}
            <Skeleton className="h-6 bg-muted" /> {/* Actual Food Cost */}
            <Skeleton className="h-6 bg-muted" /> {/* Actual Food % */}
            <Skeleton className="h-6 bg-muted" /> {/* Food Variance % */}
            <Skeleton className="h-6 bg-muted" /> {/* Bev Revenue */}
            <div className="flex justify-end gap-1">
                <Skeleton className="h-8 w-8 bg-muted" /> {/* Edit */}
                <Skeleton className="h-8 w-8 bg-muted" /> {/* Delete */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DailyFinancialSummariesPage() {
  return (
    <div className="flex flex-col flex-grow w-full">
        <Card className="shadow-lg bg-card w-full">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Hotel Daily Financial Summaries</CardTitle>
            <CardDescription>
              Manage overall daily revenue, budget percentages, and adjustments for the hotel.
              Actual costs and variances are calculated based on detailed Food & Beverage cost entries.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <div className="p-6">
            <Suspense fallback={<ListSkeleton />}>
              <DailyFinancialSummaryListClient />
            </Suspense>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
