
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import UserListClient from "@/components/dashboard/users/UserListClient";
import { Suspense } from "react";
import Loading from "./loading"; // Import the loading component

export const metadata = {
  title: "Manage Users | Cost Compass",
};

export default function ManageUsersPage() {
  return (
    <div className="flex flex-col flex-grow w-full">
      <Card className="shadow-lg bg-card w-full">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Manage Users</CardTitle>
          <CardDescription>
            View and manage user accounts for the application. (Full functionality requires backend setup)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Loading />}>
            <UserListClient />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
