
// src/components/layout/MainNav.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { LayoutDashboard, Settings, FileText, Building, Apple, FileSpreadsheet, ListChecks, DollarSign, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/financial-summary', label: 'Daily Financial Summary', icon: DollarSign },
  { href: '/dashboard/food-cost-input', label: 'Food Cost Input', icon: ClipboardList },
  // { href: '/dashboard/beverage-cost-input', label: 'Beverage Cost Input', icon: GlassWater }, // Placeholder for next module
  { href: '/dashboard/reports', label: 'Reports', icon: FileText, disabled: true }, // Assuming reports not yet built
  { 
    href: '/dashboard/settings', 
    label: 'General Settings', 
    icon: Settings,
    subItems: [
      { href: '/dashboard/outlets', label: 'Manage Outlets', icon: Building, parentPath: '/dashboard/settings' },
      { href: '/dashboard/settings/categories', label: 'Manage Categories', icon: ListChecks, parentPath: '/dashboard/settings'},
      // Add other specific settings pages here if needed
    ]
  },
];

export function MainNav() {
  const pathname = usePathname();

  const isActive = (href: string, parentPath?: string) => {
    if (pathname === href) return true;
    if (parentPath && pathname.startsWith(parentPath)) return true; // Simpler parent check for grouped items
    // For top-level items, ensure it's an exact match or a prefix if it's not the dashboard
    if (!parentPath && href !== '/dashboard' && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} legacyBehavior passHref>
            <SidebarMenuButton
              asChild
              isActive={isActive(item.href, item.parentPath)}
              disabled={item.disabled}
              className={cn(
                "justify-start",
                isActive(item.href, item.parentPath)
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                item.isLegacy && "opacity-70 hover:opacity-90"
              )}
              tooltip={{children: item.label, side: "right", className: "bg-card text-card-foreground border-border"}}
            >
              <a>
                <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                <span className="group-data-[state=collapsed]:hidden">{item.label}</span>
              </a>
            </SidebarMenuButton>
          </Link>
          {item.subItems && (
             <SidebarMenuSub>
              {item.subItems.map((subItem) => (
                <SidebarMenuSubItem key={subItem.href}>
                   <Link href={subItem.href} legacyBehavior passHref>
                    <SidebarMenuSubButton
                      asChild
                      isActive={pathname === subItem.href}
                       className={cn(
                        pathname === subItem.href
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
