
"use client";

import { useNextAuth } from "@/hooks/useNextAuth";
import { useRouter, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton"; 

export default function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useNextAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      if (pathname !== "/login" && pathname !== "/signup") { // Avoid redirect loop
        router.push("/login");
      }
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="space-y-4 p-8 rounded-lg shadow-xl bg-card w-full max-w-sm text-center">
            <Skeleton className="h-12 w-12 rounded-full mx-auto bg-primary/20" />
            <Skeleton className="h-6 w-3/4 mx-auto bg-muted" />
            <Skeleton className="h-4 w-1/2 mx-auto bg-muted" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
