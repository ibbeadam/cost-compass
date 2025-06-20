// src/components/layout/AppHeader.tsx
"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "./UserNav";

export function AppHeader() {
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:ml-64">
        <div className="container mx-auto flex h-16 items-center px-4 sm:p-6 lg:px-8">
          <div className="md:hidden">
            <SidebarTrigger className="text-foreground hover:text-primary" />
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <UserNav />
          </div>
        </div>
      </header>
      {/* Spacer div to push content down */}
      <div className="h-16"></div>
    </>
  );
}
