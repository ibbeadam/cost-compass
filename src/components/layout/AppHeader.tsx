// src/components/layout/AppHeader.tsx
"use client";

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { UserNav } from "./UserNav";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { ThemeToggleButton } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const { state } = useSidebar();
  
  return (
    <>
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-200 ease-in-out",
        state === "expanded" ? "md:ml-64" : "md:ml-16"
      )}>
        <div className="container mx-auto flex h-16 items-center px-4 sm:p-6 lg:px-8">
          <div className="flex items-center space-x-4">
            <SidebarTrigger className="text-foreground hover:text-primary" />
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <ThemeToggleButton />
            <NotificationCenter />
            <UserNav />
          </div>
        </div>
      </header>
      {/* Spacer div to push content down */}
      <div className="h-16"></div>
    </>
  );
}
