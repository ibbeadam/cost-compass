
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
import { LayoutDashboard, Settings, FileText, Building, ListChecks, DollarSign, ClipboardList, GlassWater } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/financial-summary', label: 'Daily Financial Summary', icon: DollarSign },
  { href: '/dashboard/food-cost-input', label: 'Food Cost Input', icon: ClipboardList },
  { href: '/dashboard/beverage-cost-input', label: 'Beverage Cost Input', icon: GlassWater },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText, disabled: true }, 
  { href: '/dashboard/outlets', label: 'Manage Outlets', icon: Building },
  { href: '/dashboard/settings/categories', label: 'Manage Categories', icon: ListChecks },
  { 
    href: '/dashboard/settings', 
    label: 'General Settings', 
    icon: Settings,
  },
];

export function MainNav() {
  const [isMounted, setIsMounted] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const isActive = (href: string) => {
    if (!isMounted) {
      return false;
    }
    // Exact match
    if (pathname === href) {
      return true;
    }
    // Parent match: current path is a true sub-path of href
    // (e.g., href="/dashboard/settings", pathname="/dashboard/settings/categories")
    // This check ensures href is a prefix and is followed by a '/' in pathname.
    // It excludes the root dashboard link from this type of parent matching.
    if (href !== '/dashboard' && pathname.startsWith(href + '/')) {
      return true;
    }
    return false;
  };

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} legacyBehavior passHref suppressHydrationWarning>
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
          {/* Sub-items rendering (if any item were to have them) */}
          {(item as any).subItems && (item as any).subItems.length > 0 && (
             <SidebarMenuSub>
              {(item as any).subItems.map((subItem: any) => (
                <SidebarMenuSubItem key={subItem.href}>
                   <Link href={subItem.href} legacyBehavior passHref suppressHydrationWarning>
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
