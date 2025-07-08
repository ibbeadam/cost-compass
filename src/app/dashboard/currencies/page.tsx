import { Metadata } from "next";
import { getCurrentUser } from "@/lib/server-auth";
import { redirect } from "next/navigation";
import CurrencyManagementClient from "@/components/dashboard/settings/CurrencyManagementClient";

export const metadata: Metadata = {
  title: "Currency Management - Cost Compass",
  description: "Manage system and custom currencies",
};

export default async function CurrencyManagementPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Only super_admin can access currency management
  if (user.role !== "super_admin") {
    redirect("/dashboard");
  }

  return (
    <div className="p-6">
      <CurrencyManagementClient />
    </div>
  );
}