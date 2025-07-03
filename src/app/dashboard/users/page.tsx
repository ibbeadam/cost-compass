import UserManagementClient from "@/components/dashboard/users/UserManagementClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserByEmailAction } from "@/actions/prismaUserActions";

export const metadata = {
  title: "User Management | Cost Compass",
};

function UserManagementSkeleton() {
  return (
    <div>
      <div className="flex justify-end mb-4">
        <Skeleton className="h-10 w-40 bg-muted" />
      </div>
      <div className="rounded-lg border overflow-hidden shadow-md bg-card">
        <Skeleton className="h-12 w-full bg-muted/50" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="grid grid-cols-7 items-center p-4 border-b gap-2">
            <Skeleton className="h-6 bg-muted" />
            <Skeleton className="h-6 bg-muted" />
            <Skeleton className="h-6 bg-muted" />
            <Skeleton className="h-6 bg-muted" />
            <Skeleton className="h-6 bg-muted" />
            <Skeleton className="h-6 bg-muted" />
            <div className="flex justify-end gap-1">
              <Skeleton className="h-8 w-8 bg-muted" />
              <Skeleton className="h-8 w-8 bg-muted" />
              <Skeleton className="h-8 w-8 bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function UserManagementPage() {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login");
  }

  // Check if user is super admin
  try {
    const user = await getUserByEmailAction(session.user.email);
    if (!user || user.role !== "super_admin") {
      redirect("/dashboard");
    }
  } catch (error) {
    console.error("Error checking user permissions:", error);
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col flex-grow w-full">
      <Card className="shadow-lg bg-card w-full">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">User Management</CardTitle>
          <CardDescription>
            Manage system users, roles, and permissions. Create new users, edit existing ones, and control access levels.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-6">
            <Suspense fallback={<UserManagementSkeleton />}>
              <UserManagementClient />
            </Suspense>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
