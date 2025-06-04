// src/components/layout/AppSidebar.tsx
"use client";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter, // Optional: if you want a footer in the sidebar
} from "@/components/ui/sidebar";
import { AppBrand } from "./AppBrand";
import { MainNav } from "./MainNav";
// import { UserProfileSmall } from "./UserProfileSmall"; // Example if you want user info in sidebar footer

export function AppSidebar() {
  return (
    <Sidebar className="bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border h-16 flex items-center">
        <AppBrand />
      </SidebarHeader>
      <SidebarContent className="p-2">
        <MainNav />
      </SidebarContent>
      {/* Optional Sidebar Footer Example:
      <SidebarFooter className="p-2 border-t border-sidebar-border">
        <UserProfileSmall />
      </SidebarFooter>
      */}
    </Sidebar>
  );
}
