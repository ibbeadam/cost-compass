// src/components/layout/MainNav.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { LayoutDashboard, Settings, FileText, Building, ListChecks, DollarSign, ClipboardList, GlassWater, Users } from 'lucide-react'; // Added Users icon
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext'; // Added useAuth
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  disabled?: boolean; // Add optional disabled property
}

const navItemsBase: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/financial-summary', label: 'Daily Financial Summary', icon: DollarSign },
  { href: '/dashboard/food-cost-input', label: 'Food Cost Input', icon: ClipboardList },
  { href: '/dashboard/beverage-cost-input', label: 'Beverage Cost Input', icon: GlassWater },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText },
  { href: '/dashboard/outlets', label: 'Manage Outlets', icon: Building },
  { href: '/dashboard/categories', label: 'Manage Categories', icon: ListChecks },
];

const adminNavItems: NavItem[] = [
  { href: '/dashboard/users', label: 'Manage Users', icon: Users },
];

const settingsNavItem: NavItem = {
  href: '/dashboard/settings',
  label: 'General Settings',
  icon: Settings,
};

const SidebarMenuSkeleton: React.FC<{ showIcon?: boolean }> = ({ showIcon }) => (
  <div className="flex items-center space-x-3 p-2">
    {showIcon && <Skeleton className="h-5 w-5 rounded-full bg-muted" />}
    <Skeleton className="h-4 w-3/4 bg-muted" />
  </div>
);

export function MainNav() {
  const [isMounted, setIsMounted] = React.useState(false);
  const pathname = usePathname();
  const { isAdmin, loading: authLoading } = useAuth(); // Get isAdmin and authLoading

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const isActive = (href: string) => {
    if (!isMounted) {
      return false;
    }
    if (pathname === href) {
      return true;
    }
    if (href !== '/dashboard' && pathname.startsWith(href + '/')) {
      return true;
    }
    return false;
  };

  const navItems = React.useMemo(() => {
    let items = [...navItemsBase];
    if (isAdmin) {
      items = [...items, ...adminNavItems];
    }
    items.push(settingsNavItem); // Settings always last for regular users
    return items;
  }, [isAdmin]);


  if (authLoading && !isMounted) { // Show skeletons if auth is loading and not yet mounted
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
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} legacyBehavior passHref>
            <SidebarMenuButton
              asChild
              isActive={isActive(item.href)}
              disabled={item.disabled}
              className={cn(
                "justify-start",
                isActive(item.href)
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                item.disabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-sidebar-foreground"
              )}
              tooltip={{children: item.label, side: "right", className: "bg-card text-card-foreground border-border"}}
            >
              <a>
                <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                <span className="group-data-[state=collapsed]:hidden">{item.label}</span>
              </a>
            </SidebarMenuButton>
          </Link>
          {(item as any).subItems && (item as any).subItems.length > 0 && (
             <SidebarMenuSub>
              {(item as any).subItems.map((subItem: any) => (
                <SidebarMenuSubItem key={subItem.href}>
                   <Link href={subItem.href} legacyBehavior passHref>
                    <SidebarMenuSubButton
                      asChild
                      isActive={isMounted && pathname === subItem.href}
                       className={cn(
                        isMounted && pathname === subItem.href
                        ? "bg-sidebar-accent/80 text-sidebar-accent-foreground"
                        : "hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                      )}
                    >
                       <a>
                        <subItem.icon className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="group-data-[state=collapsed]:hidden">{subItem.label}</span>
                      </a>
                    </SidebarMenuSubButton>
                  </Link>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          )}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
