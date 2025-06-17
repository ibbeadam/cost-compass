import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import ReportsClient from "@/components/dashboard/reports/ReportsClient";

export const metadata = {
  title: "Reports | Cost Compass",
};

const ListSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-6 w-full" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
    <Skeleton className="h-64 w-full" />
  </div>
);

export default function ReportsPage() {
  return (
    <div className="flex flex-col flex-grow w-full">
        <Card className="shadow-lg bg-card w-full">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Reports</CardTitle>
            <CardDescription>
              Generate and view various financial and operational reports.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-6">
            <Suspense fallback={<ListSkeleton />}>
              <ReportsClient />
            </Suspense>
            </div>
          </CardContent>
        </Card>
    </div>
  );
} 