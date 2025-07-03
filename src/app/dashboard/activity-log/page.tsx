import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserByEmailAction } from "@/actions/prismaUserActions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield } from "lucide-react";
import ActivityLogListClient from "@/components/dashboard/activity-log/ActivityLogListClient";

export const metadata = {
  title: "Activity Log | Cost Compass",
  description: "Monitor and audit all system activities and user actions",
};

export default async function ActivityLogPage() {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login");
  }

  // Check if user has permission to view activity logs
  try {
    const user = await getUserByEmailAction(session.user.email);
    if (!user) {
      redirect("/dashboard");
    }

    // Only super_admin and property_admin can view activity logs
    const canViewActivityLog = 
      user.role === "super_admin" || 
      user.role === "property_admin";

    if (!canViewActivityLog) {
      return (
        <div className="flex-grow p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <CardTitle>Access Restricted</CardTitle>
                <CardDescription>
                  You don't have permission to access the activity log. Only super administrators and property administrators can view system activities.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-grow p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-headline font-semibold mb-2">Activity Log</h2>
          <p className="text-muted-foreground">
            Monitor and audit all system activities, user actions, and data changes for security and compliance.
          </p>
        </div>
        
        <ActivityLogListClient />
      </div>
    );
  } catch (error) {
    console.error("Error checking user permissions:", error);
    redirect("/dashboard");
  }
}