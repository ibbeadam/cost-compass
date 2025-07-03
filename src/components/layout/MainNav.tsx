// src/components/layout/MainNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Settings,
  FileText,
  Building,
  Home,
  ListChecks,
  DollarSign,
  ClipboardList,
  GlassWater,
  Users,
  Activity,
} from "lucide-react"; // Added Users and Activity icons
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Skeleton } from "@/components/ui/skeleton";
import { useSidebar } from "@/components/ui/sidebar";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  disabled?: boolean;
  permissions?: string[]; // Required permissions to view this item
  roles?: string[]; // Required roles to view this item
  requireAnyPermission?: boolean; // true = any of permissions, false = all permissions
}

const navItems: NavItem[] = [
  { 
    href: "/dashboard", 
    label: "Dashboard", 
    icon: LayoutDashboard,
    permissions: ["dashboard.view"]
  },
  {
    href: "/dashboard/financial-summary",
    label: "Daily Financial Summary",
    icon: DollarSign,
    permissions: ["financial.daily_summary.read", "financial.daily_summary.create"],
    requireAnyPermission: true
  },
  {
    href: "/dashboard/food-cost-input",
    label: "Food Cost Input",
    icon: ClipboardList,
    permissions: ["financial.food_costs.read", "financial.food_costs.create"],
    requireAnyPermission: true
  },
  {
    href: "/dashboard/beverage-cost-input",
    label: "Beverage Cost Input",
    icon: GlassWater,
    permissions: ["financial.beverage_costs.read", "financial.beverage_costs.create"],
    requireAnyPermission: true
  },
  { 
    href: "/dashboard/reports", 
    label: "Reports", 
    icon: FileText,
    permissions: ["reports.basic.read"]
  },
  { 
    href: "/dashboard/properties", 
    label: "Manage Properties", 
    icon: Home,
    roles: ["super_admin"]
  },
  { 
    href: "/dashboard/outlets", 
    label: "Manage Outlets", 
    icon: Building,
    permissions: ["outlets.read"]
  },
  {
    href: "/dashboard/categories",
    label: "Manage Categories",
    icon: ListChecks,
    roles: ["super_admin"]
  },
  { 
    href: "/dashboard/users", 
    label: "Manage Users", 
    icon: Users,
    roles: ["super_admin"]
  },
  { 
    href: "/dashboard/activity-log", 
    label: "Activity Log", 
    icon: Activity,
    roles: ["super_admin", "property_admin"]
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings,
    roles: ["super_admin"]
  },
];

const SidebarMenuSkeleton: React.FC<{ showIcon?: boolean }> = ({
  showIcon,
}) => (
  <div className="flex items-center space-x-3 p-2">
    {showIcon && <Skeleton className="h-5 w-5 rounded-full bg-muted" />}
    <Skeleton className="h-4 w-3/4 bg-muted" />
  </div>
);

export function MainNav() {
  const [isMounted, setIsMounted] = React.useState(false);
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const { isLoading } = usePermissions();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handler to close sidebar on mobile after navigation
  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  const isActive = (href: string) => {
    if (!isMounted) {
      return false;
    }
    if (pathname === href) {
      return true;
    }
    if (href !== "/dashboard" && pathname?.startsWith(href + "/")) {
      return true;
    }
    return false;
  };

  if (isLoading && !isMounted) {
    // Show skeletons if permissions are loading and not yet mounted
    return (
      <SidebarMenu>
        {[...Array(7)].map((_, i) => (
          <SidebarMenuItem key={i}>
            <SidebarMenuSkeleton showIcon />
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <PermissionGate
          key={item.href}
          permissions={item.permissions}
          roles={item.roles as any}
          requireAll={!item.requireAnyPermission}
        >
          <SidebarMenuItem>
            <Link href={item.href} legacyBehavior passHref>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.href)}
                disabled={item.disabled}
                className={cn(
                  "justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:!p-0",
                  isActive(item.href)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  item.disabled &&
                    "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-sidebar-foreground"
                )}
                tooltip={{
                  children: item.label,
                  side: "right",
                  sideOffset: 24,
                  align: "center",
                  avoidCollisions: true,
                  className:
                    "bg-sidebar text-sidebar-foreground border-sidebar-border shadow-lg z-50",
                }}
              >
                <a
                  onClick={handleNavClick}
                  className="flex items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:h-full"
                >
                  <item.icon className="h-6 w-6 mr-3 group-data-[collapsible=icon]:mr-0 flex-shrink-0" />
                  <span className="group-data-[collapsible=icon]:hidden">
                    {item.label}
                  </span>
                </a>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </PermissionGate>
      ))}
    </SidebarMenu>
  );
}
