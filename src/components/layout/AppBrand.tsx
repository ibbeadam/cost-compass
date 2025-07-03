"use client";

// src/components/layout/AppBrand.tsx
import Link from 'next/link';
import { Compass } from 'lucide-react';

export function AppBrand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 text-primary hover:text-primary/90 transition-colors min-w-0">
      <Compass size={32} className="text-sidebar-primary flex-shrink-0" />
      <span className="text-xl font-headline font-semibold text-sidebar-foreground group-data-[state=collapsed]:hidden truncate">
        Cost Compass
      </span>
    </Link>
  );
}
