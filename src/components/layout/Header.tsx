
import { Compass, Settings } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/dashboard" className="flex items-center gap-2 text-primary hover:text-primary/90 transition-colors">
            <Compass size={28} />
            <h1 className="text-2xl font-headline font-semibold">Cost Compass</h1>
          </Link>
          
          <nav>
            <Button variant="ghost" asChild>
              <Link href="/dashboard/settings" className="flex items-center gap-2 text-foreground hover:text-primary">
                <Settings size={20} />
                <span className="hidden sm:inline">Settings</span>
              </Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
