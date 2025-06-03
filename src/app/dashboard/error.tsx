"use client"; 

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center text-center">
        <div className="bg-card p-8 rounded-lg shadow-xl border border-destructive/50 max-w-lg w-full">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-6" />
          <h2 className="text-3xl font-headline font-semibold text-destructive mb-4">
            Oops! Something went wrong.
          </h2>
          <p className="text-muted-foreground mb-6">
            We encountered an error while trying to load the dashboard. Please try again.
          </p>
          {error?.message && (
            <details className="mb-6 text-left">
              <summary className="cursor-pointer text-sm text-primary hover:underline">View error details</summary>
              <p className="mt-2 text-xs text-destructive/80 bg-destructive/10 p-3 rounded-md font-code break-words">
                {error.message}
                {error.digest && ` (Digest: ${error.digest})`}
              </p>
            </details>
          )}
          <Button
            onClick={() => reset()}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Try Again
          </Button>
        </div>
      </main>
      <footer className="text-center p-4 text-sm text-muted-foreground border-t mt-auto">
        © {new Date().getFullYear()} Cost Compass. If the problem persists, please contact support.
      </footer>
    </div>
  );
}
