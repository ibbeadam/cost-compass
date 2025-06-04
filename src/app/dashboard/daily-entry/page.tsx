
import DailyEntryListClient from "@/components/dashboard/daily-entry/DailyEntryListClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Daily Financial Entries | Cost Compass",
};

function DailyEntryListSkeleton() {
  return (
    <div>
      <div className="flex justify-end mb-4">
        <Skeleton className="h-10 w-36 bg-muted" />
      </div>
      <div className="rounded-lg border overflow-hidden shadow-md bg-card">
        <Skeleton className="h-12 w-full bg-muted/50" /> {/* Header */}
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center p-4 border-b">
            <Skeleton className="h-6 w-1/4 bg-muted mr-4" />
            <Skeleton className="h-6 w-1/4 bg-muted mr-4" />
            <Skeleton className="h-6 w-1/4 bg-muted mr-4" />
            <Skeleton className="h-6 flex-grow bg-muted mr-4" />
            <Skeleton className="h-8 w-8 bg-muted mr-2" />
            <Skeleton className="h-8 w-8 bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}


export default function DailyEntriesPage() {
  return (
    <div className="flex flex-col flex-grow">
        <Card className="shadow-lg bg-card w-full">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Daily Hotel Financial Entries</CardTitle>
            <CardDescription>
              View, add, or edit daily financial records for the hotel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<DailyEntryListSkeleton />}>
              <DailyEntryListClient />
            </Suspense>
          </CardContent>
        </Card>
    </div>
  );
}
