import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <Card className="mb-6 shadow-lg bg-card">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <Skeleton className="h-10 w-full bg-muted" />
              <Skeleton className="h-10 w-full bg-muted" />
              <Skeleton className="h-10 w-full md:w-auto bg-muted" />
            </div>
          </CardContent>
        </Card>

        <div className="mb-6">
          <Card className="shadow-lg bg-card">
            <CardContent className="p-6">
              <Skeleton className="h-8 w-3/4 mb-4 bg-muted" />
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2 bg-muted" />)}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="shadow-lg bg-card">
            <CardContent className="p-6">
              <Skeleton className="h-8 w-1/2 mb-4 bg-muted" />
              <Skeleton className="h-96 w-full bg-muted" />
            </CardContent>
          </Card>
        </div>
      </main>
      <footer className="text-center p-4 text-sm text-muted-foreground border-t mt-auto">
        <Skeleton className="h-4 w-1/4 mx-auto bg-muted" />
      </footer>
    </div>
  );
}
