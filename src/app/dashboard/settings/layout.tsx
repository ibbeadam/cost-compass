
import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "General Settings | Cost Compass",
};

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex-grow p-4 sm:p-6 lg:p-8">
      <h2 className="text-2xl font-headline font-semibold mb-6">General Settings</h2>
      {children}
    </div>
  );
}
