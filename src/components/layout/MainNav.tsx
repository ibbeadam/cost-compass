
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
    // Sub-items removed as Outlets and Categories are now top-level
  },
];

export function MainNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    // Exact match
    if (pathname === href) return true;
    // For top-level sections, check if pathname starts with the href,
    // but exclude the root dashboard to avoid highlighting it for all /dashboard/* paths.
    if (href !== '/dashboard' && pathname.startsWith(href)) return true;
    return false;
  };

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
          {/* Render sub-items if they exist - though "General Settings" no longer has them in this config */}
          {item.subItems && item.subItems.length > 0 && (
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

