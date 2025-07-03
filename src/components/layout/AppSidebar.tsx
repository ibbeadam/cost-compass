// src/components/layout/AppSidebar.tsx
"use client";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { AppBrand } from "./AppBrand";
import { MainNav } from "./MainNav";
import { PropertySelector } from "@/components/property/PropertySelector";
import { usePermissions, useAccessibleProperties } from "@/hooks/usePermissions";
import { Separator } from "@/components/ui/separator";

export function AppSidebar() {
  const { isMultiPropertyMode } = useAccessibleProperties();
  const { isAuthenticated } = usePermissions();

  return (
    <Sidebar 
      className="bg-sidebar text-sidebar-foreground border-r border-sidebar-border"
      collapsible="icon"
    >
      <SidebarHeader className="p-4 border-b border-sidebar-border h-16 flex items-center justify-center group-data-[state=expanded]:justify-start">
        <AppBrand />
      </SidebarHeader>
      
      {/* Property Selector - Show only for authenticated users with multiple properties */}
      {isAuthenticated && isMultiPropertyMode && (
        <div className="p-3 border-b border-sidebar-border group-data-[collapsible=icon]:p-2">
          <div className="group-data-[collapsible=icon]:hidden">
            <PropertySelector 
              variant="minimal" 
              showAllOption={true}
              className="w-full"
            />
          </div>
          {/* Icon view - simplified property indicator */}
          <div className="hidden group-data-[collapsible=icon]:flex justify-center">
            <div className="w-2 h-2 bg-primary rounded-full" />
          </div>
        </div>
      )}
      
      <SidebarContent className="p-2">
        <MainNav />
      </SidebarContent>
      
      <SidebarFooter className="p-2 border-t border-sidebar-border">
        <div className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-between">
            <span>Cost Compass</span>
            <span>v2.0</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
