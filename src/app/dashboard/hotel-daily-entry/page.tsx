
import HotelDailyEntryListClient from "@/components/dashboard/hotel-daily-entry/HotelDailyEntryListClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Hotel Daily Entries | Cost Compass",
};

function HotelDailyEntryListSkeleton() {
  return (
    <div>
      <div className="flex justify-end mb-4">
        <Skeleton className="h-10 w-44 bg-muted" /> {/* Adjusted for "Add New Hotel Entry" */}
      </div>
      <div className="rounded-lg border overflow-hidden shadow-md bg-card">
        <Skeleton className="h-12 w-full bg-muted/50" /> {/* Header */}
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center p-4 border-b">
            <Skeleton className="h-6 w-1/4 bg-muted mr-2" /> {/* Date */}
            <Skeleton className="h-6 w-1/4 bg-muted mr-2" /> {/* Net Food Sales */}
            <Skeleton className="h-6 w-1/4 bg-muted mr-2" /> {/* Net Bev Sales */}
            <Skeleton className="h-6 w-1/4 bg-muted mr-2" /> {/* Budget Food % */}
            {/* <Skeleton className="h-6 flex-grow bg-muted mr-4" /> Placeholder */}
            <Skeleton className="h-8 w-8 bg-muted mr-2" /> {/* Edit */}
            <Skeleton className="h-8 w-8 bg-muted" /> {/* Delete */}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HotelDailyEntriesPage() {
  return (
    <div className="flex flex-col flex-grow w-full">
        <Card className="shadow-lg bg-card w-full">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Hotel Daily Financial Entries</CardTitle>
            <CardDescription>
              View, add, or edit overall daily financial records for the hotel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<HotelDailyEntryListSkeleton />}>
              <HotelDailyEntryListClient />
            </Suspense>
          </CardContent>
        </Card>
    </div>
  );
}
