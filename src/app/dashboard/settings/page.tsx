
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserByEmailAction } from "@/actions/prismaUserActions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SettingsPageClient from "./SettingsPageClient";

export const metadata = {
  title: "Settings | Cost Compass",
};

export default async function GeneralSettingsPage() {
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
          <CardTitle className="font-headline text-2xl">Settings</CardTitle>
          <CardDescription>
            Manage application settings, preferences, and configurations. These settings affect the entire system.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <SettingsPageClient />
        </CardContent>
      </Card>
    </div>
  );
}
