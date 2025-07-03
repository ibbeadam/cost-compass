
import type { Metadata } from "next";
import type { ReactNode } from "react";
import PrivateRoute from "@/components/auth/PrivateRoute"; 

export const metadata: Metadata = {
  title: "Dashboard | Cost Compass",
  description: "Your Cost Compass application dashboard.",
};

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PrivateRoute> 
      <div className="flex flex-col flex-grow w-full">
        {children}
      </div>
    </PrivateRoute>
  );
}
