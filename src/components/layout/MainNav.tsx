
// src/components/layout/MainNav.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { LayoutDashboard, Settings, FileText, Building, Apple, FileSpreadsheet, ListChecks } from 'lucide-react'; // Added Apple, FileSpreadsheet, ListChecks
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/hotel-daily-entry', label: 'Hotel Daily Entries', icon: FileSpreadsheet },
  { href: '/dashboard/food-cost', label: 'Food Cost Entries', icon: Apple }, 
  // { href: '/dashboard/daily-entry', label: 'Daily Entry', icon: FilePlus2 }, // Removed Daily Entry
  { href: '/dashboard/reports', label: 'Reports', icon: FileText },
  { href: '/dashboard/outlets', label: 'Manage Outlets', icon: Building },
  { 
    href: '/dashboard/settings/categories', 
    label: 'Manage Categories', 
    icon: ListChecks,
    parentPath: '/dashboard/settings' // To highlight "General Settings" as parent
  },
  { href: '/dashboard/settings', label: 'General Settings', icon: Settings },
];

export function MainNav() {
  const pathname = usePathname();

  const isActive = (href: string, parentPath?: string) => {
    if (parentPath && pathname.startsWith(parentPath) && href === pathname) {
      return true;
    }
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };


  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} legacyBehavior passHref>
            <SidebarMenuButton
              asChild
              isActive={isActive(item.href, item.parentPath)}
              className={cn(
                "justify-start",
                 isActive(item.href, item.parentPath)
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              tooltip={{children: item.label, side: "right", className: "bg-card text-card-foreground border-border"}}
            >
              <a>
                <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                <span className="group-data-[state=collapsed]:hidden">{item.label}</span>
              </a>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
