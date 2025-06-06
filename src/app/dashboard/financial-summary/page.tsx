
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
          <div key={i} className="flex items-center p-4 border-b">
            <Skeleton className="h-6 w-1/5 bg-muted mr-2" /> {/* Date */}
            <Skeleton className="h-6 w-1/5 bg-muted mr-2" /> {/* Food Revenue */}
            <Skeleton className="h-6 w-1/5 bg-muted mr-2" /> {/* Budget Food % */}
            <Skeleton className="h-6 w-1/5 bg-muted mr-2" /> {/* Bev Revenue */}
            <Skeleton className="h-6 w-1/5 bg-muted mr-2" /> {/* Budget Bev % */}
            <Skeleton className="h-8 w-8 bg-muted mr-2" /> {/* Edit */}
            <Skeleton className="h-8 w-8 bg-muted" /> {/* Delete */}
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
          <CardContent>
            <Suspense fallback={<ListSkeleton />}>
              <DailyFinancialSummaryListClient />
            </Suspense>
          </CardContent>
        </Card>
    </div>
  );
}
